import { globalModelRouter } from '../providers/router.js';

/**
 * Decomposes a user task into a structured execution plan checklist.
 */
export async function generateTaskPlan(taskDescription, currentUrl = '') {
  const prompt = `You are the AEGIS BOT Execution Planner.
Given a user browser task, create a concise, user-facing checklist of 4 to 6 logical milestone steps.

TASK: "${taskDescription}"
STARTING URL: "${currentUrl}"

Guidelines:
- Each step should be actionable and short (under 7 words).
- If the task asks to search, find top items, read information, or create notes, create steps specifically reflecting those milestones.
- Focus on user-visible milestones (e.g. "Analyze search intent", "Search GitHub for topic", "Identify top-starred repo", "Read documentation", "Generate research note").

Respond with STRICT JSON:
{
  "title": "Short task title",
  "steps": [
    { "id": "step-1", "title": "Step title", "target": "Target description" }
  ]
}`;

  try {
    const res = await globalModelRouter.chat([
      { role: 'system', content: 'You are an execution planner. Output only JSON.' },
      { role: 'user', content: prompt }
    ], {
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      timeoutMs: 2500,
      temperature: 0.1
    });

    const clean = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      title: parsed.title || taskDescription,
      steps: (parsed.steps || []).map((s, idx) => ({
        id: s.id || `step-${idx + 1}`,
        title: s.title,
        target: s.target || '',
        status: idx === 0 ? 'executing' : 'pending'
      }))
    };
  } catch (err) {
    console.warn('[Planner Warning, using template plan]:', err.message);
    const taskLower = taskDescription.toLowerCase();
    const isGithub = taskLower.includes('github');
    const isNote = taskLower.includes('note') || taskLower.includes('save') || taskLower.includes('information');

    if (isGithub && isNote) {
      return {
        title: 'GitHub Research & Note Compilation',
        steps: [
          { id: 'step-1', title: 'Parse search query & intent', target: 'Task parameters', status: 'executing' },
          { id: 'step-2', title: 'Search GitHub (sorted by stars)', target: 'GitHub Search', status: 'pending' },
          { id: 'step-3', title: 'Rank & find #1 highest star repo', target: 'Repository ranking', status: 'pending' },
          { id: 'step-4', title: 'Open & read repo documentation', target: 'Repository README', status: 'pending' },
          { id: 'step-5', title: 'Create and save research note', target: 'AEGIS Notes', status: 'pending' }
        ]
      };
    }

    const isSearch = taskLower.includes('search') || taskLower.includes('find');
    const targetSite = taskLower.includes('amazon') ? 'Amazon' :
                       taskLower.includes('github') ? 'GitHub' :
                       taskLower.includes('wikipedia') ? 'Wikipedia' : 'Target website';

    return {
      title: taskDescription,
      steps: [
        { id: 'step-1', title: `Navigate to ${targetSite}`, target: targetSite, status: 'executing' },
        { id: 'step-2', title: 'Locate target input / element', target: 'Interactive element', status: 'pending' },
        { id: 'step-3', title: isSearch ? 'Execute targeted search' : 'Perform action', target: 'Query execution', status: 'pending' },
        { id: 'step-4', title: 'Verify & inspect results', target: 'Results container', status: 'pending' },
        { id: 'step-5', title: 'Extract final insights', target: 'Page data', status: 'pending' }
      ]
    };
  }
}

