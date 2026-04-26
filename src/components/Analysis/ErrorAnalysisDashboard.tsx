import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ErrorStats {
  errorType: string;
  count: number;
  percentage: number;
  potentialGain: number;
  effortRequired: string;
  priority: number;
}

export function ErrorAnalysisDashboard() {
  const [stats, setStats] = useState<ErrorStats[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [potentialGain, setPotentialGain] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const userId = user?.id;

      const { data: errors, error } = await supabase
        .from('error_analysis')
        .select('error_type')
        .eq('user_id', userId || '');

      if (error) throw error;

    // Contar por tipo
    const counts: { [key: string]: number } = {};
    errors.forEach((err: any) => {
      counts[err.error_type] = (counts[err.error_type] || 0) + 1;
    });

      const total = errors?.length || 0;

    const statsData: ErrorStats[] = [
      {
        errorType: 'Confusão',
        count: counts['confusion'] || 0,
        percentage: total ? Math.round(((counts['confusion'] || 0) / total) * 100) : 0,
        potentialGain: 24,
        effortRequired: 'baixo',
        priority: 1
      },
      {
        errorType: 'Conhecimento',
        count: counts['knowledge'] || 0,
        percentage: total ? Math.round(((counts['knowledge'] || 0) / total) * 100) : 0,
        potentialGain: 25,
        effortRequired: 'alto',
        priority: 2
      },
      {
        errorType: 'Cálculo',
        count: counts['calculation'] || 0,
        percentage: total ? Math.round(((counts['calculation'] || 0) / total) * 100) : 0,
        potentialGain: 18,
        effortRequired: 'baixo',
        priority: 2
      },
      {
        errorType: 'Leitura',
        count: counts['reading'] || 0,
        percentage: total ? Math.round(((counts['reading'] || 0) / total) * 100) : 0,
        potentialGain: 10,
        effortRequired: 'mínimo',
        priority: 3
      },
      {
        errorType: 'Pressão',
        count: counts['pressure'] || 0,
        percentage: total ? Math.round(((counts['pressure'] || 0) / total) * 100) : 0,
        potentialGain: 8,
        effortRequired: 'médio',
        priority: 3
      },
      {
        errorType: 'Estratégia',
        count: counts['strategy'] || 0,
        percentage: total ? Math.round(((counts['strategy'] || 0) / total) * 100) : 0,
        potentialGain: 3,
        effortRequired: 'médio',
        priority: 5
      }
    ];

    setStats(statsData.sort((a, b) => a.priority - b.priority));
    setTotalErrors(total);

    const totalGain = statsData.reduce(
      (sum, s) => sum + (s.count > 0 ? s.potentialGain : 0),
      0
    );
      setPotentialGain(totalGain);
    } catch (err) {
      console.error('Erro na análise de erros:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-text-secondary font-black animate-pulse uppercase tracking-widest text-xs">Sincronizando Banco de Erros...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-black text-white mb-2">
          📊 Análise de Erros
        </h2>
        <p className="text-text-secondary">
          Total de erros analisados: {totalErrors}
        </p>
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-6 border-white/5 bg-white/5">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Erros</p>
          <p className="text-4xl font-black text-white mt-2">{totalErrors}</p>
        </div>
        <div className="glass-card p-6 border-emerald-500/10 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
            Potencial de Ganho
          </p>
          <p className="text-4xl font-black text-emerald-400 mt-2">+{potentialGain}%</p>
        </div>
        <div className="glass-card p-6 border-red-500/10 bg-red-500/5">
          <p className="text-sm font-bold text-red-400 uppercase tracking-widest">Prioridade Atual</p>
          <p className="text-4xl font-black text-red-400 mt-2">
            {stats.find(s => s.count > 0)?.errorType || 'Nenhuma'}
          </p>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="glass-card p-6 border-white/5 bg-white/5">
        <h3 className="font-bold text-lg text-white mb-6 uppercase tracking-widest">
          Distribuição por Tipo
        </h3>
        <div className="h-[300px] w-full">
          {totalErrors > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <XAxis dataKey="errorType" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar
                  dataKey="count"
                  fill="#14b8a6"
                  name="Quantidade"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-text-secondary font-bold text-sm italic">Nenhum dado para exibir no gráfico</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Recomendações */}
      <div className="glass-card p-6 border-white/5 bg-white/5 overflow-x-auto">
        <h3 className="font-bold text-lg text-white mb-6 uppercase tracking-widest">
          Recomendações (por prioridade)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary uppercase tracking-widest text-xs">
              <th className="text-left py-3 font-black">Tipo</th>
              <th className="text-center py-3 font-black">Count</th>
              <th className="text-center py-3 font-black">%</th>
              <th className="text-center py-3 font-black">Ganho</th>
              <th className="text-center py-3 font-black">Esforço</th>
              <th className="text-left py-3 font-black">Ação</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr
                key={stat.errorType}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-4 font-bold text-white">
                  {stat.errorType}
                </td>
                <td className="py-4 text-center font-bold text-slate-300">
                  {stat.count}
                </td>
                <td className="py-4 text-center text-slate-400">
                  {stat.percentage}%
                </td>
                <td className="py-4 text-center font-black text-emerald-400">
                  +{stat.potentialGain}%
                </td>
                <td className="py-4 text-center text-lg">
                  {stat.effortRequired === 'baixo'
                    ? '⚡'
                    : stat.effortRequired === 'médio'
                    ? '⚡⚡'
                    : stat.effortRequired === 'alto'
                    ? '⚡⚡⚡'
                    : '✨'}
                </td>
                <td className="py-4">
                  <button className="text-xs font-bold px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500/20 transition-colors">
                    Começar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Próximos Passos */}
      <div className="glass-card p-8 bg-gradient-to-r from-teal-500/10 to-transparent border-l-4 border-l-teal-500 border-y-white/5 border-r-white/5">
        <h3 className="font-black text-xl text-teal-400 mb-6 uppercase tracking-widest">
          🎯 Próximos Passos Recomendados
        </h3>
        <ol className="space-y-6">
          {stats
            .filter((s) => s.count > 0)
            .slice(0, 3)
            .map((stat, idx) => (
              <li key={stat.errorType} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center font-black text-teal-400 shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-bold text-white text-lg">
                    {stat.errorType} ({stat.count} erros)
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Você poderia ganhar <span className="font-bold text-emerald-400">+{stat.potentialGain}%</span> com esforço{' '}
                    <span className="font-bold text-white">{stat.effortRequired}</span>
                  </p>
                </div>
              </li>
            ))}
          {stats.filter(s => s.count > 0).length === 0 && (
            <div className="text-slate-400 font-bold">Nenhum erro registrado ainda. Adicione erros para receber recomendações!</div>
          )}
        </ol>
      </div>
    </div>
  );
}
