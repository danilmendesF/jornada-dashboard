/**
 * 📦 BUILD BUNDLE SCRIPT — Jornada Dashboard
 * Bundles and minifies all modular JS/CSS files into dist/app.min.js and dist/style.min.css
 * Also syncs production static assets into public/ for Vercel deployment.
 * Run with: node scripts/build_bundle.cjs
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Order of JS execution dependencies
const jsOrder = [
  'js/util.js',
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
  'js/router.js',
  'js/tournaments_meta.js',
  'app.js',
  'manager.js'
];

async function build() {
  // ── 1. READ SINGLE SOURCE OF TRUTH (package.json) ──────────────────────────
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json não encontrado na raiz.');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const appVersion = pkg.version;
  if (!appVersion || typeof appVersion !== 'string' || !/^\d+\.\d+\.\d+/.test(appVersion)) {
    throw new Error(`Versão semântica inválida ou ausente no package.json: ${appVersion}`);
  }

  console.log(`📦 Compilando Bundle para Produção (Versão: v${appVersion})...`);

  // ── 2. MINIFY JS WITH TERSER ────────────────────────────────────────────────
  let bundledJS = '/* Jornada Dashboard Production Bundle */\n(function(){\n"use strict";\n';

  jsOrder.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      bundledJS += `\n/* --- ${path.basename(file)} --- */\n` + raw + '\n';
    } else {
      console.error(`⚠️ Arquivo não encontrado: ${file}`);
    }
  });

  bundledJS += '\n})();\n';

  const minifyResult = await minify(bundledJS, {
    compress: {
      drop_console: false,
      passes: 2
    },
    mangle: {
      toplevel: true
    },
    format: {
      comments: false
    }
  });

  const jsDistPath = path.join(distDir, 'app.min.js');
  fs.writeFileSync(jsDistPath, minifyResult.code, 'utf8');
  console.log(`✅ JS Bundle gerado com sucesso: dist/app.min.js (${(minifyResult.code.length / 1024).toFixed(1)} KB)`);

  // ── 3. MINIFY CSS ───────────────────────────────────────────────────────────
  const cssPath = path.join(rootDir, 'style.css');
  if (fs.existsSync(cssPath)) {
    const rawCSS = fs.readFileSync(cssPath, 'utf8');
    let cleanCSS = rawCSS.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanCSS = cleanCSS.replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1');
    const cssDistPath = path.join(distDir, 'style.min.css');
    fs.writeFileSync(cssDistPath, cleanCSS, 'utf8');
    console.log(`✅ CSS Minificado gerado com sucesso: dist/style.min.css (${(cleanCSS.length / 1024).toFixed(1)} KB)`);
  }

  // ── 4. COPY ASSETS & LOGO ───────────────────────────────────────────────────
  if (fs.existsSync(path.join(rootDir, 'logo.png'))) {
    fs.copyFileSync(path.join(rootDir, 'logo.png'), path.join(distDir, 'logo.png'));
    fs.copyFileSync(path.join(rootDir, 'logo.png'), path.join(publicDir, 'logo.png'));
  }
  const assetsDir = path.join(rootDir, 'assets');
  const distAssetsDir = path.join(distDir, 'assets');
  const publicAssetsDir = path.join(publicDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });
    if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });
    fs.readdirSync(assetsDir).forEach(file => {
      fs.copyFileSync(path.join(assetsDir, file), path.join(distAssetsDir, file));
      fs.copyFileSync(path.join(assetsDir, file), path.join(publicAssetsDir, file));
    });
    console.log('✅ Assets copiados para dist/assets e public/assets com sucesso!');
  }

  // ── 5. GENERATE & INJECT VERSION DERIVED ARTIFACTS (CHG-003) ────────────────
  console.log('🔄 Gerando e injetando artefatos derivados de versão (CHG-003)...');

  // A. Generate version.json (Root and Public)
  const versionJsonContent = JSON.stringify({ version: appVersion }, null, 2) + '\n';
  fs.writeFileSync(path.join(rootDir, 'version.json'), versionJsonContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'version.json'), versionJsonContent, 'utf8');
  console.log(`✅ version.json gerado automaticamente com versão "${appVersion}"`);

  // B. Process index.html template and inject version
  const htmlTemplatePath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(htmlTemplatePath)) {
    throw new Error('index.html não encontrado na raiz.');
  }

  const rawHtml = fs.readFileSync(htmlTemplatePath, 'utf8');

  // Strict Validation: ensure required placeholders or elements exist
  const placeholderCount = (rawHtml.match(/__APP_VERSION__/g) || []).length;
  if (placeholderCount < 2 && !rawHtml.includes('appVersion')) {
    throw new Error('❌ index.html não contém os placeholders __APP_VERSION__ esperados.');
  }

  let processedHtml = rawHtml;
  if (placeholderCount > 0) {
    processedHtml = rawHtml.replaceAll('__APP_VERSION__', appVersion);
  } else {
    // Fallback regex replacement if rawHtml had concrete version
    processedHtml = processedHtml
      .replace(/(<span\s+id="appVersion(?:Auth)?"\s*>)(.*?)(<\/span>)/g, `$1${appVersion}$3`)
      .replace(/src="dist\/app\.min\.js(\?v=[0-9\.]+)?"/g, `src="dist/app.min.js?v=${appVersion}"`)
      .replace(/href="dist\/style\.min\.css(\?v=[0-9\.]+)?"/g, `href="dist/style.min.css?v=${appVersion}"`);
  }

  // Strict Assertion: No unreplaced __APP_VERSION__ in final output
  if (processedHtml.includes('__APP_VERSION__')) {
    throw new Error('❌ Erro no build: Placeholder __APP_VERSION__ não resolvido no index.html.');
  }

  // Write compiled public/index.html
  const publicHtmlPath = path.join(publicDir, 'index.html');
  fs.writeFileSync(publicHtmlPath, processedHtml, 'utf8');
  console.log(`✅ public/index.html gerado com sucesso com versão "${appVersion}" injetada!`);

  // ── 6. SYNC STATIC FILES TO PUBLIC/ (VERCEL DEPLOYMENT) ──────────────────────
  console.log('📂 Sincronizando arquivos finais para public/ para deploy na Vercel...');
  if (fs.existsSync(path.join(rootDir, 'logo.png'))) {
    fs.copyFileSync(path.join(rootDir, 'logo.png'), path.join(publicDir, 'logo.png'));
  }

  // Sync dist into public/dist
  const publicDistDir = path.join(publicDir, 'dist');
  if (!fs.existsSync(publicDistDir)) fs.mkdirSync(publicDistDir, { recursive: true });
  
  function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      if (fs.lstatSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  copyDirRecursive(distDir, publicDistDir);
  console.log('✅ Pasta public/ sincronizada com sucesso para a Vercel!');
  console.log(`🎉 Build de Produção v${appVersion} Concluído com Sucesso!`);
}

build().catch(err => {
  console.error('❌ Erro no build:', err.message);
  process.exit(1);
});

