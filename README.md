# AEGIS BOT — Phase 1: Visible AI Browser Environment

AEGIS BOT Phase 1 is a local-first AI browser agent workspace. When given a task, the user watches the actual Chromium browser execute actions in real time: navigating pages, extracting normalized DOM and accessibility trees, animating the cursor, highlighting target elements, typing, clicking, and streaming tool calls and execution plans live.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (.env)
The `.env` file is pre-configured with all your API keys:
- **OpenRouter** (Free default engine)
- **Groq** (Ultra-fast LPU engine)
- **Nvidia NIM** (GPU-accelerated models)
- **Conduit** (`https://conduit.ozdoev.net/v1`)
- **TokenHarbor** (`https://tokenharbor.ai/v1`)
- **Vercel AI Gateway & JEV System-One** (`vck_...`)
- **Bai & OpenCode** custom endpoints

### 3. Run AEGIS BOT
```bash
npm start
```
- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend WebSocket & REST API**: [http://localhost:3001](http://localhost:3001)

---

## Features

- **Real Chromium Viewport**: Live CDP screencast stream of genuine Chromium rendering (no mockups or static iframes).
- **Visible AEGIS Cursor**: Real-time cursor movement with coordinates, click pulses, and easing animations.
- **Dynamic Element Highlighting**: Animated bounding box halos on targeted DOM elements.
- **Full Browser Controls**: Multi-tab management, address bar, navigation history, and manual click/type passthrough.
- **Agent Plan Panel (PRD §23)**: User-facing task milestone checklist.
- **Current Action Card (PRD §24)**: Live action title, target element, and execution method.
- **Tool Call Inspector (PRD §25)**: Expandable inputs, outputs, duration, and error inspector.
- **Emergency STOP AGENT (PRD §32)**: Instantly halts the agent loop while preserving the browser state for manual takeover.
- **JEV System-One Decision Tools (madewithjev.com)**:
  - Element Judge: Calibrated confidence scoring for candidate elements.
  - Action Verifier: Validates whether actions achieved expected page outcomes.
  - Slop Detector: Identifies and dismisses clutter, cookie notices, and popup modals.
  - Skill Router: Sub-second tool dispatching.
- **20 Standardized Browser Tools (PRD §11 & §21)**: `browser.navigate`, `browser.back`, `browser.forward`, `browser.reload`, `browser.screenshot`, `browser.dom_extract`, `browser.accessibility_extract`, `browser.find_element`, `browser.move_mouse`, `browser.click`, `browser.type`, `browser.press`, `browser.scroll`, `browser.wait`, `browser.tabs.*`.
