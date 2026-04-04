'use client';

// ============================================================
// CrisisAlpha — Right Panel (Tabbed)
// Events, Decisions, Intel, and Logs in a tabbed layout
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import ControlPanel from '@/components/controls/ControlPanel';
import EventFeed from '@/components/events/EventFeed';
import DecisionPanel from '@/components/decisions/DecisionPanel';
import IntelFeed from '@/components/panels/IntelFeed';
import { api, disconnectSocket } from '@/lib/api/client';

type TabId = 'events' | 'decisions' | 'alerts';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'events', label: 'Events', icon: '⚡' },
  { id: 'decisions', label: 'Actions', icon: '🎯' },
  { id: 'alerts', label: 'Alerts', icon: '⚠️' },
];

export default function RightPanel() {
  const { phase, setPhase, scenarioId, reset } = useScenarioStore();
  const [activeTab, setActiveTab] = useState<TabId>('events');

  const handlePause = async () => {
    if (!scenarioId) return;
    try {
      await api.pauseScenario(scenarioId);
    } catch {}
    setPhase('paused');
  };

  const handleResume = async () => {
    if (!scenarioId) return;
    try {
      await api.resumeScenario(scenarioId);
    } catch {}
    setPhase('running');
  };

  const handleReset = () => {
    disconnectSocket();
    reset();
  };

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {phase === 'setup' ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto custom-scrollbar p-4"
          >
            <ControlPanel />
          </motion.div>
        ) : (
          <motion.div
            key="running"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Tab Bar */}
            <div className="flex border-b border-white/5 shrink-0">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 flex items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'text-[#00F5D4] bg-white/5'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00F5D4] glow-accent"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}

              <div className="flex items-center ml-auto pr-2 gap-1">
                {phase === 'running' ? (
                  <button onClick={handlePause} className="w-6 h-6 rounded flex items-center justify-center text-warning hover:bg-warning/20 text-xs shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                    ⏸
                  </button>
                ) : (
                  <button onClick={handleResume} className="w-6 h-6 rounded flex items-center justify-center text-safe hover:bg-safe/20 text-xs shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    ▶
                  </button>
                )}
                <button onClick={handleReset} className="w-6 h-6 rounded flex items-center justify-center text-danger hover:bg-danger/20 text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden p-3 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-x-3 inset-y-3 overflow-hidden"
                >
                  {activeTab === 'events' && <EventFeed />}
                  {activeTab === 'decisions' && <DecisionPanel />}
                  {activeTab === 'alerts' && <IntelFeed />}
                </motion.div>
              </AnimatePresence>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Micro Legend */}
      <div className="border-t border-white/5 bg-slate-950/40 p-3 shrink-0 flex justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Safe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#eab308] shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Critical</span>
        </div>
      </div>
    </div>
  );
}
