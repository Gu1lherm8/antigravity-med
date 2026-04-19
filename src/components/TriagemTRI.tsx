import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Target, Activity, Zap, ShieldAlert, Scale, TrendingUp, Maximize2 } from 'lucide-react';
import { DataWarmupBanner } from './DataWarmupBanner';


// Interfaces
interface TriHistory {
  id: string;
  subject_name: string;
  theta_score: number;
  coherence: number;
  created_at: string;
}

export function TriDashboard() {
  const [historyData, setHistoryData] = useState<TriHistory[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [radarData, setRadarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      // 1. Carrega as matérias originais
      const { data: subsData } = await supabase.from('subjects').select('*').order('name');
      if (subsData && subsData.length > 0) {
        setSubjects(subsData);
        setActiveSubject(subsData[0].name);
      }

      // 2. Carrega histórico de theta global (Mantido provisoriamente)
      const { data } = await supabase
        .from('user_theta_history')
        .select('*')
        .order('created_at', { ascending: true }); // do mais antigo pro mais novo

      if (data) setHistoryData(data);
      setLoading(false);
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function reloadRadar() {
      if (!activeSubject || subjects.length === 0) return;
      
      const sub = subjects.find(s => s.name === activeSubject);
      if (!sub) return;

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*, topics(name)')
        .eq('subject_id', sub.id)
        .in('session_type', ['questoes', 'global']);

      if (sessions && sessions.length > 0) {
        const grouped: any = {};
        sessions.forEach(s => {
          if (!s.topic_id) return;
          const tName = s.topics?.name || 'Desconhecido';
          if (!grouped[tName]) grouped[tName] = { total: 0, correct: 0 };
          grouped[tName].total += (s.total_questions || 0);
          grouped[tName].correct += (s.correct_answers || 0);
        });

        const newRadar = Object.keys(grouped).map(name => {
          const acc = grouped[name].total > 0 ? Math.round((grouped[name].correct / grouped[name].total) * 100) : 0;
          return { skill: name.length > 15 ? name.substring(0, 15) + '...' : name, level: acc, ideal: 100, originalName: name };
        });

        setRadarData(newRadar.length > 0 ? newRadar : [{ skill: 'Sem Dados', level: 0, ideal: 100 }]);
      } else {
        setRadarData([{ skill: 'Sem Dados', level: 0, ideal: 100 }]);
      }
    }
    reloadRadar();
  }, [activeSubject, subjects]);

  // Filtra curva pro gráfico de linhas
  const curveData = historyData
    .filter(d => d.subject_name === activeSubject)
    .map(d => ({
      date: new Date(d.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }),
      theta: d.theta_score,
      coerencia: d.coherence
    }));

  const latestScore = curveData.length > 0 ? curveData[curveData.length - 1].theta : 0;
  const latestCoherence = curveData.length > 0 ? curveData[curveData.length - 1].coerencia : 0;
  const isCoherenceLow = latestCoherence < 80;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl">
      
      {/* HEADER TRI */}
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter">Motor Analytics T.R.I</h2>
            <p className="text-text-secondary text-sm font-semibold tracking-wider uppercase mt-1">
              Proficiência Multidimensional e Coerência Pedagógica
            </p>
          </div>
        </div>

      {/* AVISO: dados insuficientes */}
      <DataWarmupBanner
        hidden={historyData.length >= 5}
        title="Motor T.R.I em aquecimento"
        whatItDoes="O Motor T.R.I analisa sua evolução de proficiência ao longo do tempo usando Teoria de Resposta ao Item. Para gerar gráficos e detectar padrões reais, ele precisa de histórico de questões respondidas e sessões registradas."
        needs={[
          'Responder questões nos módulos de Matérias',
          'Registrar rodadas de estudo no Cockpit do Assunto',
          'Mínimo de 5 sessões para curva de evolução',
          'Quanto mais dados, mais precisa a análise de coerência',
        ]}
        timeEstimate="1-2 semanas de uso regular"
        variant="inline"
      />

      {/* MUDAR MATÉRIA (Abas Rápidas) */}
      <div className="flex bg-white/5 p-1 rounded-xl overflow-x-auto max-w-xl custom-scrollbar">
          {subjects.map(sub => (
            <button 
              key={sub.id}
              onClick={() => setActiveSubject(sub.name)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                activeSubject === sub.name 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </header>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 flex flex-col justify-between border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 text-text-secondary mb-4">
            <Target className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-black uppercase tracking-wider">Theta Atual (Nota)</span>
          </div>
          <div>
            <div className="text-5xl font-black text-white">{latestScore.toFixed(1)}</div>
            <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +15 pts vs Semana Passada
            </p>
          </div>
        </div>

        <div className={`glass-card p-6 flex flex-col justify-between border-l-4 ${isCoherenceLow ? 'border-l-red-500 bg-red-500/5' : 'border-l-emerald-500'}`}>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-text-secondary">
               <Scale className={`w-4 h-4 ${isCoherenceLow ? 'text-red-400' : 'text-emerald-400'}`} />
               <span className="text-xs font-black uppercase tracking-wider">Coerência T.R.I</span>
             </div>
             {isCoherenceLow && <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />}
          </div>
          <div>
            <div className="text-4xl font-black text-white">{latestCoherence.toFixed(0)}%</div>
            <p className={`text-xs font-bold mt-2 ${isCoherenceLow ? 'text-red-400' : 'text-text-secondary'}`}>
              {isCoherenceLow ? 'Risco: Acertando díficeis e errando fáceis' : 'Padrão de acertos perfeitamente lógico'}
            </p>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] bg-primary/10 rounded-full p-8 blur-2xl"></div>
          <div className="flex items-center gap-2 text-text-secondary mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider">Desempenho Tempo</span>
          </div>
          <div>
            <div className="text-4xl font-black text-white">2m 45s</div>
            <p className="text-xs text-text-secondary font-bold mt-2">
              Média por questão Difícil da Matriz
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER DO MOTOR TRI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Skill Curve de Evolução do Theta */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Skill Curve: História do Theta</h3>
            <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <Maximize2 className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
          <div className="h-64 mt-4 relative">
             {/* Overlay de warmup quando sem histórico */}
             <DataWarmupBanner
               hidden={curveData.length >= 3}
               title="Sem histórico suficiente"
               whatItDoes="O gráfico de evolução ativa com pelo menos 3 registros de sessão nesta matéria."
               needs={['Registre rodadas de questões no Cockpit do Assunto']}
               timeEstimate="alguns dias"
               variant="overlay"
             />
             {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="theta" 
                      stroke="#6366f1" 
                      strokeWidth={4} 
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }} 
                      activeDot={{ r: 8, stroke: '#818cf8', strokeWidth: 2 }}
                      name="Score TRI"
                    />
                  </LineChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Gráfico 2: Radar de Micro-habilidades (Heatmap Radial) */}
        <div className="glass-card p-6 flex flex-col items-center">
          <h3 className="font-bold text-lg self-start mb-2">Micro-Habilidades</h3>
          <p className="text-xs text-text-secondary font-medium w-full text-left mb-6">Mapeamento atual vs ideal (%)</p>
          
          <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#ffffff20" />
                  <PolarAngleAxis dataKey="skill" stroke="#ffffff60" fontSize={10} fontWeight="bold" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Você" dataKey="level" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                  <Radar name="Meta ENEM" dataKey="ideal" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeDasharray="5 5" />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                     formatter={(value, name, props) => [`${value}%`, name === 'Você' ? (props.payload.originalName || props.payload.skill) : 'Meta Ideal']}
                  />
                </RadarChart>
              </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
             <div className="flex items-center gap-2 text-xs text-white font-bold"><span className="w-3 h-3 bg-indigo-500 rounded-sm"></span> Você</div>
             <div className="flex items-center gap-2 text-xs text-text-secondary"><span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 border-dashed rounded-sm"></span> Meta</div>
          </div>
        </div>

      </div>

      {/* HEATMAP GRID ALERTA (Dica de Receituário Integrado) */}
      {radarData.length > 0 && radarData[0].skill !== 'Sem Dados' && (() => {
        const worstTopic = [...radarData].sort((a, b) => a.level - b.level)[0];
        if (worstTopic.level < 50) {
          return (
            <div className="glass-card border border-primary/20 bg-primary/5 p-6 rounded-3xl mt-2 flex flex-col sm:flex-row items-center gap-6">
               <div className="p-4 bg-primary/20 rounded-2xl">
                 <Zap className="w-8 h-8 text-primary" />
               </div>
               <div className="flex-1">
                 <h3 className="font-black text-xl mb-1 text-white">Anomalia Encontrada pelo Cérebro</h3>
                 <p className="text-sm text-text-secondary leading-relaxed">
                   No histórico recente, o sistema detectou falha crítica ({worstTopic.level}%) no bloco de <strong className="text-white uppercase tracking-widest">{worstTopic.originalName || worstTopic.skill}</strong>. 
                   Sua coerência e dominância da matéria de {activeSubject} está travada por conta desse ponto cego.
                 </p>
               </div>
               <button className="btn-primary whitespace-nowrap py-3 px-8 shadow-[0_0_20px_rgba(var(--primary),0.4)]">
                 Gerar Receita Reparadora
               </button>
            </div>
          );
        }
        return null;
      })()}

    </div>
  );
}
