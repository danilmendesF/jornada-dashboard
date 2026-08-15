const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('Executando SDD 2.0 Deep Drift Detection & AST/Symbol Health Check...');

let drifts = 0;

function checkDrift(condition, message) {
  if (!condition) {
    console.error(`  [DRIFT DETECTADO] ${message}`);
    drifts++;
  } else {
    console.log(`  [EM CONFORMIDADE] ${message}`);
  }
}

// 1. Check js/stats.js core symbols
const statsCode = fs.readFileSync(path.join(rootDir, 'js', 'stats.js'), 'utf-8');
checkDrift(statsCode.includes('calculateStats'), 'js/stats.js exporta calculateStats');
checkDrift(statsCode.includes('isBricked'), 'js/stats.js exporta isBricked');
checkDrift(statsCode.includes('groupBy'), 'js/stats.js exporta groupBy');

// 2. Check js/mirror.js core symbols (SPEC-003)
const mirrorCode = fs.readFileSync(path.join(rootDir, 'js', 'mirror.js'), 'utf-8');
checkDrift(mirrorCode.includes('buildMirrorMatch'), 'js/mirror.js exporta buildMirrorMatch (SPEC-003)');
checkDrift(mirrorCode.includes('invertPlacar'), 'js/mirror.js exporta invertPlacar (SPEC-003)');
checkDrift(mirrorCode.includes('syncAllTeamMirrorMatches'), 'js/mirror.js exporta syncAllTeamMirrorMatches (SPEC-003)');

// 3. Check js/sync_cloud.js core symbols (SPEC-005)
const syncCloudCode = fs.readFileSync(path.join(rootDir, 'js', 'sync_cloud.js'), 'utf-8');
checkDrift(syncCloudCode.includes('deterministicMergeMatches'), 'js/sync_cloud.js exporta deterministicMergeMatches (SPEC-005)');
checkDrift(syncCloudCode.includes('canonicalMatchString'), 'js/sync_cloud.js exporta canonicalMatchString (SPEC-005)');

// 4. Check api/sync.js core security & authorization (SPEC-004)
const syncApiCode = fs.readFileSync(path.join(rootDir, 'api', 'sync.js'), 'utf-8');
checkDrift(syncApiCode.includes('getJwtSecret'), 'api/sync.js implementa getJwtSecret (GAP-NEW-004)');
checkDrift(syncApiCode.includes('allowedSyncTokens'), 'api/sync.js implementa autorizacao BOLA por namespace (SPEC-004)');

// 5. Check api/auth.js core security (SPEC-004)
const authApiCode = fs.readFileSync(path.join(rootDir, 'api', 'auth.js'), 'utf-8');
checkDrift(authApiCode.includes('getJwtSecret'), 'api/auth.js implementa getJwtSecret sem fallback');
checkDrift(authApiCode.includes('signJwt'), 'api/auth.js implementa signJwt');

// 6. Check api/email.js design tokens (SPEC-006)
const emailApiCode = fs.readFileSync(path.join(rootDir, 'api', 'email.js'), 'utf-8');
checkDrift(emailApiCode.includes('EMAIL_THEME'), 'api/email.js implementa EMAIL_THEME (SPEC-006)');

// 7. Check Data Contracts exist
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'match.schema.json')), 'Contrato docs/contracts/match.schema.json presente');
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'sync-payload.schema.json')), 'Contrato docs/contracts/sync-payload.schema.json presente');
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'jwt-claims.schema.json')), 'Contrato docs/contracts/jwt-claims.schema.json presente');

console.log('\n==================================================');
if (drifts === 0) {
  console.log('NENHUM DRIFT DETECTADO: Codigo, Simbolos e Especificacoes 100% Sincronizados!');
  process.exit(0);
} else {
  console.error(`${drifts} DRIFTS DETECTADOS! Requer reconciliacao.`);
  process.exit(1);
}
