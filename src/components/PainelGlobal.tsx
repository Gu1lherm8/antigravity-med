import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Target, 
  AlertCircle, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GlobalStats {
  subject_id: string;
  subject_name: string;
  color: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  history: any[];
}

export function PainelGlobal() {
  const [stats, setStats] = useState<GlobalStats[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'natureza' | 'humanas'>('all');

  useEffect(() => {
    loadGlobalData();
  }, [filter]);

  async function loadGlobalData() {
    setLoading(true);
    
    // 1. Buscar todas as sessões para calcular performance por matéria
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*, subjects(name, color, area)');
    
    // 2. Buscar revisões pendentes
    const today = new Date().toISOString().split('T')[0];
    const { data: revs } = await supabase
      .from('study_sessions')
      .select('*, topics(name), subjects(name, color)')
      .or(`next_revision_date.lte.${today}`)
      .eq('is_revision_done', false)
      .order('next_revision_date');

    if (sessions) {
      const grouped = sessions.reduce((acc: any, curr: any) => {
        const subId = curr.subject_id;
        if (!acc[subId]) {
          acc[subId] = {
            subject_id: subId,
            subject_name: curr.subjects?.name || 'Geral',
            color: curr.subjects?.color || '#3b82f6',
            total_questions: 0,
            correct_answers: 0,
            history: []
          };
        }
        if (curr.session_type === 'questoes' || curr.session_type === 'global') {
          acc[subId].total_questions += curr.total_questions || 0;
          acc[subId].correct_answers += curr.correct_answers || 0;
        }
        acc[subId].history.push(curr);
        return acc;
      }, {});

      const processedStats = Object.values(grouped).map((s: any) => ({
        ...s as GlobalStats,
        accuracy: s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0
      })).sort((a, b) => a.accuracy - b.accuracy); // Piores primeiro

      setStats(processedStats);
    }

    setRevisions(revs || []);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Painel de Voo</h2>
          <p className="text-text-secondary mt-2">Visão panorâmica da sua performance e missões pendentes</p>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
          {['all', 'critical', 'natureza'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === f ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
            >
              {f === 'all' ? 'Tudo' : f === 'critical' ? 'Críticos' : 'Natureza'}
            </button>
          ))}
        </div>
      </header>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Ranking de Performance (Pontos Cegos) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Radar de Ponto Cego</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((subject, idx) => (
              <div 
                key={subject.subject_id}
                className="glass-card p-6 flex flex-col gap-4 border-l-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ borderLeftColor: subject.color, animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-black text-white">{subject.subject_name}</h4>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">
                      {subject.total_questions} Questões Registradas
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-black ${subject.accuracy < 60 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {subject.accuracy}%
                  </div>
                </div>
                
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${subject.accuracy}%`, backgroundColor: subject.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary">
                  <span>META: 80%</span>
                  <span>{subject.accuracy < 80 ? `FALTAM ${80 - subject.accuracy}%` : 'META ATINGIDA'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Registro de Rodada Global */}
          <button className="btn-primary mt-4 flex items-center justify-center gap-3 py-5 rounded-3xl border border-white/10 bg-gradient-to-r from-primary/20 to-purple-500/20 hover:brightness-125 transition-all">
            <Target className="w-6 h-6" />
            <div className="text-left">
              <p className="text-sm font-black text-white">Nova Rodada Global</p>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Registrar simulado ou questões de matéria completa</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto text-primary" />
          </button>
        </div>

        {/* Lado Direito: Radar de Missões (Revisões) */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Radar de Missões</h3>
          </div>

          {revisions.length === 0 ? (
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed opacity-50">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-bold text-text-secondary uppercase">Sistema Limpo</p>
              <p className="text-xs text-text-secondary/60">Não há revisões urgentes para o seu cronograma hoje.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {revisions.map((rev, idx) => (
                <div key={rev.id} className="glass-card p-4 flex gap-4 hover:border-white/20 transition-all border-l-4" style={{ borderLeftColor: rev.subjects?.color }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rev.session_type === 'aula' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                    {rev.session_type === 'aula' ? <Clock className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em]">{rev.subjects?.name}</p>
                    <p className="font-bold text-white truncate">{rev.topics?.name || 'Matéria Global'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] font-bold text-red-400 uppercase">Vencimento: {new Date(rev.next_revision_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <h4 className="text-xs font-black text-white uppercase mb-3">Resumo da Frota</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-text-secondary">TEORIA CONCLUÍDA</span>
                  <span className="text-white">64%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[64%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-text-secondary">QUESTÕES (ACURÁCIA)</span>
                  <span className="text-white">78%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[78%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
