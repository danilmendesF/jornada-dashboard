# SPEC_036_REMOVE_SYNC_UI: Limpeza da Interface de Sincronização Manual

## 1. O Contexto
Com a implementação da SPEC_035, o Jornada Dashboard evoluiu para um modelo de "Banco de Dados Global Automático" (Shared Database nativo).
Como todos os usuários estão agora perenemente conectados à mesma base de dados através de auto-inscrição de token na inicialização da página, a interface de Sincronização Manual (o botão "Sincronizar" no cabeçalho e o Modal de Sincronização) tornou-se obsoleta.

## 2. O Risco Atual
Deixar o Modal de Sincronização acessível na interface cria um risco para os jogadores convidados: se alguém abrir a engrenagem, gerar uma nova chave e clicar em habilitar, esse usuário quebrará a configuração automática implantada e se isolará em um novo banco de dados vazio, retornando ao problema original resolvido na SPEC_035.

## 3. A Solução
Para garantir uma experiência limpa (SaaS-like) onde o multiplayer "simplesmente funciona" no background:
1. **Remover o Botão de Cabeçalho**: O botão `<button id="btnOpenSync">` (incluindo seu indicador de status `headerSyncDot`) será excluído permanentemente do `index.html`.
2. **Remover o Modal**: O bloco `<div id="modalSync">` será varrido do HTML.
3. **Refatorar o Core (`manager.js`)**: A função `initSyncUI` será esvaziada de todos os event listeners inativos (`btnEnableSync`, `btnDisableSync`, etc) para economizar bytes no bundle. A função se limitará a rodar a auto-configuração do token (`team_default_sync`), instigar o download e ligar o loop de 15 segundos.

## 4. Plano de Testes (QA)
- `node scripts/validate.cjs` garantirá que o HTML e os JS continuem em conformidade, sem referências perdidas causando crashes.
