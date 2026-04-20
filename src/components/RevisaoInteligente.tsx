import React, { useState, useEffect, useCallback } from 'react';
import {
  BookMarked, Plus, X, Save, ChevronRight, Clock,
  CheckCircle2, AlertTriangle, AlertCircle, Mic2,
  FileText, HelpCircle, Layers, BarChart3, TrendingUp,
  TrendingDown, Minus, Edit3, Trash2, RefreshCw,
  Play, BookOpen, Brain, Zap, Target, Calendar,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import {
  studyModulesService,
  StudyModule,
  ReviewTodayItem,
  NewModulePayload,
  calcularTaxaAcerto,
  getUrgency,
} from '../services/studyModulesService';

// ── Helpers visuais ──────────────────────────────────────────

const URGENCY_CONFIG = {
  overdue: { label: 'URGENTE', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500', icon: AlertTriangle },
  today:   { label: 'HOJE',    color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500', icon: Clock },
  soon:    { label: 'EM BREVE',color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500', icon: Calendar },
  ok:      { label: 'OK',      color: 'text-slate-400', bg: 'bg-white/5 border-white/10', dot: 'bg-slate-500', icon: CheckCircle2 },
};

const TIPO_CONFIG = {
  resumo:     { emoji: '📖', label: 'Resumo',     minutos: 5,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  questoes:   { emoji: '❓', label: 'Questões',   minutos: 10, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  flashcards: { emoji: '🃏', label: 'Flashcards', minutos: 3,  color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
};

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  if (diff < 0) return `${Math.abs(diff)} dias atrás`;
  return `em ${diff} dias`;
}

function AccuracyBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-secondary text-xs">—</span>;
  const color = value >= 75 ? 'text-emerald-400' : value >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-black text-sm ${color}`}>{value}%</span>;
}

// ── Modal de Nova Aula (4 passos) ────────────────────────────

interface NovaAulaModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function NovaAulaModal({ onClose, onSaved }: NovaAulaModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewModulePayload>({
    materia: '',
    frente: '',
    aula_numero: undefined,
    assunto: '',
    descricao: '',
    data_estudo: new Date().toISOString().split('T')[0],
    texto_resumo: '',
    audio_url: '',
    total_questions: undefined,
    correct_answers: undefined,
    total_cards: undefined,
    mastered: undefined,
    learning: undefined,
    not_learned: undefined,
    cards_content: '',
  });

  const set = (k: keyof NewModulePayload, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.materia.trim() || !form.assunto.trim()) return;
    setSaving(true);
    try {
      await studyModulesService.create(form);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const taxaQuestoes = form.total_questions
    ? calcularTaxaAcerto(form.correct_answers || 0, form.total_questions)
    : null;
  const taxaFlash = form.total_cards
    ? Math.round(((form.mastered || 0) / form.total_cards) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-2xl border-teal-500/20 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Nova Aula</h3>
              <p className="text-xs text-text-secondary">Passo {step} de 4</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de passos */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? 'bg-teal-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* Conteúdo do passo */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* PASSO 1 — Dados básicos */}
          {step === 1 && (
            <>
              <div>
                <p className="text-xs font-black text-teal-400 uppercase tracking-widest mb-4">🏷️ Dados da Aula</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Matéria *</label>
                    <input value={form.materia} onChange={e => set('materia', e.target.value)} placeholder="Ex: Biologia" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-teal-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Frente</label>
                    <select value={form.frente || ''} onChange={e => set('frente', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500/50">
                      <option value="" className="bg-[#0A0C14]">Selecionar...</option>
                      <option value="A" className="bg-[#0A0C14]">Frente A</option>
                      <option value="B" className="bg-[#0A0C14]">Frente B</option>
                      <option value="C" className="bg-[#0A0C14]">Frente C</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Nº da Aula</label>
                    <input type="number" value={form.aula_numero || ''} onChange={e => set('aula_numero', parseInt(e.target.value) || undefined)} placeholder="Ex: 12" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-teal-500/50 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Assunto *</label>
                    <input value={form.assunto} onChange={e => set('assunto', e.target.value)} placeholder="Ex: Mitose e Meiose" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-teal-500/50 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Data do Estudo</label>
                    <input type="date" value={form.data_estudo} onChange={e => set('data_estudo', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500/50" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PASSO 2 — Resumo NotebookLM */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-xs text-blue-200/70">Cole aqui o resumo gerado pelo <strong>NotebookLM</strong>. Se não tiver ainda, pode deixar em branco e adicionar depois.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">📖 Texto do Resumo</label>
                <textarea value={form.texto_resumo || ''} onChange={e => set('texto_resumo', e.target.value)} placeholder="Cole o resumo gerado pelo NotebookLM aqui..." rows={8} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-blue-500/50 outline-none resize-none text-sm leading-relaxed" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">🔊 URL do Áudio (NotebookLM)</label>
                <input value={form.audio_url || ''} onChange={e => set('audio_url', e.target.value)} placeholder="https://... (Google Drive, YouTube, etc.)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-blue-500/50 outline-none" />
                <p className="text-[10px] text-text-secondary mt-1.5">Cole o link do podcast gerado pelo NotebookLM (qualquer URL pública).</p>
              </div>
            </>
          )}

          {/* PASSO 3 — Questões */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-200/70">Quantas questões você fez sobre este tópico? O sistema vai calcular quando revisar.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Total de Questões</label>
                  <input type="number" min="0" value={form.total_questions || ''} onChange={e => set('total_questions', parseInt(e.target.value) || undefined)} placeholder="Ex: 8" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-emerald-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Quantas Acertou</label>
                  <input type="number" min="0" max={form.total_questions || 9999} value={form.correct_answers || ''} onChange={e => set('correct_answers', parseInt(e.target.value) || undefined)} placeholder="Ex: 6" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-emerald-500/50 outline-none" />
                </div>
              </div>
              {taxaQuestoes !== null && (
                <div className={`p-4 rounded-xl flex items-center justify-between border ${taxaQuestoes >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : taxaQuestoes >= 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <span className="text-sm font-bold text-text-secondary">Taxa de acerto</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-black ${taxaQuestoes >= 75 ? 'text-emerald-400' : taxaQuestoes >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{taxaQuestoes}%</span>
                    <span className="text-xs text-text-secondary">
                      → revisar em {taxaQuestoes >= 90 ? '7' : taxaQuestoes >= 75 ? '3' : taxaQuestoes >= 60 ? '1' : '0'} dia{taxaQuestoes < 90 && taxaQuestoes >= 75 ? 's' : taxaQuestoes >= 90 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              {!form.total_questions && (
                <p className="text-center text-text-secondary text-sm py-4 opacity-60">Deixe em branco se não fez questões ainda.</p>
              )}
            </>
          )}

          {/* PASSO 4 — Flashcards */}
          {step === 4 && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                <Layers className="w-5 h-5 text-purple-400 shrink-0" />
                <p className="text-xs text-purple-200/70">Registre seus flashcards do NotebookLM ou Anki. O sistema calcula quando reverter.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Total de Flashcards</label>
                  <input type="number" min="0" value={form.total_cards || ''} onChange={e => set('total_cards', parseInt(e.target.value) || undefined)} placeholder="Ex: 12" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-purple-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">✅ Dominados</label>
                  <input type="number" min="0" value={form.mastered || ''} onChange={e => set('mastered', parseInt(e.target.value) || undefined)} placeholder="Ex: 8" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-purple-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">🟡 Estudando</label>
                  <input type="number" min="0" value={form.learning || ''} onChange={e => set('learning', parseInt(e.target.value) || undefined)} placeholder="Ex: 3" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-purple-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">❌ Não Aprendido</label>
                  <input type="number" min="0" value={form.not_learned || ''} onChange={e => set('not_learned', parseInt(e.target.value) || undefined)} placeholder="Ex: 1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-purple-500/50 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Conteúdo / Resumo dos Cards</label>
                  <textarea value={form.cards_content || ''} onChange={e => set('cards_content', e.target.value)} placeholder="Cole os flashcards ou anotações relevantes..." rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-purple-500/50 outline-none resize-none text-sm" />
                </div>
              </div>
              {taxaFlash !== null && (
                <div className={`p-4 rounded-xl flex items-center justify-between border ${taxaFlash >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <span className="text-sm font-bold text-text-secondary">Cards dominados</span>
                  <span className={`text-2xl font-black ${taxaFlash >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{taxaFlash}%</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer com botões */}
        <div className="flex gap-3 p-6 pt-4 border-t border-white/5 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 rounded-xl bg-white/5 text-text-secondary hover:text-white transition-all font-bold text-sm">
              ← Voltar
            </button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!form.materia.trim() || !form.assunto.trim())}
              className="px-6 py-3 rounded-xl bg-teal-500 text-white font-black text-sm hover:bg-teal-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-teal-500 text-white font-black text-sm hover:bg-teal-400 transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(20,184,166,0.4)]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Aula'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal de Conclusão de Revisão ────────────────────────────

interface ConcluirRevisaoModalProps {
  item: ReviewTodayItem;
  onClose: () => void;
  onSaved: () => void;
}

function ConcluirRevisaoModal({ item, onClose, onSaved }: ConcluirRevisaoModalProps) {
  const [acerto, setAcerto] = useState(item.accuracyPercent ?? 75);
  const [tempo, setTempo] = useState(item.estimatedMinutes);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await studyModulesService.completeReview(
        item.tipo,
        item.recordId,
        item.moduleId,
        acerto,
        tempo
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const tipoConf = TIPO_CONFIG[item.tipo];
  const proximaDias = acerto >= 90 ? 7 : acerto >= 75 ? 3 : acerto >= 60 ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md border-teal-500/20">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tipoConf.emoji}</span>
            <div>
              <h3 className="text-base font-black text-white">Concluir Revisão</h3>
              <p className="text-xs text-text-secondary">{item.assunto} — {tipoConf.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                {item.tipo === 'flashcards' ? 'Cards dominados (%)' : 'Taxa de acerto (%)'}
              </label>
              <span className={`text-2xl font-black ${acerto >= 75 ? 'text-emerald-400' : acerto >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{acerto}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={acerto} onChange={e => setAcerto(parseInt(e.target.value))} className={`w-full ${acerto >= 75 ? 'accent-emerald-500' : acerto >= 60 ? 'accent-amber-500' : 'accent-red-500'}`} />
            <div className="flex justify-between text-[10px] text-text-secondary/50 font-bold mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
            <span className="text-sm font-bold text-text-secondary">Próxima revisão</span>
            <span className="text-base font-black text-indigo-400">
              {proximaDias === 0 ? 'hoje (urgente)' : `em ${proximaDias} dia${proximaDias > 1 ? 's' : ''}`}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Tempo gasto (min)</label>
            <input type="number" min="1" value={tempo} onChange={e => setTempo(parseInt(e.target.value) || 1)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500/50" />
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(20,184,166,0.3)]">
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Marcar como Concluído'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de Módulo ───────────────────────────────────────────

function ModuleCard({ mod, onClick }: { mod: StudyModule; onClick: () => void }) {
  const summaryUrgency = getUrgency(mod.summary?.proxima_revisao ?? null);
  const questoesUrgency = getUrgency(mod.questions?.proxima_revisao ?? null);
  const flashUrgency = getUrgency(mod.flashcards?.proxima_revisao ?? null);

  const maxUrgency = [summaryUrgency, questoesUrgency, flashUrgency].reduce((acc, u) => {
    const order = { overdue: 0, today: 1, soon: 2, ok: 3 };
    return order[u] < order[acc] ? u : acc;
  }, 'ok' as 'overdue' | 'today' | 'soon' | 'ok');

  const urgConf = URGENCY_CONFIG[maxUrgency];
  const UrgIcon = urgConf.icon;

  const taxaQuestoes = mod.questions
    ? calcularTaxaAcerto(mod.questions.correct_answers, mod.questions.total_questions)
    : null;
  const taxaFlash = mod.flashcards && mod.flashcards.total_cards > 0
    ? Math.round((mod.flashcards.mastered / mod.flashcards.total_cards) * 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all duration-300 group flex flex-col gap-4"
    >
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{mod.materia}</span>
            {mod.frente && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-text-secondary uppercase">Frente {mod.frente}</span>
            )}
            {mod.aula_numero && (
              <span className="text-[9px] text-text-secondary">Aula {mod.aula_numero}</span>
            )}
          </div>
          <h4 className="font-black text-white text-sm leading-tight truncate">{mod.assunto}</h4>
          <p className="text-[10px] text-text-secondary mt-0.5">
            {new Date(mod.data_estudo + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {maxUrgency !== 'ok' && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase shrink-0 ${urgConf.bg} ${urgConf.color}`}>
            <UrgIcon className="w-3 h-3" />
            {urgConf.label}
          </div>
        )}
      </div>

      {/* Status dos 3 pilares */}
      <div className="flex flex-col gap-2">
        {/* Resumo */}
        {mod.summary ? (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary">
              <span>📖</span> Resumo
              {mod.summary.audio_url && <span className="text-[9px] text-blue-400 font-bold">🔊</span>}
            </span>
            <span className={`font-bold text-[10px] ${URGENCY_CONFIG[summaryUrgency].color}`}>
              {summaryUrgency === 'ok' ? `Rev. ${formatRelativeDate(mod.summary.proxima_revisao)}` : `⚠️ Revisar ${formatRelativeDate(mod.summary.proxima_revisao)}`}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs opacity-30">
            <span className="flex items-center gap-2 text-text-secondary"><span>📖</span> Resumo</span>
            <span className="text-text-secondary text-[10px]">Não cadastrado</span>
          </div>
        )}

        {/* Questões */}
        {mod.questions ? (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary"><span>❓</span> Questões</span>
            <div className="flex items-center gap-2">
              <AccuracyBadge value={taxaQuestoes} />
              <span className={`font-bold text-[10px] ${URGENCY_CONFIG[questoesUrgency].color}`}>
                {questoesUrgency === 'ok' ? formatRelativeDate(mod.questions.proxima_revisao) : `⚠️ ${formatRelativeDate(mod.questions.proxima_revisao)}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs opacity-30">
            <span className="flex items-center gap-2 text-text-secondary"><span>❓</span> Questões</span>
            <span className="text-text-secondary text-[10px]">Não cadastrado</span>
          </div>
        )}

        {/* Flashcards */}
        {mod.flashcards ? (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary"><span>🃏</span> Flashcards</span>
            <div className="flex items-center gap-2">
              <AccuracyBadge value={taxaFlash} />
              <span className={`font-bold text-[10px] ${URGENCY_CONFIG[flashUrgency].color}`}>
                {flashUrgency === 'ok' ? formatRelativeDate(mod.flashcards.proxima_revisao) : `⚠️ ${formatRelativeDate(mod.flashcards.proxima_revisao)}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs opacity-30">
            <span className="flex items-center gap-2 text-text-secondary"><span>🃏</span> Flashcards</span>
            <span className="text-text-secondary text-[10px]">Não cadastrado</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">
        Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

// ── Modal de Detalhes da Aula ────────────────────────────────

function ModuleDetailModal({ mod, onClose, onUpdated }: { mod: StudyModule; onClose: () => void; onUpdated: () => void }) {
  const [showReviewModal, setShowReviewModal] = useState<ReviewTodayItem | null>(null);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [qTotal, setQTotal] = useState(mod.questions?.total_questions ?? 0);
  const [qCorrect, setQCorrect] = useState(mod.questions?.correct_answers ?? 0);
  const [savingQ, setSavingQ] = useState(false);

  const taxaQuestoes = mod.questions
    ? calcularTaxaAcerto(mod.questions.correct_answers, mod.questions.total_questions)
    : null;
  const taxaFlash = mod.flashcards && mod.flashcards.total_cards > 0
    ? Math.round((mod.flashcards.mastered / mod.flashcards.total_cards) * 100)
    : null;

  async function saveQuestions() {
    if (!mod.questions) return;
    setSavingQ(true);
    try {
      await studyModulesService.updateQuestions(mod.questions.id, mod.id, qTotal, qCorrect);
      onUpdated();
      setEditingQuestions(false);
    } finally {
      setSavingQ(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Deletar "${mod.assunto}"? Esta ação não pode ser desfeita.`)) return;
    await studyModulesService.delete(mod.id);
    onUpdated();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-2xl border-white/10 flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-white/5 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{mod.materia}</span>
                {mod.frente && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-text-secondary uppercase">Frente {mod.frente}</span>}
                {mod.aula_numero && <span className="text-[9px] text-text-secondary">Aula {mod.aula_numero}</span>}
              </div>
              <h3 className="text-xl font-black text-white">{mod.assunto}</h3>
              <p className="text-xs text-text-secondary mt-1">
                {new Date(mod.data_estudo + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 text-text-secondary hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

            {/* Resumo */}
            <section className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                <span>📖</span> Resumo (NotebookLM)
              </h4>
              {mod.summary ? (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 flex flex-col gap-3">
                  {mod.summary.texto_resumo && (
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{mod.summary.texto_resumo}</p>
                  )}
                  {mod.summary.audio_url && (
                    <a href={mod.summary.audio_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-bold w-fit">
                      <Play className="w-3.5 h-3.5" /> Ouvir Áudio NotebookLM <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-text-secondary pt-1 border-t border-white/5">
                    <span>Última revisão: {formatRelativeDate(mod.summary.ultima_revisao)}</span>
                    <span className={URGENCY_CONFIG[getUrgency(mod.summary.proxima_revisao)].color}>
                      Próxima: {formatRelativeDate(mod.summary.proxima_revisao)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReviewModal({
                      moduleId: mod.id, materia: mod.materia, assunto: mod.assunto,
                      frente: mod.frente ?? null, tipo: 'resumo', urgency: getUrgency(mod.summary!.proxima_revisao) as any,
                      proximaRevisao: mod.summary!.proxima_revisao ?? '', ultimaRevisao: mod.summary!.ultima_revisao ?? null,
                      accuracyPercent: null, estimatedMinutes: 5, recordId: mod.summary!.id
                    })}
                    className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-bold w-fit flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Marcar Revisão Concluída
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-text-secondary text-sm opacity-50">Resumo não cadastrado</div>
              )}
            </section>

            {/* Questões */}
            <section className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2"><span>❓</span> Questões</h4>
              {mod.questions ? (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex flex-col gap-3">
                  {!editingQuestions ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <span className="text-2xl font-black text-white">{mod.questions.total_questions}</span>
                          <p className="text-[10px] text-text-secondary uppercase mt-0.5">Total</p>
                        </div>
                        <div className="text-center">
                          <span className="text-2xl font-black text-emerald-400">{mod.questions.correct_answers}</span>
                          <p className="text-[10px] text-text-secondary uppercase mt-0.5">Acertos ✅</p>
                        </div>
                        <div className="text-center">
                          <span className={`text-2xl font-black ${taxaQuestoes !== null && taxaQuestoes >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{taxaQuestoes}%</span>
                          <p className="text-[10px] text-text-secondary uppercase mt-0.5">Taxa</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary border-t border-white/5 pt-2">
                        <span>Última revisão: {formatRelativeDate(mod.questions.ultima_revisao)}</span>
                        <span className={URGENCY_CONFIG[getUrgency(mod.questions.proxima_revisao)].color}>Próxima: {formatRelativeDate(mod.questions.proxima_revisao)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingQuestions(true)} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold flex items-center gap-2">
                          <Edit3 className="w-3.5 h-3.5" /> Atualizar Pontuação
                        </button>
                        <button
                          onClick={() => setShowReviewModal({
                            moduleId: mod.id, materia: mod.materia, assunto: mod.assunto,
                            frente: mod.frente ?? null, tipo: 'questoes', urgency: getUrgency(mod.questions!.proxima_revisao) as any,
                            proximaRevisao: mod.questions!.proxima_revisao ?? '', ultimaRevisao: mod.questions!.ultima_revisao ?? null,
                            accuracyPercent: taxaQuestoes, estimatedMinutes: 10, recordId: mod.questions!.id
                          })}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Revisar Agora
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Total</label>
                          <input type="number" value={qTotal} onChange={e => setQTotal(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500/50 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Acertos</label>
                          <input type="number" value={qCorrect} onChange={e => setQCorrect(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-emerald-500/50 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveQuestions} disabled={savingQ} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-400 transition-all">
                          {savingQ ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditingQuestions(false)} className="px-4 py-2.5 bg-white/5 text-text-secondary rounded-xl text-sm hover:text-white transition-all">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-text-secondary text-sm opacity-50">Questões não cadastradas</div>
              )}
            </section>

            {/* Flashcards */}
            <section className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2"><span>🃏</span> Flashcards</h4>
              {mod.flashcards ? (
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/15 flex flex-col gap-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-text-secondary">Dominados</span>
                        <span className="text-emerald-400 font-bold">{mod.flashcards.mastered}/{mod.flashcards.total_cards}</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${taxaFlash ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className={`text-xl font-black ${taxaFlash !== null && taxaFlash >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{taxaFlash}%</span>
                    </div>
                  </div>
                  {mod.flashcards.total_cards > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-emerald-500/10"><span className="text-emerald-400 font-black">{mod.flashcards.mastered}</span><br/><span className="text-text-secondary text-[9px]">Dominados</span></div>
                      <div className="p-2 rounded-lg bg-amber-500/10"><span className="text-amber-400 font-black">{mod.flashcards.learning}</span><br/><span className="text-text-secondary text-[9px]">Estudando</span></div>
                      <div className="p-2 rounded-lg bg-red-500/10"><span className="text-red-400 font-black">{mod.flashcards.not_learned}</span><br/><span className="text-text-secondary text-[9px]">Não aprendido</span></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-text-secondary border-t border-white/5 pt-2">
                    <span>Última revisão: {formatRelativeDate(mod.flashcards.ultima_revisao)}</span>
                    <span className={URGENCY_CONFIG[getUrgency(mod.flashcards.proxima_revisao)].color}>Próxima: {formatRelativeDate(mod.flashcards.proxima_revisao)}</span>
                  </div>
                  <button
                    onClick={() => setShowReviewModal({
                      moduleId: mod.id, materia: mod.materia, assunto: mod.assunto,
                      frente: mod.frente ?? null, tipo: 'flashcards', urgency: getUrgency(mod.flashcards!.proxima_revisao) as any,
                      proximaRevisao: mod.flashcards!.proxima_revisao ?? '', ultimaRevisao: mod.flashcards!.ultima_revisao ?? null,
                      accuracyPercent: taxaFlash, estimatedMinutes: 3, recordId: mod.flashcards!.id
                    })}
                    className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all text-xs font-bold w-fit flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Revisar Flashcards
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-text-secondary text-sm opacity-50">Flashcards não cadastrados</div>
              )}
            </section>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <ConcluirRevisaoModal
          item={showReviewModal}
          onClose={() => setShowReviewModal(null)}
          onSaved={() => { setShowReviewModal(null); onUpdated(); onClose(); }}
        />
      )}
    </>
  );
}

// ── Sub-aba: Revisar Hoje ────────────────────────────────────

function RevisarHoje({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems] = useState<ReviewTodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<ReviewTodayItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studyModulesService.getReviewsForToday();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center p-20">
      <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );

  const overdue = items.filter(i => i.urgency === 'overdue');
  const today = items.filter(i => i.urgency === 'today');
  const soon = items.filter(i => i.urgency === 'soon');

  if (items.length === 0) return (
    <div className="flex flex-col items-center gap-4 py-20 opacity-40">
      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
      <p className="text-xl font-black text-white">Nada para revisar agora! 🎉</p>
      <p className="text-text-secondary text-sm">Cadastre aulas e o sistema avisa quando revisar.</p>
    </div>
  );

  const Section = ({ title, items: sectionItems, emoji }: { title: string; items: ReviewTodayItem[]; emoji: string }) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
          <span>{emoji}</span> {title}
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-black">{sectionItems.length}</span>
        </h3>
        {sectionItems.map((item, idx) => {
          const tipoConf = TIPO_CONFIG[item.tipo];
          const urgConf = URGENCY_CONFIG[item.urgency];
          return (
            <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${urgConf.bg}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tipoConf.emoji}</span>
                <div>
                  <p className="font-black text-white text-sm">{item.assunto}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-secondary">{item.materia}</span>
                    {item.frente && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-text-secondary uppercase">Frente {item.frente}</span>}
                    <span className={`text-[10px] font-bold ${tipoConf.color}`}>{tipoConf.label}</span>
                    <span className="flex items-center gap-1 text-[10px] text-text-secondary"><Clock className="w-2.5 h-2.5" /> {item.estimatedMinutes}min</span>
                  </div>
                  {item.accuracyPercent !== null && (
                    <span className="text-[10px] text-text-secondary">Último acerto: {item.accuracyPercent}%</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setReviewModal(item)}
                className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${item.urgency === 'overdue' ? 'bg-red-500 text-white hover:bg-red-400' : item.urgency === 'today' ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <Play className="w-3.5 h-3.5" />
                {item.urgency === 'soon' ? 'Adiantar' : 'Estudar Agora'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Resumo rápido */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Urgente', count: overdue.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Para Hoje', count: today.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Em Breve', count: soon.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`p-4 rounded-2xl border ${bg} text-center`}>
              <span className={`text-3xl font-black ${color}`}>{count}</span>
              <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        <Section title="Urgente — Revisar AGORA" items={overdue} emoji="🔴" />
        <Section title="Para Hoje" items={today} emoji="🟡" />
        <Section title="Em Breve (próximos 3 dias)" items={soon} emoji="🟢" />
      </div>

      {reviewModal && (
        <ConcluirRevisaoModal
          item={reviewModal}
          onClose={() => setReviewModal(null)}
          onSaved={() => { setReviewModal(null); load(); onRefresh(); }}
        />
      )}
    </>
  );
}

// ── Sub-aba: Progresso ───────────────────────────────────────

function Progresso() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof studyModulesService.getSubjectStats>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studyModulesService.getSubjectStats().then(s => { setStats(s); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" /></div>;

  if (stats.length === 0) return (
    <div className="flex flex-col items-center gap-4 py-20 opacity-40">
      <BarChart3 className="w-16 h-16 text-indigo-500" />
      <p className="text-xl font-black text-white">Sem dados ainda</p>
      <p className="text-text-secondary text-sm">Cadastre aulas e faça revisões para ver seu progresso.</p>
    </div>
  );

  const avgGeral = stats.length > 0 ? Math.round(stats.reduce((a, b) => a + b.avgAccuracy, 0) / stats.filter(s => s.avgAccuracy > 0).length) : 0;
  const fracas = stats.filter(s => s.fraca);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats gerais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <span className={`text-3xl font-black ${avgGeral >= 75 ? 'text-emerald-400' : avgGeral >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avgGeral || '—'}%</span>
          <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Acerto Médio</p>
        </div>
        <div className="glass-card p-5 text-center">
          <span className="text-3xl font-black text-indigo-400">{stats.reduce((a, b) => a + b.totalModules, 0)}</span>
          <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Aulas Cadastradas</p>
        </div>
        <div className="glass-card p-5 text-center">
          <span className="text-3xl font-black text-teal-400">{stats.reduce((a, b) => a + b.totalRevisoes, 0)}</span>
          <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Revisões Feitas</p>
        </div>
      </div>

      {/* Matérias fracas */}
      {fracas.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">Matérias que precisam de atenção ({fracas.length})</p>
            <div className="flex gap-2 flex-wrap">
              {fracas.map(s => (
                <span key={s.materia} className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold">{s.materia} — {s.avgAccuracy}%</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de matérias */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Desempenho por Matéria</h3>
        {stats.map(s => (
          <div key={s.materia} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white">{s.materia}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-secondary">{s.totalModules} aulas · {s.totalRevisoes} revisões</span>
                <span className={`font-black text-sm ${s.avgAccuracy >= 75 ? 'text-emerald-400' : s.avgAccuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {s.totalRevisoes > 0 ? `${s.avgAccuracy}%` : '—'}
                </span>
                {s.fraca ? <TrendingDown className="w-4 h-4 text-red-400" /> : s.avgAccuracy >= 75 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <Minus className="w-4 h-4 text-amber-400" />}
              </div>
            </div>
            {s.totalRevisoes > 0 && (
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${s.avgAccuracy >= 75 ? 'bg-emerald-500' : s.avgAccuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${s.avgAccuracy}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente Principal ─────────────────────────────────────

export function RevisaoInteligente() {
  const [tab, setTab] = useState<'aulas' | 'hoje' | 'progresso'>('aulas');
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const [selectedMod, setSelectedMod] = useState<StudyModule | null>(null);
  const [filterMateria, setFilterMateria] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studyModulesService.getAll();
      setModules(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const materias = [...new Set(modules.map(m => m.materia))].sort();
  const filtered = filterMateria ? modules.filter(m => m.materia === filterMateria) : modules;

  // Contar urgentes para badge
  const urgentCount = modules.filter(m => {
    const u = [
      getUrgency(m.summary?.proxima_revisao ?? null),
      getUrgency(m.questions?.proxima_revisao ?? null),
      getUrgency(m.flashcards?.proxima_revisao ?? null),
    ];
    return u.some(x => x === 'overdue' || x === 'today');
  }).length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-10">

      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
            <BookMarked className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter">Revisão Inteligente</h2>
            <p className="text-text-secondary text-sm mt-0.5">
              Registre suas aulas + NotebookLM. O sistema avisa quando revisar.
            </p>
          </div>
        </div>
        {tab === 'aulas' && (
          <button
            onClick={() => setShowNova(true)}
            className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-black text-sm transition-all shadow-[0_0_25px_rgba(20,184,166,0.4)] shrink-0"
          >
            <Plus className="w-4 h-4" /> Nova Aula
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
        {([
          { id: 'aulas', label: 'Minhas Aulas', icon: BookOpen },
          { id: 'hoje', label: urgentCount > 0 ? `Revisar Hoje (${urgentCount})` : 'Revisar Hoje', icon: Zap },
          { id: 'progresso', label: 'Progresso', icon: BarChart3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
              tab === id
                ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.4)]'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {tab === 'aulas' && (
        <div className="flex flex-col gap-4">
          {/* Filtro por matéria */}
          {materias.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Filtrar:</span>
              <button onClick={() => setFilterMateria('')} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterMateria === '' ? 'bg-teal-500 text-white' : 'bg-white/5 text-text-secondary hover:text-white'}`}>
                Todas
              </button>
              {materias.map(mat => (
                <button key={mat} onClick={() => setFilterMateria(mat === filterMateria ? '' : mat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterMateria === mat ? 'bg-teal-500 text-white' : 'bg-white/5 text-text-secondary hover:text-white'}`}>
                  {mat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-20">
              <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 opacity-40">
              <BookMarked className="w-16 h-16 text-teal-500" />
              <p className="text-xl font-black text-white">Nenhuma aula cadastrada ainda</p>
              <p className="text-text-secondary text-sm">Clique em "Nova Aula" para começar!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(mod => (
                <ModuleCard key={mod.id} mod={mod} onClick={() => setSelectedMod(mod)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'hoje' && <RevisarHoje onRefresh={() => setRefreshKey(k => k + 1)} />}
      {tab === 'progresso' && <Progresso />}

      {/* Modais */}
      {showNova && (
        <NovaAulaModal
          onClose={() => setShowNova(false)}
          onSaved={() => { setRefreshKey(k => k + 1); }}
        />
      )}
      {selectedMod && (
        <ModuleDetailModal
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
          onUpdated={() => { setRefreshKey(k => k + 1); setSelectedMod(null); }}
        />
      )}
    </div>
  );
}
