/**
 * AEGIS Human Cursor Physics Engine
 * Generates natural, human-like curved mouse trajectories using Cubic Bezier curves,
 * randomized perpendicular control points, physiological micro-jitter, and Fitts's Law velocity profiles.
 * Eliminates straight-line bot detection triggers on Cloudflare Turnstile, reCAPTCHA, and bot walls.
 */

/**
 * Calculates a point on a cubic Bezier curve at parameter t (0 <= t <= 1)
 */
function cubicBezier(p0, p1, p2, p3, t) {
  const cx = 3 * (p1.x - p0.x);
  const bx = 3 * (p2.x - p1.x) - cx;
  const ax = p3.x - p0.x - cx - bx;

  const cy = 3 * (p1.y - p0.y);
  const by = 3 * (p2.y - p1.y) - cy;
  const ay = p3.y - p0.y - cy - by;

  const xt = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
  const yt = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;

  return { x: xt, y: yt };
}

/**
 * Computes human-like randomized control points for a cubic Bezier curve
 */
function generateControlPoints(p0, p3) {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector
  const nx = -dy / (distance || 1);
  const ny = dx / (distance || 1);

  // Random deviation magnitude proportional to distance (arc deviation)
  const maxOffset = Math.min(180, Math.max(25, distance * 0.35));
  const sign = Math.random() < 0.5 ? -1 : 1;
  const offset1 = sign * (Math.random() * 0.7 + 0.3) * maxOffset;
  const offset2 = sign * (Math.random() * 0.6 + 0.2) * maxOffset * 0.8;

  // Control points at roughly 1/3 and 2/3 along the chord with random spread
  const p1 = {
    x: p0.x + dx * (0.25 + Math.random() * 0.2) + nx * offset1,
    y: p0.y + dy * (0.25 + Math.random() * 0.2) + ny * offset1
  };

  const p2 = {
    x: p0.x + dx * (0.6 + Math.random() * 0.2) + nx * offset2,
    y: p0.y + dy * (0.6 + Math.random() * 0.2) + ny * offset2
  };

  return { p1, p2 };
}

/**
 * Generates an array of intermediate coordinates simulating human hand movement
 */
export function generateHumanPath(startX, startY, targetX, targetY, options = {}) {
  const p0 = { x: startX, y: startY };
  const p3 = { x: targetX, y: targetY };

  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 3) {
    return [{ x: targetX, y: targetY, delay: 10 }];
  }

  // Determine step count based on distance and speed (Fitts's Law principle)
  const baseSteps = Math.max(12, Math.min(45, Math.floor(distance / 16)));
  const steps = options.steps || baseSteps;

  const { p1, p2 } = generateControlPoints(p0, p3);
  const path = [];

  // Realistic human overshoot occasionally for authentic hand physics
  const allowOvershoot = options.overshoot !== false && distance > 120 && Math.random() < 0.45;
  const overshootAmount = allowOvershoot ? Math.random() * 8 + 3 : 0;
  const overshootTarget = allowOvershoot
    ? {
        x: p3.x + (dx / distance) * overshootAmount,
        y: p3.y + (dy / distance) * overshootAmount
      }
    : p3;

  for (let i = 1; i <= steps; i++) {
    const rawT = i / steps;

    // S-curve velocity profile (slow start, fast cruise, slow precision landing)
    let t = rawT < 0.5
      ? 4 * Math.pow(rawT, 3)
      : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    const currentDest = allowOvershoot && i < steps * 0.85 ? overshootTarget : p3;
    const pt = cubicBezier(p0, p1, p2, currentDest, t);

    // Physiological micro-tremor (small random jitter that decreases near landing)
    const jitterFactor = (1 - rawT) * 1.5;
    const jitterX = (Math.random() - 0.5) * jitterFactor;
    const jitterY = (Math.random() - 0.5) * jitterFactor;

    // Human inter-step timing variation
    const baseDelay = Math.max(6, Math.min(22, Math.floor(180 / steps)));
    const randomDelay = baseDelay + Math.floor((Math.random() - 0.5) * 6);

    path.push({
      x: Math.round(pt.x + jitterX),
      y: Math.round(pt.y + jitterY),
      delay: Math.max(4, randomDelay)
    });
  }

  // Ensure exact final coordinates
  path.push({ x: targetX, y: targetY, delay: 15 });
  return path;
}

/**
 * Moves mouse along a human trajectory on a Playwright Page instance
 */
export async function humanMoveMouse(page, startX, startY, targetX, targetY, onStep = null) {
  if (!page) return { x: targetX, y: targetY };

  const path = generateHumanPath(startX, startY, targetX, targetY);

  for (const pt of path) {
    await page.mouse.move(pt.x, pt.y).catch(() => {});
    if (typeof onStep === 'function') {
      onStep(pt.x, pt.y);
    }
    await new Promise(r => setTimeout(r, pt.delay));
  }

  return { x: targetX, y: targetY };
}

/**
 * Executes a human click with natural curved movement, dwell pause, and hold duration
 */
export async function humanClick(page, startPos, targetX, targetY, options = {}, onStep = null) {
  if (!page) throw new Error('No active page for human click');

  const curX = startPos ? startPos.x : 400;
  const curY = startPos ? startPos.y : 300;

  // 1. Natural curved trajectory movement
  await humanMoveMouse(page, curX, curY, targetX, targetY, onStep);

  // 2. Pre-click human dwell time (80ms - 180ms)
  const preClickDwell = Math.floor(Math.random() * 100) + 80;
  await new Promise(r => setTimeout(r, preClickDwell));

  // 3. Mouse down with human hold duration (40ms - 95ms)
  const holdDuration = Math.floor(Math.random() * 55) + 40;
  await page.mouse.down({ button: options.button || 'left' });
  await new Promise(r => setTimeout(r, holdDuration));
  await page.mouse.up({ button: options.button || 'left' });

  // 4. Post-click human settling delay
  const postClickDwell = Math.floor(Math.random() * 80) + 60;
  await new Promise(r => setTimeout(r, postClickDwell));

  return { x: targetX, y: targetY };
}
