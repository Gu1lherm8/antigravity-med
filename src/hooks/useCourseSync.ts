// ==========================================
// hooks/useCourseSync.ts
// Gerencia a sincronização com o Moodle,
// exibindo progresso em etapas visuais.
// ==========================================

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SyncPhase = 'idle' | 'connecting' | 'fetching' | 'analyzing' | 'planning' | 'done' | 'error';

export interface SyncState {
  phase: SyncPhase;
  message: string;
  progress: number; // 0-100
  lastSynced: string | null;
}

const PHASE_CONFIG: Record<SyncPhase, { message: string; progress: number }> = {
  idle:       { message: '',                                   progress: 0   },
  connecting: { message: 'Conectando ao Moodle...',           progress: 20  },
  fetching:   { message: 'Baixando suas aulas e notas...',    progress: 45  },
  analyzing:  { message: 'Detectando pontos frágeis...',      progress: 70  },
  planning:   { message: 'Montando seu plano inteligente...', progress: 90  },
  done:       { message: 'Tudo atualizado! 🎉',               progress: 100 },
  error:      { message: 'Falha na sincronização.',           progress: 0   },
};

export function useCourseSync(userId: string) {
  const [sync, setSync] = useState<SyncState>({
    phase: 'idle',
    message: '',
    progress: 0,
    lastSynced: null,
  });

  // Helper: avança para uma fase
  const advance = (phase: SyncPhase) => {
    setSync(prev => ({
      ...prev,
      phase,
      message: PHASE_CONFIG[phase].message,
      progress: PHASE_CONFIG[phase].progress,
    }));
  };

  // ── Sincronização completa ────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!userId || sync.phase !== 'idle') return;

    advance('connecting');
    await delay(600);

    try {
      advance('fetching');
      // Chama a API que faz o sync real com o Moodle
      const res = await fetch('/api/secretary/sync-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      advance('analyzing');
      await delay(800);

      // Chama o detector de gaps após sincronizar
      await fetch('/api/secretary/detect-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      advance('planning');
      await delay(600);

      // Salva o horário da última sincronização
      const now = new Date().toISOString();
      await supabase
        .from('course_sync_settings')
        .update({ last_synced_at: now })
        .eq('user_id', userId);

      const timeLabel = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      setSync({
        phase: 'done',
        message: PHASE_CONFIG.done.message,
        progress: 100,
        lastSynced: timeLabel,
      });

      // Voltar ao idle após 3s
      await delay(3000);
      setSync(prev => ({ ...prev, phase: 'idle', message: '' }));

      return true; // Sucesso — chame reload no componente

    } catch (err: any) {
      setSync(prev => ({
        ...prev,
        phase: 'error',
        message: err.message || 'Erro desconhecido.',
        progress: 0,
      }));
      await delay(3000);
      setSync(prev => ({ ...prev, phase: 'idle', message: '' }));
      return false;
    }
  }, [userId, sync.phase]);

  return {
    sync,
    syncNow,
    isSyncing: sync.phase !== 'idle' && sync.phase !== 'done' && sync.phase !== 'error',
  };
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}
