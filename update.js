const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const tStart = content.indexOf('<footer className="mt-8 flex justify-end">');
if (tStart === -1) {
  console.log("Could not find footer start");
  process.exit(1);
}

const tEndStr = '</footer>';
const tEnd = content.indexOf(tEndStr, tStart) + tEndStr.length;
const target = content.substring(tStart, tEnd);

const replacement = `<footer className="mt-8 flex justify-end">
          <button 
            disabled={!selectedOption || isSubmitting}
            onClick={handleAnswer}
            className="group btn-primary w-full md:w-auto px-12 py-4 text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
          >
            <span className={\`flex items-center gap-2 \${isSubmitting ? '' : 'hidden'}\`}>
              <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
            </span>
            <span className={\`flex items-center gap-2 \${isSubmitting ? 'hidden' : ''}\`}>
               Confirmar Diagnóstico 
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </footer>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Replaced footer button successfully!");
