# 📤 Como Subir o Projeto para o GitHub - Passo a Passo

## Pré-requisitos
✅ Você já tem conta no GitHub (já fez isso!)

---

## Passo 1: Criar o Repositório no GitHub

1. Acesse [https://github.com](https://github.com) e faça login
2. Clique no botão **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Preencha:
   - **Repository name:** `farmacia-digital` (ou outro nome de sua escolha)
   - **Description:** (opcional) "Aplicação de farmácia digital"
   - **Visibility:** Escolha **Public** ou **Private**
   - ⚠️ **NÃO marque** "Add a README file" (já temos um)
   - ⚠️ **NÃO marque** "Add .gitignore" (já temos um)
5. Clique em **"Create repository"**

**Anote o nome do repositório e seu usuário do GitHub!**

---

## Passo 2: Abrir o Terminal/PowerShell

1. Pressione `Windows + R`
2. Digite: `powershell`
3. Pressione Enter

---

## Passo 3: Navegar até a Pasta do Projeto

No PowerShell, digite:

```powershell
cd "C:\Users\POSITIVO\Downloads\Farmácia Digital\Farmácia Digital"
```

Pressione Enter.

**Verifique se está na pasta correta:**
```powershell
dir package.json
```

Se aparecer o arquivo `package.json`, você está no lugar certo! ✅

---

## Passo 4: Inicializar o Git

Execute estes comandos **um por vez**:

```powershell
git init
```

```powershell
git branch -M main
```

---

## Passo 5: Adicionar os Arquivos

```powershell
git add .
```

Este comando adiciona todos os arquivos do projeto ao Git.

---

## Passo 6: Fazer o Primeiro Commit

```powershell
git commit -m "Initial commit: Farmácia Digital"
```

Este comando salva uma "foto" do seu projeto.

---

## Passo 7: Conectar com o GitHub

**Substitua `SEU-USUARIO` pelo seu usuário do GitHub:**

```powershell
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

**Exemplo:** Se seu usuário for `joaosilva`, o comando seria:
```powershell
git remote add origin https://github.com/joaosilva/farmacia-digital.git
```

---

## Passo 8: Enviar para o GitHub (Push)

```powershell
git push -u origin main
```

---

## ⚠️ IMPORTANTE: Autenticação

Quando você executar o `git push`, o GitHub vai pedir:

### Opção A: Usuário e Senha (mais fácil)

- **Username:** Seu usuário do GitHub
- **Password:** ⚠️ **NÃO use sua senha normal!** Use um **Personal Access Token**

#### Como criar o Token:

1. No GitHub, clique na sua foto (canto superior direito)
2. Clique em **"Settings"**
3. No menu esquerdo, clique em **"Developer settings"** (no final)
4. Clique em **"Personal access tokens"**
5. Clique em **"Tokens (classic)"**
6. Clique em **"Generate new token"**
7. Selecione **"Generate new token (classic)"**
8. Dê um nome: `farmacia-digital` (ou qualquer nome)
9. Marque a opção **"repo"** (isso dá todas as permissões de repositório)
10. Role até o final e clique em **"Generate token"**
11. **⚠️ COPIE O TOKEN AGORA!** (você não verá novamente)
12. Use este token como **senha** quando o Git pedir

### Opção B: SSH (mais seguro, mas mais complexo)

Se preferir usar SSH, você precisa configurar chaves SSH primeiro.

---

## ✅ Verificar se Funcionou

1. Acesse seu repositório no GitHub: `https://github.com/SEU-USUARIO/farmacia-digital`
2. Você deve ver todos os arquivos do projeto lá!

---

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

### Erro: "failed to push some refs"
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Erro de autenticação
- Certifique-se de usar o **Personal Access Token** como senha
- Não use sua senha normal do GitHub

### Não consegue encontrar a pasta
- Abra o Windows Explorer
- Navegue até: `C:\Users\POSITIVO\Downloads\Farmácia Digital\Farmácia Digital`
- Clique com botão direito na pasta
- Selecione "Abrir no Terminal" ou "Abrir no PowerShell"

---

## 📋 Resumo dos Comandos (Copiar e Colar)

```powershell
cd "C:\Users\POSITIVO\Downloads\Farmácia Digital\Farmácia Digital"
git init
git branch -M main
git add .
git commit -m "Initial commit: Farmácia Digital"
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
git push -u origin main
```

**Lembre-se de substituir `SEU-USUARIO` pelo seu usuário do GitHub!**

---

## 🎉 Próximos Passos

Depois que o código estiver no GitHub:

1. **Vercel:** Importe o repositório e adicione as variáveis do Cloudinary
2. **Render:** Conecte o repositório (as variáveis já estão configuradas)
