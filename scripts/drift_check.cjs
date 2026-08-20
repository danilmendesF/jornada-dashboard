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

// 3. Check js/sync_cloud.js core symbols (SPEC-005 / CHG-005 / CHG-005.1)
const syncCloudCode = fs.readFileSync(path.join(rootDir, 'js', 'sync_cloud.js'), 'utf-8');
checkDrift(syncCloudCode.includes('deterministicMergeMatches'), 'js/sync_cloud.js exporta deterministicMergeMatches (SPEC-005)');
checkDrift(syncCloudCode.includes('canonicalMatchString'), 'js/sync_cloud.js exporta canonicalMatchString (SPEC-005)');
checkDrift(syncCloudCode.includes('syncLifecycleState'), 'js/sync_cloud.js implementa syncLifecycleState (SPEC-005 / CHG-005)');
checkDrift(syncCloudCode.includes('jornada_sync_pending'), 'js/sync_cloud.js implementa jornada_sync_pending (SPEC-005 / CHG-005.1)');
checkDrift(syncCloudCode.includes('_authSessionGen'), 'js/sync_cloud.js implementa _authSessionGen (SPEC-005 / CHG-005.1)');
checkDrift(syncCloudCode.includes('MAX_RETRY_ATTEMPTS'), 'js/sync_cloud.js implementa MAX_RETRY_ATTEMPTS (SPEC-005 / CHG-006.4)');
checkDrift(syncCloudCode.includes('calculateBackoffDelay'), 'js/sync_cloud.js implementa calculateBackoffDelay (SPEC-005 / CHG-006.4)');

// 4. Check js/util.js & js/storage.js core symbols (SPEC-002 / SPEC-007 / CHG-006.1)
const utilCode = fs.readFileSync(path.join(rootDir, 'js', 'util.js'), 'utf-8');
checkDrift(utilCode.includes('escapeHtml'), 'js/util.js implementa escapeHtml (SPEC-007)');
checkDrift(utilCode.includes('generateUUID'), 'js/util.js implementa generateUUID (SPEC-002 / CHG-006.1)');
checkDrift(utilCode.includes('isValidUUID'), 'js/util.js implementa isValidUUID (SPEC-002 / CHG-006.1)');

const storageCode = fs.readFileSync(path.join(rootDir, 'js', 'storage.js'), 'utf-8');
checkDrift(storageCode.includes('migrateLegacyMatches'), 'js/storage.js implementa migrateLegacyMatches (SPEC-002 / CHG-006.1)');
checkDrift(storageCode.includes('migrateLegacyUserStorage'), 'js/storage.js implementa migrateLegacyUserStorage (SPEC-008 / CHG-006.2)');

const configCode = fs.readFileSync(path.join(rootDir, 'js', 'config.js'), 'utf-8');
checkDrift(configCode.includes('getStorageNamespace'), 'js/config.js implementa getStorageNamespace (SPEC-008 / CHG-006.2)');
checkDrift(configCode.includes('getStorageKey'), 'js/config.js implementa getStorageKey (SPEC-008 / CHG-006.2)');

// 5. Check api/sync.js core security & authorization (SPEC-004 / CHG-005)
const syncApiCode = fs.readFileSync(path.join(rootDir, 'api', 'sync.js'), 'utf-8');
checkDrift(syncApiCode.includes('getJwtSecret'), 'api/sync.js implementa getJwtSecret sem fallback');
checkDrift(syncApiCode.includes('allowedSyncTokens'), 'api/sync.js implementa autorizacao BOLA por namespace (SPEC-004)');
checkDrift(syncApiCode.includes('getRequestId'), 'api/sync.js implementa getRequestId (SPEC-004 / OBS-001)');
checkDrift(syncApiCode.includes('emergencyServerMerge'), 'api/sync.js implementa emergencyServerMerge (SPEC-005 / CHG-005)');
checkDrift(syncApiCode.includes('LUA_SYNC_COMMIT'), 'api/sync.js implementa LUA_SYNC_COMMIT (SPEC-005 / CHG-006.3)');
checkDrift(syncApiCode.includes('executeAtomicCommit'), 'api/sync.js implementa executeAtomicCommit (SPEC-005 / CHG-006.3)');

// 6. Check api/auth.js core security (SPEC-004 & SPEC-008)
const authApiCode = fs.readFileSync(path.join(rootDir, 'api', 'auth.js'), 'utf-8');
checkDrift(authApiCode.includes('getJwtSecret'), 'api/auth.js implementa getJwtSecret sem fallback');
checkDrift(authApiCode.includes('signJwt'), 'api/auth.js implementa signJwt com claim exp');
checkDrift(authApiCode.includes('checkRateLimit'), 'api/auth.js implementa checkRateLimit distribuido (SPEC-004 / SEC-003)');
checkDrift(authApiCode.includes('admin_delete_user_data'), 'api/auth.js implementa admin_delete_user_data (SPEC-008 / PRIV-001)');

// 7. Check api/email.js design tokens (SPEC-006)
const emailApiCode = fs.readFileSync(path.join(rootDir, 'api', 'email.js'), 'utf-8');
checkDrift(emailApiCode.includes('EMAIL_THEME'), 'api/email.js implementa EMAIL_THEME (SPEC-006)');

// 8. Check vercel.json HTTP Security Headers (SPEC-007)
const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8'));
const globalHeaders = vercelConfig.headers?.find(h => h.source === '/(.*)')?.headers || [];
checkDrift(globalHeaders.some(h => h.key === 'Content-Security-Policy'), 'vercel.json declara Content-Security-Policy (SPEC-007 / SEC-002)');
checkDrift(globalHeaders.some(h => h.key === 'X-Frame-Options'), 'vercel.json declara X-Frame-Options (SPEC-007 / SEC-002)');

// 9. Check Data Contracts exist
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'match.schema.json')), 'Contrato docs/contracts/match.schema.json presente');
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'sync-payload.schema.json')), 'Contrato docs/contracts/sync-payload.schema.json presente');
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'jwt-claims.schema.json')), 'Contrato docs/contracts/jwt-claims.schema.json presente');
checkDrift(fs.existsSync(path.join(rootDir, 'docs', 'contracts', 'tournament-meta.schema.json')), 'Contrato docs/contracts/tournament-meta.schema.json presente (SPEC-009)');

// 10. Check Tournaments Meta (SPEC-009 / CHG-004)
const tourMetaJs = fs.readFileSync(path.join(rootDir, 'js', 'tournaments_meta.js'), 'utf-8');
checkDrift(tourMetaJs.includes('fetchTournamentsMetaSummary'), 'js/tournaments_meta.js exporta fetchTournamentsMetaSummary (SPEC-009)');
checkDrift(tourMetaJs.includes('renderTournamentsMetaSummary'), 'js/tournaments_meta.js exporta renderTournamentsMetaSummary (SPEC-009)');

const tourMetaApi = fs.readFileSync(path.join(rootDir, 'api', 'tournaments_meta.js'), 'utf-8');
checkDrift(tourMetaApi.includes('parseCompletedTournaments'), 'api/tournaments_meta.js exporta parseCompletedTournaments (SPEC-009)');
checkDrift(tourMetaApi.includes('aggregateTournamentData'), 'api/tournaments_meta.js exporta aggregateTournamentData (SPEC-009)');

console.log('\n==================================================');
if (drifts === 0) {
  console.log('NENHUM DRIFT DETECTADO: Codigo, Simbolos e Especificacoes 100% Sincronizados!');
  process.exit(0);
} else {
  console.error(`${drifts} DRIFTS DETECTADOS! Requer reconciliacao.`);
  process.exit(1);
}
