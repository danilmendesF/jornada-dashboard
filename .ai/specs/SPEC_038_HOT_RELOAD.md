# SPEC_038_HOT_RELOAD: Atualização Automática de Sessões Abertas (Hot Reload)

## 1. O Problema
Atualmente, se um usuário deixa a aba do Jornada Dashboard aberta no celular ou no PC por vários dias, ele não recebe as atualizações de código. Como o painel é um SPA (Single Page Application) cujo arquivo `index.html` e `app.min.js` ficam em cache, o navegador só puxa a nova versão do código se o usuário manualmente recarregar a página (F5) ou fechar/abrir a aba. 
Quando lançamos novos Deploys na Vercel (ex: da `v1.0.17` para a `v1.0.18`), sessões abertas ficam defasadas, causando bugs de inconsistência de interface.

## 2. A Solução (Version Checker)
Para forçar a atualização remota de todos os clientes instantaneamente:
1. **Injeção no Build:** O script `scripts/bump_version.cjs` passará a gerar um arquivo estático `version.json` na raiz do projeto contendo a versão exata do recém-compilado bundle (ex: `{"version": "1.0.18"}`).
2. **Checagem de Batimento Cardíaco (Heartbeat):** O mecanismo de sincronização automática `pullFromCloud()`, que roda a cada 15 segundos em todas as abas ativas, fará uma micro-requisição (com bypass de cache via `?t=timestamp`) para ler o `version.json` hospedado na Vercel.
3. **Auto-Refresh:** Se a versão apontada pelo arquivo `version.json` da Vercel for diferente da versão que o cliente está rodando atualmente (lida do rodapé do `index.html`), o cliente exibirá um balão flutuante (Toast) informando "Nova versão detectada! Atualizando o painel..." e acionará `location.reload(true)` após 2.5 segundos, forçando o navegador a baixar os novos scripts instantaneamente, sem que o usuário faça nada.

## 3. Benefícios
- **Desligamento Suave de Clientes Antigos:** Nenhuma aba ativa do seu time rodará código defasado por mais de 15 segundos após um deploy de produção.
- **Transparência:** O Toast avisa o usuário do motivo do recarregamento repentino, evitando confusão.

## 4. Plano de Teste (QA Agent)
1. Rodar `validate.cjs` para atestar sintaxe.
2. Certificar que o `bump_version.cjs` consiga gerar um JSON limpo.
