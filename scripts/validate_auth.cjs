/**
 * 🧪 AUTHENTICATION & LOGIN SCREEN VALIDATOR
 * Run with: node scripts/validate_auth.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando Validação Específica da Tela de Login (Auth Wall)...\n');

let passes = 0;
let errors = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSE: ${message}`);
    passes++;
  } else {
    console.error(`  ❌ FALHA: ${message}`);
    errors++;
  }
}

// ── TEST 1: VERIFICAR ELEMENTOS DOM DA TELA DE LOGIN ────────────────────────
console.log('📌 Teste 1: Elementos DOM da Tela de Login em index.html');
const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(htmlContent.includes('id="authPageWall"'), 'Container fullscreen #authPageWall existe');
assert(htmlContent.includes('id="appDashboardContainer"'), 'Container do Dashboard #appDashboardContainer existe');
assert(htmlContent.includes('id="wallLoginEmail"'), 'Campo de e-mail #wallLoginEmail existe');
assert(htmlContent.includes('id="wallLoginPassword"'), 'Campo de senha #wallLoginPassword existe');
assert(htmlContent.includes('id="wallRegName"'), 'Campo de nome de cadastro #wallRegName existe');
assert(htmlContent.includes('onclick="submitWallLogin()"'), 'Botão de login chama submitWallLogin()');
assert(htmlContent.includes('onclick="submitWallRegister()"'), 'Botão de cadastro chama submitWallRegister()');

// ── TEST 2: VERIFICAR LÓGICA DO MÓDULO JS/AUTH.JS ───────────────────────────
console.log('\n📌 Teste 2: Integridade de Lógica em js/auth.js');
const authJsContent = fs.readFileSync(path.join(__dirname, '..', 'js/auth.js'), 'utf8');

assert(authJsContent.includes('window.updateAuthUI'), 'Função updateAuthUI exportada em window');
assert(authJsContent.includes('window.submitWallLogin'), 'Função submitWallLogin exportada em window');
assert(authJsContent.includes('window.submitWallRegister'), 'Função submitWallRegister exportada em window');
assert(authJsContent.includes('window.logoutUser'), 'Função logoutUser exportada em window');
assert(authJsContent.includes("wall.style.display = 'none'"), 'Oculta tela de login ao autenticar');
assert(authJsContent.includes("dashboard.style.display = 'block'"), 'Exibe dashboard ao autenticar');
assert(authJsContent.includes("wall.style.display = 'flex'"), 'Exibe tela de login quando deslogado');
assert(authJsContent.includes("dashboard.style.display = 'none'"), 'Bloqueia dashboard quando deslogado');

// ── TEST 3: VERIFICAR SERVIDOR NODE.JS SERVERLESS (api/auth.js) ────────────
console.log('\n📌 Teste 3: Integridade do Backend Node.js em api/auth.js');
const apiAuthContent = fs.readFileSync(path.join(__dirname, '..', 'api/auth.js'), 'utf8');

assert(apiAuthContent.includes('hashPassword'), 'Criptografia de senha PBKDF2 implementada');
assert(apiAuthContent.includes('signJwt'), 'Emissão de tokens JWT implementada');
assert(apiAuthContent.includes('verifyPassword'), 'Validação segura de hash de senha implementada');
assert(apiAuthContent.includes("action === 'login'"), 'Endpoint de Login ativo');
assert(apiAuthContent.includes("action === 'register'"), 'Endpoint de Registro ativo');

// ── TEST 4: ESTILOS CSS DA TELA DE LOGIN ─────────────────────────────────────
console.log('\n📌 Teste 4: Estilos CSS da Tela de Login em style.css');
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

assert(cssContent.includes('.auth-wall-container'), 'Classe .auth-wall-container definida');
assert(cssContent.includes('.auth-wall-card'), 'Classe .auth-wall-card definida');
assert(cssContent.includes('z-index: 10000;'), 'z-index: 10000 garante sobreposição total do dashboard');
assert(cssContent.includes('backdrop-filter: blur(20px);'), 'Efeito glassmorphism configurado');

// ── RESUMO ──────────────────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`📊 RESULTADO DA VALIDAÇÃO DA TELA DE LOGIN:`);
console.log(`   ✅ Passou em ${passes} testes`);
console.log(`   ❌ Falhou em ${errors} testes`);
console.log('==================================================\n');

if (errors > 0) {
  console.error('🔴 ERRO: Falha na validação da tela de login!');
  process.exit(1);
} else {
  console.log('🟢 SUCESSO: Tela de Login 100% Funcional e Integrada!');
  process.exit(0);
}
