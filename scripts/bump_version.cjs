/**
 * 🚀 BUMP VERSION SCRIPT — Jornada Dashboard
 * Lê a versão atual do package.json, incrementa usando Semantic Versioning,
 * atualiza o package.json e injeta a nova versão no index.html.
 * Uso: node scripts/bump_version.cjs [patch|minor|major] (padrão é patch)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const htmlPath = path.join(rootDir, 'index.html');

const releaseType = process.argv[2] || 'patch'; // patch | minor | major

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error('❌ Tipo de bump inválido. Use: patch, minor ou major.');
  process.exit(1);
}

// 1. Ler e atualizar package.json (Single Source of Truth)
if (!fs.existsSync(pkgPath)) {
  console.error('❌ package.json não encontrado.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;
if (!currentVersion) {
  console.error('❌ versão não definida no package.json.');
  process.exit(1);
}

let [major, minor, patch] = currentVersion.split('.').map(Number);

if (releaseType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (releaseType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1; // Default
}

const newVersion = `${major}.${minor}.${patch}`;
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`🆙 Versão atualizada no package.json: ${currentVersion} ➔ ${newVersion}`);

// 2. Invocar o motor de build central para gerar artefatos derivados (CHG-003)
console.log('🚀 Executando build central para gerar artefatos derivados (public/, version.json, bundles)...');
const { execSync } = require('child_process');
try {
  execSync('node scripts/build_bundle.cjs', { cwd: rootDir, stdio: 'inherit' });
  console.log(`✅ Bump para v${newVersion} e compilação de artefatos concluídos com sucesso!`);
} catch (e) {
  console.error(`❌ Erro ao compilar artefatos após bump de versão: ${e.message}`);
  process.exit(1);
}

