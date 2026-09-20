import { globalEventBus } from '../events/event-bus.js';

/**
 * AEGIS Vision Assistant Sidecar:
 * Works side-by-side with the main text/reasoning LLM to visually inspect
 * screenshots, detect bot challenges/CAPTCHAs, and visually ground elements.
 */
export class VisionAssistant {
  constructor(options = {}) {
    this.model = options.model || 'meta-llama/llama-3.2-11b-vision-instruct:free';
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.openRouterUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Visually inspects a screenshot frame side-by-side with current goal
   * @param {string} base64Image Base64 encoded JPEG/PNG image (with or without data: URI prefix)
   * @param {string} userGoal The user's active goal/intent
   * @returns {Promise<Object>} Visual grounding telemetry
   */
  async inspectCanvas(base64Image, userGoal = '') {
    if (!base64Image) {
      return { isBlocked: false, visualSummary: 'No canvas screenshot available' };
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const systemPrompt = `You are the AEGIS Vision Assistant sidecar.
Analyze the provided browser canvas screenshot alongside the user's goal: "${userGoal}".
Return a concise JSON response with:
{
  "is_blocked": boolean, // true if CAPTCHA, bot wall ("unusual traffic"), Cloudflare Turnstile, or blocking modal is visible
  "blocker_type": "none" | "captcha" | "unusual_traffic" | "cookie_wall" | "login_required",
  "page_type": "search_results" | "product_page" | "article" | "bot_challenge" | "home_page",
  "key_findings": ["brief description of 2-3 main visual elements found"],
  "recommended_action": "brief directive for main agent (e.g. 'pivot to direct amazon catalog', 'click search input at top', 'extract product list')"
}
Respond with raw JSON only.`;

    try {
      globalEventBus.emitEvent('vision.inspect_started', {
        goal: userGoal.slice(0, 50),
        model: this.model
      });

      // If OpenRouter key is configured, call visual model
      if (this.openRouterKey) {
        const response = await fetch(`${this.openRouterUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openRouterKey}`,
            'HTTP-Referer': 'https://aegis-bot-eta.vercel.app',
            'X-Title': 'AEGIS BOT Vision Assistant'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze this browser view for task: "${userGoal}"`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${cleanBase64}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 400
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.choices?.[0]?.message?.content || '{}';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            const parsed = JSON.parse(cleanJson);
            globalEventBus.emitEvent('vision.inspect_completed', parsed);
            return parsed;
          } catch {
            return {
              is_blocked: cleanJson.toLowerCase().includes('traffic') || cleanJson.toLowerCase().includes('captcha'),
              key_findings: [rawText.slice(0, 100)]
            };
          }
        }
      }

      // Fast fallback heuristic inspection if offline or API unavailable
      return {
        is_blocked: false,
        page_type: 'webpage',
        key_findings: ['Visual canvas rendered'],
        recommended_action: 'Proceed with DOM-guided interaction'
      };
    } catch (err) {
      console.warn('[Vision Assistant Warning]:', err.message);
      return { is_blocked: false, error: err.message };
    }
  }
}

export const globalVisionAssistant = new VisionAssistant();
