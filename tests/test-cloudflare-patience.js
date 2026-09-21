import assert from 'assert';
import { extractTaskEntities } from '../src/backend/agent/entity-extractor.js';
import { inspectCloudflareVerification, waitForCloudflareVerification } from '../src/backend/browser/cloudflare-verifier.js';

async function runTests() {
  console.log('Testing entity extractor with user prompt...');
  const prompt = 'The Bot does not have patience at all let the cloudflareverfy loading spins thecn click on login and continue to use , so please fix these issues.';
  const extracted = extractTaskEntities(prompt);
  console.log('Extracted entities:', extracted);
  assert.strictEqual(extracted.isLogin, true, 'isLogin should be true');
  assert.strictEqual(extracted.shouldContinue, true, 'shouldContinue should be true');

  const credPrompt = 'login with these credentials : User ID : saten and Pass : mySecretPass123 and continue to use';
  const credExtracted = extractTaskEntities(credPrompt);
  console.log('Cred Extracted:', credExtracted);
  assert.strictEqual(credExtracted.credentials.username, 'saten');
  assert.strictEqual(credExtracted.credentials.password, 'mySecretPass123');
  assert.strictEqual(credExtracted.shouldContinue, true);

  console.log('\nTesting Cloudflare Verifier with mock page...');
  // Mock page with spinning state that transitions to verified
  let stateCall = 0;
  const mockPage = {
    mouse: {
      click: async () => {}
    },
    evaluate: async (fn) => {
      stateCall++;
      if (stateCall === 1) {
        // First call: challenge detected, needs click
        return {
          hasChallenge: true,
          isVerified: false,
          isSpinning: false,
          needsClick: true,
          token: null,
          clickTarget: { x: 100, y: 200, width: 300, height: 65 },
          isInterstitial: false
        };
      } else if (stateCall === 2 || stateCall === 3) {
        // Second & Third call: spinner actively spinning!
        return {
          hasChallenge: true,
          isVerified: false,
          isSpinning: true,
          needsClick: false,
          token: null,
          clickTarget: null,
          isInterstitial: false
        };
      } else {
        // Fourth call: spinner completed, token acquired!
        return {
          hasChallenge: true,
          isVerified: true,
          isSpinning: false,
          needsClick: false,
          token: '0.cf-token-verified-abcdef1234567890',
          clickTarget: null,
          isInterstitial: false
        };
      }
    }
  };

  const thoughts = [];
  const res = await waitForCloudflareVerification(mockPage, {
    maxWaitMs: 5000,
    pollIntervalMs: 100,
    allowClick: true,
    onThought: (msg, type) => {
      thoughts.push({ msg, type });
      console.log(`[Thought - ${type}]: ${msg}`);
    }
  });

  console.log('Verification result:', res);
  assert.strictEqual(res.verified, true, 'Should be verified');
  assert.strictEqual(res.token, '0.cf-token-verified-abcdef1234567890');
  assert(thoughts.some(t => t.msg.includes('spinner') || t.msg.includes('Turnstile')), 'Thoughts should capture spinner/turnstile');
  console.log('✓ Cloudflare patience & spinner polling tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
