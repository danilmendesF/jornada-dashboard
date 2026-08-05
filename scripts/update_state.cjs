/**
 * 🔄 RAG STATE UPDATER — Jornada Dashboard
 * Scans `js/` modules and auto-updates `.ai/PROJECT_INDEX.md` metadata.
 * Run with: node scripts/update_state.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Atualizando Estado da Aplicação no Índice RAG (.ai/PROJECT_INDEX.md)...\n');

const jsDir = path.join(__dirname, '..', 'js');
const indexFile = path.join(__dirname, '..', '.ai', 'PROJECT_INDEX.md');

if (!fs.existsSync(jsDir) || !fs.existsSync(indexFile)) {
  console.error('❌ Diretórios ou arquivo de índice não encontrados.');
  process.exit(1);
}

const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
let summaryTable = '| Arquivo Módulo | Linhas Aprox. | Status | Funções Exportadas em window |\n|---|---|---|---|\n';

files.forEach(file => {
  const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
  const lines = content.split('\n').length;
  
  const fnMatches = content.match(/window\.([a-zA-Z0-9_]+)\s*=/g) || [];
  const fnNames = fnMatches.map(m => m.replace('window.', '').replace('=', '').trim()).slice(0, 5).join(', ');

  summaryTable += `| \`js/${file}\` | ~${lines} | 🟢 Ativo | \`${fnNames}${fnMatches.length > 5 ? '...' : ''}\` |\n`;
});

let indexContent = fs.readFileSync(indexFile, 'utf8');

// Replace or append updated timestamp & metrics
const timestampHeader = `> **Última Atualização Automática de Estado**: ${new Date().toISOString()} (Total Módulos: ${files.length})\n\n`;

if (indexContent.includes('## 📂 ESTRUTURA DE ARQUIVOS E MÓDULOS')) {
  const parts = indexContent.split('## 📂 ESTRUTURA DE ARQUIVOS E MÓDULOS');
  indexContent = parts[0] + timestampHeader + '## 📂 ESTRUTURA DE ARQUIVOS E MÓDULOS\n\n' + summaryTable + '\n' + parts[1].split('---')[1];
}

fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Base RAG atualizada com sucesso com a contagem atual dos módulos!');
