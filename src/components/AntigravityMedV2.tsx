import React, { useState, useMemo } from 'react';
import { Filter, BookOpen, Zap, Search, Target, CheckCircle2, ChevronRight } from 'lucide-react';

// ==================== DADOS REAIS DO ENEM (MATEMÁTICA) ====================

const COMPETENCIAS_MATEMATICA = [
  {
    id: 1,
    nome: 'Números e Operações',
    habilidades: 5,
    topicos: ['Conjuntos', 'Operações', 'Padrões', 'PA/PG', 'Porcentagem'],
    frequenciaEnem: '25%',
    dificuldade: 'Média'
  },
  {
    id: 2,
    nome: 'Geometria',
    habilidades: 4,
    topicos: ['Figuras Planas', 'Geometria Espacial', 'Trigonometria'],
    frequenciaEnem: '22%',
    dificuldade: 'Alta'
  },
  {
    id: 3,
    nome: 'Grandezas e Medidas',
    habilidades: 5,
    topicos: ['Escalas', 'Conversão de Unidades', 'Proporção'],
    frequenciaEnem: '15%',
    dificuldade: 'Média'
  },
  {
    id: 4,
    nome: 'Variação de Grandezas',
    habilidades: 4,
    topicos: ['Proporção Direta', 'Proporção Inversa', 'Regra de Três'],
    frequenciaEnem: '12%',
    dificuldade: 'Média'
  },
  {
    id: 5,
    nome: 'Álgebra e Funções',
    habilidades: 5,
    topicos: ['Equações', 'Funções', 'Gráficos', 'Geometria Analítica'],
    frequenciaEnem: '18%',
    dificuldade: 'Alta'
  },
  {
    id: 6,
    nome: 'Gráficos e Tabelas',
    habilidades: 3,
    topicos: ['Leitura de Dados', 'Inferência', 'Interpretação'],
    frequenciaEnem: '10%',
    dificuldade: 'Baixa'
  },
  {
    id: 7,
    nome: 'Estatística e Probabilidade',
    habilidades: 4,
    topicos: ['Medidas Centrais', 'Distribuição', 'Probabilidade'],
    frequenciaEnem: '15%',
    dificuldade: 'Alta'
  }
];

const HABILIDADES_DETALHADAS = [
  // Competência 1
  { id: 'H1', comp: 1, nome: 'Reconhecer números em contexto social' },
  { id: 'H2', comp: 1, nome: 'Identificar padrões numéricos' },
  { id: 'H3', comp: 1, nome: 'Resolver situação-problema numérica' },
  { id: 'H4', comp: 1, nome: 'Avaliar razoabilidade numérica' },
  { id: 'H5', comp: 1, nome: 'Avaliar propostas com números' },
  // Competência 2
  { id: 'H6', comp: 2, nome: 'Interpretar localização no espaço' },
  { id: 'H7', comp: 2, nome: 'Identificar figuras geométricas' },
  { id: 'H8', comp: 2, nome: 'Resolver problema geométrico' },
  { id: 'H9', comp: 2, nome: 'Utilizar geometria em cotidiano' },
  // Competência 3
  { id: 'H10', comp: 3, nome: 'Identificar relações entre grandezas' },
  { id: 'H11', comp: 3, nome: 'Utilizar escalas na leitura' },
  { id: 'H12', comp: 3, nome: 'Resolver problema com grandezas' },
  { id: 'H13', comp: 3, nome: 'Avaliar resultado de medição' },
  { id: 'H14', comp: 3, nome: 'Avaliar proposta com grandezas' },
  // Competência 4
  { id: 'H15', comp: 4, nome: 'Identificar dependência entre grandezas' },
  { id: 'H16', comp: 4, nome: 'Resolver variação de grandezas' },
  { id: 'H17', comp: 4, nome: 'Analisar variação para argumentação' },
  { id: 'H18', comp: 4, nome: 'Avaliar proposta com variação' },
  // Competência 5
  { id: 'H19', comp: 5, nome: 'Identificar representação algébrica' },
  { id: 'H20', comp: 5, nome: 'Interpretar gráfico cartesiano' },
  { id: 'H21', comp: 5, nome: 'Resolver problema algébrico' },
  { id: 'H22', comp: 5, nome: 'Utilizar álgebra em argumentação' },
  { id: 'H23', comp: 5, nome: 'Avaliar proposta algébrica' },
  // Competência 6
  { id: 'H24', comp: 6, nome: 'Utilizar gráficos para inferências' },
  { id: 'H25', comp: 6, nome: 'Resolver problema com gráficos' },
  { id: 'H26', comp: 6, nome: 'Analisar gráficos para argumentação' },
  // Competência 7
  { id: 'H27', comp: 7, nome: 'Calcular medidas centrais' },
  { id: 'H28', comp: 7, nome: 'Resolver problema estatístico' },
  { id: 'H29', comp: 7, nome: 'Utilizar estatística em argumentação' },
  { id: 'H30', comp: 7, nome: 'Avaliar proposta com estatística' },
];

// ==================== COMPONENTES AUXILIARES ====================

const CompetenciaCard = ({ comp, isSelected, onClick }: any) => {
  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer transition-all duration-500 rounded-2xl overflow-hidden ${
        isSelected 
          ? 'bg-teal-500/20 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.2)]' 
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
      } border p-6`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-xl ${isSelected ? 'bg-teal-500/20 text-teal-400' : 'bg-white/5 text-slate-500'}`}>
            <Target className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">Comp. {comp.id}</span>
        </div>
        
        <div>
          <h3 className={`font-black tracking-tight leading-tight mb-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-300'}`}>
            {comp.nome}
          </h3>
          <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest">{comp.frequenciaEnem} DE INCIDÊNCIA</p>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Habilidades</span>
            <span className="text-sm font-black text-white tracking-tighter">{comp.habilidades}</span>
          </div>
          <div className="w-px h-6 bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Dificuldade</span>
            <span className={`text-sm font-black tracking-tighter ${
              comp.dificuldade === 'Alta' ? 'text-orange-400' : 
              comp.dificuldade === 'Média' ? 'text-teal-400' : 'text-emerald-400'
            }`}>{comp.dificuldade}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function AntigravityMedV2() {
  const [abaAtiva, setAbaAtiva] = useState('matriz');
  const [competenciaSelect, setCompetenciaSelect] = useState<number | null>(null);
  const [buscaHabilidade, setBuscaHabilidade] = useState('');

  const compSelecionada = competenciaSelect ? COMPETENCIAS_MATEMATICA.find(c => c.id === competenciaSelect) : null;

  const habilidadesFiltradas = useMemo(() => {
    return HABILIDADES_DETALHADAS.filter(h => {
      const passaCompetencia = !competenciaSelect || h.comp === competenciaSelect;
      const passaBusca = !buscaHabilidade || h.nome.toLowerCase().includes(buscaHabilidade.toLowerCase()) || h.id.toLowerCase().includes(buscaHabilidade.toLowerCase());
      return passaCompetencia && passaBusca;
    });
  }, [competenciaSelect, buscaHabilidade]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      
      {/* Header Alinhado */}
      <header className="flex justify-between items-end pb-4 border-b border-teal-500/5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em]">Referência Técnica</span>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">Matriz de Habilidades</h2>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_10px_rgba(20,184,166,1)]" />
          <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Matemática e Tecnologias</span>
        </div>
      </header>

      {/* Grid de Competências */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COMPETENCIAS_MATEMATICA.map(comp => (
          <CompetenciaCard
            key={comp.id}
            comp={comp}
            isSelected={competenciaSelect === comp.id}
            onClick={() => setCompetenciaSelect(competenciaSelect === comp.id ? null : comp.id)}
          />
        ))}
      </section>

      {/* Detalhes e Habilidades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Painel de Detalhes da Competência */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className={`glass-card p-8 border-teal-500/10 bg-teal-500/[0.02] flex flex-col gap-6 sticky top-8 transition-opacity duration-500 ${compSelecionada ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-xl text-teal-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                {compSelecionada ? `Estatísticas Comp. ${compSelecionada.id}` : 'Selecione uma Competência'}
              </h3>
            </div>

            {compSelecionada ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Tópicos Recorrentes</span>
                  <div className="flex flex-wrap gap-2">
                    {compSelecionada.topicos.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[11px] font-bold text-slate-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Incidência</span>
                    <span className="text-2xl font-black text-teal-400 tracking-tighter">{compSelecionada.frequenciaEnem}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Complexidade</span>
                    <span className="text-2xl font-black text-orange-400 tracking-tighter">{compSelecionada.dificuldade}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-500 italic">
                Clique em um dos cards acima para ver os tópicos e habilidades detalhadas desta competência.
              </p>
            )}
          </div>
        </div>

        {/* Lista de Habilidades */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-6 border-white/5 bg-white/[0.02] flex items-center gap-4">
            <div className="p-2 bg-white/5 rounded-xl">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Buscar por habilidade (ex: H1 ou reconhecimento)..."
              value={buscaHabilidade}
              onChange={e => setBuscaHabilidade(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-white placeholder-slate-600 flex-1"
            />
            {competenciaSelect && (
              <button 
                onClick={() => setCompetenciaSelect(null)}
                className="text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors"
              >
                Limpar Filtro
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habilidadesFiltradas.map(hab => (
              <div key={hab.id} className="group glass-card p-5 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-teal-500/20 transition-all duration-300 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-teal-500 font-black text-sm shrink-0 group-hover:bg-teal-500 group-hover:text-black transition-colors">
                  {hab.id}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Comp. {hab.comp}</span>
                  <p className="text-sm font-bold text-slate-300 leading-snug group-hover:text-white transition-colors">
                    {hab.nome}
                  </p>
                </div>
                <div className="ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                </div>
              </div>
            ))}
          </div>

          {habilidadesFiltradas.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-500 font-bold italic tracking-wide">Nenhuma habilidade encontrada para esta busca.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
