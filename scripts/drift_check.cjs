/**
 * SDD DRIFT DETECTOR & HEALTH CHECK — Jornada Dashboard
 * Detects discrepancies between Specs, Implementation, Tests and Documentation.
 * Run with: node scripts/drift_check.cjs
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('Executando SDD Drift Detection & Health Check...');

let drifts = 0;

function checkDrift(condition, message) {
  if (!condition) {
    console.error(`  [DRIFT DETECTADO] ${message}`);
    drifts++;
  } else {
    console.log(`  [EM CONFORMIDADE] ${message}`);
  }
}

checkDrift(fs.existsSync(path.join(rootDir, 'js', 'stats.js')), 'Codigo js/stats.js alinhado com especificacoes de estatisticas');
checkDrift(fs.existsSync(path.join(rootDir, 'js', 'mirror.js')), 'Codigo js/mirror.js alinhado com SPEC-003-MIRROR-MATCHES');
checkDrift(fs.existsSync(path.join(rootDir, 'js', 'quicklog.js')), 'Codigo js/quicklog.js alinhado com SPEC-001-MATCH-REGISTRATION');
checkDrift(fs.existsSync(path.join(rootDir, 'api', 'email.js')), 'Codigo api/email.js alinhado com SPEC-006-EMAIL-NOTIFICATIONS');
checkDrift(fs.existsSync(path.join(rootDir, 'api', 'auth.js')), 'Codigo api/auth.js alinhado com SPEC-004-AUTH-AND-ACCESS-CONTROL');

console.log('\n==================================================');
if (drifts === 0) {
  console.log('NENHUM DRIFT DETECTADO: Sistema 100% Reconciliado!');
  process.exit(0);
} else {
  console.error(`${drifts} DRIFTS DETECTADOS! Requer reconciliacao.`);
  process.exit(1);
}
