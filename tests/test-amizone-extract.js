import assert from 'assert';

function extractTaskEntities(taskDescription) {
  if (!taskDescription || typeof taskDescription !== 'string') {
    return {
      isLogin: false,
      isFormFilling: false,
      shouldContinue: false,
      hasCredentials: false,
      credentials: null,
      fields: {},
      cleanQuery: '',
      targetSite: null
    };
  }

  const raw = taskDescription.trim();
  const lower = raw.toLowerCase();

  // 1. Detect Intent Category
  const isLogin = /\b(login|log\s*in|sign\s*in|signin|authenticate|auth)\b/i.test(raw);
  const isFormFilling = /\b(fill|form|register|signup|sign\s*up|apply|submit)\b/i.test(raw);
  const shouldContinue = /\b(continue\s+(?:to\s+use|using)|keep\s+(?:using|going)|browse|explore|search|find|view|open)\b/i.test(raw);

  const fields = {};
  let username = null;
  let password = null;
  const stopWords = ['to', 'this', 'site', 'open', 'http', 'https', 'these', 'with', 'and', 'for', 'a', 'the', 'is', 'being', 'of', 'credentials'];

  // 2. Extract Username / User ID / Email / Enrollment
  const userMatches = [...raw.matchAll(/(?:user\s*(?:id|name)?|login|email|account|id|enrollment|roll(?:\s*no)?)\s*[:=|/-]\s*["']?([^"',;\s\n]+)["']?/gi)];
  for (const m of userMatches) {
    const candidate = m[1].trim();
    if (candidate && !stopWords.includes(candidate.toLowerCase()) && !candidate.startsWith('http')) {
      username = candidate;
      break;
    }
  }

  if (!username) {
    const userMatchB = raw.match(/(?:username|user|email|user\s*id|id)\s+(?:is|as|being|of)?\s*["']?([^"',;\s\n]+)["']?/i);
    if (userMatchB && !stopWords.includes(userMatchB[1].toLowerCase())) {
      username = userMatchB[1].trim();
    }
  }

  // 3. Extract Password / Pass / Pwd
  const passMatches = [...raw.matchAll(/(?:pass(?:word)?|pwd)\s*[:=|/-]\s*["']?([^"',;\s\n]+)["']?/gi)];
  for (const m of passMatches) {
    const candidate = m[1].trim();
    if (candidate && !stopWords.includes(candidate.toLowerCase())) {
      password = candidate;
      break;
    }
  }

  if (!password) {
    const passMatchB = raw.match(/(?:pass(?:word)?|pwd)\s+(?:is|as)?\s*["']?([^"',;\s\n]+)["']?/i);
    if (passMatchB && !stopWords.includes(passMatchB[1].toLowerCase())) {
      password = passMatchB[1].trim();
    }
  }

  if (username) fields.username = username;
  if (password) fields.password = password;

  // 4. Extract Generic Form Fields
  const cleanTokens = raw.split(/[,;\n]|(?:\band\b)/i);
  for (const token of cleanTokens) {
    const kv = token.match(/(?:(?:fill|enter|input|with)?\s+)?([a-zA-Z\s_]{2,20})\s*[:=]\s*["']?([^"',;\n]+)["']?/i);
    if (kv) {
      const key = kv[1].trim().toLowerCase().replace(/^(fill|enter|input|with|for)\s+/i, '');
      const val = kv[2].trim();
      if (key && val && !['credentials', 'these credentials', 'note', 'step', 'http', 'https', 'task', 'login to this site'].includes(key)) {
        fields[key] = val;
      }
    }
  }

  // 5. Detect Target Site or Domain
  let targetSite = null;
  const urlMatch = raw.match(/https?:\/\/[^\s,;]+/i);
  if (urlMatch) {
    targetSite = urlMatch[0];
  } else if (lower.includes('github')) {
    targetSite = 'https://github.com';
  } else if (lower.includes('amazon')) {
    targetSite = 'https://www.amazon.in';
  } else if (lower.includes('twitter') || lower.includes('x.com')) {
    targetSite = 'https://x.com';
  } else if (lower.includes('wikipedia')) {
    targetSite = 'https://en.wikipedia.org';
  } else {
    const domainMatch = raw.match(/\b([a-zA-Z0-9-]+\.(?:com|org|io|net|in|ai|co))\b/i);
    if (domainMatch) {
      targetSite = `https://${domainMatch[1]}`;
    }
  }

  // 6. Compute Clean Search Query
  let cleanQuery = raw;

  cleanQuery = cleanQuery
    .replace(/login\s+to\s+(?:this\s+)?site\s*[:\.]?/gi, '')
    .replace(/open\s+https?:\/\/[^\s,;]+/gi, '')
    .replace(/https?:\/\/[^\s,;]+/gi, '')
    .replace(/login\s+with\s+these\s+credentials\s*[:\.]?/gi, '')
    .replace(/then\s+login\s*[:=|/-]?\s*[^"',;\s\n]+/gi, '')
    .replace(/(?:user\s*(?:id|name)?|login|email|account|id|enrollment)\s*[:=|/-]\s*["']?[^"',;\s\n]+["']?/gi, '')
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

  // If after cleaning it's empty or it was purely a login instruction
  if (isLogin && (!cleanQuery || cleanQuery.length < 3 || cleanQuery === 'and' || cleanQuery === 'with and' || cleanQuery === 'then' || cleanQuery.toLowerCase().startsWith('site'))) {
    cleanQuery = targetSite ? new URL(targetSite).hostname : 'Login';
  }

  const hasCredentials = Boolean(username && password);

  return {
    isLogin,
    isFormFilling,
    shouldContinue,
    hasCredentials,
    credentials: (username || password) ? { username, password } : null,
    fields,
    cleanQuery: cleanQuery.slice(0, 60).trim(),
    targetSite
  };
}

const testPrompt = 'Login to this Site : open https://s.amizone.net/ then login | 12338591 and Pass : Mohit@6050';
const res = extractTaskEntities(testPrompt);
console.log('Result for user prompt:', res);
assert.strictEqual(res.isLogin, true);
assert.strictEqual(res.hasCredentials, true);
assert.strictEqual(res.credentials.username, '12338591');
assert.strictEqual(res.credentials.password, 'Mohit@6050');
assert.strictEqual(res.targetSite, 'https://s.amizone.net/');
assert.strictEqual(res.cleanQuery, 's.amizone.net');
console.log('✓ All extraction assertions passed!');
