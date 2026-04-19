// ============================================================
// components/DataWarmupBanner.tsx
// Aviso contextual para funcionalidades que precisam de dados
// acumulados para funcionar com precisão.
// ============================================================

import { FlaskConical, Clock, TrendingUp, ChevronRight } from 'lucide-react';

export type WarmupVariant = 'inline' | 'overlay' | 'card';

interface DataWarmupBannerProps {
  /** Título curto do aviso */
  title?: string;
  /** O que a funcionalidade vai fazer quando tiver dados suficientes */
  whatItDoes: string;
  /** Quais dados ela precisa acumular */
  needs: string[];
  /** Estimativa de quando começa a funcionar bem */
  timeEstimate?: string;
  /** Estilo visual: inline (faixa), overlay (sobrepõe o gráfico), card (independente) */
  variant?: WarmupVariant;
  /** Oculta o componente — use quando já tiver dados */
  hidden?: boolean;
}

export function DataWarmupBanner({
  title = 'Aguardando dados',
  whatItDoes,
  needs,
  timeEstimate = '1-2 semanas de uso',
  variant = 'inline',
  hidden = false,
}: DataWarmupBannerProps) {
  if (hidden) return null;

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-2xl overflow-hidden">
        {/* Blur suave no fundo */}
        <div className="absolute inset-0 bg-[#05060A]/70 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center max-w-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Em Aquecimento</p>
          <p className="text-sm text-white font-bold leading-snug">{whatItDoes}</p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <Clock className="w-3 h-3" />
            Ativo após {timeEstimate}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="w-full rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Em Aquecimento</p>
            <p className="text-sm font-black text-white">{title}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{whatItDoes}</p>
        <div className="flex flex-col gap-1.5">
          {needs.map((need, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-slate-500">
              <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />
              {need}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <TrendingUp className="w-3 h-3 text-indigo-400" />
          <p className="text-[10px] text-indigo-400 font-bold">Previsão de ativação: {timeEstimate}</p>
        </div>
      </div>
    );
  }

  // variant === 'inline' (padrão)
  return (
    <div className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/8">
      <FlaskConical className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/20">
            EM AQUECIMENTO
          </span>
          <span className="text-xs font-bold text-white">{title}</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{whatItDoes}</p>
        <p className="text-[9px] text-indigo-400/60 flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          Análise completa disponível após {timeEstimate}
        </p>
      </div>
    </div>
  );
}
