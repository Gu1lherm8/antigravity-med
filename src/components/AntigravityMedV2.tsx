import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  BookOpen, 
  Zap, 
  Search, 
  Target, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  Activity, 
  Brain,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import matrizData from '../data/matriz_enem.json';

// ==================== TYPES ====================

interface Habilidade {
  id: string;
  texto: string;
  explicacao: string;
  comp: number;
}

interface Area {
  area: string;
  slug: string;
  cor: string;
  competencias: string[];
  habilidades: Habilidade[];
}

// ==================== COMPONENTES AUXILIARES ====================

const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
    {children}
  </span>
);

const AreaTab = ({ area, isActive, onClick }: { area: Area, isActive: boolean, onClick: () => void }) => {
  const colorMap: any = {
    teal: 'border-teal-500 text-teal-400',
    indigo: 'border-indigo-500 text-indigo-400',
    emerald: 'border-emerald-500 text-emerald-400',
    orange: 'border-orange-500 text-orange-400'
  };

  const bgMap: any = {
    teal: 'bg-teal-500/10',
    indigo: 'bg-indigo-500/10',
    emerald: 'bg-emerald-500/10',
    orange: 'bg-orange-500/10'
  };

  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-4 rounded-2xl transition-all duration-500 border flex flex-col gap-1 items-start group overflow-hidden ${
        isActive 
          ? `${colorMap[area.cor]} ${bgMap[area.cor]} shadow-[0_0_20px_rgba(0,0,0,0.3)]` 
          : 'border-white/5 text-slate-500 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      {isActive && (
        <div className={`absolute top-0 left-0 w-full h-1 bg-${area.cor}-500 animate-pulse`} />
      )}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{area.area.split(',')[0]}</span>
      <span className={`text-xs font-bold transition-colors ${isActive ? 'text-white' : 'group-hover:text-slate-300'}`}>
        {area.habilidades.length} Habilidades
      </span>
    </button>
  );
};

const CompetenciaCard = ({ text, index, isSelected, onClick, cor }: any) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
        isSelected 
          ? `bg-${cor}-500/20 border-${cor}-500/50 shadow-lg` 
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
      }`}
    >
      <div className="flex gap-3 items-start">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
          isSelected ? `bg-${cor}-500 text-white` : 'bg-white/5 text-slate-500'
        }`}>
          C{index + 1}
        </div>
        <p className={`text-xs leading-relaxed font-medium ${isSelected ? 'text-white' : 'text-slate-400 line-clamp-2'}`}>
          {text.split(': ')[1]}
        </p>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function AntigravityMedV2() {
  const [activeAreaSlug, setActiveAreaSlug] = useState('linguagens');
  const [selectedComp, setSelectedComp] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showLayman, setShowLayman] = useState(true);

  const activeArea = useMemo(() => 
    matrizData.find(a => a.slug === activeAreaSlug) as Area, 
  [activeAreaSlug]);

  const filteredHabilidades = useMemo(() => {
    return activeArea.habilidades.filter(h => {
      const matchesSearch = h.texto.toLowerCase().includes(search.toLowerCase()) || 
                           h.id.toLowerCase().includes(search.toLowerCase()) ||
                           h.explicacao.toLowerCase().includes(search.toLowerCase());
      const matchesComp = selectedComp === null || h.comp === selectedComp;
      return matchesSearch && matchesComp;
    });
  }, [activeArea, search, selectedComp]);

  // Reset comp selection when changing area
  const handleAreaChange = (slug: string) => {
    setActiveAreaSlug(slug);
    setSelectedComp(null);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. HEADER & GLOBAL STATS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-white/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em]">Unidade de Inteligência ENEM</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Prontuário de Habilidades</h2>
          <p className="text-slate-500 text-sm font-medium max-w-xl">
            Análise meticulosa da Matriz de Referência. Cada habilidade é uma ferramenta cirúrgica para sua aprovação.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="glass-card px-6 py-4 border-white/5 bg-white/[0.02] flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Habilidades Totais</span>
            <span className="text-2xl font-black text-white">120</span>
          </div>
          <div className="glass-card px-6 py-4 border-teal-500/20 bg-teal-500/5 flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Modo Dashboard</span>
            <span className="text-2xl font-black text-teal-400 italic font-serif">V3.0</span>
          </div>
        </div>
      </div>

      {/* 2. AREA SELECTION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {matrizData.map((area) => (
          <AreaTab 
            key={area.slug} 
            area={area as any} 
            isActive={activeAreaSlug === area.slug}
            onClick={() => handleAreaChange(area.slug)}
          />
        ))}
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR: Competências da Área */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 text-${activeArea.cor}-400`} />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Competências de Área</h3>
            </div>
            {selectedComp !== null && (
              <button 
                onClick={() => setSelectedComp(null)}
                className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors underline"
              >
                Limpar Filtro
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {activeArea.competencias.map((comp, idx) => (
              <CompetenciaCard 
                key={idx} 
                text={comp} 
                index={idx}
                cor={activeArea.cor}
                isSelected={selectedComp === idx + 1}
                onClick={() => setSelectedComp(selectedComp === idx + 1 ? null : idx + 1)}
              />
            ))}
          </div>

          <div className={`p-6 rounded-2xl border border-${activeArea.cor}-500/10 bg-${activeArea.cor}-500/[0.02]`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 bg-${activeArea.cor}-500/20 rounded-lg text-${activeArea.cor}-400`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Análise de Peso (TRI)</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              {activeAreaSlug === 'matematica' || activeAreaSlug === 'natureza' 
                ? "Esta área possui alto potencial de alavancagem na nota final. Foque em acertar as fáceis e médias para garantir consistência pedagógica."
                : "Área de alta densidade interpretativa. A coerência entre as competências de leitura e análise crítica é vital para superar os 750 pontos."}
            </p>
          </div>
        </div>

        {/* FEED: Habilidades Detalhadas */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Search & Toggle */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar habilidade por termo ou código (ex: H18)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.05] transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowLayman(!showLayman)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                showLayman 
                  ? 'bg-teal-500 text-black border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Brain className="w-4 h-4" />
              {showLayman ? 'Explicação Simples ON' : 'Modo Técnico ON'}
            </button>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredHabilidades.map((h) => (
              <div 
                key={h.id} 
                className="glass-card group p-6 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-teal-500/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex gap-6 items-start relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-${activeArea.cor}-500/20 group-hover:border-${activeArea.cor}-500/30`}>
                    <span className={`text-lg font-black tracking-tighter ${
                      showLayman ? 'text-teal-400' : 'text-slate-300'
                    }`}>
                      {h.id}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Competência {h.comp}</span>
                      {showLayman && <div className="w-1 h-1 rounded-full bg-teal-500/30" />}
                      {showLayman && <span className="text-[10px] font-black text-teal-500/60 uppercase tracking-widest italic">Inteligência Simplificada</span>}
                    </div>
                    
                    <h5 className={`text-sm md:text-base font-bold leading-relaxed transition-all duration-300 ${
                      showLayman ? 'text-slate-100 italic' : 'text-slate-300'
                    }`}>
                      {showLayman ? h.explicacao : h.texto}
                    </h5>

                    {!showLayman && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                        <Info className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-medium">Texto Oficial INEP/MEC</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex flex-col items-end gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Decorative background number */}
                <span className="absolute -right-4 -bottom-6 text-8xl font-black text-white/[0.02] pointer-events-none select-none group-hover:text-white/[0.04] transition-colors">
                  {h.id}
                </span>
              </div>
            ))}

            {filteredHabilidades.length === 0 && (
              <div className="py-20 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <Search className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-300">Nenhum resultado clínico</h3>
                <p className="text-slate-500 text-sm max-w-xs">
                  Não encontramos habilidades para "{search}" nesta área ou competência. Tente outro termo ou limpe os filtros.
                </p>
                <button 
                  onClick={() => { setSearch(''); setSelectedComp(null); }}
                  className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-black text-white transition-all uppercase tracking-widest border border-white/10"
                >
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
