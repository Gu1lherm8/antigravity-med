import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, 
  ChevronRight, 
  Zap, 
  Thermometer, 
  BrainCircuit, 
  AlertCircle, 
  Calculator,
  ShieldCheck,
  Search,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../lib/intelligence/SoundService';
import { ErrorActionableEngine, type ErrorPatologia } from '../lib/intelligence/ErrorActionableEngine';

interface FailedAttempt {
  id: string;
  created_at: string;
  is_correct: boolean;
  questions: {
    text: string;
    discipline: string;
    topic: string;
    difficulty: string;
  };
}

export function UTI() {
  const [errors, setErrors] = useState<FailedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<FailedAttempt | null>(null);
  const [treatmentType, setTreatmentType] = useState<string | null>(null);
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    async function fetchErrors() {
      setLoading(true);
      const { data } = await supabase
        .from('attempts')
        .select(`
          id,
          created_at,
          is_correct,
          questions (
            text,
            discipline,
            topic,
            difficulty
          )
        `)
        .eq('is_correct', false)
        .order('created_at', { ascending: false });

      if (data) setErrors(data as any);
      setLoading(false);
    }
    fetchErrors();
  }, []);

  const handleSelectError = (error: FailedAttempt) => {
    sounds.playClickAccent();
    setSelectedError(error);
    setTreatmentType(null);
    setInjected(false);
  };

  const handleInject = async () => {
    if (!selectedError || !treatmentType || injecting) return;
    setInjecting(true);
    sounds.playClickAccent();

    const success = await ErrorActionableEngine.diagnoseAndInject({
      question_id: selectedError.id,
      topic: selectedError.questions?.topic || 'Geral',
      subject: selectedError.questions?.discipline || 'Geral',
      patologia: treatmentType as ErrorPatologia,
      user_id: null,
    });

    setInjecting(false);
    if (success) {
      sounds.playSuccess();
      setInjected(true);
    } else {
      sounds.playError();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Zap className="w-12 h-12 text-primary animate-bounce relative z-10" />
          <div className="absolute inset-0 bg-primary/40 blur-2xl animate-pulse" />
        </div>
        <p className="text-xs font-black text-white/30 uppercase tracking-[0.3em]">Varrendo Histórico de Falhas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 max-w-6xl pb-20">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Thermometer className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight text-white uppercase">U.T.I (Tratamento Intensivo)</h2>
            <p className="text-text-secondary font-medium mt-1">
              Onde seus erros param de ser falhas e se tornam <span className="text-white font-bold tracking-widest uppercase text-xs">pontos no ENEM</span>.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LISTA DE CASOS CRÍTICOS */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
              <Search className="w-3 h-3" /> Pacientes em Observação ({errors.length})
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {errors.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center flex flex-col items-center gap-6 border-emerald-500/20 bg-emerald-500/5">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">Nenhuma Ocorrência Crítica!</h3>
                  <p className="text-text-secondary font-medium">Seu prontuário está limpo. Continue operando com excelência.</p>
                </div>
              </motion.div>
            ) : (
              errors.map((error, idx) => (
                <motion.button
                  key={error.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleSelectError(error)}
                  className={`glass-card p-5 flex items-center justify-between text-left transition-all border-l-4 group ${
                    selectedError?.id === error.id
                      ? 'border-l-indigo-500 bg-indigo-500/10 border-white/10'
                      : 'border-l-red-500 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-2 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/5 text-[9px] font-black rounded uppercase tracking-widest text-indigo-400 border border-white/5">
                        {error.questions.discipline}
                      </span>
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">
                        {error.questions.topic}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                      {error.questions.text}
                    </h4>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${selectedError?.id === error.id ? 'translate-x-1 text-white' : 'text-text-secondary'}`} />
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* PAINEL DE TRATAMENTO */}
        <div className="lg:col-span-5 sticky top-10">
          <AnimatePresence mode="wait">
            {selectedError ? (
              <motion.div
                key={selectedError.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 border-indigo-500/30 bg-black/40 backdrop-blur-3xl shadow-2xl space-y-8"
              >
                <header className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                    <span>Diagnóstico de Falha</span>
                    <span className="text-text-secondary">ID: {selectedError.id.slice(0, 8)}</span>
                  </div>
                  <h4 className="text-xl font-black text-white leading-tight">
                    Qual foi a patologia detectada neste erro?
                  </h4>
                </header>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Teoria', label: 'Teoria', icon: BrainCircuit, color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Não sabia a base conceitual.' },
                    { id: 'Interpretação', label: 'Interpretação', icon: AlertCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/10', desc: 'Caiu em pegadinha ou distrator.' },
                    { id: 'Cálculo', label: 'Cálculo', icon: Calculator, color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Erro de conta ou desatenção.' },
                  ].map((strat) => (
                    <button
                      key={strat.id}
                      onClick={() => { sounds.playClickAccent(); setTreatmentType(strat.id); setInjected(false); }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${treatmentType === strat.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${treatmentType === strat.id ? 'bg-black/10' : strat.bg}`}>
                        <strat.icon className={`w-5 h-5 ${treatmentType === strat.id ? 'text-black' : strat.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-xs uppercase tracking-widest">{strat.label}</div>
                        <div className={`text-[10px] font-bold ${treatmentType === strat.id ? 'text-black/60' : 'text-text-secondary'}`}>{strat.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {treatmentType && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 pt-4 border-t border-white/10">
                      <div className="p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Protocolo de Cura Gerado</h5>
                        <p className="text-xs font-bold text-white leading-relaxed">
                          O sistema irá injetar <span className="text-primary font-black">5 questões de reforço</span> e <span className="text-primary font-black">1 flashcard de recuperação</span> deste tópico no seu próximo fluxo.
                        </p>
                      </div>

                      {injected ? (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full py-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <span className="text-emerald-400 font-black text-lg uppercase">Reforço Injetado!</span>
                        </motion.div>
                      ) : (
                        <button
                          onClick={handleInject}
                          disabled={injecting}
                          className="w-full btn-primary py-5 text-xl font-black rounded-3xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-60"
                        >
                          {injecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-white" />}
                          {injecting ? 'INJETANDO...' : 'INJETAR AGORA'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="glass-card p-12 text-center flex flex-col items-center gap-6 border-dashed border-white/10 opacity-30">
                <ShieldAlert className="w-20 h-20" />
                <p className="text-sm font-black uppercase tracking-widest">Selecione um caso clínico para iniciar o diagnóstico.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
