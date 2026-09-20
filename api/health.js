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

    const aegisTools = [
      { name: 'browser.navigate', description: 'Navigates active browser tab to target URL with anti-bot routing.', category: 'Browser & Tabs' },
      { name: 'browser.click', description: 'Simulates human click on DOM element target.', category: 'Browser & Tabs' },
      { name: 'browser.type', description: 'Types text into editable inputs with human keystroke timing.', category: 'Browser & Tabs' },
      { name: 'browser.press', description: 'Dispatches keyboard key events (Enter, Tab, Escape).', category: 'Browser & Tabs' },
      { name: 'browser.scroll', description: 'Scrolls viewport with smooth natural acceleration.', category: 'Browser & Tabs' },
      { name: 'browser.screenshot', description: 'Captures high-resolution canvas frame for visual inspection.', category: 'Browser & Tabs' },
      { name: 'browser.dom_extract', description: 'Extracts normalized interactive elements with bounding boxes.', category: 'Browser & Tabs' },
      { name: 'browser.get_content', description: 'Extracts full readable textual and structural content from active tab.', category: 'Research & Extraction' },
      { name: 'browser.stealth_evade', description: 'Applies stealth patches, WebGL masking and evasive countermeasures.', category: 'Stealth & Anti-Bot Defense' },
      { name: 'browser.detect_wall', description: 'Scans DOM and frame for CAPTCHAs, bot walls, or security challenges.', category: 'Stealth & Anti-Bot Defense' },
      { name: 'vision.inspect_canvas', description: 'Uses side-by-side Vision LLM (Llama 3.2 Vision / Qwen 2 VL) to verify page layout & detect blockers.', category: 'Computer Vision & Grounding' },
      { name: 'data.compare_products', description: 'Extracts product cards (title, price, ratings, links) from Amazon or e-commerce catalog.', category: 'Commerce & Data Extraction' },
      { name: 'data.filter_budget', description: 'Filters extracted products by maximum price threshold.', category: 'Commerce & Data Extraction' },
      { name: 'browser.get_github_repos', description: 'Extracts and ranks repository cards from GitHub search.', category: 'Research & Extraction' },
      { name: 'agent.create_note', description: 'Compiles and persists Markdown research note with direct hyperlinks.', category: 'Research & Knowledge Notes' },
      { name: 'agent.adapt_plan', description: 'Dynamically adapts and updates plan checklist upon unexpected deviation.', category: 'Adaptive Planning & Control' },
      { name: 'agent.decompose_intent', description: 'Decomposes raw prompts into clean search query, target domain & workflow.', category: 'Adaptive Planning & Control' }
    ];

    return res.status(200).json({
      status: 'online',
      service: 'AEGIS BOT Cloud Serverless Runtime',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      runtime: runtimeInfo,
      providers_configured: envStatus,
      default_model: process.env.DEFAULT_MODEL || 'qwen/qwen3.8-27b:free',
      default_provider: process.env.DEFAULT_PROVIDER || 'openrouter',
      tools: aegisTools
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}
