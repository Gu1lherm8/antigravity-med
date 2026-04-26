import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Star, 
  Dna, 
  Zap, 
  Beaker, 
  Calculator, 
  History, 
  Globe, 
  MessageSquare, 
  BookMarked, 
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  ClipboardList
} from 'lucide-react';
import { checklistService } from '../services/checklistService';

// ==================== DADOS EXTRAÍDOS DO PDF ====================

const CHECKLIST_DATA = [
  {
    area: 'Ciências da Natureza',
    icon: <Dna className="w-5 h-5" />,
    cor: 'emerald',
    materias: [
      {
        nome: 'Biologia',
        topicos: [
          { item: 'Introdução à Biologia', priority: false },
          { item: 'Ecologia: Fluxo de Energia', priority: true },
          { item: 'Ecologia: Relações Ecológicas', priority: false },
          { item: 'Ecologia: Ciclos Biogeoquímicos', priority: true },
          { item: 'Ecologia: Sucessão Ecológica, Biomas e Impactos', priority: true },
          { item: 'Bioquímica: Compostos Inorgânicos e Orgânicos', priority: false },
          { item: 'Citologia: Membrana, Transportes e Organelas', priority: false },
          { item: 'Citologia: Metabolismo Energético (Fotos/Resp)', priority: false },
          { item: 'Citologia: Divisão Celular e Síntese Proteica', priority: false },
          { item: 'Genética: Leis de Mendel e Heredogramas', priority: false },
          { item: 'Genética: Grupos Sanguíneos e Herança Sexual', priority: false },
          { item: 'Biotecnologia: Aplicações Modernas', priority: false },
          { item: 'Evolução: Origem da Vida e Teorias', priority: false },
          { item: 'Fisiologia Humana: Sistemas Digestório e Respiratório', priority: true },
          { item: 'Fisiologia Humana: Sistemas Circulatório e Excretor', priority: false },
          { item: 'Fisiologia Humana: Sistemas Endócrino e Nervoso', priority: false },
          { item: 'Fisiologia Humana: Sistema Imunológico', priority: true },
          { item: 'Botânica e Zoologia: Sistemática e Fisiologia', priority: false },
        ]
      },
      {
        nome: 'Física',
        topicos: [
          { item: 'Cinemática: Movimento Uniforme e MUV', priority: false },
          { item: 'Dinâmica: Leis de Newton e Força de Atrito', priority: true },
          { item: 'Trabalho e Energia', priority: false },
          { item: 'Estática e Fluidos: Equilíbrio e Empuxo', priority: false },
          { item: 'Ondulatória: Fenômenos Ondulatórios', priority: false },
          { item: 'Ondulatória: Acústica e Efeito Doppler', priority: true },
          { item: 'Termodinâmica: Calorimetria e Leis', priority: false },
          { item: 'Eletrodinâmica: Leis de Ohm e Circuitos', priority: false },
          { item: 'Eletrodinâmica: Potência e Energia Elétrica', priority: true },
          { item: 'Óptica: Propriedades da Luz e Lentes', priority: true },
          { item: 'Magnetismo: Indução Eletromagnética', priority: true },
        ]
      },
      {
        nome: 'Química',
        topicos: [
          { item: 'Atomística e Tabela Periódica', priority: true },
          { item: 'Ligações e Forças Intermoleculares', priority: true },
          { item: 'Funções Inorgânicas: Ácidos, Bases e Sais', priority: false },
          { item: 'Estequiometria: Rendimento e Pureza', priority: true },
          { item: 'Soluções: Concentrações, Diluição e Titulação', priority: true },
          { item: 'Termoquímica: Entalpia e Lei de Hess', priority: true },
          { item: 'Equilíbrio Químico e Iônico', priority: true },
          { item: 'Eletroquímica: Pilhas e Oxirredução', priority: true },
          { item: 'Química Orgânica: Funções e Reações', priority: true },
          { item: 'Química Ambiental: Poluição e Efeito Estufa', priority: false },
        ]
      }
    ]
  },
  {
    area: 'Matemática',
    icon: <Calculator className="w-5 h-5" />,
    cor: 'indigo',
    materias: [
      {
        nome: 'Matemática Geral',
        topicos: [
          { item: 'Matemática Básica: Frações, MMC/MDC e Potenciação', priority: false },
          { item: 'Razão, Proporção e Escalas', priority: true },
          { item: 'Regra de Três', priority: true },
          { item: 'Porcentagem e Juros', priority: true },
          { item: 'Interpretação de Gráficos e Tabelas', priority: false },
          { item: 'Funções: Afim, Quadrática, Exponencial e Log', priority: false },
          { item: 'Geometria Plana: Áreas e Perímetros', priority: true },
          { item: 'Geometria Espacial: Prismas e Cilindros', priority: true },
          { item: 'Geometria Espacial: Pirâmides, Cones e Esferas', priority: false },
          { item: 'Trigonometria: Triângulo Retângulo e Ciclo', priority: false },
          { item: 'Estatística: Médias, Moda e Mediana', priority: true },
          { item: 'Estatística: Variância e Desvio Padrão', priority: false },
          { item: 'Análise Combinatória', priority: true },
          { item: 'Probabilidade', priority: true },
        ]
      }
    ]
  },
  {
    area: 'Ciências Humanas',
    icon: <Globe className="w-5 h-5" />,
    cor: 'orange',
    materias: [
      {
        nome: 'História',
        topicos: [
          { item: 'Geral: Antiguidade Clássica (Grécia/Roma)', priority: false },
          { item: 'Geral: Feudalismo e Revolução Industrial', priority: false },
          { item: 'Brasil: Segundo Reinado', priority: true },
          { item: 'Brasil: Cultura Negra e Escravidão', priority: true },
          { item: 'Brasil: República Velha', priority: true },
          { item: 'Brasil: Era Vargas e Ditadura Militar', priority: true },
        ]
      },
      {
        nome: 'Geografia',
        topicos: [
          { item: 'Física: Relevo, Solo e Clima', priority: false },
          { item: 'Biomas Brasileiros', priority: true },
          { item: 'Humana: Agricultura e Questão Fundiária', priority: true },
          { item: 'Humana: Urbanização e Globalização', priority: true },
          { item: 'Demografia e População', priority: true },
          { item: 'Questões Ambientais', priority: true },
        ]
      },
      {
        nome: 'Filosofia e Sociologia',
        topicos: [
          { item: 'Filosofia: Platão e Aristóteles', priority: true },
          { item: 'Filosofia: Contratualismo', priority: true },
          { item: 'Filosofia: Ética Kantiana', priority: false },
          { item: 'Sociologia: Clássicos (Durkheim/Marx/Weber)', priority: false },
          { item: 'Sociologia: Cultura, Diversidade e Cidadania', priority: true },
          { item: 'Movimentos Sociais', priority: false },
        ]
      }
    ]
  },
  {
    area: 'Linguagens',
    icon: <MessageSquare className="w-5 h-5" />,
    cor: 'teal',
    materias: [
      {
        nome: 'Português e Literatura',
        topicos: [
          { item: 'Interpretação: Figuras de Linguagem', priority: true },
          { item: 'Interpretação: Funções da Linguagem', priority: true },
          { item: 'Interpretação: Gêneros Textuais', priority: true },
          { item: 'Gramática: Pronomes e Conjunções', priority: true },
          { item: 'Gramática: Variação Linguística e Crase', priority: true },
          { item: 'Literatura: Barroco e Realismo', priority: false },
          { item: 'Literatura: Modernismo no Brasil', priority: true },
        ]
      }
    ]
  }
];

// ==================== COMPONENTE ====================

export function ChecklistEnem2025() {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArea, setActiveArea] = useState<string | null>(CHECKLIST_DATA[0].area);
  const [collapsedMaterias, setCollapsedMaterias] = useState<string[]>([]);

  // Carregamento inicial do Supabase (com fallback local)
  useEffect(() => {
    const init = async () => {
      setSyncing(true);
      // Primeiro sincroniza dados locais antigos para o Supabase
      await checklistService.syncLocalToSupabase();
      // Depois carrega do Supabase
      const items = await checklistService.loadCheckedItems();
      setCheckedItems(items);
      setLoaded(true);
      setSyncing(false);
    };
    init();
  }, []);

  const toggleItem = useCallback(async (itemKey: string) => {
    const isCurrentlyChecked = checkedItems.includes(itemKey);
    
    // Atualização otimista da UI (resposta instantânea)
    setCheckedItems(prev => 
      isCurrentlyChecked 
        ? prev.filter(i => i !== itemKey) 
        : [...prev, itemKey]
    );

    // Sincronização com Supabase em background
    setSyncing(true);
    if (isCurrentlyChecked) {
      await checklistService.uncheckItem(itemKey);
    } else {
      await checklistService.checkItem(itemKey);
    }
    setSyncing(false);
  }, [checkedItems]);

  const toggleMateria = (materiaName: string) => {
    setCollapsedMaterias(prev => 
      prev.includes(materiaName) 
        ? prev.filter(m => m !== materiaName) 
        : [...prev, materiaName]
    );
  };

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let priorityTotal = 0;
    let priorityCompleted = 0;

    CHECKLIST_DATA.forEach(area => {
      area.materias.forEach(materia => {
        materia.topicos.forEach(t => {
          const key = `${area.area}-${materia.nome}-${t.item}`;
          total++;
          if (checkedItems.includes(key)) completed++;
          if (t.priority) {
            priorityTotal++;
            if (checkedItems.includes(key)) priorityCompleted++;
          }
        });
      });
    });

    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100) || 0,
      priorityPercentage: Math.round((priorityCompleted / priorityTotal) * 100) || 0
    };
  }, [checkedItems]);

  const filteredData = useMemo(() => {
    return CHECKLIST_DATA.map(area => ({
      ...area,
      materias: area.materias.map(materia => ({
        ...materia,
        topicos: materia.topicos.filter(t => 
          t.item.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(m => m.topicos.length > 0)
    })).filter(a => a.materias.length > 0);
  }, [searchQuery]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. HEADER & GLOBAL PROGRESS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pb-8 border-b border-white/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">Checklist Oficial ENEM 2025</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Domínio de Conteúdo</h2>
          <p className="text-slate-500 text-sm font-medium max-w-xl">
            Siga o cronograma de elite. Todos os tópicos do PDF oficial estruturados para sua aprovação cirúrgica.
          </p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <div className="glass-card flex-1 lg:flex-none px-8 py-5 border-white/5 bg-white/[0.02] flex flex-col gap-2 min-w-[180px]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso Geral</span>
              <span className="text-xs font-bold text-teal-400">{stats.percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)] transition-all duration-1000" 
                style={{ width: `${stats.percentage}%` }} 
              />
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase">{stats.completed} de {stats.total} itens</span>
          </div>

          <div className="glass-card flex-1 lg:flex-none px-8 py-5 border-amber-500/20 bg-amber-500/5 flex flex-col gap-2 min-w-[180px]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Tópicos Prioritários</span>
              <span className="text-xs font-bold text-amber-400">{stats.priorityPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-amber-500/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000" 
                style={{ width: `${stats.priorityPercentage}%` }} 
              />
            </div>
            <span className="text-[10px] font-bold text-amber-600/60 uppercase">Foco na TRI</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & AREA SELECTOR */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar tópico específico (ex: Ecologia, Estequiometria)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.05] transition-all"
          />
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          {CHECKLIST_DATA.map((area) => (
            <button
              key={area.area}
              onClick={() => { setActiveArea(area.area); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeArea === area.area 
                  ? `bg-${area.cor}-500/20 text-${area.cor}-400 shadow-lg` 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {area.icon}
              {area.area}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENT GRID */}
      <div className="grid grid-cols-1 gap-6">
        {filteredData
          .filter(area => !activeArea || area.area === activeArea)
          .map((area) => (
            <div key={area.area} className="flex flex-col gap-6">
              {area.materias.map((materia) => {
                const isCollapsed = collapsedMaterias.includes(materia.nome);
                const materiaCompleted = materia.topicos.filter(t => checkedItems.includes(`${area.area}-${materia.nome}-${t.item}`)).length;
                const progress = Math.round((materiaCompleted / materia.topicos.length) * 100);

                return (
                  <div 
                    key={materia.nome} 
                    className="glass-card bg-white/[0.01] border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10"
                  >
                    <div 
                      onClick={() => toggleMateria(materia.nome)}
                      className="p-6 flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${area.cor}-500/10 flex items-center justify-center text-${area.cor}-400 group-hover:scale-110 transition-transform`}>
                          {area.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">{materia.nome}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {materiaCompleted} de {materia.topicos.length} TÓPICOS
                            </span>
                            <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-${area.cor}-500 transition-all duration-1000`} 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-500 group-hover:text-white transition-colors">
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 bg-white/[0.01]">
                        {materia.topicos.map((t) => {
                          const key = `${area.area}-${materia.nome}-${t.item}`;
                          const isChecked = checkedItems.includes(key);

                          return (
                            <button
                              key={t.item}
                              onClick={() => toggleItem(key)}
                              className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left relative overflow-hidden group/item ${
                                isChecked 
                                  ? `bg-${area.cor}-500/10 border-${area.cor}-500/30 text-white` 
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isChecked 
                                  ? <CheckCircle2 className={`w-5 h-5 text-${area.cor}-400`} /> 
                                  : <Circle className="w-5 h-5 opacity-20" />
                                }
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-xs font-bold leading-relaxed ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                    {t.item}
                                  </span>
                                  {t.priority && (
                                    <div className={`p-1 rounded-md ${isChecked ? 'bg-amber-500/20' : 'bg-white/5'} text-amber-500`}>
                                      <Star className="w-3 h-3 fill-amber-500" />
                                    </div>
                                  )}
                                </div>
                                {t.priority && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/60">Prioridade Máxima (TRI)</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {/* 4. FOOTER INFO */}
      <div className="p-8 rounded-3xl border border-teal-500/10 bg-teal-500/[0.02] flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Protocolo de Segurança Acadêmica</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Este checklist foi gerado a partir do edital e matriz de referência 2025. O progresso é sincronizado com o Supabase em tempo real.
            Para garantir os 800+ pontos, priorize os itens marcados com a estrela dourada (<Star className="w-3 h-3 inline mb-0.5" />).
          </p>
          {syncing && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}
        </div>
        <button 
          onClick={async () => {
            if (confirm('Deseja realmente resetar todo o seu progresso? Isso é irreversível!')) {
              setSyncing(true);
              await checklistService.resetAll();
              setCheckedItems([]);
              setSyncing(false);
            }
          }}
          className="px-6 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          Resetar Checklist
        </button>
      </div>
    </div>
  );
}
