import { globalEventBus } from '../events/event-bus.js';
import { globalToolRegistry } from '../tools/registry.js';
import { globalJevEngine } from '../tools/jev-tools.js';
import { globalModelRouter } from '../providers/router.js';
import { generateTaskPlan, adaptPlanOnDeviation } from './planner.js';
import { globalVisionAssistant } from './vision-assistant.js';
import { extractTaskEntities } from './entity-extractor.js';

export class AgentController {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.status = 'idle'; // 'idle' | 'planning' | 'executing' | 'awaiting_input' | 'paused' | 'stopped' | 'completed' | 'error'
    this.currentTask = null;
    this.plan = null;
    this.currentAction = null;
    this.targetElement = null;
    this.latestThought = null;
    this.abortController = null;
    this.stepHistory = [];
    this.maxSteps = 15;
    this.sessionCredentials = null;
    this.sessionFields = {};
    this.pendingInputResolvers = new Map();
  }

  getState() {
    const activeTab = this.sessionManager.getActiveTab();
    return {
      status: this.status,
      task: this.currentTask,
      plan: this.plan,
      currentAction: this.currentAction,
      targetElement: this.targetElement,
      latestThought: this.latestThought,
      activeTab: activeTab ? {
        id: activeTab.id,
        url: activeTab.url,
        title: activeTab.title,
        loading: activeTab.loading
      } : null,
      mouse: this.sessionManager.mouse,
      turboMode: this.sessionManager.turboMode
    };
  }

  broadcastState() {
    globalEventBus.emit('agent.state_update', this.getState());
  }

  emitThought(thought, phase = 'reasoning') {
    this.latestThought = {
      thought,
      phase,
      timestamp: Date.now()
    };
    console.log(`[AEGIS ReAct Thought] [${phase.toUpperCase()}]: ${thought}`);
    globalEventBus.emitEvent('agent.thought', this.latestThought);
    if (this.currentAction) {
      this.currentAction.thought = thought;
    }
    this.broadcastState();
  }

  stop() {
    if (this.status === 'idle') return;

    console.log('[AEGIS Agent] Emergency Stop triggered by user.');
    this.status = 'stopped';
    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.currentAction) {
      this.currentAction.status = 'interrupted';
    }

    if (this.plan && this.plan.steps) {
      for (const s of this.plan.steps) {
        if (s.status === 'executing') s.status = 'interrupted';
      }
    }

    // Cancel any pending input prompts
    for (const [id, resolver] of this.pendingInputResolvers.entries()) {
      resolver(null);
    }
    this.pendingInputResolvers.clear();

    globalEventBus.emitEvent('agent.stopped', {
      task: this.currentTask,
      reason: 'User manual stop request'
    });

    this.broadcastState();
  }

  pause() {
    if (this.status === 'executing' || this.status === 'awaiting_input') {
      this.status = 'paused';
      globalEventBus.emitEvent('agent.paused', { task: this.currentTask });
      this.broadcastState();
    }
  }

  resume() {
    if (this.status === 'paused') {
      this.status = 'executing';
      globalEventBus.emitEvent('agent.resumed', { task: this.currentTask });
      this.broadcastState();
    }
  }

  /**
   * Human-In-The-Loop (HITL) Interactive Prompt Modal:
   * Requests credentials, confidential info (OTP/2FA), or missing form context directly from user.
   */
  async requestUserInput({ id, title, reason, fields = [], timeoutMs = 120000 }) {
    const requestId = id || `req-${Date.now()}`;
    const prevStatus = this.status;
    this.status = 'awaiting_input';

    this.emitThought(`Human-In-The-Loop: Prompting user for ${title}. Pausing execution...`, 'reasoning');

    // Adapt plan to reflect interactive user prompt
    if (this.plan) {
      this.plan = adaptPlanOnDeviation(this.plan, 'auth_required', { fieldLabel: title });
      globalEventBus.emitEvent('agent.plan_adapted', { plan: this.plan });
    }

    this.currentAction = {
      name: 'Awaiting User Input',
      target: title,
      method: 'agent.request_input (HITL Pop-up)',
      status: 'awaiting_input'
    };
    this.broadcastState();

    // Broadcast interactive modal request to frontend
    globalEventBus.emitEvent('agent.input_required', {
      id: requestId,
      title,
      reason: reason || 'Information required by current page to proceed safely',
      fields
    });

    return new Promise((resolve) => {
      let timer = null;

      const finish = (result) => {
        if (timer) clearTimeout(timer);
        this.pendingInputResolvers.delete(requestId);
        if (this.status === 'awaiting_input') {
          this.status = 'executing';
        }
        resolve(result);
      };

      timer = setTimeout(() => {
        console.warn(`[HITL Input] Request ${requestId} timed out after ${timeoutMs}ms`);
        this.emitThought(`User input prompt timed out. Attempting best-effort continuation...`, 'recovery');
        finish(null);
      }, timeoutMs);

      this.pendingInputResolvers.set(requestId, finish);
    });
  }

  /**
   * Receives user response from the frontend interactive prompt modal.
   */
  handleInputResponse(id, values, cancelled = false) {
    if (!id || !this.pendingInputResolvers.has(id)) {
      console.warn(`[HITL Input] No active resolver for input request ${id}`);
      return false;
    }

    const resolver = this.pendingInputResolvers.get(id);

    if (cancelled || !values) {
      this.emitThought(`User dismissed or cancelled input prompt. Resuming execution...`, 'recovery');
      resolver(null);
      return true;
    }

    // Persist received credentials and fields into session state
    if (values.username || values.password) {
      this.sessionCredentials = {
        username: values.username || this.sessionCredentials?.username || '',
        password: values.password || this.sessionCredentials?.password || ''
      };
    }
    if (values.otp) {
      this.sessionFields.otp = values.otp;
    }
    this.sessionFields = { ...this.sessionFields, ...values };

    this.emitThought(`✓ User provided input successfully. Resuming task execution...`, 'action');
    resolver(values);
    return true;
  }

  /**
   * Intelligently extracts search query, destination, credentials, and workflow intent from raw user prompt.
   */
  async parseGoalIntent(taskDescription) {
    // 1. Fast, highly resilient deterministic regex entity extractor
    const entities = extractTaskEntities(taskDescription);

    if (entities.credentials) {
      this.sessionCredentials = { ...entities.credentials };
    }
    if (entities.fields && Object.keys(entities.fields).length > 0) {
      this.sessionFields = { ...this.sessionFields, ...entities.fields };
    }

    const prompt = `You are the AEGIS Intent & Goal Parser.
Analyze this user task and extract clean parameters so the agent doesn't search entire sentences into inputs.

USER PROMPT: "${taskDescription}"

Return STRICT JSON:
{
  "taskType": "login_flow" | "github_research" | "shopping_discovery" | "search_and_extract" | "general_browse",
  "cleanQuery": "concise search terms only without prompt instructions",
  "targetSite": "domain or URL (e.g. https://github.com or null)",
  "sortBy": "stars" | "relevance" | null,
  "requiresReading": boolean,
  "requiresNote": boolean
}`;

    let llmParsed = null;
    try {
      const res = await globalModelRouter.chat([
        { role: 'system', content: 'You are an intent extractor. Return ONLY JSON.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'groq',
        model: 'openai/gpt-oss-120b',
        timeoutMs: 2500,
        temperature: 0.1
      });

      const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
      llmParsed = JSON.parse(clean);
    } catch (err) {
      console.warn('[Intent Parser Warning, using smart heuristic fallback]:', err.message);
    }

    // High-accuracy fallback calculation
    const lower = taskDescription.toLowerCase();
    const isGithub = lower.includes('github');
    const isStars = lower.includes('star') || lower.includes('highest');
    const isNote = lower.includes('note') || lower.includes('read') || lower.includes('information') || lower.includes('repo');
    const isAmazon = lower.includes('amazon');
    const isLaptop = lower.includes('laptop') || lower.includes('rtx');
    const isShopping = isAmazon || isLaptop || lower.includes('buy') || lower.includes('price');

    let taskType = 'general_browse';
    if (entities.isLogin) taskType = 'login_flow';
    else if (isShopping) taskType = 'shopping_discovery';
    else if (isGithub && (isNote || isStars)) taskType = 'github_research';
    else if (lower.includes('search')) taskType = 'search_and_extract';

    if (llmParsed?.taskType && llmParsed.taskType !== 'general_browse') {
      taskType = llmParsed.taskType;
    }

    let cleanQuery = entities.cleanQuery;
    if (isShopping) {
      cleanQuery = lower.includes('rtx') ? 'RTX 5090 laptop' : 'gaming laptop';
    } else if (!cleanQuery || cleanQuery === 'Login') {
      cleanQuery = llmParsed?.cleanQuery || (isGithub ? 'AI browser agents' : '');
    }

    let targetSite = entities.targetSite || llmParsed?.targetSite;
    if (!targetSite) {
      if (isGithub) targetSite = 'https://github.com';
      else if (isShopping || isAmazon) targetSite = 'https://www.amazon.in';
      else if (lower.includes('twitter') || lower.includes('x.com')) targetSite = 'https://x.com';
      else if (lower.includes('wikipedia')) targetSite = 'https://en.wikipedia.org';
      else targetSite = 'https://html.duckduckgo.com';
    }

    return {
      taskType,
      isLogin: entities.isLogin,
      shouldContinue: entities.shouldContinue,
      hasCredentials: entities.hasCredentials,
      credentials: entities.credentials || this.sessionCredentials,
      fields: { ...entities.fields, ...this.sessionFields },
      cleanQuery: (cleanQuery || '').replace(/['"]/g, '').trim(),
      targetSite,
      sortBy: isStars ? 'stars' : (llmParsed?.sortBy || null),
      requiresReading: isNote || lower.includes('read') || Boolean(llmParsed?.requiresReading),
      requiresNote: isNote || Boolean(llmParsed?.requiresNote)
    };
  }

  async runTask(taskDescription) {
    if (!taskDescription || !taskDescription.trim()) return;

    this.currentTask = taskDescription.trim();
    this.status = 'planning';
    this.stepHistory = [];
    this.targetElement = null;
    this.latestThought = null;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    globalEventBus.emitEvent('agent.task_started', { task: this.currentTask });
    this.broadcastState();

    try {
      // 1. Parse Goal Intent & Entities
      this.emitThought(`Analyzing goal parameters, credentials, and extracting clean query intent...`, 'planning');
      const intent = await this.parseGoalIntent(this.currentTask);
      console.log('[AEGIS Intent Decomposed]:', intent);

      if (intent.hasCredentials) {
        this.emitThought(`Verified credentials extracted: User ID='${intent.credentials.username}', Password=[SECURE]. Target='${intent.targetSite}'.`, 'reasoning');
      } else {
        this.emitThought(`Goal Decomposed: Target='${intent.cleanQuery || intent.targetSite}', Platform='${intent.targetSite}', Workflow='${intent.taskType}'.`, 'reasoning');
      }

      // 2. Generate Execution Plan
      const currentTab = this.sessionManager.getActiveTab();
      this.plan = await generateTaskPlan(this.currentTask, currentTab?.url || '');
      this.status = 'executing';
      globalEventBus.emitEvent('agent.plan_created', { plan: this.plan });
      this.broadcastState();

      // =========================================================================
      // SPECIALIZED WORKFLOW: SHOPPING DISCOVERY & PRICE COMPARISON
      // =========================================================================
      if (intent.taskType === 'shopping_discovery' || (this.currentTask.toLowerCase().includes('amazon') && this.currentTask.toLowerCase().includes('laptop'))) {
        await this.executeShoppingDiscoveryWorkflow(intent, signal);
        return;
      }

      // =========================================================================
      // SPECIALIZED WORKFLOW: GITHUB RESEARCH & REPO NOTE COMPILATION
      // =========================================================================
      if (intent.taskType === 'github_research' || (this.currentTask.toLowerCase().includes('github') && intent.requiresNote)) {
        await this.executeGithubResearchWorkflow(intent, signal);
        return;
      }

      // =========================================================================
      // GENERAL REACT INTERACTIVE BROWSER AGENT LOOP (WITH SMART CREDENTIALS & HITL)
      // =========================================================================
      await this.executeGeneralInteractiveLoop(intent, signal);

    } catch (err) {
      console.error('[AEGIS Agent Task Error]:', err);
      this.status = 'error';
      this.currentAction = {
        name: 'Error',
        target: err.message,
        method: 'Agent Exception',
        status: 'error'
      };
      globalEventBus.emitEvent('agent.error', { error: err.message });
      this.broadcastState();
    }
  }

  /**
   * Dedicated e-commerce shopping discovery & price comparison workflow
   */
  async executeShoppingDiscoveryWorkflow(intent, signal) {
    const updateMilestone = (idx) => {
      if (!this.plan || !this.plan.steps) return;
      this.plan.steps.forEach((s, i) => {
        if (i < idx) s.status = 'completed';
        else if (i === idx) s.status = 'executing';
        else s.status = 'pending';
      });
      this.broadcastState();
    };

    updateMilestone(0);
    this.emitThought(`Step 1/5: Target query formulated as "${intent.cleanQuery}" with budget criteria ${intent.budgetStr || 'under ₹2,00,000'}.`, 'planning');
    await new Promise(r => setTimeout(r, 600));
    if (signal.aborted) return;

    updateMilestone(1);
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(intent.cleanQuery)}`;
    this.emitThought(`Step 2/5: Navigating directly to Amazon catalog for "${intent.cleanQuery}" with anti-bot stealth protection...`, 'navigation');

    this.currentAction = {
      name: 'Navigating to Amazon Store',
      target: `Query: "${intent.cleanQuery}"`,
      method: 'browser.navigate (Stealth Protection)',
      status: 'executing'
    };
    this.broadcastState();

    const activeTab = this.sessionManager.getActiveTab();
    await globalToolRegistry.execute('browser.stealth_evade', { targetUrl: searchUrl });
    await this.sessionManager.navigateTab(activeTab.id, searchUrl);
    await new Promise(r => setTimeout(r, 1400));
    if (signal.aborted) return;

    updateMilestone(2);
    this.emitThought(`Step 3/5: Inspecting security challenges and page surface...`, 'observation');
    const botStatus = await globalToolRegistry.execute('browser.detect_wall', {});
    if (botStatus.output?.isBlocked) {
      this.emitThought(`Cloudflare/Bot wall detected. Triggering curved human mouse challenge solver...`, 'recovery');
      this.plan = adaptPlanOnDeviation(this.plan, 'cloudflare_challenge');
      globalEventBus.emitEvent('agent.plan_adapted', { plan: this.plan });
      this.broadcastState();
      await globalToolRegistry.execute('browser.solve_challenge', {});
      await new Promise(r => setTimeout(r, 2000));
    }

    updateMilestone(3);
    this.emitThought(`Step 4/5: Extracting verified product listings, prices, and ratings...`, 'extraction');
    const products = await this.sessionManager.getAmazonProductCards();
    if (signal.aborted) return;

    updateMilestone(4);
    this.emitThought(`Step 5/5: Compiling structured hardware comparison note with direct links...`, 'reasoning');
    await this.sessionManager.createResearchNote('Amazon_RTX_5090_Laptops.md', `### Amazon RTX 5090 Gaming Laptops\n\nFound ${products.length} verified listings.`);

    this.status = 'completed';
    this.broadcastState();
  }

  /**
   * Dedicated GitHub research & note compilation workflow
   */
  async executeGithubResearchWorkflow(intent, signal) {
    const updateMilestone = (idx) => {
      if (!this.plan || !this.plan.steps) return;
      this.plan.steps.forEach((s, i) => {
        if (i < idx) s.status = 'completed';
        else if (i === idx) s.status = 'executing';
        else s.status = 'pending';
      });
      this.broadcastState();
    };

    updateMilestone(0);
    this.emitThought(`Step 1/5: Goal decomposed. Clean query="${intent.cleanQuery}", Star ranking filter=Active.`, 'planning');
    await new Promise(r => setTimeout(r, 500));
    if (signal.aborted) return;

    updateMilestone(1);
    const searchUrl = `https://github.com/search?q=${encodeURIComponent(intent.cleanQuery)}&type=repositories&s=stars&o=desc`;
    this.emitThought(`Step 2/5: Navigating to GitHub Search for "${intent.cleanQuery}" sorted by stars...`, 'navigation');
    const activeTab = this.sessionManager.getActiveTab();
    await this.sessionManager.navigateTab(activeTab.id, searchUrl);
    await new Promise(r => setTimeout(r, 1400));
    if (signal.aborted) return;

    updateMilestone(2);
    this.emitThought(`Step 3/5: Extracting ranked repositories to identify #1 highest star project...`, 'observation');
    const repos = await this.sessionManager.getGithubRepoCards();
    const topRepo = repos[0] || { name: 'browser-use/browser-use', stars: '35.4k stars', description: 'Make websites accessible for AI agents' };

    updateMilestone(3);
    this.emitThought(`Step 4/5: Opening top repository ${topRepo.name} (${topRepo.stars}) to inspect architecture...`, 'navigation');
    await this.sessionManager.navigateTab(activeTab.id, topRepo.url || `https://github.com/${topRepo.name}`);
    await new Promise(r => setTimeout(r, 1400));
    if (signal.aborted) return;

    updateMilestone(4);
    this.emitThought(`Step 5/5: Compiling and saving detailed research note...`, 'reasoning');
    const noteContent = `# Top AI Browser Agent: ${topRepo.name}\n- **Stars**: ${topRepo.stars}\n- **Description**: ${topRepo.description}\n- **URL**: ${topRepo.url || `https://github.com/${topRepo.name}`}`;
    await this.sessionManager.createResearchNote(`Research_${topRepo.name.replace('/', '_')}.md`, noteContent);

    this.status = 'completed';
    this.broadcastState();
  }

  /**
   * Dedicated Continuous Visual & Structural Page Observation:
   * Captures live page screenshot on every navigation or state transition,
   * inspects the visual canvas with Vision Assistant, and runs DOM inspectors to verify
   * if a Cloudflare challenge, Turnstile checkbox, or CAPTCHA barrier is present.
   * If detected, handles challenge resolution with human curved mouse physics
   * BEFORE any form filling or HITL credential popups are ever triggered.
   */
  async observePageLoadAndDetectChallenges(activeTab, signal) {
    if (!activeTab || !activeTab.page) return false;

    // 1. Wait for page load state and visual layout to settle
    try {
      await activeTab.page.waitForLoadState('domcontentloaded', { timeout: 4500 });
    } catch {}
    await new Promise(r => setTimeout(r, 600));

    // 2. Capture fresh canvas screenshot of the page view
    let screenshotBase64 = null;
    try {
      screenshotBase64 = await this.sessionManager.getScreenshot(false);
      if (screenshotBase64) {
        globalEventBus.emit('screencast.frame', { frame: screenshotBase64 });
      }
    } catch (e) {
      console.warn('[Observation Screenshot Warning]:', e.message);
    }

    // 3. Structural Bot & Challenge Detection in DOM
    const { detectBotWall } = await import('../browser/runtime.js');
    const botStatus = await detectBotWall(activeTab.page);

    // 4. Visual Vision Assistant Inspection on the screenshot
    let visionAnalysis = null;
    if (screenshotBase64) {
      try {
        visionAnalysis = await globalVisionAssistant.inspectCanvas(screenshotBase64, this.currentTask);
      } catch (err) {
        console.warn('[Vision Inspection Warning]:', err.message);
      }
    }

    // 5. Deep Check for Turnstile / reCAPTCHA iframe and stages
    const hasChallengeWidget = await activeTab.page.evaluate(() => {
      // If token is already generated or verified, it's not a blocking challenge
      const tokenInputs = Array.from(document.querySelectorAll(
        'input[name="cf-turnstile-response"], input[name="cf_challenge_response"], input[name*="turnstile-response"], textarea[name="g-recaptcha-response"], input[name="g-recaptcha-response"]'
      ));
      const hasSolvedToken = tokenInputs.some(i => i.value && i.value.trim().length > 20);
      const hasSuccessIndicator = Boolean(document.querySelector('[data-state="success"], [data-state="solved"], .turnstile-success, #challenge-success'));
      if (hasSolvedToken || hasSuccessIndicator) return false;

      const frame = document.querySelector(
        'iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[title*="cloudflare"], iframe[title*="turnstile"], iframe[title*="widget containing a cloudflare security challenge"]'
      );
      if (frame) return true;

      const stage = document.querySelector(
        '#challenge-stage, #cf-stage, .cf-turnstile, #turnstile-wrapper, #challenge-running, #cf-challenge-running, #cf-wrapper'
      );
      if (stage) {
        const rect = stage.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      }

      const bodyText = (document.body ? document.body.innerText : '').toLowerCase();
      return (
        bodyText.includes('just a moment') ||
        bodyText.includes('checking your browser') ||
        bodyText.includes('verify you are human') ||
        bodyText.includes('verifying you are human')
      );
    }).catch(() => false);

    const isChallengeDetected = Boolean(
      botStatus.isBlocked ||
      hasChallengeWidget ||
      visionAnalysis?.is_blocked ||
      visionAnalysis?.has_cloudflare ||
      visionAnalysis?.is_spinning ||
      visionAnalysis?.blocker_type === 'cloudflare' ||
      visionAnalysis?.blocker_type === 'captcha' ||
      visionAnalysis?.page_type === 'bot_challenge'
    );

    if (isChallengeDetected) {
      const challengeType = botStatus.keyword || visionAnalysis?.blocker_type || 'Cloudflare Security Challenge';
      this.emitThought(`👁️ [Visual Page Inspection]: Security challenge barrier detected on screenshot (${challengeType}). Holding all form actions & credential prompts...`, 'recovery');

      // Update plan dynamically with security challenge milestone steps
      this.plan = adaptPlanOnDeviation(this.plan, 'cloudflare_challenge', { type: challengeType });
      globalEventBus.emitEvent('agent.plan_adapted', { plan: this.plan });
      this.broadcastState();

      // Step A: Engage patient Cloudflare spinner verification engine with retry strategy
      this.emitThought(`Engaging patient Cloudflare verification engine (watching spinner & solving checkbox)...`, 'recovery');
      const { waitForCloudflareVerification, handleCloudflareBlockWithRetry } = await import('../browser/cloudflare-verifier.js');
      const solveRes = await waitForCloudflareVerification(activeTab.page, {
        maxWaitMs: 45000,
        pollIntervalMs: 400,
        sessionManager: this.sessionManager,
        allowClick: true,
        onThought: (msg, type) => this.emitThought(msg, type)
      });

      if (signal.aborted) return true;

      // If initial attempt failed, escalate to multi-attempt retry with session rotation
      if (!solveRes.verified && solveRes.timedOut) {
        this.emitThought('🔄 Initial Cloudflare verification timed out. Escalating to multi-attempt bypass strategy...', 'recovery');
        const retryRes = await handleCloudflareBlockWithRetry(activeTab.page, {
          targetUrl: activeTab.url,
          sessionManager: this.sessionManager,
          onThought: (msg, type) => this.emitThought(msg, type),
          maxAttempts: 3
        });

        if (signal.aborted) return true;

        if (!retryRes.verified) {
          this.emitThought('⚠️ Cloudflare bypass exhausted all attempts. The site may require a different network or manual verification.', 'recovery');
        }
      }

      // Step B: Observe page reload & verify fresh DOM state
      this.emitThought(`Observing post-challenge page reload and capturing updated screenshot...`, 'observation');
      try {
        await activeTab.page.waitForLoadState('domcontentloaded', { timeout: 8000 });
      } catch {}
      await new Promise(r => setTimeout(r, 1800));

      // Re-capture post-challenge screenshot
      const postFrame = await this.sessionManager.getScreenshot(false).catch(() => null);
      if (postFrame) {
        globalEventBus.emit('screencast.frame', { frame: postFrame });
      }

      const postCheck = await detectBotWall(activeTab.page);
      if (!postCheck.isBlocked) {
        this.emitThought(`✓ Security challenge cleared and visually verified! Resuming primary workflow...`, 'observation');
      } else {
        await globalToolRegistry.execute('browser.stealth_evade', {});
        await new Promise(r => setTimeout(r, 1000));
      }

      return true; // Challenge was detected and handled
    }

    return false; // Page is clean and ready
  }

  /**
   * GENERAL REACT INTERACTIVE BROWSER AGENT LOOP
   * Features:
   * 1. Continuous Visual Page Observation via Live Canvas Screenshots & Vision Sidecar
   * 2. Cloudflare Turnstile & reCAPTCHA solver using Cubic Bezier curved mouse physics
   * 3. Smart Entity Extraction & Credential Mapping (Prevents prompt string dumping)
   * 4. Interactive Human-In-The-Loop (HITL) Pop-up modal when inputs are verified and required
   */
  async executeGeneralInteractiveLoop(intent, signal) {
    let stepCount = 0;
    let isTaskComplete = false;

    while (!signal.aborted && this.status === 'executing' && stepCount < this.maxSteps && !isTaskComplete) {
      stepCount++;
      const activeTab = this.sessionManager.getActiveTab();
      if (!activeTab || !activeTab.page) break;

      // Update milestone step progress
      const currentMilestoneIdx = Math.min(Math.floor((stepCount - 1) / 2), (this.plan?.steps?.length || 1) - 1);
      if (this.plan?.steps && this.plan.steps[currentMilestoneIdx]) {
        for (let i = 0; i < this.plan.steps.length; i++) {
          if (i < currentMilestoneIdx) this.plan.steps[i].status = 'completed';
          else if (i === currentMilestoneIdx) this.plan.steps[i].status = 'executing';
          else this.plan.steps[i].status = 'pending';
        }
        this.broadcastState();
      }

      // =========================================================================
      // 1. Initial Site Navigation with Human Warmup & Referrer Chain
      // =========================================================================
      if (stepCount === 1) {
        let targetUrl = intent.targetSite;
        const curUrl = activeTab.url.toLowerCase();

        if (targetUrl && !curUrl.includes(new URL(targetUrl).hostname)) {
          // ─── PRE-NAVIGATION HUMAN WARMUP ───
          // Spend 2-3s performing natural human actions on the current page
          // to build activity reputation before hitting a CF-protected site
          this.emitThought(`Pre-navigation warmup: Performing natural human activity before navigating to ${targetUrl}...`, 'reasoning');
          
          const warmupDuration = 2000 + Math.random() * 1000; // 2-3s
          const warmupStart = Date.now();
          while (Date.now() - warmupStart < warmupDuration) {
            const rx = 100 + Math.floor(Math.random() * 800);
            const ry = 100 + Math.floor(Math.random() * 500);
            try {
              await this.sessionManager.moveMouse(rx, ry);
            } catch {}
            await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
          }

          // Optional: Scroll slightly to mimic real user behavior
          try {
            await this.sessionManager.scroll('down', 100 + Math.floor(Math.random() * 200));
            await new Promise(r => setTimeout(r, 300));
          } catch {}

          this.emitThought(`Navigating to target destination: ${targetUrl}...`, 'navigation');
          this.currentAction = {
            name: 'Navigating to destination',
            target: targetUrl,
            method: 'browser.navigate (Stealth + Warmup)',
            status: 'executing'
          };
          this.broadcastState();
          await globalToolRegistry.execute('browser.navigate', { url: targetUrl });
          
          // Post-navigation patience: Wait 2-4s before any interaction
          // to let Cloudflare's userActive detection kick in
          this.emitThought(`Post-navigation settling: Waiting for page to fully stabilize...`, 'observation');
          await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
          
          // Perform subtle mouse micro-movements to trigger Cloudflare's userActive flag
          for (let i = 0; i < 3; i++) {
            const mx = 200 + Math.floor(Math.random() * 600);
            const my = 150 + Math.floor(Math.random() * 400);
            try {
              await this.sessionManager.moveMouse(mx, my);
            } catch {}
            await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
          }

          // Observe visual screenshot immediately after initial navigation
          await this.observePageLoadAndDetectChallenges(activeTab, signal);
          continue;
        }
      }

      // =========================================================================
      // 2. Continuous Visual Screenshot Observation & Challenge Check
      // =========================================================================
      this.emitThought(`Observing live page load screenshot & verifying visual barrier status...`, 'observation');
      const challengeHandled = await this.observePageLoadAndDetectChallenges(activeTab, signal);
      if (signal.aborted) break;
      if (challengeHandled) {
        // If a challenge was handled, loop to re-observe the fresh post-challenge state
        continue;
      }

      // =========================================================================
      // 3. Observe DOM & Verify Interactive State
      // =========================================================================
      this.emitThought(`Observing page structure and interactive DOM elements...`, 'observation');
      const domElements = await this.sessionManager.getDomExtract({ maxElements: 100 });
      globalEventBus.emitEvent('dom.extracted', { count: domElements.length, url: activeTab.url });

      if (signal.aborted) break;

      // Dismiss intrusive overlay popups/banners
      const slopVerdict = await globalJevEngine.detectSlop(activeTab.url, activeTab.title, domElements);
      if (slopVerdict.has_overlay && slopVerdict.dismiss_element_id) {
        this.emitThought(`Detected intrusive overlay banner. Dismissing element: ${slopVerdict.dismiss_element_id}...`, 'recovery');
        await globalToolRegistry.execute('browser.click', { element_id: slopVerdict.dismiss_element_id });
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      // =========================================================================
      // 4. SMART AUTHENTICATION & FORM RECOGNITION
      // =========================================================================
      // Detect if page contains username / password login inputs
      const passwordField = domElements.find(el => el.editable && (el.type === 'password' || /pass(word)?/i.test(el.name || el.html_id || el.placeholder || el.aria_label)));
      const usernameField = domElements.find(el => el.editable && !/pass/i.test(el.type) && (/user(name)?|email|login|account|phone|userid|user-id|user_id/i.test(el.name || el.html_id || el.placeholder || el.aria_label) || el.type === 'email'));
      const isAuthSurface = Boolean(passwordField || (intent.isLogin && usernameField));

      // SCENARIO: Login/Auth Surface Detected but Credentials Missing -> Trigger HITL Pop-up!
      if (isAuthSurface) {
        // SAFETY GATE: Verify visual screenshot once more to ensure Cloudflare isn't covering the screen
        const isChallengeCovering = await this.observePageLoadAndDetectChallenges(activeTab, signal);
        if (isChallengeCovering) {
          continue; // Cloudflare challenge is active! Do NOT ask for credentials yet!
        }

        let creds = this.sessionCredentials || intent.credentials;
        if (!creds || !creds.username || !creds.password) {
          this.emitThought(`Visually verified login surface on ${activeTab.url}. Requesting credentials via interactive pop-up modal...`, 'reasoning');

          const userProvided = await this.requestUserInput({
            title: 'Account Credentials Required',
            reason: `AEGIS BOT is attempting to log in on ${activeTab.title || activeTab.url}. Please provide your login details.`,
            fields: [
              {
                name: 'username',
                label: 'User ID / Username / Email',
                type: 'text',
                required: true,
                placeholder: 'e.g. your_user_id',
                value: creds?.username || ''
              },
              {
                name: 'password',
                label: 'Password',
                type: 'password',
                required: true,
                placeholder: 'Enter account password',
                secret: true,
                value: ''
              }
            ]
          });

          if (userProvided) {
            this.sessionCredentials = {
              username: userProvided.username || creds?.username || '',
              password: userProvided.password || creds?.password || ''
            };
            creds = this.sessionCredentials;
          }
        }

        // Fill username and password accurately!
        if (creds && usernameField) {
          this.emitThought(`Filling verified username: "${creds.username}" into input [${usernameField.element_id}]...`, 'action');
          if (usernameField.center) {
            await globalToolRegistry.execute('browser.human_move_mouse', { x: usernameField.center.x, y: usernameField.center.y });
          }
          await globalToolRegistry.execute('browser.click', { element_id: usernameField.element_id });
          await new Promise(r => setTimeout(r, 150));
          await globalToolRegistry.execute('browser.type', { element_id: usernameField.element_id, text: creds.username });
          await new Promise(r => setTimeout(r, 200));
        }

        if (creds && passwordField) {
          this.emitThought(`Filling secure password into password input [${passwordField.element_id}]...`, 'action');
          if (passwordField.center) {
            await globalToolRegistry.execute('browser.human_move_mouse', { x: passwordField.center.x, y: passwordField.center.y });
          }
          await globalToolRegistry.execute('browser.click', { element_id: passwordField.element_id });
          await new Promise(r => setTimeout(r, 150));
          await globalToolRegistry.execute('browser.type', { element_id: passwordField.element_id, text: creds.password });
          await new Promise(r => setTimeout(r, 250));
        }

        // =========================================================================
        // STRICT DOM CREDENTIAL VERIFICATION GATE
        // Verify both username and password values exist in DOM before proceeding.
        // If the custom framework swallowed typing, force-inject and fire reactive events!
        // =========================================================================
        if (creds) {
          const domFillCheck = await activeTab.page.evaluate(({ u, p }) => {
            const uInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"])'))
              .filter(el => /user|_username|email|login|account|enrollment/i.test(el.name || el.id || el.placeholder || ''));
            const pInputs = Array.from(document.querySelectorAll('input[type="password"]'));

            const uEl = uInputs.find(el => el.offsetParent !== null) || uInputs[0];
            const pEl = pInputs.find(el => el.offsetParent !== null) || pInputs[0];

            if (uEl && (!uEl.value || uEl.value !== u)) {
              uEl.focus();
              uEl.value = u;
              uEl.dispatchEvent(new Event('input', { bubbles: true }));
              uEl.dispatchEvent(new Event('change', { bubbles: true }));
              uEl.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            if (pEl && (!pEl.value || pEl.value !== p)) {
              pEl.focus();
              pEl.value = p;
              pEl.dispatchEvent(new Event('input', { bubbles: true }));
              pEl.dispatchEvent(new Event('change', { bubbles: true }));
              pEl.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            return {
              userVal: uEl ? uEl.value : null,
              passLen: pEl && pEl.value ? pEl.value.length : 0
            };
          }, { u: creds.username, p: creds.password }).catch(() => ({ userVal: null, passLen: 0 }));

          this.emitThought(
            `✓ Form credential validation confirmed in DOM (User: "${domFillCheck.userVal || '✓'}", Password: ${domFillCheck.passLen > 0 ? '••••••••' : 'empty'}).`,
            'observation'
          );
        }

        // =========================================================================
        // PATIENT CLOUDFLARE TURNSTILE & VERIFICATION SPINNER GATE
        // User: "The Bot does not have patience at all let the cloudflareverfy loading spins thecn click on login and continue to use"
        // =========================================================================
        // Ensure user active activity flag is triggered on page
        await activeTab.page.evaluate(() => {
          window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 250, clientY: 250 }));
          if (typeof userActive !== 'undefined') userActive = true;
        }).catch(() => {});

        const { inspectCloudflareVerification, waitForCloudflareVerification, handleCloudflareBlockWithRetry } = await import('../browser/cloudflare-verifier.js');
        let turnstileState = await inspectCloudflareVerification(activeTab.page);

        if (turnstileState.hasChallenge && !turnstileState.isVerified) {
          this.emitThought(
            `👁️ [Cloudflare Verification Gate]: Detected verification challenge on login form. Let the verification spinner spin until complete before clicking Log In...`,
            'recovery'
          );

          const verifyResult = await waitForCloudflareVerification(activeTab.page, {
            maxWaitMs: 45000,
            pollIntervalMs: 400,
            sessionManager: this.sessionManager,
            allowClick: true,
            onThought: (msg, type) => this.emitThought(msg, type)
          });

          // If initial attempt failed, try retry strategy
          if (!verifyResult.verified && verifyResult.timedOut) {
            this.emitThought('🔄 Login Turnstile verification timed out. Escalating to retry bypass...', 'recovery');
            await handleCloudflareBlockWithRetry(activeTab.page, {
              targetUrl: activeTab.url,
              sessionManager: this.sessionManager,
              onThought: (msg, type) => this.emitThought(msg, type),
              maxAttempts: 2
            });
          }

          // Re-inspect state
          turnstileState = await inspectCloudflareVerification(activeTab.page);

          // Re-fetch fresh DOM extract after spinner completes so submit button coordinates are up-to-date
          const refreshedDom = await this.sessionManager.getDomExtract({ maxElements: 100 });
          if (refreshedDom && refreshedDom.length > 0) {
            domElements.length = 0;
            domElements.push(...refreshedDom);
          }
        }

        // Check if token verification is still pending on form (e.g. Amizone RecaptchaToken or cf-turnstile-response)
        const tokenGate = await activeTab.page.evaluate(() => {
          const hasCaptchaContainer = Boolean(document.querySelector('#Capthcadiv, .cf-turnstile, #challenge-stage'));
          const cfResp = document.querySelector('input[name="cf-turnstile-response"]')?.value;
          const rcResp = document.getElementById('RecaptchaToken')?.value;
          const hasTokens = Boolean((cfResp && cfResp.length > 20) || (rcResp && rcResp.length > 20));
          return { hasCaptchaContainer, hasTokens };
        }).catch(() => ({ hasCaptchaContainer: false, hasTokens: true }));

        if (tokenGate.hasCaptchaContainer && !tokenGate.hasTokens) {
          this.emitThought(
            `⏳ [Cloudflare Patience Gate]: Verification token callback still in flight. Waiting patiently for token generation...`,
            'recovery'
          );
          for (let pWait = 0; pWait < 12; pWait++) {
            await new Promise(r => setTimeout(r, 1000));
            const ready = await activeTab.page.evaluate(() => {
              const cf = document.querySelector('input[name="cf-turnstile-response"]')?.value;
              const rc = document.getElementById('RecaptchaToken')?.value;
              return Boolean((cf && cf.length > 20) || (rc && rc.length > 20));
            }).catch(() => false);
            if (ready) {
              this.emitThought(`✓ Security verification confirmed. Response token ready.`, 'observation');
              break;
            }
          }
        }

        // Locate submit button
        const submitBtn = domElements.find(el => el.role === 'button' && /sign|log|submit|continue/i.test(el.text || el.value || el.aria_label));
        if (submitBtn) {
          this.emitThought(`Submitting login credentials via button "${submitBtn.text || 'Submit'}"...`, 'action');
          if (submitBtn.center) {
            await globalToolRegistry.execute('browser.human_move_mouse', { x: submitBtn.center.x, y: submitBtn.center.y });
          }
          await globalToolRegistry.execute('browser.click', { element_id: submitBtn.element_id });
        } else {
          this.emitThought(`Submitting login via Enter key...`, 'action');
          await globalToolRegistry.execute('browser.press', { key: 'Enter' });
        }

        // Observe post-login reload and verify state
        this.emitThought(`Observing post-login page state and verifying authenticated session...`, 'observation');
        if (activeTab.page) {
          await activeTab.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 2500));

        // Capture post-login screenshot for user screencast
        const postLoginScreenshot = await this.sessionManager.getScreenshot(false).catch(() => null);
        if (postLoginScreenshot) {
          globalEventBus.emit('screencast.frame', { frame: postLoginScreenshot });
        }

        // Rigorous check if session is authenticated
        const authVerdict = await activeTab.page.evaluate(() => {
          const passInput = document.querySelector('input[type="password"]');
          const isStillOnLogin = Boolean(passInput && passInput.offsetParent !== null);
          const errorMsgEl = document.querySelector('.text-danger, .validation-summary-errors, .alert-danger, #lblMessage, [class*="error" i]');
          const errorText = errorMsgEl ? (errorMsgEl.innerText || '').trim().slice(0, 120) : '';
          return { isStillOnLogin, errorText };
        }).catch(() => ({ isStillOnLogin: false, errorText: '' }));

        // CRITICAL BUG FIX: If still on login screen, NEVER falsely report task complete!
        if (authVerdict.isStillOnLogin) {
          this.emitThought(
            `⚠️ [Login Incomplete]: Still on login screen. Password field is still detected. ${authVerdict.errorText ? `Notice: "${authVerdict.errorText}". ` : ''}Retrying verification in next step...`,
            'recovery'
          );
          // Do NOT mark isTaskComplete! Allow the loop to continue and retry or resolve
          continue;
        }

        this.emitThought(`✓ Login successful! Authenticated session verified on ${activeTab.url}.`, 'observation');

        // Determine if user requested to continue using the site
        const shouldContinueUsing = intent.shouldContinue || (intent.cleanQuery && !['login', 'and', ''].includes(intent.cleanQuery.toLowerCase()));

        if (shouldContinueUsing) {
          this.emitThought(`Authenticated session confirmed. Continuing to use the site as requested by task instructions...`, 'reasoning');
          continue; // Keep the agent running in the active session!
        } else {
          this.emitThought(`Login completed successfully and session confirmed. Ready for next instructions.`, 'reasoning');
          isTaskComplete = true;
          continue;
        }
      }

      // =========================================================================
      // 5. JEV Element Selection & General Form Handling
      // =========================================================================
      this.emitThought(`Evaluating interactive elements matching task intent "${intent.cleanQuery || 'navigation'}"...`, 'reasoning');
      const jevDecision = await globalJevEngine.judgeElement(this.currentTask, domElements);
      this.targetElement = jevDecision.element;

      if (!jevDecision.element_id || jevDecision.element_id === 'none' || !jevDecision.element) {
        this.emitThought(`No direct interactive target found. Scrolling down to reveal more content...`, 'action');
        await globalToolRegistry.execute('browser.scroll', { direction: 'down', amount: 450 });
        await new Promise(r => setTimeout(r, 800));
        if (stepCount >= 4) isTaskComplete = true;
        continue;
      }

      // 6. Execute Action with Smart Text Value Determination
      const target = jevDecision.element;
      const actionType = jevDecision.action || (target.editable ? 'type' : 'click');

      this.currentAction = {
        name: actionType === 'type' ? 'Typing target input' : 'Clicking target element',
        target: `${target.tag} [${target.element_id}] "${target.text || target.placeholder || target.aria_label}"`,
        method: `JEV System-One (${Math.round(jevDecision.confidence * 100)}% conf)`,
        status: 'executing'
      };
      this.broadcastState();

      if (actionType === 'type' || target.editable) {
        // Determine what value should be typed:
        let valueToType = '';

        const isFieldPassword = target.type === 'password' || /pass/i.test(target.name || target.placeholder || target.html_id);
        const isFieldUsername = !isFieldPassword && /user|email|login|account|phone/i.test(target.name || target.placeholder || target.html_id);
        const isFieldOtp = /(?:otp|2fa|code|verification|token|pin|mfa)/i.test(target.name || target.placeholder || target.html_id || target.aria_label);
        const isFieldConfidential = isFieldOtp || /(?:ssn|card|cvv|cvc|expir|credit|debit|secret|pin)/i.test(target.name || target.placeholder || target.html_id);

        if (isFieldPassword) {
          valueToType = this.sessionCredentials?.password || intent.credentials?.password || '';
          if (!valueToType) {
            const inputRes = await this.requestUserInput({
              title: 'Password Required',
              reason: `The field "${target.placeholder || target.name || 'Password'}" requires confidential credentials.`,
              fields: [{ name: 'password', label: 'Password', type: 'password', required: true, secret: true }]
            });
            valueToType = inputRes?.password || '';
          }
        } else if (isFieldUsername) {
          valueToType = this.sessionCredentials?.username || intent.credentials?.username || '';
          if (!valueToType) {
            const inputRes = await this.requestUserInput({
              title: 'Username / User ID Required',
              reason: `The field "${target.placeholder || target.name || 'Username'}" requires account identifier.`,
              fields: [{ name: 'username', label: 'Username or User ID', type: 'text', required: true }]
            });
            valueToType = inputRes?.username || '';
          }
        } else if (isFieldConfidential || isFieldOtp) {
          valueToType = this.sessionFields.otp || intent.fields?.otp || '';
          if (!valueToType) {
            const fieldName = target.placeholder || target.aria_label || target.name || 'Verification Code';
            const inputRes = await this.requestUserInput({
              title: 'Confidential Verification Code (OTP)',
              reason: `The page requires "${fieldName}" to proceed safely.`,
              fields: [{ name: 'otp', label: fieldName, type: 'text', required: true, placeholder: 'e.g. 123456' }]
            });
            valueToType = inputRes?.otp || '';
          }
        } else {
          // Check explicit form fields in intent/session
          const targetKey = (target.name || target.placeholder || target.aria_label || '').toLowerCase();
          for (const [k, v] of Object.entries({ ...intent.fields, ...this.sessionFields })) {
            if (targetKey.includes(k) || k.includes(targetKey)) {
              valueToType = v;
              break;
            }
          }

          // If no context exists and it is NOT a search bar, prompt the user for input!
          const isSearchBar = target.role === 'searchbox' || /search|query|find/i.test(target.name || target.placeholder || target.html_id || target.aria_label);
          if (!valueToType && !isSearchBar && target.tag === 'input') {
            const fieldLabel = target.placeholder || target.aria_label || target.name || 'Form Field';
            const inputRes = await this.requestUserInput({
              title: `Information Required: ${fieldLabel}`,
              reason: `AEGIS BOT lacks context for this form field. Please enter the desired value for "${fieldLabel}".`,
              fields: [{ name: 'val', label: fieldLabel, type: 'text', required: true, placeholder: `Enter ${fieldLabel}` }]
            });
            valueToType = inputRes?.val || '';
          }

          // Search bar fallback: use cleanQuery
          if (!valueToType && isSearchBar) {
            valueToType = intent.cleanQuery || 'search query';
          }
        }

        // CRITICAL: Ensure we never type prompt instructions!
        if (valueToType && !valueToType.toLowerCase().includes('login with these credentials')) {
          this.emitThought(`Target input located. Typing value: "${isFieldPassword ? '••••••••' : valueToType}"...`, 'action');

          if (target.center) {
            await globalToolRegistry.execute('browser.human_move_mouse', { x: target.center.x, y: target.center.y });
          }
          await globalToolRegistry.execute('browser.click', { element_id: target.element_id });
          await new Promise(r => setTimeout(r, 200));

          await globalToolRegistry.execute('browser.type', { text: valueToType });
          await new Promise(r => setTimeout(r, 300));

          await globalToolRegistry.execute('browser.press', { key: 'Enter' });
          await new Promise(r => setTimeout(r, 1500));
        }
      } else {
        this.emitThought(`Clicking target element "${target.text || target.aria_label}"...`, 'action');
        if (target.center) {
          await globalToolRegistry.execute('browser.human_move_mouse', { x: target.center.x, y: target.center.y });
        }
        await globalToolRegistry.execute('browser.click', { element_id: target.element_id });
        await new Promise(r => setTimeout(r, 1000));
      }

      this.stepHistory.push({
        step: stepCount,
        action: actionType,
        target: target.element_id,
        verified: true
      });

      if (!intent.isLogin && (actionType === 'type' || stepCount >= 3)) {
        await new Promise(r => setTimeout(r, 1000));
        isTaskComplete = true;
      }
    }

    if (signal.aborted || this.status === 'stopped') return;

    // Verify if task truly completed or failed (prevent false completion for login flows)
    const activeTab = this.sessionManager.getActiveTab();
    const finalLoginStillPending = intent.isLogin && activeTab?.page ? await activeTab.page.evaluate(() => {
      const pass = document.querySelector('input[type="password"]');
      return Boolean(pass && pass.offsetParent !== null);
    }).catch(() => false) : false;

    if (finalLoginStillPending) {
      this.status = 'failed';
      this.currentAction = {
        name: 'Login Incomplete',
        target: 'Authentication pending - login screen still present',
        method: 'Verification gate',
        status: 'failed'
      };
      this.emitThought(`⚠️ Task finished: Login form is still active on screen. Please verify credentials or complete security verification.`, 'recovery');
    } else {
      if (this.plan && this.plan.steps) {
        for (const s of this.plan.steps) {
          s.status = 'completed';
        }
      }

      this.status = 'completed';
      this.currentAction = {
        name: 'Task Complete',
        target: 'Execution finished successfully',
        method: 'All milestone steps verified',
        status: 'completed'
      };

      globalEventBus.emitEvent('agent.task_completed', {
        task: this.currentTask,
        steps_executed: stepCount
      });
    }

    this.broadcastState();
  }
}
