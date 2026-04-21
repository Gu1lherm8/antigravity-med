import { supabase } from '../lib/supabase';

/**
 * Script de Diagnóstico e Reparo do Mapa Neural
 * Este script força a sincronização entre o Caderno de Erros e o Mapa Neural
 * ignorando falhas de autenticação e garantindo que o 'manual_user' tenha dados.
 */
export async function repairKnowledgeMap() {
  console.log('🚀 Iniciando Reparo do Mapa Neural...');
  
  const userId = 'manual_user';

  try {
    // 1. Buscar todos os erros do Caderno de Bula
    const { data: errors, error: errLoad } = await supabase
      .from('error_notebook')
      .select('*');

    if (errLoad) throw errLoad;
    if (!errors || errors.length === 0) {
      console.log('ℹ️ Nenhum erro encontrado no caderno para sincronizar.');
      return;
    }

    console.log(`📊 Encontrados ${errors.length} erros. Sincronizando tópicos...`);

    for (const error of errors) {
      if (!error.topic) continue;

      // 2. Tentar inserir/atualizar o tópico
      const { data: topic } = await supabase
        .from('topics')
        .select('id')
        .eq('user_id', userId)
        .eq('name', error.topic)
        .maybeSingle();

      let topicId;
      if (!topic) {
        const { data: newTopic, error: errIns } = await supabase
          .from('topics')
          .insert({
            user_id: userId,
            name: error.topic,
            subject: error.discipline || 'Geral',
            status: 'learning',
            accuracy: 0,
            enem_frequency: 3,
            last_studied: new Date()
          })
          .select()
          .single();
        
        if (newTopic) topicId = newTopic.id;
        if (errIns) console.error('Erro ao criar tópico:', errIns);
      } else {
        topicId = topic.id;
      }

      // 3. Garantir que o erro esteja na tabela de erros do mapa
      if (topicId) {
        await supabase.from('topic_errors').upsert({
          user_id: userId,
          topic_id: topicId,
          error_type: 'knowledge',
          description: error.error_reason || 'Sincronizado automaticamente',
          error_date: error.created_at || new Date()
        }, { onConflict: 'topic_id, description' });
      }
    }

    console.log('✅ Sincronização concluída com sucesso!');
    return true;
  } catch (e) {
    console.error('❌ Falha crítica no reparo:', e);
    return false;
  }
}
