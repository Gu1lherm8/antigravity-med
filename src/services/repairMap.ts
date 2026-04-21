import { supabase } from '../lib/supabase';

/**
 * Script de Reparo do Mapa Neural
 * Pega todos os erros do caderno do usuário autenticado
 * e cria os tópicos correspondentes no Mapa Neural.
 */
export async function repairKnowledgeMap() {
  console.log('🚀 Iniciando Reparo do Mapa Neural...');

  // Pegar o usuário autenticado REAL
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Nenhum usuário autenticado encontrado.');
    return false;
  }

  const userId = user.id;
  console.log('👤 Usuário:', userId);

  try {
    // 1. Buscar todos os erros do caderno deste usuário
    const { data: errors, error: errLoad } = await supabase
      .from('error_notebook')
      .select('*')
      .eq('user_id', userId);

    if (errLoad) {
      console.error('❌ Erro ao buscar erros:', errLoad);
      throw errLoad;
    }

    if (!errors || errors.length === 0) {
      console.log('ℹ️ Nenhum erro encontrado no caderno deste usuário.');
      return false;
    }

    console.log(`📊 Encontrados ${errors.length} erros. Sincronizando tópicos...`);

    for (const error of errors) {
      const topicName = error.topic || 'Tópico Geral';
      const subjectName = error.discipline || 'Geral';

      // 2. Verificar se tópico já existe
      const { data: topic } = await supabase
        .from('topics')
        .select('id, errors_count')
        .eq('user_id', userId)
        .eq('name', topicName)
        .maybeSingle();

      let topicId;
      if (!topic) {
        // Criar tópico
        const { data: newTopic, error: createErr } = await supabase
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

        if (createErr) {
          console.error('❌ Erro ao criar tópico:', topicName, createErr);
          continue;
        }
        if (newTopic) topicId = newTopic.id;
      } else {
        topicId = topic.id;
        // Atualizar contagem
        await supabase
          .from('topics')
          .update({
            errors_count: (topic.errors_count || 0) + 1,
            last_studied: new Date()
          })
          .eq('id', topicId);
      }

      console.log(`✅ Tópico "${topicName}" sincronizado (ID: ${topicId})`);
    }

    console.log('🎉 Reparo concluído com sucesso!');
    return true;
  } catch (e) {
    console.error('❌ Erro no reparo:', e);
    return false;
  }
}
