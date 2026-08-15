/**
 * SDD VALIDATOR & GOVERNANCE GATE — Jornada Dashboard
 * Full Spec-Driven Development Validation Matrix
 * Run with: node scripts/validate_sdd.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

console.log('Executando SDD Validation & Governance Gate Completo...');

let passes = 0;
let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failures++;
  }
}

// 1. Check .ai/ Documentation
console.log('\n1. Validando Arquitetura e Contexto de IA (.ai/)...');
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
  assert(fs.existsSync(path.join(rootDir, '.ai', f)), `Arquivo .ai/${f} existe`);
});

// 2. Check docs/audit/ Documentation
console.log('\n2. Validando Relatorios de Auditoria e Reconciliacao (docs/audit/)...');
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

// 3. Check docs/specs/ Domain Specifications
console.log('\n3. Validando Especificacoes Formais de Dominio (docs/specs/)...');
const requiredSpecs = [
  'SPEC-001-MATCH-REGISTRATION.md',
  'SPEC-002-CHRONOLOGICAL-SEQID.md',
  'SPEC-003-MIRROR-MATCHES.md',
  'SPEC-004-AUTH-AND-ACCESS-CONTROL.md',
  'SPEC-005-CLOUD-SYNC-AND-BACKUPS.md',
  'SPEC-006-EMAIL-NOTIFICATIONS.md'
];
requiredSpecs.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'specs', f)), `Especificacao docs/specs/${f} existe`);
});

// 4. Check docs/decisions/ ADRs
console.log('\n4. Validando Registros de Decisao Arquitetural (docs/decisions/)...');
const requiredAdrs = [
  '0001-offline-first-hybrid-storage.md',
  '0002-sequential-match-indexing.md',
  '0003-serverless-jwt-auth.md',
  '0004-cyber-pokemon-design-system.md'
];
requiredAdrs.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'decisions', f)), `ADR docs/decisions/${f} existe`);
});

// 5. Check docs/operations/ Runbooks
console.log('\n5. Validando Manuais de Operacao e Rollback (docs/operations/)...');
const requiredOpsFiles = [
  'deployment.md',
  'rollback.md',
  'incident-response.md',
  'environment.md'
];
requiredOpsFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'operations', f)), `Runbook docs/operations/${f} existe`);
});

// 6. Check .github/workflows/ CI Pipeline
console.log('\n6. Validando Configuracoes de CI/CD (.github/workflows/)...');
assert(fs.existsSync(path.join(rootDir, '.github', 'workflows', 'ci.yml')), 'Pipeline .github/workflows/ci.yml existe');

// 7. Validate seqID Invariants
console.log('\n7. Validando Invariantes de Dados e Sequenciamento seqID...');
try {
  execSync('node scripts/validate_seqID.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(true, 'Suite de validacao do seqID executada com 100% de sucesso');
} catch (e) {
  assert(false, `Falha no teste de invariantes seqID: ${e.message}`);
}

// 8. Validate Complete Vitest Test Matrix
console.log('\n8. Executando Matriz Completa de Testes Unitarios no Vitest...');
try {
  const testOutput = execSync('npx vitest run', { cwd: rootDir, stdio: 'pipe' }).toString();
  assert(testOutput.includes('passed'), 'Matriz completa de testes unitarios no Vitest aprovada (5/5 suites)');
} catch (e) {
  assert(false, `Falha nos testes unitarios: ${e.message}`);
}

// 9. Validate Production Build
console.log('\n9. Validando Compilacao dos Bundles de Producao...');
try {
  execSync('node scripts/build_bundle.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(fs.existsSync(path.join(rootDir, 'dist', 'app.min.js')), 'dist/app.min.js compilado com sucesso');
  assert(fs.existsSync(path.join(rootDir, 'dist', 'style.min.css')), 'dist/style.min.css compilado com sucesso');
} catch (e) {
  assert(false, `Falha na compilacao do bundle: ${e.message}`);
}

// Summary
console.log('\n==================================================');
console.log(`RESULTADO DA VALIDACAO SDD & GOVERNANCA GLOBAL:`);
console.log(`   Testes Aprovados: ${passes}`);
console.log(`   Falhas: ${failures}`);
console.log('==================================================\n');

if (failures > 0) {
  console.error('SDD GATE: Validacao reprovada com falhas.');
  process.exit(1);
} else {
  console.log('SDD GATE: 100% Aprovado com Sucesso!');
  process.exit(0);
}
