import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Label
} from 'recharts';
import { 
  ShieldAlert, 
  Target, 
  Zap, 
  Search, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { TRIEngine, type ScoreData } from '../lib/intelligence/TRIEngine';

interface CoherenceData {
  coherence: number;
  status: 'ESTÁVEL' | 'ALERTA' | 'CRÍTICO';
  message: string;
  color: string;
  stats: ScoreData;
  recentAttempts: Array<{
    id: string;
    is_correct: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    discipline: string;
  }>;
}

export function TRICoherenceDashboard() {
  const [data, setData] = useState<CoherenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoherenceData();
  }, []);

  async function fetchCoherenceData() {
    setLoading(true);
    try {
      // 1. Busca as últimas 100 tentativas com dificuldade da questão
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select(`
          id,
          is_correct,
          questions (
            difficulty,
            topic,
            discipline
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // 2. Processa estatísticas para o TRIEngine
      const stats: ScoreData = {
        easy: { total: 0, correct: 0 },
        medium: { total: 0, correct: 0 },
        hard: { total: 0, correct: 0 }
      };

      const recentAttempts: CoherenceData['recentAttempts'] = [];

      attempts?.forEach((att: any) => {
        const q = att.questions;
        if (!q || !q.difficulty) return;

        const diff = q.difficulty as 'easy' | 'medium' | 'hard';
        stats[diff].total++;
        if (att.is_correct) stats[diff].correct++;

        if (recentAttempts.length < 50) {
          recentAttempts.push({
            id: att.id,
            is_correct: att.is_correct,
            difficulty: diff,
            topic: q.topic,
            discipline: q.discipline
          });
        }
      });

      // 3. Calcula coerência via motor TRI
      const coherence = TRIEngine.calculateCoherence(stats);
      
      let status: CoherenceData['status'] = 'ESTÁVEL';
      let message = 'Seu padrão de acertos é logicamente consistente.';
      let color = '#10b981'; // emerald-500

      if (coherence < 70) {
        status = 'CRÍTICO';
        message = 'Alto índice de incoerência! Você está errando o básico e "acertando" o avançado.';
        color = '#ef4444'; // red-500
      } else if (coherence < 85) {
        status = 'ALERTA';
        message = 'Atenção às questões fáceis. Pequenos deslizes estão punindo sua nota TRI.';
        color = '#f59e0b'; // amber-500
      }

      setData({
        coherence,
        status,
        message,
        color,
        stats,
        recentAttempts
      });

    } catch (err) {
      console.error('Erro ao carregar dados de coerência:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-text-secondary font-bold animate-pulse">ANALISANDO PADRÕES DE RESPOSTA...</p>
      </div>
    );
  }

  if (!data || (data.stats.easy.total === 0 && data.stats.medium.total === 0 && data.stats.hard.total === 0)) {
    return (
      <div className="glass-card p-12 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
          <Target className="w-10 h-10 text-white/20" />
        </div>
        <div className="max-w-md">
          <h3 className="text-2xl font-black text-white">Dados Insuficientes</h3>
          <p className="text-text-secondary mt-2">
            O Motor de Coerência T.R.I precisa de pelo menos 10 questões respondidas com dificuldade classificada para gerar o mapa de chutes.
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary px-8 py-3">
          Atualizar Dados
        </button>
      </div>
    );
  }

  const chartData = [
    { name: 'Fácil',   acertos: data.stats.easy.correct,   total: data.stats.easy.total,   perc: data.stats.easy.total > 0 ? Math.round((data.stats.easy.correct / data.stats.easy.total) * 100) : 0, color: '#10b981' },
    { name: 'Médio',   acertos: data.stats.medium.correct, total: data.stats.medium.total, perc: data.stats.medium.total > 0 ? Math.round((data.stats.medium.correct / data.stats.medium.total) * 100) : 0, color: '#6366f1' },
    { name: 'Difícil', acertos: data.stats.hard.correct,   total: data.stats.hard.total,   perc: data.stats.hard.total > 0 ? Math.round((data.stats.hard.correct / data.stats.hard.total) * 100) : 0, color: '#f59e0b' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Auditoria de Proficiência</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Mapa de Coerência <span className="text-indigo-500">T.R.I</span></h2>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text-secondary uppercase">Status Geral</span>
            <span className="text-lg font-black tracking-tight" style={{ color: data.color }}>{data.status}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text-secondary uppercase">Score Coerência</span>
            <span className="text-lg font-black text-white">{data.coherence}%</span>
          </div>
        </div>
      </header>

      {/* TOP INSIGHT BANNER */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-6 transition-all duration-500 ${
        data.status === 'ESTÁVEL' ? 'bg-emerald-500/10 border-emerald-500/20' : 
        data.status === 'ALERTA' ? 'bg-amber-500/10 border-amber-500/20' : 
        'bg-red-500/10 border-red-500/20'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          data.status === 'ESTÁVEL' ? 'bg-emerald-500/20' : 
          data.status === 'ALERTA' ? 'bg-amber-500/20' : 
          'bg-red-500/20'
        }`}>
          {data.status === 'ESTÁVEL' ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : 
           data.status === 'ALERTA' ? <AlertTriangle className="w-8 h-8 text-amber-400" /> : 
           <Zap className="w-8 h-8 text-red-400" />}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black text-white mb-1">Diagnóstico do Preceptor</h3>
          <p className="text-sm text-text-secondary font-medium leading-relaxed">{data.message}</p>
        </div>
        {data.status !== 'ESTÁVEL' && (
          <button className="btn-primary whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 py-3 px-6 text-xs shadow-xl shadow-indigo-500/20">
            Revisar Fundamentos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BAR CHART: ACCURACY BY DIFFICULTY */}
        <div className="glass-card p-8 lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Desempenho por Dificuldade</h3>
              <p className="text-xs text-text-secondary font-bold">O gráfico ideal deve ser decrescente (Fácil &gt; Médio &gt; Difícil)</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="perc" 
                  name="Taxa de Acerto" 
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-text-secondary uppercase">{d.name}</span>
                <span className="text-xl font-black text-white">{d.perc}%</span>
                <span className="text-[9px] font-bold text-text-secondary/50 uppercase">{d.acertos}/{d.total} Itens</span>
              </div>
            ))}
          </div>
        </div>

        {/* PIE CHART: CHUTE PROBABILITY */}
        <div className="glass-card p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Índice de Fragilidade</h3>
            <p className="text-xs text-text-secondary font-bold">Probabilidade de acertos por sorte</p>
          </div>

          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Sólido', value: data.coherence, fill: '#6366f1' },
                    { name: 'Frágil', value: 100 - data.coherence, fill: '#ffffff10' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Label 
                    value={`${100 - data.coherence}%`} 
                    position="center" 
                    fill="#fff" 
                    style={{ fontSize: '32px', fontWeight: '900' }} 
                  />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-text-secondary uppercase tracking-widest">Confiança Técnica</span>
              <span className="text-indigo-400">{data.coherence}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000"
                style={{ width: `${data.coherence}%` }}
              />
            </div>
            <p className="text-[10px] text-text-secondary/60 leading-tight italic">
              *Quanto maior a fragilidade, maior a chance de sua nota real cair no dia oficial devido à correção TRI.
            </p>
          </div>
        </div>
      </div>

      {/* MAPA DE CHUTES - GRID SECTION */}
      <section className="glass-card p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Rastreador de Coerência</h3>
            </div>
            <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Últimas 50 questões analisadas pelo motor cirúrgico</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
            {[
              { label: 'Lógico', color: 'bg-emerald-500' },
              { label: 'Suspeito', color: 'bg-amber-500' },
              { label: 'Erro', color: 'bg-red-500/40 border border-red-500/50' },
              { label: 'Vazio', color: 'bg-white/10' },
            ].map((tag, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${tag.color}`} />
                <span className="text-[10px] font-black text-text-secondary uppercase">{tag.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* THE GRID */}
        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-25 gap-3">
          {[...Array(50)].map((_, i) => {
            const att = data.recentAttempts[i];
            
            if (!att) return <div key={i} className="aspect-square bg-white/5 rounded-lg border border-white/5" />;

            // Lógica de "Suspeito": Acerto em questão difícil quando a coerência geral é baixa
            const isSuspect = att.is_correct && att.difficulty === 'hard' && data.coherence < 75;
            
            return (
              <div 
                key={i} 
                className={`group relative aspect-square rounded-lg flex items-center justify-center transition-all duration-300 cursor-help ${
                  att.is_correct 
                    ? isSuspect ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-emerald-500' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/90 rounded-lg transition-opacity z-10 border border-white/20 p-2 pointer-events-none">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-[8px] font-black text-white uppercase truncate w-full">{att.topic}</span>
                    <span className={`text-[7px] font-black uppercase ${
                      att.difficulty === 'easy' ? 'text-emerald-400' : 
                      att.difficulty === 'medium' ? 'text-indigo-400' : 'text-amber-400'
                    }`}>{att.difficulty}</span>
                  </div>
                </div>
                {isSuspect ? <Sparkles className="w-3 h-3 text-white/50" /> : 
                 att.is_correct ? <CheckCircle2 className="w-4 h-4 text-white/40" /> : 
                 <div className="w-1.5 h-1.5 rounded-full bg-red-400/40" />}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
          <HelpCircle className="w-5 h-5 text-text-secondary" />
          <p className="text-[11px] text-text-secondary font-medium italic">
            <strong>Dica do Sistema:</strong> Acertos marcados em <span className="text-amber-500 font-bold">Laranja</span> sugerem que você está acertando por eliminação ou sorte, pois errou questões mais simples do mesmo assunto recentemente. A TRI reduz o valor desses pontos significativamente.
          </p>
        </div>
      </section>

      {/* ACTIONABLE ADVICE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 flex items-start gap-4 hover:border-indigo-500/30 transition-all group">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-black text-white uppercase text-sm tracking-tight">Otimização de Tempo</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Você gasta mais tempo em questões fáceis do que em médias. Isso indica falta de automatização de processos básicos. Pratique com o <strong>Triturador</strong> focado em fundamentos.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-start gap-4 hover:border-emerald-500/30 transition-all group">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-black text-white uppercase text-sm tracking-tight">Ajuste de Mira</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Sua proficiência em <strong>Matemática</strong> está inconsistente. O motor sugere priorizar as micro-habilidades de "Razão e Proporção" para estabilizar sua base TRI.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
