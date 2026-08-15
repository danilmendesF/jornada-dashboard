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

// 1. Ler e atualizar package.json
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

const versionPath = path.join(rootDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify({ version: newVersion }, null, 2) + '\n', 'utf8');
console.log(`✅ version.json gerado com sucesso!`);

// 2. Injetar a versão no index.html
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Expressão regular para encontrar e substituir o conteúdo da tag do appVersion e appVersionAuth
  const regex = /(<span\s+id="appVersion(?:Auth)?"\s*>)(.*?)(<\/span>)/g;
  
  if (regex.test(html)) {
    html = html.replace(regex, `$1${newVersion}$3`);
  } else {
    console.error('⚠️ Tag <span id="appVersion"> ou <span id="appVersionAuth"> não encontrada no index.html. Não foi possível injetar a versão.');
  }

  // Cache busting para app.min.js
  const scriptRegex = /src="dist\/app\.min\.js(\?v=[0-9\.]+)?"/g;
  html = html.replace(scriptRegex, `src="dist/app.min.js?v=${newVersion}"`);

  // Cache busting para style.min.css
  const cssRegex = /href="dist\/style\.min\.css(\?v=[0-9\.]+)?"/g;
  html = html.replace(cssRegex, `href="dist/style.min.css?v=${newVersion}"`);

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ Nova versão (v${newVersion}) injetada com sucesso no index.html (e cache busting atualizado)!`);
  
  const publicHtmlPath = path.join(rootDir, 'public', 'index.html');
  if (fs.existsSync(path.dirname(publicHtmlPath))) {
    fs.writeFileSync(publicHtmlPath, html, 'utf8');
  }
  const publicVersionPath = path.join(rootDir, 'public', 'version.json');
  if (fs.existsSync(path.dirname(publicVersionPath))) {
    fs.writeFileSync(publicVersionPath, JSON.stringify({ version: newVersion }, null, 2) + '\n', 'utf8');
  }
} else {
  console.error('❌ index.html não encontrado.');
  process.exit(1);
}
