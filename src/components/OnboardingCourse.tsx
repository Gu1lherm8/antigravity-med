// ==========================================
// components/OnboardingCourse.tsx
// Wizard de configuração inicial do Moodle
// Step-by-step sem complicação para o usuário
// ==========================================

import React, { useState } from 'react';
import {
  School, Link, Key, Clock, Calendar, CheckCircle2,
  ArrowRight, Loader2, AlertCircle, Eye, EyeOff,
  BookOpen, Wifi, Zap, Sparkles, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingData {
  moodleUrl: string;
  moodleToken: string;
  dailyHours: number;
  examDate: string;
}

interface OnboardingCourseProps {
  userId: string;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Seu Cursinho', icon: School },
  { id: 2, title: 'Link do Moodle', icon: Link },
  { id: 3, title: 'Token de Acesso', icon: Key },
  { id: 4, title: 'Sua Rotina', icon: Clock },
  { id: 5, title: 'Conectando...', icon: Wifi },
];

export function OnboardingCourse({ userId, onComplete }: OnboardingCourseProps) {
  const [step, setStep] = useState<number | string>(1);
  const [data, setData] = useState<OnboardingData>({
    moodleUrl: '',
    moodleToken: '',
    dailyHours: 3,
    examDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);

  const update = (field: keyof OnboardingData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleTestAndSave = async () => {
    setLoading(true);
    setError('');
    setStep(5);

    try {
      // Testar conexão via API
      const response = await fetch('/api/secretary/sync-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, testOnly: true }),
      });

      // Salvar settings no Supabase
      const { error: dbErr } = await supabase
        .from('course_sync_settings')
        .upsert({
          user_id: userId,
          platform: 'moodle',
          moodle_url: data.moodleUrl.trim(),
          moodle_token: data.moodleToken.trim(),
          daily_hours: data.dailyHours,
          exam_date: data.examDate || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (dbErr) throw dbErr;

      // Disparar sincronização inicial em background
      fetch('/api/secretary/sync-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      setConnectionOk(true);
      setTimeout(onComplete, 2000);

    } catch (err: any) {
      setError(`Erro: ${err.message}. Verifique a URL e o token.`);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Voltar ao passo anterior
  const back = () => {
    setError('');
    setStep(s => Math.max(1, s - 1));
  };

  // Avançar para o próximo passo (com validação básica)
  const next = () => {
    if (step === 2 && !data.moodleUrl.startsWith('http')) {
      setError('Cole a URL completa. Ex: https://meusite.com/moodle');
      return;
    }
    if (step === 3 && data.moodleToken.length < 10) {
      setError('Token parece inválido. Copie ele completo do Moodle.');
      return;
    }
    if (step < 4) setStep(s => s + 1);
    else handleTestAndSave();
  };

  const stepOk = (s: number) => s < step;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* Cabeçalho */}
        <div className="text-center flex flex-col gap-2">
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.4em]">
            Setup Inicial
          </span>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Conecte seu cursinho.
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            5 minutos agora = zero configuração para sempre.
          </p>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex items-center gap-2 justify-center">
          {STEPS.slice(0, 4).map((s, idx) => (
            <React.Fragment key={s.id}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  stepOk(s.id)
                    ? 'bg-teal-500 text-black'
                    : step === s.id
                    ? 'bg-white text-black scale-110 ring-4 ring-white/20'
                    : 'bg-white/5 text-white/30'
                }`}
              >
                {stepOk(s.id)
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <s.icon className="w-4 h-4" />
                }
              </div>
              {idx < 3 && (
                <div className={`h-0.5 w-10 transition-all duration-500 ${stepOk(s.id + 1) ? 'bg-teal-500' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card principal */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 flex flex-col gap-6">

          {/* PASSO 1: Qual cursinho */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Como quer começar?</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Escolha se quer conectar seu curso ou apenas usar o sistema manualmente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => { setStep(2); }}
                  className="group flex items-center gap-4 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-white uppercase tracking-tight">Configuração Manual</h3>
                    <p className="text-xs text-slate-500 font-bold">Vou adicionar meus estudos eu mesmo.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={async () => {
                    const demoUrl = 'https://sandbox.moodledemo.net/';
                    const demoToken = '7caa0c990a166d5b12f232304afb7ecf';
                    setLoading(true);
                    
                    const { error } = await supabase
                      .from('course_sync_settings')
                      .upsert({
                        user_id: userId,
                        platform: 'moodle',
                        moodle_url: demoUrl,
                        moodle_token: demoToken,
                        daily_hours: 4,
                        exam_date: new Date(new Date().getFullYear(), 10, 1).toISOString().split('T')[0],
                        is_active: true
                      }, { onConflict: 'user_id' });

                    if (!error) onComplete();
                    setLoading(false);
                  }}
                  className="group flex items-center gap-4 p-6 rounded-[2rem] bg-teal-500 border border-teal-400 hover:scale-[1.02] active:scale-95 transition-all text-left shadow-[0_15px_40px_rgba(20,184,166,0.25)]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-white uppercase tracking-tight">Testar com Moodle de Exemplo</h3>
                    <p className="text-xs text-teal-100 font-bold">Um clique para entrar agora!</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: URL do Moodle */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-white">Link do Moodle</h2>
                <p className="text-slate-400 text-sm">
                  Cole a URL principal do Moodle do seu cursinho.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL</label>
                  <input
                    type="url"
                    value={data.moodleUrl}
                    onChange={e => update('moodleUrl', e.target.value)}
                    placeholder="https://meusite.com/moodle"
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 font-mono text-sm transition-all"
                  />
                </div>

                <div className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl">
                  <p className="text-xs text-teal-200/50 leading-relaxed">
                    💡 É a URL que você usa para entrar no Moodle. Geralmente termina em <code className="text-teal-400">/moodle</code> ou <code className="text-teal-400">/ead</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: Token */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-white">Token de Acesso</h2>
                <p className="text-slate-400 text-sm">
                  Um código especial para que o sistema leia suas aulas automaticamente.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={data.moodleToken}
                      onChange={e => update('moodleToken', e.target.value)}
                      placeholder="Cole seu token aqui"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 font-mono text-sm transition-all"
                    />
                    <button
                      onClick={() => setShowToken(t => !t)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 border border-white/5 rounded-2xl flex flex-col gap-2">
                  <p className="text-xs font-bold text-white">Como gerar seu token:</p>
                  <ol className="text-xs text-slate-400 leading-relaxed list-decimal list-inside space-y-1">
                    <li>Entre no seu Moodle</li>
                    <li>Vá em <span className="text-white">Preferências → Segurança → Chaves de serviço web</span></li>
                    <li>Clique em <span className="text-teal-400">Criar token</span></li>
                    <li>Selecione o serviço <span className="text-white">Moodle mobile web service</span></li>
                    <li>Copie e cole aqui</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: Horas e data da prova */}
          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-white">Sua rotina</h2>
                <p className="text-slate-400 text-sm">Essas informações ajudam a calibrar a urgência das tarefas.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Horas de estudo por dia
                    </label>
                    <span className="text-xl font-black text-teal-400">{data.dailyHours}h</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={data.dailyHours}
                    onChange={e => update('dailyHours', Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 font-black uppercase">
                    <span>1h</span>
                    <span>8h</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Data da prova (opcional)
                  </label>
                  <input
                    type="date"
                    value={data.examDate}
                    onChange={e => update('examDate', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500/50 text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 5: Conectando */}
          {step === 5 && (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              {connectionOk ? (
                <>
                  <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-teal-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-white">Conectado!</h2>
                    <p className="text-slate-400 text-sm">Sincronizando suas aulas em segundo plano...</p>
                  </div>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-white">Conectando ao Moodle...</h2>
                    <p className="text-slate-400 text-sm">Isso pode levar alguns segundos.</p>
                  </div>
                </>
              ) : error ? (
                <>
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </>
              ) : null}
            </div>
          )}

          {/* Mensagem de erro genérica */}
          {error && step !== 5 && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs font-medium text-red-300">{error}</p>
            </div>
          )}

          {/* Botões de navegação */}
          {step < 5 && (
            <div className="flex gap-3 mt-2">
              {step > 1 && (
                <button
                  onClick={back}
                  className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-all"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={next}
                disabled={loading}
                className="flex-[2] py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
              >
                {step === 4 ? 'Finalizar e Conectar' : 'Continuar'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600 font-medium">
          🔐 Seu token é guardado com segurança e nunca compartilhado.
        </p>
      </div>
    </div>
  );
}
