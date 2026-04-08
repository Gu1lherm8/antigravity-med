const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Módulo 4: Executor Local (Integração com PC)
app.post('/execute-local-task', (req, res) => {
  const { action, path: targetPath, filename, content } = req.body;

  try {
    if (action === 'create_file') {
      // Resolve path against user's Home/Documents or local Antigravity folder
      // Let's use the local project root for safety in this demo, inside a "Sistema Estudos" folder
      const baseDir = path.join(__dirname, 'Estudos_Antigravity', targetPath || '');
      
      if (!fs.existsSync(baseDir)){
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const filePath = path.join(baseDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');

      console.log(`[EXECUTOR LOCAL] Arquivo criado com sucesso em: ${filePath}`);
      return res.status(200).json({ success: true, message: `Arquivo criado em ${filePath}` });
    }
    
    return res.status(400).json({ success: false, message: 'Ação não suportada' });
  } catch (err) {
    console.error('[EXECUTOR LOCAL] Erro:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CÉREBRO LOCAL: Servidor Executor rodando na porta ${PORT}`);
  console.log(`📡 Aguardando comandos da interface Antigravity Med...`);
});
