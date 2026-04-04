'use client';

// ============================================================
// CrisisAlpha — Main Page
// Crisis Command Center layout with 3D Globe
// ============================================================

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { useFleetStore } from '@/state/useFleetStore';
import { api, connectTelematicsSocket } from '@/lib/api/client';
import ControlPanel from '@/components/controls/ControlPanel';
import RightPanel from '@/components/panels/RightPanel';
import SummaryBar from '@/components/summary/SummaryBar';
import ResultsDashboard from '@/components/summary/ResultsDashboard';
import ChatAssistant from '@/components/chat/ChatAssistant';
import PreSimulationModal from '@/components/modal/PreSimulationModal';
import EventToast from '@/components/globe/EventToast';
import LayerToggle, { ViewLayer } from '@/components/globe/LayerToggle';

// Dynamic import for Three.js Globe (no SSR)
const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView'),
  { ssr: false }
);

export default function Home() {
  const { setGraph, setPresets, phase, nodes } = useScenarioStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<ViewLayer>('risk');

  // Mobile drawer states
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showMobileData, setShowMobileData] = useState(false);

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
        console.log('[INIT] 🌍 Base Reality loaded straight from Neo4j Backend:', graphData.nodes.length, 'nodes');
        
        // Connect to tracking server
        connectTelematicsSocket((payload) => {
           useFleetStore.getState().setVehicles(payload);
        });

      } catch (err: any) {
        console.error('[INIT] ❌ Backend unavailable. Base Reality failed to load.', err);
        setError(err.message || 'Failed to connect to backend.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [setGraph, setPresets]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-slate-950 bg-grid overflow-hidden selection:bg-cyan-500/30">
      {/* Pre-Simulation Modal */}
      <PreSimulationModal />

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
                Crisis Command Center
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 mx-6">
          <SummaryBar />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel — Controls */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`absolute lg:relative flex flex-col z-40 top-0 bottom-0 left-0 w-[85vw] max-w-sm lg:w-72 shrink-0 border-r border-white/5 glass-panel transition-transform duration-300 ${
            showMobileControls ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex justify-between items-center p-3 border-b border-white/5 lg:hidden shrink-0">
             <h2 className="text-sm font-bold text-white uppercase tracking-wider">Controls</h2>
             <button onClick={() => setShowMobileControls(false)} className="text-slate-400 p-2 text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
            <ControlPanel />
          </div>
        </motion.aside>

        {/* Background Overlay for mobile panels */}
        {(showMobileControls || showMobileData) && (
          <div 
            className="absolute inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity" 
            onClick={() => { setShowMobileControls(false); setShowMobileData(false); }}
          />
        )}

        {/* Center — 3D Globe */}
        <main className="flex-1 relative w-full h-full">
          <GlobeView activeLayer={activeLayer} />
          <LayerToggle active={activeLayer} onChange={setActiveLayer} />
          <EventToast />
        </main>

        {/* Right Panel — Tabbed */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`absolute lg:relative flex flex-col z-40 top-0 bottom-0 right-0 w-[85vw] max-w-sm lg:w-80 shrink-0 border-l border-white/5 glass-panel transition-transform duration-300 ${
            showMobileData ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex justify-between items-center p-3 border-b border-white/5 lg:hidden shrink-0">
             <h2 className="text-sm font-bold text-white uppercase tracking-wider">Data Console</h2>
             <button onClick={() => setShowMobileData(false)} className="text-slate-400 p-2 text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <RightPanel />
          </div>
        </motion.aside>

        {/* Mobile Navigation Bar */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 lg:hidden glass-panel px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl shadow-black/60 scale-110 sm:scale-100">
           <button 
             onClick={() => { setShowMobileControls(true); setShowMobileData(false); }}
             className="flex flex-col items-center gap-1 text-cyan-400 hover:text-cyan-300 p-2 w-16"
           >
             <span className="text-2xl">🎛️</span>
             <span className="text-[10px] uppercase font-bold tracking-wider">Controls</span>
           </button>
           <div className="w-px h-8 bg-white/10" />
           <button 
             onClick={() => { setShowMobileData(true); setShowMobileControls(false); }}
             className="flex flex-col items-center gap-1 text-violet-400 hover:text-violet-300 p-2 w-16"
           >
             <span className="text-2xl">📊</span>
             <span className="text-[10px] uppercase font-bold tracking-wider">Data</span>
           </button>
        </div>
      </div>

      {/* Results Overlay */}
      <ResultsDashboard />

      {/* Chat Assistant */}
      <ChatAssistant />
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
        <p className="text-sm text-slate-500">Initializing command center...</p>
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
