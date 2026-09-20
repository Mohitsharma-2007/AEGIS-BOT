/**
 * Extracts and normalizes interactive DOM elements from the active Playwright page.
 */
export async function extractInteractiveDom(page, options = {}) {
  const { maxElements = 120 } = options;

  try {
    const rawElements = await page.evaluate((maxCount) => {
      const selectors = [
        'input:not([type="hidden"])',
        'button',
        'a[href]',
        'textarea',
        'select',
        '[role="button"]',
        '[role="searchbox"]',
        '[role="textbox"]',
        '[role="link"]',
        '[role="combobox"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ];

      const elements = Array.from(document.querySelectorAll(selectors.join(',')));
      const results = [];
      let counter = 1;

      for (const el of elements) {
        if (results.length >= maxCount) break;

        // Visibility check
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 3 && rect.height > 3 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.opacity !== '0' &&
          rect.bottom > 0 &&
          rect.top < (window.innerHeight || document.documentElement.clientHeight) + 1000;

        if (!isVisible) continue;

        const id = `e-${String(counter++).padStart(3, '0')}`;
        el.setAttribute('data-aegis-id', id);

        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || (
          tag === 'input' ? (el.getAttribute('type') === 'search' ? 'searchbox' : 'textbox') :
          tag === 'button' ? 'button' :
          tag === 'a' ? 'link' :
          tag === 'textarea' ? 'textbox' :
          tag === 'select' ? 'combobox' : tag
        );

        const text = (el.innerText || el.textContent || '').trim().slice(0, 80);
        const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
        const placeholder = el.getAttribute('placeholder') || '';
        const value = el.value !== undefined ? String(el.value).slice(0, 50) : '';
        const name = el.getAttribute('name') || '';
        const htmlId = el.id || '';
        const href = el.getAttribute('href') || '';
        const type = el.getAttribute('type') || '';

        const enabled = !el.disabled && !el.hasAttribute('disabled');
        const editable = tag === 'input' || tag === 'textarea' || el.isContentEditable;

        results.push({
          element_id: id,
          tag,
          role,
          text,
          aria_label: ariaLabel,
          placeholder,
          name,
          html_id: htmlId,
          href: href ? (href.startsWith('http') ? href : window.location.origin + href) : '',
          type,
          value,
          visible: true,
          enabled,
          editable,
          bbox: {
            x: Math.round(rect.x + window.scrollX),
            y: Math.round(rect.y + window.scrollY),
            viewport_x: Math.round(rect.x),
            viewport_y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          center: {
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2)
          }
        });
      }

      return results;
    }, maxElements);

    return rawElements;
  } catch (err) {
    console.error('[DOM Extractor Error]:', err.message);
    return [];
  }
}

/**
 * Highlights an element in the browser viewport with an animated Aegis target box.
 */
export async function highlightElement(page, elementId, status = 'targeting') {
  try {
    await page.evaluate(({ id, status }) => {
      // Remove any existing overlay
      const existing = document.getElementById('aegis-highlight-overlay');
      if (existing) existing.remove();

      const el = document.querySelector(`[data-aegis-id="${id}"]`);
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.id = 'aegis-highlight-overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = `${rect.left - 3}px`;
      overlay.style.top = `${rect.top - 3}px`;
      overlay.style.width = `${rect.width + 6}px`;
      overlay.style.height = `${rect.height + 6}px`;
      overlay.style.border = status === 'clicking' ? '3px solid #10b981' : '2px solid #06b6d4';
      overlay.style.boxShadow = status === 'clicking' 
        ? '0 0 16px rgba(16, 185, 129, 0.8), inset 0 0 8px rgba(16, 185, 129, 0.4)' 
        : '0 0 12px rgba(6, 182, 212, 0.7), inset 0 0 6px rgba(6, 182, 212, 0.3)';
      overlay.style.backgroundColor = status === 'clicking' 
        ? 'rgba(16, 185, 129, 0.15)' 
        : 'rgba(6, 182, 212, 0.1)';
      overlay.style.borderRadius = '6px';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '2147483647';
      overlay.style.transition = 'all 0.15s ease-out';

      // Badge
      const badge = document.createElement('div');
      badge.textContent = `AEGIS TARGET [${id}]`;
      badge.style.position = 'absolute';
      badge.style.bottom = '100%';
      badge.style.left = '0';
      badge.style.marginBottom = '4px';
      badge.style.background = status === 'clicking' ? '#10b981' : '#06b6d4';
      badge.style.color = '#000';
      badge.style.fontWeight = 'bold';
      badge.style.fontSize = '10px';
      badge.style.fontFamily = 'monospace';
      badge.style.padding = '2px 6px';
      badge.style.borderRadius = '3px';
      badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
      overlay.appendChild(badge);

      document.body.appendChild(overlay);

      // Auto remove after 3s if not cleared
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 3000);

      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        width: rect.width,
        height: rect.height
      };
    }, { id: elementId, status });
  } catch (err) {
    // Ignore frame teardown errors
  }
}

/**
 * Removes the highlight overlay.
 */
export async function clearHighlight(page) {
  try {
    await page.evaluate(() => {
      const existing = document.getElementById('aegis-highlight-overlay');
      if (existing) existing.remove();
    });
  } catch {}
}
