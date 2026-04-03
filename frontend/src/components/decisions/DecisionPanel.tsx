'use client';

// ============================================================
// CrisisAlpha — Decision Panel
// Shows recommendations and lets user take actions
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api } from '@/lib/api/client';
import { Recommendation } from '@/types';
import { useState } from 'react';

const TYPE_ICONS: Record<string, string> = {
  reroute: '🔀',
  inventory_shift: '📦',
  pricing: '💰',
};

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  reroute: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  inventory_shift: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  pricing: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
};

export default function DecisionPanel() {
  const { recommendations, scenarioId, phase } = useScenarioStore();
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const handleApply = async (rec: Recommendation) => {
    if (!scenarioId || applied.has(rec.id)) return;
    setApplying(rec.id);
    try {
      await api.applyDecision(scenarioId, rec.id);
      setApplied((prev) => new Set(prev).add(rec.id));
    } catch (err) {
      console.error('Failed to apply decision:', err);
    }
    setApplying(null);
  };

  if (phase === 'setup') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-1 pb-2 border-b border-white/5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            Decisions
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-xs text-slate-500">
              Recommendations appear during simulation
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/5">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">
          Decisions
        </h3>
        {recommendations.length > 0 && (
          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
            {recommendations.length} available
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {recommendations.map((rec, i) => {
            const colors = TYPE_COLORS[rec.type] || TYPE_COLORS.reroute;
            const isApplied = applied.has(rec.id);
            const isApplying = applying === rec.id;

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05 }}
                className={`${colors.bg} border ${colors.border} rounded-xl p-3 transition-all ${
                  isApplied ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    {TYPE_ICONS[rec.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold ${colors.text}`}>
                      {rec.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                      {rec.description}
                    </p>

                    {/* Impact Metrics */}
                    <div className="flex gap-3 mt-2">
                      {rec.impact.riskReduction > 0 && (
                        <div className="text-[10px]">
                          <span className="text-slate-500">Risk </span>
                          <span className="text-emerald-400 font-bold">
                            -{(rec.impact.riskReduction * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {rec.impact.costIncrease > 0 && (
                        <div className="text-[10px]">
                          <span className="text-slate-500">Cost </span>
                          <span className="text-amber-400 font-bold">
                            +{(rec.impact.costIncrease * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {rec.impact.profitGain > 0 && (
                        <div className="text-[10px]">
                          <span className="text-slate-500">Profit </span>
                          <span className="text-cyan-400 font-bold">
                            +{(rec.impact.profitGain * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <motion.button
                  whileHover={{ scale: isApplied ? 1 : 1.02 }}
                  whileTap={{ scale: isApplied ? 1 : 0.98 }}
                  onClick={() => handleApply(rec)}
                  disabled={isApplied || isApplying}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isApplied
                      ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                      : isApplying
                      ? 'bg-white/10 text-white animate-pulse'
                      : `${colors.bg} ${colors.border} border ${colors.text} hover:brightness-125`
                  }`}
                >
                  {isApplied ? '✓ Applied' : isApplying ? 'Applying...' : 'Apply Decision'}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {recommendations.length === 0 && (
          <div className="text-center py-6">
            <div className="text-slate-500 text-xs">
              Analyzing network for opportunities...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
