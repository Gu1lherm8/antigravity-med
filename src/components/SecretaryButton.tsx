// ==========================================
// components/SecretaryButton.tsx
// Botão Flutuante: Scanner Visual & Coach IA
// ==========================================

import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Camera, 
  MessageSquare, 
  X, 
  Upload, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  Brain
} from 'lucide-react';
import { sounds } from '../lib/intelligence/SoundService';
import { Secretary } from '../lib/intelligence/Secretary';

export function SecretaryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleOpen = () => {
    sounds.playClickAccent();
    setIsOpen(!isOpen);
    if (isOpen) setScanResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    sounds.playTrituradorStart();

    // Converter para Base64 para a API Vision
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

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-4">
      
      {/* MODAL DE CONTEXTO */}
      {isOpen && (
        <div className="mb-4 w-[350px] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="bg-gradient-to-r from-teal-500/20 to-transparent p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 rounded-xl"><Brain className="w-5 h-5 text-teal-400" /></div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">O Orquestrador</h4>
                <p className="text-[10px] text-teal-500/70 font-bold uppercase tracking-widest">Sincronização em tempo real</p>
              </div>
            </div>
            <button onClick={toggleOpen} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-4">
            {isScanning ? (
              <div className="py-10 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest animate-pulse">Lendo sua aula com Vision IA...</p>
              </div>
            ) : scanResult ? (
              <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-300">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase">Sincronizado!</p>
                    <p className="text-sm font-bold text-white">{scanResult.topic}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                  "O Orquestrador já recalibrar seu feed. Meiose subiu para prioridade CRÍTICA no seu dia."
                </p>
                <button 
                  onClick={() => setScanResult(null)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                >
                  Sincronizar outro
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center gap-4 p-8 bg-teal-500/10 border border-teal-500/20 rounded-3xl hover:bg-teal-500/20 transition-all border-dashed"
                >
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-black uppercase text-xs tracking-widest">Scanner de Aula</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">Suba uma screenshot do cursinho</p>
                  </div>
                </button>

                <button 
                  disabled
                  className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group opacity-50 cursor-not-allowed"
                >
                  <div className="p-3 bg-white/5 rounded-xl text-slate-400"><MessageSquare className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-white font-black uppercase text-[10px] tracking-widest">Coach de IA</p>
                    <p className="text-[9px] text-slate-500 font-medium italic">Conversar sobre o plano (Breve)</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* BOTÃO PRINCIPAL */}
      <button 
        onClick={toggleOpen}
        className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-t border-white/20 select-none ${
          isOpen ? 'bg-red-500 rotate-45 scale-90' : 'bg-teal-500 hover:scale-110 hover:-translate-y-1'
        }`}
      >
        <div className="relative">
          {isOpen ? <Plus className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-white" />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-teal-500 animate-ping" />
          )}
        </div>
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
