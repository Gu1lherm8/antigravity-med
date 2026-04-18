// ==========================================
// components/study/DailyStudyFlow.tsx
// Interface de estudo que aparece quando
// o usuário clica em "Começar Sessão".
// Tem timer, questões e registra performance.
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Clock, CheckCircle2, XCircle, ChevronRight,
  Brain, Zap, Trophy, ArrowLeft, Timer
} from 'lucide-react';
import { useRealTimePerformance } from '../../hooks/useRealTimePerformance';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topicId: string;
}

interface DailyStudyFlowProps {
  userId: string;
  taskTitle: string;
  taskType: 'theory' | 'questions' | 'review' | 'flashcards';
  topicId: string | null;
  durationMinutes: number;
  onComplete: () => void;
  onBack: () => void;
}

// ── Banco de questões exemplo (substituir por API real futuramente) ──
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'O que é Meiose?',
    options: [
      'Divisão celular que reduz o número de cromossomos pela metade',
      'Divisão celular que dobra o número de cromossomos',
      'Processo de síntese de proteínas',
      'Tipo de transporte celular'
    ],
    correctIndex: 0,
    explanation: 'A Meiose é o processo de divisão celular que resulta em células haploides (metade da quantidade de cromossomos). Fundamental para reprodução sexuada.',
    topicId: 'meiose',
  },
  {
    id: 'q2',
    text: 'Quantas fases principais a Meiose possui?',
    options: ['1 fase', '2 fases', '3 fases', '4 fases'],
    correctIndex: 1,
    explanation: 'A Meiose possui 2 divisões: Meiose I (divisão reducional) e Meiose II (divisão equacional).',
    topicId: 'meiose',
  },
  {
    id: 'q3',
    text: 'Qual a principal diferença entre Mitose e Meiose?',
    options: [
      'A Mitose produz células haploides, Meiose produz diploides',
      'A Meiose produz células haploides, Mitose produz diploides',
      'Ambas produzem o mesmo resultado',
      'A Mitose ocorre apenas em organismos unicelulares'
    ],
    correctIndex: 1,
    explanation: 'Na Meiose, o resultado são células haploides (n), usadas na reprodução. Na Mitose, as células resultantes são diploides (2n), idênticas à célula-mãe.',
    topicId: 'meiose',
  },
];

// ── Componente ─────────────────────────────────────────────────────
export function DailyStudyFlow({
  userId, taskTitle, taskType, topicId,
  durationMinutes, onComplete, onBack,
}: DailyStudyFlowProps) {
  const totalSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; time: number }[]>([]);
  const [phase, setPhase] = useState<'studying' | 'done'>('studying');
  const [feedback, setFeedback] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  const { recordAnswer } = useRealTimePerformance(userId);

  // Questões: filtrar pelo tópico ou usar as de exemplo
  const questions = SAMPLE_QUESTIONS;
  const question = questions[currentQ];

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done') return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, phase]);

  const timeFormatted = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
  const timePercent = (timeLeft / totalSeconds) * 100;
  const timerColor = timeLeft < 30 ? 'text-red-400' : timeLeft < 60 ? 'text-amber-400' : 'text-teal-400';

  // ── Responder questão ─────────────────────────────────────────
  async function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);

    const correct = idx === question.correctIndex;
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = Date.now();

    const fb = await recordAnswer(topicId || question.topicId, correct, timeSpent);
    setFeedback(fb.message);
    setShowExplanation(true);
    setResults(prev => [...prev, { correct, time: timeSpent }]);
  }

  // ── Próxima questão ───────────────────────────────────────────
  function handleNext() {
    if (currentQ >= questions.length - 1) {
      handleFinish();
    } else {
      setCurrentQ(p => p + 1);
      setSelected(null);
      setShowExplanation(false);
      setFeedback(null);
    }
  }

  // ── Finalizar sessão ──────────────────────────────────────────
  function handleFinish() {
    setPhase('done');
  }

  // ── Tela de conclusão ─────────────────────────────────────────
  if (phase === 'done') {
    const corrects = results.filter(r => r.correct).length;
    const accuracy = results.length > 0 ? Math.round((corrects / results.length) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-2xl" />
          <div className="relative w-24 h-24 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-teal-400" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Sessão Concluída</span>
          <h2 className="text-4xl font-black text-white tracking-tighter">{taskTitle}</h2>
          <p className="text-slate-400 font-medium">Seu desempenho foi registrado no plano.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          {[
            { label: 'Acertos', value: `${corrects}/${results.length}`, color: 'text-teal-400' },
            { label: 'Precisão', value: `${accuracy}%`, color: accuracy >= 70 ? 'text-teal-400' : 'text-amber-400' },
            { label: 'Minutos', value: `${durationMinutes - Math.floor(timeLeft / 60)}`, color: 'text-indigo-400' },
          ].map(m => (
            <div key={m.label} className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col gap-1">
              <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
            </div>
          ))}
        </div>

        {accuracy < 70 && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl max-w-sm w-full text-left">
            <Brain className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200 font-medium">
              Este tópico foi marcado para <strong>revisão prioritária</strong>. O Secretário vai reforçá-lo no próximo plano.
            </p>
          </div>
        )}

        <button
          onClick={onComplete}
          className="w-full max-w-sm py-4 bg-teal-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-teal-400 transition-all shadow-[0_10px_30px_rgba(20,184,166,0.3)]"
        >
          Concluir e Voltar ao Plano
        </button>
      </div>
    );
  }

  // ── Tela de Teoria / Revisão ──────────────────────────────────
  if (taskType === 'theory' || taskType === 'review') {
    return (
      <div className="flex flex-col gap-8">
        {/* Header */}
        <StudyHeader
          taskTitle={taskTitle}
          timeFormatted={timeFormatted}
          timePercent={timePercent}
          timerColor={timerColor}
          onBack={onBack}
        />

        {/* Conteúdo de teoria */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-teal-400" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">{taskTitle}</h3>
          </div>
          <p className="text-slate-400 font-medium leading-relaxed">
            Use esse tempo para revisar seu material sobre <strong className="text-white">{taskTitle}</strong>. 
            Leia seu resumo, assista a aula do cursinho ou crie mapas mentais.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['📖 Resumo pessoal', '🎥 Vídeo-aula', '🗺️ Mapa mental', '📝 Anotações'].map(s => (
              <div key={s} className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl text-sm font-bold text-teal-300">
                {s}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleFinish}
          className="py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] transition-all"
        >
          Concluí a Revisão
        </button>
      </div>
    );
  }

  // ── Tela de Questões ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <StudyHeader
        taskTitle={taskTitle}
        timeFormatted={timeFormatted}
        timePercent={timePercent}
        timerColor={timerColor}
        onBack={onBack}
      />

      {/* Progresso das questões */}
      <div className="flex items-center gap-3">
        {questions.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < currentQ ? 'bg-teal-500' :
            i === currentQ ? 'bg-white' : 'bg-white/10'
          }`} />
        ))}
        <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">
          {currentQ + 1}/{questions.length}
        </span>
      </div>

      {/* Questão */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 flex flex-col gap-6">
        <p className="text-xl font-black text-white leading-snug">{question.text}</p>

        <div className="flex flex-col gap-3">
          {question.options.map((option, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === question.correctIndex;
            const showResult = selected !== null;

            let style = 'bg-white/5 border-white/10 text-slate-300';
            if (showResult && isCorrect) style = 'bg-teal-500/20 border-teal-500 text-white';
            if (showResult && isSelected && !isCorrect) style = 'bg-red-500/20 border-red-500 text-white';

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={selected !== null}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${style} ${selected === null ? 'hover:border-teal-500/50 hover:bg-teal-500/5 cursor-pointer' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${
                  showResult && isCorrect ? 'bg-teal-500 text-black' :
                  showResult && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                  'bg-white/10 text-slate-400'
                }`}>
                  {showResult && isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                   showResult && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> :
                   String.fromCharCode(65 + idx)}
                </div>
                <span className="font-bold text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explicação */}
        {showExplanation && (
          <div className="p-5 bg-teal-500/5 border border-teal-500/15 rounded-2xl flex flex-col gap-2 animate-in fade-in duration-300">
            <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Explicação</p>
            <p className="text-sm text-slate-300 leading-relaxed">{question.explanation}</p>
            {feedback && (
              <p className="text-xs font-bold text-teal-400 mt-1">{feedback}</p>
            )}
          </div>
        )}
      </div>

      {/* Botão Próxima */}
      {showExplanation && (
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-3 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] transition-all animate-in fade-in"
        >
          {currentQ >= questions.length - 1 ? 'Ver Resultado' : 'Próxima Questão'}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ── Subcomponente: Header com timer ───────────────────────────────
function StudyHeader({ taskTitle, timeFormatted, timePercent, timerColor, onBack }: {
  taskTitle: string;
  timeFormatted: string;
  timePercent: number;
  timerColor: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex-1 text-center">
        <p className="text-sm font-black text-white truncate">{taskTitle}</p>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
        <Timer className={`w-4 h-4 ${timerColor}`} />
        <span className={`text-lg font-black font-mono ${timerColor}`}>{timeFormatted}</span>
      </div>
    </div>
  );
}
