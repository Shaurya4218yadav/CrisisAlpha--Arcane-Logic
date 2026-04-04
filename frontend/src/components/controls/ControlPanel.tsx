'use client';

// ============================================================
// CrisisAlpha — Control Panel
// Industry selection, crisis sliders, simulation controls
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api, connectSocket, disconnectSocket } from '@/lib/api/client';
import { Industry, UserGoal, Preset } from '@/types';

const INDUSTRIES: { value: Industry; label: string; icon: string }[] = [
  { value: 'automotive', label: 'Automotive', icon: '🚗' },
  { value: 'energy', label: 'Energy', icon: '⚡' },
  { value: 'pharma', label: 'Pharma', icon: '💊' },
  { value: 'consumer_goods', label: 'Consumer Goods', icon: '📦' },
];

const GOALS: { value: UserGoal; label: string; icon: string }[] = [
  { value: 'resilience', label: 'Resilience', icon: '🛡️' },
  { value: 'profit', label: 'Profit', icon: '💰' },
  { value: 'balanced', label: 'Balanced', icon: '⚖️' },
];



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
    <div className="h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
      {/* Header */}
      <div className="text-center pb-2 border-b border-white/5">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">
          Control Panel
        </h2>
      </div>

      {phase === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Quick Presets
              </label>
              <div className="space-y-1.5">
                {presets.map((preset: Preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-xs ${
                      config.originNodeId === preset.originNodeId &&
                      config.industry === preset.industry
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold">
                      {preset.icon} {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Industry */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Industry
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => updateConfig({ industry: ind.value })}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    config.industry === ind.value
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {ind.icon} {ind.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crisis Parameters */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Crisis Parameters
            </label>

            <SliderInput
              label="Conflict Intensity"
              value={config.conflictIntensity}
              onChange={(v) => updateConfig({ conflictIntensity: v })}
              color="#ef4444"
            />
            <SliderInput
              label="Fuel Shortage"
              value={config.fuelShortage}
              onChange={(v) => updateConfig({ fuelShortage: v })}
              color="#f59e0b"
            />
            <SliderInput
              label="Policy Restriction"
              value={config.policyRestriction}
              onChange={(v) => updateConfig({ policyRestriction: v })}
              color="#8b5cf6"
            />
          </div>

          {/* Advanced Parameters */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Advanced Controls
            </label>

            <SliderInput
              label="Risk Sensitivity"
              value={config.riskSensitivity}
              onChange={(v) => updateConfig({ riskSensitivity: v })}
              color="#06b6d4"
            />
            <SliderInput
              label="Propagation Speed"
              value={config.propagationSpeed}
              onChange={(v) => updateConfig({ propagationSpeed: v })}
              color="#a78bfa"
            />
            <SliderInput
              label="Demand Volatility"
              value={config.demandVolatility}
              onChange={(v) => updateConfig({ demandVolatility: v })}
              color="#f472b6"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
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
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Objective
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => updateConfig({ userGoal: goal.value })}
                  className={`px-2 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                    config.userGoal === goal.value
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {goal.icon}
                  <div className="mt-0.5">{goal.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateAndStart}
            disabled={!config.originNodeId}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
              config.originNodeId
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {config.originNodeId ? '⚡ Launch Simulation' : 'Select Origin on Map'}
          </motion.button>
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
                className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-all"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/30 transition-all"
              >
                ▶ Resume
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider hover:bg-red-500/20 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Config Summary */}
          <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Active Scenario</div>
            <div className="flex justify-between text-slate-300">
              <span>Industry</span>
              <span className="text-cyan-400 font-medium">{config.industry}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Goal</span>
              <span className="text-violet-400 font-medium">{config.userGoal}</span>
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
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
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${value * 100}%, rgba(255,255,255,0.1) ${value * 100}%)`,
        }}
      />
    </div>
  );
}
