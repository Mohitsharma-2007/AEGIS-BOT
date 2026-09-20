import { getBrowserRuntime } from '../src/backend/browser/runtime.js';

export default async function handler(req, res) {
  try {
    const runtime = getBrowserRuntime();
    const runtimeInfo = runtime.getRuntimeInfo();

    const envStatus = {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      nvidia: Boolean(process.env.NVIDIA_API_KEY),
      conduit: Boolean(process.env.CONDUIT_API_KEY),
      tokenharbor: Boolean(process.env.TOKENHARBOR_API_KEY),
      vercel_ai: Boolean(process.env.VERCEL_AI_KEY)
    };

    return res.status(200).json({
      status: 'online',
      service: 'AEGIS BOT Cloud Serverless Runtime',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      runtime: runtimeInfo,
      providers_configured: envStatus,
      default_model: process.env.DEFAULT_MODEL || 'qwen/qwen3.8-27b:free',
      default_provider: process.env.DEFAULT_PROVIDER || 'openrouter'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}
