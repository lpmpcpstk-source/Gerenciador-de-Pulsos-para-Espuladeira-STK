# Gerenciador de Pulso — Espuladeira v4.0
**Stickfran Indústria e Comércio de Componentes**

---

## ⚡ Configuração Rápida (Novo Projeto)

### Passo 1 — Banco de Dados (Supabase)
1. Acesse supabase.com e crie um projeto
2. SQL Editor → New query → cole o arquivo `sql/SUPABASE_SETUP_v5.sql` → Run
3. Confirme: Table Editor deve mostrar tabelas `usuarios` e `fichas_tecnicas`

### Passo 2 — Credenciais no arquivo js/db.js
```javascript
const SUPABASE_URL      = 'COLE_SUA_PROJECT_URL';   // Settings → API → Project URL
const SUPABASE_ANON_KEY = 'COLE_SUA_ANON_KEY';       // Settings → API → anon public
```

### Passo 3 — GitHub Pages
```bash
git init && git add . && git commit -m "v4.0"
git remote add origin https://github.com/SEU_USUARIO/gerenciador-pulso-espuladeira.git
git push -u origin main
```
GitHub: Settings → Pages → Deploy from branch → main / (root)

---

## Usuários Padrão
| Login | Senha | Perfil |
|-------|-------|--------|
| leonardo | pcp2026 | Admin |
| operador | op1234 | Operador |
> Troque as senhas após o primeiro acesso em Gerenciar Usuários.

---

## Níveis de Acesso
| Funcionalidade | Admin | PCP | Operador |
|---|:---:|:---:|:---:|
| Consulta & Setup | ✅ | ✅ | ✅ |
| Análise Técnica | ✅ | ✅ | ✅ |
| Fichas Técnicas | ✅ | ✅ | ❌ |
| Backup & Exportação | ✅ | ❌ | ❌ |
| Gerenciar Usuários | ✅ | ❌ | ❌ |

---

## Supabase Plano Gratuito
- Pausa automática após 7 dias sem acesso → Reativar no painel (dados preservados)
- 500MB banco · 2M req/mês · sem custo

*v4.0 — Stickfran Indústria e Comércio de Componentes*
