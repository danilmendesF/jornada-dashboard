# SPEC_037_FORCE_GLOBAL_TOKEN: Forçar Migração para o Banco Global

## 1. O Problema
Na SPEC_035 e 036, implementamos a conexão automática e removemos a interface visual de sincronização.
Entretanto, a lógica em `initSyncUI` no `manager.js` foi escrita assim:
```javascript
  let curToken = localStorage.getItem('jornada_sync_token');
  if (!curToken) {
    curToken = 'team_default_sync';
    ...
```
Isso significa que novos usuários (ou janelas anônimas) recebem a chave `team_default_sync` e entram no banco global.
Mas usuários antigos (como o Danilo na janela principal) já tinham alguma chave de sincronismo gravada no cache do navegador (por exemplo, uma chave antiga ou chave de testes). Como o código só aplica a chave nova se ela estiver vazia, o Danilo continuou preso no banco de dados antigo dele! 
E como removemos a UI na SPEC_036, ele perdeu a capacidade de colar a chave nova manualmente.

## 2. A Solução
Para garantir que o Dashboard funcione 100% como um SaaS centralizado ("MMO"):
1. O `manager.js` deve ignorar e sobrescrever de forma irreversível qualquer token antigo que os jogadores tenham no cache.
2. O sistema deve cravar `team_default_sync` (ou qualquer constante global oficial) para todos, sem exceção.
```javascript
function initSyncUI() {
  const curToken = 'team_default_sync';
  localStorage.setItem('jornada_sync_token', curToken);
  pullFromCloud(true);
  startSyncInterval();
}
```

Dessa forma, assim que o Danilo recarregar a janela normal dele, o navegador dele enviará todos os "12 players" e as milhares de partidas dele diretamente para o `team_default_sync`. 
Na sequência, a janela anônima finalmente conseguirá baixar a lista inteira de jogadores, pois estarão todos compartilhando a mesma chave.

## 3. Plano de Teste (QA Agent)
1. Executar `validate.cjs`.
2. Assegurar que a variável global não afeta as verificações de Auth (o auth token JWT continua intacto, apenas a chave do banco Redis foi unificada).
