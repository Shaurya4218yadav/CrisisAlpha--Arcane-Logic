'use client';

// ============================================================
// CrisisAlpha — Main Page
// Full simulation interface layout
// ============================================================

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api } from '@/lib/api/client';
import ControlPanel from '@/components/controls/ControlPanel';
import EventFeed from '@/components/events/EventFeed';
import DecisionPanel from '@/components/decisions/DecisionPanel';
import SummaryBar from '@/components/summary/SummaryBar';
import ResultsDashboard from '@/components/summary/ResultsDashboard';

// Dynamic import for MapLibre (no SSR)
const SimulationMap = dynamic(
  () => import('@/components/map/SimulationMap'),
  { ssr: false }
);

export default function Home() {
  const { setGraph, setPresets, phase, nodes } = useScenarioStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        const [graphData, presetData] = await Promise.all([
          api.getGraph(),
          api.getPresets(),
        ]);
        setGraph(graphData.nodes, graphData.edges);
        setPresets(presetData.presets);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError('Failed to connect to CrisisAlpha backend. Make sure the server is running on port 3001.');
        setLoading(false);
      }
    }
    init();
  }, [setGraph, setPresets]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 bg-grid overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/5 glass-panel z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-cyan-500/20">
              Cα
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                CrisisAlpha
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                Crisis Simulation Engine
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 mx-6">
          <SummaryBar />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Controls */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-72 shrink-0 border-r border-white/5 glass-panel p-3 overflow-hidden"
        >
          <ControlPanel />
        </motion.aside>

        {/* Center — Map */}
        <main className="flex-1 relative">
          <SimulationMap />
        </main>

        {/* Right Panel — Events & Decisions */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 shrink-0 border-l border-white/5 glass-panel flex flex-col"
        >
          {/* Events */}
          <div className="flex-1 p-3 border-b border-white/5 overflow-hidden">
            <EventFeed />
          </div>
          {/* Decisions */}
          <div className="flex-1 p-3 overflow-hidden">
            <DecisionPanel />
          </div>
        </motion.aside>
      </div>

      {/* Results Overlay */}
      <ResultsDashboard />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 bg-grid">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-cyan-500/30"
        >
          Cα
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">CrisisAlpha</h2>
        <p className="text-sm text-slate-500">Initializing simulation engine...</p>
        <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 bg-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-3">Connection Error</h2>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
          <p className="text-xs text-slate-500 font-mono mb-2">Run the backend:</p>
          <code className="text-xs text-cyan-400 font-mono">
            cd backend && npm run dev
          </code>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-sm font-bold hover:bg-cyan-500/30 transition-all"
        >
          Retry Connection
        </button>
      </motion.div>
    </div>
  );
}
