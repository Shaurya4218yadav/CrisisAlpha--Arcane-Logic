'use client';

// ============================================================
// CrisisAlpha — Results Dashboard
// Final scoring and summary screen with charts
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useScenarioStore } from '@/state/scenarioStore';
import { api } from '@/lib/api/client';

function Typewriter({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, 10);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <div className="font-mono text-emerald-400 group">
      {displayedText}
      <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse group-hover:bg-cyan-400 transition-colors duration-300"></span>
    </div>
  );
}

export default function ResultsDashboard() {
  const { finalResult, score, phase, aiSitRep, setAiSitRep, scenarioId } = useScenarioStore();
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (phase === 'completed' && scenarioId && !aiSitRep && !loadingAi) {
      const fetchAiSitRep = async () => {
        setLoadingAi(true);
        try {
          const { report } = await api.getAiSummary(scenarioId);
          setAiSitRep(report);
        } catch (err) {
          console.error('[Results] Failed to fetch AI SitRep:', err);
          setAiSitRep('The intelligence generation service is currently unavailable.');
        } finally {
          setLoadingAi(false);
        }
      };
      fetchAiSitRep();
    }
  }, [phase, scenarioId, aiSitRep, setAiSitRep, loadingAi]);

  if (phase !== 'completed' || !finalResult) return null;

  const radarData = [
    { metric: 'Risk Avoided', value: score.riskAvoided, fullMark: 100 },
    { metric: 'Profit', value: score.profitGained, fullMark: 100 },
    { metric: 'Network', value: score.networkEfficiency, fullMark: 100 },
    { metric: 'Demand', value: score.demandServed, fullMark: 100 },
    {
      metric: 'Stability',
      value: Math.max(0, 100 - score.routeFailures * 10),
      fullMark: 100,
    },
  ];

  const barData = [
    { name: 'Risk\nAvoided', value: score.riskAvoided, color: '#10b981' },
    { name: 'Profit\nGained', value: score.profitGained, color: '#38bdf8' },
    { name: 'Network\nEff.', value: score.networkEfficiency, color: '#a78bfa' },
    { name: 'Demand\nServed', value: score.demandServed, color: '#f59e0b' },
  ];

  const labelColor =
    finalResult.label === 'Crisis Commander'
      ? '#10b981'
      : finalResult.label === 'Profit Maximizer'
      ? '#38bdf8'
      : finalResult.label === 'Operationally Resilient'
      ? '#a78bfa'
      : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="bg-slate-900/95 border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            {finalResult.label === 'Crisis Commander' ? '🏆' : '📊'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black text-white mb-2"
          >
            Simulation Complete
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-bold"
            style={{ color: labelColor }}
          >
            {finalResult.label}
          </motion.div>
        </div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-36 h-36">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score.overallScore * 2.64} 264`}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-black text-white tabular-nums">
                {score.overallScore}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Score
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Events Triggered', value: finalResult.totalEvents, icon: '⚡', color: '#a78bfa' },
            { label: 'Decisions Made', value: finalResult.totalDecisions, icon: '🎯', color: '#38bdf8' },
            { label: 'Route Failures', value: score.routeFailures, icon: '🚫', color: '#ef4444' },
            { label: 'Demand Served', value: `${score.demandServed}%`, icon: '📊', color: '#10b981' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Radar */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Performance Radar
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Performance Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barCategoryGap="20%">
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI SitRep — Intelligence Briefing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-10 relative"
        >
          <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-900 border border-white/10 rounded-full z-10">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">
              Intelligence Briefing
            </span>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-6 pt-8 shadow-2xl overflow-hidden relative group">
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-scanline opacity-[0.03]" />
            
            {/* Corner Accents */}
            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20">
              <div className="absolute top-4 right-4 w-4 h-[1px] bg-cyan-400" />
              <div className="absolute top-4 right-4 w-[1px] h-4 bg-cyan-400" />
            </div>

            <div className="relative z-10 min-h-[100px] flex flex-col">
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 bg-cyan-500 rounded-full"
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Analyzing neural patterns...
                  </div>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-slate-300 leading-relaxed font-medium whitespace-pre-wrap selection:bg-cyan-500/30">
                    {aiSitRep ? <Typewriter text={aiSitRep} /> : 'No data available.'}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Secure Link Active
                </span>
              </div>
              <div className="text-[9px] font-mono text-slate-600">
                REF: ALPHA-SITREP-{scenarioId?.split('_')[1]?.toUpperCase() || 'UNKN'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Close */}
        <div className="text-center">
          <button
            onClick={() => useScenarioStore.getState().reset()}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            🔄 Run New Simulation
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
