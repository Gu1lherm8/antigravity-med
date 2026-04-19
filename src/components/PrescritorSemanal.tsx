import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, BookOpen, Layers, X, Save, 
  ChevronRight, Brain, Clock, CheckCircle2,
  Trash2, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { subjectService, topicService } from '../services/studyService';
import { intentionService, WeeklyIntention } from '../services/intentionService';
import { eventBus, APP_EVENTS } from '../services/eventBus';

export function PrescritorSemanal() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchTopic, setSearchTopic] = useState('');
  
  const [intentions, setIntentions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const diff = today.getDate() - today.getDay();
  const weekStart = new Date(today.setDate(diff)).toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [weekStart]);

  async function loadData() {
    setLoading(true);
    
    // Tratamento independente das matérias (Garante que a UI renderiza)
    try {
      const subs = await subjectService.getAll();
      setSubjects(subs);
    } catch (err) {
      console.error("Erro ao carregar matérias:", err);
    }

    try {
      const currentIntentions = await intentionService.getByWeek(weekStart);
      setIntentions(currentIntentions);
    } catch (err) {
      console.error("Erro ao carregar intenções (Prescritor):", err);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (selectedSubject) {
      topicService.getBySubject(selectedSubject).then(setTopics);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  async function addIntention(topic: any) {
    if (intentions.find(i => i.topic_id === topic.id)) return;
    
    const subject = subjects.find(s => s.id === topic.subject_id);
    
    const newItem = {
      subject_id: topic.subject_id,
      topic_id: topic.id,
      week_start: weekStart,
      duration_minutes: 90,
      subjects: { name: subject.name, color: subject.color },
      topics: { name: topic.name, front: topic.front }
    };

    setSaving(true);
    try {
      const saved = await intentionService.addIntention(newItem as any);
      setIntentions([...intentions, { ...newItem, id: saved.id }]);
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED); // Notificar calendário
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function removeIntention(id: string) {
    try {
      await intentionService.deleteIntention(id);
      setIntentions(intentions.filter(i => i.id !== id));
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().includes(searchTopic.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-20">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Prescritor de Elite</h2>
            <p className="text-text-secondary text-sm font-medium">
              Selecione as aulas que você pretende ver. O Cérebro as encaixará no seu calendário.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Selector Panel */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">1. Escolha a Matéria</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500/50"
                >
                  <option value="" className="bg-[#0A0C14]">Selecione uma matéria...</option>
                  {subjects.map(s => <option key={s.id} value={s.id} className="bg-[#0A0C14]">{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">2. Busque o Assunto</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input 
                    type="text" 
                    placeholder="Ex: Óptica..." 
                    value={searchTopic}
                    onChange={(e) => setSearchTopic(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : selectedSubject ? (
                filteredTopics.length > 0 ? (
                  filteredTopics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => addIntention(topic)}
                      disabled={intentions.find(i => i.topic_id === topic.id)}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all text-left group disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                          topic.front === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          topic.front === 'B' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {topic.front || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{topic.name}</p>
                          <p className="text-[10px] text-text-secondary font-medium lowercase">Relevância ENEM: {topic.enem_relevance}/10</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <p className="p-10 text-center text-text-secondary text-sm">Nenhum assunto encontrado.</p>
                )
              ) : (
                <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                  <BookOpen className="w-12 h-12" />
                  <p className="text-sm font-black uppercase tracking-widest">Aguardando seleção de matéria</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prescription Basket */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-8">
          <div className="glass-card p-6 border-teal-500/30 bg-teal-500/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Layers className="w-4 h-4" /> Planejado para a Semana
              </h3>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-black">
                {intentions.length} AULAS
              </span>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {intentions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-3 opacity-40">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-500/50 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-teal-500" />
                  </div>
                  <p className="text-xs font-bold text-teal-500/70 uppercase">Cesta Vazia</p>
                </div>
              ) : (
                intentions.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between group">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest">{item.subjects?.name}</span>
                      <p className="text-sm font-bold text-white">{item.topics?.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-text-secondary"><Clock className="w-3 h-3" /> 90min</span>
                        <span className="text-[10px] text-teal-400 font-bold uppercase tracking-tighter">Frente {item.topics?.front || 'A'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeIntention(item.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {intentions.length > 0 && (
              <div className="mt-4 p-4 border border-teal-500/20 bg-teal-500/5 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-teal-400 shrink-0" />
                <p className="text-[10px] text-teal-200/60 leading-relaxed font-medium">
                  Pronto! Essas aulas agora estão reservadas. Prossiga para o **Calendário** e use a **Geração Inteligente** para alocá-las automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
