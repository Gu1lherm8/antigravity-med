import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Filter, TrendingUp, BookOpen, Zap, Brain, Search, ChevronDown, Target, AlertCircle, CheckCircle } from 'lucide-react';

// ==================== DADOS REAIS DO ENEM ====================

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
  { id: 'H1', comp: 1, nome: 'Reconhecer números em contexto social', questoes: [139, 147, 154, 172] },
  { id: 'H2', comp: 1, nome: 'Identificar padrões numéricos', questoes: [162, 174, 150] },
  { id: 'H3', comp: 1, nome: 'Resolver situação-problema numérica', questoes: [160, 161, 167] },
  { id: 'H4', comp: 1, nome: 'Avaliar razoabilidade numérica', questoes: [158, 144, 175] },
  { id: 'H5', comp: 1, nome: 'Avaliar propostas com números', questoes: [136, 157, 177] },
  // Competência 2
  { id: 'H6', comp: 2, nome: 'Interpretar localização no espaço', questoes: [172, 165, 153] },
  { id: 'H7', comp: 2, nome: 'Identificar figuras geométricas', questoes: [144, 147, 151] },
  { id: 'H8', comp: 2, nome: 'Resolver problema geométrico', questoes: [155, 158, 137] },
  { id: 'H9', comp: 2, nome: 'Utilizar geometria em cotidiano', questoes: [140, 167, 160] },
  // Competência 3
  { id: 'H10', comp: 3, nome: 'Identificar relações entre grandezas', questoes: [178, 153, 174] },
  { id: 'H11', comp: 3, nome: 'Utilizar escalas na leitura', questoes: [136, 160, 144] },
  { id: 'H12', comp: 3, nome: 'Resolver problema com grandezas', questoes: [138, 148, 176] },
  { id: 'H13', comp: 3, nome: 'Avaliar resultado de medição', questoes: [145, 161, 149] },
  { id: 'H14', comp: 3, nome: 'Avaliar proposta com grandezas', questoes: [158, 174, 163] },
  // Competência 4
  { id: 'H15', comp: 4, nome: 'Identificar dependência entre grandezas', questoes: [143, 138, 137] },
  { id: 'H16', comp: 4, nome: 'Resolver variação de grandezas', questoes: [141, 164, 166] },
  { id: 'H17', comp: 4, nome: 'Analisar variação para argumentação', questoes: [147, 172, 142] },
  { id: 'H18', comp: 4, nome: 'Avaliar proposta com variação', questoes: [153, 157, 154] },
  // Competência 5
  { id: 'H19', comp: 5, nome: 'Identificar representação algébrica', questoes: [156, 159, 178] },
  { id: 'H20', comp: 5, nome: 'Interpretar gráfico cartesiano', questoes: [152, 179, 156] },
  { id: 'H21', comp: 5, nome: 'Resolver problema algébrico', questoes: [137, 166, 168] },
  { id: 'H22', comp: 5, nome: 'Utilizar álgebra em argumentação', questoes: [150, 176, 171] },
  { id: 'H23', comp: 5, nome: 'Avaliar proposta algébrica', questoes: [149, 180, 136] },
  // Competência 6
  { id: 'H24', comp: 6, nome: 'Utilizar gráficos para inferências', questoes: [173, 175, 148] },
  { id: 'H25', comp: 6, nome: 'Resolver problema com gráficos', questoes: [169, 155, 169] },
  { id: 'H26', comp: 6, nome: 'Analisar gráficos para argumentação', questoes: [143, 178, 136] },
  // Competência 7
  { id: 'H27', comp: 7, nome: 'Calcular medidas centrais', questoes: [142, 154, 179] },
  { id: 'H28', comp: 7, nome: 'Resolver problema estatístico', questoes: [152, 162, 149] },
  { id: 'H29', comp: 7, nome: 'Utilizar estatística em argumentação', questoes: [161, 170, 171] },
  { id: 'H30', comp: 7, nome: 'Avaliar proposta com estatística', questoes: [150, 158, 144] },
];

const DADOS_DESEMPENHO_SIMULADO = [
  { comp: 1, desempenho: 72, meta: 80 },
  { comp: 2, desempenho: 65, meta: 80 },
  { comp: 3, desempenho: 78, meta: 80 },
  { comp: 4, desempenho: 60, meta: 80 },
  { comp: 5, desempenho: 68, meta: 80 },
  { comp: 6, desempenho: 82, meta: 80 },
  { comp: 7, desempenho: 55, meta: 80 }
];

// ==================== COMPONENTES ====================

const Header = () => (
  <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 border-b border-blue-500/30 px-8 py-6 rounded-t-xl">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Antigravity Med v2</h1>
          <p className="text-cyan-300 text-sm font-semibold">Visualizador Inteligente do ENEM</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-bold text-lg">📊 Matemática e suas Tecnologias</p>
        <p className="text-cyan-300 text-xs">7 Competências • 30 Habilidades</p>
      </div>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorMap: any = {
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-semibold">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <Icon className="w-12 h-12 text-white/30" />
      </div>
    </div>
  );
};

const CompetenciaCard = ({ comp, isSelected, onClick }: any) => {
  const bgGradient = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-blue-500',
    'from-teal-500 to-cyan-500',
    'from-rose-500 to-pink-500'
  ];

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${bgGradient[comp.id - 1]} rounded-lg p-5 cursor-pointer transition-all transform hover:scale-105 border-2 ${
        isSelected ? 'border-white shadow-lg shadow-white/50' : 'border-transparent'
      }`}
    >
      <h3 className="text-white font-bold text-sm mb-2">{comp.nome}</h3>
      <div className="flex items-center justify-between">
        <div className="text-white/90">
          <p className="text-xs">Habilidades: {comp.habilidades}</p>
          <p className="text-xs">Frequência: {comp.frequenciaEnem}</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full font-semibold">
            {comp.dificuldade}
          </span>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ label, isActive, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

// ==================== TELAS ====================

const TelaCompetencias = ({ competenciaSelect, setCompetenciaSelect }: any) => {
  const comp = competenciaSelect ? COMPETENCIAS_MATEMATICA.find(c => c.id === competenciaSelect) : null;

  return (
    <div className="space-y-8">
      {/* Cards de Competências */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          7 Competências do ENEM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPETENCIAS_MATEMATICA.map(comp => (
            <CompetenciaCard
              key={comp.id}
              comp={comp}
              isSelected={competenciaSelect === comp.id}
              onClick={() => setCompetenciaSelect(competenciaSelect === comp.id ? null : comp.id)}
            />
          ))}
        </div>
      </div>

      {/* Detalhe da Competência Selecionada */}
      {comp && (
        <div className="bg-slate-800 border border-cyan-500/30 rounded-xl p-8 shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-cyan-400 mb-2">{comp.nome}</h3>
              <p className="text-slate-400">Competência #{comp.id}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-white">{comp.frequenciaEnem}</p>
              <p className="text-slate-400 text-sm">das questões do ENEM</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Tópicos Principais
              </h4>
              <div className="space-y-2">
                {comp.topicos.map((topico, i) => (
                  <div key={i} className="bg-slate-700/50 p-3 rounded-lg border-l-4 border-cyan-500">
                    <p className="text-white text-sm font-semibold">{topico}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Estatísticas
              </h4>
              <div className="space-y-3">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Habilidades Associadas</p>
                  <p className="text-2xl font-bold text-white">{comp.habilidades}</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Dificuldade Média</p>
                  <p className="text-lg font-bold text-orange-400">{comp.dificuldade}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TelaHabilidades = ({ filtroCompetencia, buscaHabilidade }: any) => {
  const habilidadesFiltradas = useMemo(() => {
    return HABILIDADES_DETALHADAS.filter(h => {
      const passaCompetencia = !filtroCompetencia || h.comp === filtroCompetencia;
      const passaBusca = !buscaHabilidade || h.nome.toLowerCase().includes(buscaHabilidade.toLowerCase()) || h.id.toLowerCase().includes(buscaHabilidade.toLowerCase());
      return passaCompetencia && passaBusca;
    });
  }, [filtroCompetencia, buscaHabilidade]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Target className="w-6 h-6 text-green-400" />
          30 Habilidades Detalhadas
        </h2>
        <p className="text-slate-400 mb-4">{habilidadesFiltradas.length} habilidades encontradas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habilidadesFiltradas.map(hab => (
          <div key={hab.id} className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 hover:border-green-500/50 rounded-lg p-5 transition-all hover:shadow-lg hover:shadow-green-500/20">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-green-400 font-bold text-lg">{hab.id}</h3>
                <p className="text-slate-400 text-xs">Competência {hab.comp}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500/50" />
            </div>
            <p className="text-white font-semibold text-sm mb-4">{hab.nome}</p>
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <p className="text-slate-400 text-xs mb-2">Questões ENEM:</p>
              <div className="flex flex-wrap gap-2">
                {hab.questoes.slice(0, 3).map((q, i) => (
                  <span key={i} className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">
                    #{q}
                  </span>
                ))}
                {hab.questoes.length > 3 && (
                  <span className="bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded">
                    +{hab.questoes.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TelaDesempenho = () => {
  const media = Math.round(DADOS_DESEMPENHO_SIMULADO.reduce((acc, d) => acc + d.desempenho, 0) / 7);
  const criticos = DADOS_DESEMPENHO_SIMULADO.filter(d => d.desempenho < 60);
  const fortes = DADOS_DESEMPENHO_SIMULADO.filter(d => d.desempenho >= 80);

  return (
    <div className="space-y-8">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Brain} label="Desempenho Médio" value={`${media}%`} color="blue" />
        <StatCard icon={AlertCircle} label="Pontos Críticos" value={criticos.length} color="orange" />
        <StatCard icon={CheckCircle} label="Pontos Fortes" value={fortes.length} color="green" />
        <StatCard icon={TrendingUp} label="Meta ENEM" value="750+" color="purple" />
      </div>

      {/* Gráfico de Comparação */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Desempenho vs Meta por Competência
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={DADOS_DESEMPENHO_SIMULADO}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="comp" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="desempenho" fill="#06b6d4" name="Seu Desempenho" />
            <Bar dataKey="meta" fill="#64748b" name="Meta (80%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detalhes dos Críticos */}
      {criticos.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <h3 className="text-red-400 font-bold text-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ⚠️ Competências Críticas (&lt; 60%)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticos.map(d => (
              <div key={d.comp} className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-red-500">
                <p className="text-white font-semibold">Competência {d.comp}</p>
                <p className="text-red-400 text-2xl font-bold">{d.desempenho}%</p>
                <p className="text-slate-400 text-xs mt-2">Necessita de atenção imediata</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhes dos Fortes */}
      {fortes.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8">
          <h3 className="text-green-400 font-bold text-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            ✨ Competências Fortes (≥ 80%)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fortes.map(d => (
              <div key={d.comp} className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-white font-semibold">Competência {d.comp}</p>
                <p className="text-green-400 text-2xl font-bold">{d.desempenho}%</p>
                <p className="text-slate-400 text-xs mt-2">Domínio garantido</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TelaDados = () => {
  const [filtroComp, setFiltroComp] = useState<number | null>(null);
  const [ordem, setOrdem] = useState('comp');

  const habilidadesTotais = HABILIDADES_DETALHADAS.filter(h => !filtroComp || h.comp === filtroComp);
  const ordenadas = habilidadesTotais.sort((a, b) => {
    if (ordem === 'comp') return a.comp - b.comp;
    if (ordem === 'nome') return a.nome.localeCompare(b.nome);
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Filter className="w-6 h-6 text-purple-400" />
          Tabela Completa de Dados
        </h2>

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setFiltroComp(null)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filtroComp === null ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Todas as Competências
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map(comp => (
            <button
              key={comp}
              onClick={() => setFiltroComp(filtroComp === comp ? null : comp)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroComp === comp ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Comp. {comp}
            </button>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <select
            value={ordem}
            onChange={e => setOrdem(e.target.value)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
          >
            <option value="comp">Ordenar por Competência</option>
            <option value="nome">Ordenar por Nome</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-purple-400 font-bold py-3 px-4">Habilidade</th>
                <th className="text-left text-purple-400 font-bold py-3 px-4">Competência</th>
                <th className="text-left text-purple-400 font-bold py-3 px-4">Descrição</th>
                <th className="text-center text-purple-400 font-bold py-3 px-4">Questões</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((hab, i) => (
                <tr key={hab.id} className={`border-b border-slate-700 hover:bg-slate-700/30 transition-all ${i % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
                  <td className="py-3 px-4">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full font-bold text-xs">{hab.id}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">#{hab.comp}</td>
                  <td className="py-3 px-4 text-slate-300">{hab.nome}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-xs font-semibold">{hab.questoes.length}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function AntigravityMedV2() {
  const [abaAtiva, setAbaAtiva] = useState('competencias');
  const [competenciaSelect, setCompetenciaSelect] = useState<number | null>(null);
  const [filtroCompetencia, setFiltroCompetencia] = useState<number | null>(null);
  const [buscaHabilidade, setBuscaHabilidade] = useState('');

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <Header />

      {/* Navegação */}
      <div className="bg-slate-900/50 border-b border-slate-700 px-8 py-4">
        <div className="flex gap-4 overflow-x-auto pb-2">
          <TabButton
            label="📚 Competências"
            isActive={abaAtiva === 'competencias'}
            onClick={() => setAbaAtiva('competencias')}
            icon={BookOpen}
          />
          <TabButton
            label="🎯 Habilidades"
            isActive={abaAtiva === 'habilidades'}
            onClick={() => setAbaAtiva('habilidades')}
            icon={Target}
          />
          <TabButton
            label="📊 Desempenho"
            isActive={abaAtiva === 'desempenho'}
            onClick={() => setAbaAtiva('desempenho')}
            icon={TrendingUp}
          />
          <TabButton
            label="📋 Dados"
            isActive={abaAtiva === 'dados'}
            onClick={() => setAbaAtiva('dados')}
            icon={Filter}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-8 py-8 min-h-[600px]">
        {abaAtiva === 'competencias' && (
          <TelaCompetencias competenciaSelect={competenciaSelect} setCompetenciaSelect={setCompetenciaSelect} />
        )}

        {abaAtiva === 'habilidades' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <label className="text-slate-400 text-sm font-semibold mb-2 block">Buscar Habilidade</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Digite H1, H2... ou nome"
                      value={buscaHabilidade}
                      onChange={e => setBuscaHabilidade(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[250px]">
                  <label className="text-slate-400 text-sm font-semibold mb-2 block">Filtrar Competência</label>
                  <select
                    value={filtroCompetencia || ''}
                    onChange={e => setFiltroCompetencia(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(c => (
                      <option key={c} value={c}>
                        Competência {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <TelaHabilidades filtroCompetencia={filtroCompetencia} buscaHabilidade={buscaHabilidade} />
          </div>
        )}

        {abaAtiva === 'desempenho' && <TelaDesempenho />}

        {abaAtiva === 'dados' && <TelaDados />}
      </div>
    </div>
  );
}
