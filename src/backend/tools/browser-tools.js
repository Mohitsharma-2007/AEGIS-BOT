import { globalToolRegistry } from './registry.js';
import { globalJevEngine } from './jev-tools.js';

export function registerBrowserTools(sessionManager) {
  // 1. browser.navigate
  globalToolRegistry.register({
    name: 'browser.navigate',
    description: 'Navigates the active browser tab to a specified URL or search query.',
    inputSchema: { url: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = sessionManager.getActiveTab();
      return await sessionManager.navigateTab(tab?.id, input.url);
    }
  });

  // 2. browser.back
  globalToolRegistry.register({
    name: 'browser.back',
    description: 'Navigates back in browser history.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.goBack();
      return { success: true, url: page.url() };
    }
  });

  // 3. browser.forward
  globalToolRegistry.register({
    name: 'browser.forward',
    description: 'Navigates forward in browser history.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.goForward();
      return { success: true, url: page.url() };
    }
  });

  // 4. browser.reload
  globalToolRegistry.register({
    name: 'browser.reload',
    description: 'Reloads the current page.',
    inputSchema: {},
    permissions: ['navigate'],
    async execute() {
      const page = sessionManager.getActivePage();
      if (!page) throw new Error('No active page');
      await page.reload();
      return { success: true, url: page.url() };
    }
  });

  // 5. browser.get_url
  globalToolRegistry.register({
    name: 'browser.get_url',
    description: 'Returns the current page URL.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      const page = sessionManager.getActivePage();
      return { url: page ? page.url() : '' };
    }
  });

  // 6. browser.get_title
  globalToolRegistry.register({
    name: 'browser.get_title',
    description: 'Returns the current page title.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      const page = sessionManager.getActivePage();
      return { title: page ? await page.title() : '' };
    }
  });

  // 7. browser.screenshot
  globalToolRegistry.register({
    name: 'browser.screenshot',
    description: 'Captures the current viewport screenshot as base64 JPEG.',
    inputSchema: { full_page: 'boolean' },
    permissions: ['read'],
    async execute(input) {
      const base64 = await sessionManager.getScreenshot(input.full_page);
      return { success: true, screenshot_length: base64.length, data: base64 };
    }
  });

  // 8. browser.dom_extract
  globalToolRegistry.register({
    name: 'browser.dom_extract',
    description: 'Extracts normalized interactive DOM elements with element_id, role, text, bbox.',
    inputSchema: { scope: 'string' },
    permissions: ['read_dom'],
    async execute(input) {
      const elements = await sessionManager.getDomExtract({ maxElements: 120 });
      return { success: true, count: elements.length, elements };
    }
  });

  // 9. browser.accessibility_extract
  globalToolRegistry.register({
    name: 'browser.accessibility_extract',
    description: 'Extracts the page accessibility tree hierarchy.',
    inputSchema: { maxNodes: 'number' },
    permissions: ['read_dom'],
    async execute(input) {
      const nodes = await sessionManager.getA11yExtract(input);
      return { success: true, count: nodes.length, nodes };
    }
  });

  // 10. browser.find_element (Semantic locator powered by JEV System-One)
  globalToolRegistry.register({
    name: 'browser.find_element',
    description: 'Finds the most relevant interactive element matching description using JEV System-One.',
    inputSchema: { description: 'string' },
    permissions: ['read_dom'],
    async execute(input) {
      const elements = await sessionManager.getDomExtract();
      const decision = await globalJevEngine.judgeElement(input.description, elements);
      return {
        success: Boolean(decision.element_id),
        element_id: decision.element_id,
        confidence: decision.confidence,
        action: decision.action,
        rationale: decision.rationale,
        element: decision.element
      };
    }
  });

  // 11. browser.move_mouse
  globalToolRegistry.register({
    name: 'browser.move_mouse',
    description: 'Smoothly moves the AEGIS cursor to x, y coordinates.',
    inputSchema: { x: 'number', y: 'number' },
    permissions: ['click'],
    async execute(input) {
      return await sessionManager.moveMouse(input.x, input.y);
    }
  });

  // 12. browser.click
  globalToolRegistry.register({
    name: 'browser.click',
    description: 'Clicks an element by element_id or by x, y coordinates with visual cursor feedback.',
    inputSchema: { element_id: 'string', x: 'number', y: 'number' },
    permissions: ['click'],
    async execute(input) {
      if (input.element_id) {
        return await sessionManager.clickElement(input.element_id);
      }
      return await sessionManager.click(input.x, input.y);
    }
  });

  // 13. browser.type
  globalToolRegistry.register({
    name: 'browser.type',
    description: 'Types text into an input element or current focus.',
    inputSchema: { element_id: 'string', text: 'string' },
    permissions: ['type'],
    async execute(input) {
      return await sessionManager.typeText(input.text, { element_id: input.element_id });
    }
  });

  // 14. browser.press
  globalToolRegistry.register({
    name: 'browser.press',
    description: 'Presses a keyboard key (Enter, Escape, Tab, etc.).',
    inputSchema: { key: 'string' },
    permissions: ['type'],
    async execute(input) {
      return await sessionManager.pressKey(input.key);
    }
  });

  // 15. browser.scroll
  globalToolRegistry.register({
    name: 'browser.scroll',
    description: 'Scrolls page up or down.',
    inputSchema: { direction: 'string', amount: 'number' },
    permissions: ['scroll'],
    async execute(input) {
      return await sessionManager.scroll(input.direction || 'down', input.amount || 500);
    }
  });

  // 16. browser.wait
  globalToolRegistry.register({
    name: 'browser.wait',
    description: 'Waits for duration or page load.',
    inputSchema: { duration_ms: 'number' },
    permissions: ['read'],
    async execute(input) {
      const ms = Math.min(input.duration_ms || 1000, 10000);
      await new Promise(r => setTimeout(r, ms));
      return { success: true, waited_ms: ms };
    }
  });

  // 17. browser.tabs.list
  globalToolRegistry.register({
    name: 'browser.tabs.list',
    description: 'Lists all open browser tabs.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      return { tabs: sessionManager.listTabs() };
    }
  });

  // 18. browser.tabs.new
  globalToolRegistry.register({
    name: 'browser.tabs.new',
    description: 'Opens a new browser tab with optional initial URL.',
    inputSchema: { url: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = await sessionManager.createTab(input.url || 'https://www.google.com');
      return { success: true, tab_id: tab.id, url: tab.url };
    }
  });

  // 19. browser.tabs.switch
  globalToolRegistry.register({
    name: 'browser.tabs.switch',
    description: 'Switches focus to specified tab ID.',
    inputSchema: { tab_id: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const tab = await sessionManager.switchTab(input.tab_id);
      return { success: true, active_tab: tab.id };
    }
  });

  // 20. browser.tabs.close
  globalToolRegistry.register({
    name: 'browser.tabs.close',
    description: 'Closes a browser tab.',
    inputSchema: { tab_id: 'string' },
    permissions: ['navigate'],
    async execute(input) {
      const res = await sessionManager.closeTab(input.tab_id);
      return { success: res };
    }
  });

  // 21. browser.get_content
  globalToolRegistry.register({
    name: 'browser.get_content',
    description: 'Extracts full readable textual and structural content from the active tab.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      return await sessionManager.getPageContent();
    }
  });

  // 22. browser.get_github_repos
  globalToolRegistry.register({
    name: 'browser.get_github_repos',
    description: 'Extracts structured repository cards (name, url, stars, description) from GitHub.',
    inputSchema: {},
    permissions: ['read'],
    async execute() {
      const repos = await sessionManager.getGithubRepoCards();
      return { count: repos.length, repos };
    }
  });

  // 23. agent.create_note
  globalToolRegistry.register({
    name: 'agent.create_note',
    description: 'Compiles and saves structured research notes with title, markdown content, and repository links.',
    inputSchema: { title: 'string', content: 'string', repo_url: 'string', stars: 'string', takeaways: 'array' },
    permissions: ['write'],
    async execute(input) {
      const { writeFileSync, existsSync, mkdirSync } = await import('fs');
      const { join } = await import('path');

      const notesDir = 'd:\\Aegis BOT\\notes';
      if (!existsSync(notesDir)) mkdirSync(notesDir, { recursive: true });

      const safeTitle = (input.title || 'agent-research-note').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
      const filename = `${safeTitle}-${Date.now()}.md`;
      const filepath = join(notesDir, filename);

      const markdown = `# ${input.title || 'Research Note'}\n\n` +
        `**Generated by AEGIS BOT** | ${new Date().toLocaleString()}\n` +
        (input.repo_url ? `**Repository**: [${input.repo_url}](${input.repo_url})  \n` : '') +
        (input.stars ? `**Stars**: ⭐ ${input.stars}  \n\n` : '\n') +
        `---\n\n` +
        `${input.content}\n\n` +
        (input.takeaways && input.takeaways.length ? `## Key Takeaways\n${input.takeaways.map(t => `- ${t}`).join('\n')}\n` : '');

      writeFileSync(filepath, markdown, 'utf8');

      const noteData = {
        id: `note-${Date.now()}`,
        filename,
        filepath,
        title: input.title,
        repo_url: input.repo_url,
        stars: input.stars,
        content: input.content,
        takeaways: input.takeaways || [],
        markdown,
        timestamp: new Date().toISOString()
      };

      const { globalEventBus } = await import('../events/event-bus.js');
      globalEventBus.emitEvent('agent.note_created', noteData);

      console.log(`[AEGIS Notes] Saved research note to: ${filepath}`);
      return { success: true, note: noteData };
    }
  });

  console.log(`[ToolRegistry] Registered 23 AEGIS Tools (including Turbo Content & Notes) successfully.`);
}
