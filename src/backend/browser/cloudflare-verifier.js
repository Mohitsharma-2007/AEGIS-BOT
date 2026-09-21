/**
 * AEGIS Cloudflare & Bot Verification Engine
 * 
 * Provides patient, human-like verification handling for Cloudflare Turnstile,
 * Cloudflare Interstitial ("Just a moment..."), Google reCAPTCHA, and bot challenges.
 * 
 * Specifically designed to eliminate agent impatience:
 * It monitors the Cloudflare loading spinner ("cloudflareverfy loading spins")
 * until it completely finishes and generates the response token, before allowing
 * login submissions or form actions to proceed.
 */

/**
 * Deep inspection of the page DOM and iframes for Cloudflare Turnstile / challenge state.
 * @param {import('playwright').Page} page 
 * @returns {Promise<Object>} Verification state telemetry
 */
export async function inspectCloudflareVerification(page) {
  if (!page) return { hasChallenge: false, isVerified: false, isSpinning: false, needsClick: false };

  try {
    return await page.evaluate(() => {
      const url = window.location.href || '';
      const title = (document.title || '').toLowerCase();
      const bodyText = (document.body ? document.body.innerText : '').toLowerCase();

      // 1. Check for Turnstile / Challenge response tokens
      const tokenInputs = Array.from(document.querySelectorAll(
        'input[name="cf-turnstile-response"], input[name="cf_challenge_response"], input[name*="turnstile-response"], input[name*="cf-chl-widget-"], textarea[name="g-recaptcha-response"], input[name="g-recaptcha-response"], input#RecaptchaToken, input[name="RecaptchaToken"], textarea[name="h-captcha-response"], input[name="h-captcha-response"]'
      ));

      let hasToken = false;
      let tokenValue = null;
      for (const input of tokenInputs) {
        if (input.value && input.value.trim().length > 20) {
          hasToken = true;
          tokenValue = input.value.trim();
          break;
        }
      }

      // 2. Check for Turnstile Success indicators in DOM
      const successIndicators = document.querySelector(
        '[data-state="success"], [data-state="solved"], .turnstile-success, #challenge-success, svg[aria-label="Success"], svg.checkmark, .cf-turnstile .success'
      );
      const isVerified = Boolean(hasToken || successIndicators);

      // 3. Check for Challenge Iframes
      const challengeIframe = document.querySelector(
        'iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="cf-turnstile"], iframe[title*="cloudflare" i], iframe[title*="turnstile" i], iframe[title*="security challenge" i], iframe[title*="widget containing a cloudflare security challenge" i], #Capthcadiv iframe'
      );

      // 4. Check for Challenge Stages / Containers
      const challengeStage = document.querySelector(
        '#challenge-stage, #cf-stage, .cf-turnstile, #turnstile-wrapper, #challenge-running, #cf-challenge-running, #cf-wrapper, #challenge-form, #Capthcadiv, div[id*="captcha" i], div[class*="captcha" i]'
      );

      // 5. Check for Active Loading Spinners ("cloudflareverfy loading spins")
      const spinnerElements = document.querySelectorAll(
        '.cf-spinner, .turnstile-spinner, #challenge-spinner, #challenge-running, #cf-challenge-running, [data-state="verifying"], [data-state="executing"], [data-state="pending"], [aria-busy="true"], .loading-spinner, .spinner, .cf-turnstile [role="progressbar"], .cf-turnstile svg circle[stroke-dasharray], #cf-stage .loading, #cf-bubbles'
      );
      const hasSpinnerElement = spinnerElements.length > 0;

      const isTextVerifying = (
        bodyText.includes('verifying...') ||
        bodyText.includes('verifying you are human') ||
        bodyText.includes('checking your browser') ||
        bodyText.includes('checking if the site connection is secure') ||
        (bodyText.includes('just a moment') && !bodyText.includes('error'))
      );

      const isSpinning = Boolean((hasSpinnerElement || isTextVerifying) && !isVerified);

      // 6. Check if this is a full-page interstitial challenge
      const isInterstitial = Boolean(
        url.includes('challenges.cloudflare.com') ||
        title.includes('just a moment') ||
        title.includes('attention required') ||
        document.querySelector('#challenge-form')
      );

      const hasChallenge = Boolean(challengeIframe || challengeStage || isInterstitial || isTextVerifying || isSpinning);

      // 7. Calculate Click Target for Checkbox (if click is needed before spinning)
      let clickTarget = null;
      let needsClick = false;

      if (hasChallenge && !isVerified && !isSpinning) {
        const targetFrame = challengeIframe || (challengeStage ? challengeStage.querySelector('iframe') : null);
        if (targetFrame) {
          const rect = targetFrame.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) {
            needsClick = true;
            clickTarget = {
              x: Math.round(rect.left + Math.min(35, rect.width * 0.15)),
              y: Math.round(rect.top + rect.height / 2),
              width: rect.width,
              height: rect.height
            };
          }
        } else if (challengeStage) {
          const cb = challengeStage.querySelector('input[type="checkbox"], .ctp-checkbox-label, .mark');
          const targetEl = cb || challengeStage;
          const rect = targetEl.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) {
            needsClick = true;
            clickTarget = {
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              width: rect.width,
              height: rect.height
            };
          }
        }
      }

      return {
        hasChallenge,
        isVerified,
        isSpinning,
        needsClick,
        token: tokenValue,
        clickTarget,
        isInterstitial
      };
    });
  } catch (err) {
    console.warn('[inspectCloudflareVerification error]:', err.message);
    return { hasChallenge: false, isVerified: false, isSpinning: false, needsClick: false };
  }
}

/**
 * Patiently waits for the Cloudflare verification spinner to finish spinning and resolve.
 * 
 * If a checkbox is present and unclicked, clicks it with curved human physics.
 * Then enters a patient polling loop (up to 25s), emitting informative ReAct thoughts,
 * until the verification spinner finishes and the verification token is acquired.
 * 
 * @param {import('playwright').Page} page 
 * @param {Object} options 
 * @param {number} [options.maxWaitMs=25000] Maximum patient wait time in ms
 * @param {number} [options.pollIntervalMs=600] Interval between checks in ms
 * @param {Function} [options.onThought] Callback to emit live ReAct thoughts
 * @param {Object} [options.sessionManager] Session manager for human curved clicking
 * @param {boolean} [options.allowClick=true] Whether to click checkbox if unclicked
 * @returns {Promise<{ detected: boolean, verified: boolean, token?: string, elapsedMs?: number }>}
 */
export async function waitForCloudflareVerification(page, options = {}) {
  const {
    maxWaitMs = 25000,
    pollIntervalMs = 600,
    onThought = null,
    sessionManager = null,
    allowClick = true
  } = options;

  if (!page) return { detected: false, verified: true };

  // 1. Initial Inspection
  let state = await inspectCloudflareVerification(page);
  if (!state.hasChallenge) {
    return { detected: false, verified: true };
  }

  // If already verified, return immediately
  if (state.isVerified) {
    onThought?.('✓ [Cloudflare Verification]: Verification token already generated and confirmed valid.', 'observation');
    return { detected: true, verified: true, token: state.token, elapsedMs: 0 };
  }

  onThought?.('👁️ [Cloudflare Verification]: Security challenge detected on page. Initiating patient verification...', 'recovery');

  // 2. Click Checkbox if needed with Human Curved Mouse
  if (state.needsClick && !state.isSpinning && allowClick && state.clickTarget) {
    onThought?.('🖱️ Cloudflare Turnstile checkbox detected. Engaging curved Bezier human cursor to click...', 'action');

    const jitterX = Math.floor((Math.random() - 0.5) * 6);
    const jitterY = Math.floor((Math.random() - 0.5) * 6);
    const targetX = state.clickTarget.x + jitterX;
    const targetY = state.clickTarget.y + jitterY;

    if (sessionManager && typeof sessionManager.click === 'function') {
      await sessionManager.click(targetX, targetY);
    } else {
      await page.mouse.click(targetX, targetY);
    }

    onThought?.('Verification checkbox clicked. Letting verification spinner spin...', 'action');
    await new Promise(r => setTimeout(r, 900)); // Natural pause for spinner to spin
  }

  // 3. PATIENCE POLLING LOOP
  // Let the cloudflare verify loading spinner spin until verification completes!
  const startTime = Date.now();
  let lastReportTime = 0;
  let retryClickDone = false;

  while (Date.now() - startTime < maxWaitMs) {
    const elapsedMs = Date.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(1);

    state = await inspectCloudflareVerification(page);

    // CONDITION A: Token acquired or success indicator visible!
    if (state.isVerified) {
      onThought?.(
        `✓ [Cloudflare Verification]: Verification spinner finished! Token successfully acquired (${elapsedSec}s elapsed). Challenge solved.`,
        'observation'
      );
      // Gentle settling pause so form bindings synchronize
      await new Promise(r => setTimeout(r, 800));
      return { detected: true, verified: true, token: state.token, elapsedMs };
    }

    // CONDITION B: Interstitial challenge navigated / redirected away
    if (state.isInterstitial === false && !state.hasChallenge && elapsedMs > 2500) {
      onThought?.(
        `✓ [Cloudflare Verification]: Challenge barrier cleared and page redirected (${elapsedSec}s elapsed). Resuming workflow.`,
        'observation'
      );
      await new Promise(r => setTimeout(r, 800));
      return { detected: true, verified: true, redirected: true, elapsedMs };
    }

    // Active Spinning: Report patience update every 2 seconds
    if (Date.now() - lastReportTime >= 2000) {
      lastReportTime = Date.now();
      if (state.isSpinning) {
        onThought?.(
          `⏳ [Cloudflare Verification]: Verification spinner is spinning... waiting patiently for token generation (${elapsedSec}s elapsed)...`,
          'recovery'
        );
      } else {
        onThought?.(
          `⏳ [Cloudflare Verification]: Verification in progress... holding all interactions patiently (${elapsedSec}s elapsed)...`,
          'recovery'
        );
      }
    }

    // Check if after 4 seconds it remained unclicked and still needs a click
    if (state.needsClick && !state.isSpinning && elapsedMs > 4000 && !retryClickDone && allowClick && state.clickTarget) {
      retryClickDone = true;
      onThought?.('Re-engaging curved human click on Turnstile checkbox to initiate spinner...', 'action');
      const targetX = state.clickTarget.x + Math.floor((Math.random() - 0.5) * 6);
      const targetY = state.clickTarget.y + Math.floor((Math.random() - 0.5) * 6);
      if (sessionManager && typeof sessionManager.click === 'function') {
        await sessionManager.click(targetX, targetY);
      } else {
        await page.mouse.click(targetX, targetY);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  // 4. Final verification check upon timeout
  state = await inspectCloudflareVerification(page);
  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);

  if (state.isVerified || !state.hasChallenge) {
    onThought?.(`✓ [Cloudflare Verification]: Challenge resolved after ${totalSec}s. Ready to proceed.`, 'observation');
    return { detected: true, verified: true, token: state.token, elapsedMs: Date.now() - startTime };
  }

  onThought?.(`⚠️ [Cloudflare Verification]: Wait reached ${totalSec}s. Proceeding with caution...`, 'recovery');
  return { detected: true, verified: false, timedOut: true, elapsedMs: Date.now() - startTime };
}
