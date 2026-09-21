import { useState, useEffect, useRef, useCallback } from 'react';

export function useAegisSocket() {
  const [connected, setConnected] = useState(false);
  const [agentState, setAgentState] = useState({
    status: 'idle',
    task: null,
    plan: null,
    currentAction: null,
    targetElement: null
  });
  const [screencastFrame, setScreencastFrame] = useState(null);
  const [mouse, setMouse] = useState({ x: 400, y: 300, state: 'idle' });
  const [clickPulses, setClickPulses] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState('openrouter');
  const [activeModel, setActiveModel] = useState('qwen/qwen3.8-27b:free');
  const [tools, setTools] = useState([]);
  const [events, setEvents] = useState([]);
  const [toolCalls, setToolCalls] = useState([]);
  const [domElements, setDomElements] = useState([]);
  const [a11yNodes, setA11yNodes] = useState([]);
  const [jevDecisions, setJevDecisions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [latestThought, setLatestThought] = useState(null);
  const [turboMode, setTurboMode] = useState(true);
  const [pendingInputRequest, setPendingInputRequest] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    // Resolve WebSocket URL: prefer explicit env var, fallback to local port 3001 on localhost
    const configuredWs = import.meta.env.VITE_BACKEND_WS_URL;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsUrl = configuredWs || (isLocalhost ? `ws://${window.location.hostname}:3001` : null);

    let ws = null;
    let reconnectTimer = null;

    if (!wsUrl) {
      // Running on Cloud (Vercel) without a dedicated persistent WebSocket server:
      // 1. Fetch system status and active models
      fetch('/api/health')
        .then(r => r.json())
        .then(data => {
          if (data.status === 'online') {
            setConnected(true);
            if (data.default_provider) setActiveProvider(data.default_provider);
            if (data.default_model) setActiveModel(data.default_model);
            if (data.tools) setTools(data.tools);
          }
        })
        .catch(() => {});

      // 2. Fetch initial browser canvas frame from serverless Chromium (avoiding Google datacenter block)
      fetch('/api/browser?url=https://html.duckduckgo.com')
        .then(r => r.json())
        .then(data => {
          if (data.frame) setScreencastFrame(data.frame);
          if (data.tabs) setTabs(data.tabs);
          if (data.domElements) setDomElements(data.domElements);
        })
        .catch((err) => {
          console.error('[Cloud Browser Init Error]:', err);
        });

      return;
    }

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log('[AEGIS WS] Connected to backend event stream:', wsUrl);
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleMessage(data);
          } catch (err) {
            console.error('[WS Parse Error]:', err);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const handleMessage = (data) => {
    switch (data.type) {
      case 'init_sync':
        setAgentState(data.payload.agent || {});
        setTabs(data.payload.tabs || []);
        setProviders(data.payload.providers || []);
        setActiveProvider(data.payload.activeProvider || 'openrouter');
        setActiveModel(data.payload.activeModel || 'qwen/qwen3.8-27b:free');
        setTools(data.payload.tools || []);
        setEvents(data.payload.history || []);
        if (data.payload.notes) setNotes(data.payload.notes);
        if (data.payload.turboMode !== undefined) setTurboMode(data.payload.turboMode);
        if (data.payload.agent?.latestThought) setLatestThought(data.payload.agent.latestThought);
        break;

      case 'screencast_frame':
        setScreencastFrame(data.payload.frame);
        break;

      case 'mouse_position':
        setMouse({ x: data.payload.x, y: data.payload.y, state: data.payload.state });
        break;

      case 'click_pulse':
        setClickPulses((prev) => [
          ...prev.slice(-10),
          { id: Date.now() + Math.random(), x: data.payload.x, y: data.payload.y }
        ]);
        break;

      case 'agent_state':
        setAgentState(data.payload);
        if (data.payload.latestThought) {
          setLatestThought(data.payload.latestThought);
        }
        if (data.payload.turboMode !== undefined) {
          setTurboMode(data.payload.turboMode);
        }
        break;

      case 'agent_thought':
        setLatestThought(data.payload);
        break;

      case 'note_created':
        setNotes((prev) => [data.payload, ...prev.filter(n => n.filename !== data.payload.filename)]);
        break;

      case 'turbo_status':
        setTurboMode(Boolean(data.payload.turboMode));
        break;

      case 'agent_input_required':
        setPendingInputRequest(data.payload);
        break;

      case 'event':
        const evt = data.payload;
        setEvents((prev) => [evt, ...prev.slice(0, 150)]);
        if (evt.type === 'agent.input_required') {
          setPendingInputRequest(evt.data || evt.payload);
        }

        // Filter into categorized panels
        if (evt.type.startsWith('tool.')) {
          setToolCalls((prev) => [evt, ...prev.slice(0, 50)]);
        }
        if (evt.type.startsWith('jev.')) {
          setJevDecisions((prev) => [evt, ...prev.slice(0, 50)]);
        }
        if (evt.type === 'agent.thought') {
          setLatestThought(evt.data || evt.payload);
        }
        if (evt.type === 'agent.note_created') {
          const note = evt.data || evt.payload;
          if (note) setNotes((prev) => [note, ...prev.filter(n => n.filename !== note.filename)]);
        }
        if (evt.type === 'browser.tab_created' || evt.type === 'browser.tab_switched' || evt.type === 'browser.tab_closed' || evt.type === 'browser.page_loaded') {
          // Fetch updated tabs
          fetch('/api/tabs').then(r => r.json()).then(d => setTabs(d.tabs)).catch(() => {});
        }
        break;

      case 'provider_changed':
        setActiveProvider(data.payload.activeProvider);
        setActiveModel(data.payload.activeModel);
        break;

      default:
        break;
    }
  };


  // Dispatch Actions
  const send = useCallback((action, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  }, []);

  const runTask = useCallback((task) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send('agent.run', { task });
    } else {
      // Cloud serverless mode: invoke /api/browser with task query
      setAgentState({
        status: 'executing',
        task,
        plan: [
          { id: 1, title: 'Initialize Cloud Chromium Session', status: 'completed' },
          { id: 2, title: `Execute Goal: "${task.slice(0, 35)}..."`, status: 'executing' },
          { id: 3, title: 'Render Live Page Surface', status: 'pending' }
        ],
        currentAction: `Executing task: ${task.slice(0, 45)}...`,
        targetElement: null
      });

      fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: task })
      })
        .then(r => r.json())
        .then(data => {
          if (data.frame) setScreencastFrame(data.frame);
          if (data.tabs) setTabs(data.tabs);
          if (data.domElements) setDomElements(data.domElements);
          if (data.toolCalls && data.toolCalls.length) {
            setToolCalls(prev => [...prev, ...data.toolCalls]);
          }
          if (data.notes && data.notes.length) {
            setNotes(prev => [...data.notes, ...prev]);
          }
          if (data.thought) {
            setLatestThought({ thought: data.thought, phase: data.phase || 'reasoning', timestamp: Date.now() });
          }
          setAgentState(prev => ({
            ...prev,
            status: 'completed',
            plan: data.plan || prev.plan?.map(p => ({ ...p, status: 'completed' })) || null,
            currentAction: {
              name: 'Task Complete',
              target: data.title || 'Target Reached',
              method: data.bot_status?.isBlocked ? 'Adaptive Stealth Pivot' : 'Aegis Browser Engine',
              status: 'completed'
            }
          }));
        })
        .catch(err => {
          console.error('[Cloud Run Task Error]:', err);
          setAgentState(prev => ({ ...prev, status: 'idle', currentAction: 'Cloud task finished' }));
        });
    }
  }, [send]);

  const stopAgent = useCallback(() => send('agent.stop'), [send]);
  const pauseAgent = useCallback(() => send('agent.pause'), [send]);
  const resumeAgent = useCallback(() => send('agent.resume'), [send]);

  const navigate = useCallback((url, tabId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send('browser.navigate', { url, tabId });
    } else {
      // Cloud serverless navigation
      setTabs(prev => prev.map(t => ({ ...t, loading: true, url })));
      fetch(`/api/browser?url=${encodeURIComponent(url)}`)
        .then(r => r.json())
        .then(data => {
          if (data.frame) setScreencastFrame(data.frame);
          if (data.tabs) setTabs(data.tabs);
          if (data.domElements) setDomElements(data.domElements);
        })
        .catch(err => {
          console.error('[Cloud Navigate Error]:', err);
          setTabs(prev => prev.map(t => ({ ...t, loading: false })));
        });
    }
  }, [send]);

  const newTab = useCallback((url) => send('browser.tab_new', { url }), [send]);
  const switchTab = useCallback((tabId) => send('browser.tab_switch', { tabId }), [send]);
  const closeTab = useCallback((tabId) => send('browser.tab_close', { tabId }), [send]);

  const manualClick = useCallback((x, y) => send('browser.manual_click', { x, y }), [send]);
  const manualType = useCallback((text) => send('browser.manual_type', { text }), [send]);
  const manualScroll = useCallback((direction, amount) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send('browser.manual_scroll', { direction, amount });
    } else {
      fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scroll' })
      })
        .then(r => r.json())
        .then(data => {
          if (data.frame) setScreencastFrame(data.frame);
        })
        .catch(() => {});
    }
  }, [send]);

  const selectProvider = useCallback(async (providerId, modelId) => {
    try {
      await fetch('/api/providers/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, modelId })
      });
      setActiveProvider(providerId);
      if (modelId) setActiveModel(modelId);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshDom = useCallback(async () => {
    try {
      const res = await fetch('/api/dom');
      const data = await res.json();
      setDomElements(data.elements || []);
    } catch {}
  }, []);

  const refreshA11y = useCallback(async () => {
    try {
      const res = await fetch('/api/a11y');
      const data = await res.json();
      setA11yNodes(data.nodes || []);
    } catch {}
  }, []);

  const toggleTurbo = useCallback(async (enabled) => {
    setTurboMode(enabled);
    send('engine.set_turbo', { enabled });
    try {
      await fetch('/api/engine/turbo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
    } catch {}
  }, [send]);

  const submitInputResponse = useCallback((id, values) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send('agent.input_response', { id, values });
    }
    fetch('/api/agent/input-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, values })
    }).catch(() => {});
    setPendingInputRequest(null);
  }, [send]);

  const cancelInputRequest = useCallback((id) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send('agent.input_response', { id, values: null, cancelled: true });
    }
    fetch('/api/agent/input-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, values: null, cancelled: true })
    }).catch(() => {});
    setPendingInputRequest(null);
  }, [send]);

  return {
    connected,
    agentState,
    screencastFrame,
    mouse,
    clickPulses,
    tabs,
    providers,
    activeProvider,
    activeModel,
    tools,
    events,
    toolCalls,
    domElements,
    a11yNodes,
    jevDecisions,
    notes,
    latestThought,
    turboMode,
    toggleTurbo,
    pendingInputRequest,
    submitInputResponse,
    cancelInputRequest,
    runTask,
    stopAgent,
    pauseAgent,
    resumeAgent,
    navigate,
    newTab,
    switchTab,
    closeTab,
    selectProvider,
    manualClick,
    manualType,
    manualScroll,
    refreshDom,
    refreshA11y
  };
}

