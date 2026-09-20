import { getBrowserRuntime } from '../src/backend/browser/runtime.js';
import { chromium } from 'playwright-core';

export default async function handler(req, res) {
  const url = req.query.url || req.body?.url || 'https://www.google.com';

  try {
    const runtime = getBrowserRuntime();
    const launchOptions = await runtime.getLaunchOptions();
    const runtimeInfo = runtime.getRuntimeInfo();

    console.log(`[Vercel Serverless Browser] Launching Chromium runtime (${runtimeInfo.type})...`);

    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    const finalUrl = page.url();

    await browser.close();

    return res.status(200).json({
      success: true,
      runtime: runtimeInfo,
      url: finalUrl,
      title,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Vercel Serverless Browser Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
