const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const specsDir = path.join(rootDir, 'docs', 'specs');
const VALID_STATUSES = ['DRAFT', 'PROPOSED', 'ACCEPTED', 'IMPLEMENTED', 'VERIFIED', 'DEPRECATED', 'SUPERSEDED'];

console.log('Executando Validacao Formal de Ciclo de Vida de Specs (SDD 2.0)...');

const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
let errors = 0;
let validated = 0;

specFiles.forEach(file => {
  const filePath = path.join(specsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    console.error(`  [FAIL] ${file}: Ausencia de frontmatter YAML estruturado!`);
    errors++;
    return;
  }

  const frontmatter = match[1];
  const metadata = {};
  frontmatter.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      if (key) metadata[key] = val;
    }
  });

  const required = ['id', 'title', 'status', 'version', 'tested_by'];
  for (const req of required) {
    if (!metadata[req]) {
      console.error(`  [FAIL] ${file}: Campo obrigatorio '${req}' ausente no frontmatter!`);
      errors++;
      return;
    }
  }

  if (!VALID_STATUSES.includes(metadata.status)) {
    console.error(`  [FAIL] ${file}: Status '${metadata.status}' invalido!`);
    errors++;
    return;
  }

  if (metadata.tested_by) {
    const testPath = path.join(rootDir, metadata.tested_by);
    if (!fs.existsSync(testPath)) {
      console.error(`  [FAIL] ${file}: Arquivo de teste referenciado '${metadata.tested_by}' nao existe!`);
      errors++;
      return;
    }
  }

  console.log(`  [PASS] ${metadata.id} (${file}): Status=${metadata.status}, Version=${metadata.version}, TestedBy=${metadata.tested_by}`);
  validated++;
});

console.log(`\nTotal de especificacoes validadas: ${validated} | Falhas: ${errors}`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('Todas as especificacoes estao em conformidade com o Ciclo de Vida do SDD 2.0!\n');
  process.exit(0);
}
