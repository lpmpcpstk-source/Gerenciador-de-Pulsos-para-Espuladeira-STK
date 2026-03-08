# 🚀 Guia de Deploy — Gerenciador de Pulso v4.0

## PARTE 1 — Supabase (Banco de Dados)

### 1.1 Criar conta e projeto

1. Acesse **https://supabase.com** → "Start your project"
2. Crie uma conta com seu e-mail (Gmail recomendado)
3. Clique em **"New project"**
4. Preencha:
   - **Name:** `gerenciador-pulso-stickfran`
   - **Database Password:** crie uma senha forte e salve
   - **Region:** South America (São Paulo)
5. Clique em **"Create new project"** e aguarde (~2 minutos)

---

### 1.2 Executar o SQL de configuração

1. No painel do Supabase, clique em **SQL Editor** (menu lateral)
2. Clique em **"New query"**
3. Abra o arquivo `sql/SUPABASE_SETUP_v5.sql` em um editor de texto
4. Selecione **todo o conteúdo** (Ctrl+A) e copie (Ctrl+C)
5. Cole no SQL Editor do Supabase (Ctrl+V)
6. Clique em **"Run"** (botão verde ▶ ou Ctrl+Enter)
7. Deve aparecer: ✅ *"Success. No rows returned."*

**Verificar se funcionou:**
- Clique em **Table Editor** no menu lateral
- Deve mostrar 3 tabelas: `usuarios`, `fichas_tecnicas`, `setups_log`
- Clique em `usuarios` → deve mostrar 2 usuários (leonardo, operador)
- Clique em `fichas_tecnicas` → deve mostrar 2 fichas (branca, vermelha)

---

### 1.3 Copiar as credenciais

1. No menu lateral, clique em **Settings** → **API**
2. Copie a **Project URL** (ex: `https://xyzxyz.supabase.co`)
3. Copie a **anon/public key** (começa com `sb_publishable_...`)
4. Abra o arquivo `js/db.js` e substitua:

```javascript
// ANTES:
const SUPABASE_URL      = 'https://tjaziadvyusarvhrnoby.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Eg4LXRVnFVqaVI9jPem_CQ_jG9UQMf_';

// DEPOIS (com suas credenciais):
const SUPABASE_URL      = 'https://SUA_URL.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SUA_CHAVE_AQUI';
```

---

## PARTE 2 — GitHub (Hospedagem)

### 2.1 Criar repositório

1. Acesse **https://github.com** → faça login
2. Clique no **"+"** → **"New repository"**
3. Preencha:
   - **Repository name:** `gerenciador-pulso-espuladeira`
   - Visibilidade: **Public** (necessário para GitHub Pages gratuito)
4. Clique em **"Create repository"**

---

### 2.2 Fazer upload dos arquivos

**Opção A — Pelo navegador (mais simples):**
1. No repositório recém-criado, clique em **"uploading an existing file"**
2. Selecione TODOS os arquivos e pastas da pasta do projeto
3. Clique em **"Commit changes"**

**Opção B — Pelo terminal (Git instalado):**
```bash
# Dentro da pasta do projeto:
git init
git add .
git commit -m "v4.0 — deploy inicial Stickfran"
git remote add origin https://github.com/SEU_USUARIO/gerenciador-pulso-espuladeira.git
git branch -M main
git push -u origin main
```

---

### 2.3 Ativar GitHub Pages

1. No repositório, clique em **Settings** (aba superior)
2. No menu lateral, clique em **Pages**
3. Em **"Source"**, selecione: **Deploy from a branch**
4. Em **"Branch"**, selecione: **main** e pasta **(root)**
5. Clique em **"Save"**
6. Aguarde 2-3 minutos
7. A URL aparecerá: `https://SEU_USUARIO.github.io/gerenciador-pulso-espuladeira/`

---

## PARTE 3 — Primeiro Acesso

1. Abra a URL do GitHub Pages no navegador
2. Login: `leonardo` / Senha: `pcp2026`
3. Verifique o indicador **BD Online** no canto superior esquerdo
4. Teste cadastrar uma nova ficha técnica
5. Acesse **Usuários** → troque as senhas padrão

---

## PARTE 4 — Manutenção

### Supabase pausado?
O plano gratuito pausa após 7 dias sem acesso.
- Acesse supabase.com → clique no projeto → **"Restore project"**
- Os dados ficam preservados, apenas o servidor hiberna

### Atualizar o sistema
```bash
# Faça as alterações nos arquivos e:
git add .
git commit -m "descrição da atualização"
git push
# O GitHub Pages atualiza automaticamente em 1-2 minutos
```

### Backup dos dados
- Acesse o sistema como Admin → aba **Fichas Técnicas** → **Backup**
- Clique em **Exportar JSON** → guarde o arquivo
- Recomendado: backup semanal armazenado no Google Drive

---

*Guia v4.0 — Stickfran Indústria e Comércio de Componentes*
