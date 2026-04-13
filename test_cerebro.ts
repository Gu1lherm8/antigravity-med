import { cerebroEngine, cerebroConfigService } from './src/services/cerebroService'

async function run() {
  console.log("Teste Cérebro: Obtendo as configurações...");
  try {
    // Try to get or mock settings
    const settings = await cerebroConfigService.getSettings();
    console.log("Configurações atuais:", settings);
    
    console.log("Calculando o plano do dia...");
    const plan = await cerebroEngine.generateDailyPlan();
    console.log("\nPlano do Dia Gerado (Missões):");
    console.table(plan.map(p => ({
       Subject: p.subject_name,
       Frente: p.front,
       Tipo: p.type,
       Tempo: p.duration_minutes + ' min',
       Prioridade: p.priority,
       Motivo: p.reason
    })));
  } catch(e) {
    console.error("Erro:", e.message);
  }
}

run();
