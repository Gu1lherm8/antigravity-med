// ============================================================
// services/checklistService.ts
// Serviço de sincronização do Checklist ENEM com Supabase
// Estratégia: LocalStorage como cache + Supabase como fonte de verdade
// ============================================================

import { supabase } from '../lib/supabase';

const LOCAL_KEY = 'ag-enem-checklist';

export const checklistService = {

  /**
   * Carrega os itens marcados.
   * Tenta primeiro do Supabase. Se falhar, usa o cache local.
   */
  async loadCheckedItems(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('enem_checklist_progress')
        .select('item_key')
        .eq('checked', true);

      if (error) throw error;

      const items = (data || []).map(row => row.item_key);

      // Atualiza o cache local como backup
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));

      return items;
    } catch (err) {
      console.warn('⚠️ Supabase offline, usando cache local:', err);
      const cached = localStorage.getItem(LOCAL_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Marca um item como "estudado" (checked = true).
   * Usa UPSERT para criar ou atualizar sem conflito.
   */
  async checkItem(itemKey: string): Promise<void> {
    // 1. Atualiza cache local imediatamente (otimismo)
    const current = this._getLocal();
    if (!current.includes(itemKey)) {
      current.push(itemKey);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(current));
    }

    // 2. Sincroniza com Supabase
    try {
      const { error } = await supabase
        .from('enem_checklist_progress')
        .upsert(
          { item_key: itemKey, checked: true, checked_at: new Date().toISOString() },
          { onConflict: 'item_key' }
        );

      if (error) throw error;
    } catch (err) {
      console.error('❌ Erro ao salvar check no Supabase:', err);
    }
  },

  /**
   * Desmarca um item (checked = false e remove do array).
   */
  async uncheckItem(itemKey: string): Promise<void> {
    // 1. Atualiza cache local imediatamente
    const current = this._getLocal().filter(k => k !== itemKey);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(current));

    // 2. Remove do Supabase (delete é mais limpo que update checked=false)
    try {
      const { error } = await supabase
        .from('enem_checklist_progress')
        .delete()
        .eq('item_key', itemKey);

      if (error) throw error;
    } catch (err) {
      console.error('❌ Erro ao remover check no Supabase:', err);
    }
  },

  /**
   * Reseta todo o checklist (remove todos os itens).
   */
  async resetAll(): Promise<void> {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([]));

    try {
      const { error } = await supabase
        .from('enem_checklist_progress')
        .delete()
        .neq('item_key', '__never_match__'); // Deleta todos os registros

      if (error) throw error;
      console.log('🗑️ Checklist resetado no Supabase.');
    } catch (err) {
      console.error('❌ Erro ao resetar checklist no Supabase:', err);
    }
  },

  /**
   * Sincroniza itens do LocalStorage para o Supabase (útil na primeira vez).
   * Isso garante que dados antigos salvos localmente sejam enviados ao banco.
   */
  async syncLocalToSupabase(): Promise<void> {
    const localItems = this._getLocal();
    if (localItems.length === 0) return;

    try {
      // Verifica o que já existe no Supabase
      const { data: existing } = await supabase
        .from('enem_checklist_progress')
        .select('item_key')
        .eq('checked', true);

      const existingKeys = new Set((existing || []).map(r => r.item_key));
      const toInsert = localItems
        .filter(key => !existingKeys.has(key))
        .map(key => ({ item_key: key, checked: true, checked_at: new Date().toISOString() }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('enem_checklist_progress')
          .upsert(toInsert, { onConflict: 'item_key' });

        if (error) throw error;
        console.log(`✅ Sincronizados ${toInsert.length} itens locais para o Supabase.`);
      }
    } catch (err) {
      console.error('❌ Erro na sincronização local → Supabase:', err);
    }
  },

  // Helper interno para ler o cache local
  _getLocal(): string[] {
    const cached = localStorage.getItem(LOCAL_KEY);
    return cached ? JSON.parse(cached) : [];
  }
};
