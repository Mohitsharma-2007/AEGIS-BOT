const raw = 'Login to this Site : open https://s.amizone.net/ then login | 12338591 and Pass : Mohit@6050';

function clean(raw, targetSite, isLogin) {
  let q = raw
    .replace(/login\s+to\s+(?:this\s+)?site\s*[:\.]?/gi, '')
    .replace(/open\s+https?:\/\/[^\s,;]+/gi, '')
    .replace(/https?:\/\/[^\s,;]+/gi, '')
    .replace(/login\s+with\s+these\s+credentials\s*[:\.]?/gi, '')
    .replace(/then\s+login\s*[:=|/-]?\s*[^"',;\s\n]+/gi, '')
    .replace(/(?:user\s*(?:id|name)?|login|email|account|id)\s*[:=|/-]\s*["']?[^"',;\s\n]+["']?/gi, '')
    .replace(/(?:pass(?:word)?|pwd)\s*[:=|/-]\s*["']?[^"',;\s\n]+["']?/gi, '')
    .replace(/\band\s+pass\s*[:=|/-]?\s*["']?[^"',;\s\n]+["']?/gi, '')
    .replace(/\bwith\s+credentials\b/gi, '')
    .replace(/\blogin\s+(?:to|into)?\s*([a-zA-Z0-9\.-]+)?/gi, '')
    .replace(/\bsearch\s+(?:github|amazon|google|for)?\s*/gi, '')
    .replace(/\band\s+find\s+the\s+one\s+with.*/gi, '')
    .replace(/\band\s+create\s+a\s+note.*/gi, '')
    .replace(/let\s+the\s+cloudflare[^\s]*\s+loading\s+spins?/gi, '')
    .replace(/let\s+(?:the\s+)?(?:cloudflare|spinner|verification).*/gi, '')
    .replace(/thecn\s+click\s+on\s+login.*/gi, '')
    .replace(/then\s+click\s+on\s+login.*/gi, '')
    .replace(/\band\s+continue\s+to\s+use\b.*/gi, '')
    .replace(/\bso\s+please\s+fix\s+these\s+issues\b/gi, '')
    .replace(/\bunderscore\b/gi, '')
    .replace(/['":,;|]/g, ' ')
    .trim();

  if (isLogin && (!q || q.length < 3 || q === 'and' || q === 'with and')) {
    q = targetSite ? new URL(targetSite).hostname : 'Login';
  }
  return q;
}

console.log('Cleaned query:', clean(raw, 'https://s.amizone.net/', true));
