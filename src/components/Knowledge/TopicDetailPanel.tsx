import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Target, Brain, AlertTriangle } from 'lucide-react';

interface TopicNode {
  id: string;
  name: string;
  subject: string;
  status: string;
  accuracy: number;
  enem_frequency: number;
  last_studied?: Date;
  errors_count: number;
}

interface Props {
  node: TopicNode;
  relatedTopics: any[];
  onClose: () => void;
}

export function TopicDetailPanel({ node, relatedTopics, onClose }: Props) {
  const [summary, setSummary] = useState('');
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [node]);

  const loadDetails = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    // Buscar resumo (se houver no sistema antigo de notas)
    // No projeto existente, podemos não ter study_modules, então buscamos só erros
    // Mas vamos simular a busca como estava no exemplo.
    const { data: studyData } = await supabase
      .from('error_notebook')
      .select('simple_explanation')
      .eq('topic', node.name)
      .limit(1);

    // Buscar erros detalhados
    const { data: errorsData } = await supabase
      .from('topic_errors')
      .select('*')
      .eq('topic_id', node.id)
      .order('error_date', { ascending: false })
      .limit(5);

    setSummary(studyData && studyData.length > 0 ? studyData[0].simple_explanation : 'Nenhum resumo encontrado. Estude e adicione anotações.');
    setErrors(errorsData || []);
    setLoading(false);
  };

  const getStatusColor = () => {
    if (node.status === 'mastered') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (node.status === 'learning') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const getStatusText = () => {
    if (node.status === 'mastered') return '✅ DOMINADO';
    if (node.status === 'learning') return '🟡 APRENDENDO';
    return '❌ NÃO INICIADO';
  };

  return (
    <div className="w-80 bg-[#020308] border-l border-teal-500/10 flex flex-col h-full shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10">
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-white/5 bg-white/[0.02]">
        <div>
          <h2 className="text-xl font-black text-white">{node.name}</h2>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mt-1">{node.subject}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Status */}
        <div className={`p-3 rounded-xl border ${getStatusColor()} flex items-center justify-center`}>
          <p className="font-black text-xs uppercase tracking-widest">{getStatusText()}</p>
        </div>

        {/* Métricas */}
        <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Taxa de Acerto</p>
              <p className="text-white font-black text-xs">{node.accuracy || 0}%</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${node.accuracy || 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Frequência ENEM</p>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < (node.enem_frequency || 1) ? 'bg-amber-400' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Erros
            </p>
            <p className="text-red-400 font-black text-lg">{node.errors_count || 0}</p>
          </div>
        </div>

        {/* Resumo */}
        <div>
          <h3 className="text-white font-black mb-3 text-sm flex items-center gap-2 uppercase tracking-widest">
            <Brain className="w-4 h-4 text-indigo-400" /> Resumo
          </h3>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
            {loading ? (
              <div className="animate-pulse h-10 bg-indigo-500/20 rounded"></div>
            ) : (
              <p className="text-indigo-200 text-sm italic">{summary}</p>
            )}
          </div>
        </div>

        {/* Erros Recentes */}
        {!loading && errors.length > 0 && (
          <div>
            <h3 className="text-white font-black mb-3 text-sm flex items-center gap-2 uppercase tracking-widest">
              <Target className="w-4 h-4 text-red-400" /> Últimos Erros
            </h3>
            <div className="flex flex-col gap-2">
              {errors.map((error, i) => (
                <div key={i} className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                  <p className="text-red-300 font-bold text-xs uppercase tracking-widest">{error.error_type}</p>
                  <p className="text-slate-400 text-xs mt-1">{error.description || 'Sem descrição.'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tópicos Relacionados */}
        {relatedTopics.length > 0 && (
          <div>
            <h3 className="text-white font-black mb-3 text-sm uppercase tracking-widest">
              🔗 Relacionados
            </h3>
            <div className="flex flex-col gap-2">
              {relatedTopics.map((rel, i) => {
                const isFrom = rel.from === node.id;
                const otherNodeId = isFrom ? rel.to : rel.from;
                return (
                  <div key={i} className="text-xs font-bold text-teal-400 hover:text-teal-300 cursor-pointer bg-teal-500/5 p-2 rounded-lg border border-teal-500/10">
                    {isFrom ? 'Conecta a' : 'Conectado por'} ID: {otherNodeId.substring(0, 4)}... ({rel.type})
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
