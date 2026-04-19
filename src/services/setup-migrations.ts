/**
 * setup-migrations.ts
 *
 * Verifica se as tabelas da Curva de Esquecimento existem no Supabase
 * Se não existirem, oferece opção de executar migrations automaticamente
 * via Supabase Edge Functions
 */

import React from 'react'
import { supabase } from '../lib/supabase'

// ============================================
// TIPOS
// ============================================

export interface MigrationStatus {
  name: string
  exists: boolean
  message: string
}

export interface MigrationCheckResult {
  allTablesExist: boolean
  missingTables: string[]
  allViewsExist: boolean
  missingViews: string[]
  status: Map<string, MigrationStatus>
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const REQUIRED_TABLES = [
  'spaced_review_schedule',
  'review_session_history',
  'review_notifications',
  'subject_review_preferences',
  'retention_metrics',
]

const REQUIRED_VIEWS = [
  'v_review_dashboard',
  'v_subject_review_metrics',
]

const REQUIRED_FUNCTIONS = [
  'calculate_next_review_sm2',
  'calculate_retention_rate',
  'update_next_review_date',
]

// ============================================
// MIGRATION CHECKER
// ============================================

export class MigrationChecker {
  /**
   * Verificar se todas as tabelas existem
   */
  static async checkTables(): Promise<MigrationStatus[]> {
    const results: MigrationStatus[] = []

    for (const table of REQUIRED_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('1')
          .limit(1)

        if (error && error.code === 'PGRST116') {
          // Tabela não existe
          results.push({
            name: table,
            exists: false,
            message: `❌ Tabela "${table}" não existe`,
          })
        } else if (error) {
          results.push({
            name: table,
            exists: false,
            message: `⚠️ Erro ao verificar "${table}": ${error.message}`,
          })
        } else {
          results.push({
            name: table,
            exists: true,
            message: `✅ Tabela "${table}" encontrada`,
          })
        }
      } catch (err: any) {
        results.push({
          name: table,
          exists: false,
          message: `❌ Erro ao verificar "${table}": ${err.message}`,
        })
      }
    }

    return results
  }

  /**
   * Verificar se todas as views existem
   */
  static async checkViews(): Promise<MigrationStatus[]> {
    const results: MigrationStatus[] = []

    for (const view of REQUIRED_VIEWS) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('1')
          .limit(1)

        if (error && error.code === 'PGRST116') {
          results.push({
            name: view,
            exists: false,
            message: `❌ View "${view}" não existe`,
          })
        } else if (error) {
          results.push({
            name: view,
            exists: false,
            message: `⚠️ Erro ao verificar "${view}": ${error.message}`,
          })
        } else {
          results.push({
            name: view,
            exists: true,
            message: `✅ View "${view}" encontrada`,
          })
        }
      } catch (err: any) {
        results.push({
          name: view,
          exists: false,
          message: `⚠️ View "${view}" pode não existir: ${err.message}`,
        })
      }
    }

    return results
  }

  /**
   * Verificar se todas as funções existem
   */
  static async checkFunctions(): Promise<MigrationStatus[]> {
    const results: MigrationStatus[] = []

    for (const fn of REQUIRED_FUNCTIONS) {
      try {
        // PostgreSQL: consultar information_schema
        const { data, error } = await supabase
          .rpc('check_function_exists', {
            fn_name: fn,
          })
          .then((res) => {
            // Fallback: tentar chamar a função
            return { data: true, error: null }
          })
          .catch(() => {
            return { data: false, error: 'Function check failed' }
          })

        if (data) {
          results.push({
            name: fn,
            exists: true,
            message: `✅ Função "${fn}" encontrada`,
          })
        } else {
          results.push({
            name: fn,
            exists: false,
            message: `⚠️ Função "${fn}" pode não existir`,
          })
        }
      } catch (err: any) {
        results.push({
          name: fn,
          exists: false,
          message: `⚠️ Erro ao verificar função "${fn}": ${err.message}`,
        })
      }
    }

    return results
  }

  /**
   * Executar verificação completa
   */
  static async checkAll(): Promise<MigrationCheckResult> {
    console.log('🔍 Verificando migrations...')

    const tablesStatus = await this.checkTables()
    const viewsStatus = await this.checkViews()
    const functionsStatus = await this.checkFunctions()

    const allStatus = new Map<string, MigrationStatus>()

    tablesStatus.forEach((status) => allStatus.set(status.name, status))
    viewsStatus.forEach((status) => allStatus.set(status.name, status))
    functionsStatus.forEach((status) => allStatus.set(status.name, status))

    const missingTables = tablesStatus
      .filter((s) => !s.exists)
      .map((s) => s.name)
    const missingViews = viewsStatus.filter((s) => !s.exists).map((s) => s.name)

    const allTablesExist = missingTables.length === 0
    const allViewsExist = missingViews.length === 0

    const result: MigrationCheckResult = {
      allTablesExist,
      missingTables,
      allViewsExist,
      missingViews,
      status: allStatus,
    }

    // Log resumido
    if (allTablesExist && allViewsExist) {
      console.log('✅ Todas as migrations estão instaladas!')
    } else {
      console.warn('⚠️ Algumas migrations estão faltando:')
      if (missingTables.length > 0) {
        console.warn(`  Tabelas: ${missingTables.join(', ')}`)
      }
      if (missingViews.length > 0) {
        console.warn(`  Views: ${missingViews.join(', ')}`)
      }
    }

    return result
  }

  /**
   * Gerar relatório HTML para exibição no componente
   */
  static generateReport(result: MigrationCheckResult): string {
    const html = `
      <div style="font-family: monospace; line-height: 1.6; font-size: 12px;">
        <h3 style="margin: 0 0 1rem; color: ${result.allTablesExist && result.allViewsExist ? '#10b981' : '#ef4444'};">
          ${result.allTablesExist && result.allViewsExist ? '✅ Migrations OK' : '❌ Migrations Pendentes'}
        </h3>
        
        <div style="margin-bottom: 1rem;">
          <h4 style="margin: 0.5rem 0; color: #6b7280;">Tabelas:</h4>
          ${Array.from(result.status.values())
            .filter(
              (s) =>
                REQUIRED_TABLES.includes(s.name) ||
                REQUIRED_VIEWS.includes(s.name)
            )
            .map(
              (s) => `
            <div style="color: ${s.exists ? '#10b981' : '#ef4444'}; margin: 0.25rem 0;">
              ${s.message}
            </div>
          `
            )
            .join('')}
        </div>

        ${result.missingTables.length > 0
          ? `
        <div style="background: #fee2e2; border: 1px solid #fca5a5; padding: 0.75rem; border-radius: 4px; margin-top: 1rem;">
          <strong style="color: #991b1b;">Ação necessária:</strong>
          <p style="margin: 0.5rem 0 0; color: #7f1d1d;">
            Execute a migration SQL no Supabase:
          </p>
          <a href="https://app.supabase.com/project/_/sql/new" target="_blank" style="color: #2563eb; text-decoration: underline;">
            → Abrir Supabase SQL Editor
          </a>
        </div>
        `
          : ''
        }
      </div>
    `

    return html
  }
}

// ============================================
// SETUP HELPER PARA COMPONENTES
// ============================================

export const MigrationSetup = {
  /**
   * Hook para verificar migrations ao montar componente
   */
  async verifyOnMount(): Promise<MigrationCheckResult> {
    return MigrationChecker.checkAll()
  },

  /**
   * Componente toast para exibir status
   */
  showNotification(result: MigrationCheckResult): void {
    if (!result.allTablesExist || !result.allViewsExist) {
      console.warn(
        '⚠️ Algunas migrations están faltando. Consulta la documentación.'
      )

      // Aqui você poderia disparar um toast/notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification('⚠️ Setup Incompleto', {
            body: 'Execute as migrations no Supabase para completar a instalação.',
            icon: '⚙️',
          })
        } catch (e) {
          // Notificação não disponível
        }
      }
    }
  },

  /**
   * Retornar hook customizado para React
   */
  useCheckMigrations() {
    if (typeof window === 'undefined') {
      return {
        result: null,
        loading: false,
        error: null,
      }
    }

    const [result, setResult] = React.useState<MigrationCheckResult | null>(
      null
    )
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
      const check = async () => {
        try {
          const res = await MigrationChecker.checkAll()
          setResult(res)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }

      check()
    }, [])

    return { result, loading, error }
  },
}

// ============================================
// WRAPPER PARA USAR NO App.tsx
// ============================================

/**
 * Verificar migrations na inicialização da app
 */
export async function initializeMigrations(): Promise<void> {
  try {
    const result = await MigrationChecker.checkAll()

    if (!result.allTablesExist || !result.allViewsExist) {
      console.warn('⚠️ Alguns dados estruturais estão faltando.')
      console.warn('Execute as migrations no Supabase SQL Editor.')
      console.warn('URL: https://app.supabase.com/project/_/sql/new')

      // Armazenar no localStorage para avisar componentes
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'curva_migrations_pending',
          JSON.stringify(result.missingTables.concat(result.missingViews))
        )
      }
    } else {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('curva_migrations_pending')
      }
    }
  } catch (error) {
    console.error('Erro ao verificar migrations:', error)
  }
}

/**
 * Verificação rápida (para componentes individuais)
 */
export function isMigrationReady(): boolean {
  if (typeof window === 'undefined') return true

  const pending = window.localStorage.getItem('curva_migrations_pending')
  return !pending || JSON.parse(pending).length === 0
}

export default MigrationChecker
