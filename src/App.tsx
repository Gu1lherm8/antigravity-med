import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { PainelGlobal } from './components/PainelGlobal';
import { C5Checklist } from './components/C5Checklist';
import { FlowEngine as FlowLogic, type FlowTask } from './lib/intelligence/FlowEngine';

export default function App() {
  const [activeTab, setActiveTab] = (useState as any)('dashboard');
  const [session, setSession] = useState<Session | null>({ user: { email: 'contato@antigravitymed.com' } } as any);
  const [loading] = useState(false);

  // Flow Engine State
  const [flowQueue, setFlowQueue] = useState<FlowTask[] | null>(null);
  const [flowPeriod, setFlowPeriod] = useState<'manha' | 'tarde' | 'noite' | 'personalizado' | null>(null);

  useEffect(() => {
    checkActiveFlow();
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

      {/* SIDEBAR ELITE */}
      <aside className="w-20 lg:w-72 border-r border-white/5 p-6 flex flex-col gap-8 sticky top-0 h-screen bg-[#080910] transition-all group z-50 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex-shrink-0 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <div className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
            <h1 className="text-xl font-black tracking-tighter uppercase text-white">AG Medicina</h1>
            <p className="text-[10px] text-text-secondary tracking-[0.2em] font-black uppercase">Unidade Elite</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          {[
            { id: 'dashboard', label: 'Preceptor', icon: ShieldCheck },
            { id: 'painel', label: 'Painel de Voo', icon: LayoutDashboard },
            { id: 'missao', label: 'Missão do Dia', icon: Target },
            { id: 'calendario', label: 'Calendário', icon: Calendar },
            { id: 'recalculatorio', label: 'Recalculatório', icon: FlaskConical },
            { id: 'materias', label: 'Matérias', icon: BookOpen },
            { id: 'plano', label: 'Plano de Voo', icon: ClipboardList },
            { id: 'caderno', label: 'Caderno de bula', icon: BookText },
            { id: 'uti', label: 'UTI', icon: AlertTriangle },
            { id: 'triagem', label: 'Triagem', icon: Stethoscope },
            { id: 'biblioteca', label: 'Biblioteca', icon: Library },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-4 p-3.5 rounded-2xl font-black transition-all group/btn ${
                activeTab === id
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === id ? 'animate-pulse' : ''}`} />
              <span className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">{label}</span>
            </button>
          ))}
        </nav>

        {/* WIDGET RITMO DE ELITE */}
        <div className="mt-auto pt-6 border-t border-white/5 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg"><Flame className="w-4 h-4 text-orange-500" /></div>
            <div>
              <p className="text-[10px] font-black text-text-secondary uppercase">Ritmo de Elite</p>
              <p className="text-sm font-black text-white">14 DIAS</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full flex gap-1 overflow-hidden">
            {[1, 1, 1, 1, 1, 1, 0.5].map((w, i) => (
              <div key={i} className={`h-full flex-1 ${w === 1 ? 'bg-indigo-500' : 'bg-primary'}`} />
            ))}
          </div>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-4 p-3.5 rounded-2xl font-black text-red-500 hover:bg-red-500/10 transition-all mt-4">
          <Lock className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">Sair</span>
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        {/* TOP ALERT PRECEPTOR */}
        <div className="bg-primary/10 border-b border-primary/20 px-10 py-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-primary text-[10px] font-black rounded text-white tracking-widest">🎖️ PRECEPTOR</span>
            <p className="text-xs font-bold text-white/80">Execute. Agora. Você tem missões pendentes hoje.</p>
          </div>
          <button onClick={() => setActiveTab('missao')} className="text-xs font-black text-primary hover:underline transition-all">Ver Missões →</button>
        </div>

        <div className="p-10 max-w-7xl w-full mx-auto flex flex-col gap-10">

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-10">

                {/* CABEÇALHO */}
                <header className="flex justify-between items-start">
                  <div>
                    <h2 className="text-5xl font-black tracking-tighter text-white">Status do Futuro Médico</h2>
                    <p className="text-primary font-bold text-sm mt-1">Consistência: <span className="text-white">14 dias</span></p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-text-secondary hover:text-white transition-all text-xs font-black uppercase">
                    <Brain className="w-4 h-4 text-primary" /> Modo Guerrilha
                  </button>
                </header>

                {/* PILOTO AUTOMÁTICO — Componente real conectado ao Supabase */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Plano de Hoje</span>
                  </div>
                  <ActiveCommander onStartPilot={handleStartPilot} />
                </section>

                {/* WIDGET REDAÇÃO: Validador C5 ENEM 2025 */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Redação de Elite — Checklist C5</span>
                  </div>
                  <C5Checklist />
                </section>

                {/* 4 CARDS DE MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'STATUS', value: 'BOM', sub: 'ESTÁVEL', color: 'text-emerald-400', icon: '🟢' },
                    { label: 'TRI', value: '94%', sub: 'COERÊNCIA ALTA', color: 'text-white', icon: null },
                    { label: 'NOTA', value: '790', sub: 'SIMULADO GLOBAL', color: 'text-white', icon: null },
                    { label: 'CORTE', value: '812', sub: 'AMPLA - ESCS', color: 'text-white', icon: null },
                  ].map((card, i) => (
                    <div key={i} className="glass-card p-8 bg-white/[0.02] border-white/5 flex flex-col gap-2">
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{card.label}</span>
                      <div className="flex items-center gap-2">
                        {card.icon && <span className="text-xs">{card.icon}</span>}
                        <span className={`text-4xl font-black ${card.color}`}>{card.value}</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest">{card.sub}</span>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}

            {activeTab === 'painel' && <PainelGlobal />}
            {activeTab === 'missao' && <MissaoDoDia onStartFlow={handleStartPilot as any} />}
            {activeTab === 'calendario' && <CalendarioSemanal />}
            {activeTab === 'recalculatorio' && <FlightPlan plan={null as any} onStart={handleStartPilot as any} />}
            {activeTab === 'materias' && <Materias />}
            {activeTab === 'plano' && <FlightPlan plan={null as any} onStart={handleStartPilot as any} />}
            {activeTab === 'caderno' && <CadernoDeErros />}
            {activeTab === 'uti' && <UTI />}
            {activeTab === 'triagem' && <TriDashboard />}
            {activeTab === 'biblioteca' && <BibliotecaUniversal />}
          </AnimatePresence>

          {flowQueue && flowPeriod && (
            <FlowEngine
              initialQueue={flowQueue}
              period={flowPeriod}
              onClose={() => { setFlowQueue(null); setFlowPeriod(null); }}
            />
          )}

        </div>
      </main>
    </div>
  );
}
