const fs = require('fs');
const path = require('path');

// 1. HTML Comment Removal
let indexHtml = fs.readFileSync('index.html', 'utf-8');
indexHtml = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
indexHtml = indexHtml.replace(/^\s*[\r\n]/gm, '');
fs.writeFileSync('index.html', indexHtml);
console.log('Removed comments from index.html');

// 2. JS Comment Removal (app.js, manager.js)
const jsFiles = ['app.js', 'manager.js', 'js/stats.js', 'js/table.js']; // add more if needed
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    // Remove single line comments that don't start with // eslint or // @
    content = content.replace(/^\s*\/\/ (?!eslint|@|─).*$/gm, '');
    content = content.replace(/\n{3,}/g, '\n\n'); // clean up empty lines
    fs.writeFileSync(file, content);
    console.log(`Cleaned comments in ${file}`);
  }
});

// 3. Find Unused CSS Classes
let cssContent = fs.readFileSync('style.css', 'utf-8');
const classRegex = /\.([a-zA-Z0-9_-]+)(?=[^a-zA-Z0-9_-])/g;
let match;
const cssClasses = new Set();
while ((match = classRegex.exec(cssContent)) !== null) {
  cssClasses.add(match[1]);
}

let allSourceCode = fs.readFileSync('index.html', 'utf-8');
const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.js') && !dirFile.includes('node_modules') && !dirFile.includes('dist')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const allJsFiles = walkSync('.');
allJsFiles.forEach(f => {
  allSourceCode += fs.readFileSync(f, 'utf-8');
});

const unusedClasses = [];
for (const cls of cssClasses) {
  if (!allSourceCode.includes(cls)) {
    unusedClasses.push(cls);
  }
}

console.log('Unused classes found:', unusedClasses.length);
if (unusedClasses.length > 0) {
  console.log('Examples:', unusedClasses.slice(0, 10));
}
