/**
 * Vercel Serverless Function: Agent Input Response Endpoint
 * Receives human-in-the-loop input submissions from the frontend modal
 * and resolves pending credential/form completion steps.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, values, cancelled } = req.body || {};

  try {
    const { globalEventBus } = await import('../../src/backend/events/event-bus.js');
    globalEventBus.emitEvent('agent.input_received', {
      id,
      values,
      cancelled: Boolean(cancelled)
    });

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('[API input-response error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
