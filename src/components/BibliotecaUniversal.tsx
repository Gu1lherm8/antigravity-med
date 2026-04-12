import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  ArrowLeft, 
  RotateCw, 
  Trash2, 
  Download, 
  Target,
  Zap,
  Star,
  FileText
} from 'lucide-react';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

// === Tipos Mapeados do Banco ===
interface TheoryNote {
  id: string;
  topic_id: string;
  title: string;
  markdown_content: string;
  original_pdf_name: string;
  topics?: { name: string; subjects?: { name: string; color: string } };
}

interface Flashcard {
  id: string;
  topic_id: string;
  front_text: string;
  back_text: string;
  next_review: string;
  topics?: { name: string; subjects?: { name: string; color: string } };
}

// === RENDERIZADOR DE MARKDOWN PROFISSIONAL (v15 - Apostila Elite) ===
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  
  // 1. Organização em Parágrafos (Visual de Livro)
  const organizarTexto = (t: string) => t.trim().replace(/\n{3,}/g, "\n\n");

  const textoFinal = organizarTexto(content);
  
  // 2. Conversão Markdown -> HTML
  let html = marked.parse(textoFinal, {
    gfm: true,
    breaks: true
  }) as string;

  // 3. APLICAÇÃO DE BLOCOS VISUAIS (v16)
  // Envolve seções H2 em <div class="bloco"> de forma mais robusta
  const secoes = html.split('<h2>');
  if (secoes.length > 1) {
    html = secoes[0] + secoes.slice(1).map(s => `<div class="bloco"><h2>${s}</div>`).join('');
  }
  
  // 4. DETECÇÃO DE DESTAQUES (⚠️)
  html = html.replace(/⚠️ (.*?)(<|$)/g, '<div class="importante"><strong>Atenção Médico:</strong> $1</div>');
  
  return (
    <div 
      id="resumo"
      className="container-resumo academic-text   "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function BibliotecaUniversal() {
  const [activeMode, setActiveMode] = useState<'teoria' | 'flashcards'>('teoria');
  const [loading, setLoading] = useState(true);

  // Estados de Teoria
  const [notes, setNotes] = useState<TheoryNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<TheoryNote | null>(null);

  // Estados do Anki (Flashcards)
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeMode]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeMode === 'teoria') {
        const { data } = await supabase
          .from('theory_notes')
          .select(`*, topics(name, subjects(name, color))`);
        setNotes(data ?? []);
        setSelectedNote(null);
      } else {
        const hoje = new Date().toISOString();
        const { data } = await supabase
          .from('flashcards')
          .select(`*, topics(name, subjects(name, color))`)
          .lte('next_review', hoje)
          .order('next_review', { ascending: true });
        
        setDeck(data ?? []);
        setCurrentCardIndex(0);
        setShowAnswer(false);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnkiResponse(quality: number) {
    if (deck.length === 0) return;
    const card = deck[currentCardIndex];
    if (!card) return;

    const addDays = [0, 1, 3, 5][quality] || 1;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + addDays);

    await supabase.from('flashcards').update({
      next_review: newDate.toISOString()
    }).eq('id', card.id);

    if (currentCardIndex + 1 < deck.length) {
      setCurrentCardIndex(c => c + 1);
      setShowAnswer(false);
    } else {
      setDeck([]);
    }
  }

  async function handleDeleteNote(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Deseja excluir este resumo permanentemente?')) return;
    
    const { error } = await supabase.from('theory_notes').delete().eq('id', id);
    if (!error) {
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    }
  }

  async function handleDeleteCard(id: string) {
    if (!confirm('Excluir este flashcard?')) return;
    
    const { error } = await supabase.from('flashcards').delete().eq('id', id);
    if (!error) {
      const newDeck = deck.filter(d => d.id !== id);
      setDeck(newDeck);
      if (newDeck.length === 0) {
        setCurrentCardIndex(0);
      } else if (currentCardIndex >= newDeck.length) {
        setCurrentCardIndex(newDeck.length - 1);
      }
    }
  }

  // Extrair Tópicos para a Sidebar (Ferretto)
  const extractTopics = (content: string) => {
    if (!content) return [];
    return content.split(/\r?\n/)
      .filter(l => l.trim().startsWith('## ') || l.trim().startsWith('# '))
      .map(l => l.replace(/#{1,3}\s*/, '').replace(/#{1,6}/g, '').replace(/^[^a-zA-Z0-9\s]+/, '').trim())
      .filter(l => l.length > 0);
  }

  // Função Profissional de PDF (v14.1) - FIX CLIPPING
  const handleDownloadPDF = () => {
    const element = document.getElementById("resumo");
    const parent = element?.closest('main'); // Pegar o contêiner principal que tem overflow-hidden
    if (!element || !parent) return;

    // 1. Aplicar classes de expansão
    element.classList.add('full-height-export');
    parent.classList.add('parent-export-fix');

    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `Resumo - ${selectedNote?.title || 'Estudo'}.pdf`,
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        scrollY: 0, // Garantir que comece do topo
        windowHeight: element.scrollHeight // Forçar altura total da janela de captura
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4' as const,
        orientation: 'portrait' as const,
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // 2. Aguardar 500ms p/ o layout estabilizar antes de tirar a "foto"
    setTimeout(() => {
      html2pdf().set(opt).from(element).save().then(() => {
        // 3. Limpar classes após a captura
        element.classList.remove('full-height-export');
        parent.classList.remove('parent-export-fix');
      });
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 md:px-0">
      
      {/* CABEÇALHO */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <BookOpen className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase">
                {activeMode === 'teoria' ? 'Triturador: Biblioteca' : 'Anki Deck IA'}
              </h2>
              <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest mt-1">
                Material Acadêmico de Alta Performance
              </p>
           </div>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-2xl shrink-0 backdrop-blur-xl border border-white/5">
          <button 
            onClick={() => setActiveMode('teoria')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all ${
              activeMode === 'teoria' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-text-secondary hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" /> Teoria
          </button>
          <button 
            onClick={() => setActiveMode('flashcards')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase transition-all ${
              activeMode === 'flashcards' ? 'bg-[#F59E0B] text-white shadow-xl shadow-[#F59E0B]/30' : 'text-text-secondary hover:bg-white/5'
            }`}
          >
            <Target className="w-4 h-4" /> Flashcards
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-40">
          <div className="relative">
             <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
             <div className="absolute inset-0 w-16 h-16 border-4 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* VISÃO LISTA DE RESUMOS */}
      {!loading && activeMode === 'teoria' && !selectedNote && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6    ">
           {notes.map(note => {
             const subjectInfo = (note.topics?.subjects as any) || { name: 'Geral', color: '#6366f1' };
             return (
                <div key={note.id} 
                  onClick={() => setSelectedNote(note)}
                  className="glass-card p-6 flex flex-col cursor-pointer transition-all hover:-translate-y-2 hover:bg-white/5 group relative overflow-hidden h-[240px]"
                >
                   <div className="absolute top-0 right-0 p-4">
                     <button 
                       onClick={(e) => handleDeleteNote(e, note.id)}
                       className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                   </div>

                   <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: subjectInfo.color }}>
                        {subjectInfo.name}
                      </span>
                   </div>
                   <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-3">{note.title}</h3>
                   <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Tópico</span>
                        <span className="text-xs font-bold text-white/80">{(note.topics as any)?.name || 'Geral'}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-2 transition-transform" />
                   </div>
                </div>
             )
           })}
        </div>
      )}

      {/* VISÃO DETALHE DO RESUMO (CONCEITO FERRETTO) */}
      {!loading && activeMode === 'teoria' && selectedNote && (
        <div className="flex flex-col lg:flex-row gap-8    pb-20">
          
          {/* Sidebar de Tópicos (Estilo Ferretto) */}
          <aside className="lg:w-80 flex flex-col gap-6 no-print">
             <button onClick={() => setSelectedNote(null)} className="flex items-center gap-3 text-text-secondary hover:text-white transition-all font-black text-xs uppercase bg-white/5 p-4 rounded-2xl border border-white/5">
                <ArrowLeft className="w-4 h-4 text-primary" /> Voltar para Lista
             </button>

             <button 
                onClick={handleDownloadPDF}
                className="btn-primary w-full py-5 text-sm uppercase tracking-widest bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600"
             >
                <Download className="w-5 h-5" /> Exportar em PDF
             </button>

             <div className="ferretto-sidebar">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Assuntos da Aula</h4>
                <div className="flex flex-col gap-2">
                   {extractTopics(selectedNote.markdown_content).map((topic, i) => (
                     <div key={i} className="flex items-center gap-2 text-sm font-bold p-2 rounded-lg hover:bg-white/10 cursor-default transition-colors leading-tight">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                        {topic}
                     </div>
                   ))}
                </div>
             </div>

             <button 
                onClick={(e) => handleDeleteNote(e, selectedNote.id)}
                className="text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest text-center transition-colors"
             >
                <Trash2 className="w-3 h-3 inline mr-1" /> Excluir permanentemente
             </button>
           </aside>

          {/* Conteúdo Principal (Apostila) */}
          <main className="flex-1 glass-card border-0 bg-white/5 p-8 md:p-14 shadow-2xl relative overflow-hidden printable-content">
             
             {/* Header Acadêmico p/ Impressão */}
             <div className="hidden no-print print:block mb-10 w-full">
                <div className="flex justify-between items-center bg-[#0047AB] p-6 rounded-t-2xl text-white -mt-14 -mx-14 mb-10 border-b-8 border-yellow-400">
                   <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Antigravity Medicina // Shredder Elit v11</span>
                      <h1 className="text-4xl font-black italic tracking-tighter mt-1">{(selectedNote.topics?.subjects as any)?.name || 'Biologia'}</h1>
                   </div>
                   <div className="text-right flex flex-col">
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Professor IA</span>
                      <span className="text-lg font-black">{selectedNote.title}</span>
                   </div>
                </div>
             </div>

             {/* Sidebar p/ Impressão (Aparece na esquerda) */}
             <div className="hidden no-print print:block print-sidebar">
                 <div className="bg-[#f8f9fa] border-l-4 border-[#0047AB] p-4 mb-6">
                    <h5 className="text-[10px] font-black uppercase text-[#0047AB] mb-4">Sumário Executivo</h5>
                    <ul className="space-y-3">
                       {extractTopics(selectedNote.markdown_content).slice(0, 10).map((t, i) => (
                         <li key={i} className="text-[9px] font-bold text-slate-700 leading-tight">• {t}</li>
                       ))}
                    </ul>
                 </div>
                 <div className="mt-8">
                    <p className="text-[8px] italic text-slate-400">Este material é de uso pessoal e intransferível. Antigravity Med 2026.</p>
                 </div>
             </div>

             {/* Coluna de Texto Principal */}
             <div className="print-main-column">
                <MarkdownRenderer content={selectedNote.markdown_content} />
             </div>

             <footer className="mt-20 pt-8 border-t border-white/5 text-[9px] text-text-secondary/30 italic no-print font-bold flex justify-between">
                <span>Material: {selectedNote.original_pdf_name || 'IA Source'}</span>
                <span>Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
             </footer>
          </main>
        </div>
      )}

      {/* VISÃO ANKI (Cognição Ativa) */}
      {!loading && activeMode === 'flashcards' && (
        <div className="flex flex-col items-center justify-center py-2   ">
           {deck.length === 0 ? (
             <div className="glass-card p-24 flex flex-col items-center gap-6 text-center border-dashed border-white/10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-4 border-emerald-500/10">
                   <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2 text-white uppercase tracking-tighter">Sinapses Carregadas!</h3>
                  <p className="text-text-secondary text-base max-w-sm leading-relaxed mx-auto italic">
                    Sua revisão diária de biologia e outras matérias está em dia. Continue triturando materiais para fortalecer sua memória.
                  </p>
                </div>
             </div>
           ) : (
             <div className="w-full max-w-2xl px-4 md:px-0">
                <div className="flex flex-col gap-1 mb-8">
                   <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">Review de Hoje</span>
                   <strong className="text-white text-3xl">{currentCardIndex + 1} <span className="text-white/10">/</span> {deck.length}</strong>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3 border border-white/5">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all " style={{ width: `${((currentCardIndex + 1) / deck.length) * 100}%` }}></div>
                   </div>
                </div>

                <div className={`glass-card relative min-h-[420px] flex flex-col w-full transition-all  border-2 ${showAnswer ? 'border-amber-500/30' : 'border-white/5'} overflow-hidden shadow-2xl shadow-orange-500/5`}>
                   <div className="p-10 md:p-14 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-8">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mt-0.5">
                           {(deck[currentCardIndex].topics?.subjects as any)?.name} // {deck[currentCardIndex].topics?.name}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black leading-tight text-white tracking-tight flex-1">
                        {deck[currentCardIndex].front_text}
                      </h2>
                   </div>

                   {showAnswer && (
                     <div className="p-10 md:p-14 bg-amber-500/5 border-t border-amber-500/10   ">
                        <div className="px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30 inline-flex items-center gap-2 mb-6">
                          <RotateCw className="w-3 h-3 text-amber-500"/> 
                          <span className="text-[8px] font-black text-amber-500 uppercase">Explicação Consolidada</span>
                        </div>
                        <p className="text-xl md:text-2xl text-slate-200 leading-relaxed font-bold tracking-tight">
                          {deck[currentCardIndex].back_text}
                        </p>
                     </div>
                   )}
                </div>

                <div className="mt-8">
                   {!showAnswer ? (
                      <button 
                        onClick={() => setShowAnswer(true)} 
                        className="w-full py-6 rounded-3xl bg-amber-500 text-white font-black text-xl shadow-2xl shadow-amber-500/20 active:scale-[0.98] transition-all hover:brightness-110 uppercase tracking-widest"
                      >
                         REVELAR RESPOSTA
                      </button>
                   ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                         {[
                           { label: 'Errei', days: '0d', val: 0, color: 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/80 hover:text-white' },
                           { label: 'Difícil', days: '1d', val: 1, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/80 hover:text-white' },
                           { label: 'Bom', days: '3d', val: 2, color: 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/80 hover:text-white' },
                           { label: 'Fácil', days: '5d', val: 3, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/80 hover:text-white' }
                         ].map((btn, idx) => (
                           <button 
                             key={idx}
                             onClick={() => handleAnkiResponse(btn.val)} 
                             className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all active:scale-95 ${btn.color}`}
                           >
                              <span className="font-black text-xs uppercase tracking-widest mb-1">{btn.label}</span>
                              <span className="text-[8px] font-black opacity-40">{btn.days}</span>
                           </button>
                         ))}
                      </div>
                   )}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
