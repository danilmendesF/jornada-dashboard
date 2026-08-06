/**
 * 📦 BUILD BUNDLE SCRIPT — Jornada Dashboard
 * Bundles and minifies all modular JS/CSS files into dist/app.min.js and dist/style.min.css
 * Run with: node scripts/build_bundle.cjs
 */

const fs = require('fs');
const path = require('path');

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
  'app.js',
  'manager.js'
];

function minifyJSCode(code) {
  // 1. Remove multi-line comments /* ... */
  let clean = code.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 2. Process line by line to safely strip // comments without touching http:// or strings
  const lines = clean.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return '';
    // Strip trailing inline comment if not inside URL
    const inlineIdx = line.indexOf('//');
    if (inlineIdx > -1) {
      const before = line.substring(0, inlineIdx);
      if (!before.includes('http:') && !before.includes('https:') && !before.includes('"') && !before.includes("'")) {
        return before.trimEnd();
      }
    }
    return line;
  });

  return processedLines.filter(l => l.trim().length > 0).join('\n');
}

console.log('📦 Compilando Bundle Único Minificado para Produção...');

let bundledJS = '/* Jornada Dashboard Production Bundle */\n(function(){\n"use strict";\n';

jsOrder.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const minified = minifyJSCode(raw);
    bundledJS += `\n;/* ${path.basename(file)} */\n` + minified + '\n';
  } else {
    console.error(`⚠️ Arquivo não encontrado: ${file}`);
  }
});

bundledJS += '\n})();\n';

const jsDistPath = path.join(distDir, 'app.min.js');
fs.writeFileSync(jsDistPath, bundledJS, 'utf8');
console.log(`✅ JS Bundle gerado com sucesso: dist/app.min.js (${(bundledJS.length / 1024).toFixed(1)} KB)`);

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

console.log('🎉 Build de Produção Concluído!');
