'use client';

// ============================================================
// CrisisAlpha — Layer Toggle
// Overlay mode selector for the globe view
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';

export type ViewLayer = 'risk' | 'weather' | 'traffic' | 'demand';

const LAYERS: { id: ViewLayer; label: string; icon: string; color: string }[] = [
  { id: 'risk', label: 'Risk', icon: '🎯', color: '#ef4444' },
  { id: 'weather', label: 'Weather', icon: '🌦️', color: '#38bdf8' },
  { id: 'traffic', label: 'Traffic', icon: '🚢', color: '#00F5D4' },
  { id: 'demand', label: 'Demand', icon: '📊', color: '#10b981' },
];

export default function LayerToggle({
  active,
  onChange,
}: {
  active: ViewLayer;
  onChange: (layer: ViewLayer) => void;
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full px-1.5 py-1">
        {LAYERS.map((layer) => {
          const isActive = active === layer.id;
          return (
            <motion.button
              key={layer.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(layer.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="layer-active"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `${layer.color}20`,
                    border: `1px solid ${layer.color}50`,
                  }}
                  transition={{ type: 'spring', duration: 0.3 }}
                />
              )}
              <span className="relative z-10">{layer.icon}</span>
              <span className="relative z-10">{layer.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
