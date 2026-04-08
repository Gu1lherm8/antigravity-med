const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacementStr = `<button 
              disabled={!selectedOption || isSubmitting}
              onClick={handleAnswer}
              className="btn-primary py-5 px-12 group flex items-center justify-center gap-3 relative"
            >
              <div className={\`flex items-center gap-2 justify-center transition-opacity \${isSubmitting ? 'opacity-100' : 'opacity-0 absolute'}\`}>
                <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
              </div>
              <div className={\`flex items-center gap-2 justify-center transition-opacity \${isSubmitting ? 'opacity-0 absolute' : 'opacity-100'}\`}>
                Confirmar Diagnóstico 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>`;

content = content.replace(/<button[^>]*onClick=\{handleAnswer\}[^>]*>[\s\S]*?<\/button>/, replacementStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Replaced handleAnswer button!");
