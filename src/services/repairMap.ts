import { supabase } from '../lib/supabase';

/**
 * Script de Diagnóstico e Reparo do Mapa Neural
 * Este script força a sincronização entre o Caderno de Erros e o Mapa Neural.
 */
export async function repairKnowledgeMap() {
  console.log('🚀 Iniciando Reparo do Mapa Neural...');
  
  const userId = 'manual_user';

  try {
    // 1. Buscar todos os erros de forma global (resgate)
    const { data: errors, error: errLoad } = await supabase
      .from('error_notebook')
      .select('*');

    if (errLoad) throw errLoad;
    
    if (!errors || errors.length === 0) {
      console.log('ℹ️ Nenhum erro encontrado no sistema.');
      return;
    }

    console.log(`📊 Encontrados ${errors.length} erros. Sincronizando...`);

    for (const error of errors) {
      const topicName = error.topic || 'Tópico Geral';
      const subjectName = error.discipline || 'Geral';

      // 2. Garantir que o tópico exista
      let { data: topic } = await supabase
        .from('topics')
        .select('id')
        .eq('user_id', userId)
        .eq('name', topicName)
        .maybeSingle();

      let topicId;
      if (!topic) {
        const { data: newTopic } = await supabase
          .from('topics')
          .insert({
            user_id: userId,
            name: topicName,
            subject: subjectName,
            status: 'learning',
            accuracy: 0,
            enem_frequency: 3,
            last_studied: new Date()
          })
          .select()
          .single();
        
        if (newTopic) topicId = newTopic.id;
      } else {
        topicId = topic.id;
      }

      // 3. Vincular o erro ao tópico na rede neural
      if (topicId) {
        await supabase.from('topic_errors').upsert({
          user_id: userId,
          topic_id: topicId,
          error_type: 'knowledge',
          description: error.error_reason || 'Sincronizado',
          error_date: error.created_at || new Date()
        });
      }
    }

    console.log('✅ Reparo concluído!');
    return true;
  } catch (e) {
    console.error('❌ Erro no reparo:', e);
    return false;
  }
}
