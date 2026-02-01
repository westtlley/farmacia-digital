# 🚀 Guia Rápido de Deploy

Este guia fornece instruções passo a passo para fazer deploy da Farmácia Digital.

## 📋 Pré-requisitos

- Conta no GitHub
- Conta no Cloudinary (gratuita)
- Conta no Vercel ou Render (gratuita)

## 🔧 Passo 1: Configurar Cloudinary

1. Acesse [https://cloudinary.com](https://cloudinary.com) e crie uma conta
2. No Dashboard, anote:
   - **Cloud Name** (ex: `dxyz123`)
   - **API Key** (ex: `123456789012345`)
   - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz`)
3. Vá em **Settings > Upload** e crie um Upload Preset:
   - Nome: `farmacia-upload`
   - Signing Mode: `Unsigned` (para uploads diretos do frontend)
   - Salve o preset

## 📦 Passo 2: Subir para o GitHub

```bash
# Na pasta do projeto
git init
git add .
git commit -m "Initial commit: Farmácia Digital"

# Criar repositório no GitHub primeiro, depois:
git remote add origin https://github.com/SEU-USUARIO/farmacia-digital.git
git branch -M main
git push -u origin main
```

## ▲ Passo 3: Deploy no Vercel

### Opção A: Via Dashboard (Recomendado)

1. Acesse [https://vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em **"Add New Project"**
4. Importe o repositório `farmacia-digital`
5. Configure as variáveis de ambiente:
   - `VITE_CLOUDINARY_CLOUD_NAME` = seu cloud name
   - `VITE_CLOUDINARY_API_KEY` = sua api key
   - `VITE_CLOUDINARY_API_SECRET` = sua api secret
6. Clique em **"Deploy"**
7. Aguarde o build (2-3 minutos)
8. Pronto! Seu site estará em `https://seu-projeto.vercel.app`

### Opção B: Via CLI

```bash
npm i -g vercel
vercel login
vercel
# Siga as instruções e configure as variáveis quando solicitado
```

## 🎨 Passo 4: Deploy no Render (Alternativa)

1. Acesse [https://render.com](https://render.com)
2. Faça login com GitHub
3. Clique em **"New +"** > **"Web Service"**
4. Conecte o repositório `farmacia-digital`
5. Render detectará automaticamente o `render.yaml`
6. Configure as variáveis de ambiente:
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_API_KEY`
   - `VITE_CLOUDINARY_API_SECRET`
   - `NODE_ENV=production`
7. Clique em **"Create Web Service"**
8. Aguarde o deploy (3-5 minutos)
9. Pronto! Seu site estará em `https://seu-projeto.onrender.com`

## ✅ Verificação

Após o deploy, verifique:

- [ ] Site carrega corretamente
- [ ] Imagens podem ser enviadas (se usar Cloudinary)
- [ ] Rotas funcionam (teste navegação entre páginas)
- [ ] localStorage funciona (dados persistem)

## 🔄 Atualizações Futuras

Para atualizar o site:

```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```

O Vercel/Render fará deploy automático a cada push!

## 🆘 Problemas Comuns

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o Node.js está na versão 18+

### Imagens não carregam
- Verifique se as variáveis de ambiente do Cloudinary estão corretas
- Confirme que o Upload Preset está configurado como "Unsigned"

### 404 em rotas
- Verifique se o `vercel.json` tem a configuração de rewrites
- No Render, confirme que o `render.yaml` está correto

### Variáveis de ambiente não funcionam
- No Vercel: Settings > Environment Variables
- No Render: Environment > Environment Variables
- Certifique-se de que as variáveis começam com `VITE_` para serem expostas no frontend

## 📞 Suporte

Para mais informações, consulte:
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Render](https://render.com/docs)
- [Documentação Cloudinary](https://cloudinary.com/documentation)
