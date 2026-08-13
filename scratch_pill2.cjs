const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');
let repl = fs.readFileSync('repl.txt', 'utf8');
c = c.replace(/function renderActiveFilters\(\) \{[\s\S]*?\}\);[\s\r\n]*\}/, repl);
fs.writeFileSync('app.js', c);
