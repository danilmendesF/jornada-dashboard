# SPEC_035_FIX_GLOBAL_SYNC: Correção da Sincronização de Jogadores

## 1. O Problema
Jogadores convidados estão acessando o painel e enxergando apenas os dados padrão do sistema (`GuiVaz`, `Victor`, `Lipe`). 
Isso acontece por dois motivos algorítmicos que estão isolando os jogadores:
1. **Sync Desligado por Padrão:** Quando um jogador abre o site pela primeira vez no celular/PC dele, o `manager.js` verifica se ele tem uma "Chave de Sincronização" (Token) salva. Como ele não tem, o painel assume o modo **Offline**, não executando a função `pullFromCloud()`.
2. **Isolamento de Banco via Login (Private Buckets):** Atualmente, se o jogador faz login (gerando um JWT Auth), a função `getSyncUrl` (em `sync_cloud.js`) remove a chave do time e a API (`api/sync.js`) isola esse jogador em um banco de dados privado (ex: `user_joao@gmail.com`). Como o banco do Joao é novo, ele está vazio e ele nunca verá os decks/partidas globais do time.

## 2. A Solução
Como o Jornada Dashboard é um painel de Time, o banco de dados deve ser global (Shared Database).
1. **Auto-Enable Sync:** No `manager.js`, caso o usuário não tenha uma chave de sincronização configurada, vamos definir automaticamente a chave global (`team_default_sync`) e iniciar a sincronização no momento em que ele abre o site. Ninguém precisará clicar no botão de configuração "⚙️".
2. **Fim do Isolamento de Auth:** O sistema de login (`auth.js`) servirá exclusivamente para identificar quem está logado (e proteger ações destrutivas), mas **todos** consultarão o mesmo banco global. O `api/sync.js` será alterado para não sobrescrever a chave do banco com o e-mail do jogador, garantindo que o `team_default_sync` (ou a chave configurada pelo dono) seja sempre a fonte da verdade para o esquadrão inteiro.

## 3. Plano de Testes
1. O QA Agent validará os ajustes em `sync_cloud.js`, `api/sync.js` e `manager.js`.
