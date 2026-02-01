# Script para configurar Git e fazer push para GitHub
# Execute este script na pasta do projeto

Write-Host "🚀 Configurando Git para Farmácia Digital..." -ForegroundColor Green

# Verificar se git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git não está instalado. Por favor, instale o Git primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se já é um repositório git
if (Test-Path .git) {
    Write-Host "✓ Repositório Git já inicializado" -ForegroundColor Yellow
} else {
    Write-Host "📦 Inicializando repositório Git..." -ForegroundColor Cyan
    git init
    git branch -M main
}

# Adicionar todos os arquivos
Write-Host "📝 Adicionando arquivos ao Git..." -ForegroundColor Cyan
git add .

# Verificar se há mudanças para commitar
$status = git status --porcelain
if ($status) {
    Write-Host "💾 Fazendo commit inicial..." -ForegroundColor Cyan
    git commit -m "Initial commit: Farmácia Digital com configuração de deploy"
    Write-Host "✓ Commit realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Nenhuma mudança para commitar" -ForegroundColor Yellow
}

# Verificar se já existe remote
$remote = git remote -v
if ($remote) {
    Write-Host "✓ Remote já configurado:" -ForegroundColor Yellow
    Write-Host $remote
    Write-Host ""
    Write-Host "Para fazer push, execute:" -ForegroundColor Cyan
    Write-Host "  git push -u origin main" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "📡 Configure o remote do GitHub:" -ForegroundColor Cyan
    Write-Host "  git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git" -ForegroundColor White
    Write-Host ""
    Write-Host "Depois execute:" -ForegroundColor Cyan
    Write-Host "  git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
