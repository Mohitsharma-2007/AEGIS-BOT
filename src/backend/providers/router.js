import dotenv from 'dotenv';
dotenv.config();

export class ModelRouter {
  constructor() {
    this.providers = {
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter (Free Engine)',
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultModel: 'nvidia/nemotron-3.5-lightning:free',
        models: [
          { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nvidia Nemotron 3.5 Lightning (Free)', free: true },
          { id: 'inclusionai/ling-3.0-flash-vl:free', name: 'Ling 3.0 Flash VL (Free)', free: true },
          { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots 3 Note Preview (Free)', free: true },
          { id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 (Free)', free: true },
          { id: 'qwen/qwen3.8-27b:free', name: 'Qwen 3.8 27B (Free)', free: true }
        ]
      },
      groq: {
        id: 'groq',
        name: 'Groq (Ultra-Fast LPU)',
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: 'openai/gpt-oss-120b',
        models: [
          { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', free: false },
          { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', free: false },
          { id: 'groq/compound-mini', name: 'Groq Compound Mini', free: false },
          { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', free: false }
        ]
      },
      tokenharbor: {
        id: 'tokenharbor',
        name: 'TokenHarbor',
        baseUrl: process.env.TOKENHARBOR_BASE_URL || 'https://tokenharbor.ai/v1',
        apiKey: process.env.TOKENHARBOR_API_KEY,
        defaultModel: 'deepseek-v4.1-flash:free',
        models: [
          { id: 'deepseek-v4.1-flash:free', name: 'DeepSeek V4.1 Flash (Free)', free: true },
          { id: 'mimo-v2.5:free', name: 'Mimo V2.5 (Free)', free: true },
          { id: 'qwen3.8-flash:free', name: 'Qwen 3.8 Flash (Free)', free: true },
          { id: 'deepseek-v4-flash:free', name: 'DeepSeek V4 Flash (Free)', free: true }
        ]
      },
      conduit: {
        id: 'conduit',
        name: 'Conduit (Ozdoev)',
        baseUrl: process.env.CONDUIT_BASE_URL || 'https://conduit.ozdoev.net/v1',
        apiKey: process.env.CONDUIT_API_KEY,
        defaultModel: 'deepseek-v4-flash',
        models: [
          { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', free: true },
          { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', free: false },
          { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', free: true }
        ]
      },
      nvidia: {
        id: 'nvidia',
        name: 'Nvidia NIM',
        baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        apiKey: process.env.NVIDIA_API_KEY,
        defaultModel: 'meta/llama-3.3-70b-instruct',
        models: [
          { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', free: false },
          { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', free: false }
        ]
      },
      bai: {
        id: 'bai',
        name: 'Bai Models Gateway',
        baseUrl: process.env.BAI_BASE_URL || 'https://api.b.ai/v1',
        apiKey: process.env.BAI_API_KEY || '',
        defaultModel: 'gpt-4o-mini',
        models: [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: true }
        ]
      },
      opencode: {
        id: 'opencode',
        name: 'OpenCode Models (Zen)',
        baseUrl: process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1',
        apiKey: process.env.OPENCODE_API_KEY || '',
        defaultModel: 'zen-coder-v1',
        models: [
          { id: 'zen-coder-v1', name: 'Zen Coder v1', free: true }
        ]
      },
      vercel_jev: {
        id: 'vercel_jev',
        name: 'Vercel AI Gateway (JEV System-One)',
        baseUrl: process.env.VERCEL_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1',
        apiKey: process.env.VERCEL_AI_KEY,
        defaultModel: 'typesafe-ai/jev',
        models: [
          { id: 'typesafe-ai/jev', name: 'JEV (TypeSafe System-One Decision Engine)', free: true }
        ]
      }
    };

    this.activeProviderId = process.env.DEFAULT_PROVIDER || 'openrouter';
    this.activeModelId = 'nvidia/nemotron-3.5-lightning:free';
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      lastLatencyMs: 0
    };
  }

  getProviders() {
    return Object.values(this.providers).map(p => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
      active: p.id === this.activeProviderId,
      hasKey: Boolean(p.apiKey && p.apiKey.length > 5),
      models: p.models
    }));
  }

  setActive(providerId, modelId) {
    if (this.providers[providerId]) {
      this.activeProviderId = providerId;
      if (modelId) {
        this.activeModelId = modelId;
      } else {
        this.activeModelId = this.providers[providerId].defaultModel;
      }
    }
  }

  /**
   * Unified chat completion endpoint with fast fallback.
   */
  async chat(messages, options = {}) {
    const providerId = options.provider || this.activeProviderId;
    const provider = this.providers[providerId] || this.providers.openrouter;
    const model = options.model || (providerId === this.activeProviderId ? this.activeModelId : provider.defaultModel);

    const startTime = Date.now();
    this.stats.totalRequests++;

    const payload = {
      model,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.2,
      max_tokens: options.max_tokens || 800
    };

    if (options.response_format) {
      payload.response_format = options.response_format;
    }

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aegisbot.local',
          'X-Title': 'AEGIS BOT'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs || 8000)
      });

      const latency = Date.now() - startTime;
      this.stats.lastLatencyMs = latency;

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[ModelRouter ${provider.id} status ${res.status}]: ${errText.slice(0, 100)}`);
        
        // Fast fallback to Groq or OpenRouter
        if (providerId !== 'groq' && this.providers.groq.apiKey) {
          console.log('[ModelRouter] Fast fallback to Groq LPU engine...');
          return this.chat(messages, { ...options, provider: 'groq', model: 'openai/gpt-oss-120b', timeoutMs: 5000 });
        }
        if (providerId !== 'openrouter') {
          console.log('[ModelRouter] Fallback to OpenRouter free engine...');
          return this.chat(messages, { ...options, provider: 'openrouter', model: 'nvidia/nemotron-3.5-lightning:free', timeoutMs: 5000 });
        }
        throw new Error(`Provider ${provider.id} error: ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (data.usage?.total_tokens) {
        this.stats.totalTokens += data.usage.total_tokens;
      }

      return {
        content,
        provider: provider.id,
        model,
        latency_ms: latency,
        usage: data.usage || {}
      };
    } catch (err) {
      console.warn(`[ModelRouter Exception for ${providerId}]:`, err.message);
      if (providerId !== 'groq' && this.providers.groq.apiKey) {
        console.log('[ModelRouter] Exception fallback to Groq...');
        return this.chat(messages, { ...options, provider: 'groq', model: 'openai/gpt-oss-120b', timeoutMs: 5000 });
      }
      throw err;
    }
  }
}

export const globalModelRouter = new ModelRouter();
