# 📸 Guia de Imagens Padrão para Medicamentos

## Como Funciona

O sistema agora aplica **automaticamente** imagens padrão com tarjas regulamentares para produtos sem foto.

---

## 🎯 Tipos de Imagens Padrão

### 1. **Medicamento Genérico com Receita** 🟨🔴
- **Tarja Amarela**: "Medicamento Genérico"
- **Tarja Vermelha**: "VENDA SOB PRESCRIÇÃO MÉDICA"
- **Quando aparece**: 
  - ✅ `is_generic = true`
  - ✅ `requires_prescription = true`

### 2. **Medicamento Genérico Isento** 🟨🔵
- **Tarja Amarela**: "Medicamento Genérico"
- **Tarja Azul**: "ISENTO DE PRESCRIÇÃO"
- **Quando aparece**: 
  - ✅ `is_generic = true`
  - ❌ `requires_prescription = false`

### 3. **Medicamento de Referência/Similar com Receita** 🔴
- **Tarja Vermelha**: "VENDA SOB PRESCRIÇÃO MÉDICA"
- **Quando aparece**: 
  - ❌ `is_generic = false`
  - ✅ `requires_prescription = true`

### 4. **Medicamento Isento** 🔵
- **Tarja Azul**: "ISENTO DE PRESCRIÇÃO"
- **Quando aparece**: 
  - ❌ `is_generic = false`
  - ❌ `requires_prescription = false`

---

## ⚙️ Como Configurar no Admin

### 1. Adicionar/Editar Produto

No painel **Admin → Produtos → Adicionar/Editar**:

```
┌─────────────────────────────────────┐
│ Informações do Produto              │
├─────────────────────────────────────┤
│ Nome: [Digite o nome do remédio]    │
│ Preço: [Digite o preço]             │
│ Imagem: [Opcional - deixe vazio]    │  ← Se vazio, usa imagem padrão
│                                     │
│ ☐ É Genérico                        │  ← Ativar para genéricos
│ ☐ Exige Receita                     │  ← Ativar se precisa receita
│ ☐ É Antibiótico                     │
│ ☐ É Controlado                      │
└─────────────────────────────────────┘
```

### 2. Exemplos Práticos

**Exemplo 1: Paracetamol Genérico (isento)**
```
Nome: Paracetamol 500mg
É Genérico: ✅ SIM
Exige Receita: ❌ NÃO
Imagem: (vazio)
→ Resultado: Tarja AMARELA + AZUL
```

**Exemplo 2: Amoxicilina Genérica (antibiótico)**
```
Nome: Amoxicilina 500mg
É Genérico: ✅ SIM
É Antibiótico: ✅ SIM (auto-marca "Exige Receita")
Imagem: (vazio)
→ Resultado: Tarja AMARELA + VERMELHA
```

**Exemplo 3: Dorflex (referência, isento)**
```
Nome: Dorflex
É Genérico: ❌ NÃO
Exige Receita: ❌ NÃO
Imagem: (vazio)
→ Resultado: Tarja AZUL
```

**Exemplo 4: Rivotril (controlado)**
```
Nome: Rivotril 2mg
É Genérico: ❌ NÃO
É Controlado: ✅ SIM (auto-marca "Exige Receita")
Imagem: (vazio)
→ Resultado: Tarja VERMELHA
```

---

## 🎨 Quando a Imagem Padrão Aparece?

✅ **SIM** - Aparece quando:
- Campo `image_url` está vazio
- Campo `image` está vazio
- URL da imagem está quebrada/inválida

❌ **NÃO** - Não aparece quando:
- Produto tem `image_url` válida
- Produto tem `image` válida

---

## 🔄 Prioridade de Imagens

```
1. image_url (cadastrada no produto)
   ↓ (se vazio)
2. image (cadastrada no produto)
   ↓ (se vazio)
3. Imagem padrão baseada em:
   - is_generic
   - requires_prescription
```

---

## 💡 Dicas Importantes

1. **Não precisa fazer nada**: O sistema aplica automaticamente
2. **Sempre legal**: As tarjas seguem a regulamentação ANVISA
3. **Profissional**: Mesmo sem foto, o site fica organizado
4. **Fácil migração**: Adicione fotos reais depois, quando quiser

---

## 🚀 Benefícios

✅ **Visual profissional** mesmo sem fotos
✅ **Conformidade regulatória** automática
✅ **Facilita cadastro inicial** de produtos
✅ **Cliente sabe** se precisa receita só pela tarja
✅ **Economia de tempo** no cadastro

---

## 📝 Checklist Rápido

Ao cadastrar um medicamento:

- [ ] Nome do produto
- [ ] Preço
- [ ] Categoria
- [ ] **Marcar se é Genérico**
- [ ] **Marcar se Exige Receita/Antibiótico/Controlado**
- [ ] *(Opcional)* Adicionar imagem própria

**Pronto!** O sistema cuida do resto.

---

## 🎯 Onde as Imagens Aparecem?

- ✅ Home (produtos em destaque)
- ✅ Categorias
- ✅ Busca
- ✅ Promoções
- ✅ Favoritos
- ✅ Carrinho
- ✅ Página do produto
- ✅ Chat de atendimento

---

## 🛠️ Arquivos Modificados

- `src/utils/productImages.js` - Lógica de imagens padrão
- `src/components/pharmacy/ProductCard.jsx` - Usa as imagens padrão
- `src/pages/AdminProducts.jsx` - Já tinha os campos necessários

---

**Última atualização**: 26/01/2026
