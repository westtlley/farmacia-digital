@echo off
chcp 65001 >nul
echo 🚀 Configurando Git para Farmácia Digital...
echo.

REM Verificar se está na pasta correta
if not exist "package.json" (
    echo ❌ Erro: Execute este script na pasta do projeto (Farmácia Digital)
    pause
    exit /b 1
)

REM Inicializar Git se não existir
if not exist ".git" (
    echo 📦 Inicializando repositório Git...
    git init
    git branch -M main
    echo ✓ Repositório inicializado
) else (
    echo ✓ Repositório Git já existe
)

echo.
echo 📝 Adicionando arquivos...
git add .

echo.
echo 💾 Fazendo commit...
git commit -m "Initial commit: Farmácia Digital com configuração de deploy"

echo.
echo 📡 Configurando remote do GitHub...
echo.
echo ⚠️  IMPORTANTE: Substitua SEU-USUARIO pelo seu usuário do GitHub!
echo.
set /p GITHUB_USER="Digite seu usuário do GitHub: "
set /p REPO_NAME="Digite o nome do repositório (ou pressione Enter para 'farmacia-digital'): "

if "%REPO_NAME%"=="" set REPO_NAME=farmacia-digital

git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo.
echo ✓ Remote configurado: https://github.com/%GITHUB_USER%/%REPO_NAME%.git
echo.
echo 🚀 Fazendo push para o GitHub...
echo.
echo ⚠️  Se pedir autenticação:
echo    - Usuário: %GITHUB_USER%
echo    - Senha: Use um Personal Access Token (não sua senha normal)
echo.
echo    Como criar token: GitHub ^> Settings ^> Developer settings ^> Personal access tokens
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Sucesso! Código enviado para o GitHub!
    echo.
    echo Próximos passos:
    echo 1. Vercel: Importe o repositório e adicione variáveis do Cloudinary
    echo 2. Render: Conecte o repositório (variáveis já estão configuradas)
) else (
    echo.
    echo ❌ Erro ao fazer push. Verifique:
    echo    - Se o repositório existe no GitHub
    echo    - Se você tem permissão
    echo    - Se está usando Personal Access Token como senha
)

echo.
pause
