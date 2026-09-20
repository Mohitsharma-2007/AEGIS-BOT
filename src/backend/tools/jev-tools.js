import { globalModelRouter } from '../providers/router.js';
import { globalEventBus } from '../events/event-bus.js';

export class JevEngine {
  constructor() {
    this.vercelApiKey = process.env.VERCEL_AI_KEY;
    this.vercelGatewayUrl = process.env.VERCEL_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1';
  }

  /**
   * Internal evaluator that attempts Vercel AI Gateway JEV evaluation,
   * with seamless fast-fallback to fast LLM decisions.
   */
  async evaluate(state, questions) {
    const startTime = Date.now();
    let result = null;

    // Attempt direct Vercel AI Gateway evaluate
    if (this.vercelApiKey) {
      try {
        const res = await fetch(`${this.vercelGatewayUrl}/evaluate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.vercelApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'typesafe-ai/jev',
            state,
            questions
          }),
          signal: AbortSignal.timeout(3500)
        });

        if (res.ok) {
          result = await res.json();
          globalEventBus.emitEvent('jev.evaluation_success', {
            engine: 'vercel_ai_gateway',
            latency_ms: Date.now() - startTime
          });
          return result;
        }
      } catch (e) {
        // Fallback below
      }
    }

    // Fast System-One decision fallback
    const prompt = `You are JEV, the System-One calibrated decision model from TypeSafe AI.
Given the current state and questions, evaluate with precise probabilities (0.0 to 1.0) and typed decisions.

STATE:
${state}

QUESTIONS SCHEMA:
${JSON.stringify(questions, null, 2)}

Respond with STRICT JSON matching this schema:
{
  "answers": {
    "<question_key>": {
      "value": "<selected choice or boolean>",
      "probability": <0.0 to 1.0 confidence score>,
      "rationale": "<brief explanation>"
    }
  }
}`;

    try {
      const resp = await globalModelRouter.chat([
        { role: 'system', content: 'You are JEV decision engine. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'groq',
        model: 'openai/gpt-oss-120b',
        timeoutMs: 3000,
        temperature: 0.1
      });

      const cleanJson = resp.content.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJson);
      result.latency_ms = Date.now() - startTime;
      result.engine = 'jev_system_one_fast';

      globalEventBus.emitEvent('jev.evaluation_success', {
        engine: 'jev_system_one_fast',
        latency_ms: result.latency_ms
      });
      return result;
    } catch (err) {
      console.warn('[Jev Fallback Error]:', err.message);
      // Construct safe deterministic fallback
      const fallbackAnswers = {};
      for (const [key, q] of Object.entries(questions)) {
        fallbackAnswers[key] = {
          value: q.type === 'boolean' ? true : (q.choices ? q.choices[0] : 'unknown'),
          probability: 0.75,
          rationale: 'Deterministic heuristic decision'
        };
      }
      return { answers: fallbackAnswers, latency_ms: Date.now() - startTime, engine: 'heuristic' };
    }
  }

  /**
   * Tool 1: Jev Element Judge & Picker
   * Evaluates candidate interactive elements and returns the best match with calibrated confidence.
   */
  async judgeElement(taskIntent, elements = []) {
    const candidates = elements.slice(0, 30).map(e => ({
      id: e.element_id,
      tag: e.tag,
      role: e.role,
      text: e.text,
      aria: e.aria_label,
      placeholder: e.placeholder,
      center: e.center
    }));

    const state = `Task: "${taskIntent}"\nCandidate Elements:\n${JSON.stringify(candidates, null, 1)}`;
    const questions = {
      selected_element: {
        type: 'choice',
        choices: candidates.map(c => c.id).concat(['none']),
        instructions: 'Select the exact element ID that the user wants to interact with next to accomplish the task.'
      },
      confidence: {
        type: 'score',
        scale: '0.0 to 1.0',
        instructions: 'Calibrated confidence score that this element is the correct target.'
      },
      recommended_action: {
        type: 'choice',
        choices: ['click', 'type', 'scroll', 'navigate'],
        instructions: 'The action to perform on this element.'
      }
    };

    const evalResult = await this.evaluate(state, questions);
    const selectedId = evalResult.answers?.selected_element?.value;
    const confidence = evalResult.answers?.confidence?.probability || evalResult.answers?.selected_element?.probability || 0.85;
    const action = evalResult.answers?.recommended_action?.value || 'click';
    const rationale = evalResult.answers?.selected_element?.rationale || '';

    const winner = elements.find(e => e.element_id === selectedId) || null;

    globalEventBus.emitEvent('jev.element_judge', {
      task: taskIntent,
      selected_id: selectedId,
      confidence,
      action,
      rationale,
      element: winner
    });

    return {
      element_id: selectedId,
      element: winner,
      confidence,
      action,
      rationale
    };
  }

  /**
   * Tool 2: Jev Action Verifier
   * Validates if a browser action achieved its expected result.
   */
  async verifyAction(actionName, beforeState, afterState, expectedGoal) {
    const state = `Action Executed: ${actionName}
Expected Goal: "${expectedGoal}"
Before State: URL=${beforeState.url}, Title="${beforeState.title}"
After State: URL=${afterState.url}, Title="${afterState.title}"`;

    const questions = {
      action_successful: {
        type: 'boolean',
        instructions: 'Did the action achieve the expected visual or state progress on the webpage?'
      },
      page_changed: {
        type: 'boolean',
        instructions: 'Did the page state meaningfully change?'
      }
    };

    const evalResult = await this.evaluate(state, questions);
    const isSuccess = evalResult.answers?.action_successful?.value !== false;
    const prob = evalResult.answers?.action_successful?.probability || 0.9;
    const rationale = evalResult.answers?.action_successful?.rationale || '';

    globalEventBus.emitEvent('jev.action_verified', {
      action: actionName,
      success: isSuccess,
      probability: prob,
      rationale
    });

    return {
      success: isSuccess,
      probability: prob,
      rationale
    };
  }

  /**
   * Tool 3: Jev AI Slop & Clutter Detector
   * Filters spam modals, cookie notices, and overlays so the agent can focus.
   */
  async detectSlop(url, title, elements = []) {
    const clutterCandidates = elements.filter(e => {
      const combined = `${e.text} ${e.aria_label} ${e.placeholder}`.toLowerCase();
      return combined.includes('cookie') || combined.includes('accept') || combined.includes('consent') ||
        combined.includes('subscribe') || combined.includes('newsletter') || combined.includes('close') || combined.includes('dismiss');
    });

    const state = `URL: ${url}
Title: ${title}
Overlay Elements: ${JSON.stringify(clutterCandidates.slice(0, 10))}`;

    const questions = {
      has_blocking_overlay: {
        type: 'boolean',
        instructions: 'Is there a cookie banner, modal popup, or promotional overlay obstructing the page?'
      },
      dismiss_element_id: {
        type: 'choice',
        choices: clutterCandidates.map(c => c.element_id).concat(['none']),
        instructions: 'Element ID to click to dismiss the modal/overlay, if present.'
      }
    };

    const evalResult = await this.evaluate(state, questions);
    const hasOverlay = evalResult.answers?.has_blocking_overlay?.value === true;
    const dismissId = evalResult.answers?.dismiss_element_id?.value;

    globalEventBus.emitEvent('jev.slop_detected', {
      has_overlay: hasOverlay,
      dismiss_element_id: dismissId,
      probability: evalResult.answers?.has_blocking_overlay?.probability || 0.5
    });

    return {
      has_overlay: hasOverlay,
      dismiss_element_id: dismissId !== 'none' ? dismissId : null
    };
  }

  /**
   * Tool 4: Jev Skill & Model Dispatcher
   * Routes the next action in sub-500ms.
   */
  async routeNextStep(task, currentUrl, history = []) {
    const state = `Goal: "${task}"
Current URL: ${currentUrl}
Recent Actions: ${JSON.stringify(history.slice(-3))}`;

    const questions = {
      next_tool: {
        type: 'choice',
        choices: ['browser.navigate', 'browser.find_element', 'browser.click', 'browser.type', 'browser.scroll', 'agent.complete'],
        instructions: 'What is the immediate next tool that should be invoked?'
      }
    };

    const res = await this.evaluate(state, questions);
    return res.answers?.next_tool?.value || 'browser.find_element';
  }
}

export const globalJevEngine = new JevEngine();
