# API de Medicamentos - Documentação

## Integração com Base de Dados de Medicamentos

### Funcionalidades Implementadas

#### 1. **Base de Dados Local**
- Medicamentos comuns pré-cadastrados
- Informações sobre indicações, contraindicações, efeitos colaterais
- Princípio ativo, classe terapêutica, dosagens

#### 2. **Funções Disponíveis**

##### `getMedicationInfo(medicationName)`
Busca informações completas de um medicamento.

```javascript
const info = await getMedicationInfo('dipirona');
// Retorna: { name, activeIngredient, therapeuticClass, indications, ... }
```

##### `getMedicationAnswer(medicationName, question)`
Responde perguntas específicas sobre um medicamento.

```javascript
const answer = await getMedicationAnswer('paracetamol', 'serve para que?');
// Retorna resposta contextualizada
```

##### `searchByActiveIngredient(activeIngredient)`
Busca medicamentos por princípio ativo.

```javascript
const meds = await searchByActiveIngredient('ibuprofeno');
```

##### `searchByIndication(indication)`
Busca medicamentos por indicação terapêutica.

```javascript
const meds = await searchByIndication('dor');
```

### Medicamentos na Base Atual

1. **Dipirona** - Analgésico e antitérmico
2. **Paracetamol** - Analgésico e antitérmico
3. **Ibuprofeno** - Anti-inflamatório
4. **Omeprazol** - Protetor gástrico
5. **Amoxicilina** - Antibiótico
6. **Losartana** - Anti-hipertensivo

### Expansão da Base

#### Opção 1: Adicionar Medicamentos Manualmente
```javascript
addMedicationToDatabase('novo-medicamento', {
  name: 'Nome do Medicamento',
  activeIngredient: 'Princípio Ativo',
  // ... outras informações
});
```

#### Opção 2: Integração com API Externa

**APIs Públicas Brasileiras:**

1. **ANVISA - Consulta de Medicamentos**
   - URL: https://consultas.anvisa.gov.br/
   - Dados oficiais de medicamentos registrados no Brasil
   - Requer parsing de dados

2. **ProDoctor (https://bulas.medicamentos.app)**
   - **Status**: Não possui API pública documentada
   - **Alternativa**: Web scraping (requer autorização)
   - **Recomendação**: Contatar ProDoctor para parceria comercial

3. **Bulário Eletrônico ANVISA**
   - https://bulario.bvs.br/
   - Acesso a bulas oficiais
   - Pode ser usado para scraping autorizado

#### Opção 3: Integração com APIs Internacionais

1. **OpenFDA (FDA - EUA)**
   - URL: https://open.fda.gov/apis/drug/
   - API pública e gratuita
   - Dados de medicamentos aprovados nos EUA

2. **RxNorm (NLM - EUA)**
   - URL: https://rxnav.nlm.nih.gov/APIs.html
   - Nomenclatura padronizada de medicamentos
   - API gratuita

### Próximos Passos para Integração Completa

#### 1. **Integração com ANVISA** (Recomendado)
```javascript
// Exemplo de função futura
export const fetchFromANVISA = async (medicationName) => {
  // Implementar consulta à API da ANVISA
  // ou scraping autorizado do portal
};
```

#### 2. **Sistema de Cache**
```javascript
// Armazenar consultas para reduzir requisições
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
```

#### 3. **Importação em Massa**
```javascript
// Criar script para importar dados de CSV/JSON
export const importMedicationsFromFile = async (file) => {
  // Processar arquivo com dados de medicamentos
};
```

#### 4. **Admin Panel para Gestão**
- Interface para adicionar/editar medicamentos
- Upload de bulas em PDF
- Sincronização com base externa

### Como Usar no Chatbot

O chatbot agora responde perguntas como:

**Cliente**: "Dipirona serve para que?"
**Bot**: "Dipirona é indicado para: Dor, Febre. Medicamento analgésico e antitérmico..."

**Cliente**: "Quais os efeitos colaterais do ibuprofeno?"
**Bot**: "Os principais efeitos colaterais de Ibuprofeno incluem: Desconforto gastrointestinal..."

**Cliente**: "Paracetamol tem genérico?"
**Bot**: "Sim! Paracetamol possui versão genérica disponível..."

### Licença e Uso Ético

⚠️ **IMPORTANTE**:
- Dados de saúde são sensíveis
- Sempre incluir aviso: "Consulte um profissional de saúde"
- Não substituir orientação médica/farmacêutica
- Respeitar direitos autorais de bulas e conteúdos
- Obter autorização para scraping de sites

### Contato para Parcerias

Para integração oficial com ProDoctor:
- Site: https://prodoctorsoft.com.br/
- Verificar possibilidade de licenciamento comercial da API
