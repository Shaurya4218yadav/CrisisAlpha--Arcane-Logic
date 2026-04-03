'use client';

// ============================================================
// CrisisAlpha — Chat Assistant
// Lightweight AI chat widget with real LLM integration
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenarioStore } from '@/state/scenarioStore';
import { api } from '@/lib/api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Uses api.chat() from shared client

// Build simulation context for the LLM
function buildContext(state: ReturnType<typeof useScenarioStore.getState>): string {
  const riskyNodes = state.nodes.filter(
    (n) => n.status === 'risky' || n.status === 'broken'
  );
  const brokenEdges = state.edges.filter((e) => e.status === 'broken');
  const demandZones = state.nodes.filter((n) => n.type === 'city' || n.type === 'hub');

  return `You are CrisisAlpha AI, a crisis simulation advisor. Current state:
- Phase: ${state.phase}
- Day: ${state.dayLabel} (tick ${state.currentTick}/${state.maxTicks})
- Industry: ${state.config.industry}
- High Risk Nodes: ${riskyNodes.map(n => n.name).join(', ') || 'None'}
- Failed Routes: ${brokenEdges.map(e => e.id || `${e.sourceNodeId}->${e.targetNodeId}`).join(', ') || 'None'}
- Demand Zones: ${demandZones.map((n) => n.name).slice(0, 5).join(', ')}
- Score: Risk Avoided ${state.score.riskAvoided}%, Network ${state.score.networkEfficiency}%, Profit ${state.score.profitGained}
- Recent events: ${state.events.slice(-3).map((e) => `[${e.severity}] ${e.title}`).join(' | ') || 'None'}
- Available decisions: ${state.recommendations.length}

Provide concise, actionable crisis management advice based STRICTLY on this data. Do not hallucinate. Be brief (2-3 sentences max).`;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to CrisisAlpha Command. I'm your AI crisis advisor. Ask me about the current situation, recommended actions, or risk analysis.",
      timestamp: 0,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const events = useScenarioStore((state) => state.events);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      const eventMsgId = `event-${latestEvent.id}-${latestEvent.tick}`;
      setMessages((prev) => {
        if (prev.some(m => m.id === eventMsgId)) return prev;
        return [
          ...prev,
          {
            id: eventMsgId,
            role: 'assistant',
            content: `🚨 New Simulation Event: ${latestEvent.title} - ${latestEvent.message}`,
            timestamp: Date.now(),
          }
        ];
      });
    }
  }, [events]);

  const generateResponse = useCallback(async (userMessage: string): Promise<string> => {
    const state = useScenarioStore.getState();
    const context = buildContext(state);

    try {
      // Try backend chat endpoint first
      const data = await api.chat(userMessage, context);
      if (data.response) return data.response;
    } catch {
      // Backend unavailable — use smart fallback
    }

    // Smart contextual fallback responses
    const state2 = useScenarioStore.getState();
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('status') || lowerMsg.includes('situation')) {
      const riskyCount = state2.nodes.filter(
        (n) => n.status === 'risky' || n.status === 'broken'
      ).length;
      return `Current status: ${riskyCount} nodes are at elevated risk. Network efficiency is at ${state2.score.networkEfficiency}%. ${
        riskyCount > 3
          ? 'I recommend reviewing the available rerouting options immediately.'
          : 'The situation is manageable. Monitor the event feed for escalation.'
      }`;
    }

    if (lowerMsg.includes('recommend') || lowerMsg.includes('should') || lowerMsg.includes('do')) {
      if (state2.recommendations.length > 0) {
        const top = state2.recommendations[0];
        return `Top recommendation: "${top.title}" — ${top.description}. This would reduce risk by ${(top.impact.riskReduction * 100).toFixed(0)}%. Check the Actions tab to apply it.`;
      }
      return 'No specific recommendations available yet. Continue monitoring the simulation and check back as new events unfold.';
    }

    if (lowerMsg.includes('score') || lowerMsg.includes('performance')) {
      return `Performance snapshot — Risk Avoided: ${state2.score.riskAvoided}%, Network Efficiency: ${state2.score.networkEfficiency}%, Demand Served: ${state2.score.demandServed}%. Overall score: ${state2.score.overallScore}. ${
        state2.score.overallScore > 60 ? 'You\'re doing well.' : 'Consider applying available decisions to improve.'
      }`;
    }

    if (lowerMsg.includes('risk') || lowerMsg.includes('danger')) {
      const riskyNodes = state2.nodes.filter((n) => n.status === 'risky' || n.status === 'broken');
      if (riskyNodes.length > 0) {
        return `High risk nodes detected: ${riskyNodes.map((n) => n.name).join(', ')}. Action recommended to mitigate exposure.`;
      }
      return 'No high risk nodes detected currently.';
    }

    if (lowerMsg.includes('route')) {
      const brokenEdges = state2.edges.filter((e) => e.status === 'broken');
      if (brokenEdges.length > 0) {
        return `Failed routes detected: ${brokenEdges.map((e) => e.id || `${e.sourceNodeId}->${e.targetNodeId}`).join(', ')}. Please reroute.`;
      }
      return 'All routes are currently operational.';
    }

    if (lowerMsg.includes('profit') || lowerMsg.includes('financial')) {
      const demandZones = state2.nodes.filter((n) => n.type === 'city' || n.type === 'hub');
      return `Target these demand zones to maximize profit: ${demandZones.map((n) => n.name).slice(0, 5).join(', ')}. Current profit score is ${state2.score.profitGained}.`;
    }

    return `I'm analyzing the current ${state2.config.industry} scenario at Day ${state2.currentTick}. ${state2.nodes.length} nodes under monitoring with ${state2.events.length} events recorded. Ask me about specific risks, recommendations, or your performance score.`;
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await generateResponse(userMsg.content);

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-resp`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-[90px] right-4 lg:bottom-6 lg:right-6 z-[60] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isOpen
            ? 'bg-slate-700 text-slate-300'
            : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
        }`}
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed bottom-[150px] right-4 lg:bottom-20 lg:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-80 h-[50vh] max-h-[420px] min-h-[300px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                  AI
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Crisis Advisor
                  </div>
                  <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 text-cyan-100 rounded-br-sm'
                        : 'bg-white/5 text-slate-300 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 rounded-xl px-3 py-2 text-xs text-slate-400">
                    <span className="animate-pulse">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about risks, actions..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
