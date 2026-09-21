/**
 * AEGIS Deep Stealth Evasion Engine
 * 
 * Comprehensive browser fingerprint evasion covering 30+ detection vectors
 * used by Cloudflare Turnstile v2, reCAPTCHA, hCaptcha, and modern bot walls.
 */

/**
 * Returns a randomized but session-consistent canvas noise seed
 */
function generateCanvasNoiseSeed() {
  return Math.random() * 0.02 - 0.01;
}

/**
 * Builds the comprehensive stealth init script string.
 */
export function buildStealthScript(options = {}) {
  const canvasNoise = options.canvasNoise ?? generateCanvasNoiseSeed();
  const audioNoise = options.audioNoise ?? (Math.random() * 0.0001);
  const deviceMemory = options.deviceMemory ?? 8;
  const hardwareConcurrency = options.hardwareConcurrency ?? 8;
  const screenWidth = options.screenWidth ?? 1920;
  const screenHeight = options.screenHeight ?? 1080;
  const platform = options.platform ?? 'Win32';

  return `
    // ============================================================
    // AEGIS DEEP STEALTH EVASION ENGINE v2.0
    // 30+ Detection Vector Patches
    // ============================================================

    // 1. navigator.webdriver — Core automation flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });

    // 2. Remove webdriver from navigator prototype
    delete Navigator.prototype.webdriver;

    // 3. navigator.plugins — Realistic Chrome plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 1 }
        ];
        plugins.refresh = () => {};
        Object.setPrototypeOf(plugins, PluginArray.prototype);
        return plugins;
      },
      configurable: true
    });

    // 4. navigator.mimeTypes — Match plugin expectations
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mimes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ];
        Object.setPrototypeOf(mimes, MimeTypeArray.prototype);
        return mimes;
      },
      configurable: true
    });

    // 5. navigator.languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true
    });

    // 6. navigator.platform
    Object.defineProperty(navigator, 'platform', {
      get: () => '${platform}',
      configurable: true
    });

    // 7. navigator.deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => ${deviceMemory},
      configurable: true
    });

    // 8. navigator.hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => ${hardwareConcurrency},
      configurable: true
    });

    // 9. navigator.maxTouchPoints — Desktop = 0
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });

    // 10. navigator.connection — Network Information API mock
    if (!navigator.connection) {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false,
          type: 'wifi',
          onchange: null,
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; }
        }),
        configurable: true
      });
    }

    // 11. navigator.permissions — Override query()
    const origPermQuery = navigator.permissions && navigator.permissions.query ? navigator.permissions.query.bind(navigator.permissions) : null;
    if (navigator.permissions) {
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission || 'default', onchange: null });
        }
        if (origPermQuery) return origPermQuery(parameters);
        return Promise.resolve({ state: 'prompt', onchange: null });
      };
    }

    // 12. Notification.permission
    if (typeof Notification !== 'undefined') {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default',
        configurable: true
      });
    }

    // 13. window.chrome — Deep mock
    if (!window.chrome) window.chrome = {};
    window.chrome.runtime = {
      connect: function() { return { onMessage: { addListener: function() {} }, postMessage: function() {} }; },
      sendMessage: function() {},
      onConnect: { addListener: function() {} },
      onMessage: { addListener: function() {} },
      id: undefined,
      getManifest: function() { return {}; },
      getURL: function(path) { return ''; }
    };
    window.chrome.loadTimes = function() {
      return {
        commitLoadTime: Date.now() / 1000 - 2.5,
        connectionInfo: 'h2',
        finishDocumentLoadTime: Date.now() / 1000 - 0.8,
        finishLoadTime: Date.now() / 1000 - 0.3,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: Date.now() / 1000 - 1.8,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: Date.now() / 1000 - 3.0,
        startLoadTime: Date.now() / 1000 - 2.8,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true
      };
    };
    window.chrome.csi = function() {
      return { onloadT: Date.now(), pageT: 3947.235, startE: Date.now() - 3000, tran: 15 };
    };
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; }
    };

    // 14. WebGL — Realistic vendor/renderer
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return origGetParameter.apply(this, arguments);
    };
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return 'Intel Inc.';
        if (param === 37446) return 'Intel Iris OpenGL Engine';
        return origGetParam2.apply(this, arguments);
      };
    }

    // 15. Canvas fingerprint noise injection
    const CANVAS_NOISE = ${canvasNoise};
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      if (this.width > 16 && this.height > 16) {
        try {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, Math.min(this.width, 4), Math.min(this.height, 4));
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + Math.floor(CANVAS_NOISE * 255)));
            }
            ctx.putImageData(imageData, 0, 0);
          }
        } catch(e) {}
      }
      return origToDataURL.apply(this, arguments);
    };
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    if (origToBlob) {
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        if (this.width > 16 && this.height > 16) {
          try {
            const ctx = this.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, Math.min(this.width, 4), Math.min(this.height, 4));
              for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + Math.floor(CANVAS_NOISE * 255)));
              }
              ctx.putImageData(imageData, 0, 0);
            }
          } catch(e) {}
        }
        return origToBlob.apply(this, arguments);
      };
    }

    // 16. AudioContext fingerprint noise
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
      const AC = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
      const origCreateOscillator = AC.prototype.createOscillator;
      AC.prototype.createOscillator = function() {
        const osc = origCreateOscillator.apply(this, arguments);
        const origConnect = osc.connect.bind(osc);
        osc.connect = function(dest) {
          try {
            const gainNode = osc.context.createGain();
            gainNode.gain.value = 1.0 + ${audioNoise};
            origConnect(gainNode);
            gainNode.connect(dest);
            return dest;
          } catch(e) { return origConnect(dest); }
        };
        return osc;
      };
    }

    // 17. WebRTC leak prevention
    if (typeof RTCPeerConnection !== 'undefined') {
      const origRTC = RTCPeerConnection;
      window.RTCPeerConnection = function(config, constraints) {
        if (config && config.iceServers) config.iceServers = [];
        return new origRTC(config, constraints);
      };
      window.RTCPeerConnection.prototype = origRTC.prototype;
    }

    // 18. Screen properties
    Object.defineProperty(screen, 'width', { get: () => ${screenWidth}, configurable: true });
    Object.defineProperty(screen, 'height', { get: () => ${screenHeight}, configurable: true });
    Object.defineProperty(screen, 'availWidth', { get: () => ${screenWidth}, configurable: true });
    Object.defineProperty(screen, 'availHeight', { get: () => ${screenHeight - 40}, configurable: true });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });

    // 19. window.outerWidth / outerHeight
    Object.defineProperty(window, 'outerWidth', { get: () => ${screenWidth}, configurable: true });
    Object.defineProperty(window, 'outerHeight', { get: () => ${screenHeight}, configurable: true });

    // 20. document.hasFocus()
    Document.prototype.hasFocus = function() { return true; };

    // 21. Iframe contentWindow detection bypass
    try {
      const origContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (origContentWindow && origContentWindow.get) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            const win = origContentWindow.get.call(this);
            if (win) {
              try { Object.defineProperty(win, 'chrome', { get: () => window.chrome, configurable: true }); } catch(e) {}
            }
            return win;
          }
        });
      }
    } catch(e) {}

    // 22. CDP artifact scrubbing
    (function removeCDCArtifacts() {
      try {
        const props = Object.getOwnPropertyNames(document);
        for (const prop of props) {
          if (prop.startsWith('cdc_') || prop.startsWith('$cdc_') || prop.startsWith('__webdriver')) {
            delete document[prop];
          }
        }
        const htmlEl = document.documentElement;
        if (htmlEl) {
          const elProps = Object.getOwnPropertyNames(htmlEl);
          for (const prop of elProps) {
            if (prop.startsWith('cdc_') || prop.startsWith('$cdc_') || prop.startsWith('__webdriver') || prop.startsWith('__selenium') || prop.startsWith('__fxdriver')) {
              delete htmlEl[prop];
            }
          }
        }
      } catch(e) {}
    })();

    // 23. window.Notification fallback
    if (typeof window.Notification === 'undefined') {
      window.Notification = { permission: 'default', requestPermission: () => Promise.resolve('default') };
    }

    // 24. navigator.getBattery
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true, chargingTime: 0, dischargingTime: Infinity, level: 0.95,
        onchargingchange: null, onchargingtimechange: null, ondischargingtimechange: null, onlevelchange: null,
        addEventListener: function() {}, removeEventListener: function() {}
      });
    }

    // 25. Performance.now() micro-jitter
    const origPerfNow = Performance.prototype.now;
    Performance.prototype.now = function() {
      return origPerfNow.call(this) + (Math.random() * 0.001);
    };

    // 26. Filter automation console.debug messages
    const origConsoleDebug = console.debug;
    console.debug = function() {
      const args = Array.from(arguments).map(a => typeof a === 'string' ? a : '');
      if (args.some(a => /cdc_|webdriver|selenium|puppeteer|playwright/i.test(a))) return;
      return origConsoleDebug.apply(console, arguments);
    };

    // 27. navigator.vendor
    Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.', configurable: true });

    // 28. navigator.appVersion
    Object.defineProperty(navigator, 'appVersion', {
      get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      configurable: true
    });

    // 29. navigator.userAgentData — Client Hints API mock
    if (!navigator.userAgentData) {
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Chromium', version: '133' },
            { brand: 'Not(A:Brand', version: '24' },
            { brand: 'Google Chrome', version: '133' }
          ],
          mobile: false,
          platform: 'Windows',
          getHighEntropyValues: (hints) => Promise.resolve({
            architecture: 'x86', bitness: '64',
            brands: [
              { brand: 'Chromium', version: '133' },
              { brand: 'Not(A:Brand', version: '24' },
              { brand: 'Google Chrome', version: '133' }
            ],
            fullVersionList: [
              { brand: 'Chromium', version: '133.0.6917.1' },
              { brand: 'Not(A:Brand', version: '24.0.0.0' },
              { brand: 'Google Chrome', version: '133.0.6917.1' }
            ],
            mobile: false, model: '', platform: 'Windows', platformVersion: '15.0.0', uaFullVersion: '133.0.6917.1'
          }),
          toJSON: function() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; }
        }),
        configurable: true
      });
    }

    // 30. Mask Playwright sourceURL in stack traces
    const origPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = function(error, structuredStackTrace) {
      const filtered = structuredStackTrace.filter(frame => {
        const fileName = frame.getFileName() || '';
        return !fileName.includes('__playwright') && !fileName.includes('__puppeteer') && !fileName.includes('pptr:');
      });
      if (origPrepareStackTrace) return origPrepareStackTrace(error, filtered);
      return error.toString() + '\\n' + filtered.map(f => '    at ' + f.toString()).join('\\n');
    };
  `;
}

/**
 * Applies the deep stealth script on a Playwright BrowserContext or Page.
 */
export async function applyDeepStealth(target, options = {}) {
  const script = buildStealthScript(options);
  try {
    if (typeof target.addInitScript === 'function') {
      await target.addInitScript(script);
      console.log('[AEGIS Stealth] Deep stealth engine (30+ patches) loaded successfully.');
    }
  } catch (err) {
    console.warn('[AEGIS Stealth] Could not inject deep stealth script:', err.message);
  }
}

/**
 * Returns additional Chrome launch arguments for stealth evasion.
 */
export function getStealthLaunchArgs() {
  return [
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--password-store=basic',
    '--use-mock-keychain',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ];
}
