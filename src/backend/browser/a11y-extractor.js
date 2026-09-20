/**
 * Extracts normalized accessibility tree from the active Playwright page.
 */
export async function extractAccessibilityTree(page, options = {}) {
  if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
    return [];
  }

  try {
    // 1. Try native Playwright accessibility snapshot if supported
    if (page.accessibility && typeof page.accessibility.snapshot === 'function') {
      const snapshot = await page.accessibility.snapshot({
        interestingOnly: options.interestingOnly !== false
      }).catch(() => null);

      if (snapshot) {
        const nodes = [];
        let counter = 1;

        function walk(node, depth = 0) {
          if (!node) return;
          nodes.push({
            node_id: `a11y-${String(counter++).padStart(3, '0')}`,
            role: node.role || 'generic',
            name: (node.name || '').slice(0, 80),
            value: node.value !== undefined ? String(node.value) : undefined,
            description: node.description || undefined,
            focused: Boolean(node.focused),
            disabled: Boolean(node.disabled),
            depth
          });
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) walk(child, depth + 1);
          }
        }

        walk(snapshot);
        return nodes.slice(0, options.maxNodes || 100);
      }
    }

    // 2. High-fidelity DOM fallback for ARIA accessibility tree
    const a11yData = await page.evaluate((maxCount) => {
      const elements = Array.from(document.querySelectorAll('[role], input, button, a, select, textarea, h1, h2, h3, nav, main, header, footer'));
      const nodes = [];
      let counter = 1;

      for (const el of elements.slice(0, maxCount)) {
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.placeholder || '').trim().slice(0, 60);
        const value = el.value !== undefined ? String(el.value).slice(0, 40) : undefined;
        const focused = document.activeElement === el;
        const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

        nodes.push({
          node_id: `a11y-${String(counter++).padStart(3, '0')}`,
          role,
          name,
          value,
          focused,
          disabled,
          depth: 0
        });
      }
      return nodes;
    }, options.maxNodes || 80).catch(() => []);

    return a11yData;
  } catch (err) {
    console.warn('[A11y Extractor fallback notice]:', err.message);
    return [];
  }
}
