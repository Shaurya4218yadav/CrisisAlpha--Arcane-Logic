'use client';

// ============================================================
// CrisisAlpha — Summary Bar
// Real-time metrics dashboard strip
// ============================================================

import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';

export default function SummaryBar() {
  const { score, currentTick, maxTicks, dayLabel, phase, events, nodes, edges } =
    useScenarioStore();

  const brokenNodes = nodes.filter((n) => n.status === 'broken').length;
  const riskyNodes = nodes.filter((n) => n.status === 'risky').length;
  const brokenEdges = edges.filter((e) => e.status === 'broken').length;

  const metrics = [
    {
      label: 'Day',
      value: phase === 'setup' ? '—' : `${currentTick}/${maxTicks}`,
      color: '#00F5D4',
      icon: '📅',
    },
    {
      label: 'Risk Avoided',
      value: `${score.riskAvoided}%`,
      color: score.riskAvoided > 70 ? '#10b981' : score.riskAvoided > 40 ? '#f59e0b' : '#ef4444',
      icon: '🛡️',
    },
    {
      label: 'Network',
      value: `${score.networkEfficiency}%`,
      color: score.networkEfficiency > 70 ? '#10b981' : score.networkEfficiency > 40 ? '#f59e0b' : '#ef4444',
      icon: '🌐',
    },
    {
      label: 'Profit',
      value: `${score.profitGained}`,
      color: '#00F5D4',
      icon: '💰',
    },
    {
      label: 'Failed Routes',
      value: `${score.routeFailures}`,
      color: score.routeFailures > 3 ? '#ef4444' : score.routeFailures > 0 ? '#f59e0b' : '#10b981',
      icon: '🚫',
    },
    {
      label: 'Demand',
      value: `${score.demandServed}%`,
      color: score.demandServed > 70 ? '#10b981' : '#f59e0b',
      icon: '📊',
    },
    {
      label: 'Events',
      value: `${events.length}`,
      color: '#00F5D4',
      icon: '⚡',
    },
    {
      label: 'At Risk',
      value: `${riskyNodes + brokenNodes}`,
      color: riskyNodes + brokenNodes > 3 ? '#ef4444' : '#f59e0b',
      icon: '📍',
    },
  ];

  return (
    <div className="flex items-center gap-1 h-full overflow-x-auto custom-scrollbar px-1">
      {phase !== 'setup' && (
        <div className="flex items-center gap-1 mr-2">
          <div
            className={`w-2 h-2 rounded-full ${
              phase === 'running'
                ? 'bg-emerald-400 animate-pulse'
                : phase === 'paused'
                ? 'bg-amber-400'
                : 'bg-blue-400'
            }`}
          />
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            {phase}
          </span>
        </div>
      )}

      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 shrink-0"
        >
          <span className="text-xs">{metric.icon}</span>
          <div>
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider leading-none">
              {metric.label}
            </div>
            <div
              className="text-sm font-bold tabular-nums leading-tight"
              style={{ color: metric.color }}
            >
              {metric.value}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Overall Score */}
      {phase !== 'setup' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg px-3 py-1.5 shrink-0 ml-auto"
        >
          <div>
            <div className="text-[9px] text-cyan-400/70 font-bold uppercase tracking-wider leading-none">
              Score
            </div>
            <div className="text-lg font-black text-cyan-400 tabular-nums leading-tight">
              {score.overallScore}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
