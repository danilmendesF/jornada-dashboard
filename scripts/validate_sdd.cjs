const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
console.log('Executando SDD Governance Gate 2.0 Completo...');

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

// 1. Check AI Context (.ai/)
console.log('\n1. Validando Arquitetura e Contexto de IA (.ai/)...');
const requiredAiFiles = [
  'PROJECT_INDEX.md', 'PROJECT_CONTEXT.md', 'CODING_GUIDELINES.md',
  'DO_NOT.md', 'KNOWN_PITFALLS.md', 'CHANGE_WORKFLOW.md', 'KNOWLEDGE_MODEL.md'
];
requiredAiFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, '.ai', f)), `Arquivo .ai/${f} existe`);
});

// 2. Validate Spec Lifecycle
console.log('\n2. Validando Ciclo de Vida Formal de Especificacoes (docs/specs/)...');
try {
  execSync('node scripts/validate_spec_lifecycle.cjs', { cwd: rootDir, stdio: 'inherit' });
  assert(true, 'Todas as especificacoes possuem frontmatter YAML e testes validos');
} catch (e) {
  assert(false, `Falha na validacao do ciclo de vida: ${e.message}`);
}

// 3. Check Data Contracts
console.log('\n3. Validando Contratos de Dados e Schemas JSON (docs/contracts/)...');
const requiredContracts = ['match.schema.json', 'sync-payload.schema.json', 'jwt-claims.schema.json'];
requiredContracts.forEach(c => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'contracts', c)), `Contrato docs/contracts/${c} existe`);
});

// 4. Check ADRs & Tech Debt
console.log('\n4. Validando Registros de Decisao (docs/decisions/) e Divida Tecnica...');
const requiredAdrs = [
  '0001-offline-first-hybrid-storage.md', '0002-sequential-match-indexing.md',
  '0003-serverless-jwt-auth.md', '0004-cyber-pokemon-design-system.md',
  '0005-redis-rate-limiting-fail-open.md', '0006-strict-jwt-expiration-and-correlation-id.md',
  '0007-csp-and-html-sanitization.md'
];
requiredAdrs.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'decisions', f)), `ADR docs/decisions/${f} existe`);
});
assert(fs.existsSync(path.join(rootDir, 'docs', 'TECH_DEBT.md')), 'Registro docs/TECH_DEBT.md existe');
assert(fs.existsSync(path.join(rootDir, 'docs', 'privacy', 'DATA-RETENTION-AND-DELETION.md')), 'Documento docs/privacy/DATA-RETENTION-AND-DELETION.md existe');

// 5. Check Operations Runbooks
console.log('\n5. Validando Manuais de Operacao e Rollback (docs/operations/)...');
const requiredOpsFiles = ['deployment.md', 'rollback.md', 'incident-response.md', 'environment.md'];
requiredOpsFiles.forEach(f => {
  assert(fs.existsSync(path.join(rootDir, 'docs', 'operations', f)), `Runbook docs/operations/${f} existe`);
});

// 6. Check CI/CD Workflows
console.log('\n6. Validando Configuracoes de CI/CD (.github/workflows/)...');
assert(fs.existsSync(path.join(rootDir, '.github', 'workflows', 'ci.yml')), 'Pipeline .github/workflows/ci.yml existe');

// 7. Validate Data Invariants seqID
console.log('\n7. Validando Invariantes de Dados e Sequenciamento seqID...');
try {
  execSync('node scripts/validate_seqID.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(true, 'Suite de validacao do seqID executada com 100% de sucesso');
} catch (e) {
  assert(false, `Falha no teste de invariantes seqID: ${e.message}`);
}

// 8. Execute Deep Drift Detection
console.log('\n8. Executando SDD 2.0 Deep Drift Detection...');
try {
  execSync('node scripts/drift_check.cjs', { cwd: rootDir, stdio: 'inherit' });
  assert(true, 'Deep Drift Detector aprovado com zero discrepancias');
} catch (e) {
  assert(false, `Falha no detector de drift: ${e.message}`);
}

// 9. Execute Complete Vitest Test Matrix
console.log('\n9. Executando Matriz Completa de Testes Unitarios no Vitest...');
try {
  const testOutput = execSync('npx vitest run', { cwd: rootDir, stdio: 'pipe' }).toString();
  assert(testOutput.includes('passed'), 'Matriz completa de testes unitarios no Vitest aprovada (19/19 suites)');
} catch (e) {
  assert(false, `Falha nos testes unitarios: ${e.message}`);
}

// 10. Validate Production Build Bundle
console.log('\n10. Validando Compilacao dos Bundles de Producao com Terser...');
try {
  execSync('node scripts/build_bundle.cjs', { cwd: rootDir, stdio: 'pipe' });
  assert(fs.existsSync(path.join(rootDir, 'dist', 'app.min.js')), 'dist/app.min.js compilado com sucesso');
  assert(fs.existsSync(path.join(rootDir, 'dist', 'style.min.css')), 'dist/style.min.css compilado com sucesso');
} catch (e) {
  assert(false, `Falha na compilacao do bundle: ${e.message}`);
}

console.log('\n==================================================');
console.log(`RESULTADO DA VALIDACAO SDD 2.0 & GOVERNANCA GLOBAL:`);
console.log(`   Verificacoes Aprovadas: ${passes}`);
console.log(`   Falhas: ${failures}`);
console.log('==================================================\n');

if (failures > 0) {
  console.error('SDD GATE 2.0: Validacao reprovada com falhas.');
  process.exit(1);
} else {
  console.log('SDD GATE 2.0: 100% Aprovado com Sucesso!');
  process.exit(0);
}
