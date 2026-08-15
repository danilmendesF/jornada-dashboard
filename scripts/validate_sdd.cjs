/**
 * 🛡️ SDD VALIDATOR & GOVERNANCE GATE — Jornada Dashboard
 * Validates specifications, AI context, operations, test invariants and bundle integrity.
 * Run with: node scripts/validate_sdd.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Executando SDD Validation & Governance Gate...');

let passes = 0;
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passes++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failures++;
  }
}

// 1. Check .ai/ Documentation
console.log('\n📁 1. Validando Arquitetura e Contexto de IA (.ai/)...');
const requiredAiFiles = [
  'PROJECT_INDEX.md',
  'PROJECT_CONTEXT.md',
  'CODING_GUIDELINES.md',
  'DO_NOT.md',
  'KNOWN_PITFALLS.md',
  'CHANGE_WORKFLOW.md',
  'KNOWLEDGE_MODEL.md'
];
requiredAiFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, '.ai', f)), `Arquivo .ai/${f} existe e está acessível`);
});

// 2. Check docs/audit/ Documentation
console.log('\n📁 2. Validando Relatórios de Auditoria e Reconciliação (docs/audit/)...');
const requiredAuditFiles = [
  'BASELINE.md',
  'SYSTEM-MAP.md',
  'KNOWLEDGE-RECONCILIATION.md',
  'SECURITY-FINDINGS.md',
  'DATA-INTEGRITY.md',
  'OPEN-QUESTIONS.md'
];
requiredAuditFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'audit', f)), `Arquivo docs/audit/${f} existe`);
});

// 3. Check docs/operations/ Runbooks
console.log('\n📁 3. Validando Manuais de Operação e Rollback (docs/operations/)...');
const requiredOpsFiles = [
  'deployment.md',
  'rollback.md',
  'incident-response.md',
  'environment.md'
];
requiredOpsFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'operations', f)), `Arquivo docs/operations/${f} existe`);
});

// 4. Validate seqID Invariants
console.log('\n🧪 4. Validando Invariantes de Dados e Sequenciamento seqID...');
try {
  execSync('node scripts/validate_seqID.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(true, 'Suíte de validação do seqID executada com 100% de sucesso');
} catch (e) {
  assert(false, `Falha no teste de invariantes seqID: ${e.message}`);
}

// 5. Validate Core Unit Tests
console.log('\n🧪 5. Executando Testes Unitários com Vitest...');
try {
  execSync('npx vitest run', { cwd: rootDir, stdio: 'pipe' });
  assert(true, 'Testes unitários no Vitest aprovados com sucesso');
} catch (e) {
  assert(false, `Falha nos testes unitários: ${e.message}`);
}

// 6. Validate Production Build
console.log('\n📦 6. Validando Build dos Bundles de Produção...');
try {
  execSync('node scripts/build_bundle.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(fs.existsSync(path.join(rootDir, 'dist', 'app.min.js')), 'dist/app.min.js gerado com sucesso');
  assert(fs.existsSync(path.join(rootDir, 'dist', 'style.min.css')), 'dist/style.min.css gerado com sucesso');
} catch (e) {
  assert(false, `Falha na compilação do bundle: ${e.message}`);
}

// Summary
console.log('\n==================================================');
console.log(`📊 RESULTADO DA VALIDAÇÃO SDD & GOVERNANÇA:`);
console.log(`   ✅ Testes Aprovados: ${passes}`);
console.log(`   ❌ Falhas: ${failures}`);
console.log('==================================================\n');

if (failures > 0) {
  console.error('🔴 SDD GATE: Validação reprovada com falhas.');
  process.exit(1);
} else {
  console.log('🟢 SDD GATE: 100% Aprovado com Sucesso!');
  process.exit(0);
}
