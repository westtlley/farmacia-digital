# ✅ Comandos Corretos para o Seu Repositório

## Repositório GitHub
**URL:** https://github.com/FarmaciaEconomica/farmaciaEconomica

## Execute estes comandos no PowerShell:

### 1. Remover remote antigo (se existir)
```powershell
git remote remove origin
```

### 2. Adicionar o remote correto
```powershell
git remote add origin https://github.com/FarmaciaEconomica/farmaciaEconomica.git
```

### 3. Verificar se está correto
```powershell
git remote -v
```

Deve mostrar:
```
origin  https://github.com/FarmaciaEconomica/farmaciaEconomica.git (fetch)
origin  https://github.com/FarmaciaEconomica/farmaciaEconomica.git (push)
```

### 4. Adicionar todos os arquivos
```powershell
git add .
```

### 5. Fazer commit
```powershell
git commit -m "Initial commit: Farmácia Digital"
```

### 6. Fazer push
```powershell
git push -u origin main
```

---

## 📋 Todos os Comandos de Uma Vez (Copiar e Colar)

```powershell
git remote remove origin
git remote add origin https://github.com/FarmaciaEconomica/farmaciaEconomica.git
git add .
git commit -m "Initial commit: Farmácia Digital"
git push -u origin main
```

---

## ⚠️ Autenticação

Quando pedir senha, use um **Personal Access Token** (não sua senha normal).

Como criar:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Marque `repo`
4. Generate e copie o token
5. Use o token como senha
