import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, Clock, Zap, BookOpen, 
  Target, AlertTriangle, ChevronRight, Loader2, Play, Trophy,
  Star, Brain, BarChart3, RotateCcw, Activity, Flame, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FlowEngine as Engine, type FlowTask } from '../lib/intelligence/FlowEngine';
import { ProgressEngine } from '../lib/intelligence/ProgressEngine';

interface FlowEngineProps {
  initialQueue?: FlowTask[];
  period?: 'manha' | 'tarde' | 'noite' | 'personalizado';
  onClose: () => void;
}

export function FlowEngine({ initialQueue, period = 'manha', onClose }: FlowEngineProps) {
  // Sessão & Fila
  const [queue, setQueue] = useState<FlowTask[]>(initialQueue || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interruptionMap, setInterruptionMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Performance & Gamificação
  const [mode, setMode] = useState<'study' | 'questions' | 'result'>('study');
  const [streak, setStreak] = useState(0);
  const [sessionResults, setSessionResults] = useState({ hits: 0, total: 0, xp: 0 });
  const [history, setHistory] = useState<{ isCorrect: boolean, time: number }[]>([]);
  
  // Quiz
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const startTime = useRef<number>(Date.now());

  const currentTask = queue[currentIdx];

  // 1. Inicialização Robusta
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const active = await Engine.getActiveSession();
        if (active) {
          setSessionId(active.id);
          setQueue(active.queue);
          setCurrentIdx(active.current_task_idx);
          setInterruptionMap(active.interruption_map || {});
        } else if (!initialQueue && (period === 'manha' || period === 'tarde' || period === 'noite')) {
          const newQueue = await Engine.generateInitialQueue(period);
          setQueue(newQueue);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Monitor de Fadiga e HP (Hit Probability)
  const hitRate = sessionResults.total > 0 
    ? Math.round((sessionResults.hits / sessionResults.total) * 100) 
    : 100;

  const isFatigued = history.length >= 5 && (
    history.slice(-3).every(h => !h.isCorrect) || // 3 erros seguidos
    (history.reduce((a, b) => a + b.time, 0) / history.length) > 60000 // Média > 1min por ação
  );

  // 3. Ações
  const handleAnswer = async () => {
    if (selectedOpt === null || confidence === null) return;
    
    setSubmitting(true);
    const duration = Date.now() - startTime.current;
    const isCorrect = selectedOpt === questions[qIdx].correct_answer;
    
    // Atualiza Histórico
    setHistory(prev => [...prev, { isCorrect, time: duration }]);
    if (isCorrect) {
      setStreak(prev => prev + 1);
      setSessionResults(prev => ({ ...prev, hits: prev.hits + 1 }));
    } else {
      setStreak(0);
    }
    setSessionResults(prev => ({ ...prev, total: prev.total + 1 }));

    // Agendamento Adaptativo Robusto (V3 Final)
    const { nextQueue, interruptionMap: newMap } = Engine.adaptiveScheduler(queue, currentIdx, {
      isCorrect,
      confidence,
      topic: currentTask.topic
    }, interruptionMap);
    
    setQueue(nextQueue);
    setInterruptionMap(newMap);

    // XP em Tempo Real
    const baseXP = ProgressEngine.getBaseXPByTask(currentTask.type);
    const xpResult = ProgressEngine.processXPGain(sessionResults.xp, baseXP, 0, duration/60000);
    setSessionResults(prev => ({ ...prev, xp: prev.xp + (isCorrect ? xpResult.xpGained : 15) }));

    setShowExplanation(true);
    setSubmitting(false);
  };

  const handleNextQuestion = () => {
    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
      setSelectedOpt(null);
      setConfidence(null);
      setShowExplanation(false);
      startTime.current = Date.now();
    } else {
      setMode('result');
    }
  };

  const nextTask = async () => {
    if (currentIdx < queue.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setMode('study');
      setQIdx(0);
      setSelectedOpt(null);
      setConfidence(null);
      setShowExplanation(false);
      startTime.current = Date.now();
      
      if (sessionId) {
        await Engine.saveSessionState(sessionId, nextIdx, queue);
      }
    } else {
      onClose();
    }
  };

  // Mock de Questões (Simulando API)
  useEffect(() => {
    if (currentTask?.type === 'questoes' || currentTask?.is_adaptive) {
      setQuestions([
        {
          id: Date.now(),
          text: `[DIAGNÓSTICO V3] Sobre ${currentTask.topic || currentTask.title}, qual a conduta de elite?`,
          options: ["Intervenção Imediata", "Observação Armada", "Exame de Base", "Protocolo de Exceção"],
          correct_answer: 0,
          explanation: "O Preceptor ensina que a base técnica exige decisão rápida em cenários críticos."
        }
      ]);
      setMode('questions');
      startTime.current = Date.now();
    }
  }, [currentTask]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50">
      <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
      <p className="text-white font-black tracking-[0.5em] text-sm animate-pulse">SINCRONIZANDO PRECEPTOR...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col font-sans overflow-hidden">
      {/* HEADER: STATUS DE ELITE */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90">
            <X className="w-7 h-7" />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Preceptor V3 • Modo Fluxo</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-xl italic">{currentIdx + 1}<span className="text-white/20">/</span>{queue.length}</span>
              <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                   className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                   initial={{ width: 0 }}
                   animate={{ width: `${((currentIdx + 1) / queue.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {streak >= 3 && (
              <motion.div 
                initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }}
                className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30"
              >
                <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-400">{streak} STREAK</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
             <div className="flex flex-col items-end">
               <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">XP Acumulado</span>
               <span className="text-lg font-black text-yellow-500">{sessionResults.xp}</span>
             </div>
             <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </div>
        </div>
      </header>

      {/* MONITOR DE FADIGA (INDICADOR DISCRETO) */}
      <div className="bg-white/5 px-8 py-2 flex items-center justify-center gap-10 border-b border-white/5">
         <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-bold text-white/40 uppercase">Eficiência: <span className={hitRate < 70 ? 'text-red-400' : 'text-green-400'}>{hitRate}%</span></span>
         </div>
         {isFatigued && (
            <div className="flex items-center gap-2 animate-pulse">
               <AlertTriangle className="w-3 h-3 text-yellow-500" />
               <span className="text-[10px] font-black text-yellow-500 uppercase">Fadiga Detectada — Reduzindo Carga</span>
            </div>
         )}
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-12 scrollbar-none bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.1),transparent)]">
        <AnimatePresence mode="wait">
          {mode === 'study' && (
            <motion.div 
              key="study"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto flex flex-col items-center text-center"
            >
              <div className="mb-10 relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative p-8 bg-blue-500/10 rounded-[2.5rem] border-2 border-blue-500/20 shadow-2xl">
                  {currentTask?.type === 'aula' ? <Play className="w-16 h-16 text-blue-500" /> : <BookOpen className="w-16 h-16 text-blue-500" />}
                </div>
                {currentTask?.is_adaptive && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">ADAPTATIVO</div>
                )}
              </div>
              
              <h1 className="text-5xl font-black mb-6 tracking-tighter leading-[1.1]">
                {currentTask?.title}
              </h1>
              <p className="text-white/50 text-xl font-medium mb-16 max-w-2xl mx-auto">
                {currentTask?.subject} • Desafio sugerido pelo Preceptor
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 px-4">
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.05] transition-all">
                   <Target className="w-8 h-8 mb-4 text-red-500" />
                   <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Impacto Relevante</p>
                   <p className="font-bold text-lg">Consolidação</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.05] transition-all">
                   <Brain className="w-8 h-8 mb-4 text-purple-400" />
                   <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Carga Base</p>
                   <p className="font-bold text-lg">{isFatigued ? 'Suavizada (4/10)' : 'Padrão (7/10)'}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.05] transition-all">
                   <Clock className="w-8 h-8 mb-4 text-emerald-400" />
                   <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Tempo Estimado</p>
                   <p className="font-bold text-lg">{currentTask?.duration_minutes}m</p>
                </div>
              </div>

              <button 
                onClick={() => currentTask?.type === 'questoes' ? setMode('questions') : nextTask()}
                className="group relative w-full max-w-xl py-6 bg-blue-600 rounded-[1.5rem] flex items-center justify-center gap-4 overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="text-white font-black text-2xl uppercase tracking-[0.1em]">
                  {currentTask?.type === 'questoes' ? 'Iniciar Diagnóstico' : 'Confirmar Conclusão'}
                </span>
                <ChevronRight className="w-8 h-8 text-white/50" />
              </button>
            </motion.div>
          )}

          {mode === 'questions' && questions.length > 0 && (
            <motion.div 
              key="questions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-3xl mx-auto"
            >
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-black uppercase bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20">
                     Questão {qIdx + 1} de {questions.length}
                  </span>
                  {currentTask?.is_adaptive && <span className="text-xs font-black uppercase bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full border border-red-500/20">Foco Corretivo</span>}
                </div>
                <h3 className="text-3xl font-black tracking-tight leading-[1.2] text-white/95">
                  {questions[qIdx].text}
                </h3>
              </div>

              <div className="flex flex-col gap-4 mb-12">
                {questions[qIdx].options.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => !showExplanation && setSelectedOpt(i)}
                    disabled={showExplanation}
                    className={`p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group relative overflow-hidden
                      ${selectedOpt === i ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}
                      ${showExplanation && i === questions[qIdx].correct_answer ? 'border-emerald-500 bg-emerald-500/10' : ''}
                      ${showExplanation && selectedOpt === i && i !== questions[qIdx].correct_answer ? 'border-red-500 bg-red-500/10' : ''}
                    `}
                  >
                    <div className="flex items-center gap-5">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border 
                        ${selectedOpt === i ? 'bg-blue-500 border-blue-400' : 'bg-white/5 border-white/10 opacity-30'}
                      `}>
                         {String.fromCharCode(65 + i)}
                      </span>
                      <span className="font-bold text-xl">{opt}</span>
                    </div>
                    {showExplanation && i === questions[qIdx].correct_answer && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
                  </button>
                ))}
              </div>

              {!showExplanation ? (
                <div className="space-y-10 mb-32">
                  <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <p className="text-center text-xs font-black uppercase opacity-40 mb-6 tracking-[0.3em]">Nível de Certeza do Diagnóstico</p>
                    <div className="flex justify-between gap-3">
                       {[1, 2, 3, 4, 5].map((v) => (
                         <button
                           key={v}
                           onClick={() => setConfidence(v)}
                           className={`flex-1 py-5 rounded-2xl border-2 font-black transition-all relative overflow-hidden
                             ${confidence === v ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'border-white/5 bg-white/5 hover:border-white/20 text-white/30'}
                           `}
                         >
                           <span className="relative z-10">{v === 1 ? 'CHUTE' : v === 5 ? 'ELITE' : v}</span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleAnswer}
                    disabled={selectedOpt === null || confidence === null || submitting}
                    className="w-full py-6 bg-white text-slate-950 font-black rounded-[1.5rem] text-2xl flex items-center justify-center gap-4 hover:bg-white/90 active:scale-95 transition-all shadow-2xl disabled:opacity-20"
                  >
                    {submitting ? <Loader2 className="w-8 h-8 animate-spin" /> : 'Confirmar Decisão Técnica'}
                  </button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-10 rounded-[2.5rem] border-2 border-white/5 bg-white/[0.03] backdrop-blur-3xl shadow-2xl mb-32 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <ShieldCheck className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg"><Activity className="w-5 h-5 text-blue-400" /></div>
                    <h4 className="font-black text-sm uppercase tracking-[0.2em] text-white/50">Instrução do Preceptor</h4>
                  </div>
                  <p className="text-white/80 leading-[1.6] mb-10 text-xl font-medium">
                    {questions[qIdx].explanation}
                  </p>
                  <button 
                    onClick={handleNextQuestion}
                    className="w-full py-6 bg-gradient-to-r from-blue-700 to-blue-500 text-white font-black rounded-2xl text-xl flex items-center justify-center gap-3 hover:scale-[1.01] transition-all shadow-lg"
                  >
                    {qIdx < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultado do Módulo'}
                    <ChevronRight className="w-7 h-7" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {mode === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto text-center py-10"
            >
              <div className="relative inline-block mb-12">
                <div className="absolute inset-0 bg-blue-500/40 blur-3xl rounded-full animate-pulse" />
                <div className="relative p-12 bg-slate-900 rounded-full border-4 border-blue-500 shadow-[0_0_80px_rgba(59,130,246,0.6)]">
                  <Trophy className="w-24 h-24 text-blue-500" />
                </div>
              </div>
              
              <h1 className="text-6xl font-black mb-6 tracking-tighter italic">Missão Cumprida</h1>
              <p className="text-white/40 mb-16 text-xl tracking-wide uppercase font-bold">Diagnóstico registrado com sucesso.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                 <div className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-2xl">
                   <div className="text-sm font-black text-blue-400/50 uppercase mb-3 tracking-widest">Taxa de Acerto</div>
                   <div className="text-5xl font-black text-white">{hitRate}%</div>
                 </div>
                 <div className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-2xl relative overflow-hidden">
                   <div className="absolute top-2 right-2"><Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /></div>
                   <div className="text-sm font-black text-yellow-400/50 uppercase mb-3 tracking-widest">XP de Elite</div>
                   <div className="text-5xl font-black text-yellow-400">+{sessionResults.xp}</div>
                 </div>
                 <div className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-2xl">
                   <div className="text-sm font-black text-purple-400/50 uppercase mb-3 tracking-widest">Consolidação</div>
                   <div className="text-5xl font-black text-purple-400">Sólida</div>
                 </div>
              </div>

              <div className="flex flex-col gap-6 max-w-xl mx-auto">
                <button 
                  onClick={nextTask}
                  className="w-full py-7 bg-blue-600 text-white font-black rounded-3xl text-3xl flex items-center justify-center gap-4 hover:scale-[1.02] shadow-[0_20px_50px_rgba(37,99,235,0.4)] transition-all"
                >
                  Continuar Fluxo
                  <ChevronRight className="w-8 h-8" />
                </button>
                <button 
                  onClick={() => setMode('questions')}
                  className="flex items-center justify-center gap-3 text-white/30 font-black uppercase text-sm tracking-[0.3em] py-6 hover:text-white transition-all group"
                >
                  <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                  Auditar Ciclo de Erros
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER: PRECEPTOR TELEMETRY */}
      <footer className="px-10 py-6 bg-slate-900/90 border-t border-white/5 flex items-center justify-between backdrop-blur-3xl">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-xs font-black text-white/30 uppercase tracking-[0.1em]">Conectado à Matriz</span>
            </div>
            <div className="flex items-center gap-3 border-l border-white/10 pl-10">
               <Clock className="w-5 h-5 text-blue-500" />
               <span className="text-sm font-bold text-white/50">Sessão: 1h 24m restantes</span>
            </div>
         </div>
         <div className="text-[11px] font-black uppercase tracking-[0.4em] text-white/10">
           Flow-OS v3.2 Powered by Antigravity
         </div>
      </footer>
    </div>
  );
}
