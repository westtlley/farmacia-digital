# 📚 Guia Completo: Como Alimentar a Base de Medicamentos

## 🎯 Opções Disponíveis

### 1. ✅ **CARREGAR MEDICAMENTOS COMUNS** (Mais Rápido)

**Como usar:**
1. Acesse: Admin → Medicamentos
2. Clique em "Carregar Comuns"
3. Pronto! 11 medicamentos populares serão adicionados

**Medicamentos incluídos:**
- Dipirona, Paracetamol, Ibuprofeno
- Omeprazol, Amoxicilina, Losartana
- Dorflex, Aspirina, Rivotril, Neosaldina, Buscopan

---

### 2. 📤 **IMPORTAR DE ARQUIVO CSV** (Recomendado para Lote)

**Passo a passo:**

1. **Baixe o template:**
   - Vá em: `public/templates/medicamentos_template.csv`
   - Ou exporte sua base atual como CSV

2. **Formato do CSV:**
```csv
nome,principio_ativo,classe,indicacoes,contraindicacoes,efeitos,dosagens,generico_disponivel,requer_receita
Dorflex,Dipirona + Orfenadrina + Cafeína,Analgésico,Dor muscular;Dor de cabeça,Glaucoma;Miastenia,Sonolência;Boca seca,35mg+50mg+300mg,false,false
```

**Regras:**
- Campos múltiplos: separar com `;` (ponto e vírgula)
- Exemplo: `Dor;Febre;Inflamação`
- Booleanos: `true` ou `false`

3. **Importar:**
   - Admin → Medicamentos → Botão "Importar"
   - Selecione seu arquivo `.csv`
   - Aguarde confirmação

---

### 3. 📥 **IMPORTAR DE JSON** (Programático)

**Formato JSON:**
```json
[
  {
    "name": "Dorflex",
    "activeIngredient": "Dipirona + Orfenadrina + Cafeína",
    "therapeuticClass": "Analgésico e relaxante muscular",
    "genericAvailable": false,
    "commonDosages": ["35mg + 50mg + 300mg"],
    "indications": ["Dor muscular", "Dor de cabeça"],
    "contraindications": ["Miastenia gravis", "Glaucoma"],
    "sideEffects": ["Sonolência", "Boca seca"],
    "usageWarning": "Pode causar sonolência",
    "basicInfo": "Analgésico com relaxante muscular",
    "requiresPrescription": false
  }
]
```

---

### 4. ✋ **ADICIONAR MANUALMENTE** (Um por vez)

**Pelo painel admin:**
1. Admin → Medicamentos
2. Botão "Adicionar Manual"
3. Preencha o formulário
4. Salvar

---

## 🌐 Sobre o ProDoctor (https://bulas.medicamentos.app)

### ⚠️ **IMPORTANTE - Legalidade**

O site **NÃO possui API pública**. Para usar os dados:

#### ❌ **NÃO Recomendado (sem autorização):**
- Web scraping sem permissão
- Cópia automática de conteúdo
- Viola termos de uso

#### ✅ **RECOMENDADO:**

**Opção 1: Contato Oficial**
```
Empresa: ProDoctor Software S/A
Site: https://prodoctorsoft.com.br/
Email: Verificar no site
Objetivo: Solicitar parceria ou licenciamento de dados
```

**Opção 2: Uso Manual**
1. Busque o medicamento no site: https://bulas.medicamentos.app/medicamentos/busca?termo=dorflex
2. Copie as informações manualmente
3. Adicione via painel admin

---

## 🏛️ Fontes de Dados LEGAIS E GRATUITAS

### 1. **ANVISA - Agência Nacional de Vigilância Sanitária**

**Consulta de Medicamentos:**
- URL: https://consultas.anvisa.gov.br/#/medicamentos/
- Dados oficiais de medicamentos registrados
- Uso: Pesquisa manual + cadastro no sistema

**Bulário Eletrônico:**
- URL: https://bulario.bvs.br/
- Bulas oficiais em PDF
- Download autorizado

**Como usar:**
1. Pesquise o medicamento na ANVISA
2. Copie informações oficiais
3. Cadastre no sistema

### 2. **Bases de Dados Acadêmicas**

- **Micromedex** (institucional)
- **UpToDate** (institucional)
- **BVS - Biblioteca Virtual em Saúde**

### 3. **APIs Internacionais (Inglês)**

**OpenFDA (EUA):**
```
URL: https://open.fda.gov/apis/drug/
Gratuito: Sim
Idioma: Inglês
Uso: Dados de medicamentos aprovados nos EUA
```

**RxNorm (NLM):**
```
URL: https://rxnav.nlm.nih.gov/APIs.html
Gratuito: Sim
Idioma: Inglês
Uso: Nomenclatura padronizada
```

---

## 🔧 Como Implementar Importação da ANVISA

### Script Python (Exemplo)

```python
import requests
from bs4 import BeautifulSoup
import json

def buscar_anvisa(medicamento):
    # Exemplo - Adaptar conforme site da ANVISA
    url = f"https://consultas.anvisa.gov.br/api/medicamentos?nome={medicamento}"
    response = requests.get(url)
    
    if response.status_code == 200:
        dados = response.json()
        return {
            "nome": dados["nome"],
            "principio_ativo": dados["principio_ativo"],
            # ... outros campos
        }
    return None

# Exportar para JSON
medicamento = buscar_anvisa("dipirona")
with open("dipirona.json", "w") as f:
    json.dump(medicamento, f, indent=2)
```

Depois importar o JSON no sistema!

---

## 💡 Estratégias Práticas

### Para Começar RÁPIDO:

1. **Clique em "Carregar Comuns"** → 11 medicamentos instantaneamente
2. **Adicione os 20 mais vendidos** manualmente (1x por produto)
3. **Expanda conforme demanda** dos clientes

### Para Base COMPLETA:

1. **Contrate estagiário de farmácia** para cadastrar
2. **Liste os 100 medicamentos mais procurados**
3. **Cadastre 10 por dia** → 10 dias para base sólida

### Para Automatização FUTURA:

1. **Entre em contato com ProDoctor** para parceria
2. **Consulte empresas de dados farmacêuticos** (ex: IQVIA, Close-Up)
3. **Desenvolva scraper ético com autorização**

---

## 📊 Template Completo de CSV

Baixe: `public/templates/medicamentos_template.csv`

Ou copie este formato:

```csv
nome,principio_ativo,classe,indicacoes,contraindicacoes,efeitos,dosagens,generico_disponivel,requer_receita
Medicamento,Princípio Ativo,Classe Terapêutica,Indicação1;Indicação2,Contra1;Contra2,Efeito1;Efeito2,500mg;1g,true,false
```

---

## 🎓 Boas Práticas

### ✅ Sempre Faça:
- Cite fontes das informações
- Atualize dados regularmente
- Inclua avisos de "consulte um profissional"
- Faça backup da base (botão Exportar)

### ❌ Nunca Faça:
- Copiar dados sem autorização
- Substituir orientação médica
- Fornecer dosagens sem prescrição
- Ignorar contraindicações

---

## 🚀 Resumo Executivo

| Método | Velocidade | Quantidade | Esforço | Custo |
|--------|-----------|------------|---------|-------|
| Carregar Comuns | ⚡ Instantâneo | 11 | Zero | R$ 0 |
| Manual (Admin) | 🐌 5min/cada | Ilimitado | Alto | R$ 0 |
| Importar CSV | 🚀 Segundos | Milhares | Médio | R$ 0 |
| Importar JSON | 🚀 Segundos | Milhares | Baixo* | R$ 0 |
| ProDoctor (oficial) | ⚡ API | Milhares | Baixo | R$ ? |

*Requer arquivo JSON já pronto

---

## 📞 Contatos Úteis

**ProDoctor Software S/A**
- Site: https://prodoctorsoft.com.br/
- Solicitar: Licenciamento de dados ou API

**ANVISA**
- Site: https://www.gov.br/anvisa/
- Dados: Públicos para consulta

---

## 🎯 Recomendação Final

### Para começar HOJE:

1. **Clique em "Carregar Comuns"** no Admin
2. **Adicione 10-20 medicamentos** mais vendidos manualmente
3. **Export em CSV** para backup
4. **Expanda conforme necessidade**

### Para longo prazo:

1. **Entre em contato com ProDoctor**
2. **Avalie parceria comercial**
3. **Automatize importação** quando autorizado

---

**Dúvidas?** Consulte este guia ou entre em contato!
