'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFleetStore } from '@/state/useFleetStore';

export default function FleetSearchPanel() {
  const { vehicles, searchVehicle, searchedVehicle, clearSearch } = useFleetStore();
  const [vehicleType, setVehicleType] = useState('sea');
  const [searchId, setSearchId] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    searchVehicle(searchId.trim(), vehicleType);
  };

  return (
    <div className="bg-slate-900/50 p-4 border-b border-white/5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-white uppercase tracking-wider">Fleet Radar</span>
        <span className="bg-cyan-500/20 text-cyan-400 text-[9px] px-2 py-0.5 rounded-full font-bold">
          LIVE
        </span>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        {/* Type Selection */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setVehicleType('sea')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              vehicleType === 'sea' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚢 Maritime
          </button>
          <button
            type="button"
            onClick={() => setVehicleType('air')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              vehicleType === 'air' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ✈️ Aviation
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={vehicleType === 'sea' ? 'Search IMO...' : 'Search IATA...'}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/5 transition-all"
          >
            🔍
          </button>
        </div>
      </form>

      {/* Target Lock Display */}
      {searchedVehicle && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-cyan-900/20 border border-cyan-500/30"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-0.5">Target Locked</div>
              <div className="font-mono text-white text-sm">
                {searchedVehicle.type === 'sea' ? 'IMO:' : 'FLT:'}{searchedVehicle.id}
              </div>
            </div>
            <button onClick={clearSearch} className="text-slate-500 hover:text-red-400">✕</button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-black/20 rounded p-1.5 border border-white/5">
               <span className="text-slate-500 block mb-0.5">Heading</span>
               <span className="text-slate-200">{searchedVehicle.heading.toFixed(0)}°</span>
            </div>
            <div className="bg-black/20 rounded p-1.5 border border-white/5">
               <span className="text-slate-500 block mb-0.5">Speed</span>
               <span className="text-emerald-400">ACTIVE</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Fleet Stats */}
      <div className="flex justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
        <span>Total Active Units</span>
        <span className="text-white font-mono">{vehicles.length}</span>
      </div>
    </div>
  );
}
