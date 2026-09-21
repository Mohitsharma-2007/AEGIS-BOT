import { chromium } from 'playwright';
import { globalEventBus } from '../events/event-bus.js';
import { extractInteractiveDom, highlightElement, clearHighlight } from './dom-extractor.js';
import { extractAccessibilityTree } from './a11y-extractor.js';
import { getBrowserRuntime, applyStealthPatches, detectBotWall } from './runtime.js';
import { humanMoveMouse, humanClick } from './human-cursor.js';

export class BrowserSessionManager {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `aegis-session-001`;
    this.browser = null;
    this.context = null;
    this.tabs = new Map(); // tabId -> { id, page, cdp, url, title, active }
    this.activeTabId = null;
    this.tabCounter = 1;
    this.mouse = { x: 400, y: 300 };
    this.isStreaming = false;
    this.screencastFps = 15;
    this.turboMode = true; // Turbo Accelerator: Blocks heavy assets for 5x faster loads
    this.runtime = options.runtime || getBrowserRuntime();
    this.viewport = {
      width: parseInt(process.env.VIEWPORT_WIDTH, 10) || 1280,
      height: parseInt(process.env.VIEWPORT_HEIGHT, 10) || 800
    };
  }

  async initialize() {
    if (this.browser) return;

    const runtimeInfo = this.runtime.getRuntimeInfo();
    console.log(`[AEGIS Browser] Initializing with runtime: ${runtimeInfo.type} (mode: ${runtimeInfo.mode})`);

    globalEventBus.emitEvent('session.init_started', {
      session_id: this.sessionId,
      viewport: this.viewport,
      runtime: runtimeInfo
    });

    try {
      const launchOptions = await this.runtime.getLaunchOptions();
      this.browser = await chromium.launch(launchOptions);

      this.context = await this.browser.newContext({
        viewport: this.viewport,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 AegisBot/1.0',
        locale: 'en-US',
        timezoneId: 'Asia/Kolkata',
        deviceScaleFactor: 1
      });

      // Inject modern anti-bot stealth scripts
      await applyStealthPatches(this.context);

      // Create initial tab (DuckDuckGo avoids datacenter bot blocks)
      await this.createTab('https://html.duckduckgo.com');

      globalEventBus.emitEvent('session.ready', {
        session_id: this.sessionId,
        active_tab: this.activeTabId,
        browser_id: 'chromium-001'
      });

      console.log(`[AEGIS Browser] Session initialized: ${this.sessionId}`);
    } catch (err) {
      console.error('[AEGIS Browser Init Error]:', err);
      globalEventBus.emitEvent('error.browser_init', { error: err.message });
      throw err;
    }
  }

  async createTab(url = 'https://html.duckduckgo.com') {
    const tabId = `tab-${String(this.tabCounter++).padStart(3, '0')}`;
    const page = await this.context.newPage();

    // Create CDP session for screencasting and low-level control
    let cdp = null;
    try {
      cdp = await page.context().newCDPSession(page);
    } catch (e) {
      console.warn('[CDP Warning] Could not attach CDP session:', e.message);
    }

    const tabInfo = {
      id: tabId,
      page,
      cdp,
      url,
      title: 'New Tab',
      loading: true,
      active: true
    };

    // Deactivate existing active tab
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId).active = false;
    }

    this.tabs.set(tabId, tabInfo);
    this.activeTabId = tabId;

    // Turbo Mode Route Interceptor (Blocks heavy images/fonts/trackers for 5x faster loads)
    if (this.turboMode) {
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        const url = route.request().url().toLowerCase();
        if (this.turboMode && (type === 'image' || type === 'media' || type === 'font' || url.includes('analytics') || url.includes('doubleclick') || url.includes('telemetry'))) {
          return route.abort();
        }
        return route.continue();
      }).catch(() => {});
    }

    // Attach page event listeners
    this.attachPageListeners(page, tabId);

    // Start screencasting on this tab
    await this.setupScreencast(tabInfo);

    // Initial navigation
    if (url) {
      this.navigateTab(tabId, url).catch(() => {});
    }

    globalEventBus.emitEvent('browser.tab_created', {
      tab_id: tabId,
      url,
      active: true
    });

    return tabInfo;
  }

  attachPageListeners(page, tabId) {
    page.on('load', async () => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.loading = false;
      tab.title = await page.title().catch(() => 'Untitled');
      tab.url = page.url();

      globalEventBus.emitEvent('browser.page_loaded', {
        tab_id: tabId,
        url: tab.url,
        title: tab.title
      });
    });

    page.on('domcontentloaded', () => {
      globalEventBus.emitEvent('dom.content_loaded', { tab_id: tabId });
    });

    page.on('console', msg => {
      globalEventBus.emitEvent('browser.console', {
        tab_id: tabId,
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('dialog', async dialog => {
      globalEventBus.emitEvent('browser.dialog', {
        tab_id: tabId,
        message: dialog.message(),
        type: dialog.type()
      });
      await dialog.dismiss().catch(() => {});
    });
  }

  async setupScreencast(tabInfo) {
    const { cdp, page, id: tabId } = tabInfo;
    if (!cdp) {
      // Fallback periodic screenshot loop
      this.startScreenshotLoop(tabInfo);
      return;
    }

    try {
      await cdp.send('Page.enable');
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 75,
        maxWidth: this.viewport.width,
        maxHeight: this.viewport.height,
        everyNthFrame: 1
      });

      cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
        try {
          await cdp.send('Page.screencastFrameAck', { sessionId });
        } catch {}

        if (this.activeTabId === tabId) {
          globalEventBus.emit('screencast.frame', {
            tab_id: tabId,
            frame: `data:image/jpeg;base64,${data}`,
            timestamp: Date.now()
          });
        }
      });
    } catch (err) {
      console.warn('[Screencast Error, using fallback loop]:', err.message);
      this.startScreenshotLoop(tabInfo);
    }
  }

  startScreenshotLoop(tabInfo) {
    const loop = async () => {
      if (!this.browser || !this.tabs.has(tabInfo.id)) return;
      if (this.activeTabId === tabInfo.id) {
        try {
          const buffer = await tabInfo.page.screenshot({ type: 'jpeg', quality: 65 });
          globalEventBus.emit('screencast.frame', {
            tab_id: tabInfo.id,
            frame: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            timestamp: Date.now()
          });
        } catch {}
      }
      setTimeout(loop, 120);
    };
    setTimeout(loop, 100);
  }

  getActiveTab() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
      return this.tabs.values().next().value || null;
    }
    return this.tabs.get(this.activeTabId);
  }

  getActivePage() {
    const tab = this.getActiveTab();
    return tab ? tab.page : null;
  }

  async switchTab(tabId) {
    if (!this.tabs.has(tabId)) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId).active = false;
    }

    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    tab.active = true;
    if (tab.page && typeof tab.page.isClosed === 'function' && !tab.page.isClosed()) {
      await tab.page.bringToFront().catch(() => {});
    }

    globalEventBus.emitEvent('browser.tab_switched', {
      tab_id: tabId,
      url: tab.url,
      title: tab.title
    });

    return tab;
  }

  async closeTab(tabId) {
    if (!this.tabs.has(tabId)) return false;

    const tab = this.tabs.get(tabId);
    await tab.page.close().catch(() => {});
    this.tabs.delete(tabId);

    globalEventBus.emitEvent('browser.tab_closed', { tab_id: tabId });

    if (this.activeTabId === tabId) {
      const remaining = Array.from(this.tabs.keys());
      if (remaining.length > 0) {
        await this.switchTab(remaining[0]);
      } else {
        await this.createTab('https://html.duckduckgo.com');
      }
    }

    return true;
  }

  listTabs() {
    return Array.from(this.tabs.values()).map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      loading: t.loading,
      active: t.id === this.activeTabId
    }));
  }

  async navigateTab(tabId, rawUrl) {
    const tab = this.tabs.get(tabId) || this.getActiveTab();
    if (!tab) throw new Error('No active browser tab');

    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = `https://${url}`;
      } else {
        url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(url)}`;
      }
    }

    tab.loading = true;
    tab.url = url;

    globalEventBus.emitEvent('browser.navigate_started', {
      tab_id: tab.id,
      url
    });

    try {
      await tab.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      tab.title = await tab.page.title();
      tab.url = tab.page.url();
      tab.loading = false;

      globalEventBus.emitEvent('browser.navigate_success', {
        tab_id: tab.id,
        url: tab.url,
        title: tab.title
      });

      return { success: true, url: tab.url, title: tab.title };
    } catch (err) {
      tab.loading = false;
      globalEventBus.emitEvent('browser.navigate_error', {
        tab_id: tab.id,
        url,
        error: err.message
      });
      return { success: false, url, error: err.message };
    }
  }

  /**
   * Smoothly moves the AEGIS cursor to target coordinates, broadcasting mouse positions in real time.
   */
  async moveMouse(targetX, targetY, options = {}) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    const startX = this.mouse.x;
    const startY = this.mouse.y;

    globalEventBus.emitEvent('mouse.move_started', {
      from: { x: startX, y: startY },
      to: { x: targetX, y: targetY }
    });

    // Humanized Bezier curved movement with randomized velocity & micro-tremor
    await humanMoveMouse(page, startX, startY, targetX, targetY, (curX, curY) => {
      this.mouse = { x: curX, y: curY };
      globalEventBus.emit('mouse.position', { x: curX, y: curY, state: 'moving' });
    });

    this.mouse = { x: targetX, y: targetY };
    globalEventBus.emitEvent('mouse.move_completed', { x: targetX, y: targetY });
    return this.mouse;
  }

  async click(x, y, options = {}) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    const clickX = x !== undefined ? x : this.mouse.x;
    const clickY = y !== undefined ? y : this.mouse.y;

    // Human-like click with Bezier curve approach, pre-click dwell, and realistic hold
    await humanClick(page, this.mouse, clickX, clickY, options, (curX, curY) => {
      this.mouse = { x: curX, y: curY };
      globalEventBus.emit('mouse.position', { x: curX, y: curY, state: 'moving' });
    });

    this.mouse = { x: clickX, y: clickY };

    globalEventBus.emit('mouse.click_indicator', {
      x: clickX,
      y: clickY,
      button: options.button || 'left'
    });

    globalEventBus.emitEvent('mouse.click', {
      x: clickX,
      y: clickY,
      button: options.button || 'left'
    });

    return { success: true, x: clickX, y: clickY };
  }

  async clickElement(elementId) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    // Highlight element
    await highlightElement(page, elementId, 'about_to_click');

    // Query element bounds
    const info = await page.evaluate((id) => {
      const el = document.querySelector(`[data-aegis-id="${id}"]`);
      if (!el) return null;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        tag: el.tagName.toLowerCase()
      };
    }, elementId);

    if (!info) {
      throw new Error(`Element ${elementId} not found in DOM`);
    }

    // Small delay for scroll to settle
    await new Promise(r => setTimeout(r, 200));

    // Re-verify center after scroll
    const updated = await page.evaluate((id) => {
      const el = document.querySelector(`[data-aegis-id="${id}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    }, elementId);

    const target = updated || info;

    // Move cursor smoothly
    await this.moveMouse(target.x, target.y);

    // Highlight as clicking
    await highlightElement(page, elementId, 'clicking');

    // Click
    await this.click(target.x, target.y);

    // Small pause then clear highlight
    setTimeout(() => clearHighlight(page), 800);

    return { success: true, element_id: elementId, coords: target };
  }

  async typeText(text, options = {}) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    const elementId = options.element_id;
    if (elementId) {
      await this.clickElement(elementId);
    }

    globalEventBus.emitEvent('keyboard.type_started', {
      length: text.length,
      element_id: elementId
    });

    await page.keyboard.type(text, { delay: options.delay || 45 });

    globalEventBus.emitEvent('keyboard.type_completed', {
      text: text.slice(0, 30),
      element_id: elementId
    });

    return { success: true, typed: text };
  }

  async pressKey(key) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    globalEventBus.emitEvent('keyboard.press', { key });
    await page.keyboard.press(key);
    return { success: true, key };
  }

  async scroll(direction = 'down', amount = 500) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    const deltaY = direction === 'down' ? amount : -amount;
    globalEventBus.emitEvent('browser.scroll', { direction, amount });
    await page.mouse.wheel(0, deltaY);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, direction, amount };
  }

  async getScreenshot(fullPage = false) {
    const page = this.getActivePage();
    if (!page) throw new Error('No active page');

    const buffer = await page.screenshot({ fullPage, type: 'jpeg', quality: 75 });
    return buffer.toString('base64');
  }

  async getDomExtract(options = {}) {
    const page = this.getActivePage();
    if (!page) return [];
    return await extractInteractiveDom(page, options);
  }

  async setTurboMode(enabled) {
    this.turboMode = Boolean(enabled);
    globalEventBus.emitEvent('browser.turbo_changed', { turboMode: this.turboMode });
    console.log(`[AEGIS Browser] Turbo Accelerator Mode: ${this.turboMode ? 'ENABLED (5x Speed)' : 'DISABLED (Full Fidelity)'}`);
    return { turboMode: this.turboMode };
  }

  async getPageContent() {
    const page = this.getActivePage();
    if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
      return { title: '', text: '', links: [] };
    }

    try {
      return await page.evaluate(() => {
        const title = document.title;
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
          .map(h => h.innerText.trim())
          .filter(Boolean)
          .slice(0, 20);

        const text = (document.body.innerText || '').slice(0, 3500);

        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim(), href: a.href }))
          .filter(l => l.text.length > 2 && l.text.length < 80 && !l.href.includes('#'))
          .slice(0, 30);

        return { title, headings, text, links };
      });
    } catch (e) {
      return { title: '', text: '', links: [] };
    }
  }

  async getGithubRepoCards() {
    const page = this.getActivePage();
    if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
      return [];
    }

    try {
      return await page.evaluate(() => {
        // Find repository cards in GitHub Search or Trending
        const repoElements = Array.from(document.querySelectorAll('[data-testid="results-list"] > div, .repo-list-item, div.Box-row, article.border-bottom'));
        const repos = [];

        for (const el of repoElements) {
          const titleLink = el.querySelector('a[href*="/"][data-testid="link"], a.v-align-middle, h3 a, a.text-bold');
          if (!titleLink) continue;

          const repoPath = (titleLink.getAttribute('href') || '').replace(/^\//, '').split('?')[0];
          if (!repoPath || !repoPath.includes('/') || repoPath.split('/').length !== 2) continue;

          const descEl = el.querySelector('p, .color-fg-muted, .mb-1');
          const description = descEl ? descEl.innerText.trim() : '';

          // Stars count
          const starLink = el.querySelector('a[href*="/stargazers"], [aria-label*="star"], span[id*="star"]');
          let stars = starLink ? starLink.innerText.trim() : '';
          if (!stars) {
            const allText = el.innerText;
            const starMatch = allText.match(/([\d\.,]+[kKmM]?)\s*stars?/i);
            if (starMatch) stars = starMatch[1];
          }

          repos.push({
            name: repoPath,
            url: `https://github.com/${repoPath}`,
            description,
            stars: stars || 'Active'
          });

          if (repos.length >= 8) break;
        }

        return repos;
      });
    } catch (e) {
      return [];
    }
  }

  async close() {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      this.browser = null;
      this.context = null;
      this.tabs.clear();
      console.log('[AEGIS Browser] Browser session closed');
    } catch (e) {
      console.error('[AEGIS Browser Close Error]:', e.message);
    }
  }
}
