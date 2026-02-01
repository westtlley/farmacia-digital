# 🚀 Como Subir o Projeto para o GitHub

## Passo a Passo

### 1. Abra o Terminal/PowerShell na pasta do projeto

Navegue até a pasta: `Farmácia Digital` (dentro de `Downloads\Farmácia Digital\Farmácia Digital`)

### 2. Execute os comandos abaixo (um por vez):

```bash
# Inicializar Git
git init

# Renomear branch para main
git branch -M main

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Initial commit: Farmácia Digital com configuração de deploy"

# Conectar com seu repositório GitHub (SUBSTITUA SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git

# Fazer push
git push -u origin main
```

### 3. Se o repositório já existe no GitHub

Se você já criou o repositório no GitHub, use:

```bash
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

Se já existe um remote, atualize:

```bash
git remote set-url origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

### 4. Autenticação

Se pedir usuário e senha:
- **Usuário:** Seu usuário do GitHub
- **Senha:** Use um **Personal Access Token** (não sua senha normal)

**Como criar Personal Access Token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Dê um nome (ex: "farmacia-digital")
4. Marque a opção `repo` (todas as permissões de repositório)
5. Generate token
6. **COPIE O TOKEN** (você não verá novamente!)
7. Use este token como senha quando fizer push

### 5. Verificar se funcionou

```bash
git status
git remote -v
```

Você deve ver o remote do GitHub configurado.

## ✅ Próximos Passos

Depois que o código estiver no GitHub:

1. **Vercel:**
   - Vá em [vercel.com](https://vercel.com)
   - Importe o repositório
   - Adicione as variáveis do Cloudinary
   - Deploy automático!

2. **Render:**
   - Vá em [render.com](https://render.com)
   - New Web Service
   - Conecte o repositório
   - Adicione as variáveis do Cloudinary (já fez isso!)
   - Deploy automático!

## 🆘 Problemas Comuns

**Erro: "remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

**Erro: "failed to push some refs"**
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

**Erro de autenticação**
- Use Personal Access Token ao invés de senha
- Ou configure SSH keys no GitHub
