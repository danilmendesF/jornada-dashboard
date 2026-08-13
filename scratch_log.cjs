const fs = require('fs');

function updateLog(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  if (c.includes('function log(')) return;
  
  const loggerFn = 
function log(level, message, context = {}) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...context };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}
;
  c = c.replace(/import .*?;\n/, match => match + loggerFn);
  
  // Replace console.log
  c = c.replace(/console\.log\(\s*(['\].*?['\])(?:,\s*(.*?))?\s*\);/g, (match, msg, args) => {
    return "log('info', " + msg + (args ? ", { data: " + args + " }" : "") + ");";
  });
  
  // Replace console.error
  c = c.replace(/console\.error\(\s*(['\].*?['\])(?:,\s*(.*?))?\s*\);/g, (match, msg, args) => {
    return "log('error', " + msg + (args ? ", { error: " + args + " }" : "") + ");";
  });
  
  fs.writeFileSync(filePath, c);
}

['api/sync.js', 'api/auth.js', 'api/email.js', 'api/notifyDeck.js'].forEach(updateLog);
