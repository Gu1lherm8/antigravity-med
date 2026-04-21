import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  BookOpen, ChevronDown, ChevronUp, CheckCircle2, Clock,
  RefreshCw, Star, AlertCircle, X, Filter, Trophy, Zap, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { offlineService } from '../services/offlineService';

interface ErrorEntry {
  id: string;
  question_text: string;
  discipline: string;
  topic: string;
  wrong_answer: string;
  correct_answer: string;
  error_reason: string;
  simple_explanation: string;
  recommended_action: string;
  times_reviewed: number;
  times_correct_after: number;
  mastered: boolean;
  created_at: string;
  last_reviewed_at: string;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  'Biologia': '#10b981',
  'Química': '#f59e0b',
  'Física': '#3b82f6',
  'Matemática': '#6366f1',
  'Português': '#ec4899',
  'História': '#f97316',
  'Geografia': '#84cc16',
  'Geral': '#6b7280',
};

export function CadernoDeErros({ session }: { session: any }) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'dominados'>('todos');
  const [filtroMateria, setFiltroMateria] = useState('todas');
  const [formAberto, setFormAberto] = useState(false);
  const [novoErro, setNovoErro] = useState({
    question_text: '',
    discipline: 'Geral',
    topic: '',
    wrong_answer: '',
    correct_answer: '',
    error_reason: '',
    simple_explanation: '',
    recommended_action: '',
  });

  useEffect(() => { loadErrors(); }, []);

  async function loadErrors() {
    setLoading(true);
    const { data } = await supabase
      .from('error_notebook')
      .select('*')
      .order('created_at', { ascending: false });
    setErrors(data || []);
    setLoading(false);
  }

  async function markReviewed(id: string, acertou: boolean) {
    const entry = errors.find(e => e.id === id);
    if (!entry) return;
    const newCorrect = acertou ? entry.times_correct_after + 1 : entry.times_correct_after;
    const mastered = newCorrect >= 3;
    
    // Uso do OfflineService para garantir resiliência
    await offlineService.enqueueTask('error_notebook', {
      id,
      times_reviewed: entry.times_reviewed + 1,
      times_correct_after: newCorrect,
      mastered,
      last_reviewed_at: new Date().toISOString(),
    }, 'UPDATE');
    
    await loadErrors();
  }

  async function saveNovoErro() {
    if (!novoErro.question_text.trim()) return;
    
    // Classificação automática simples
    let errorType = 'strategy';
    const explanation = novoErro.error_reason.toLowerCase();
    
    if (explanation.includes('atenção') || explanation.includes('li errado')) {
      errorType = 'reading';
    } else if (explanation.includes('confundi') || novoErro.wrong_answer.toLowerCase().includes('meiose')) {
      errorType = 'confusion';
    } else if (explanation.includes('fórmula') || explanation.includes('conta') || explanation.includes('cálculo')) {
      errorType = 'calculation';
    } else if (explanation.includes('não sabia') || explanation.includes('nunca vi')) {
      errorType = 'knowledge';
    } else if (explanation.includes('tempo') || explanation.includes('nervoso') || explanation.includes('pressão')) {
      errorType = 'pressure';
    }

    // Inserção via OfflineService
    await offlineService.enqueueTask('error_notebook', novoErro, 'INSERT');
    
    // Inserção no sistema de análise inteligente
    const userId = session?.user?.id || 'manual_user';
    
    await supabase.from('error_analysis').insert({
      user_id: userId,
      question_id: 'CADERNO_MANUAL',
      subject: novoErro.discipline,
      topic: novoErro.topic,
      your_answer: novoErro.wrong_answer,
      correct_answer: novoErro.correct_answer,
      error_type: errorType,
      confidence: 50,
      time_spent: 60,
      explanation: novoErro.error_reason,
      context: 'manual_entry'
    });

    // 1. Verificar se o tópico já existe no mapa
    const { data: existingTopic } = await supabase
      .from('topics')
      .select('id, errors_count')
      .eq('user_id', userId)
      .eq('name', novoErro.topic)
      .maybeSingle();

    let topicId;

    if (existingTopic) {
      topicId = existingTopic.id;
      await supabase
        .from('topics')
        .update({
          errors_count: (existingTopic.errors_count || 0) + 1,
          status: 'learning',
          last_studied: new Date()
        })
        .eq('id', topicId);
    } else {
      const { data: newTopic } = await supabase
        .from('topics')
        .insert({
          user_id: userId,
          name: novoErro.topic,
          subject: novoErro.discipline,
          status: 'learning',
          accuracy: 0,
          enem_frequency: 3,
          last_studied: new Date()
        })
        .select()
        .single();
      
      if (newTopic) topicId = newTopic.id;
    }

    if (topicId) {
      await supabase.from('topic_errors').insert({
        user_id: userId,
        topic_id: topicId,
        error_type: errorType,
        description: novoErro.error_reason,
        error_date: new Date()
      });
    }

    setFormAberto(false);
    setNovoErro({ question_text: '', discipline: 'Geral', topic: '', wrong_answer: '', correct_answer: '', error_reason: '', simple_explanation: '', recommended_action: '' });
    await loadErrors();
  }

  async function deleteError(id: string) {
    if (!confirm('Você tem certeza que deseja excluir este erro permanentemente?')) return;
    const { error } = await supabase.from('error_notebook').delete().eq('id', id);
    if (!error) {
      setErrors(errors.filter(e => e.id !== id));
      if (expandido === id) setExpandido(null);
    }
  }

  const materias = ['todas', ...Array.from(new Set(errors.map(e => e.discipline)))];

  const filtrados = errors.filter(e => {
    const statusOk = filtro === 'todos' || (filtro === 'pendentes' ? !e.mastered : e.mastered);
    const materiaOk = filtroMateria === 'todas' || e.discipline === filtroMateria;
    return statusOk && materiaOk;
  });

  const totalErros = errors.length;
  const dominados = errors.filter(e => e.mastered).length;
  const pendentes = totalErros - dominados;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8    ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">📕 Caderno de Erros</h2>
          <p className="text-text-secondary mt-1">Cada erro é uma lição. Domine para apagar.</p>
        </div>
        <button onClick={() => setFormAberto(true)} className="btn-primary flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Registrar Erro
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Erros', val: totalErros, icon: AlertCircle, cor: '#ef4444' },
          { label: 'Pendentes', val: pendentes, icon: RefreshCw, cor: '#f59e0b' },
          { label: 'Dominados ✅', val: dominados, icon: Trophy, cor: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.cor + '20' }}>
              <s.icon className="w-5 h-5" style={{ color: s.cor }} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{s.val}</p>
              <p className="text-text-secondary text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['todos', 'pendentes', 'dominados'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filtro === f ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-text-secondary" />
          <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
            {materias.map(m => <option key={m} value={m} className="bg-[#0A0C14]">{m === 'todas' ? 'Todas as Matérias' : m}</option>)}
          </select>
        </div>
      </div>

      {/* Lista de erros */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Nenhum erro aqui!</p>
            <p className="text-text-secondary mt-1">
              {filtro === 'dominados' ? 'Você ainda não dominou nenhum erro.' : 'Nenhum erro pendente para esta seleção.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((entry, idx) => {
            const cor = DISCIPLINE_COLORS[entry.discipline] || '#6b7280';
            const isOpen = expandido === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-2xl border transition-all group    ${entry.mastered ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Cabeçalho do card */}
                <div
                  className="w-full flex items-center gap-4 p-4 text-left cursor-pointer select-none"
                  onClick={() => setExpandido(isOpen ? null : entry.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: cor + '20', color: cor }}>{entry.discipline}</span>
                      {entry.topic && <span className="text-xs text-text-secondary">{entry.topic}</span>}
                      {entry.mastered && <span className="text-xs font-black text-emerald-400 ml-auto flex items-center gap-1"><Trophy className="w-3 h-3" /> DOMINADO</span>}
                    </div>
                    <p className="text-sm font-bold text-white line-clamp-2">{entry.question_text}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-black text-white">{entry.times_correct_after}/3</p>
                      <p className="text-[9px] text-text-secondary">acertos</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteError(entry.id); }}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Excluir Erro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isOpen && (
                  <div className="overflow-hidden   ">
                    <div className="px-6 pb-6 flex flex-col gap-4">
                      <div className="w-full h-px bg-white/10" />

                      <div className="grid grid-cols-2 gap-4">
                        {entry.wrong_answer && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Resposta Errada</p>
                            <p className="text-sm text-white">{entry.wrong_answer}</p>
                          </div>
                        )}
                        {entry.correct_answer && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Resposta Correta</p>
                            <p className="text-sm text-white">{entry.correct_answer}</p>
                          </div>
                        )}
                      </div>

                      {entry.error_reason && (
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">⚠️ Motivo do Erro</p>
                          <p className="text-sm text-white/80">{entry.error_reason}</p>
                        </div>
                      )}

                      {entry.simple_explanation && (
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">💡 Explicação Simples</p>
                          <p className="text-sm text-white/80">{entry.simple_explanation}</p>
                        </div>
                      )}

                      {entry.recommended_action && (
                        <div className="p-3 rounded-xl bg-white/5">
                          <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">🎯 Ação Recomendada</p>
                          <p className="text-sm text-white/80">{entry.recommended_action}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Clock className="w-3 h-3" />
                          Revisado {entry.times_reviewed}x • Última: {new Date(entry.last_reviewed_at).toLocaleDateString('pt-BR')}
                        </div>
                        {!entry.mastered && (
                          <div className="flex gap-2">
                            <button onClick={() => markReviewed(entry.id, false)} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1">
                              <X className="w-3 h-3" /> Errei de novo
                            </button>
                            <button onClick={() => markReviewed(entry.id, true)} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Acertei!
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Barra de progresso do domínio */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Domínio</span>
                          <span className="text-[10px] text-text-secondary">{entry.times_correct_after}/3 acertos consecutivos</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min((entry.times_correct_after / 3) * 100, 100)}%`, backgroundColor: cor }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — Registrar novo erro */}
      {formAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto   ">
          <div className="glass-card p-6 w-full max-w-lg my-8   ">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">📕 Registrar Erro</h3>
              <button onClick={() => setFormAberto(false)} className="text-text-secondary hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label-form">Questão / Enunciado *</label>
                <textarea value={novoErro.question_text} onChange={e => setNovoErro({ ...novoErro, question_text: e.target.value })} placeholder="Descreva o que foi perguntado..." rows={3} className="w-full input-form resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-form">Matéria</label>
                  <select value={novoErro.discipline} onChange={e => setNovoErro({ ...novoErro, discipline: e.target.value })} className="w-full input-form">
                    {Object.keys(DISCIPLINE_COLORS).map(d => <option key={d} value={d} className="bg-[#0A0C14]">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-form">Tópico</label>
                  <input value={novoErro.topic} onChange={e => setNovoErro({ ...novoErro, topic: e.target.value })} placeholder="Ex: Genética" className="w-full input-form" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-form">Minha Resposta (errada)</label>
                  <input value={novoErro.wrong_answer} onChange={e => setNovoErro({ ...novoErro, wrong_answer: e.target.value })} placeholder="Ex: Alternativa B" className="w-full input-form" />
                </div>
                <div>
                  <label className="label-form">Resposta Correta</label>
                  <input value={novoErro.correct_answer} onChange={e => setNovoErro({ ...novoErro, correct_answer: e.target.value })} placeholder="Ex: Alternativa D" className="w-full input-form" />
                </div>
              </div>
              <div>
                <label className="label-form">Por que errei? (Escolha uma opção)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { id: 'Falta de Base (Conhecimento)', label: '📚 Falta de Base' },
                    { id: 'Interpretação de Texto', label: '📖 Interpretação' },
                    { id: 'Confundi os Conceitos', label: '🔄 Confundi' },
                    { id: 'Erro de Atenção / Bobeira', label: '⚡ Atenção' },
                    { id: 'Erro de Cálculo', label: '🔢 Cálculo' },
                    { id: 'Falta de Tempo / Pressão', label: '⏳ Tempo' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNovoErro({...novoErro, error_reason: opt.id})}
                      className={clsx(
                        "py-2 px-3 rounded-xl text-xs font-bold transition-all border text-left",
                        novoErro.error_reason === opt.id 
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-form">Explicação Simples</label>
                <textarea value={novoErro.simple_explanation} onChange={e => setNovoErro({ ...novoErro, simple_explanation: e.target.value })} placeholder="Em palavras simples, o conceito correto é..." rows={2} className="w-full input-form resize-none" />
              </div>
              <div>
                <label className="label-form">Ação Recomendada</label>
                <input value={novoErro.recommended_action} onChange={e => setNovoErro({ ...novoErro, recommended_action: e.target.value })} placeholder="Ex: Rever aula de Meiose, fazer 5 questões deste tópico" className="w-full input-form" />
              </div>
              <button onClick={saveNovoErro} className="w-full py-4 bg-primary rounded-2xl font-black text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                Registrar no Caderno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
