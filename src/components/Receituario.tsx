import React, { useState } from 'react';
import {
  Clock, Zap, AlertTriangle, CheckCircle2, ChevronRight,
  Brain, Activity, Timer, FlaskConical, Target,
  Stethoscope, TrendingUp, RotateCcw, AlertCircle, Sparkles
} from 'lucide-react';
import { generatePrescription, savePrescription, type PrescriptionTask } from '../lib/intelligence/intelligenceQueries';

// ─── Constantes Visuais ────────────────────────────────────────────────
type UrgencyKey = 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';

const URGENCY_CONFIG: Record<UrgencyKey, {
  color: string; bg: string; border: string; dot: string; badge: string; pulse: boolean;
}> = {
  'CRÍTICA': { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400',    badge: 'bg-red-500/20 text-red-400 border-red-500/30',    pulse: true  },
  'ALTA':    { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', pulse: false },
  'MÉDIA':   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', pulse: false },
  'BAIXA':   { color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    dot: 'bg-sky-400',    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',    pulse: false },
};

const TASK_ICONS: Record<string, React.ReactNode> = {
  'Correção de Erro':     <AlertTriangle className="w-4 h-4" />,
  'Dose de Reforço':     <Activity className="w-4 h-4" />,
  'Diagnóstico Inicial': <Stethoscope className="w-4 h-4" />,
  'Check-up Geral':      <CheckCircle2 className="w-4 h-4" />,
};

// ─── Cartão de Tarefa ─────────────────────────────────────────────────
function TaskCard({ task, index }: { task: PrescriptionTask; index: number }) {
  const cfg = URGENCY_CONFIG[task.urgencyLevel as UrgencyKey] ?? URGENCY_CONFIG['BAIXA'];
  return (
    <div
      className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} p-6 flex items-center gap-6 overflow-hidden`}
      style={{ opacity: 1 }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${cfg.dot}`} />
      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xs border flex-shrink-0 ${cfg.border} ${cfg.bg}`}>
        <span className={`text-[9px] uppercase tracking-widest opacity-70 ${cfg.color}`}>Dose</span>
        <span className={`text-xl ${cfg.color}`}>{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{task.discipline}</span>
          <ChevronRight className="w-3 h-3 text-text-secondary opacity-30" />
          <span className="text-sm font-bold text-text-primary truncate">{task.topic}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${cfg.badge}`}>
            {task.urgencyLevel}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-text-secondary">
            {TASK_ICONS[task.taskType] ?? null}
            {task.taskType}
          </span>
          <span className="text-[10px] font-bold text-text-secondary opacity-50">
            Score: <span className={`${cfg.color} opacity-100`}>{task.priorityScore.toFixed(1)}</span>
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className={`flex items-center gap-1 font-black ${cfg.color}`}>
          <Timer className="w-4 h-4" />
          <span className="text-lg">{task.estimatedMinutes}</span>
        </div>
        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">min</span>
      </div>
    </div>
  );
}

// ─── Estado Vazio ─────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="glass-card p-16 flex flex-col items-center justify-center text-center gap-6 border-dashed border-success/20">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-success" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-success mb-2">Prontuário Limpo!</h3>
        <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
          Nenhum ponto cego detectado. Faça o Diagnóstico do Dia para a IA gerar uma prescrição baseada nos seus erros reais.
        </p>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────
export function Receituario() {
  const [time, setTime] = useState('');
  const [tasks, setTasks] = useState<PrescriptionTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [shockTherapy, setShockTherapy] = useState(false);

  const timeOptions = [
    { label: '5 min',  value: 5,   icon: '⚡', desc: 'Terapia de Choque' },
    { label: '15 min', value: 15,  icon: '💊', desc: 'Dose Rápida' },
    { label: '30 min', value: 30,  icon: '🔬', desc: 'Protocolo Padrão' },
    { label: '60 min', value: 60,  icon: '🏥', desc: 'Internação Completa' },
    { label: '2h',     value: 120, icon: '🧬', desc: 'Cirurgia Orbital' },
  ];

  async function handleGenerate() {
    const minutes = parseInt(time);
    if (!minutes || minutes <= 0 || isLoading) return;

    setIsLoading(true);

    // Pequeno delay para garantir que o React renderizou o estado loading antes do await
    await new Promise(r => setTimeout(r, 50));

    try {
      const prescription = await generatePrescription(minutes);
      setTasks(prescription);
      setTotalMinutes(prescription.reduce((s, t) => s + t.estimatedMinutes, 0));
      setShockTherapy(minutes < 10);
      setHasGenerated(true);

      if (prescription.length > 0) {
        try {
          const maxScore = Math.max(...prescription.map(t => t.priorityScore));
          await savePrescription(minutes, prescription, maxScore);
          setIsSaved(true);
        } catch {
          /* RLS sem auth — não crítico */
        }
      }
    } catch (err) {
      console.error('Erro ao gerar prescrição:', err);
    }

    setIsLoading(false);
  }

  function handleReset() {
    setTasks([]);
    setHasGenerated(false);
    setTime('');
    setIsSaved(false);
    setIsLoading(false);
  }

  const criticalCount = tasks.filter(t => t.urgencyLevel === 'CRÍTICA').length;
  const highCount     = tasks.filter(t => t.urgencyLevel === 'ALTA').length;

  return (
    <div className="flex flex-col gap-10">

      {/* Cabeçalho */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter">Receituário Prescrito</h2>
            <p className="text-text-secondary text-sm mt-0.5">Motor de IA SM-2 · Personalizado pelo seu histórico de erros</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">DecisionEngine Ativo</span>
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2">
            <RotateCcw className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">SM-2 Calibrado</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Supabase Conectado</span>
          </div>
        </div>
      </header>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="glass-card p-16 flex flex-col items-center justify-center gap-6 border-primary/20">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-primary">Consultando Prontuário...</p>
            <p className="text-sm text-text-secondary mt-1">Motor SM-2 e DecisionEngine processando seus dados</p>
          </div>
        </div>
      )}

      {/* Formulário */}
      {!hasGenerated && !isLoading && (
        <div className="glass-card p-8 flex flex-col gap-8 border-primary/20">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              Quanto tempo você tem hoje?
            </h3>
            <p className="text-sm text-text-secondary">
              A IA vai montar um protocolo de estudos personalizado encaixado no seu tempo, baseado nos seus erros mais críticos.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {timeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTime(String(opt.value))}
                className={`flex flex-col items-center gap-1 p-4 rounded-2xl border font-bold transition-all
                  ${time === String(opt.value)
                    ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20 scale-105'
                    : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary'
                  }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-black">{opt.label}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="number"
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="Ou digite o tempo em minutos..."
                min={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold
                  text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50
                  focus:bg-primary/5 transition-all"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!time || parseInt(time) <= 0}
              className="btn-primary py-4 px-10 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Brain className="w-5 h-5" />
              Gerar Prescrição
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {time && parseInt(time) < 10 && (
            <div className="flex items-center gap-3 bg-alert/10 border border-alert/20 rounded-2xl p-5">
              <Zap className="w-5 h-5 text-alert flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-alert">Modo Terapia de Choque Ativado!</p>
                <p className="text-xs text-text-secondary mt-0.5">Menos de 10 minutos? Apenas a questão mais crítica. Cirurgia rápida.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {hasGenerated && !isLoading && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex items-center justify-between gap-4 border-primary/20">
            <div className="flex flex-col gap-1">
              {shockTherapy
                ? <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-alert" />
                    <h3 className="text-xl font-black text-alert uppercase tracking-tighter">TERAPIA DE CHOQUE</h3>
                  </div>
                : <h3 className="text-xl font-black uppercase tracking-tighter">Prescrição do Dia — {time} minutos</h3>
              }
              <p className="text-sm text-text-secondary flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>
                  <span className="text-text-primary font-bold">{tasks.length} {tasks.length === 1 ? 'dose' : 'doses'}</span> ·{' '}
                  <span className="text-text-primary font-bold">{totalMinutes} min</span>
                  {isSaved && <span className="ml-2 text-emerald-400 font-bold">· ✅ Salvo</span>}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <div className="flex flex-col items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-lg font-black text-red-400">{criticalCount}</span>
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Críticos</span>
                </div>
              )}
              {highCount > 0 && (
                <div className="flex flex-col items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-lg font-black text-orange-400">{highCount}</span>
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Altos</span>
                </div>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5
                  text-xs font-bold text-text-secondary hover:text-text-primary hover:border-white/20 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Nova Prescrição
              </button>
            </div>
          </div>

          {tasks.length > 0
            ? <div className="flex flex-col gap-3">
                {tasks.map((task, i) => <TaskCard key={`${task.discipline}-${task.topic}-${i}`} task={task} index={i} />)}
              </div>
            : <EmptyState />
          }

          {tasks.length > 0 && (
            <div className="flex items-start gap-3 p-5 bg-white/3 border border-white/5 rounded-2xl">
              <Brain className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="text-primary font-bold">Como funciona: </span>
                A IA combinou o <span className="text-text-primary font-bold">DecisionEngine</span> (score de prioridade)
                com o <span className="text-text-primary font-bold">algoritmo SM-2</span> (intervalo de revisão).
                Doses vermelhas = atenção imediata.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
