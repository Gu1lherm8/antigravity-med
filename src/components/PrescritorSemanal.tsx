import React from 'react';
import { 
  Brain, CalendarDays
} from 'lucide-react';
import { ConfigurarCerebro } from './ConfigurarCerebro';

// ─── Componente Principal ────────────────────────────────────────

export function PrescritorSemanal({ onNavigateToCalendar }: { onNavigateToCalendar?: () => void }) {
  return (
    <div className="flex flex-col gap-8 max-width-6xl mx-auto w-full pb-20">

      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Cérebro Central</h2>
            <p className="text-text-secondary text-sm font-medium">
              Configure sua carga horária e selecione as aulas da semana. O Cérebro cuida do resto.
            </p>
          </div>
        </div>
        <button 
          onClick={onNavigateToCalendar} 
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 hover:bg-teal-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.15)] group shrink-0"
        >
          <CalendarDays className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Ver Calendário</span>
        </button>
      </header>

      {/* Seção 1 — Calibrar Cérebro (Centralizado) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <span className="text-[10px] font-black">1</span>
          </div>
          <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">
            Configure sua agenda de estudos
          </span>
        </div>
        <ConfigurarCerebro onNavigateToCalendar={onNavigateToCalendar} />
      </section>

    </div>
  );
}
