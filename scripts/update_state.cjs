/**
 * 🔄 RAG STATE UPDATER v2 — Jornada Dashboard
 * Scans js/ modules AND critical functions in manager.js/app.js.
 * Auto-updates .ai/PROJECT_INDEX.md with a clean, single-timestamp header.
 * Run with: node scripts/update_state.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Atualizando Estado da Aplicação no Índice RAG (.ai/PROJECT_INDEX.md)...\n');

const rootDir = path.resolve(__dirname, '..');
const jsDir = path.join(rootDir, 'js');
const indexFile = path.join(rootDir, '.ai', 'PROJECT_INDEX.md');

if (!fs.existsSync(jsDir) || !fs.existsSync(indexFile)) {
  console.error('❌ Diretórios ou arquivo de índice não encontrados.');
  process.exit(1);
}

// ── 1. INDEX MODULAR JS/ FILES ─────────────────────────────────────────────
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
let modulesTable = '| Arquivo Módulo | Linhas | Status | window.* Exports (primeiros 5) |\n|---|---|---|---|\n';

files.forEach(file => {
  const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
  const lines = content.split('\n').length;
  const fnMatches = content.match(/window\.([a-zA-Z0-9_]+)\s*=/g) || [];
  const fnNames = fnMatches
    .map(m => m.replace('window.', '').replace('=', '').trim())
    .slice(0, 5)
    .join(', ');
  const overLimit = lines > 350 ? '⚠️ OVER LIMIT' : '🟢 OK';
  modulesTable += `| \`js/${file}\` | ${lines} | ${overLimit} | \`${fnNames}${fnMatches.length > 5 ? '...' : ''}\` |\n`;
});

// ── 2. INDEX CRITICAL FUNCTIONS IN MONOLITH FILES ─────────────────────────
const monolithFiles = ['manager.js', 'app.js'];
let monolithSection = '';

monolithFiles.forEach(monolithFile => {
  const monolithPath = path.join(rootDir, monolithFile);
  if (!fs.existsSync(monolithPath)) return;

  const content = fs.readFileSync(monolithPath, 'utf8');
  const lines = content.split('\n');

  // Extract top-level function declarations and key window.* assignments
  const criticalFunctions = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Match: function functionName(, window.functionName =, async function
    const fnMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/) ||
                    trimmed.match(/^window\.([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?function/) ||
                    trimmed.match(/^window\.([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);
    if (fnMatch) {
      criticalFunctions.push({ name: fnMatch[1], line: idx + 1 });
    }
  });

  if (criticalFunctions.length > 0) {
    monolithSection += `\n### 📌 \`${monolithFile}\` — Funções Críticas (${lines.length} linhas total)\n\n`;
    monolithSection += '| Função | Linha Aprox. |\n|---|---|\n';
    criticalFunctions.slice(0, 30).forEach(fn => {
      monolithSection += `| \`${fn.name}()\` | L${fn.line} |\n`;
    });
    if (criticalFunctions.length > 30) {
      monolithSection += `| *(+${criticalFunctions.length - 30} funções adicionais)* | — |\n`;
    }
  }
});

// ── 3. GET LATEST GIT COMMIT HASH ─────────────────────────────────────────
let latestCommit = 'N/A';
try {
  const { execSync } = require('child_process');
  // Try the scratch dir first, fall back to the production repo
  const gitDirs = [rootDir, path.join('C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard')];
  for (const dir of gitDirs) {
    try {
      const result = execSync('git rev-parse --short HEAD', { cwd: dir, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      if (result) { latestCommit = result; break; }
    } catch (e) {}
  }
} catch (e) {}

// ── 4. BUILD UPDATED INDEX CONTENT ────────────────────────────────────────
const timestamp = new Date().toISOString();
const totalModules = files.length;

const newHeader = `# 🗺️ RAG PROJECT INDEX — Jornada Dashboard

Este índice permite que assistentes de IA localizem instantaneamente arquivos, funções e elementos do DOM sem ler a base de código inteira, reduzindo o uso de tokens em até 95%.

> **Última Atualização**: ${timestamp} | **Total Módulos js/**: ${totalModules} | **Commit**: \`${latestCommit}\`

---

## 📂 MÓDULOS MODULARIZADOS EM \`js/\`

${modulesTable}

---

## 🏗️ FUNÇÕES CRÍTICAS NOS MONOLITOS (manager.js / app.js)

> ⚠️ NUNCA leia estes arquivos inteiros. Use a linha indicada abaixo para ir diretamente à função.

${monolithSection}

---

## 🧭 REGRA DE LEITURA RAG (PARA A IA)

1. **Sempre consulte este índice ANTES de abrir qualquer arquivo.**
2. **Para funções em \`js/*\`**: Abra apenas o módulo específico (todos < 350 linhas).
3. **Para funções em \`manager.js\` ou \`app.js\`**: Use \`view_file\` com \`StartLine/EndLine\` para a linha indicada acima ± 30 linhas.
4. **Para regras de negócio** (mirror, stats, storage): Consulte \`.ai/ARCHITECTURE.md\`.
5. **Para decisões de design passadas**: Consulte \`.ai/DECISION_LOG.md\` ANTES de propor mudanças arquiteturais.
`;

fs.writeFileSync(indexFile, newHeader, 'utf8');
console.log(`✅ Base RAG atualizada: ${totalModules} módulos indexados | Commit: ${latestCommit}`);
console.log(`✅ Funções críticas de manager.js e app.js indexadas no RAG!`);
