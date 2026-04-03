'use client';

// ============================================================
// CrisisAlpha — Pre-Simulation Modal
// User profile collection before first simulation
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';

const BUSINESS_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer', icon: '🏭' },
  { value: 'logistics', label: 'Logistics Provider', icon: '🚛' },
  { value: 'retailer', label: 'Retailer', icon: '🏪' },
  { value: 'commodity_trader', label: 'Commodity Trader', icon: '📊' },
  { value: 'government', label: 'Government/NGO', icon: '🏛️' },
];

const INDUSTRIES = [
  { value: 'automotive', label: 'Automotive', icon: '🚗' },
  { value: 'energy', label: 'Energy & Oil', icon: '⚡' },
  { value: 'pharma', label: 'Pharmaceuticals', icon: '💊' },
  { value: 'consumer_goods', label: 'Consumer Goods', icon: '📦' },
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'agriculture', label: 'Agriculture', icon: '🌾' },
];

const REGIONS = [
  { value: 'asia_pacific', label: 'Asia Pacific' },
  { value: 'europe', label: 'Europe' },
  { value: 'north_america', label: 'North America' },
  { value: 'middle_east', label: 'Middle East' },
  { value: 'africa', label: 'Africa' },
  { value: 'south_america', label: 'South America' },
];

const STORAGE_KEY = 'crisisalpha_profile_completed';

export default function PreSimulationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { setUserProfile } = useScenarioStore();

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [product, setProduct] = useState('');

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setTimeout(() => setIsOpen(true), 0);
    }
  }, []);

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  const handleComplete = () => {
    const profile = {
      name: name || 'Commander',
      businessType,
      industry,
      regions: selectedRegions,
      product,
    };
    setUserProfile(profile);
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const canProceed = () => {
    if (step === 0) return name.length > 0;
    if (step === 1) return businessType.length > 0;
    if (step === 2) return industry.length > 0;
    if (step === 3) return selectedRegions.length > 0;
    return true;
  };

  if (!isOpen) return null;

  const steps = [
    // Step 0: Name
    <div key="name" className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-3">👋</div>
        <h2 className="text-xl font-bold text-white">Welcome, Commander</h2>
        <p className="text-sm text-slate-400 mt-1">
          Let&apos;s set up your crisis profile
        </p>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          autoFocus
        />
      </div>
    </div>,

    // Step 1: Business Type
    <div key="business" className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">Business Type</h2>
        <p className="text-xs text-slate-400 mt-1">
          What kind of organization are you?
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.value}
            onClick={() => setBusinessType(bt.value)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
              businessType === bt.value
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <span className="mr-2">{bt.icon}</span>
            {bt.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Industry
    <div key="industry" className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">Industry</h2>
        <p className="text-xs text-slate-400 mt-1">
          Primary sector of operations
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind.value}
            onClick={() => setIndustry(ind.value)}
            className={`px-3 py-3 rounded-xl border transition-all text-xs font-medium text-center ${
              industry === ind.value
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="text-xl mb-1">{ind.icon}</div>
            {ind.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Regions
    <div key="regions" className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">Operating Regions</h2>
        <p className="text-xs text-slate-400 mt-1">
          Select all regions where you operate
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {REGIONS.map((reg) => (
          <button
            key={reg.value}
            onClick={() => toggleRegion(reg.value)}
            className={`px-3 py-2.5 rounded-xl border transition-all text-xs font-medium ${
              selectedRegions.includes(reg.value)
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {reg.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Product
    <div key="product" className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">Primary Product</h2>
        <p className="text-xs text-slate-400 mt-1">
          What do you primarily trade/produce?
        </p>
      </div>
      <div>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="e.g. Semiconductors, Crude Oil, Vehicles..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          autoFocus
        />
      </div>
    </div>,
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-slate-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full"
        >
          {/* Progress indicator */}
          <div className="flex gap-1 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= step ? 'bg-cyan-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Skip Setup
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step < steps.length - 1) {
                    setStep((s) => s + 1);
                  } else {
                    handleComplete();
                  }
                }}
                disabled={!canProceed()}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  canProceed()
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {step < steps.length - 1 ? 'Next' : 'Launch Command Center'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
