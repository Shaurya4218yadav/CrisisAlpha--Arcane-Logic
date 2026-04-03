'use client';

// ============================================================
// CrisisAlpha — Event Feed
// Live crisis alert timeline
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { SEVERITY_COLORS } from '@/lib/map/colorScale';
import { SimulationEvent } from '@/types';
import { useRef, useEffect } from 'react';

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

export default function EventFeed() {
  const { events, phase } = useScenarioStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const reversedEvents = [...events].reverse();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/5">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">
          Live Events
        </h3>
        {events.length > 0 && (
          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold tabular-nums">
            {events.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar mt-2 space-y-1.5"
      >
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📡</div>
            <div className="text-xs text-slate-500">
              {phase === 'setup'
                ? 'Events will appear during simulation'
                : 'Monitoring for crisis events...'}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {reversedEvents.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, index }: { event: SimulationEvent; index: number }) {
  const color = SEVERITY_COLORS[event.severity];
  const icon = EVENT_ICONS[event.type] || '⚠️';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-2.5 transition-all cursor-default"
    >
      {/* Severity indicator */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ background: color }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{icon}</span>
              <span className="text-xs font-semibold text-white truncate">
                {event.title}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
              {event.message}
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
              style={{
                background: `${color}20`,
                color: color,
              }}
            >
              {event.severity}
            </span>
            <span className="text-[9px] text-slate-600 mt-0.5">
              Day {event.tick}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
