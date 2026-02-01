/**
 * API para consulta de medicamentos e bulas
 * Integração com base de dados de medicamentos
 */

/**
 * Estrutura de dados de medicamento
 * @typedef {Object} MedicationInfo
 * @property {string} name - Nome do medicamento
 * @property {string} activeIngredient - Princípio ativo
 * @property {string} manufacturer - Laboratório fabricante
 * @property {string} therapeuticClass - Classe terapêutica
 * @property {string[]} indications - Indicações terapêuticas
 * @property {string[]} contraindications - Contraindicações
 * @property {string[]} sideEffects - Efeitos colaterais
 * @property {string} dosage - Posologia
 * @property {string} leafletUrl - URL da bula completa
 */

// Base de dados local de medicamentos comuns (pode ser expandida)
const MEDICATION_DATABASE = {
  'dipirona': {
    name: 'Dipirona',
    activeIngredient: 'Dipirona Sódica',
    therapeuticClass: 'Analgésico e antitérmico',
    genericAvailable: true,
    commonDosages: ['500mg', '1g'],
    indications: ['Dor', 'Febre'],
    contraindications: ['Hipersensibilidade aos componentes', 'Porfiria aguda intermitente', 'Deficiência congênita da glicose-6-fosfato desidrogenase'],
    sideEffects: ['Reações alérgicas', 'Hipotensão', 'Reações cutâneas'],
    usageWarning: 'Uso sob prescrição médica',
    basicInfo: 'Medicamento analgésico e antitérmico. Reduz a febre e alivia dores leves a moderadas.'
  },
  'paracetamol': {
    name: 'Paracetamol',
    activeIngredient: 'Paracetamol',
    therapeuticClass: 'Analgésico e antitérmico',
    genericAvailable: true,
    commonDosages: ['500mg', '750mg', '1g'],
    indications: ['Dor leve a moderada', 'Febre'],
    contraindications: ['Hipersensibilidade ao paracetamol', 'Insuficiência hepática grave'],
    sideEffects: ['Reações alérgicas raras', 'Hepatotoxicidade em doses excessivas'],
    usageWarning: 'Não exceder a dose máxima diária',
    basicInfo: 'Analgésico e antitérmico amplamente utilizado. Seguro quando usado nas doses recomendadas.'
  },
  'ibuprofeno': {
    name: 'Ibuprofeno',
    activeIngredient: 'Ibuprofeno',
    therapeuticClass: 'Anti-inflamatório não esteroidal (AINE)',
    genericAvailable: true,
    commonDosages: ['200mg', '400mg', '600mg'],
    indications: ['Dor', 'Febre', 'Inflamação', 'Dor de cabeça', 'Dor menstrual'],
    contraindications: ['Úlcera péptica ativa', 'Insuficiência cardíaca grave', 'Terceiro trimestre de gravidez'],
    sideEffects: ['Desconforto gastrointestinal', 'Náusea', 'Dor de cabeça'],
    usageWarning: 'Tomar com alimentos para reduzir irritação gástrica',
    basicInfo: 'Anti-inflamatório não esteroidal com propriedades analgésicas, antipiréticas e anti-inflamatórias.'
  },
  'omeprazol': {
    name: 'Omeprazol',
    activeIngredient: 'Omeprazol',
    therapeuticClass: 'Inibidor da bomba de prótons',
    genericAvailable: true,
    commonDosages: ['20mg', '40mg'],
    indications: ['Refluxo gastroesofágico', 'Úlcera péptica', 'Gastrite'],
    contraindications: ['Hipersensibilidade ao omeprazol'],
    sideEffects: ['Dor de cabeça', 'Diarreia', 'Náusea', 'Dor abdominal'],
    usageWarning: 'Tomar em jejum, pela manhã',
    basicInfo: 'Reduz a produção de ácido no estômago. Usado no tratamento de doenças relacionadas ao ácido gástrico.'
  },
  'amoxicilina': {
    name: 'Amoxicilina',
    activeIngredient: 'Amoxicilina',
    therapeuticClass: 'Antibiótico (Penicilina)',
    genericAvailable: true,
    commonDosages: ['500mg', '875mg'],
    indications: ['Infecções bacterianas', 'Infecções respiratórias', 'Infecções urinárias'],
    contraindications: ['Alergia a penicilinas', 'Mononucleose infecciosa'],
    sideEffects: ['Diarreia', 'Náusea', 'Erupção cutânea', 'Reações alérgicas'],
    usageWarning: 'Antibiótico - uso apenas com receita médica. Complete o tratamento.',
    basicInfo: 'Antibiótico de amplo espectro do grupo das penicilinas. Eficaz contra várias bactérias.',
    requiresPrescription: true
  },
  'losartana': {
    name: 'Losartana',
    activeIngredient: 'Losartana Potássica',
    therapeuticClass: 'Anti-hipertensivo (Antagonista dos receptores da angiotensina II)',
    genericAvailable: true,
    commonDosages: ['50mg', '100mg'],
    indications: ['Hipertensão arterial', 'Proteção renal em pacientes diabéticos'],
    contraindications: ['Gravidez', 'Hipersensibilidade', 'Estenose bilateral da artéria renal'],
    sideEffects: ['Tontura', 'Fadiga', 'Hipotensão'],
    usageWarning: 'Uso contínuo conforme prescrição médica',
    basicInfo: 'Medicamento anti-hipertensivo. Reduz a pressão arterial e protege os rins.',
    requiresPrescription: true
  }
};

/**
 * Busca informações de um medicamento pelo nome
 * @param {string} medicationName - Nome do medicamento
 * @returns {Promise<MedicationInfo|null>}
 */
export const getMedicationInfo = async (medicationName) => {
  const normalized = medicationName.toLowerCase().trim();
  
  // Buscar na base local
  if (MEDICATION_DATABASE[normalized]) {
    return MEDICATION_DATABASE[normalized];
  }
  
  // Buscar por nome similar
  const similarKey = Object.keys(MEDICATION_DATABASE).find(key => 
    key.includes(normalized) || normalized.includes(key)
  );
  
  if (similarKey) {
    return MEDICATION_DATABASE[similarKey];
  }
  
  return null;
};

/**
 * Busca medicamentos por princípio ativo
 * @param {string} activeIngredient - Princípio ativo
 * @returns {Promise<MedicationInfo[]>}
 */
export const searchByActiveIngredient = async (activeIngredient) => {
  const normalized = activeIngredient.toLowerCase();
  
  return Object.values(MEDICATION_DATABASE).filter(med => 
    med.activeIngredient.toLowerCase().includes(normalized)
  );
};

/**
 * Busca medicamentos por indicação terapêutica
 * @param {string} indication - Indicação (ex: "dor", "febre")
 * @returns {Promise<MedicationInfo[]>}
 */
export const searchByIndication = async (indication) => {
  const normalized = indication.toLowerCase();
  
  return Object.values(MEDICATION_DATABASE).filter(med => 
    med.indications.some(ind => ind.toLowerCase().includes(normalized))
  );
};

/**
 * Verifica se um medicamento requer receita
 * @param {string} medicationName - Nome do medicamento
 * @returns {Promise<boolean>}
 */
export const requiresPrescription = async (medicationName) => {
  const info = await getMedicationInfo(medicationName);
  return info?.requiresPrescription || false;
};

/**
 * Gera resposta inteligente sobre um medicamento
 * @param {string} medicationName - Nome do medicamento
 * @param {string} question - Pergunta do usuário
 * @returns {Promise<string>}
 */
export const getMedicationAnswer = async (medicationName, question = '') => {
  const info = await getMedicationInfo(medicationName);
  
  if (!info) {
    return null;
  }

  const lowerQuestion = question.toLowerCase();
  
  // Pergunta sobre indicação
  if (lowerQuestion.includes('serve para') || lowerQuestion.includes('indicação') || lowerQuestion.includes('trata')) {
    return `${info.name} é indicado para: ${info.indications.join(', ')}.\n\n${info.basicInfo}`;
  }
  
  // Pergunta sobre efeitos colaterais
  if (lowerQuestion.includes('efeito colateral') || lowerQuestion.includes('reação')) {
    return `Os principais efeitos colaterais de ${info.name} incluem: ${info.sideEffects.join(', ')}.\n\n⚠️ ${info.usageWarning}`;
  }
  
  // Pergunta sobre contraindicações
  if (lowerQuestion.includes('contraindicação') || lowerQuestion.includes('não pode')) {
    return `${info.name} é contraindicado em: ${info.contraindications.join(', ')}.\n\n⚠️ Consulte sempre um médico ou farmacêutico antes de usar.`;
  }
  
  // Pergunta sobre genérico
  if (lowerQuestion.includes('genérico')) {
    if (info.genericAvailable) {
      return `Sim! ${info.name} possui versão genérica disponível. O princípio ativo é ${info.activeIngredient}. As versões genéricas têm a mesma eficácia e são mais acessíveis.`;
    } else {
      return `${info.name} (${info.activeIngredient}) pode não ter versão genérica disponível. Consulte nosso farmacêutico para verificar alternativas.`;
    }
  }
  
  // Resposta padrão
  return `${info.name} (${info.activeIngredient})\n\n📋 Classe: ${info.therapeuticClass}\n\n✅ Indicado para: ${info.indications.join(', ')}\n\n⚠️ ${info.usageWarning}\n\n💡 ${info.basicInfo}`;
};

/**
 * Expande a base de dados com novos medicamentos
 * @param {string} name - Nome do medicamento
 * @param {MedicationInfo} info - Informações do medicamento
 */
export const addMedicationToDatabase = (name, info) => {
  MEDICATION_DATABASE[name.toLowerCase()] = info;
};

/**
 * Obtém todos os medicamentos da base
 * @returns {Object}
 */
export const getAllMedications = () => {
  return MEDICATION_DATABASE;
};
