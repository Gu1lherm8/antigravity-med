import { useState } from 'react';
import { ShieldCheck, CheckSquare, Square, AlertCircle, Sparkles } from 'lucide-react';

const C5_ELEMENTS = [
  { id: 'agente', label: 'AGENTE', description: 'Quem executa? (Ex: Ministério da Saúde, GDF)', icon: '🕵️‍♂️' },
  { id: 'acao', label: 'AÇÃO', description: 'O que será feito? (Verbo de ação claro)', icon: '🎬' },
  { id: 'meio', label: 'MEIO/MODO', description: 'Como? (Por meio de..., através de...)', icon: '🛠️' },
  { id: 'efeito', label: 'EFEITO', description: 'Para que? (Afim de..., com o intuito de...)', icon: '🎯' },
  { id: 'detalhamento', label: 'DETALHAMENTO', description: 'Informação extra sobre um dos itens acima.', icon: '📝' },
];

export function C5Checklist() {
  const [checked, setChecked] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (checked.includes(id)) setChecked(prev => prev.filter(i => i !== id));
    else setChecked(prev => [...prev, id]);
  };

  const score = checked.length * 40; // Cada elemento vale 40 pontos no ENEM

  return (
    <div className="glass-card p-8 border-indigo-500/30 bg-black/40 backdrop-blur-3xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <ShieldCheck className="w-40 h-40 text-indigo-500" />
      </div>

      <header className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
           </div>
           <h3 className="text-xl font-black text-white tracking-tight uppercase">Validador C5 (2025)</h3>
        </div>
        <p className="text-text-secondary text-xs font-bold leading-relaxed">
            Certifique-se de que sua Proposta de Intervenção possui todos os elementos para garantir os <span className="text-indigo-400">200 pontos</span> na Competência 5.
        </p>
      </header>

      <div className="space-y-3 relative z-10">
        {C5_ELEMENTS.map((elem) => (
          <button 
            key={elem.id}
            onClick={() => toggle(elem.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              checked.includes(elem.id) 
                ? 'bg-indigo-500/20 border-indigo-500/50 text-white' 
                : 'bg-white/5 border-white/5 text-text-secondary hover:border-white/10'
            }`}
          >
            <div className="text-xl">{elem.icon}</div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <span className="font-black text-[10px] tracking-widest uppercase">{elem.label}</span>
                    {checked.includes(elem.id) ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                </div>
                {checked.includes(elem.id) && (
                    <p className="text-[10px] font-medium leading-relaxed mt-1 text-indigo-200/60 italic overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        {elem.description}
                    </p>
                )}
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] font-black text-text-secondary uppercase block mb-1">Pontuação Projetada</span>
            <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black transition-all ${score === 200 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-white'}`}>
                    {score}
                </span>
                <span className="text-xs font-bold text-text-secondary">/ 200</span>
            </div>
          </div>
          
            {score < 200 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-right-2 duration-200">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Incompleto</span>
                </div>
            )}
            {score === 200 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-in zoom-in-95 duration-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Apta p/ 1000</span>
                </div>
            )}
      </footer>
    </div>
  );
}
