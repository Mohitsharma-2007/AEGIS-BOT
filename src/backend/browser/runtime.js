import fs from 'fs';
import path from 'path';

/**
 * Injects modern stealth evasion scripts to mask automation and bypass bot detection
 */
export async function applyStealthPatches(target) {
  const initScript = `
    // 1. Mask navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // 2. Emulate realistic plugins array
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ],
    });

    // 3. Emulate default modern languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // 4. Mock window.chrome object
    if (!window.chrome) {
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    }

    // 5. Emulate WebGL vendor & renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Intel Inc.';
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, [parameter]);
    };
  `;

  try {
    if (typeof target.addInitScript === 'function') {
      await target.addInitScript(initScript);
    }
  } catch (err) {
    console.warn('[Stealth] Could not inject init script:', err.message);
  }
}

/**
 * Recognizes bot challenges, CAPTCHAs, and unusual traffic block pages
 */
export async function detectBotWall(page) {
  try {
    const curUrl = page.url() || '';
    if (curUrl.includes('chrome-error') || curUrl.includes('chromewebdata')) {
      return { isBlocked: true, keyword: 'network_reset_or_datacenter_block', title: 'Network Blocked' };
    }

    return await page.evaluate(() => {
      const url = window.location.href || '';
      if (url.includes('chrome-error') || url.includes('chromewebdata')) {
        return { isBlocked: true, keyword: 'network_reset_or_datacenter_block', title: 'Network Blocked' };
      }

      // 1. Direct Cloudflare Turnstile / reCAPTCHA / hCaptcha iframe check
      const challengeIframe = document.querySelector(
        'iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="cf-turnstile"], iframe[title*="cloudflare"], iframe[title*="turnstile"], iframe[title*="widget containing a cloudflare security challenge"]'
      );
      if (challengeIframe) {
        return { isBlocked: true, keyword: 'cloudflare_turnstile_iframe', title: document.title };
      }

      // 2. Cloudflare Challenge Stages & Containers
      const challengeStage = document.querySelector(
        '#challenge-stage, #cf-stage, .cf-turnstile, #turnstile-wrapper, #challenge-running, #cf-challenge-running, #cf-wrapper, #challenge-form'
      );
      if (challengeStage) {
        const rect = challengeStage.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          return { isBlocked: true, keyword: 'cloudflare_turnstile_stage', title: document.title };
        }
      }

      // 3. Text and title analysis
      const text = (document.body ? document.body.innerText : '').toLowerCase();
      const title = (document.title || '').toLowerCase();
      
      const botKeywords = [
        'just a moment',
        'checking your browser',
        'verify you are human',
        'verifying you are human',
        'unusual traffic',
        'press & hold',
        'press and hold',
        'cloudflare turnstile',
        'attention required',
        'recaptcha',
        'robot or human',
        'security check to access',
        'why did this happen',
        'access denied',
        '403 forbidden',
        'enable javascript and cookies to continue'
      ];

      for (const kw of botKeywords) {
        if (text.includes(kw) || title.includes(kw)) {
          return { isBlocked: true, keyword: kw, title: document.title };
        }
      }

      // 4. Ray ID / Cloudflare signature check in footer
      if (text.includes('ray id') && (text.includes('cloudflare') || text.includes('performance & security by cloudflare'))) {
        return { isBlocked: true, keyword: 'cloudflare_ray_id', title: document.title };
      }

      return { isBlocked: false };
    });
  } catch {
    return { isBlocked: false };
  }
}

/**
 * Base Abstract Browser Runtime
 */
export class BrowserRuntime {
  constructor(name) {
    this.name = name;
  }

  async getLaunchOptions(baseArgs = []) {
    throw new Error('getLaunchOptions() must be implemented by subclass');
  }

  getRuntimeInfo() {
    return {
      type: this.name,
      platform: process.platform,
      arch: process.arch
    };
  }
}

/**
 * LocalChromeRuntime: Uses the installed Google Chrome executable on the host machine (e.g. Windows Chrome.exe)
 * This is the mandatory reference runtime for local development.
 */
export class LocalChromeRuntime extends BrowserRuntime {
  constructor(customPath) {
    super('local_chrome');
    this.customPath = customPath || process.env.CHROME_PATH;
  }

  detectLocalChrome() {
    if (this.customPath && fs.existsSync(this.customPath)) {
      return this.customPath;
    }

    // Standard platform paths
    const candidates = [];
    if (process.platform === 'win32') {
      candidates.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
      );
    } else if (process.platform === 'darwin') {
      candidates.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      );
    } else {
      candidates.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
      );
    }

    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    // Default fallback to standard Windows Chrome path
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  async getLaunchOptions(baseArgs = []) {
    const executablePath = this.detectLocalChrome();
    const headless = process.env.HEADLESS === 'false' ? false : true;

    return {
      executablePath,
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        ...baseArgs
      ]
    };
  }

  getRuntimeInfo() {
    return {
      ...super.getRuntimeInfo(),
      executablePath: this.detectLocalChrome(),
      mode: 'system'
    };
  }
}

/**
 * ManagedChromiumRuntime: Uses bundled/managed Chromium runtime for production / cloud deployment environments
 * Does NOT require or depend on a host Google Chrome installation.
 */
export class ManagedChromiumRuntime extends BrowserRuntime {
  constructor(customPath) {
    super('managed_chromium');
    this.customPath = customPath || process.env.MANAGED_CHROMIUM_PATH;
  }

  async getLaunchOptions(baseArgs = []) {
    const headless = process.env.HEADLESS === 'false' ? false : true;

    let executablePath = this.customPath;
    let extraArgs = [];

    // If running on Vercel / AWS Lambda / Linux cloud, dynamically resolve @sparticuz/chromium
    if (!executablePath && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.platform === 'linux')) {
      try {
        const chromiumModule = await import('@sparticuz/chromium');
        const sparticuz = chromiumModule.default || chromiumModule;
        executablePath = await sparticuz.executablePath();
        if (sparticuz.args && Array.isArray(sparticuz.args)) {
          extraArgs = sparticuz.args;
        }
      } catch (err) {
        console.warn('[ManagedChromium] Notice: @sparticuz/chromium auto-resolution deferred to Playwright:', err.message);
      }
    }

    const options = {
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--single-process',
        '--no-zygote',
        ...extraArgs,
        ...baseArgs
      ]
    };

    if (executablePath && fs.existsSync(executablePath)) {
      options.executablePath = executablePath;
    }

    return options;
  }

  getRuntimeInfo() {
    return {
      ...super.getRuntimeInfo(),
      executablePath: this.customPath || 'managed-playwright-chromium',
      mode: 'managed'
    };
  }
}

/**
 * Factory function: Resolves the appropriate BrowserRuntime based on BROWSER_RUNTIME env and environment inspection.
 */
export function getBrowserRuntime() {
  const runtimeType = (process.env.BROWSER_RUNTIME || '').toLowerCase().trim();

  // Explicit Managed Chromium selection (for production/cloud)
  if (runtimeType === 'managed' || runtimeType === 'chromium') {
    return new ManagedChromiumRuntime();
  }

  // Explicit System/Local selection (for local development)
  if (runtimeType === 'system' || runtimeType === 'local') {
    return new LocalChromeRuntime();
  }

  // Auto-detection: If local Chrome exists or we are on Windows dev machine, default to LocalChromeRuntime
  const defaultLocal = new LocalChromeRuntime();
  const localChromePath = defaultLocal.detectLocalChrome();
  if (fs.existsSync(localChromePath)) {
    return defaultLocal;
  }

  // If local Chrome is not found, fallback to ManagedChromiumRuntime
  return new ManagedChromiumRuntime();
}
