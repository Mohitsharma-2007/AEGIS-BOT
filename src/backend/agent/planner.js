import { globalModelRouter } from '../providers/router.js';
import { extractTaskEntities } from './entity-extractor.js';

/**
 * Decomposes a user task into a structured execution plan checklist.
 */
export async function generateTaskPlan(taskDescription, currentUrl = '') {
  const taskLower = taskDescription.toLowerCase();
  const entities = extractTaskEntities(taskDescription);

  // 1. Specialized Authentication / Login Intent Decomposition
  if (entities.isLogin) {
    const credInfo = entities.hasCredentials 
      ? `User ID: ${entities.credentials.username}` 
      : 'Awaiting User Prompt';

    return {
      title: 'Authentication & Secure Login Workflow',
      steps: [
        { id: 'step-1', title: 'Decompose login intent & verify credentials', target: credInfo, status: 'executing' },
        { id: 'step-2', title: 'Navigate to target service login surface', target: entities.targetSite || 'Login Destination', status: 'pending' },
        { id: 'step-3', title: 'Locate and verify username/email input field', target: 'Username Field', status: 'pending' },
        { id: 'step-4', title: 'Locate password field (request input if missing)', target: 'Password Field', status: 'pending' },
        { id: 'step-5', title: 'Submit credentials and verify authenticated state', target: 'Session Confirmation', status: 'pending' }
      ]
    };
  }

  // 2. Specialized Shopping Intent Decomposition (Amazon/RTX/Products)
  if (taskLower.includes('amazon') || taskLower.includes('laptop') || taskLower.includes('price') || taskLower.includes('buy')) {
    const budgetMatch = taskDescription.match(/under\s+([\d,\.]+\s*(?:lakhs?|k|inr|rs)?)/i);
    const budgetStr = budgetMatch ? budgetMatch[1] : '';

    return {
      title: 'Amazon Product Discovery & Price Comparison',
      steps: [
        { id: 'step-1', title: 'Parse product specs & budget criteria', target: budgetStr ? `Budget: under ${budgetStr}` : 'Specs', status: 'executing' },
        { id: 'step-2', title: 'Direct navigation to Amazon catalog', target: 'Amazon Store', status: 'pending' },
        { id: 'step-3', title: 'Execute query & apply price filters', target: 'Product Search', status: 'pending' },
        { id: 'step-4', title: 'Extract top rated laptops & verified pricing', target: 'Product Cards', status: 'pending' },
        { id: 'step-5', title: 'Generate comparison note with product links', target: 'AEGIS Research Notes', status: 'pending' }
      ]
    };
  }

  // 3. Specialized GitHub Research Intent Decomposition
  if (taskLower.includes('github') || taskLower.includes('repo')) {
    return {
      title: 'GitHub Research & Note Compilation',
      steps: [
        { id: 'step-1', title: 'Decompose query intent & star criteria', target: 'Task parameters', status: 'executing' },
        { id: 'step-2', title: 'Search GitHub (sorted by stars)', target: 'GitHub Search', status: 'pending' },
        { id: 'step-3', title: 'Rank & find #1 highest star repo', target: 'Repository ranking', status: 'pending' },
        { id: 'step-4', title: 'Open & read repo documentation', target: 'Repository README', status: 'pending' },
        { id: 'step-5', title: 'Create and save research note', target: 'AEGIS Notes', status: 'pending' }
      ]
    };
  }

  // 4. Fallback LLM-based plan generation
  const prompt = `You are the AEGIS BOT Execution Planner.
Given a user browser task, create a concise, user-facing checklist of 4 to 5 logical milestone steps.

TASK: "${taskDescription}"
STARTING URL: "${currentUrl}"

Respond with STRICT JSON:
{
  "title": "Short task title",
  "steps": [
    { "id": "step-1", "title": "Step title", "target": "Target description" }
  ]
}`;

  try {
    const res = await globalModelRouter.chat([
      { role: 'system', content: 'You are an execution planner. Output only JSON.' },
      { role: 'user', content: prompt }
    ], {
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      timeoutMs: 2500,
      temperature: 0.1
    });

    const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      title: parsed.title || taskDescription,
      steps: (parsed.steps || []).map((s, idx) => ({
        id: s.id || `step-${idx + 1}`,
        title: s.title,
        target: s.target || '',
        status: idx === 0 ? 'executing' : 'pending'
      }))
    };
  } catch {
    const isSearch = taskLower.includes('search') || taskLower.includes('find');
    return {
      title: taskDescription,
      steps: [
        { id: 'step-1', title: 'Analyze task intent & destination', target: 'Query parameters', status: 'executing' },
        { id: 'step-2', title: 'Navigate directly to target platform', target: 'Platform URL', status: 'pending' },
        { id: 'step-3', title: isSearch ? 'Execute query with anti-bot stealth' : 'Perform action', target: 'Query execution', status: 'pending' },
        { id: 'step-4', title: 'Verify and extract page results', target: 'Page elements', status: 'pending' },
        { id: 'step-5', title: 'Compile findings and conclude task', target: 'AEGIS Telemetry', status: 'pending' }
      ]
    };
  }
}

/**
 * Dynamically re-plans when an unexpected page state, bot challenge, or deviation occurs.
 */
export function adaptPlanOnDeviation(currentPlan, deviationReason, context = {}) {
  if (!currentPlan || !currentPlan.steps) return currentPlan;

  const steps = [...currentPlan.steps];

  // SCENARIO 1: Cloudflare Turnstile / Google reCAPTCHA Challenge
  if (deviationReason === 'cloudflare_challenge' || deviationReason === 'recaptcha_challenge' || deviationReason === 'bot_challenge') {
    return {
      ...currentPlan,
      title: `${currentPlan.title} (Resolving Security Challenge)`,
      isAdapted: true,
      steps: [
        { id: 'sec-1', title: '✓ Security challenge barrier encountered', target: context.type || 'Cloudflare / reCAPTCHA', status: 'completed', isAdapted: true },
        { id: 'sec-2', title: 'Wait 2-3s for frame settling & auto-dismissal check', target: 'Settling Delay', status: 'executing', isAdapted: true },
        { id: 'sec-3', title: 'Approach challenge checkbox with curved human mouse physics', target: 'Cubic Bezier Click', status: 'pending', isAdapted: true },
        { id: 'sec-4', title: 'Patiently wait for Cloudflare verification spinner to complete', target: 'Spinner Polling & Token Verification', status: 'pending', isAdapted: true },
        { id: 'sec-5', title: 'Confirm verified destination and resume workflow', target: 'Action Confirmation', status: 'pending', isAdapted: true },
        ...steps.filter(s => s.status !== 'completed').map(s => ({ ...s, isAdapted: true }))
      ]
    };
  }

  // SCENARIO 2: Interactive User Input Required (HITL Pop-up for Credentials / Confidential Data)
  if (deviationReason === 'auth_required' || deviationReason === 'input_required') {
    return {
      ...currentPlan,
      title: `${currentPlan.title} (Awaiting User Input)`,
      isAdapted: true,
      steps: [
        { id: 'hitl-1', title: 'Form requires credentials or confidential inputs', target: context.fieldLabel || 'Authentication Form', status: 'completed', isAdapted: true },
        { id: 'hitl-2', title: 'Trigger interactive HITL pop-up modal for user input', target: 'Modal Displayed', status: 'executing', isAdapted: true },
        { id: 'hitl-3', title: 'Receive user-entered data and inject into fields', target: 'Secure Field Fill', status: 'pending', isAdapted: true },
        { id: 'hitl-4', title: 'Verify form values and confirm submission', target: 'Form Submission', status: 'pending', isAdapted: true },
        ...steps.filter(s => s.status !== 'completed').map(s => ({ ...s, isAdapted: true }))
      ]
    };
  }

  // SCENARIO 3: Zero search results found
  if (deviationReason === 'zero_results') {
    return {
      ...currentPlan,
      title: `${currentPlan.title} (Broadened Query)`,
      isAdapted: true,
      steps: [
        ...steps.slice(0, 2).map(s => ({ ...s, status: 'completed' })),
        { id: 'adapt-broaden', title: 'Broaden search filter & retry query', target: 'Relaxed filters', status: 'executing', isAdapted: true },
        { id: 'adapt-results', title: 'Re-extract matching product cards', target: 'Product listings', status: 'pending', isAdapted: true }
      ]
    };
  }

  return currentPlan;
}
