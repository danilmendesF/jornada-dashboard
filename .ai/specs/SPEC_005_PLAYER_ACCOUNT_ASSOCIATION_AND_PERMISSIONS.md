# 📝 SPEC_005: ASSOCIAÇÃO DE CONTA DE JOGADOR, TRAVA DE PERFIL ÚNICO E PERMISSÕES DE ESCOPO

- **Status**: 🟢 APROVADO E EM IMPLEMENTAÇÃO
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/auth.js`, `js/table.js`, `js/manager_forms.js`, `js/quicklog.js`, `index.html`, `api/auth.js`

---

## 1. Visão Geral & Motivação
Garante a associação segura de contas de e-mail com perfis históricos de jogadores, aplicando **trava de perfil único (mapeamento 1-para-1)** para impedir que dois usuários reinvindiquem o mesmo jogador, e **permissões restritas de edição ao próprio jogador autenticado**.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Associação Única de Jogador (Trava de Perfil Já Cadastrado)
- Ao abrir o formulário de cadastro, o sistema lista os jogadores existentes no histórico (`Danilo`, `GuiVaz`, `Victor`, `Lipe`).
- Se um jogador já tiver sido reinvindicado/cadastrado por outra conta (ex: `Danilo` já cadastrado por `danilo@jornada.com`), a opção `Danilo` é desabilitada no dropdown com a indicação `🔒 (Já Cadastrado)`.
- Isso impede duplicidade e garante que apenas 1 conta de usuário corresponda a 1 perfil de jogador.

### RF-02: Ferramenta "🔗 Vincular ao Meu Histórico"
- Se o usuário precisar alterar seu vínculo após o cadastro, ele pode vincular seu perfil nas configurações, respeitando a trava de que o nome desejado não esteja vinculado a outro usuário.

### RF-03: Permissões de Escopo de Edição (RBAC)
- **Tabela de Partidas (`js/table.js`)**: Botões ✏️ Editar e 🗑️ Deletar só aparecem se `r.Player` corresponder exatamente ao jogador vinculado à conta logada (`r.Player === currentUser.linkedPlayer || r.Player === currentUser.name`).
- **Quick Log & Formulários (`js/quicklog.js`)**: O campo "Player" é travado com o nome do jogador autenticado.
- **Validação de Servidor/Cliente (`js/manager_forms.js`)**: Bloqueio de tentativas de alteração em partidas de terceiros.

---

## 3. Critérios de Aceite & Validação
- [ ] Jogadores já cadastrados são bloqueados para novos cadastros.
- [ ] Mapeamento 1-para-1 estrito entre conta e perfil de jogador.
- [ ] Edição/exclusão na tabela restrita às partidas do próprio jogador.
- [ ] Suíte automatizada `node scripts/validate.cjs` aprovada em 100% dos testes.
