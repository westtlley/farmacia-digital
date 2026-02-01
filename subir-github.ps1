# Script PowerShell para subir projeto para GitHub
# Execute: .\subir-github.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "🚀 Configurando Git para Farmácia Digital..." -ForegroundColor Green
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na pasta do projeto" -ForegroundColor Red
    Write-Host "   Pasta esperada: C:\Users\POSITIVO\Downloads\Farmácia Digital\Farmácia Digital" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Navegue até a pasta e execute:" -ForegroundColor Cyan
    Write-Host "   cd 'C:\Users\POSITIVO\Downloads\Farmácia Digital\Farmácia Digital'" -ForegroundColor White
    Write-Host "   .\subir-github.ps1" -ForegroundColor White
    pause
    exit 1
}

Write-Host "✓ Pasta correta detectada" -ForegroundColor Green
Write-Host ""

# Verificar se git está instalado
try {
    $gitVersion = git --version
    Write-Host "✓ Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado. Instale em: https://git-scm.com" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""

# Inicializar Git se não existir
if (-not (Test-Path ".git")) {
    Write-Host "📦 Inicializando repositório Git..." -ForegroundColor Cyan
    git init
    git branch -M main
    Write-Host "✓ Repositório inicializado" -ForegroundColor Green
} else {
    Write-Host "✓ Repositório Git já existe" -ForegroundColor Yellow
}

Write-Host ""

# Adicionar arquivos
Write-Host "📝 Adicionando arquivos ao Git..." -ForegroundColor Cyan
git add .
Write-Host "✓ Arquivos adicionados" -ForegroundColor Green

Write-Host ""

# Verificar se há mudanças
$status = git status --porcelain
if ($status) {
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m "Initial commit: Farmácia Digital com configuração de deploy"
    Write-Host "✓ Commit realizado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Nenhuma mudança para commitar" -ForegroundColor Yellow
}

Write-Host ""

# Configurar remote
Write-Host "📡 Configurando remote do GitHub..." -ForegroundColor Cyan
Write-Host ""

$githubUser = Read-Host "Digite seu usuário do GitHub"
$repoName = Read-Host "Digite o nome do repositório (ou Enter para 'farmacia-digital')"

if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "farmacia-digital"
}

$remoteUrl = "https://github.com/$githubUser/$repoName.git"

# Remover remote existente se houver
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠️  Remote existente encontrado: $existingRemote" -ForegroundColor Yellow
    $remove = Read-Host "Deseja substituir? (S/N)"
    if ($remove -eq "S" -or $remove -eq "s") {
        git remote remove origin
    }
}

if (-not (git remote get-url origin 2>$null)) {
    git remote add origin $remoteUrl
    Write-Host "✓ Remote configurado: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "✓ Remote já configurado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Fazendo push para o GitHub..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE sobre autenticação:" -ForegroundColor Yellow
Write-Host "   - Usuário: $githubUser" -ForegroundColor White
Write-Host "   - Senha: Use um Personal Access Token (não sua senha normal)" -ForegroundColor White
Write-Host ""
Write-Host "   Como criar token:" -ForegroundColor Cyan
Write-Host "   1. GitHub → Settings → Developer settings" -ForegroundColor White
Write-Host "   2. Personal access tokens → Tokens (classic)" -ForegroundColor White
Write-Host "   3. Generate new token (classic)" -ForegroundColor White
Write-Host "   4. Marque 'repo' (todas as permissões)" -ForegroundColor White
Write-Host "   5. Generate e COPIE o token" -ForegroundColor White
Write-Host "   6. Use o token como senha" -ForegroundColor White
Write-Host ""

try {
    git push -u origin main
    Write-Host ""
    Write-Host "✅ Sucesso! Código enviado para o GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Vercel: Importe o repositório e adicione variáveis do Cloudinary" -ForegroundColor White
    Write-Host "2. Render: Conecte o repositório (variáveis já configuradas)" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push. Verifique:" -ForegroundColor Red
    Write-Host "   - Se o repositório existe no GitHub" -ForegroundColor Yellow
    Write-Host "   - Se você tem permissão" -ForegroundColor Yellow
    Write-Host "   - Se está usando Personal Access Token como senha" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Tente executar manualmente:" -ForegroundColor Cyan
    Write-Host "   git push -u origin main" -ForegroundColor White
}

Write-Host ""
pause
