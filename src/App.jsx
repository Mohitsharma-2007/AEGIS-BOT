import React, { useState } from 'react';
import { useAegisSocket } from './hooks/useAegisSocket.js';
import { Header } from './components/Header.jsx';
import { AegisSidebar } from './components/AegisSidebar.jsx';
import { BrowserControls } from './components/BrowserControls.jsx';
import { BrowserViewport } from './components/BrowserViewport.jsx';
import { AgentPlanCard } from './components/AgentPlanCard.jsx';
import { CurrentActionCard } from './components/CurrentActionCard.jsx';
import { ToolCallStream } from './components/ToolCallStream.jsx';
import { AgentNotesCard } from './components/AgentNotesCard.jsx';
import { AegisChatInput } from './components/AegisChatInput.jsx';
import { DevToolsDrawer } from './components/DevToolsDrawer.jsx';

export function App() {
  const {
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
  } = useAegisSocket();

  const [activeNavView, setActiveNavView] = useState('browser');
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  const isExecuting = agentState.status === 'executing' || agentState.status === 'planning';

  const handleNewTask = () => {
    stopAgent();
  };

  return (
    <div className="flex h-screen w-screen bg-aegis-bg text-aegis-text-primary overflow-hidden font-sans select-none">
      {/* 1. Left Collapsible AEGIS Sidebar */}
      <AegisSidebar
        activeView={activeNavView}
        onSelectView={(view) => {
          setActiveNavView(view);
          if (view === 'tools') setDevToolsOpen(true);
        }}
        onNewTask={handleNewTask}
        agentStatus={agentState.status}
        connected={connected}
        turboMode={turboMode}
        notesCount={notes.length}
      />

      {/* 2. Main Content Application Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Global Header */}
        <Header
          connected={connected}
          agentState={agentState}
          stopAgent={stopAgent}
          pauseAgent={pauseAgent}
          resumeAgent={resumeAgent}
          providers={providers}
          activeProvider={activeProvider}
          activeModel={activeModel}
          selectProvider={selectProvider}
          turboMode={turboMode}
          toggleTurbo={toggleTurbo}
        />

        {/* Browser Tab & Address Bar Controls */}
        <BrowserControls
          tabs={tabs}
          navigate={navigate}
          newTab={newTab}
          switchTab={switchTab}
          closeTab={closeTab}
        />

        {/* Main Workspace Layout (Browser Canvas + Right Agent Observability Suite) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Center: Real Chromium Browser Canvas with AI Reticle Cursor */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <BrowserViewport
              screencastFrame={screencastFrame}
              mouse={mouse}
              clickPulses={clickPulses}
              targetElement={agentState.targetElement}
              agentState={agentState}
              manualClick={manualClick}
              manualType={manualType}
              manualScroll={manualScroll}
            />

            {/* Premium Chat Input at bottom of Browser Canvas */}
            <AegisChatInput
              onSendMessage={runTask}
              isExecuting={isExecuting}
              onStopAgent={stopAgent}
              activeModel={activeModel}
              onToggleTools={() => setDevToolsOpen(prev => !prev)}
            />
          </div>

          {/* Right Agent Observability & Inspection Panel */}
          <aside
            className="w-[360px] xl:w-[410px] bg-aegis-secondary border-l border-aegis-border flex flex-col p-3 gap-3 overflow-y-auto shrink-0 [scrollbar-width:thin]"
            aria-label="Agent Activity and Plan"
          >
            {/* A. Current Action Card + Live ReAct Thought Bubble */}
            <CurrentActionCard
              currentAction={agentState.currentAction}
              targetElement={agentState.targetElement}
              agentStatus={agentState.status}
              latestThought={latestThought}
            />

            {/* B. Research & Notes Panel */}
            <AgentNotesCard notes={notes} />

            {/* C. Phased Execution Plan Checklist */}
            <AgentPlanCard
              plan={agentState.plan}
              task={agentState.task}
              status={agentState.status}
            />

            {/* D. Expandable Tool Call Stream */}
            <ToolCallStream toolCalls={toolCalls} />
          </aside>
        </div>

        {/* 3. Bottom Collapsible Developer Inspector (DOM, A11Y, TOOLS, EVENTS, NETWORK, CONSOLE) */}
        <DevToolsDrawer
          domElements={domElements}
          a11yNodes={a11yNodes}
          tools={tools}
          toolCalls={toolCalls}
          events={events}
          providers={providers}
          activeProvider={activeProvider}
          activeModel={activeModel}
          refreshDom={refreshDom}
          refreshA11y={refreshA11y}
        />
      </div>
    </div>
  );
}

export default App;
