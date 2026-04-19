import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Lock, 
  FlaskConical,
  Library,
  Brain,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Target,
  BookText,
  Stethoscope,
  ClipboardList,
  Flame,
  CheckCircle2,
  Upload,
  ChevronRight
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import type { StudyPlan } from './lib/intelligence/Planner';
import { ActiveCommander } from './components/ActiveCommander';
import { Materias } from './components/Materias';
import { TriDashboard } from './components/TriagemTRI';
import { BibliotecaUniversal } from './components/BibliotecaUniversal';
import { UTI } from './components/UTI';
import { FlightPlan } from './components/FlightPlan';
import { MissaoDoDia } from './components/MissaoDoDia';
import { CalendarioSemanal } from './components/CalendarioSemanal';
import { CadernoDeErros } from './components/CadernoDeErros';
import { FlowEngine } from './components/FlowEngine';
import { SecretaryDashboard } from './components/SecretaryDashboard';
import { SecretaryButton } from './components/SecretaryButton';
import { ConfigurarCerebro } from './components/ConfigurarCerebro';
import { C5Checklist } from './components/C5Checklist';
import { Triturador } from './components/Triturador';
import { CurvaDeEsquecimento } from './components/CurvaDeEsquecimento';
import { FlowEngine as FlowLogic, type FlowTask } from './lib/intelligence/FlowEngine';

import { initializeMigrations } from './services/setup-migrations';
import { initializeOfflineService } from './services/offlineService';
import { initializePDFExporter } from './utils/mission-pdf-exporter';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Preceptor',      icon: ShieldCheck },
  { id: 'painel',       label: 'Painel de Voo',  icon: LayoutDashboard },
  { id: 'missao',       label: 'Missão do Dia',  icon: Target },
  { id: 'calendario',   label: 'Calendário',     icon: Calendar },
  { id: 'recalculario', label: 'Recalculatório', icon: FlaskConical },
  { id: 'materias',     label: 'Matérias',       icon: BookOpen },
  { id: 'plano',        label: 'Plano de Voo',   icon: ClipboardList },
  { id: 'caderno',      label: 'Caderno de Bula',icon: BookText },
  { id: 'uti',          label: 'UTI',            icon: AlertTriangle },
  { id: 'triagem',      label: 'Triagem',        icon: Stethoscope },
  { id: 'curva',        label: 'Curva de Memória',icon: Brain },
  { id: 'config',       label: 'Configurações',  icon: Target },
  { id: 'biblioteca',   label: 'Biblioteca',     icon: Library },
  { id: 'triturador',   label: 'Triturador IA',  icon: Upload },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [session, setSession] = useState<Session | null>({ user: { email: 'contato@antigravitymed.com' } } as any);
  const [loading] = useState(false);

  const [flowQueue, setFlowQueue] = useState<FlowTask[] | null>(null);
  const [flowPeriod, setFlowPeriod] = useState<'manha' | 'tarde' | 'noite' | 'personalizado' | null>(null);



  useEffect(() => {
    const startup = async () => {
      console.log('🚀 Iniciando Antigravity Med 2.0...');
      await initializeMigrations();
      await initializeOfflineService();
      await initializePDFExporter();
      checkActiveFlow();
    };
    startup();
  }, []);

  async function checkActiveFlow() {
    const active = await FlowLogic.getActiveSession();
    if (active) {
      setFlowQueue(active.queue);
      setFlowPeriod(active.period);
    }
  }

  const handleStartPilot = async (plan: StudyPlan) => {
    const sessionId = await FlowLogic.startSessionFromPlan(plan);
    if (sessionId) {
      const active = await FlowLogic.getActiveSession();
      if (active) {
        setFlowQueue(active.queue);
        setFlowPeriod(active.period);
      }
    }
  };

  const handleLogout = async () => setSession(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-[#05060A] text-text-primary flex selection:bg-primary/30 font-sans">

      {/* =========================================================
          SIDEBAR — labels SEMPRE visíveis em desktop
          ========================================================= */}
      <aside className="w-64 border-r border-teal-500/10 p-6 flex flex-col gap-8 sticky top-0 h-screen bg-[#020308] z-50 overflow-y-auto shrink-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        
        {/* LOGO - High Tech Version */}
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.4)] group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter uppercase text-white leading-none">AG MEDICINA</h1>
              <span className="text-[10px] text-teal-400 font-bold tracking-[.2em] uppercase mt-1">Surgical Unit</span>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-teal-500/50 to-transparent mt-4" />
        </div>

        {/* NAV - Refined Glassmorphism */}
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-300 text-left relative overflow-hidden ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.8)]" />
                )}
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-sm tracking-tight">{label}</span>
                {id === 'triturador' && !isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* METRICS WIDGET */}
        <div className="mt-auto space-y-4 pt-6 border-t border-teal-500/10">
          <div className="glass-card p-4 border-teal-500/10 bg-teal-500/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-orange-500/20 rounded-lg"><Flame className="w-3 h-3 text-orange-500" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ritmo de Voo</span>
            </div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xl font-black text-white italic">14 Dias</span>
              <span className="text-[10px] font-black text-teal-400">92% ESTÁVEL</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
              {[...Array(7)].map((_, i) => (
                <div key={i} className={`h-full flex-1 ${i < 6 ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all text-sm">
            <Lock className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT
          ========================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        {/* TOP ALERT PRECEPTOR - Surgical Command Version */}
        <div className="bg-gradient-to-r from-teal-500/20 via-transparent to-transparent border-b border-teal-500/10 px-8 py-3 flex items-center justify-between z-40 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_10px_rgba(20,184,166,1)]" />
              <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">🎖️ PRECEPTOR ON-LINE</span>
            </div>
            <p className="text-xs font-bold text-slate-300 tracking-wide lowercase first-letter:uppercase">Faltam poucas missões para fechar seu dia de elite. <span className="text-teal-400">Mantenha o foco, futuro médico.</span></p>
          </div>
          <button onClick={() => setActiveTab('missao')} className="group flex items-center gap-2 text-[10px] font-black text-teal-400 hover:text-white transition-all uppercase tracking-widest">
            <span>Ver Missões Críticas</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">

          {/* Tab content — sem AnimatePresence para evitar crash insertBefore do Framer Motion */}
          {/* Tab content — removido  para evitar conflito de reconciliação do React 19 e crash insertBefore */}
          <div className="opacity-100">
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-8">
                <header className="flex justify-between items-end pb-4 border-b border-teal-500/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em]">Hospitais & Disciplinas</span>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">Prontuário de Estudos</h2>
                  </div>
                  <button className="group flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 hover:bg-teal-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                    <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                    <span>Ativar Modo Cirúrgico</span>
                  </button>
                </header>

                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Plano de Hoje</span>
                  </div>
                  <ActiveCommander onStartPilot={handleStartPilot} />
                </section>

                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Redação de Elite — Checklist C5</span>
                  </div>
                  <C5Checklist />
                </section>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'STATUS CLINICO', value: 'ESTÁVEL', sub: 'RITMO DE ELITE', color: 'text-teal-400', icon: '🩺' },
                    { label: 'TRI GLOBAL', value: '792', sub: 'COERÊNCIA: 94%', color: 'text-white', icon: '📊' },
                    { label: 'META ESCS', value: '812', sub: 'FALTAM 20 PTS', color: 'text-white', icon: '🏁' },
                    { label: 'PROBABILIDADE', value: '84%', sub: 'APROVAÇÃO ESTIMADA', color: 'text-teal-500', icon: '🧠' },
                  ].map((card, i) => (
                    <div key={i} className="glass-card p-6 bg-gradient-to-br from-white/[0.03] to-transparent border-teal-500/10 flex flex-col gap-3 group hover:border-teal-500/30 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-5xl grayscale">{card.icon}</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{card.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black tracking-tighter ${card.color}`}>{card.value}</span>
                        {card.value.length < 5 && <span className="text-xs font-bold text-slate-400">PTS</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-teal-500 transition-all duration-1000 w-[70%] shadow-[0_0_10px_rgba(20,184,166,0.3)]`} />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase whitespace-nowrap">{card.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'painel'       && <SecretaryDashboard />}
            {activeTab === 'missao'       && <MissaoDoDia onStartFlow={handleStartPilot as any} />}
            {activeTab === 'calendario'   && <CalendarioSemanal />}
            {activeTab === 'recalculario' && <FlightPlan plan={null as any} onStart={handleStartPilot as any} />}
            {activeTab === 'materias'     && <Materias />}
            {activeTab === 'plano'        && <FlightPlan plan={null as any} onStart={handleStartPilot as any} />}
            {activeTab === 'caderno'      && <CadernoDeErros />}
            {activeTab === 'uti'          && <UTI />}
            {activeTab === 'triagem'      && <TriDashboard />}
            {activeTab === 'curva'        && <CurvaDeEsquecimento />}
            {activeTab === 'config'       && <ConfigurarCerebro />}
            {activeTab === 'biblioteca'   && <BibliotecaUniversal />}
            {activeTab === 'triturador'   && <Triturador />}


          </div>

          {flowQueue && flowPeriod && (
            <FlowEngine
              initialQueue={flowQueue}
              period={flowPeriod}
              onClose={() => { setFlowQueue(null); setFlowPeriod(null); }}
            />
          )}

          <SecretaryButton />

        </div>
      </main>
    </div>
  );
}
