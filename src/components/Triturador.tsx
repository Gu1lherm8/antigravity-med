import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Brain,
  ClipboardList,
  RefreshCw,
  Type,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

// =========================================================
// TIPOS
// =========================================================
type Stage = 'idle' | 'extracting' | 'processing' | 'saving' | 'done' | 'error';
type InputMode = 'pdf' | 'text';

interface ProcessResult {
  subject: string;
  topic: string;
  title: string;
  saved: { theoryNote: boolean; flashcards: number; questions: number };
  preview: { summaryLength: number; flashcardsCount: number; questionsCount: number };
  data: {
    summary: string;
    flashcards: Array<{ front: string; back: string }>;
    questions: Array<{ text: string; options: string[]; correct_answer: number; explanation: string }>;
  };
}

// =========================================================
// EXTRAÇÃO DE TEXTO DO PDF — usa PDF.js via workerSrc
// =========================================================
async function extractTextFromPDF(file: File): Promise<string> {
  // Carrega pdf.js dinamicamente para não quebrar o bundle
  const pdfjsLib = await import('pdfjs-dist');
  
  // Worker necessário para renderização
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export function Triturador() {
  const [mode, setMode] = useState<InputMode>('pdf');
  const [stage, setStage] = useState<Stage>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Drag & Drop ──────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setError(null);
    } else {
      setError('Por favor, envie apenas arquivos PDF.');
    }
  }, []);

  // ─── Processamento Principal ──────────────────────────
  const handleProcess = async () => {
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      let text = '';

      if (mode === 'pdf') {
        if (!file) return setError('Selecione um PDF primeiro.');
        
        // Etapa 1: Extração
        setStage('extracting');
        setProgress(20);
        text = await extractTextFromPDF(file);

        if (text.length < 50) {
          throw new Error('O PDF parece estar vazio ou protegido. Tente outro arquivo.');
        }
        setProgress(40);
      } else {
        text = manualText.trim();
        if (text.length < 50) return setError('Texto muito curto. Mínimo 50 caracteres.');
      }

      // Etapa 2: IA
      setStage('processing');
      setProgress(50);

      const body = {
        text,
        fileName: file?.name || 'conteudo-manual.txt',
        subject: subject || undefined,
        topic: topic || undefined,
      };

      let response = await fetch('/api/process-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Anti-falha: retry automático uma vez
      if (!response.ok && retryCount < 2) {
        setRetryCount(c => c + 1);
        await new Promise(r => setTimeout(r, 2000));
        response = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      setProgress(80);

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'A IA não conseguiu processar o conteúdo. Tente novamente.');
      }

      // Etapa 3: Salvo
      setStage('saving');
      setProgress(95);
      await new Promise(r => setTimeout(r, 500)); // feedback visual

      setResult(json);
      setStage('done');
      setProgress(100);

    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
      setStage('error');
      setProgress(0);
    }
  };

  const handleReset = () => {
    setStage('idle');
    setFile(null);
    setManualText('');
    setResult(null);
    setError(null);
    setProgress(0);
    setRetryCount(0);
    setShowFlashcards(false);
    setShowQuestions(false);
  };

  const isProcessing = ['extracting', 'processing', 'saving'].includes(stage);

  // ─── RENDER ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 max-w-4xl pb-20">

      {/* CABEÇALHO */}
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
          <Sparkles className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Triturador IA</h2>
          <p className="text-text-secondary font-bold text-sm mt-0.5">PDF → Resumo · Flashcards · Questões · <span className="text-indigo-400">Salvo no Supabase</span></p>
        </div>
      </header>

      {/* SELETOR DE MODO */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
        {([['pdf', 'Upload de PDF', FileText], ['text', 'Colar Texto (NotebookLM)', Type]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${
              mode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-text-secondary hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ÁREA DE INPUT */}
      {stage !== 'done' && (
        <div className="flex flex-col gap-4">

            {mode === 'pdf' ? (
              /* DRAG & DROP */
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all group ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(null); } }}
                  className="hidden"
                />
                {file ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                      <FileText className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-white text-lg">{file.name}</p>
                      <p className="text-text-secondary text-sm">{(file.size / 1024).toFixed(0)} KB · Pronto para triturar</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="absolute top-4 right-4 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <X className="w-4 h-4 text-text-secondary" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-all border border-white/5 group-hover:border-indigo-500/30">
                      <Upload className="w-8 h-8 text-text-secondary group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-white text-lg">Arraste seu PDF aqui</p>
                      <p className="text-text-secondary text-sm">ou clique para selecionar · Tamanho máximo: 10MB</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* MODO TEXTO MANUAL */
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest">Cole o texto do NotebookLM ou qualquer fonte</label>
                <textarea
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  placeholder="Cole aqui o conteúdo acadêmico que deseja transformar em material de estudo..."
                  rows={12}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white text-sm font-medium resize-none focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-white/20"
                />
                <p className="text-[11px] text-text-secondary/50 text-right">{manualText.length} caracteres</p>
              </div>
            )}

            {/* CAMPOS OPCIONAIS */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'subject', label: 'Matéria (opcional)', placeholder: 'Ex: Biologia, Química...', val: subject, set: setSubject },
                { key: 'topic', label: 'Tópico (opcional)', placeholder: 'Ex: Respiração Celular...', val: topic, set: setTopic },
              ].map(({ key, label, placeholder, val, set }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{label}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-white/20"
                  />
                </div>
              ))}
            </div>

            {/* ERRO */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm font-bold text-red-300">{error}</p>
              </div>
            )}

            {/* PROGRESSO */}
            {isProcessing && (
              <div className="flex flex-col gap-4 p-6 glass-card border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="font-black text-white text-sm">
                      {stage === 'extracting' ? '📄 Extraindo texto do PDF...' :
                       stage === 'processing' ? '🧠 Gemini está triturando o conteúdo...' :
                       '💾 Salvando no Supabase...'}
                    </p>
                    <p className="text-[11px] text-text-secondary/60 mt-0.5">
                      {stage === 'processing' ? 'Gerando resumo, flashcards e questões ENEM...' :
                       stage === 'saving' ? 'Salvando em theory_notes, flashcards e questions...' : ''}
                    </p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all "
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs font-black text-indigo-400/60 text-right">{progress}%</p>
              </div>
            )}

            {/* BOTÃO */}
            <button
              onClick={handleProcess}
              disabled={isProcessing || (mode === 'pdf' && !file) || (mode === 'text' && manualText.length < 50)}
              className="w-full py-5 rounded-3xl font-black text-xl uppercase tracking-widest transition-all flex items-center justify-center gap-3
                bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] shadow-2xl shadow-indigo-500/25
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              {isProcessing ? (
                <><Loader2 className="w-6 h-6" /> Processando...</>
              ) : (
                <><Zap className="w-6 h-6 fill-white" /> Triturar Agora</>
              )}
            </button>

          </div>
        )}

        {/* RESULTADO */}
        {stage === 'done' && result && (
          <div className="flex flex-col gap-6">

            {/* BANNER DE SUCESSO */}
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-black text-emerald-400 text-lg uppercase">Material Criado e Salvo!</p>
                <p className="text-sm text-white/70 mt-0.5">
                  <span className="font-bold text-white">{result.subject}</span> · {result.topic}
                </p>
              </div>
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-sm font-black text-text-secondary hover:text-white transition-all">
                <RefreshCw className="w-4 h-4" /> Novo
              </button>
            </div>

            {/* CARDS DE RESULTADO */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BookOpen, label: 'Resumo', value: result.saved.theoryNote ? 'Salvo ✓' : 'Não salvo', sub: `${(result.preview.summaryLength / 1000).toFixed(1)}k caracteres`, color: result.saved.theoryNote ? 'text-emerald-400' : 'text-yellow-400' },
                { icon: Brain, label: 'Flashcards', value: `${result.saved.flashcards}`, sub: 'cartões salvos', color: 'text-indigo-400' },
                { icon: ClipboardList, label: 'Questões', value: `${result.saved.questions}`, sub: 'questões salvas', color: 'text-primary' },
              ].map((item, i) => (
                <div key={i} className="glass-card p-5 flex flex-col gap-2 bg-white/[0.02]">
                  <item.icon className="w-5 h-5 text-text-secondary" />
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{item.label}</span>
                  <span className={`text-2xl font-black ${item.color}`}>{item.value}</span>
                  <span className="text-[11px] text-text-secondary/50 font-bold">{item.sub}</span>
                </div>
              ))}
            </div>

            {/* FLASHCARDS PREVIEW */}
            {result.data?.flashcards?.length > 0 && (
              <div className="glass-card overflow-hidden border-white/5">
                <button
                  onClick={() => setShowFlashcards(v => !v)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-indigo-400" />
                    <span className="font-black text-white">Flashcards Criados</span>
                    <span className="text-[11px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{result.data.flashcards.length}</span>
                  </div>
                  {showFlashcards ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
                </button>
                {showFlashcards && (
                  <div className="flex flex-col divide-y divide-white/5">
                    {result.data.flashcards.slice(0, 5).map((fc, i) => (
                      <div key={i} className="px-5 py-4 flex flex-col gap-1">
                        <p className="text-sm font-bold text-white">{fc.front}</p>
                        <p className="text-sm text-text-secondary">{fc.back}</p>
                      </div>
                    ))}
                    {result.data.flashcards.length > 5 && (
                      <div className="px-5 py-3 text-xs text-text-secondary/50 font-bold">
                        +{result.data.flashcards.length - 5} flashcards na Biblioteca →
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QUESTÕES PREVIEW */}
            {result.data?.questions?.length > 0 && (
              <div className="glass-card overflow-hidden border-white/5">
                <button
                  onClick={() => setShowQuestions(v => !v)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <span className="font-black text-white">Questões Geradas</span>
                    <span className="text-[11px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full">{result.data.questions.length}</span>
                  </div>
                  {showQuestions ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
                </button>
                {showQuestions && (
                  <div className="flex flex-col divide-y divide-white/5">
                    {result.data.questions.slice(0, 3).map((q, i) => (
                      <div key={i} className="px-5 py-4 flex flex-col gap-3">
                        <p className="text-sm font-bold text-white">{i + 1}. {q.text}</p>
                        <div className="flex flex-col gap-1">
                          {q.options?.map((opt, oi) => (
                            <span
                              key={oi}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                                oi === q.correct_answer
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}) {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-center text-text-secondary/40 font-bold">
              Todo o material foi salvo automaticamente · Acesse na <span className="text-primary cursor-pointer">Biblioteca</span>
            </p>
          </div>
        )}

    </div>
  );
}
