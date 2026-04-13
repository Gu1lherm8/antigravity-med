// ============================================================
// components/study/SimulationModule.tsx
// Simulados: criação, resolução e análise de pontos cegos
// Stack: React + TypeScript + TailwindCSS + Lucide React
// ============================================================

import { useState, useEffect } from 'react'
import {
  GraduationCap, Plus, Target, AlertTriangle,
  CheckCircle, XCircle, Clock, BarChart3,
  ChevronRight, Pencil, Trash2, Eye, X,
  BookOpen, Lightbulb, Trophy
} from 'lucide-react'
import { simulationService, questionService, subjectService, topicService } from '../../services/studyService'
import type {
  Simulation, SimulationQuestion, SimulationAnswer,
  Subject, Topic, QuestionOption
} from '../../types/study'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

const pct = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 100)

// ── Painel de Pontos Cegos ─────────────────────────────────────

function BlindSpotPanel({ simulationId }: { simulationId: string }) {
  const [blindSpots, setBlindSpots] = useState<SimulationAnswer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Filtra pontos cegos deste simulado
    simulationService.getAnswers(simulationId).then(answers => {
      setBlindSpots(answers.filter(a => a.blind_spot))
      setLoading(false)
    })
  }, [simulationId])

  if (loading) return null

  return (
    <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">
          Pontos Cegos ({blindSpots.length})
        </h3>
      </div>
      {blindSpots.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhum ponto cego marcado neste simulado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {blindSpots.map(bs => (
            <div key={bs.id} className="bg-white/3 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={13} className="text-rose-400 flex-shrink-0" />
                <span className="text-xs text-slate-400">
                  Respondeu: <strong className="text-rose-400">{bs.chosen_option}</strong>
                  {' '}— Correto: <strong className="text-emerald-400">{/* correct filled below */}</strong>
                </span>
              </div>
              {bs.notes && (
                <p className="text-xs text-slate-500 mt-1 italic">{bs.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tela de resolução do simulado ─────────────────────────────

interface SimulationPlayerProps {
  simulation: Simulation
  questions: SimulationQuestion[]
  onFinish: (answers: Record<string, { chosen: string; correct: string; isCorrect: boolean; blindSpot: boolean; notes: string }>) => void
  onBack: () => void
}

function SimulationPlayer({ simulation, questions, onFinish, onBack }: SimulationPlayerProps) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [blindSpots, setBlindSpots] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [startTime] = useState(Date.now())

  const q = questions[current]
  if (!q) return null

  const statement = q.statement_inline ?? q.question?.statement ?? ''
  const opts: QuestionOption[] = q.options_inline ?? q.question?.options ?? []
  const correct = q.correct_option ?? q.question?.correct_option ?? ''
  const chosen = answers[q.id]
  const isAnswered = !!chosen
  const isCorrect = chosen === correct

  const handleAnswer = (optId: string) => {
    if (isAnswered) return
    setAnswers(a => ({ ...a, [q.id]: optId }))
  }

  const handleFinish = () => {
    const result: Record<string, { chosen: string; correct: string; isCorrect: boolean; blindSpot: boolean; notes: string }> = {}
    questions.forEach(question => {
      const c = answers[question.id] ?? ''
      const correctOpt = question.correct_option ?? question.question?.correct_option ?? ''
      result[question.id] = {
        chosen: c,
        correct: correctOpt,
        isCorrect: c === correctOpt,
        blindSpot: blindSpots[question.id] ?? false,
        notes: notes[question.id] ?? ''
      }
    })
    onFinish(result)
  }

  const answered = Object.keys(answers).length
  const progress = pct(answered, questions.length)

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
          ← Voltar
        </button>
        <div className="text-xs text-slate-500">{current + 1} / {questions.length}</div>
      </div>

      {/* Progresso */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Questão */}
      <div className="bg-slate-800/60 border border-white/8 rounded-xl p-5">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {q.subject && <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-md">{q.subject.name}</span>}
          {q.topic && <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-md">{q.topic.name}</span>}
        </div>

        {/* Enunciado */}
        <p className="text-sm text-slate-200 leading-relaxed mb-5">{statement}</p>

        {/* Imagem */}
        {q.question?.image_url && (
          <img src={q.question.image_url} alt="Questão" className="w-full max-h-48 object-contain rounded-lg mb-4 bg-white/3" />
        )}

        {/* Alternativas */}
        <div className="flex flex-col gap-2">
          {opts.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              disabled={isAnswered}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all
                ${isAnswered
                  ? opt.id === correct
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : opt.id === chosen && !isCorrect
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-white/3 border-white/8 text-slate-500'
                  : 'bg-white/3 border-white/10 text-slate-300 hover:bg-white/6 hover:border-white/20'}`}
            >
              <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all
                ${isAnswered && opt.id === correct ? 'border-emerald-500 text-emerald-400' :
                  isAnswered && opt.id === chosen ? 'border-rose-500 text-rose-400' :
                  'border-white/20 text-slate-400'}`}>
                {opt.id}
              </span>
              <span className="flex-1">{opt.text}</span>
              {isAnswered && opt.id === correct && <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />}
              {isAnswered && opt.id === chosen && !isCorrect && <XCircle size={15} className="text-rose-400 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Após responder: marcar ponto cego + anotação */}
        {isAnswered && !isCorrect && (
          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-500"
                checked={blindSpots[q.id] ?? false}
                onChange={e => setBlindSpots(b => ({ ...b, [q.id]: e.target.checked }))}
              />
              <span className="text-sm text-amber-400 flex items-center gap-1">
                <AlertTriangle size={13} />
                Marcar como ponto cego
              </span>
            </label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none"
              placeholder="Anotação sobre o erro (opcional)..."
              rows={2}
              value={notes[q.id] ?? ''}
              onChange={e => setNotes(n => ({ ...n, [q.id]: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
        >
          ← Anterior
        </button>

        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-all
                ${i === current ? 'bg-indigo-600 text-white' :
                  answers[questions[i].id]
                    ? answers[questions[i].id] === (questions[i].correct_option ?? questions[i].question?.correct_option)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                    : 'bg-white/5 text-slate-500'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-all"
          >
            Próxima →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <Trophy size={15} />
            Finalizar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Resultado ─────────────────────────────────────────────────

function SimulationResult({
  simulation,
  results,
  onClose
}: {
  simulation: Simulation
  results: Record<string, { chosen: string; correct: string; isCorrect: boolean; blindSpot: boolean }>
  onClose: () => void
}) {
  const total = Object.keys(results).length
  const correct = Object.values(results).filter(r => r.isCorrect).length
  const wrong = total - correct
  const blindCount = Object.values(results).filter(r => r.blindSpot).length
  const score = pct(correct, total)

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <Trophy size={40} className={`mx-auto mb-3 ${score >= 70 ? 'text-amber-400' : score >= 50 ? 'text-indigo-400' : 'text-slate-500'}`} />
        <h2 className="text-xl font-bold text-slate-100">{simulation.title}</h2>
        <p className="text-sm text-slate-500 mt-1">Resultado final</p>
      </div>

      {/* Placar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Acertos', value: correct, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Erros', value: wrong, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Pontos Cegos', value: blindCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border p-4 text-center ${item.bg}`}>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Barra de aproveitamento */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Aproveitamento</span>
          <span className={score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}>
            {score}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {blindCount > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400 mb-0.5">
              {blindCount} ponto{blindCount > 1 ? 's cegos' : ' cego'} identificado{blindCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-500">
              Esses tópicos precisam de atenção especial. Revise os resumos e refaça questões relacionadas.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
      >
        Voltar para Simulados
      </button>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

export default function SimulationModule() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [playingSimulation, setPlayingSimulation] = useState<Simulation | null>(null)
  const [playingQuestions, setPlayingQuestions] = useState<SimulationQuestion[]>([])
  const [results, setResults] = useState<Record<string, { chosen: string; correct: string; isCorrect: boolean; blindSpot: boolean; notes: string }> | null>(null)
  const [completedSimulation, setCompletedSimulation] = useState<Simulation | null>(null)

  // Criação rápida
  const [newTitle, setNewTitle] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([simulationService.getAll(), subjectService.getAll()]).then(([sims, subs]) => {
      setSimulations(sims)
      setSubjects(subs)
      setLoading(false)
    })
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    const sim = await simulationService.create({
      title: newTitle,
      source: newSource,
      date_taken: newDate || undefined,
      status: 'pending',
    })
    setSimulations(s => [sim, ...s])
    setNewTitle('')
    setNewSource('')
    setNewDate('')
    setShowCreate(false)
    setCreating(false)
  }

  const handlePlay = async (sim: Simulation) => {
    const qs = await simulationService.getQuestions(sim.id)
    setPlayingSimulation(sim)
    setPlayingQuestions(qs)
  }

  const handleFinish = async (
    res: Record<string, { chosen: string; correct: string; isCorrect: boolean; blindSpot: boolean; notes: string }>
  ) => {
    if (!playingSimulation) return
    // Salvar respostas no banco
    for (const [sqId, r] of Object.entries(res)) {
      await simulationService.saveAnswer({
        simulation_id: playingSimulation.id,
        simulation_question_id: sqId,
        chosen_option: r.chosen,
        is_correct: r.isCorrect,
        blind_spot: r.blindSpot,
        notes: r.notes,
      })
    }
    setCompletedSimulation(playingSimulation)
    setResults(res)
    setPlayingSimulation(null)
    setPlayingQuestions([])
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"

  // Tela de resolução
  if (playingSimulation && playingQuestions.length > 0) {
    return (
      <SimulationPlayer
        simulation={playingSimulation}
        questions={playingQuestions}
        onFinish={handleFinish}
        onBack={() => { setPlayingSimulation(null); setPlayingQuestions([]) }}
      />
    )
  }

  // Tela de resultado
  if (completedSimulation && results) {
    return (
      <SimulationResult
        simulation={completedSimulation}
        results={results}
        onClose={() => { setCompletedSimulation(null); setResults(null) }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap size={20} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">Simulados</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{simulations.length}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={15} />
          Novo Simulado
        </button>
      </div>

      {/* Criar simulado */}
      {showCreate && (
        <div className="bg-slate-800/60 border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-200">Novo Simulado</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Título *</label>
              <input className={inputClass} placeholder="Ex: ENEM 2024 — 1ª Aplicação" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Fonte</label>
              <input className={inputClass} placeholder="Ex: Cursinho Ferreto" value={newSource} onChange={e => setNewSource(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Data de realização</label>
              <input type="date" className={inputClass} value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
            <button onClick={handleCreate} disabled={creating} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
              {creating ? 'Criando...' : 'Criar Simulado'}
            </button>
          </div>
        </div>
      )}

      {/* Aviso de pontos cegos globais */}
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-400 font-medium">Foco nos pontos cegos</p>
          <p className="text-xs text-slate-500 mt-0.5">As questões marcadas como ponto cego aparecem nos resumos e materiais relacionados para reforço.</p>
        </div>
      </div>

      {/* Lista de simulados */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : simulations.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum simulado ainda</p>
          <p className="text-xs mt-1">Crie seu primeiro simulado acima</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {simulations.map(sim => (
            <div key={sim.id} className="bg-slate-800/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">{sim.title}</h3>
                  {sim.source && <p className="text-xs text-slate-500 mt-0.5">{sim.source}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  sim.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  sim.status === 'in_progress' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-slate-500 bg-white/5 border-white/10'
                }`}>
                  {sim.status === 'completed' ? 'Concluído' : sim.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                </span>
              </div>

              {sim.date_taken && (
                <p className="text-xs text-slate-600 mb-3 flex items-center gap-1">
                  <Clock size={11} />
                  {formatDate(sim.date_taken)}
                </p>
              )}

              <BlindSpotPanel simulationId={sim.id} />

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handlePlay(sim)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-all"
                >
                  <Target size={13} />
                  {sim.status === 'completed' ? 'Refazer' : 'Iniciar'}
                </button>
                <button className="px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-all">
                  <BarChart3 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
