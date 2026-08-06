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

// ── 5. GENERATE .ai/SESSION_CONTEXT.md ────────────────────────────────────
const sessionFile = path.join(rootDir, '.ai', 'SESSION_CONTEXT.md');
const { execSync: exec2 } = require('child_process');

function tryGit(cmd) {
  const gitDirs = [rootDir, 'C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard'];
  for (const dir of gitDirs) {
    try { return exec2(cmd, { cwd: dir, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
  }
  return '';
}

const recentCommits = tryGit('git log --oneline -5') || '(não disponível)';
const recentFiles   = tryGit('git diff --name-only HEAD~1 HEAD')
  .split('\n').filter(Boolean).map(f => `- \`${f}\``).join('\n') || '- (não disponível)';

// Scan all specs for status
const specsDir = path.join(rootDir, '.ai', 'specs');
let specsTable = '| Spec | Status |\n|---|---|\n';
if (fs.existsSync(specsDir)) {
  fs.readdirSync(specsDir)
    .filter(f => f.startsWith('SPEC_') && f.endsWith('.md'))
    .sort()
    .forEach(specFile => {
      const raw = fs.readFileSync(path.join(specsDir, specFile), 'utf8');
      const m = raw.match(/\*\*Status\*\*:\s*(.+)/);
      specsTable += `| \`${specFile}\` | ${m ? m[1].trim() : '—'} |\n`;
    });
}

const sessionContent = [
  '# 🧭 SESSION CONTEXT — Jornada Dashboard',
  '',
  '> **Gerado automaticamente por `node scripts/update_state.cjs`.**',
  '> **Leia como PRIMEIRO PASSO em qualquer nova sessão ou conversa.**',
  `> Gerado em: ${new Date().toISOString()} | Commit: \`${latestCommit}\``,
  '',
  '---',
  '',
  '## 🚀 ESTADO ATUAL DO PROJETO',
  '',
  `- **Último commit**: \`${latestCommit}\``,
  '- **Produção**: https://jornadatcgteam.com.br (Vercel auto-deploy)',
  '- **Repositório**: https://github.com/danilmendesF/jornada-dashboard',
  '',
  '### 5 Commits Mais Recentes:',
  '```',
  recentCommits,
  '```',
  '',
  '### Arquivos Modificados no Último Commit:',
  recentFiles,
  '',
  '---',
  '',
  '## 📋 STATUS DAS SPECs',
  '',
  specsTable,
  '',
  '---',
  '',
  '## 🛠️ CONTEXTO TÉCNICO ESSENCIAL',
  '',
  '### Stack:',
  '- Frontend: HTML + Vanilla JS + CSS (sem frameworks)',
  '- Bundle: `dist/app.min.js` (IIFE) + `dist/style.min.css`',
  '- Backend: Vercel Serverless (`api/auth.js`, `api/sync.js`)',
  '- Banco: Redis KV (Upstash) | Auth: JWT + PBKDF2',
  '',
  '### Ordem de Leitura Obrigatória ANTES de qualquer tarefa:',
  '1. Este arquivo `.ai/SESSION_CONTEXT.md` ✅',
  '2. `.ai/PROJECT_INDEX.md` — mapa de módulos + linha exata das funções críticas',
  '3. `.ai/DECISION_LOG.md` — decisões que NÃO devem ser revertidas',
  '4. `.agents/rules/agent_personas.md` — persona correta para o slash command',
  '5. `.ai/ARCHITECTURE.md` — apenas se a tarefa envolver stats/mirror/storage/sync',
  '',
  '### ⚠️ Regra Anti-Bug #1 (causa do bug SPEC_021):',
  '> Antes de criar/editar qualquer função, verifique duplicatas:',
  '> `Select-String -Path "*.js","js/*.js" -Pattern "function nomeDaFuncao"`',
  '> Funções duplicadas no IIFE bundle são hoisted — a última no `jsOrder` vence silenciosamente.',
  '',
  '---',
  '',
  '## 📈 PESO DO CONTEXTO (RAG TOKEN TRACKER)',
  '',
  '> Monitoramento de consumo de tokens para a IA (Heurística: ~4 chars / token)',
  '',
  '| Arquivo de Contexto | Caracteres | Tokens Estimados |',
  '|---|---|---|',
];

// Calculate Context Weight
let totalChars = 0;
const ragFiles = [
  { path: '.ai/SESSION_CONTEXT.md', name: 'SESSION_CONTEXT.md' },
  { path: '.ai/PROJECT_INDEX.md', name: 'PROJECT_INDEX.md' },
  { path: '.ai/DECISION_LOG.md', name: 'DECISION_LOG.md' },
  { path: '.ai/ARCHITECTURE.md', name: 'ARCHITECTURE.md' },
  { path: '.agents/rules/agent_personas.md', name: 'agent_personas.md' }
];

ragFiles.forEach(f => {
  const fullPath = path.join(rootDir, ...f.path.split('/'));
  if (fs.existsSync(fullPath)) {
    // Avoid recursively counting the session file before it's saved
    let chars = 0;
    if (f.name === 'SESSION_CONTEXT.md') {
      chars = sessionContent.join('\n').length;
    } else {
      chars = fs.readFileSync(fullPath, 'utf8').length;
    }
    const tokens = Math.round(chars / 4);
    totalChars += chars;
    sessionContent.push(`| \`${f.name}\` | ${chars} | ~${tokens} tks |`);
  }
});

const totalTokens = Math.round(totalChars / 4);
sessionContent.push(`| **TOTAL BASE RAG** | **${totalChars}** | **~${totalTokens} tks** |`);

sessionContent.push(
  '',
  '*(Nota: O GPT-4 / Gemini-1.5 suportam 128k-1M+ tokens. Um RAG base ideal consome < 5.000 tokens).*',
  '',
  '---',
  '',
  '## ⚡ COMANDOS RÁPIDOS',
  '',
  '```powershell',
  '# Validação completa (61 testes)',
  'node scripts/validate.cjs; node scripts/validate_auth.cjs',
  '',
  '# Atualizar versão (SemVer) no index.html e package.json',
  'node scripts/bump_version.cjs',
  '',
  '# Recompilar bundle',
  'node scripts/build_bundle.cjs',
  '',
  '# Atualizar SESSION_CONTEXT + PROJECT_INDEX',
  'node scripts/update_state.cjs',
  '',
  '# Mirror + Deploy (após aprovação)',
  'robocopy "C:\\Users\\danil\\.gemini\\antigravity\\scratch\\jornada-dashboard" "C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard" /E /NDL /NFL /NJH /NJS; exit 0',
  'git -C "C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard" add .; git -C "C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard" commit -m "..."; git -C "C:\\Users\\danil\\OneDrive\\Documentos\\jornada-dashboard" push origin main',
  '```'
);

fs.writeFileSync(sessionFile, sessionContent.join('\n'), 'utf8');
console.log(`✅ SESSION_CONTEXT.md gerado | Peso RAG Base: ~${totalTokens} tokens`);
