# 📦 Comandos Git para Subir o Projeto

Execute estes comandos na pasta do projeto (`Farmácia Digital`):

## 1️⃣ Inicializar Git (se ainda não foi feito)

```bash
git init
git branch -M main
```

## 2️⃣ Adicionar todos os arquivos

```bash
git add .
```

## 3️⃣ Fazer o primeiro commit

```bash
git commit -m "Initial commit: Farmácia Digital com configuração de deploy"
```

## 4️⃣ Conectar com o repositório do GitHub

**Substitua `SEU-USUARIO` pelo seu usuário do GitHub:**

```bash
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

**OU se o repositório já existe e você quer atualizar:**

```bash
git remote set-url origin https://github.com/SEU-USUARIO/farmacia-digital.git
```

## 5️⃣ Fazer push para o GitHub

```bash
git push -u origin main
```

## 🔄 Para atualizações futuras

```bash
git add .
git commit -m "Descrição da atualização"
git push
```

## ⚠️ Se der erro de autenticação

Se pedir usuário/senha, você pode:

1. **Usar Personal Access Token:**
   - Vá em GitHub > Settings > Developer settings > Personal access tokens
   - Crie um token com permissão `repo`
   - Use o token como senha

2. **Ou configurar SSH:**
   ```bash
   git remote set-url origin git@github.com:SEU-USUARIO/farmacia-digital.git
   ```

## ✅ Verificar status

```bash
git status
git remote -v
```
