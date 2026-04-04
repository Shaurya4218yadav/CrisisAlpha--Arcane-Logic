'use client';

// ============================================================
// CrisisAlpha — Main Page
// Crisis Command Center layout with 3D Globe
// ============================================================

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api } from '@/lib/api/client';
import { getMockGraphData, getMockPresets } from '@/lib/mock/simulationData';
import RightPanel from '@/components/panels/RightPanel';
import MiniInfoCard from '@/components/panels/MiniInfoCard';
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
        console.log('[INIT] Loaded data from backend');
      } catch (err) {
        console.warn('[INIT] Backend unavailable, loading mock data:', err);
        // Fallback to mock data — app remains fully functional
        const mockGraph = getMockGraphData();
        const mockPresets = getMockPresets();
        setGraph(mockGraph.nodes, mockGraph.edges);
        setPresets(mockPresets.presets);
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingScreen />;
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
      <div className="flex-1 flex overflow-hidden relative group">
        <div className="absolute inset-0 vignette-overlay z-0" />
        
        {/* Floating Mini Info Card */}
        {phase === 'setup' && useScenarioStore.getState().config.originNodeId && (
          <MiniInfoCard />
        )}

        {/* Background Overlay for mobile panels */}
        {(showMobileData || showMobileControls) && (
          <div 
            className="absolute inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity" 
            onClick={() => { setShowMobileData(false); setShowMobileControls(false); }}
          />
        )}

        {/* Center — 3D Globe */}
        <main className="flex-1 relative w-full h-full lg:h-auto z-10">
          <GlobeView activeLayer={activeLayer} />
          <LayerToggle active={activeLayer} onChange={setActiveLayer} />
          <EventToast />
          
          {/* Center Instruction */}
          {phase === 'setup' && (
             <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={useScenarioStore.getState().selectedNodeId ? { opacity: 0 } : { opacity: 1, y: 0 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500"
             >
                <div className="glass-panel px-3 py-1.5 rounded-full border border-white/5 flex items-center justify-center gap-2 opacity-40">
                   <span className="text-slate-400 font-medium tracking-widest text-[10px] uppercase">
                     Click a region to begin simulation
                   </span>
                </div>
             </motion.div>
          )}
        </main>

        {/* Right Panel — Content */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`absolute lg:relative flex z-40 top-0 bottom-0 right-0 h-full shrink-0 transition-transform duration-300 ${
            showMobileData ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div 
            className="h-full w-[85vw] max-w-sm lg:w-[260px] bg-slate-950/90 lg:bg-transparent backdrop-blur-xl border-l border-primary/10 shadow-[-5px_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-3 border-b border-white/5 lg:hidden shrink-0">
               <h2 className="text-sm font-bold text-white uppercase tracking-wider">Console Data</h2>
               <button onClick={() => setShowMobileData(false)} className="text-slate-400 p-2 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 w-full h-full overflow-hidden relative">
              <RightPanel />
            </div>
          </div>
        </motion.aside>

        {/* Mobile Navigation Bar */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center z-10 lg:hidden glass-panel px-5 py-2.5 rounded-2xl border border-[#00F5D4]/20 shadow-[-5px_0_30px_rgba(0,0,0,0.5)] scale-110 sm:scale-100">
           <button 
             onClick={() => { setShowMobileControls(true); setShowMobileData(false); }}
             className="flex flex-col items-center gap-1 text-[#00F5D4] hover:text-[#00F5D4] p-2 min-w-[80px]"
           >
             <span className="text-2xl">⚡</span>
             <span className="text-[10px] uppercase font-bold tracking-wider">Command</span>
           </button>
           <div className="w-px h-8 bg-[#00F5D4]/20" />
           <button 
             onClick={() => { setShowMobileControls(false); setShowMobileData(true); }}
             className="flex flex-col items-center gap-1 text-[#00F5D4] hover:text-[#00F5D4] p-2 min-w-[80px]"
           >
             <span className="text-2xl">🎛️</span>
             <span className="text-[10px] uppercase font-bold tracking-wider">Console</span>
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
