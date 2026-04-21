import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Brain, Save, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface ErrorEntry {
  questionId: string;
  subject: string;
  topic: string;
  yourAnswer: string;
  correctAnswer: string;
  timeSpent: number;
  confidence: number;
  errorType?: string;
  explanation?: string;
}

export function ErrorAnalysisForm() {
  const [error, setError] = useState<ErrorEntry>({
    questionId: '',
    subject: '',
    topic: '',
    yourAnswer: '',
    correctAnswer: '',
    timeSpent: 30,
    confidence: 50
  });

  const [showExplanation, setShowExplanation] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const classifyError = (): string => {
    // Lógica de classificação automática
    if (error.timeSpent < 10 && error.confidence > 70) {
      return 'reading';
    }

    if (error.yourAnswer.toLowerCase().includes('meiose') && 
        error.correctAnswer.toLowerCase().includes('mitose')) {
      return 'confusion';
    }

    if (!error.explanation || error.explanation === '') {
      return 'knowledge';
    }

    if (error.explanation.toLowerCase().includes('confund')) {
      return 'confusion';
    }

    return 'strategy';
  };

  const getRecommendation = (type: string, topic: string) => {
    switch (type) {
      case 'reading': return 'Leia a questão 2x antes de responder e sublinhe palavras-chave.';
      case 'confusion': return `Crie um mapa mental COMPARATIVO para ${topic || 'este tópico'}.`;
      case 'knowledge': return `Faça um resumo e crie flashcards para ${topic || 'este tópico'}.`;
      case 'calculation': return 'Pegue 10 questões de cálculo e refaça devagar no papel.';
      case 'strategy': return 'Revise esta questão detalhadamente e escreva por que pensou errado.';
      case 'pressure': return 'Treino Mental: faça 1 simulado por semana sob pressão total.';
      default: return 'Revise este tópico e crie anotações.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorType = classifyError();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return;

    // Salvar erro
    const { data, error: dbError } = await supabase
      .from('error_analysis')
      .insert({
        user_id: user.id,
        question_id: error.questionId,
        subject: error.subject,
        topic: error.topic,
        your_answer: error.yourAnswer,
        correct_answer: error.correctAnswer,
        error_type: errorType,
        confidence: error.confidence,
        time_spent: error.timeSpent,
        explanation: error.explanation,
        context: 'manual_entry'
      });

    if (!dbError) {
      setSuggestion(
        getRecommendation(errorType, error.topic)
      );
      // Optional success state handling
    }
  };

  return (
    <div className="glass-card p-8 bg-white/5 border-white/5 max-w-2xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center">
          <Brain className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Registrar Erro Profundo</h2>
          <p className="text-text-secondary text-sm">Classificação inteligente para direcionamento cirúrgico.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos básicos */}
        <div>
          <label className="label-form">ID da Questão</label>
          <input
            type="text"
            value={error.questionId}
            onChange={(e) =>
              setError({ ...error, questionId: e.target.value })
            }
            className="w-full input-form"
            placeholder="ex: ENEM2023_001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-form">Matéria</label>
            <input
              type="text"
              value={error.subject}
              onChange={(e) =>
                setError({ ...error, subject: e.target.value })
              }
              className="w-full input-form"
              placeholder="Biologia"
            />
          </div>
          <div>
            <label className="label-form">Tópico</label>
            <input
              type="text"
              value={error.topic}
              onChange={(e) =>
                setError({ ...error, topic: e.target.value })
              }
              className="w-full input-form"
              placeholder="Mitose"
            />
          </div>
        </div>

        <div>
          <label className="label-form">Sua Resposta</label>
          <input
            type="text"
            value={error.yourAnswer}
            onChange={(e) =>
              setError({ ...error, yourAnswer: e.target.value })
            }
            className="w-full input-form border-red-500/20 bg-red-500/5 focus:border-red-500/50"
            placeholder="A (incorreta)"
          />
        </div>

        <div>
          <label className="label-form">Resposta Correta</label>
          <input
            type="text"
            value={error.correctAnswer}
            onChange={(e) =>
              setError({ ...error, correctAnswer: e.target.value })
            }
            className="w-full input-form border-emerald-500/20 bg-emerald-500/5 focus:border-emerald-500/50"
            placeholder="B (correta)"
          />
        </div>

        <div className="grid grid-cols-2 gap-8 pt-4">
          <div>
            <label className="flex justify-between label-form mb-4">
              <span>Tempo Gasto</span>
              <span className="text-teal-400 font-bold">{error.timeSpent}s</span>
            </label>
            <input
              type="range"
              min="5"
              max="300"
              value={error.timeSpent}
              onChange={(e) =>
                setError({
                  ...error,
                  timeSpent: parseInt(e.target.value)
                })
              }
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <label className="flex justify-between label-form mb-4">
              <span>Confiança</span>
              <span className="text-teal-400 font-bold">{error.confidence}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={error.confidence}
              onChange={(e) =>
                setError({
                  ...error,
                  confidence: parseInt(e.target.value)
                })
              }
              className="w-full accent-teal-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex justify-between items-center bg-white/5 text-white py-3 px-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-colors mt-2"
        >
          <span>Explicar Por Quê Errei</span>
          {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showExplanation && (
          <textarea
            value={error.explanation}
            onChange={(e) =>
              setError({ ...error, explanation: e.target.value })
            }
            placeholder="Descreva por que você pensa que errou..."
            className="w-full input-form resize-none"
            rows={4}
          />
        )}

        <button
          type="submit"
          className="w-full bg-teal-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-teal-400 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.2)] mt-4"
        >
          <Save className="w-5 h-5" /> Registrar e Analisar
        </button>
      </form>

      {suggestion && (
        <div className="mt-4 p-6 bg-teal-500/10 rounded-2xl border border-teal-500/20 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-teal-400 shrink-0" />
          <div>
            <h3 className="font-black text-teal-400 uppercase tracking-widest mb-1">
              Recomendação Inteligente
            </h3>
            <p className="text-white font-medium">{suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
