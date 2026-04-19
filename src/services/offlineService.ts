/**
 * offlineService.ts
 *
 * Serviço completo para modo offline com:
 * - IndexedDB para volumes grandes
 * - LocalStorage para fallback
 * - Fila de sincronização
 * - Retry automático
 * - Eventos de sincronização
 * - Compressão de dados
 */

import { supabase } from '../lib/supabase'

// ============================================
// TIPOS
// ============================================

export interface OfflineRecord {
  id: string
  type: 'error' | 'session' | 'review' | 'notification'
  action: 'insert' | 'update' | 'delete'
  table: string
  data: Record<string, any>
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  attempts: number
  lastError?: string
}

export interface SyncStats {
  pending: number
  syncing: number
  synced: number
  failed: number
  lastSyncTime?: Date
  nextRetry?: Date
}

export interface OfflineConfig {
  dbName: string
  version: number
  stores: {
    queue: string
    cache: string
    metadata: string
  }
  maxRetries: number
  retryDelayMs: number
  autoSyncIntervalMs: number
  compressionEnabled: boolean
}

export type SyncEventListener = (stats: SyncStats) => void

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEFAULT_CONFIG: OfflineConfig = {
  dbName: 'AntigravityMedOffline',
  version: 1,
  stores: {
    queue: 'sync_queue',
    cache: 'offline_cache',
    metadata: 'offline_metadata',
  },
  maxRetries: 5,
  retryDelayMs: 5000, // 5 segundos
  autoSyncIntervalMs: 30000, // 30 segundos
  compressionEnabled: true,
}

// ============================================
// OFFLINE SERVICE
// ============================================

class OfflineService {
  private db: IDBDatabase | null = null
  private config: OfflineConfig
  private isOnline: boolean = navigator.onLine
  private syncListeners: Set<SyncEventListener> = new Set()
  private syncInterval: NodeJS.Timeout | null = null
  private isSyncing: boolean = false

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeEventListeners()
  }

  /**
   * Inicializar: abrir IndexedDB e listeners
   */
  async initialize(): Promise<void> {
    try {
      await this.openDatabase()
      this.setupEventListeners()
      this.startAutoSync()

      console.log('✅ Offline Service inicializado')

      // Se já está online e há itens pending, sincronizar imediatamente
      if (this.isOnline) {
        await this.syncQueue()
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Offline Service:', error)
    }
  }

  /**
   * Abrir ou criar IndexedDB
   */
  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Criar stores se não existirem
        if (!db.objectStoreNames.contains(this.config.stores.queue)) {
          const queueStore = db.createObjectStore(this.config.stores.queue, {
            keyPath: 'id',
          })
          queueStore.createIndex('status', 'status', { unique: false })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(this.config.stores.cache)) {
          db.createObjectStore(this.config.stores.cache, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(this.config.stores.metadata)) {
          db.createObjectStore(this.config.stores.metadata, { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * Setup de event listeners (online/offline)
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('🟢 Voltou online! Sincronizando...')
      this.syncQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('🔴 Perdeu conexão. Modo offline ativado.')
    })
  }

  /**
   * Inicializar listeners do constructor
   */
  private initializeEventListeners(): void {
    // Hook para mudanças de estado online/offline
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
    }
  }

  /**
   * Iniciar sincronização automática periódica
   */
  private startAutoSync(): void {
    if (this.syncInterval) clearInterval(this.syncInterval)

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        await this.syncQueue()
      }
    }, this.config.autoSyncIntervalMs)
  }

  /**
   * Parar sincronização automática
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Adicionar registro à fila de sincronização
   */
  async enqueue(
    type: OfflineRecord['type'],
    action: OfflineRecord['action'],
    table: string,
    data: Record<string, any>
  ): Promise<string> {
    if (!this.db) throw new Error('IndexedDB não foi inicializado')

    const record: OfflineRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      table,
      data,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readwrite'
      )
      const store = transaction.objectStore(this.config.stores.queue)
      const request = store.add(record)

      request.onsuccess = () => {
        console.log(`📝 Enfileirado: ${type}/${action} em ${table}`)
        resolve(record.id)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Alias de compatibilidade para o Caderno de Erros e componentes legados.
   * Mapeia os argumentos para o novo formato do motor offline.
   */
  async enqueueTask(table: string, data: Record<string, any>, type: OfflineRecord['type'] = 'error'): Promise<string> {
    return this.enqueue(type, 'insert', table, data);
  }

  /**
   * Sincronizar fila com Supabase
   */
  async syncQueue(): Promise<SyncStats> {
    if (this.isSyncing) {
      return this.getStats()
    }

    this.isSyncing = true

    try {
      const records = await this.getPendingRecords()

      if (records.length === 0) {
        this.isSyncing = false
        this.notifyListeners()
        return this.getStats()
      }

      console.log(`🔄 Sincronizando ${records.length} registros...`)

      // Processar cada registro
      for (const record of records) {
        await this.syncRecord(record)
      }

      console.log('✅ Sincronização concluída!')
      this.notifyListeners()
    } catch (error) {
      console.error('❌ Erro durante sincronização:', error)
    } finally {
      this.isSyncing = false
    }

    return this.getStats()
  }

  /**
   * Sincronizar um único registro
   */
  private async syncRecord(record: OfflineRecord): Promise<void> {
    try {
      // Marcar como syncing
      await this.updateRecordStatus(record.id, 'syncing')

      // Executar ação no Supabase
      let response

      switch (record.action) {
        case 'insert':
          response = await supabase
            .from(record.table)
            .insert([record.data])
            .select()
          break

        case 'update':
          const { id, ...updateData } = record.data
          response = await supabase
            .from(record.table)
            .update(updateData)
            .eq('id', id)
            .select()
          break

        case 'delete':
          response = await supabase
            .from(record.table)
            .delete()
            .eq('id', record.data.id)
          break
      }

      if (response.error) throw response.error

      // Marcar como synced
      await this.updateRecordStatus(record.id, 'synced')
      console.log(`✅ Sincronizado: ${record.id}`)
    } catch (error: any) {
      record.attempts++

      if (record.attempts >= this.config.maxRetries) {
        // Máximo de tentativas atingido
        await this.updateRecordStatus(
          record.id,
          'failed',
          error.message || 'Erro desconhecido'
        )
        console.error(
          `❌ Falha permanente em ${record.id} após ${record.attempts} tentativas`
        )
      } else {
        // Voltar ao pending para tentar novamente
        await this.updateRecordStatus(record.id, 'pending')
        console.warn(`⚠️ Retry ${record.attempts}/${this.config.maxRetries} para ${record.id}`)
      }
    }
  }

  /**
   * Obter registros pendentes de sincronização
   */
  private async getPendingRecords(): Promise<OfflineRecord[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readonly'
      )
      const store = transaction.objectStore(this.config.stores.queue)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        resolve(request.result as OfflineRecord[])
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Atualizar status de um registro
   */
  private async updateRecordStatus(
    id: string,
    status: OfflineRecord['status'],
    error?: string
  ): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readwrite'
      )
      const store = transaction.objectStore(this.config.stores.queue)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result as OfflineRecord
        record.status = status
        if (error) record.lastError = error

        const updateRequest = store.put(record)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(updateRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Obter estatísticas de sincronização
   */
  async getStats(): Promise<SyncStats> {
    if (!this.db) {
      return {
        pending: 0,
        syncing: 0,
        synced: 0,
        failed: 0,
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readonly'
      )
      const store = transaction.objectStore(this.config.stores.queue)

      const pending = store.index('status').count('pending')
      const syncing = store.index('status').count('syncing')
      const synced = store.index('status').count('synced')
      const failed = store.index('status').count('failed')

      let completed = 0
      let total = 4

      const checkCompletion = () => {
        completed++
        if (completed === total) {
          resolve({
            pending: (pending.result as number) || 0,
            syncing: (syncing.result as number) || 0,
            synced: (synced.result as number) || 0,
            failed: (failed.result as number) || 0,
            lastSyncTime: new Date(),
          })
        }
      }

      pending.onsuccess = checkCompletion
      syncing.onsuccess = checkCompletion
      synced.onsuccess = checkCompletion
      failed.onsuccess = checkCompletion

      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Deletar um registro (limpar cache)
   */
  async deleteRecord(id: string): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readwrite'
      )
      const store = transaction.objectStore(this.config.stores.queue)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Limpar todos os registros (reset)
   */
  async clearQueue(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.stores.queue],
        'readwrite'
      )
      const store = transaction.objectStore(this.config.stores.queue)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ Fila de sincronização limpa')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Registrar listener para mudanças de status
   */
  onSyncStatusChange(listener: SyncEventListener): () => void {
    this.syncListeners.add(listener)

    // Retornar função para desinscrever
    return () => {
      this.syncListeners.delete(listener)
    }
  }

  /**
   * Notificar todos os listeners
   */
  private async notifyListeners(): Promise<void> {
    const stats = await this.getStats()

    this.syncListeners.forEach((listener) => {
      try {
        listener(stats)
      } catch (error) {
        console.error('Erro ao notificar listener:', error)
      }
    })
  }

  /**
   * Obter status online/offline
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Forçar sincronização (manual)
   */
  async forceSyncNow(): Promise<SyncStats> {
    return this.syncQueue()
  }

  /**
   * Limpar banco de dados completamente (para testes)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName)

      request.onsuccess = () => {
        this.db = null
        console.log('🔄 Banco de dados removido')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Fechar database e limpar
   */
  destroy(): void {
    this.stopAutoSync()
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.syncListeners.clear()
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let offlineServiceInstance: OfflineService | null = null

/**
 * Obter ou criar instância única do serviço
 */
export function getOfflineService(): OfflineService {
  if (!offlineServiceInstance) {
    offlineServiceInstance = new OfflineService()
  }
  return offlineServiceInstance
}

/**
 * Inicializar o serviço (deve ser chamado uma vez na app)
 */
export async function initializeOfflineService(): Promise<void> {
  const service = getOfflineService()
  await service.initialize()
}

/**
 * Exportar tipos e classe para uso
 */
export { OfflineService }
export const offlineService = getOfflineService()
export type { OfflineRecord, SyncStats, OfflineConfig, SyncEventListener }
