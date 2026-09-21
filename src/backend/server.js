import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { globalEventBus } from './events/event-bus.js';
import { BrowserSessionManager } from './browser/session-manager.js';
import { registerBrowserTools } from './tools/browser-tools.js';
import { globalToolRegistry } from './tools/registry.js';
import { globalModelRouter } from './providers/router.js';
import { AgentController } from './agent/controller.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = parseInt(process.env.PORT, 10) || 3001;

app.use(cors());
app.use(express.json());

// Initialize Core Singletons
const sessionManager = new BrowserSessionManager();
registerBrowserTools(sessionManager);
const agentController = new AgentController(sessionManager);

const NOTES_DIR = 'd:\\Aegis BOT\\notes';
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

function getNotesList() {
  if (!fs.existsSync(NOTES_DIR)) return [];
  try {
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
    const list = [];
    for (const file of files) {
      try {
        const fullPath = path.join(NOTES_DIR, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const repoMatch = content.match(/\*\*Repository\*\*:\s*\[(.*?)\]\((.*?)\)/);
        const starsMatch = content.match(/\*\*Stars\*\*:\s*⭐\s*(.+)/);
        list.push({
          id: file.replace('.md', ''),
          filename: file,
          filepath: fullPath,
          title: titleMatch ? titleMatch[1] : file,
          repo_url: repoMatch ? repoMatch[2] : null,
          stars: starsMatch ? starsMatch[1].trim() : null,
          markdown: content,
          timestamp: fs.statSync(fullPath).mtime.toISOString()
        });
      } catch {}
    }
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [];
  }
}

// ==========================================
// WebSocket Client Management
// ==========================================
const clients = new Set();

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total clients: ${clients.size}`);

  // Send initial state sync
  ws.send(JSON.stringify({
    type: 'init_sync',
    payload: {
      agent: agentController.getState(),
      tabs: sessionManager.listTabs(),
      providers: globalModelRouter.getProviders(),
      activeProvider: globalModelRouter.activeProviderId,
      activeModel: globalModelRouter.activeModelId,
      tools: globalToolRegistry.list(),
      history: globalEventBus.getHistory(50),
      turboMode: sessionManager.turboMode,
      notes: getNotesList()
    }
  }));

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      switch (data.action) {
        case 'agent.run':
          await agentController.runTask(data.task).catch(e => console.warn('runTask error:', e.message));
          break;
        case 'agent.stop':
          agentController.stop();
          break;
        case 'agent.pause':
          agentController.pause();
          break;
        case 'agent.resume':
          agentController.resume();
          break;
        case 'engine.set_turbo':
          await sessionManager.setTurboMode(data.enabled);
          broadcast('turbo_status', { turboMode: sessionManager.turboMode });
          break;
        case 'browser.navigate':
          await sessionManager.navigateTab(data.tabId, data.url).catch(e => console.warn('navigate error:', e.message));
          break;
        case 'browser.tab_new':
          await sessionManager.createTab(data.url).catch(e => console.warn('createTab error:', e.message));
          break;
        case 'browser.tab_switch':
          await sessionManager.switchTab(data.tabId).catch(e => console.warn('switchTab error:', e.message));
          break;
        case 'browser.tab_close':
          await sessionManager.closeTab(data.tabId).catch(e => console.warn('closeTab error:', e.message));
          break;
        case 'browser.manual_click':
          await sessionManager.click(data.x, data.y).catch(e => console.warn('click error:', e.message));
          break;
        case 'browser.manual_type':
          await sessionManager.typeText(data.text).catch(e => console.warn('type error:', e.message));
          break;
        case 'browser.manual_scroll':
          await sessionManager.scroll(data.direction, data.amount).catch(e => console.warn('scroll error:', e.message));
          break;
        case 'agent.input_response':
          agentController.handleInputResponse(data.id, data.values, data.cancelled);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[WS Message Error]:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Remaining: ${clients.size}`);
  });
});

// Relay EventBus events to connected WebSocket clients
globalEventBus.on('event', (evt) => {
  broadcast('event', evt);
});

globalEventBus.on('screencast.frame', (frameData) => {
  broadcast('screencast_frame', frameData);
});

globalEventBus.on('mouse.position', (pos) => {
  broadcast('mouse_position', pos);
});

globalEventBus.on('mouse.click_indicator', (pos) => {
  broadcast('click_pulse', pos);
});

globalEventBus.on('agent.state_update', (state) => {
  broadcast('agent_state', state);
});

globalEventBus.on('agent.thought', (thought) => {
  broadcast('agent_thought', thought);
});

globalEventBus.on('agent.note_created', (note) => {
  broadcast('note_created', note);
});

globalEventBus.on('browser.turbo_changed', (status) => {
  broadcast('turbo_status', status);
});


// ==========================================
// REST API Routes
// ==========================================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    session_id: sessionManager.sessionId,
    agent: agentController.getState(),
    tabs: sessionManager.listTabs(),
    viewport: sessionManager.viewport
  });
});

app.get('/api/providers', (req, res) => {
  res.json({
    providers: globalModelRouter.getProviders(),
    activeProvider: globalModelRouter.activeProviderId,
    activeModel: globalModelRouter.activeModelId,
    stats: globalModelRouter.stats
  });
});

app.post('/api/providers/select', (req, res) => {
  const { providerId, modelId } = req.body;
  globalModelRouter.setActive(providerId, modelId);
  broadcast('provider_changed', {
    activeProvider: globalModelRouter.activeProviderId,
    activeModel: globalModelRouter.activeModelId
  });
  res.json({ success: true, activeProvider: globalModelRouter.activeProviderId, activeModel: globalModelRouter.activeModelId });
});

app.get('/api/tools', (req, res) => {
  res.json({ tools: globalToolRegistry.list() });
});

app.get('/api/tabs', (req, res) => {
  res.json({ tabs: sessionManager.listTabs() });
});

app.post('/api/tabs/new', async (req, res) => {
  const tab = await sessionManager.createTab(req.body.url);
  res.json({ success: true, tab });
});

app.post('/api/tabs/switch', async (req, res) => {
  const tab = await sessionManager.switchTab(req.body.tabId);
  res.json({ success: true, tab });
});

app.post('/api/tabs/close', async (req, res) => {
  const success = await sessionManager.closeTab(req.body.tabId);
  res.json({ success });
});

app.post('/api/browser/navigate', async (req, res) => {
  const result = await sessionManager.navigateTab(req.body.tabId, req.body.url);
  res.json(result);
});

app.get('/api/dom', async (req, res) => {
  const elements = await sessionManager.getDomExtract();
  res.json({ count: elements.length, elements });
});

app.get('/api/a11y', async (req, res) => {
  const nodes = await sessionManager.getA11yExtract();
  res.json({ count: nodes.length, nodes });
});

app.post('/api/agent/run', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task is required' });
  // Run asynchronously in background
  agentController.runTask(task);
  res.json({ success: true, task, status: agentController.status });
});

app.post('/api/agent/stop', (req, res) => {
  agentController.stop();
  res.json({ success: true, status: agentController.status });
});

app.post('/api/agent/pause', (req, res) => {
  agentController.pause();
  res.json({ success: true, status: agentController.status });
});

app.post('/api/agent/resume', (req, res) => {
  agentController.resume();
  res.json({ success: true, status: agentController.status });
});

app.post('/api/agent/input-response', (req, res) => {
  const { id, values, cancelled } = req.body || {};
  const handled = agentController.handleInputResponse(id, values, cancelled);
  res.json({ success: handled });
});

app.get('/api/events', (req, res) => {
  res.json({ events: globalEventBus.getHistory(req.query.limit || 100) });
});

app.get('/api/notes', (req, res) => {
  res.json({ notes: getNotesList() });
});

app.get('/api/engine/turbo', (req, res) => {
  res.json({ turboMode: sessionManager.turboMode });
});

app.post('/api/engine/turbo', async (req, res) => {
  const result = await sessionManager.setTurboMode(req.body.enabled);
  broadcast('turbo_status', result);
  res.json({ success: true, ...result });
});


// Start Server
async function start() {
  await sessionManager.initialize();
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🛡️  AEGIS BOT Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
    console.log(`🌐 Model Router active: ${globalModelRouter.activeProviderId} (${globalModelRouter.activeModelId})`);
    console.log(`======================================================\n`);
  });
}

// Graceful teardown
process.on('SIGINT', async () => {
  console.log('\n[AEGIS] Shutting down browser & server...');
  await sessionManager.close();
  process.exit(0);
});

start().catch(err => {
  console.error('[AEGIS Startup Fatal Error]:', err);
  process.exit(1);
});
