import { getBrowserRuntime } from '../src/backend/browser/runtime.js';
import { chromium } from 'playwright-core';

export default async function handler(req, res) {
  // Support both GET and POST
  const url = req.query.url || req.body?.url || 'https://www.google.com';
  const action = req.body?.action || req.query.action || 'navigate';
  const rawQuery = req.body?.query || req.query.query;

  try {
    const runtime = getBrowserRuntime();
    const launchOptions = await runtime.getLaunchOptions();
    const runtimeInfo = runtime.getRuntimeInfo();

    console.log(`[Vercel Serverless Browser] Launching Chromium (${runtimeInfo.type})...`);

    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 AegisBot/1.0'
    });

    const page = await context.newPage();

    let targetUrl = url;
    if (rawQuery && !rawQuery.startsWith('http')) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(rawQuery)}`;
    }

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // If an action was requested (e.g. click, scroll)
    if (action === 'scroll') {
      await page.mouse.wheel(0, 400);
      await new Promise(r => setTimeout(r, 200));
    }

    const title = await page.title();
    const finalUrl = page.url();

    // Extract quick DOM elements for developer drawer
    const domElements = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button, input, textarea, [role="button"]')).slice(0, 30);
      return els.map((el, i) => {
        const rect = el.getBoundingClientRect();
        return {
          element_id: `el-${String(i + 1).padStart(3, '0')}`,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 50).trim(),
          bbox: {
            viewport_x: Math.round(rect.left),
            viewport_y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      });
    }).catch(() => []);

    // Capture real page screenshot
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 75 });
    await browser.close();

    // Return image directly if requested via img tag
    if (req.query.format === 'image') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.send(screenshotBuffer);
    }

    return res.status(200).json({
      success: true,
      runtime: runtimeInfo,
      url: finalUrl,
      title: title || 'AEGIS Browser',
      frame: `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`,
      tabs: [
        { id: 'tab-001', url: finalUrl, title: title || 'Google', active: true, loading: false }
      ],
      domElements,
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
