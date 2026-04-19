/**
 * eventBus.ts
 * Barramento de eventos central para coordenação real-time entre componentes.
 */

type EventCallback = (data?: any) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  /**
   * Inscreve um componente para escutar um evento.
   * Retorna uma função de limpeza (unsubscribe).
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Dispara um evento para todos os inscritos.
   */
  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

// Singleton para a aplicação toda
export const eventBus = new EventBus();

// Nomes de eventos padronizados
export const APP_EVENTS = {
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  SCHEDULE_REGENERATED: 'SCHEDULE_REGENERATED',
  CRITICAL_ERROR_INJECTED: 'CRITICAL_ERROR_INJECTED',
  DATABASE_SYNCED: 'DATABASE_SYNCED',
  CHANGE_TAB: 'CHANGE_TAB'
} as const;
