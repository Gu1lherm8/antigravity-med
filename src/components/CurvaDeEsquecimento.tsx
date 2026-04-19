/**
 * CurvaDeEsquecimento.tsx
 * 
 * Componente principal da aba "Curva de Esquecimento"
 * Integra:
 * - Dashboard de métricas
 * - Tabela interativa (sortável, filtrável)
 * - Timeline de revisões programadas
 * - Heatmap de performance por frente
 * - Notificações via Browser Push
 * - Integração com Caderno de Erros
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  Filter,
  ArrowUpDown,
  Plus,
  BookOpen,
  Zap,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  SpacedRepetitionEngine,
  PerformanceMetric,
  ReviewSchedule,
} from '../lib/intelligence/SpacedRepetitionEngine'

// ============================================
// TIPOS LOCAIS
// ============================================

interface ReviewItem extends PerformanceMetric {
  reviewSchedule: ReviewSchedule
  frontName: string // "Frente A: Bases da Vida"
  errorCount: number // erros não dominados neste tópico
  isOverdue: boolean
}

interface DashboardMetrics {
  totalTopicsOverdue: number
  criticalCount: number
  averageRetention: number
  reviewsPlannedWeek: number
  topicsDueToday: number
}

interface FilterState {
  subject: string | null
  front: string | null
  priority: string | null
  searchTerm: string
}

type SortKey = 'dueDate' | 'retention' | 'accuracy' | 'priority' | 'daysSince'

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const CurvaDeEsquecimento: React.FC = () => {
  // ===== ESTADO =====
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalTopicsOverdue: 0,
    criticalCount: 0,
    averageRetention: 0,
    reviewsPlannedWeek: 0,
    topicsDueToday: 0,
  })

  const [filters, setFilters] = useState<FilterState>({
    subject: null,
    front: null,
    priority: null,
    searchTerm: '',
  })

  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tabela' | 'timeline' | 'heatmap'>(
    'dashboard'
  )
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<{
    tablesFound: boolean;
    missingTables: string[];
    loading: boolean;
  }>({ tablesFound: true, missingTables: [], loading: true })

  // ===== CARREGAMENTO DE DADOS =====

  const loadReviewData = useCallback(async () => {
    try {
      // Buscar tópicos com performance
      const { data: topicsData } = await supabase
        .from('topics')
        .select(
          `
          id,
          name,
          subject_id,
          front,
          subjects (
            id,
            name,
            color,
            front_a,
            front_b,
            front_c
          ),
          study_sessions (
            id,
            correct_answers,
            total_questions,
            completed_at,
            next_revision_date
          )
        `
        )
        .order('name')

      if (!topicsData) return

      // Buscar performance por tópico
      const { data: performanceData } = await supabase
        .from('concept_performance')
        .select('*')

      // Buscar erros não dominados
      const { data: errorsData } = await supabase
        .from('error_notebook')
        .select('*')
        .eq('mastered', false)

      // ===== PROCESSAR DADOS =====

      const items: ReviewItem[] = topicsData
        .map((topic: any) => {
          const subject = topic.subjects
          const sessions = topic.study_sessions || []

          // Última sessão
          const lastSession = sessions.sort(
            (a: any, b: any) =>
              new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
          )[0]

          if (!lastSession) return null

          // Performance
          const performance = performanceData?.find((p: any) => p.topic_id === topic.id)
          const accuracy = performance?.accuracy_percent || 0
          const totalAttempts = performance?.total_attempts || 0
          const correctAttempts = performance?.correct_count || 0

          // Cálculo de próxima revisão
          const reviewSchedule = SpacedRepetitionEngine.calculateNextReviewDate({
            lastCompletedDate: new Date(lastSession.completed_at),
            accuracyPercent: accuracy,
            subjectName: subject.name,
            currentIntervalDays: lastSession.next_revision_date
              ? Math.floor(
                  (new Date(lastSession.next_revision_date).getTime() -
                    new Date(lastSession.completed_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
            currentEaseFactor: 2.5,
            reviewCount: sessions.length,
          })

          // Dias desde última revisão
          const daysSinceLastReview = Math.floor(
            (Date.now() - new Date(lastSession.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          // Nome da frente
          const frontNames: Record<string, string> = {
            A: subject.front_a || 'Frente A',
            B: subject.front_b || 'Frente B',
            C: subject.front_c || 'Frente C',
          }
          const frontName = frontNames[topic.front] || `Frente ${topic.front}`

          // Erros não dominados neste tópico
          const errorCount =
            errorsData?.filter(
              (e: any) =>
                e.topic === topic.name && e.discipline === subject.name && !e.mastered
            ).length || 0

          // Verificar se está vencido
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const reviewDate = new Date(reviewSchedule.nextReviewDate)
          reviewDate.setHours(0, 0, 0, 0)
          const isOverdue = reviewDate < today

          const item: ReviewItem = {
            topicId: topic.id,
            topicName: topic.name,
            subjectId: subject.id,
            subjectName: subject.name,
            accuracyPercent: accuracy,
            totalAttempts,
            correctAttempts,
            lastAttemptDate: new Date(lastSession.completed_at),
            isDue: isOverdue,
            daysSinceLastReview,
            reviewPriority: SpacedRepetitionEngine.calculateReviewPriority(
              reviewSchedule.nextReviewDate,
              accuracy,
              reviewSchedule.retentionRate
            ),
            reviewSchedule,
            frontName,
            errorCount,
            isOverdue,
          }

          return item
        })
        .filter(Boolean) as ReviewItem[]

      setReviewItems(items)

      // ===== CALCULAR MÉTRICAS DO DASHBOARD =====

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const overdue = items.filter((i) => i.isOverdue)
      const critical = items.filter((i) => i.reviewPriority === 'CRÍTICO')
      const dueToday = items.filter((i) => {
        const reviewDate = new Date(i.reviewSchedule.nextReviewDate)
        reviewDate.setHours(0, 0, 0, 0)
        return reviewDate.getTime() === today.getTime()
      })
      const dueWeek = items.filter((i) => {
        const reviewDate = new Date(i.reviewSchedule.nextReviewDate)
        return reviewDate >= today && reviewDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      })

      const avgRetention =
        items.length > 0
          ? items.reduce((sum, i) => sum + i.reviewSchedule.retentionRate, 0) / items.length
          : 0

      setDashboardMetrics({
        totalTopicsOverdue: overdue.length,
        criticalCount: critical.length,
        averageRetention: avgRetention,
        reviewsPlannedWeek: dueWeek.length,
        topicsDueToday: dueToday.length,
      })
    } catch (error) {
      console.error('Erro ao carregar dados de revisão:', error)
    }
  }, [])

  // Verificar status das tabelas (Migration Checklist)
  const checkMigration = useCallback(async () => {
    try {
      setMigrationStatus(prev => ({ ...prev, loading: true }))
      const tables = ['spaced_review_schedule', 'review_session_history', 'review_notifications']
      const missing = []

      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        // Se o erro for 42P01, a tabela não existe
        if (error && (error as any).code === '42P01') {
          missing.push(table)
        }
      }

      setMigrationStatus({
        tablesFound: missing.length === 0,
        missingTables: missing,
        loading: false
      })
    } catch (e) {
      console.error('Erro ao verificar tabelas:', e)
      setMigrationStatus(prev => ({ ...prev, loading: false }))
    }
  }, [])

  // ===== EFEITOS =====

  useEffect(() => {
    checkMigration()
    loadReviewData()
    const interval = setInterval(loadReviewData, 5 * 60 * 1000) // Refresh a cada 5 min
    return () => clearInterval(interval)
  }, [loadReviewData, checkMigration])

  // Configurar notificações
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          // Verificar a cada hora se há revisões vencidas
          const checkInterval = setInterval(() => {
            const overdue = reviewItems.filter((i) => i.isOverdue)
            if (overdue.length > 0) {
              new Notification('⚠️ Revisões Vencidas!', {
                body: `Você tem ${overdue.length} revisões vencidas. Hora de revisar!`,
                icon: '📚',
                badge: '🎓',
              })
            }
          }, 60 * 60 * 1000)
          return () => clearInterval(checkInterval)
        }
      })
    }
  }, [notificationsEnabled, reviewItems])

  // ===== FILTRAGEM E ORDENAÇÃO =====

  const filteredItems = reviewItems.filter((item) => {
    if (filters.subject && item.subjectName !== filters.subject) return false
    if (filters.front && item.frontName !== filters.front) return false
    if (filters.priority && item.reviewPriority !== filters.priority) return false
    if (
      filters.searchTerm &&
      !item.topicName.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0

    switch (sortKey) {
      case 'dueDate':
        comparison =
          a.reviewSchedule.nextReviewDate.getTime() -
          b.reviewSchedule.nextReviewDate.getTime()
        break
      case 'retention':
        comparison = a.reviewSchedule.retentionRate - b.reviewSchedule.retentionRate
        break
      case 'accuracy':
        comparison = a.accuracyPercent - b.accuracyPercent
        break
      case 'priority':
        const priorityOrder = { CRÍTICO: 0, ALTO: 1, MÉDIO: 2, BAIXO: 3 }
        comparison =
          priorityOrder[a.reviewPriority] - priorityOrder[b.reviewPriority]
        break
      case 'daysSince':
        comparison = a.daysSinceLastReview - b.daysSinceLastReview
        break
    }

    return sortAsc ? comparison : -comparison
  })

  // ===== FUNÇÕES AUXILIARES =====

  const getSubjects = () => [...new Set(reviewItems.map((i) => i.subjectName))]
  const getFronts = () => [...new Set(reviewItems.map((i) => i.frontName))]

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const getPriorityColor = (
    priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'
  ): string => {
    const colors: Record<string, string> = {
      CRÍTICO: 'bg-red-500/20 text-red-400 border-red-500',
      ALTO: 'bg-orange-500/20 text-orange-400 border-orange-500',
      MÉDIO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
      BAIXO: 'bg-green-500/20 text-green-400 border-green-500',
    }
    return colors[priority]
  }

  const getPriorityIcon = (priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO') => {
    const icons: Record<string, React.ReactNode> = {
      CRÍTICO: <AlertTriangle className="w-4 h-4" />,
      ALTO: <AlertCircle className="w-4 h-4" />,
      MÉDIO: <Clock className="w-4 h-4" />,
      BAIXO: <CheckCircle className="w-4 h-4" />,
    }
    return icons[priority]
  }

  // ============================================
  // RENDERIZAÇÃO - DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Migration Checklist - Alerta se faltar tabelas */}
      {!migrationStatus.loading && !migrationStatus.tablesFound && (
        <div className="glass-card border border-red-500/50 bg-red-500/10 p-6 rounded-2xl animate-pulse">
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <div className="flex-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">⚠️ Tabelas não encontradas</h3>
              <p className="text-sm text-text-secondary mt-1">
                O banco de dados precisa ser configurado. Execute o script <code className="bg-black/40 px-2 py-0.5 rounded text-red-400">schema_curva_esquecimento.sql</code> no seu console do Supabase.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['spaced_review_schedule', 'review_session_history', 'review_notifications'].map(table => (
                  <span key={table} className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${migrationStatus.missingTables.includes(table) ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'}`}>
                    {table} {migrationStatus.missingTables.includes(table) ? '❌' : '✅'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Revisões Vencidas */}
        <div className="glass-card border border-red-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Vencidas</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400">
            {dashboardMetrics.totalTopicsOverdue}
          </div>
          <p className="text-xs text-text-secondary mt-1">tópicos em atraso</p>
        </div>

        {/* Card 2: Críticas */}
        <div className="glass-card border border-orange-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Críticas</span>
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-orange-400">
            {dashboardMetrics.criticalCount}
          </div>
          <p className="text-xs text-text-secondary mt-1">prioridade máxima</p>
        </div>

        {/* Card 3: Retenção Média */}
        <div className="glass-card border border-blue-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Retenção Média</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {Math.round(dashboardMetrics.averageRetention * 100)}%
          </div>
          <p className="text-xs text-text-secondary mt-1">memória estimada</p>
        </div>

        {/* Card 4: Planejadas Semana */}
        <div className="glass-card border border-cyan-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Próx. Semana</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {dashboardMetrics.reviewsPlannedWeek}
          </div>
          <p className="text-xs text-text-secondary mt-1">revisões agendadas</p>
        </div>

        {/* Card 5: Hoje */}
        <div className="glass-card border border-green-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">Hoje</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400">
            {dashboardMetrics.topicsDueToday}
          </div>
          <p className="text-xs text-text-secondary mt-1">para revisar</p>
        </div>
      </div>

      {/* Aviso de Dados Insuficientes */}
      {reviewItems.length === 0 && (
        <div className="glass-card border border-yellow-500/30 bg-yellow-500/5 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-1">Dados Insuficientes</h3>
              <p className="text-text-secondary text-sm">
                Complete pelo menos 3 sessões de estudo com registros de acertos para que a
                Curva de Esquecimento começe a funcionar. 📚
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Placeholder: Curva de Ebbinghaus */}
      {reviewItems.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Curva de Esquecimento - Conceito
          </h3>
          <div className="text-sm text-text-secondary">
            <p>
              A neurociência mostra que esquecemos ~50% do novo conteúdo em 24h (Hermann
              Ebbinghaus). Este dashboard programa revisões nos momentos ótimos para retenção
              máxima.
            </p>
            <p className="mt-3">
              📊 Revisões estratégicas em: <strong>1 dia</strong> → <strong>3 dias</strong> →{' '}
              <strong>7 dias</strong> → <strong>14 dias</strong> → <strong>30 dias</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )

  // ============================================
  // RENDERIZAÇÃO - TABELA
  // ============================================

  const renderTabela = () => (
    <div className="space-y-4">
      {/* Controles de Filtro */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-semibold text-text-secondary">Filtros</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca */}
          <input
            type="text"
            placeholder="Buscar tópico..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
          />

          {/* Matéria */}
          <select
            value={filters.subject || ''}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value || null })}
            className="px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Todas as matérias</option>
            {getSubjects().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Frente */}
          <select
            value={filters.front || ''}
            onChange={(e) => setFilters({ ...filters, front: e.target.value || null })}
            className="px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Todas as frentes</option>
            {getFronts().map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Prioridade */}
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value || null })}
            className="px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Todas as prioridades</option>
            <option value="CRÍTICO">🔴 Crítico</option>
            <option value="ALTO">🟠 Alto</option>
            <option value="MÉDIO">🟡 Médio</option>
            <option value="BAIXO">🟢 Baixo</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-text-secondary font-semibold">
                  <button
                    onClick={() => {
                      setSortKey('priority')
                      setSortAsc(!sortAsc)
                    }}
                    className="flex items-center gap-1 hover:text-text-primary transition"
                  >
                    Prioridade <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-text-secondary font-semibold">
                  <button
                    onClick={() => {
                      setSortKey('accuracy')
                      setSortAsc(!sortAsc)
                    }}
                    className="flex items-center gap-1 hover:text-text-primary transition"
                  >
                    Tópico <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-text-secondary font-semibold">
                  Matéria
                </th>
                <th className="px-4 py-3 text-center text-text-secondary font-semibold">
                  <button
                    onClick={() => {
                      setSortKey('accuracy')
                      setSortAsc(!sortAsc)
                    }}
                    className="flex items-center gap-1 hover:text-text-primary transition"
                  >
                    Acertos <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-text-secondary font-semibold">
                  <button
                    onClick={() => {
                      setSortKey('retention')
                      setSortAsc(!sortAsc)
                    }}
                    className="flex items-center gap-1 hover:text-text-primary transition"
                  >
                    Retenção <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-text-secondary font-semibold">
                  <button
                    onClick={() => {
                      setSortKey('dueDate')
                      setSortAsc(!sortAsc)
                    }}
                    className="flex items-center gap-1 hover:text-text-primary transition"
                  >
                    Próxima Revisão <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-text-secondary font-semibold">
                  Erros
                </th>
                <th className="px-4 py-3 text-center text-text-secondary font-semibold">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    Nenhum resultado encontrado
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => {
                  const daysUntilForget = SpacedRepetitionEngine.daysUntilForgetfulness(
                    item.daysSinceLastReview,
                    item.reviewSchedule.easeFactor
                  )

                  return (
                    <tr
                      key={item.topicId}
                      className="border-b border-border hover:bg-bg-secondary/50 transition"
                    >
                      {/* Prioridade */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold ${getPriorityColor(
                            item.reviewPriority
                          )}`}
                        >
                          {getPriorityIcon(item.reviewPriority)}
                          {item.reviewPriority}
                        </span>
                      </td>

                      {/* Tópico */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-text-primary">{item.topicName}</p>
                          <p className="text-xs text-text-secondary">{item.frontName}</p>
                        </div>
                      </td>

                      {/* Matéria */}
                      <td className="px-4 py-3 text-text-secondary">{item.subjectName}</td>

                      {/* Acertos */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            item.accuracyPercent >= 70 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {item.accuracyPercent.toFixed(0)}%
                        </span>
                        <p className="text-xs text-text-secondary">
                          {item.correctAttempts}/{item.totalAttempts}
                        </p>
                      </td>

                      {/* Retenção */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-cyan-400">
                          {(item.reviewSchedule.retentionRate * 100).toFixed(0)}%
                        </span>
                        <p className="text-xs text-text-secondary">
                          {daysUntilForget}d até esquecer
                        </p>
                      </td>

                      {/* Próxima Revisão */}
                      <td className="px-4 py-3 text-center">
                        <p className="font-semibold text-text-primary">
                          {formatDate(item.reviewSchedule.nextReviewDate)}
                        </p>
                        <p className="text-xs text-text-secondary">
                          em {item.reviewSchedule.intervalDays}d
                        </p>
                      </td>

                      {/* Erros */}
                      <td className="px-4 py-3 text-center">
                        {item.errorCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-semibold">
                            {item.errorCount}
                          </span>
                        ) : (
                          <span className="text-text-secondary text-xs">—</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="px-4 py-3 text-center">
                        <button className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/40 transition text-xs font-semibold">
                          <Plus className="w-3 h-3" />
                          Revisar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // ============================================
  // RENDERIZAÇÃO - TIMELINE
  // ============================================

  const renderTimeline = () => {
    const nextDays = 14
    const timeline: Map<string, ReviewItem[]> = new Map()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i <= nextDays; i++) {
      const day = new Date(today)
      day.setDate(day.getDate() + i)
      const dayKey = day.toISOString().split('T')[0]
      timeline.set(dayKey, [])
    }

    sortedItems.forEach((item) => {
      const reviewDate = new Date(item.reviewSchedule.nextReviewDate)
      reviewDate.setHours(0, 0, 0, 0)
      const dayKey = reviewDate.toISOString().split('T')[0]

      if (timeline.has(dayKey)) {
        timeline.get(dayKey)!.push(item)
      }
    })

    return (
      <div className="space-y-3">
        {Array.from(timeline.entries()).map(([dayKey, items]) => {
          const date = new Date(dayKey + 'T00:00:00')
          const isToday = date.toDateString() === today.toDateString()
          const isOverdue = date < today

          return (
            <div key={dayKey} className={isToday ? 'ring-2 ring-cyan-400 rounded' : ''}>
              <div
                className={`glass-card p-4 ${
                  isToday ? 'bg-cyan-500/10' : isOverdue ? 'bg-red-500/10' : ''
                }`}
              >
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  {date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {isToday && <span className="text-xs bg-cyan-500/30 px-2 py-1 rounded">Hoje</span>}
                  {isOverdue && <span className="text-xs bg-red-500/30 px-2 py-1 rounded">Vencido</span>}
                </h3>

                {items.length === 0 ? (
                  <p className="text-text-secondary text-sm">Nenhuma revisão</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.topicId} className="flex items-center justify-between p-3 bg-bg-secondary/50 rounded border-l-2 border-cyan-400">
                        <div>
                          <p className="font-semibold text-text-primary">{item.topicName}</p>
                          <p className="text-xs text-text-secondary">{item.subjectName}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-semibold ${
                              item.accuracyPercent >= 70 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {item.accuracyPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ============================================
  // RENDERIZAÇÃO - HEATMAP
  // ============================================

  const renderHeatmap = () => {
    const subjects = getSubjects()
    const priorityMap: Record<string, Record<string, number>> = {}

    subjects.forEach((subject) => {
      priorityMap[subject] = { CRÍTICO: 0, ALTO: 0, MÉDIO: 0, BAIXO: 0 }

      sortedItems
        .filter((i) => i.subjectName === subject)
        .forEach((item) => {
          priorityMap[subject][item.reviewPriority]++
        })
    })

    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Distribuição de Prioridades por Matéria
          </h3>

          <div className="space-y-4">
            {subjects.map((subject) => {
              const data = priorityMap[subject]
              const total = Object.values(data).reduce((a, b) => a + b, 0)

              return (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-text-primary">{subject}</span>
                    <span className="text-xs text-text-secondary">{total} tópicos</span>
                  </div>
                  <div className="flex gap-2 h-8 rounded overflow-hidden">
                    {data.CRÍTICO > 0 && (
                      <div
                        className="bg-red-500/60 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${(data.CRÍTICO / total) * 100}%` }}
                      >
                        {data.CRÍTICO}
                      </div>
                    )}
                    {data.ALTO > 0 && (
                      <div
                        className="bg-orange-500/60 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${(data.ALTO / total) * 100}%` }}
                      >
                        {data.ALTO}
                      </div>
                    )}
                    {data.MÉDIO > 0 && (
                      <div
                        className="bg-yellow-500/60 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${(data.MÉDIO / total) * 100}%` }}
                      >
                        {data.MÉDIO}
                      </div>
                    )}
                    {data.BAIXO > 0 && (
                      <div
                        className="bg-green-500/60 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${(data.BAIXO / total) * 100}%` }}
                      >
                        {data.BAIXO}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold text-text-primary mb-3">Legenda</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/60"></div>
                <span className="text-text-secondary">Crítico (7+ dias vencido)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500/60"></div>
                <span className="text-text-secondary">Alto (1-3 dias vencido)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/60"></div>
                <span className="text-text-secondary">Médio (próximos 2-3 dias)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/60"></div>
                <span className="text-text-secondary">Baixo (futuro distante)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header com Abas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-text-primary">Curva de Esquecimento</h1>
        </div>
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded font-semibold transition ${
            notificationsEnabled
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
              : 'bg-text-secondary/10 text-text-secondary border border-border'
          }`}
        >
          <Bell className="w-4 h-4" />
          {notificationsEnabled ? 'Notificações ON' : 'Notificações OFF'}
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border">
        {(['dashboard', 'tabela', 'timeline', 'heatmap'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold transition capitalize ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'tabela' && '📋 Tabela'}
            {tab === 'timeline' && '📅 Timeline'}
            {tab === 'heatmap' && '🔥 Heatmap'}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'tabela' && renderTabela()}
      {activeTab === 'timeline' && renderTimeline()}
      {activeTab === 'heatmap' && renderHeatmap()}
    </div>
  )
}

export default CurvaDeEsquecimento
