'use client';

// ============================================================
// CrisisAlpha — Results Dashboard
// Final scoring and summary screen with charts
// ============================================================

import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';

export default function ResultsDashboard() {
  const { finalResult, score, events, phase } = useScenarioStore();

  if (phase !== 'completed' || !finalResult) return null;

  const labelColor =
    finalResult.label === 'Crisis Commander'
      ? '#10b981'
      : finalResult.label === 'Profit Maximizer'
      ? '#00F5D4'
      : finalResult.label === 'Operationally Resilient'
      ? '#00F5D4'
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <div className="text-4xl mb-3">🛡️</div>
            <div className="text-3xl font-black text-emerald-400 tabular-nums">{score.riskAvoided}%</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Risk Avoidance</div>
            <p className="text-xs text-slate-400 mt-3">Percentage of total risk potential mitigated through active decisions.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(0,245,212,0.1)]"
          >
            <div className="text-4xl mb-3">💰</div>
            <div className="text-3xl font-black text-[#00F5D4] tabular-nums">${score.profitGained}M</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Profit Impact</div>
            <p className="text-xs text-slate-400 mt-3">Estimated net profit impact from operational changes and routing.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(239,68,68,0.1)]"
          >
            <div className="text-4xl mb-3">🚫</div>
            <div className="text-3xl font-black text-red-400 tabular-nums">{score.routeFailures}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Failed Routes</div>
            <p className="text-xs text-slate-400 mt-3">Number of critical supply chain routes that collapsed during the crisis.</p>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {}}
            className="px-8 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-white/10 transition-all shadow-lg"
          >
            📊 View Detailed Analysis
          </button>
          <button
            onClick={() => useScenarioStore.getState().reset()}
            className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all"
          >
            🔄 Run New Simulation
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
