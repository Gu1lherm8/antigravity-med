import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { KnowledgeGraph } from './KnowledgeGraph';
import { TopicDetailPanel } from './TopicDetailPanel';
import { Map, Filter, CheckCircle, Brain, AlertCircle, Loader2, Wrench } from 'lucide-react';
import { repairKnowledgeMap } from '../../services/repairMap';

interface TopicNode {
  id: string;
  name: string;
  subject: string;
  status: 'not_started' | 'learning' | 'mastered';
  accuracy: number;
  enem_frequency: number;
  last_studied?: Date;
  errors_count: number;
}

interface TopicEdge {
  from: string;
  to: string;
  type: string;
  description: string;
}

export function MapaDeConhecimento({ session }: { session: any }) {
  const [nodes, setNodes] = useState<TopicNode[]>([]);
  const [edges, setEdges] = useState<TopicEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<TopicNode | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, [filter]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const userId = session?.user?.id || 'manual_user';
      
      // Buscar tópicos
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', userId);

      // Buscar conexões
      const { data: connectionsData } = await supabase
        .from('topic_connections')
        .select('*')
        .eq('user_id', userId);

      // Buscar erros por tópico (contagem)
      const { data: errorsData } = await supabase
        .from('topic_errors')
        .select('topic_id')
        .eq('user_id', userId);

      // Processar contagem de erros
      const errorCounts: Record<string, number> = {};
      errorsData?.forEach(err => {
        errorCounts[err.topic_id] = (errorCounts[err.topic_id] || 0) + 1;
      });

      const processedNodes = topicsData?.map(topic => ({
        ...topic,
        errors_count: errorCounts[topic.id] || 0
      })) || [];

      setNodes(processedNodes);
      setEdges(connectionsData || []);
    } catch (error) {
      console.error('Erro ao carregar mapa:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes = filter === 'all' 
    ? nodes 
    : nodes.filter(n => n.status === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] glass-card">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-cyan-400 font-black tracking-widest uppercase text-xs">Sincronizando Rede Neural...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6    ">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Map className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Mapa de Conhecimento</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Navegação Neural Interativa</p>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 self-start md:self-auto">
          {[
            { id: 'all', label: 'Todos', icon: Filter },
            { id: 'mastered', label: 'Dominados', icon: CheckCircle },
            { id: 'learning', label: 'Aprendendo', icon: Brain },
            { id: 'not_started', label: 'Pendentes', icon: AlertCircle }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área do Grafo */}
      <div className="relative glass-card border-white/5 h-[600px] overflow-hidden bg-slate-950/40">
        <div className="absolute top-4 left-6 flex gap-6 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dominado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aprendendo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crítico</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[10px] italic text-slate-500 uppercase tracking-widest">* O tamanho da bolinha indica a relevância no ENEM</span>
          </div>
        </div>

        {nodes.length > 0 ? (
          <KnowledgeGraph 
            nodes={filteredNodes} 
            edges={edges} 
            onNodeClick={setSelectedNode} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Map className="w-16 h-16 text-slate-700" />
            <div className="text-center">
              <p className="text-xl font-black text-white uppercase tracking-tight">Mapa Vazio</p>
              <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
                Para começar sua rede neural, adicione matérias e registre seus erros no Caderno de Bula. 
              </p>
              <button 
                onClick={async () => {
                  setLoading(true);
                  await repairKnowledgeMap();
                  await loadMapData();
                }}
                className="mt-6 px-6 py-3 bg-cyan-500/10 border border-cyan-500/50 rounded-2xl text-cyan-400 text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-2 mx-auto"
              >
                <Wrench className="w-4 h-4" /> Sincronizar Tudo Agora
              </button>
            </div>
          </div>
        )}

        {/* Painel de Detalhes */}
        {selectedNode && (
          <TopicDetailPanel 
            topic={selectedNode} 
            onClose={() => setSelectedNode(null)} 
          />
        )}
      </div>
    </div>
  );
}
