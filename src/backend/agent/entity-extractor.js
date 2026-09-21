/**
 * AEGIS Intent & Entity Extraction Engine
 * Parses natural language user instructions to extract clean search queries,
 * credentials (User ID, Password, Email), confidential information (OTP, 2FA, PIN),
 * explicit form key-value fields, and workflow intent.
 * 
 * Prevents raw instructional prompts (like "login with these credentials : User ID : XYZ...")
 * from ever being mistakenly typed into form inputs.
 */

export function extractTaskEntities(taskDescription) {
  if (!taskDescription || typeof taskDescription !== 'string') {
    return {
      isLogin: false,
      isFormFilling: false,
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

  // 2. Extract Username / User ID / Email
  // e.g. "User ID : XYZ", "User ID: XYZ", "Username: XYZ", "User: XYZ", "Login: XYZ", "Email: XYZ"
  const userMatchA = raw.match(/(?:user\s*(?:id|name)?|login|email|account)\s*[:=]\s*["']?([^"',;\s\n]+)["']?/i);
  if (userMatchA) {
    username = userMatchA[1].trim();
  }

  if (!username) {
    const userMatchB = raw.match(/(?:username|user|email|user\s*id)\s+(?:is|as|being|of)?\s*["']?([^"',;\s\n]+)["']?/i);
    if (userMatchB && !['with', 'and', 'to', 'for', 'these', 'a', 'the'].includes(userMatchB[1].toLowerCase())) {
      username = userMatchB[1].trim();
    }
  }

  // 3. Extract Password / Pass / Pwd
  // e.g. "Pass : 123", "Password: 123", "Pwd: 123"
  const passMatchA = raw.match(/(?:pass(?:word)?|pwd)\s*[:=]\s*["']?([^"',;\s\n]+)["']?/i);
  if (passMatchA) {
    password = passMatchA[1].trim();
  }

  if (!password) {
    const passMatchB = raw.match(/(?:pass(?:word)?|pwd)\s+(?:is|as)?\s*["']?([^"',;\s\n]+)["']?/i);
    if (passMatchB && !['is', 'and', 'with', 'to', 'these', 'a', 'the'].includes(passMatchB[1].toLowerCase())) {
      password = passMatchB[1].trim();
    }
  }

  if (username) fields.username = username;
  if (password) fields.password = password;

  // 4. Extract Generic Form Fields (Clean key-value tokens after delimiters)
  // e.g. "Name: Alice", "Email: alice@example.com", "Phone: 99999"
  const cleanTokens = raw.split(/[,;\n]|(?:\band\b)/i);
  for (const token of cleanTokens) {
    const kv = token.match(/(?:(?:fill|enter|input|with)?\s+)?([a-zA-Z\s_]{2,20})\s*[:=]\s*["']?([^"',;\n]+)["']?/i);
    if (kv) {
      const key = kv[1].trim().toLowerCase().replace(/^(fill|enter|input|with|for)\s+/i, '');
      const val = kv[2].trim();
      if (key && val && !['credentials', 'these credentials', 'note', 'step', 'http', 'https', 'task'].includes(key)) {
        fields[key] = val;
      }
    }
  }

  // Check for confidential tokens (OTP, 2FA, PIN)
  const otpMatch = raw.match(/(?:otp|2fa|code|pin)\s*[:=]?\s*([0-9]{4,8})/i);
  if (otpMatch) {
    fields.otp = otpMatch[1].trim();
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
    // Try to extract domain like "login to example.com"
    const domainMatch = raw.match(/\b([a-zA-Z0-9-]+\.(?:com|org|io|net|in|ai|co))\b/i);
    if (domainMatch) {
      targetSite = `https://${domainMatch[1]}`;
    }
  }

  // 6. Compute Clean Search Query (Stripping instructional phrases and credentials)
  let cleanQuery = raw;

  cleanQuery = cleanQuery
    .replace(/login\s+with\s+these\s+credentials\s*[:\.]?/gi, '')
    .replace(/(?:user\s*(?:id|name)?|login|email)\s*[:=]\s*["']?[^"',;\s\n]+["']?/gi, '')
    .replace(/(?:pass(?:word)?|pwd)\s*[:=]\s*["']?[^"',;\s\n]+["']?/gi, '')
    .replace(/\band\s+pass\s*[:=]\s*["']?[^"',;\s\n]+["']?/gi, '')
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
    .replace(/['":,;]/g, ' ')
    .trim();

  // If after cleaning it's empty or it was purely a login instruction
  if (isLogin && (!cleanQuery || cleanQuery.length < 3 || cleanQuery === 'and' || cleanQuery === 'with and')) {
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
