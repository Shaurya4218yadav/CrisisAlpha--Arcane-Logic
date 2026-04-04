'use client';

// ============================================================
// CrisisAlpha — Intel Feed
// Mock news/intelligence items during simulation
// ============================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { SimulationEvent } from '@/types';

interface IntelItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  category: 'political' | 'economic' | 'logistics' | 'weather';
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  political: { bg: 'bg-red-500/10', text: 'text-red-400' },
  economic: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  logistics: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  weather: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

const CATEGORY_ICONS: Record<string, string> = {
  political: '🏛️',
  economic: '📈',
  logistics: '🚢',
  weather: '🌊',
};

// Mock intel data generated from simulation context
function generateIntel(
  currentTick: number,
  industry: string,
  nodesAtRisk: number
): IntelItem[] {
  const items: IntelItem[] = [
    {
      id: 'intel-1',
      source: 'Reuters',
      title: 'Trade tensions escalate in key shipping corridors',
      summary:
        'Multiple nations implementing new inspection protocols at major ports, causing throughput delays of 15-20%.',
      category: 'political',
      timestamp: '2 min ago',
    },
    {
      id: 'intel-2',
      source: 'Bloomberg',
      title: `${industry} sector faces supply chain headwinds`,
      summary:
        'Industry analysts project 12% cost increase for alternative routing strategies amid current disruptions.',
      category: 'economic',
      timestamp: '8 min ago',
    },
    {
      id: 'intel-3',
      source: 'MarineTraffic',
      title: 'Vessel congestion reported at 3 major hubs',
      summary:
        'Average wait times increased to 4.2 days. Container spot rates up 23% week-over-week.',
      category: 'logistics',
      timestamp: '15 min ago',
    },
    {
      id: 'intel-4',
      source: 'NOAA',
      title: 'Severe weather advisory — Indian Ocean',
      summary:
        'Tropical depression forming may impact sea routes through Strait of Malacca within 72 hours.',
      category: 'weather',
      timestamp: '22 min ago',
    },
    {
      id: 'intel-5',
      source: 'GDELT',
      title: 'Policy shift detected — EU tariff adjustments',
      summary:
        'Emergency session called to review import duties on critical materials. Decision expected within 48 hours.',
      category: 'political',
      timestamp: '30 min ago',
    },
    {
      id: 'intel-6',
      source: 'Spire Maritime',
      title: `${nodesAtRisk} nodes flagged in risk assessment`,
      summary:
        'Automated monitoring detected elevated risk propagation through secondary trade corridors.',
      category: 'logistics',
      timestamp: '45 min ago',
    },
  ];

  // Return items based on simulation progress
  const visibleCount = Math.min(items.length, Math.max(2, currentTick + 1));
  return items.slice(0, visibleCount);
}

export default function IntelFeed() {
  const { currentTick, config, nodes, phase, baseRealityEvents } = useScenarioStore();
  const [activeTab, setActiveTab] = useState<'live' | 'sim'>('live');

  const nodesAtRisk = nodes.filter(
    (n) => n.status === 'risky' || n.status === 'broken'
  ).length;

  const simIntel = useMemo(
    () => generateIntel(currentTick, config.industry, nodesAtRisk),
    [currentTick, config.industry, nodesAtRisk]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-white/5 mb-2 shrink-0">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'live'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'live' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
            Live Reality
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sim')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'sim'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Simulator
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-2">
        <AnimatePresence mode="popLayout">
          {activeTab === 'sim' && phase === 'setup' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="text-2xl mb-2">📡</div>
              <div className="text-xs text-slate-500">
                Simulation inactive. Select a scenario to start forecasting.
              </div>
            </motion.div>
          ) : activeTab === 'sim' ? (
            simIntel.map((item, i) => {
              const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.economic;
              const icon = CATEGORY_ICONS[item.category] || '📡';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{item.source}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{item.category}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white leading-snug">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.summary}</p>
                      <div className="text-[9px] text-slate-600 mt-1">{item.timestamp}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            /* Live Tab */
            baseRealityEvents.length === 0 ? (
               <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <div className="text-2xl mb-2 animate-pulse">🛰️</div>
                <div className="text-xs text-slate-500">
                  Listening for real-world anomalies...
                </div>
              </motion.div>
            ) : (
              baseRealityEvents.map((evt, i) => {
                // Determine icon mapping safely
                const mapType = evt.type === 'weather' ? 'weather' : evt.type === 'geopolitical' ? 'political' : 'logistics';
                const colors = CATEGORY_COLORS[mapType] || CATEGORY_COLORS.logistics;
                const icon = CATEGORY_ICONS[mapType] || '🚢';

                return (
                  <motion.div
                    key={evt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.05 }}
                    className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 transition-all cursor-pointer relative overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <div className="flex items-start gap-2 relative z-10">
                      <span className="text-sm mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">OSINT ALERT</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{mapType}</span>
                             {evt.severity === 'high' && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse`}>CRITICAL</span>
                             )}
                          </div>
                          <span className="text-[9px] text-slate-600">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-white leading-snug">{evt.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{evt.message}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
