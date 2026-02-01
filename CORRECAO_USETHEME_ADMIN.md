# 🔧 Correção: Erro useTheme em Páginas Admin

## ❌ Problema

```
Uncaught Error: useTheme must be used within ThemeProvider
    at useTheme (ThemeProvider.jsx:10:11)
    at AdminOrders (AdminOrders.jsx:114:17)
```

**Causa:** 
A página `AdminOrders.jsx` estava importando e usando o hook `useTheme()`, mas as páginas admin não estão envolvidas pelo `ThemeProvider` (elas retornam direto sem o layout de cliente no `Layout.jsx`).

**Por que acontece:**
```javascript
// Em Layout.jsx (linhas 139-144)
const isAdminPage = currentPageName?.startsWith('Admin');

if (isAdminPage) {
  return <>{children}</>;  // Retorna SEM ThemeProvider
}

// Se não for admin
return (
  <ThemeProvider>
    <LayoutContent children={children} currentPageName={currentPageName} />
  </ThemeProvider>
);
```

As páginas admin **não têm** acesso ao `ThemeProvider`, portanto não podem usar `useTheme()`.

---

## ✅ Solução Aplicada

### 1. **AdminOrders.jsx**

**Removido:**
```javascript
import { useTheme } from '@/components/pharmacy/ThemeProvider';

export default function AdminOrders() {
  const theme = useTheme(); // ❌ Causava erro
  // ...
}
```

**Substituído por:**
```javascript
// Usar settings que já está sendo buscado via useQuery

// Antes:
theme.pharmacyName || 'Farmácia'
theme.whatsapp
theme.phone

// Depois:
settings?.pharmacy_name || 'Farmácia'
settings?.whatsapp
settings?.phone
```

**Locais corrigidos:**
- Linha 172: `theme.pharmacyName` → `settings?.pharmacy_name`
- Linha 239: `theme.whatsapp` → `settings?.whatsapp`
- Linha 738: `theme.phone` → `settings?.phone`

### 2. **AdminProducts.jsx**

**Removido importação não utilizada:**
```javascript
import { useTheme } from '@/components/pharmacy/ThemeProvider'; // ❌ Removido
```

O arquivo já estava usando `JSON.parse(localStorage.getItem('pharmacyTheme'))` corretamente, apenas a importação não utilizada foi removida.

---

## 📋 Padrão para Páginas Admin

### ✅ **CORRETO - Usar settings via useQuery:**
```javascript
const { data: settings } = useQuery({
  queryKey: ['pharmacySettings'],
  queryFn: async () => {
    const data = await base44.entities.PharmacySettings.list('', 1);
    return data && data.length > 0 ? data[0] : null;
  }
});

// Usar assim:
const pharmacyName = settings?.pharmacy_name || 'Farmácia';
const whatsapp = settings?.whatsapp;
const primaryColor = settings?.primary_color || '#059669';
```

### ❌ **INCORRETO - NÃO usar useTheme em páginas admin:**
```javascript
import { useTheme } from '@/components/pharmacy/ThemeProvider';

export default function AdminSomePage() {
  const theme = useTheme(); // ❌ ERRO! ThemeProvider não disponível
  // ...
}
```

### ✅ **ALTERNATIVA - Usar localStorage diretamente:**
```javascript
// Se precisar do tema apenas pontualmente
const theme = JSON.parse(localStorage.getItem('pharmacyTheme') || '{}');
const pharmacyName = theme.pharmacyName || 'Farmácia';
```

---

## 🎯 Resultado

✅ **AdminOrders.jsx** → Funcionando sem erros  
✅ **AdminProducts.jsx** → Importação limpa  
✅ **Todas páginas Admin** → Sem uso de useTheme  
✅ **Console limpo** → Sem erros de ThemeProvider  

---

## 📝 Checklist para Novas Páginas Admin

Ao criar uma nova página admin:

- [ ] **NÃO** importar `useTheme` de ThemeProvider
- [ ] **NÃO** usar `const theme = useTheme()`
- [ ] **SIM** buscar settings via `useQuery` se precisar
- [ ] **SIM** usar `localStorage` se precisar do tema pontualmente
- [ ] Nomear arquivo com prefixo `Admin*` (ex: `AdminOrders.jsx`)
- [ ] Não usar componentes que dependem de ThemeProvider (Header, Footer, VirtualAssistant)

---

## 🔍 Páginas Admin Verificadas

Todas as páginas admin foram verificadas e estão **LIVRES** de uso de `useTheme`:

✅ AdminCustomers.jsx  
✅ AdminDashboard.jsx  
✅ AdminFinancial.jsx  
✅ AdminImportHistory.jsx  
✅ AdminImportProducts.jsx  
✅ AdminMedications.jsx  
✅ AdminOrders.jsx ← **Corrigido**  
✅ AdminPrescriptions.jsx  
✅ AdminProducts.jsx ← **Limpo**  
✅ AdminPromotions.jsx  
✅ AdminReports.jsx  
✅ AdminSettings.jsx  
✅ AdminStoreEditor.jsx  
✅ AdminVisualEditor.jsx  

---

## 🚀 Status Final

**Problema:** ❌ AdminOrders quebrava com erro de ThemeProvider  
**Solução:** ✅ Removido useTheme, usando settings via useQuery  
**Resultado:** ✅ Todas as páginas admin funcionando perfeitamente  

**Sistema pronto para uso!** 🎉
