'use client';

// ============================================================
// CrisisAlpha — Simulation Logs
// Chronological log of all simulation actions and ticks
// ============================================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'tick' | 'event' | 'decision' | 'system';
  message: string;
  color: string;
}

export default function SimulationLogs() {
  const { events, currentTick, phase, dayLabel } = useScenarioStore();

  const logs = useMemo(() => {
    const entries: LogEntry[] = [];

    // System log for simulation start
    if (phase !== 'setup') {
      entries.push({
        id: 'sys-start',
        timestamp: '00:00:00',
        type: 'system',
        message: 'Simulation engine initialized',
        color: '#38bdf8',
      });
    }

    // Add events as log entries
    events.forEach((event, i) => {
      entries.push({
        id: `log-${event.id}`,
        timestamp: `Day ${event.tick}`,
        type: 'event',
        message: `[${event.severity.toUpperCase()}] ${event.title}`,
        color:
          event.severity === 'high'
            ? '#ef4444'
            : event.severity === 'medium'
            ? '#f59e0b'
            : '#3b82f6',
      });
    });

    // Tick markers
    for (let t = 1; t <= currentTick; t++) {
      entries.push({
        id: `tick-${t}`,
        timestamp: `Day ${t}`,
        type: 'tick',
        message: `Tick ${t} — Propagation cycle complete`,
        color: '#64748b',
      });
    }

    // Sort by tick/order
    return entries;
  }, [events, currentTick, phase]);

  if (phase === 'setup') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-xs text-slate-500">
              Simulation logs will appear here
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 font-mono">
        {logs.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.01 }}
            className="flex items-start gap-2 py-1 px-1 hover:bg-white/[0.03] rounded text-[10px] leading-relaxed"
          >
            <span className="text-slate-600 shrink-0 w-12 text-right">
              {log.timestamp}
            </span>
            <span
              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
              style={{ background: log.color }}
            />
            <span
              className={`${
                log.type === 'system'
                  ? 'text-cyan-400'
                  : log.type === 'tick'
                  ? 'text-slate-500'
                  : 'text-slate-300'
              }`}
            >
              {log.message}
            </span>
          </motion.div>
        ))}

        {/* Live cursor */}
        {phase === 'running' && (
          <div className="flex items-center gap-2 py-1 px-1 text-[10px]">
            <span className="text-slate-600 w-12 text-right">{dayLabel}</span>
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 animate-pulse">
              Processing...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
