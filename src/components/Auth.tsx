import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Zap, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Verifique seu e-mail para confirmar a conta (se habilitado no Supabase).');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C14] flex items-center justify-center p-6 relative overflow-hidden text-slate-200">
      
      {/* Background Orbs (Aesthetics) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0EA5E9]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md z-10    ">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#0EA5E9] mx-auto rounded-3xl flex items-center justify-center shadow-2xl shadow-[#0EA5E9]/40 mb-6 group transition-transform hover:scale-110">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase mb-2">AG Medicina</h1>
          <div className="flex items-center justify-center gap-2 text-[#94A3B8] uppercase tracking-[0.3em] text-[10px] font-bold">
            <Stethoscope className="w-3 h-3 text-[#0EA5E9]" />
            Cirurgia Orbital // Unidade Tática
          </div>
        </div>

        <div className="glass-card p-10 border-white/5 relative bg-[#1E2330]/40 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-black/50">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent" />

          <header className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Criar Novo Prontuário' : 'Acesse sua Unidade'}
            </h2>
            <p className="text-[#94A3B8] text-sm">
              {isSignUp ? 'Junte-se à elite da medicina acadêmica.' : 'Suas sinapses e materiais te esperam.'}
            </p>
          </header>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#0EA5E9] text-[#94A3B8]">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email"
                  required
                  placeholder="medico@antigravity.ia"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/50 focus:border-[#0EA5E9] transition-all placeholder:text-white/10 font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] ml-1">Senha Criptografada</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#0EA5E9] text-[#94A3B8]">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/50 focus:border-[#0EA5E9] transition-all placeholder:text-white/10 font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center gap-3   ">
                <ShieldCheck className="w-4 h-4" />
                {error}
              </div>
            )}
            {message && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-3   ">
                <ShieldCheck className="w-4 h-4" />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#0EA5E9] hover:brightness-110 text-white py-5 text-sm uppercase tracking-[0.2em] font-black rounded-2xl group shadow-xl shadow-[#0EA5E9]/20 relative overflow-hidden transition-all active:scale-95 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform " />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-3">
                  {isSignUp ? 'Registrar na Rede' : 'Autenticar Acesso'}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#94A3B8] text-xs font-bold hover:text-white transition-colors uppercase tracking-widest"
            >
              {isSignUp ? 'Já possui prontuário? Login' : 'Novo por aqui? Crie uma conta'}
            </button>
          </footer>

        </div>

        <p className="mt-8 text-center text-[9px] text-[#94A3B8]/40 font-bold uppercase tracking-[0.2em]">
          Antigravity Medicina // Versão de Deploy GitHub 2026.
        </p>
      </div>
    </div>
  );
}
