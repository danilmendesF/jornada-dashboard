/**
 * 📦 BUILD BUNDLE SCRIPT — Jornada Dashboard
 * Bundles and minifies all modular JS/CSS files into dist/app.min.js and dist/style.min.css
 * Run with: node scripts/build_bundle.cjs
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Order of JS execution dependencies
const jsOrder = [
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
  'app.js',
  'manager.js'
];

async function build() {
  console.log('📦 Compilando Bundle Único Minificado para Produção com Terser...');

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

  // Obfuscate and minify using Terser
  const minifyResult = await minify(bundledJS, {
    compress: {
      drop_console: true, // Remove all console.log, console.error, etc.
      passes: 2
    },
    mangle: {
      toplevel: true
    },
    format: {
      comments: false // Remove comments
    }
  });

  const jsDistPath = path.join(distDir, 'app.min.js');
  fs.writeFileSync(jsDistPath, minifyResult.code, 'utf8');
  console.log(`✅ JS Bundle gerado com sucesso: dist/app.min.js (${(minifyResult.code.length / 1024).toFixed(1)} KB)`);

  // Minify CSS
  const cssPath = path.join(rootDir, 'style.css');
  if (fs.existsSync(cssPath)) {
    const rawCSS = fs.readFileSync(cssPath, 'utf8');
    let cleanCSS = rawCSS.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanCSS = cleanCSS.replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1');
    const cssDistPath = path.join(distDir, 'style.min.css');
    fs.writeFileSync(cssDistPath, cleanCSS, 'utf8');
    console.log(`✅ CSS Minificado gerado com sucesso: dist/style.min.css (${(cleanCSS.length / 1024).toFixed(1)} KB)`);
  }

  // Copy assets
  const assetsDir = path.join(rootDir, 'assets');
  const distAssetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });
    fs.readdirSync(assetsDir).forEach(file => {
      fs.copyFileSync(path.join(assetsDir, file), path.join(distAssetsDir, file));
    });
    console.log('✅ Assets copiados para dist/assets com sucesso!');
  }

  console.log('🎉 Build de Produção Concluído!');
}

build().catch(err => {
  console.error('❌ Erro no build:', err);
  process.exit(1);
});
