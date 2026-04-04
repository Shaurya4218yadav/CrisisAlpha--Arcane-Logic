'use client';

// ============================================================
// CrisisAlpha — Event Toast
// Floating notification overlay for high-severity events
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { SEVERITY_COLORS } from '@/lib/map/colorScale';
import { SimulationEvent } from '@/types';

const EVENT_ICONS: Record<string, string> = {
  port_shutdown: '⚓',
  hub_critical: '🔗',
  route_broken: '🚫',
  fuel_shortage_worsening: '⛽',
  demand_spike_safe_zone: '📈',
  policy_restriction_escalation: '🏛️',
  node_stressed: '⚠️',
  cascade_spreading: '🌊',
};

interface Toast {
  id: string;
  event: SimulationEvent;
  timestamp: number;
}

export default function EventToast() {
  const { events, phase } = useScenarioStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenCount, setSeenCount] = useState(0);

  // Watch for new high-severity events
  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') return;

    const newEvents = events.slice(seenCount);
    const highSeverity = newEvents.filter(
      (e) => e.severity === 'high' || e.severity === 'medium'
    );

    if (highSeverity.length > 0) {
      const newToasts = highSeverity.map((event) => ({
        id: `toast-${event.id}`,
        event,
        timestamp: Date.now(),
      }));
      setTimeout(() => {
        setToasts((prev) => [...prev, ...newToasts].slice(-5)); // Max 5 toasts
      }, 0);
    }

    setTimeout(() => {
      setSeenCount(events.length);
    }, 0);
  }, [events.length, phase, events, seenCount]);

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.timestamp < 5000));
    }, 1000);

    return () => clearInterval(timer);
  }, [toasts.length]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 max-w-xs pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const color =
            SEVERITY_COLORS[toast.event.severity] || SEVERITY_COLORS.medium;
          const icon = EVENT_ICONS[toast.event.type] || '⚠️';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border rounded-xl p-3 cursor-pointer hover:bg-slate-800/90 transition-colors"
              style={{ borderColor: `${color}40` }}
              onClick={() => dismissToast(toast.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0">{icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {toast.event.title}
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: `${color}20`,
                        color,
                      }}
                    >
                      {toast.event.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {toast.event.message}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
