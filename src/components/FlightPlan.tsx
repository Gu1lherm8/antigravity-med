import { Calendar, Clock, Target, Zap, Play } from 'lucide-react';
import type { StudyPlan } from '../lib/intelligence/Planner';

interface FlightPlanProps {
  plan: StudyPlan | null;
  onStart: () => void;
}

export function FlightPlan({ plan, onStart }: FlightPlanProps) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-6 text-center">
        <div className="p-6 bg-white/5 rounded-full border border-white/10 animate-pulse">
          <Calendar className="w-12 h-12 text-text-secondary" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sem Missão Ativa</h2>
          <p className="text-text-secondary font-medium">Você ainda não gerou seu Plano de Voo para hoje. Acesse o Painel Principal para decolar!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-2xl">
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black">Plano de Voo do Dia</h2>
        </div>
        <p className="text-text-secondary font-medium uppercase tracking-widest text-[10px]">
          Sincronizado com o <span className="text-indigo-400 font-black">DecisionEngine v12</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 relative">
        <div className="absolute left-[39px] top-10 bottom-10 w-[2px] bg-white/5"></div>
        
        {plan.tasks.map((task, idx) => (
          <div key={task.id} className="flex gap-8 group">
            <div className="relative flex-shrink-0">
               <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all ${
                 idx === 0 
                  ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                  : 'bg-white/5 border-white/10'
               }`}>
                 <Zap className={`w-8 h-8 ${idx === 0 ? 'text-white' : 'text-text-secondary'}`} />
               </div>
            </div>

            <div className="flex-1 glass-card p-6 flex items-center justify-between hover:bg-white/[0.04] transition-all cursor-default">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 text-text-secondary rounded">
                     {task.subject}
                   </span>
                   <span className="text-xs font-bold text-indigo-400">
                     {task.topic}
                   </span>
                </div>
                <h4 className="text-xl font-black text-white">{task.title}</h4>
                <div className="flex items-center gap-4 text-xs font-bold text-text-secondary">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.durationMinutes} minutos</span>
                  <span className="flex items-center gap-1"><Target className="w-4 h-4" /> Peso: {task.priorityScore}</span>
                </div>
              </div>

              {idx === 0 && (
                <button 
                  onClick={onStart}
                  className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  DECOLAR
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
