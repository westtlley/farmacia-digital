# 🔧 Corrigir Problema do Git

## Problema Identificado
- Remote origin já existe
- Repositório não encontrado no GitHub

## Solução

Execute estes comandos **um por vez** no PowerShell:

### 1. Ver qual remote está configurado
```powershell
git remote -v
```

### 2. Remover o remote antigo
```powershell
git remote remove origin
```

### 3. Verificar se o repositório existe no GitHub

Acesse: https://github.com/FarmaciaEconomica/farmacia-digital

**Se o repositório NÃO existe:**
- Crie um novo repositório no GitHub com o nome `farmacia-digital`
- Ou use outro nome que você preferir

### 4. Adicionar o remote correto

**Opção A: Se o repositório existe:**
```powershell
git remote add origin https://github.com/FarmaciaEconomica/farmacia-digital.git
```

**Opção B: Se você criou com outro nome, substitua:**
```powershell
git remote add origin https://github.com/FarmaciaEconomica/NOME-DO-REPOSITORIO.git
```

### 5. Verificar se está correto
```powershell
git remote -v
```

Deve mostrar:
```
origin  https://github.com/FarmaciaEconomica/farmacia-digital.git (fetch)
origin  https://github.com/FarmaciaEconomica/farmacia-digital.git (push)
```

### 6. Adicionar todos os arquivos (se ainda não fez)
```powershell
git add .
```

### 7. Fazer commit (se ainda não fez)
```powershell
git commit -m "Initial commit: Farmácia Digital"
```

### 8. Fazer push
```powershell
git push -u origin main
```

---

## ⚠️ Se ainda der erro "repository not found"

### Verifique:
1. O repositório existe no GitHub? Acesse: https://github.com/FarmaciaEconomica
2. O nome está correto? (case-sensitive)
3. Você tem permissão para acessar o repositório?

### Se o repositório não existe:
1. Vá em https://github.com/new
2. Crie um novo repositório chamado `farmacia-digital`
3. **NÃO** marque "Add README" ou "Add .gitignore"
4. Clique em "Create repository"
5. Depois execute os comandos acima novamente

---

## ✅ Comandos Rápidos (Copiar e Colar)

```powershell
# Remover remote antigo
git remote remove origin

# Adicionar remote correto (ajuste o nome se necessário)
git remote add origin https://github.com/FarmaciaEconomica/farmacia-digital.git

# Verificar
git remote -v

# Adicionar arquivos
git add .

# Commit
git commit -m "Initial commit: Farmácia Digital"

# Push
git push -u origin main
```
