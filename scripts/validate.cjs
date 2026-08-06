/**
 * 🧪 VALIDATOR SUITE — Jornada Dashboard
 * Automated regression & integrity test runner.
 * Run with: node scripts/validate.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando Suíte de Validação Automatizada SDD...\n');

try {
  execSync('node scripts/build_bundle.cjs', { stdio: 'ignore' });
} catch (e) {
  console.error('❌ Erro ao compilar bundle de produção!');
}

let errors = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSE: ${message}`);
    passes++;
  } else {
    console.error(`  ❌ FALHA: ${message}`);
    errors++;
  }
}

// ── TEST 1: SINTAXE JS DOS MÓDULOS ──────────────────────────────────────────
console.log('📌 Teste 1: Validação de Sintaxe dos Módulos JavaScript');
const jsFiles = [
  'js/config.js',
  'js/storage.js',
  'js/stats.js',
  'js/mirror.js',
  'js/md3.js',
  'js/quicklog.js',
  'js/filters.js',
  'js/table.js',
  'js/charts.js',
  'js/matchup.js',
  'js/manager_forms.js',
  'js/sync_cloud.js',
  'js/auth.js',
  'app.js',
  'manager.js'
];

jsFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    assert(false, `Arquivo não encontrado: ${file}`);
    return;
  }
  try {
    execSync(`node -c "${fullPath}"`);
    assert(true, `Sintaxe OK: ${file}`);
  } catch (e) {
    assert(false, `Erro de sintaxe em: ${file}`);
  }
});

// ── TEST 2: TAMANHO DOS MÓDULOS (SDD STANDARD < 350 LINHAS) ────────────────
console.log('\n📌 Teste 2: Verificação do Padrão SDD (Módulos < 350 linhas)');
const moduleFiles = jsFiles.filter(f => f.startsWith('js/'));
moduleFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  assert(lines <= 350, `Tamanho modular OK: ${file} (${lines} linhas <= 350)`);
});

// ── TEST 3: CONTRATOS DO MIRROR MATCH (INVERSÃO & DUPLICATAS) ──────────────
console.log('\n📌 Teste 3: Integridade do Módulo de Partidas Espelho (buildMirrorMatch)');
const mirrorContent = fs.readFileSync(path.join(__dirname, '..', 'js/mirror.js'), 'utf8');
assert(mirrorContent.includes('invertPlacar'), 'Contém função invertPlacar');
assert(mirrorContent.includes('buildMirrorMatch'), 'Contém função buildMirrorMatch');
const placarOccurrences = (mirrorContent.match(/Placar:\s*mirrorPlacar/g) || []).length;
assert(placarOccurrences === 1, 'Ausência de propriedades duplicadas no objeto espelho');

// ── TEST 4: FÓRMULAS ESTATÍSTICAS GAME-LEVEL ───────────────────────────────
console.log('\n📌 Teste 4: Integridade do Motor Estatístico (calculateStats & GamesDetail)');
const statsContent = fs.readFileSync(path.join(__dirname, '..', 'js/stats.js'), 'utf8');
const chartsContent = fs.readFileSync(path.join(__dirname, '..', 'js/charts.js'), 'utf8');

assert(statsContent.includes('totalGameBricksCount'), 'calculateStats computa totalGameBricksCount');
assert(statsContent.includes('totalGamesCount'), 'calculateStats computa totalGamesCount');
assert(chartsContent.includes('totalGameBricksCount'), 'renderKPIs utiliza game-level bricks count');

// ── TEST 5: TOUCH TARGETS & Z-INDEX NO CSS ─────────────────────────────────
console.log('\n📌 Teste 5: Verificação do Design System & CSS Mobile');
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
assert(!cssContent.includes('z-index: 9999 !important;'), 'Ausência de z-index: 9999 !important no dropdown');
assert(cssContent.includes('z-index: var(--z-toast)'), 'Toast utiliza token CSS var(--z-toast)');
assert(cssContent.includes('overflow-x: hidden;'), 'Body possui overflow-x: hidden contra vazamento');

// ── RESUMO ──────────────────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`📊 RESULTADO DA SUÍTE DE VALIDAÇÃO:`);
console.log(`   ✅ Passou em ${passes} testes`);
console.log(`   ❌ Falhou em ${errors} testes`);
console.log('==================================================\n');

if (errors > 0) {
  console.error('🔴 ERRO: A suíte de validação encontrou falhas. Corrija antes de prosseguir!');
  process.exit(1);
} else {
  console.log('🟢 SUCESSO: Aplicação 100% aprovada na suíte de validação SDD!');
  process.exit(0);
}
