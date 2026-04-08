import React, { useState, useEffect } from 'react';
import { Play, Clock, Target, Zap, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';
import { getPilotPlan } from '../lib/intelligence/intelligenceQueries';
import type { StudyPlan } from '../lib/intelligence/Planner';
import { sounds } from '../lib/intelligence/SoundService';
import { motion } from 'framer-motion';

interface ActiveCommanderProps {
  onStartPilot: (plan: StudyPlan) => void;
}

export function ActiveCommander({ onStartPilot }: ActiveCommanderProps) {
  const [timeOption, setTimeOption] = useState<number>(30); 
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function updatePlan() {
      try {
        setLoading(true);
        const newPlan = await getPilotPlan(timeOption);
        setPlan(newPlan);
      } catch (error) {
        console.error("❌ ANTIGRAVITY: Erro ao buscar plano:", error);
      } finally {
        setLoading(false);
      }
    }
    updatePlan();
  }, [timeOption]);

  const handleStart = () => {
    if (plan) {
      sounds.playClickAccent();
      onStartPilot(plan);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 bg-white/[0.02] backdrop-blur-xl animate-pulse rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Zap className="w-12 h-12 text-primary animate-bounce relative z-10" />
            <div className="absolute inset-0 bg-primary/40 blur-2xl animate-pulse" />
          </div>
          <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em] animate-pulse">Sincronizando Rede Neural...</p>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full flex flex-col gap-6"
    >
      <div className="relative group">
        {/* GLOW DE FUNDO */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-indigo-500/50 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative glass-card p-0 rounded-[2.5rem] overflow-hidden border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl">
          <div className="flex flex-col lg:flex-row divide-white/5 lg:divide-x">
            
            {/* LADO ESQUERDO: CONTROLE MESTRE */}
            <div className="flex-1 p-10 flex flex-col justify-between gap-12 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-primary/20 rounded-full border border-primary/30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Plano de Elite Gerado</span>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {[15, 30, 60, 120].map((t) => (
                      <button
                        key={t}
                        onClick={() => { sounds.playClickAccent(); setTimeOption(t); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          timeOption === t 
                            ? 'bg-white text-black shadow-xl shadow-white/10' 
                            : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        {t >= 60 ? `${t/60}H` : `${t}M`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-5xl font-black text-white tracking-tighter leading-[0.9]">
                    A Unidade Tática <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 italic">decidiu seu caminho.</span>
                  </h3>
                  <p className="text-text-secondary font-medium text-lg max-w-md">
                    Seu treino de hoje foi recalculado com base no seu último desempenho. <span className="text-white font-bold">Inicie agora.</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="group/btn relative w-fit"
              >
                <div className="absolute -inset-4 bg-primary/40 blur-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-6 bg-white text-black pl-10 pr-4 py-4 rounded-3xl font-black text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">
                  COMEÇAR AGORA
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white group-hover/btn:rotate-12 transition-transform">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
              </button>
            </div>

            {/* LADO DIREITO: DASHBOARD DE TAREFAS */}
            <div className="w-full lg:w-[450px] p-10 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
                  <Target className="w-4 h-4" /> Sequência de Voo
                </h4>
                <span className="text-[10px] font-black text-primary px-2 py-1 bg-primary/10 rounded">ESTIMADO: {timeOption} MIN</span>
              </div>

              <div className="flex flex-col gap-4">
                {plan.tasks.slice(0, 4).map((task, idx) => (
                  <motion.div 
                    key={task.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center gap-5 p-5 rounded-[1.5rem] border transition-all ${
                      idx === 0 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-white/[0.03] border-white/5 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                      idx === 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-text-secondary'
                    }`}>
                      {idx === 0 ? <Sparkles className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h5 className="text-sm font-bold text-white truncate">{task.title}</h5>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-text-secondary uppercase">{task.subject}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-bold text-primary">{task.durationMinutes} min</span>
                      </div>
                    </div>
                    {idx === 0 && <ChevronRight className="w-5 h-5 text-white/40" />}
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <p className="text-[10px] font-medium leading-relaxed italic text-indigo-200/60">
                    "O sucesso é o som de tarefas concluídas sem interrupções."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
