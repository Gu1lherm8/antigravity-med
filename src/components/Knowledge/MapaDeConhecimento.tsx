import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { KnowledgeGraph } from './KnowledgeGraph';
import { TopicDetailPanel } from './TopicDetailPanel';
import { Map, Filter, CheckCircle, Brain, AlertCircle, Loader2 } from 'lucide-react';

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

export function MapaDeConhecimento() {
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
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Buscar tópicos
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id);

      // Buscar conexões
      const { data: connectionsData } = await supabase
        .from('topic_connections')
        .select('*')
        .eq('user_id', user.id);

      // Buscar erros por tópico (contagem)
      const { data: errorsData } = await supabase
        .from('topic_errors')
        .select('topic_id')
        .eq('user_id', user.id);

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
    : nodes.filter(n => n.status === filter || n.subject === filter);

  // Garantir que as bordas só conectem nós que estão visíveis
  const filteredEdges = edges.filter(
    e => filteredNodes.some(n => n.id === e.from) &&
         filteredNodes.some(n => n.id === e.to)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#05060A] rounded-3xl border border-teal-500/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)]">
      {/* Header Interativo */}
      <header className="p-6 bg-[#020308] border-b border-teal-500/10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Mapa de Conhecimento</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Navegação Neural Interativa</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            {[
              { id: 'all', label: 'Todos', icon: Filter },
              { id: 'mastered', label: 'Dominados', icon: CheckCircle },
              { id: 'learning', label: 'Aprendendo', icon: Brain },
              { id: 'not_started', label: 'Pendentes', icon: AlertCircle },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f.id 
                    ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda Inteligente */}
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-6 py-2 px-6 bg-white/[0.02] rounded-full border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Dominado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Aprendendo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Crítico</span>
            </div>
          </div>
          <p className="text-[9px] font-black text-teal-400/50 uppercase tracking-widest">
            * O tamanho da bolinha indica a relevância no ENEM
          </p>
        </div>
      </header>

      {/* Área do Grafo */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 bg-[radial-gradient(circle_at_center,_#0a0c14_0%,_#05060a_100%)] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#05060A]/50 backdrop-blur-sm z-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
                <p className="text-xs font-black text-teal-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando Rede Neural...</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
              <div className="max-w-md flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                  <Map className="w-10 h-10 text-teal-500/40" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Mapa Vazio</h3>
                  <p className="text-slate-500 text-sm italic">
                    Para começar sua rede neural, adicione matérias e registre seus erros no Caderno de Bula. O sistema conectará as ideias automaticamente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <KnowledgeGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodeClick={setSelectedNode}
              selectedNode={selectedNode}
            />
          )}
        </div>

        {/* Painel de Detalhes lateral */}
        {selectedNode && (
          <TopicDetailPanel
            node={selectedNode}
            relatedTopics={edges.filter(
              e => e.from === selectedNode.id || e.to === selectedNode.id
            )}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
