// ==========================================
// components/SecretaryButton.tsx
// Botão Flutuante: Scanner Visual & Coach IA
// ==========================================

import React, { useState, useRef } from 'react';
import { 
  Plus, Camera, MessageSquare, X, Sparkles,
  Loader2, CheckCircle2, Brain, Zap, AlertTriangle,
  TrendingUp, Target, RefreshCw, ChevronRight
} from 'lucide-react';
import { sounds } from '../lib/intelligence/SoundService';
import { getCoachFeedback } from '../lib/api';
import type { CoachFeedback } from '../lib/api';

// ─── Config de severidade ─────────────────────────────────────
const SEVERITY_CONFIG = {
  critico: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    glow: '0 0 40px rgba(239,68,68,0.2)',
    label: 'CRÍTICO',
    icon: AlertTriangle,
  },
  alerta: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glow: '0 0 40px rgba(245,158,11,0.2)',
    label: 'ALERTA',
    icon: Zap,
  },
  bom: {
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    glow: '0 0 40px rgba(20,184,166,0.2)',
    label: 'BOM RITMO',
    icon: TrendingUp,
  },
  excelente: {
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    glow: '0 0 40px rgba(99,102,241,0.2)',
    label: 'EXCELENTE',
    icon: CheckCircle2,
  },
};

export function SecretaryButton() {
  const [isOpen,      setIsOpen]      = useState(false);
  const [mode,        setMode]        = useState<'menu' | 'scanner' | 'coach'>('menu');
  const [isScanning,  setIsScanning]  = useState(false);
  const [isCoaching,  setIsCoaching]  = useState(false);
  const [scanResult,  setScanResult]  = useState<any | null>(null);
  const [coachResult, setCoachResult] = useState<CoachFeedback | null>(null);
  const [coachError,  setCoachError]  = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleOpen() {
    sounds.playClickAccent();
    if (isOpen) {
      setIsOpen(false);
      setMode('menu');
      setScanResult(null);
      setCoachResult(null);
      setCoachError(null);
    } else {
      setIsOpen(true);
    }
  }

  // ── Scanner de imagem ──────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    sounds.playTrituradorStart();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/secretary/sync-external', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: '00000000-0000-0000-0000-000000000000',
            imageBase64: base64,
            description: 'Scanner de Aula'
          })
        });
        const data = await response.json();
        setScanResult(data.extracted);
        sounds.playSuccess();
      } catch (error) {
        console.error('Erro no scanner:', error);
        alert('Falha na sincronização visual.');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Coach de IA ───────────────────────────────────────────
  async function handleCoach() {
    setMode('coach');
    setIsCoaching(true);
    setCoachResult(null);
    setCoachError(null);
    sounds.playTrituradorStart();

    try {
      const feedback = await getCoachFeedback();
      setCoachResult(feedback);
      sounds.playSuccess();
    } catch (err: any) {
      setCoachError('Não consegui conectar ao Preceptor. Verifique sua conexão.');
      console.error(err);
    } finally {
      setIsCoaching(false);
    }
  }

  function resetCoach() {
    setCoachResult(null);
    setCoachError(null);
    setMode('menu');
  }

  const cfg = coachResult ? SEVERITY_CONFIG[coachResult.severity] : null;

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-4">

      {/* PAINEL PRINCIPAL */}
      {isOpen && (
        <div className="mb-2 w-[360px] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-400"
          style={{ background: 'rgba(5,6,10,0.85)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: cfg ? cfg.glow : '0 20px 60px rgba(0,0,0,0.5)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5"
            style={{ background: 'linear-gradient(to right, rgba(20,184,166,0.15), transparent)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <Brain className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">O Orquestrador</h4>
                <p className="text-[9px] text-teal-500/70 font-bold uppercase tracking-widest">Sincronização em tempo real</p>
              </div>
            </div>
            <button onClick={toggleOpen} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-3">

            {/* ── MENU INICIAL ── */}
            {mode === 'menu' && (
              <>
                {/* Scanner */}
                <button
                  onClick={() => { setMode('scanner'); fileInputRef.current?.click(); }}
                  className="group flex items-center gap-4 p-4 bg-teal-500/8 border border-teal-500/15 rounded-2xl hover:bg-teal-500/15 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform shrink-0">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-black uppercase text-xs tracking-widest">Scanner de Aula</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Suba uma screenshot do cursinho</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-teal-400 transition-colors" />
                </button>

                {/* Coach IA — AGORA ATIVO */}
                <button
                  onClick={handleCoach}
                  className="group flex items-center gap-4 p-4 bg-indigo-500/8 border border-indigo-500/15 rounded-2xl hover:bg-indigo-500/15 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-black uppercase text-xs tracking-widest">Coach de IA</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Análise da sua performance agora</p>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </button>

                {/* Aviso warmup do Coach */}
                <div className="flex items-start gap-2 px-1 py-1">
                  <div className="w-3.5 h-3.5 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[7px] text-amber-400 font-black">i</span>
                  </div>
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    O Coach fica mais preciso com o tempo.
                    Após <span className="text-amber-400/80 font-bold">1-2 semanas</span> de uso, ele terá dados reais de acertos, erros e ritmo para gerar análise personalizada.
                  </p>
                </div>
              </>
            )}

            {/* ── SCANNER: carregando ── */}
            {mode === 'scanner' && isScanning && (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest animate-pulse">Lendo sua aula com Vision IA...</p>
              </div>
            )}

            {/* ── SCANNER: resultado ── */}
            {mode === 'scanner' && !isScanning && scanResult && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase">Sincronizado!</p>
                    <p className="text-sm font-bold text-white">{scanResult.topic}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic px-1">
                  "O Orquestrador já recalibrou seu feed. Prioridades ajustadas com base nesta aula."
                </p>
                <button onClick={() => { setScanResult(null); setMode('menu'); }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all">
                  Voltar ao Menu
                </button>
              </div>
            )}

            {/* ── COACH: carregando ── */}
            {mode === 'coach' && isCoaching && (
              <div className="py-12 flex flex-col items-center justify-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Analisando sua performance...</p>
                  <p className="text-[9px] text-slate-600 mt-1">Verificando acertos, erros e ritmo de estudo</p>
                </div>
              </div>
            )}

            {/* ── COACH: erro ── */}
            {mode === 'coach' && !isCoaching && coachError && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-xs text-red-400 font-bold">{coachError}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCoach} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white transition-all">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </button>
                  <button onClick={resetCoach} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-slate-400 transition-all">
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {/* ── COACH: resultado ── */}
            {mode === 'coach' && !isCoaching && coachResult && cfg && (() => {
              const SevIcon = cfg.icon;
              return (
                <div className="flex flex-col gap-4">

                  {/* Badge de severidade */}
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${cfg.badge}`}>
                      <SevIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                    <span className="text-2xl">{coachResult.emoji}</span>
                  </div>

                  {/* Headline */}
                  <div className={`p-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                    <p className={`text-base font-black leading-snug ${cfg.text}`}>
                      {coachResult.headline}
                    </p>
                  </div>

                  {/* Mensagem */}
                  <p className="text-xs text-slate-300 leading-relaxed font-medium px-1">
                    {coachResult.message}
                  </p>

                  {/* Ação concreta */}
                  <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/8 rounded-2xl">
                    <div className="p-1.5 bg-primary/20 rounded-lg shrink-0 mt-0.5">
                      <Target className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Faça Agora</p>
                      <p className="text-xs text-white font-bold leading-relaxed">{coachResult.action}</p>
                    </div>
                  </div>

                  {/* Projeção */}
                  <div className="flex items-start gap-3 p-3 bg-white/3 border border-white/5 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-relaxed">{coachResult.projection}</p>
                  </div>

                  {/* Fallback aviso */}
                  {coachResult._fallback && (
                    <p className="text-[9px] text-slate-600 text-center">⚡ Modo offline — sem dados suficientes para análise completa</p>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleCoach} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase transition-all">
                      <RefreshCw className="w-3 h-3" /> Reanalisar
                    </button>
                    <button onClick={resetCoach} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-500 uppercase transition-all">
                      Fechar
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* BOTÃO PRINCIPAL */}
      <button
        onClick={toggleOpen}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl border-t border-white/20 select-none relative ${
          isOpen ? 'bg-red-500 rotate-45 scale-90' : 'bg-teal-500 hover:scale-110 hover:-translate-y-1 shadow-[0_8px_30px_rgba(20,184,166,0.4)]'
        }`}>
        {isOpen ? <Plus className="w-7 h-7 text-white" /> : <Sparkles className="w-7 h-7 text-white" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-teal-500 animate-ping" />
        )}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
