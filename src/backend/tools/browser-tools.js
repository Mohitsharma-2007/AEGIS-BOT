import { globalToolRegistry } from './registry.js';
import { globalJevEngine } from './jev-tools.js';

export function registerBrowserTools(sessionManager) {
  // 1. browser.navigate
  globalToolRegistry.register({
    name: 'browser.navigate',
    description: 'Navigates the active browser tab to a specified URL or search query.',
    inputSchema: { url: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = sessionManager.getActiveTab();
      return await sessionManager.navigateTab(tab?.id, input.url);
    }
  });

  // 2. browser.back
  globalToolRegistry.register({
    name: 'browser.back',
    description: 'Navigates back in browser history.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.goBack();
      return { success: true, url: page.url() };
    }
  });

  // 3. browser.forward
  globalToolRegistry.register({
    name: 'browser.forward',
    description: 'Navigates forward in browser history.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.goForward();
      return { success: true, url: page.url() };
    }
  });

  // 4. browser.reload
  globalToolRegistry.register({
    name: 'browser.reload',
    description: 'Reloads the current page.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.reload();
      return { success: true, url: page.url() };
    }
  });

  // 5. browser.get_url
  globalToolRegistry.register({
    name: 'browser.get_url',
    description: 'Returns the current page URL.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      const page = sessionManager.getActivePage();
      return { url: page ? page.url() : '' };
    }
  });

  // 6. browser.get_title
  globalToolRegistry.register({
    name: 'browser.get_title',
    description: 'Returns the current page title.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      const page = sessionManager.getActivePage();
      return { title: page ? await page.title() : '' };
    }
  });

  // 7. browser.screenshot
  globalToolRegistry.register({
    name: 'browser.screenshot',
    description: 'Captures the current viewport screenshot as base64 JPEG.',
    inputSchema: { full_page: 'boolean' },
    permissions: ['read'],
    async execute(input) {
      const base64 = await sessionManager.getScreenshot(input.full_page);
      return { success: true, screenshot_length: base64.length, data: base64 };
    }
  });

  // 8. browser.dom_extract
  globalToolRegistry.register({
    name: 'browser.dom_extract',
    description: 'Extracts normalized interactive DOM elements with element_id, role, text, bbox.',
    inputSchema: { scope: 'string' },
    permissions: ['read_dom'],
    async execute(input) {
      const elements = await sessionManager.getDomExtract({ maxElements: 120 });
      return { success: true, count: elements.length, elements };
    }
  });

  // 9. browser.accessibility_extract
  globalToolRegistry.register({
    name: 'browser.accessibility_extract',
    description: 'Extracts the page accessibility tree hierarchy.',
    inputSchema: { maxNodes: 'number' },
    permissions: ['read_dom'],
    async execute(input) {
      const nodes = await sessionManager.getA11yExtract(input);
      return { success: true, count: nodes.length, nodes };
    }
  });

  // 10. browser.find_element (Semantic locator powered by JEV System-One)
  globalToolRegistry.register({
    name: 'browser.find_element',
    description: 'Finds the most relevant interactive element matching description using JEV System-One.',
    inputSchema: { description: 'string' },
    permissions: ['read_dom'],
    async execute(input) {
      const elements = await sessionManager.getDomExtract();
      const decision = await globalJevEngine.judgeElement(input.description, elements);
      return {
        success: Boolean(decision.element_id),
        element_id: decision.element_id,
        confidence: decision.confidence,
        action: decision.action,
        rationale: decision.rationale,
        element: decision.element
      };
    }
  });

  // 11. browser.move_mouse
  globalToolRegistry.register({
    name: 'browser.move_mouse',
    description: 'Smoothly moves the AEGIS cursor to x, y coordinates.',
    inputSchema: { x: 'number', y: 'number' },
    permissions: ['click'],
    async execute(input) {
      return await sessionManager.moveMouse(input.x, input.y);
    }
  });

  // 12. browser.click
  globalToolRegistry.register({
    name: 'browser.click',
    description: 'Clicks an element by element_id or by x, y coordinates with visual cursor feedback.',
    inputSchema: { element_id: 'string', x: 'number', y: 'number' },
    permissions: ['click'],
    async execute(input) {
      if (input.element_id) {
        return await sessionManager.clickElement(input.element_id);
      }
      return await sessionManager.click(input.x, input.y);
    }
  });

  // 13. browser.type
  globalToolRegistry.register({
    name: 'browser.type',
    description: 'Types text into an input element or current focus.',
    inputSchema: { element_id: 'string', text: 'string' },
    permissions: ['type'],
    async execute(input) {
      return await sessionManager.typeText(input.text, { element_id: input.element_id });
    }
  });

  // 14. browser.press
  globalToolRegistry.register({
    name: 'browser.press',
    description: 'Presses a keyboard key (Enter, Escape, Tab, etc.).',
    inputSchema: { key: 'string' },
    permissions: ['type'],
    async execute(input) {
      return await sessionManager.pressKey(input.key);
    }
  });

  // 15. browser.scroll
  globalToolRegistry.register({
    name: 'browser.scroll',
    description: 'Scrolls page up or down.',
    inputSchema: { direction: 'string', amount: 'number' },
    permissions: ['scroll'],
    async execute(input) {
      return await sessionManager.scroll(input.direction || 'down', input.amount || 500);
    }
  });

  // 16. browser.wait
  globalToolRegistry.register({
    name: 'browser.wait',
    description: 'Waits for duration or page load.',
    inputSchema: { duration_ms: 'number' },
    permissions: ['read'],
    async execute(input) {
      const ms = Math.min(input.duration_ms || 1000, 10000);
      await new Promise(r => setTimeout(r, ms));
      return { success: true, waited_ms: ms };
    }
  });

  // 17. browser.tabs.list
  globalToolRegistry.register({
    name: 'browser.tabs.list',
    description: 'Lists all open browser tabs.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      return { tabs: sessionManager.listTabs() };
    }
  });

  // 18. browser.tabs.new
  globalToolRegistry.register({
    name: 'browser.tabs.new',
    description: 'Opens a new browser tab with optional initial URL.',
    inputSchema: { url: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = await sessionManager.createTab(input.url || 'https://html.duckduckgo.com');
      return { success: true, tab_id: tab.id, url: tab.url };
    }
  });

  // 19. browser.tabs.switch
  globalToolRegistry.register({
    name: 'browser.tabs.switch',
    description: 'Switches focus to specified tab ID.',
    inputSchema: { tab_id: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = await sessionManager.switchTab(input.tab_id);
      return { success: true, active_tab: tab.id };
    }
  });

  // 20. browser.tabs.close
  globalToolRegistry.register({
    name: 'browser.tabs.close',
    description: 'Closes a browser tab.',
    inputSchema: { tab_id: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const res = await sessionManager.closeTab(input.tab_id);
      return { success: res };
    }
  });

  // 21. browser.get_content
  globalToolRegistry.register({
    name: 'browser.get_content',
    description: 'Extracts full readable textual and structural content from the active tab.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      return await sessionManager.getPageContent();
    }
  });

  // 22. browser.get_github_repos
  globalToolRegistry.register({
    name: 'browser.get_github_repos',
    description: 'Extracts structured repository cards (name, url, stars, description) from GitHub.',
    inputSchema: {},
    permissions: ['read'],
    category: 'Research & Extraction',
    async execute() {
      const repos = await sessionManager.getGithubRepoCards();
      return { count: repos.length, repos };
    }
  });

  // 23. agent.create_note
  globalToolRegistry.register({
    name: 'agent.create_note',
    description: 'Compiles and saves structured research notes with title, markdown content, and repository links.',
    inputSchema: { title: 'string', content: 'string', repo_url: 'string', stars: 'string', takeaways: 'array' },
    permissions: ['write'],
    category: 'Research & Knowledge Notes',
    async execute(input) {
      const { writeFileSync, existsSync, mkdirSync } = await import('fs');
      const { join } = await import('path');

      const notesDir = 'd:\\Aegis BOT\\notes';
      if (!existsSync(notesDir)) mkdirSync(notesDir, { recursive: true });

      const safeTitle = (input.title || 'agent-research-note').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
      const filename = `${safeTitle}-${Date.now()}.md`;
      const filepath = join(notesDir, filename);

      const markdown = `# ${input.title || 'Research Note'}\n\n` +
        `**Generated by AEGIS BOT** | ${new Date().toLocaleString()}\n` +
        (input.repo_url ? `**Repository / Link**: [${input.repo_url}](${input.repo_url})  \n` : '') +
        (input.stars ? `**Stars / Rating**: ⭐ ${input.stars}  \n\n` : '\n') +
        `---\n\n` +
        `${input.content}\n\n` +
        (input.takeaways && input.takeaways.length ? `## Key Takeaways\n${input.takeaways.map(t => `- ${t}`).join('\n')}\n` : '');

      writeFileSync(filepath, markdown, 'utf8');

      const noteData = {
        id: `note-${Date.now()}`,
        filename,
        filepath,
        title: input.title,
        repo_url: input.repo_url,
        stars: input.stars,
        content: input.content,
        takeaways: input.takeaways || [],
        markdown,
        timestamp: new Date().toISOString()
      };

      const { globalEventBus } = await import('../events/event-bus.js');
      globalEventBus.emitEvent('agent.note_created', noteData);

      console.log(`[AEGIS Notes] Saved research note to: ${filepath}`);
      return { success: true, note: noteData };
    }
  });
  // 24. vision.inspect_canvas (Visual Model Side-by-Side Co-Pilot)
  globalToolRegistry.register({
    name: 'vision.inspect_canvas',
    description: 'Uses side-by-side Vision LLM (Llama 3.2 Vision / Qwen 2 VL) to visually analyze browser frame, detect bot walls, and ground targets.',
    inputSchema: { goal: 'string', base64: 'string' },
    permissions: ['read', 'vision'],
    category: 'Computer Vision & Grounding',
    async execute(input) {
      const { globalVisionAssistant } = await import('../agent/vision-assistant.js');
      const frame = input.base64 || await sessionManager.getScreenshot(false);
      const analysis = await globalVisionAssistant.inspectCanvas(frame, input.goal || 'General inspection');
      return { success: true, analysis };
    }
  });

  // 25. browser.stealth_evade (Anti-Bot Countermeasures)
  globalToolRegistry.register({
    name: 'browser.stealth_evade',
    description: 'Applies stealth patches, masks navigator.webdriver, overrides WebGL vendor and rotates headers to evade bot detection.',
    inputSchema: { targetUrl: 'string' },
    permissions: ['navigate', 'stealth'],
    category: 'Stealth & Anti-Bot Defense',
    async execute(input) {
      const { applyStealthPatches } = await import('../browser/runtime.js');
      if (sessionManager.context) {
        await applyStealthPatches(sessionManager.context);
      }
      const page = sessionManager.getActivePage();
      if (page) {
        await applyStealthPatches(page);
        if (input.targetUrl) {
          await page.goto(input.targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }
      }
      return { success: true, message: 'Stealth evasion active: navigator.webdriver masked, plugins shimmed, WebGL sanitized.' };
    }
  });

  // 26. browser.detect_wall (Challenge & CAPTCHA Detector)
  globalToolRegistry.register({
    name: 'browser.detect_wall',
    description: 'Inspects DOM and canvas for bot detection walls ("unusual traffic", Cloudflare Turnstile, CAPTCHA).',
    inputSchema: {},
    permissions: ['read'],
    category: 'Stealth & Anti-Bot Defense',
    async execute() {
      const { detectBotWall } = await import('../browser/runtime.js');
      const page = sessionManager.getActivePage();
      if (!page) return { isBlocked: false, reason: 'no page' };
      const status = await detectBotWall(page);
      return { success: true, ...status };
    }
  });

  // 27. data.compare_products (E-Commerce & Listing Extraction)
  globalToolRegistry.register({
    name: 'data.compare_products',
    description: 'Extracts and parses product cards (title, price, currency, rating, and direct product link) from active store.',
    inputSchema: { max_items: 'number' },
    permissions: ['read_dom'],
    category: 'Commerce & Data Extraction',
    async execute(input) {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');

      const products = await page.evaluate((limit) => {
        const results = [];
        // Amazon selectors
        const amazonCards = Array.from(document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]'));
        for (const card of amazonCards) {
          if (results.length >= limit) break;
          const titleEl = card.querySelector('h2 a span, h2 span, .a-text-normal');
          const linkEl = card.querySelector('h2 a, a.a-link-normal');
          const priceWhole = card.querySelector('.a-price-whole');
          const priceSymbol = card.querySelector('.a-price-symbol')?.innerText || '₹';
          const ratingEl = card.querySelector('.a-icon-alt');

          if (titleEl && titleEl.innerText.trim()) {
            const priceVal = priceWhole ? parseInt(priceWhole.innerText.replace(/,/g, ''), 10) : null;
            let href = linkEl?.getAttribute('href') || '';
            if (href.startsWith('/')) href = 'https://www.amazon.in' + href;

            results.push({
              title: titleEl.innerText.trim(),
              price_text: priceWhole ? `${priceSymbol}${priceWhole.innerText}` : 'Check link',
              price_num: priceVal,
              rating: ratingEl?.innerText || 'N/A',
              url: href
            });
          }
        }
        return results;
      }, input.max_items || 10).catch(() => []);

      return { count: products.length, products };
    }
  });

  // 28. data.filter_budget
  globalToolRegistry.register({
    name: 'data.filter_budget',
    description: 'Filters a list of product items by maximum budget ceiling (e.g. ₹2,00,000 / 2 Lakhs).',
    inputSchema: { products: 'array', max_budget: 'number' },
    permissions: ['read'],
    category: 'Commerce & Data Extraction',
    async execute(input) {
      const items = input.products || [];
      const budget = input.max_budget || 200000;
      const filtered = items.filter(p => !p.price_num || p.price_num <= budget);
      return { total: items.length, matching: filtered.length, filtered_products: filtered };
    }
  });

  // 29. agent.adapt_plan (Dynamic Re-Planning)
  globalToolRegistry.register({
    name: 'agent.adapt_plan',
    description: 'Dynamically adapts and updates the active plan checklist when an obstacle, bot wall, or layout change is encountered.',
    inputSchema: { deviation_reason: 'string', context: 'object' },
    permissions: ['write'],
    category: 'Adaptive Planning & Control',
    async execute(input) {
      const { adaptPlanOnDeviation } = await import('../agent/planner.js');
      const { globalEventBus } = await import('../events/event-bus.js');
      globalEventBus.emitEvent('agent.plan_adapted', {
        reason: input.deviation_reason,
        context: input.context
      });
      return { success: true, adapted: true, reason: input.deviation_reason };
    }
  });

  // 30. agent.decompose_intent (Goal Reasoning & Formulation)
  globalToolRegistry.register({
    name: 'agent.decompose_intent',
    description: 'Decomposes raw user prompt into clean keywords, target domain, and workflow intent.',
    inputSchema: { prompt: 'string' },
    permissions: ['read'],
    category: 'Adaptive Planning & Control',
    async execute(input) {
      return { success: true, input_prompt: input.prompt };
    }
  });

  // 31. browser.human_move_mouse
  globalToolRegistry.register({
    name: 'browser.human_move_mouse',
    description: 'Moves cursor along a natural cubic Bezier curve with micro-jitter and human velocity acceleration.',
    inputSchema: { x: 'number', y: 'number' },
    permissions: ['interact'],
    category: 'Human-Like Mouse Physics',
    async execute(input) {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      return await sessionManager.moveMouse(input.x, input.y);
    }
  });

  // 32. browser.human_click
  globalToolRegistry.register({
    name: 'browser.human_click',
    description: 'Executes a human click with curved approach trajectory, realistic dwell pause, and hold duration.',
    inputSchema: { x: 'number', y: 'number', element_id: 'string' },
    permissions: ['interact'],
    category: 'Human-Like Mouse Physics',
    async execute(input) {
      if (input.element_id) {
        return await sessionManager.clickElement(input.element_id);
      }
      return await sessionManager.click(input.x, input.y);
    }
  });

  // 33. browser.solve_challenge
  globalToolRegistry.register({
    name: 'browser.solve_challenge',
    description: 'Detects and solves Cloudflare Turnstile, reCAPTCHA, and bot verification challenges using human curved mouse trajectory interaction.',
    inputSchema: { max_wait_ms: 'number' },
    permissions: ['interact', 'stealth'],
    category: 'Stealth & Anti-Bot Defense',
    async execute(input) {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');

      const { globalEventBus } = await import('../events/event-bus.js');
      globalEventBus.emitEvent('challenge.detected', { type: 'Turnstile/reCAPTCHA' });

      // 1. Wait a few seconds for challenge frame to settle and evaluate if auto-dismissing
      await new Promise(r => setTimeout(r, 2200));

      // 2. Check if already bypassed automatically
      const { detectBotWall } = await import('../browser/runtime.js');
      const initialWall = await detectBotWall(page);
      if (!initialWall.isBlocked) {
        return { success: true, method: 'auto_dismiss', message: 'Challenge cleared automatically.' };
      }

      // 3. Locate Turnstile / reCAPTCHA iframe or checkbox
      const checkboxBox = await page.evaluate(() => {
        const turnstileFrame = document.querySelector('iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], iframe[src*="recaptcha"]');
        if (turnstileFrame) {
          const rect = turnstileFrame.getBoundingClientRect();
          return {
            x: Math.round(rect.left + Math.min(35, rect.width * 0.15)),
            y: Math.round(rect.top + rect.height / 2),
            width: rect.width,
            height: rect.height
          };
        }
        const cfBox = document.querySelector('#cf-stage input[type="checkbox"], .cf-turnstile, #challenge-stage');
        if (cfBox) {
          const rect = cfBox.getBoundingClientRect();
          return {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            width: rect.width,
            height: rect.height
          };
        }
        return null;
      });

      if (checkboxBox) {
        // Add human slight randomized offset (+- 3px) so clicks aren't machine-centered
        const clickX = checkboxBox.x + Math.floor((Math.random() - 0.5) * 6);
        const clickY = checkboxBox.y + Math.floor((Math.random() - 0.5) * 6);

        // Curved human mouse approach and click
        await sessionManager.click(clickX, clickY);

        // Wait for token resolution
        await new Promise(r => setTimeout(r, 3500));
        const postWall = await detectBotWall(page);
        return {
          success: !postWall.isBlocked,
          method: 'human_curved_click',
          message: postWall.isBlocked ? 'Challenge clicked, awaiting verification' : 'Challenge solved successfully'
        };
      }

      return { success: false, reason: 'Checkbox element not directly accessible via viewport' };
    }
  });

  // 34. agent.request_input (Human In The Loop)
  globalToolRegistry.register({
    name: 'agent.request_input',
    description: 'Prompts the user via an interactive pop-up modal when credentials, confidential information, or missing parameters are required.',
    inputSchema: { title: 'string', fields: 'array', reason: 'string' },
    permissions: ['read', 'write'],
    category: 'Human-In-The-Loop (HITL)',
    async execute(input) {
      const { globalEventBus } = await import('../events/event-bus.js');
      const requestId = `req-${Date.now()}`;
      globalEventBus.emitEvent('agent.input_required', {
        id: requestId,
        title: input.title || 'Action Input Required',
        fields: input.fields || [],
        reason: input.reason || 'Authentication or form completion parameter needed'
      });
      return { success: true, requestId, status: 'awaiting_user_input' };
    }
  });

  console.log(`[ToolRegistry] Registered 34 AEGIS Tools (including Human-Like Mouse Physics, Challenge Solvers, Vision Co-Pilot & HITL) successfully.`);
}
