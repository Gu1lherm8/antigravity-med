import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  BookOpen, 
  Trophy,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sounds } from '../lib/intelligence/SoundService';
import type { StudyPlan } from '../lib/intelligence/Planner';
import { updateSM2AfterAttempt } from '../lib/intelligence/intelligenceQueries';

interface FocusPlayerProps {
  plan: StudyPlan;
  onClose: () => void;
}

export function FocusPlayer({ plan, onClose }: FocusPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Quiz State
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);

  const currentTask = plan.tasks[currentIdx];

  // Carregar questões se a tarefa for de QUESTOES
  useEffect(() => {
    if (currentTask?.type === 'QUESTOES') {
      async function loadQuestions() {
        setQuestions([]);
        setQIdx(0);
        const { data } = await supabase
          .from('questions')
          .select('*')
          .eq('topic', currentTask.topic)
          .limit(5);
        if (data && data.length > 0) setQuestions(data);
      }
      loadQuestions();
    }
  }, [currentTask]);

  // Sincronização de sons e início de tarefa
  useEffect(() => {
     if (completed) {
       sounds.playMissionComplete();
     } else if (currentTask) {
       sounds.playTaskStart();
     }
  }, [currentIdx, completed]);

  const handleNextTask = () => {
    if (currentIdx < plan.tasks.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setShowExplanation(false);
      setSelectedOpt(null);
      setConfidence(null);
      setErrorType(null);
    } else {
      setCompleted(true);
    }
  };

  const handleAnswer = async () => {
    if (!selectedOpt || confidence === null || submitting) return;
    setSubmitting(true);
    
    const question = questions[qIdx];
    const isCorrect = selectedOpt === question.correct_answer;

    if (isCorrect) sounds.playSuccess();
    else sounds.playError();

    await supabase.from('attempts').insert({
      question_id: question.id,
      student_answer: selectedOpt,
      is_correct: isCorrect,
      confidence_level: confidence,
      user_id: null
    });

    await updateSM2AfterAttempt(question.id, null, confidence, isCorrect);
    
    setShowExplanation(true);
    setSubmitting(false);
  };

  const handleNextQuestion = () => {
    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
      setSelectedOpt(null);
      setConfidence(null);
      setShowExplanation(false);
      setErrorType(null);
    } else {
      handleNextTask();
    }
  };

  if (completed) {
     return (
        <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6 bg-gradient-to-b from-indigo-900/40 to-background backdrop-blur-3xl">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-12 max-w-xl text-center border-indigo-500/50 shadow-[0_0_80px_rgba(79,70,229,0.3)]">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                <h2 className="text-4xl font-black text-white mb-4">MISSAO CUMPRIDA!</h2>
                <p className="text-text-secondary text-lg mb-10 leading-relaxed">Você seguiu o piloto automático e eliminou as lacunas de hoje. <br />Sua rede neural agradece.</p>
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="block text-[10px] font-black text-text-secondary uppercase">Pontos Ganhos</span>
                        <span className="text-2xl font-black text-white">+180 EXP</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="block text-[10px] font-black text-text-secondary uppercase">Tempo Total</span>
                        <span className="text-2xl font-black text-white">{plan.availableTimeMinutes}m</span>
                    </div>
                </div>
                <button onClick={onClose} className="btn-primary w-full py-5 text-xl font-black rounded-3xl">Retornar à Unidade</button>
            </motion.div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0C14] flex flex-col overflow-hidden text-white selection:bg-indigo-500/30">
      
      {/* BARRA DE PROGRESSO DO PILOTO */}
      <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6 flex-1">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="w-6 h-6 text-text-secondary" />
          </button>
          <div className="flex flex-col">
            <h3 className="font-black text-xl tracking-tighter uppercase leading-none">Piloto Automático</h3>
            <span className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest">Modo Foco Ativo</span>
          </div>
          
          <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
          
          <div className="hidden md:flex items-center gap-3">
             <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                   className="h-full bg-indigo-500 transition-all duration-700" 
                   style={{ width: `${((currentIdx + 1) / plan.tasks.length) * 100}%` }} 
                />
             </div>
             <span className="text-xs font-black text-white">{currentIdx + 1} de {plan.tasks.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/30">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-black text-white tabular-nums">14:59</span>
           </div>
        </div>
      </header>

      {/* ÁREA DE EXECUÇÃO DA TAREFA */}
      <main className="flex-1 overflow-y-auto px-6 py-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          
          <AnimatePresence mode="wait">
            <motion.div 
               key={currentTask.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex flex-col gap-8"
            >
               {/* TEMA DA MISSÃO ATUAL */}
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                     {currentTask.type === 'QUESTOES' ? <Zap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                     Módulo {currentIdx + 1} • {currentTask.subject}
                  </div>
                  <h1 className="text-4xl font-black tracking-tight">{currentTask.title}</h1>
               </div>

               {/* RENDERIZADOR BASEADO NO TIPO */}
               {currentTask.type === 'QUESTOES' && (
                  <div className="flex flex-col gap-8">
                     {questions.length > 0 ? (
                        <div className="flex flex-col gap-8">
                           <p className="text-xl text-text-secondary leading-relaxed font-medium">
                              {questions[qIdx].text}
                           </p>

                           {!showExplanation ? (
                              <div className="grid grid-cols-1 gap-4">
                                 {Object.entries(questions[qIdx].options).map(([key, text]) => (
                                    <button 
                                       key={key} 
                                       onClick={() => setSelectedOpt(key)}
                                       className={`p-6 rounded-2xl border text-left transition-all flex items-center gap-6 ${selectedOpt === key ? 'bg-indigo-600/20 border-indigo-500 shadow-xl shadow-indigo-900/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                    >
                                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${selectedOpt === key ? 'bg-indigo-500 text-white' : 'bg-white/10 text-text-secondary'}`}>{key}</div>
                                       <span className={selectedOpt === key ? 'text-white font-bold' : 'text-text-secondary'}>{String(text)}</span>
                                    </button>
                                 ))}
                              </div>
                           ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                 <div className={`p-8 rounded-3xl border-2 flex items-center gap-6 ${selectedOpt === questions[qIdx].correct_answer ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                                    {selectedOpt === questions[qIdx].correct_answer ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                                    <div>
                                       <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedOpt === questions[qIdx].correct_answer ? 'Diagnóstico Correto!' : 'Patologia Detectada'}</h3>
                                       <p className="text-sm font-bold opacity-80">Gabarito: Alternativa {questions[qIdx].correct_answer}</p>
                                    </div>
                                 </div>
                                 
                                 {/* FEEDBACK DE ERRO (SOLICITADO) */}
                                 {selectedOpt !== questions[qIdx].correct_answer && (
                                    <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                                       <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Classifique o motivo do erro</p>
                                       <div className="flex gap-2">
                                          {['Teoria', 'Interpretação', 'Cálculo'].map(t => (
                                             <button 
                                                key={t}
                                                onClick={() => { sounds.playClickAccent(); setErrorType(t); }}
                                                className={`flex-1 py-4 rounded-xl border-2 text-xs font-black transition-all ${errorType === t ? 'bg-red-500 border-red-400 text-white scale-105' : 'bg-transparent border-white/10 text-text-secondary hover:border-white/20'}`}
                                             >{t}</button>
                                          ))}
                                       </div>
                                    </div>
                                 )}

                                 <div className="p-8 bg-white/5 rounded-3xl border border-white/5 border-l-4 border-l-indigo-400">
                                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Explicação Clínica</h4>
                                    <p className="text-text-secondary leading-relaxed font-bold italic">
                                       "Este tópico exige atenção às bases de {currentTask.topic}. O erro aqui indica uma falha na correlação entre os dados do enunciado e a base teórica."
                                    </p>
                                 </div>

                                 <button onClick={handleNextQuestion} className="w-full btn-primary py-5 text-xl font-black flex items-center justify-center gap-4">
                                    {qIdx < questions.length - 1 ? 'Próxima Questão' : 'Concluir Bloco'}
                                    <ChevronRight className="w-6 h-6" />
                                 </button>
                              </motion.div>
                           )}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center py-20 opacity-30">
                           <Loader2 className="w-12 h-12 animate-spin mb-4" />
                           <p className="font-bold">Sincronizando questões do tópico...</p>
                        </div>
                     )}
                  </div>
               )}

               {currentTask.type === 'REVISAO_TEORICA' && (
                  <div className="flex flex-col gap-8">
                     <div className="glass-card p-10 space-y-8 bg-indigo-500/5 border-indigo-500/20">
                        <div className="flex items-center gap-4 mb-2">
                           <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                              <BookOpen className="w-6 h-6 text-white" />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-white tracking-tighter">TRATAMENTO DE BASE</h3>
                              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Resumo Estratégico da IA</p>
                           </div>
                        </div>

                        <div className="space-y-6 text-xl text-text-secondary leading-relaxed">
                           <p>Para o tópico de <strong className="text-white font-black">{currentTask.topic}</strong>, os pontos fundamentais são:</p>
                           <ul className="list-disc pl-6 space-y-4">
                              <li>Identificar a correlação direta entre o sintoma e a base teórica.</li>
                              <li>Aplicar a fórmula de proficiência em cada etapa do diagnóstico.</li>
                              <li>Evitar distrações baseadas em dados secundários do enunciado.</li>
                           </ul>
                        </div>

                        <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center gap-4">
                           <div className="w-2 h-12 bg-indigo-400 rounded-full" />
                           <p className="text-sm font-medium italic text-indigo-200">"A base teórica é o alicerce onde o Theta é construído. Não pule essa etapa."</p>
                        </div>
                     </div>
                     <button onClick={handleNextTask} className="btn-primary py-5 text-xl font-black flex items-center justify-center gap-4">
                        Marcar como Revisado
                        <CheckCircle2 className="w-6 h-6" />
                     </button>
                  </div>
               )}

               {currentTask.type === 'FLASHCARDS' && (
                  <div className="flex flex-col items-center py-10 gap-10">
                     <div className="w-full aspect-[4/3] max-w-lg glass-card flex flex-col items-center justify-center p-12 text-center text-3xl font-black leading-tight border-2 border-indigo-500/50 shadow-[0_0_50px_rgba(79,70,229,0.15)]">
                        O que caracteriza a Curva de Esquecimento e como o SM-2 a combate?
                     </div>
                     <p className="text-text-secondary animate-pulse uppercase text-[10px] font-black tracking-widest">Toque para revelar a cura</p>
                     <button onClick={handleNextTask} className="w-full btn-primary py-5 text-xl font-black">Mostrar Resposta</button>
                  </div>
               )}
            </motion.div>
          </AnimatePresence>

          {/* RODAPÉ DO SELETOR DE CONFIANÇA */}
          {currentTask.type === 'QUESTOES' && selectedOpt && !showExplanation && (
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
                <div className="glass-card p-6 bg-black/80 backdrop-blur-3xl border-white/10 flex flex-col gap-4 shadow-2xl">
                   <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] text-center">Nível de Segurança para o Algoritmo</h4>
                   <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map(v => (
                        <button 
                           key={v}
                           onClick={() => setConfidence(v)}
                           className={`flex-1 py-4 rounded-xl border-2 font-black transition-all ${confidence === v ? 'bg-indigo-600 border-indigo-400 text-white scale-105' : 'bg-transparent border-white/5 text-text-secondary hover:border-white/10'}`}
                        >{v}</button>
                     ))}
                   </div>
                   <button 
                     disabled={confidence === null || submitting}
                     onClick={() => { sounds.playClickAccent(); handleAnswer(); }}
                     className="w-full py-5 bg-white text-black font-black rounded-3xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-30 shadow-2xl"
                   >
                     {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRMAR DIAGNÓSTICO'}
                   </button>
                </div>
             </motion.div>
          )}

        </div>
      </main>

    </div>
  );
}
