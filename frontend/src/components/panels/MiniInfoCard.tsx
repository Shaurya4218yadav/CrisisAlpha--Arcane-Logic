'use client';

import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';

export default function MiniInfoCard() {
  const { nodes, selectedNodeId, config } = useScenarioStore();
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  if (!selectedNode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: -20, y: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute top-6 left-6 z-50 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] pointer-events-auto"
    >
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Region</div>
          <div className="text-sm font-black text-white">{selectedNode.name}</div>
        </div>
        <div className="w-full h-px bg-white/10 my-1" />
        <div className="flex gap-6">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Industry</div>
            <div className="text-xs text-[#00F5D4] font-medium">{config.industry}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Risk</div>
            <div className="text-xs text-[#ef4444] font-medium">{(selectedNode.riskScore * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
