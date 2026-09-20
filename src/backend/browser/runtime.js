import fs from 'fs';
import path from 'path';

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

    // If an explicit managed binary is provided (e.g. Lambda/Serverless Chromium layer)
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
        ...baseArgs
      ]
    };

    if (this.customPath && fs.existsSync(this.customPath)) {
      options.executablePath = this.customPath;
    }
    // Note: When executablePath is omitted, Playwright automatically uses its managed Chromium binary

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
