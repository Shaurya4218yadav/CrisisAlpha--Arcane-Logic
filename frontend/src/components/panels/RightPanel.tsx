'use client';

// ============================================================
// CrisisAlpha — Right Panel (Tabbed)
// Events, Decisions, Intel, and Logs in a tabbed layout
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import EventFeed from '@/components/events/EventFeed';
import DecisionPanel from '@/components/decisions/DecisionPanel';
import IntelFeed from '@/components/panels/IntelFeed';
import SimulationLogs from '@/components/panels/SimulationLogs';

type TabId = 'events' | 'decisions' | 'intel' | 'logs';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'events', label: 'Events', icon: '⚡' },
  { id: 'decisions', label: 'Actions', icon: '🎯' },
  { id: 'intel', label: 'Intel', icon: '📡' },
  { id: 'logs', label: 'Logs', icon: '📋' },
];

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('events');

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-white/5 shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-full"
                  transition={{ type: 'spring', duration: 0.3 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === 'events' && <EventFeed />}
        {activeTab === 'decisions' && <DecisionPanel />}
        {activeTab === 'intel' && <IntelFeed />}
        {activeTab === 'logs' && <SimulationLogs />}
      </div>
    </div>
  );
}
