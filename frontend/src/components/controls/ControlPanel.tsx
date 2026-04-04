'use client';

// ============================================================
// CrisisAlpha — Control Panel
// Industry selection, crisis sliders, simulation controls
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api, connectSocket, disconnectSocket } from '@/lib/api/client';
import { Industry, UserGoal, Preset } from '@/types';

// Removed Industries and Goals arrays as they are no longer required in the minimal UI.



export default function ControlPanel() {
  const {
    phase,
    setPhase,
    config,
    updateConfig,
    scenarioId,
    setScenarioId,
    setGraph,
    processTick,
    setFinalResult,
    presets,
    applyPreset,
    selectedNodeId,
    reset,
  } = useScenarioStore();

  const handleCreateAndStart = async () => {
    if (!config.originNodeId) return;
    setPhase('running'); // Immediate feedback

    try {
      // Try backend first
      const result = await api.createScenario(config);
      setScenarioId(result.session.id);
      if (result.nodes && result.edges) setGraph(result.nodes, result.edges);

      // Connect WebSocket
      connectSocket(
        result.session.id,
        (payload) => processTick(payload),
        (data) => setFinalResult(data)
      );

      // Start simulation
      await api.startScenario(result.session.id);
      console.log('[SIM] Backend simulation started');
    } catch (err: any) {
      console.error('[SIM] Backend simulation failed to start:', err);
      alert(`Simulation Error: ${err.message}`);
      setPhase('setup');
    }
  };

  const handlePause = async () => {
    if (!scenarioId) return;
    try {
      await api.pauseScenario(scenarioId);
    } catch {
      console.warn('[SIM] Pause failed — mock mode');
    }
    setPhase('paused');
  };

  const handleResume = async () => {
    if (!scenarioId) return;
    try {
      await api.resumeScenario(scenarioId);
    } catch {
      console.warn('[SIM] Resume failed — mock mode');
    }
    setPhase('running');
  };

  const handleReset = () => {
    disconnectSocket();
    reset();
  };

  return (
    <div className="flex flex-col gap-3 pr-1 pb-24 lg:pb-0">
      {/* Header */}
      <div className="text-center pb-2 border-b border-white/5">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">
          Simulation Controls
        </h2>
      </div>

      {phase === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >


          {/* GROUP: External Factors */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              External Factors
            </label>

            <SliderInput
              label="Conflict"
              value={config.conflictIntensity}
              onChange={(v) => updateConfig({ conflictIntensity: v })}
              color="var(--color-primary)"
            />
            <SliderInput
              label="Weather"
              value={config.fuelShortage}
              onChange={(v) => updateConfig({ fuelShortage: v })}
              color="var(--color-primary)"
            />
          </div>

          <div className="w-full h-px bg-white/5 my-2" />

          {/* GROUP: Policy */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Policy
            </label>
            <SliderInput
              label="Restriction"
              value={config.policyRestriction}
              onChange={(v) => updateConfig({ policyRestriction: v })}
              color="var(--color-primary)"
            />
          </div>

          <div className="w-full h-px bg-white/5 my-2" />

          {/* GROUP: Duration */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Duration: {config.durationDays} days
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={config.durationDays}
              onChange={(e) =>
                updateConfig({ durationDays: parseInt(e.target.value) })
              }
              className="w-full accent-primary"
            />
          </div>



          {/* Start Button */}
          <div className="pt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={config.originNodeId ? {
                boxShadow: ['0px 0px 10px rgba(0,245,212,0.4)', '0px 0px 25px rgba(0,245,212,0.8)', '0px 0px 10px rgba(0,245,212,0.4)'],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              onClick={handleCreateAndStart}
              disabled={!config.originNodeId}
              className={`w-full py-6 rounded-2xl font-black text-xl tracking-widest transition-all uppercase ${
                config.originNodeId
                  ? 'bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-bg shadow-[0_0_30px_rgba(0,245,212,0.6)] animate-pulse'
                  : 'bg-transparent border border-white/10 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              {config.originNodeId ? '🚀 Launch Simulation' : 'Select region first'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Running / Paused Controls */}
      {(phase === 'running' || phase === 'paused') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            {phase === 'running' ? (
              <button
                onClick={handlePause}
                className="flex-1 py-2.5 rounded-xl bg-warning/20 border border-warning/40 text-warning font-bold text-xs uppercase tracking-wider hover:bg-warning/30 transition-all"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex-1 py-2.5 rounded-xl bg-safe/20 border border-safe/40 text-safe font-bold text-xs uppercase tracking-wider hover:bg-safe/30 transition-all"
              >
                ▶ Resume
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger font-bold text-xs uppercase tracking-wider hover:bg-danger/20 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Config Summary */}
          <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Active Scenario</div>
            <div className="flex justify-between text-slate-300">
              <span>Industry</span>
              <span className="text-[#00F5D4] font-medium">{config.industry}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Goal</span>
              <span className="text-primary font-medium">{config.userGoal}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Duration</span>
              <span className="text-white font-medium">{config.durationDays} days</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Completed */}
      {phase === 'completed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-primary text-bg font-black text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(0,245,212,0.3)] hover:shadow-[0_0_25px_rgba(0,245,212,0.6)] transition-all"
          >
            🔄 New Simulation
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Slider sub-component
function SliderInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-300">{label}</span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${value * 100}%, rgba(255,255,255,0.05) ${value * 100}%)`,
        }}
      />
    </div>
  );
}
