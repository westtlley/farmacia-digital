/**
 * Sistema de importação de dados de medicamentos
 * Suporta múltiplas fontes de dados
 */

import { addMedicationToDatabase } from './medicationAPI';

/**
 * IMPORTANTE: Web scraping deve ser usado com ética e responsabilidade
 * - Respeitar robots.txt
 * - Rate limiting (não sobrecarregar servidor)
 * - Respeitar termos de uso
 * - Preferir APIs oficiais quando disponíveis
 * - Obter autorização quando necessário
 */

// ============================================
// OPÇÃO 1: Importação Manual via CSV/JSON
// ============================================

/**
 * Importa medicamentos de arquivo CSV
 * Formato esperado: nome,principio_ativo,classe,indicacoes,contraindicacoes,efeitos,dosagens,requer_receita
 * 
 * @param {File} file - Arquivo CSV
 * @returns {Promise<number>} Número de medicamentos importados
 */
export const importFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        let imported = 0;
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const medication = {};
          
          headers.forEach((header, index) => {
            medication[header] = values[index];
          });
          
          // Converter string de arrays para arrays reais
          const medicationData = {
            name: medication.nome || medication.name,
            activeIngredient: medication.principio_ativo || medication.activeIngredient,
            therapeuticClass: medication.classe || medication.therapeuticClass,
            genericAvailable: medication.generico_disponivel === 'true' || medication.genericAvailable === 'true',
            commonDosages: (medication.dosagens || medication.commonDosages || '').split(';'),
            indications: (medication.indicacoes || medication.indications || '').split(';'),
            contraindications: (medication.contraindicacoes || medication.contraindications || '').split(';'),
            sideEffects: (medication.efeitos || medication.sideEffects || '').split(';'),
            usageWarning: medication.aviso || medication.usageWarning || 'Consulte um profissional de saúde',
            basicInfo: medication.info || medication.basicInfo || '',
            requiresPrescription: medication.requer_receita === 'true' || medication.requiresPrescription === 'true'
          };
          
          addMedicationToDatabase(medicationData.name, medicationData);
          imported++;
        }
        
        resolve(imported);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * Importa medicamentos de arquivo JSON
 * @param {File} file - Arquivo JSON
 * @returns {Promise<number>}
 */
export const importFromJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const medications = JSON.parse(e.target.result);
        let imported = 0;
        
        if (Array.isArray(medications)) {
          medications.forEach(med => {
            addMedicationToDatabase(med.name || med.nome, med);
            imported++;
          });
        } else if (typeof medications === 'object') {
          Object.entries(medications).forEach(([key, med]) => {
            addMedicationToDatabase(key, med);
            imported++;
          });
        }
        
        resolve(imported);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// ============================================
// OPÇÃO 2: API da ANVISA (Oficial e Legal)
// ============================================

/**
 * Busca medicamento na base da ANVISA
 * API não documentada publicamente, mas dados são públicos
 * 
 * @param {string} medicationName - Nome do medicamento
 * @returns {Promise<Object|null>}
 */
export const fetchFromANVISA = async (medicationName) => {
  try {
    // Exemplo de estrutura - adaptar conforme API real da ANVISA
    // A ANVISA possui consultas públicas, mas sem API REST documentada
    // Esta é uma função placeholder para quando houver acesso
    
    console.log('Buscando na ANVISA:', medicationName);
    
    // Por enquanto, retorna null
    // Implementar quando houver acesso à API ou scraping autorizado
    return null;
  } catch (error) {
    console.error('Erro ao buscar na ANVISA:', error);
    return null;
  }
};

// ============================================
// OPÇÃO 3: ProDoctor (Requer Autorização)
// ============================================

/**
 * ATENÇÃO: Este scraper é apenas um exemplo educacional
 * Para uso em produção, você DEVE:
 * 1. Contatar o ProDoctor e obter autorização
 * 2. Verificar se existe uma API oficial
 * 3. Respeitar os termos de uso do site
 * 4. Implementar rate limiting adequado
 * 
 * Contato ProDoctor: https://prodoctorsoft.com.br/
 */

const PRODECTOR_BASE_URL = 'https://bulas.medicamentos.app/medicamentos/busca';

/**
 * Busca básica no ProDoctor (apenas demonstração)
 * NÃO USE EM PRODUÇÃO SEM AUTORIZAÇÃO
 * 
 * @param {string} medicationName
 * @returns {Promise<Object[]>}
 */
export const searchProDoctorDemo = async (medicationName) => {
  // Este é apenas um exemplo de como seria a estrutura
  // NÃO implementado para evitar violação de termos
  
  console.warn('⚠️ Scraping do ProDoctor requer autorização!');
  console.log('Entre em contato: https://prodoctorsoft.com.br/');
  
  return [];
};

// ============================================
// OPÇÃO 4: Base de dados estática pré-compilada
// ============================================

/**
 * Base expandida de medicamentos comuns brasileiros
 * Dados coletados de fontes públicas e bulas oficiais
 */
export const COMMON_MEDICATIONS_BR = [
  {
    name: 'Dorflex',
    activeIngredient: 'Dipirona Sódica + Orfenadrina + Cafeína',
    therapeuticClass: 'Analgésico e relaxante muscular',
    genericAvailable: false,
    commonDosages: ['35mg + 50mg + 300mg'],
    indications: ['Dor muscular', 'Dor de cabeça tensional', 'Dor lombar'],
    contraindications: ['Miastenia gravis', 'Glaucoma', 'Obstrução intestinal'],
    sideEffects: ['Sonolência', 'Boca seca', 'Tontura'],
    usageWarning: 'Pode causar sonolência. Evite dirigir.',
    basicInfo: 'Analgésico com relaxante muscular, ideal para dores musculares associadas a tensão.',
    requiresPrescription: false
  },
  {
    name: 'Aspirina',
    activeIngredient: 'Ácido Acetilsalicílico',
    therapeuticClass: 'Anti-inflamatório não esteroidal (AINE)',
    genericAvailable: true,
    commonDosages: ['100mg', '500mg'],
    indications: ['Dor', 'Febre', 'Inflamação', 'Prevenção cardiovascular'],
    contraindications: ['Úlcera péptica', 'Distúrbios de coagulação', 'Gravidez (3º trimestre)'],
    sideEffects: ['Irritação gástrica', 'Náusea', 'Sangramento'],
    usageWarning: 'Tomar com alimentos. Uso prolongado requer supervisão médica.',
    basicInfo: 'AINE clássico com propriedades analgésicas, antipiréticas e antitrombóticas.',
    requiresPrescription: false
  },
  {
    name: 'Rivotril',
    activeIngredient: 'Clonazepam',
    therapeuticClass: 'Benzodiazepínico',
    genericAvailable: true,
    commonDosages: ['0.5mg', '2mg'],
    indications: ['Ansiedade', 'Transtorno do pânico', 'Epilepsia'],
    contraindications: ['Miastenia gravis', 'Insuficiência respiratória grave', 'Alcoolismo'],
    sideEffects: ['Sonolência', 'Dependência', 'Tontura', 'Comprometimento cognitivo'],
    usageWarning: 'CONTROLADO - Receita especial. Pode causar dependência.',
    basicInfo: 'Benzodiazepínico de alta potência. Uso exclusivo com prescrição médica.',
    requiresPrescription: true,
    controlled: true
  },
  {
    name: 'Neosaldina',
    activeIngredient: 'Dipirona + Mucato de Isometepteno + Cafeína',
    therapeuticClass: 'Analgésico',
    genericAvailable: false,
    commonDosages: ['300mg + 30mg + 30mg'],
    indications: ['Dor de cabeça', 'Enxaqueca'],
    contraindications: ['Glaucoma', 'Hipertireoidismo', 'Doença cardíaca grave'],
    sideEffects: ['Nervosismo', 'Taquicardia', 'Insônia'],
    usageWarning: 'Contém cafeína. Evitar à noite.',
    basicInfo: 'Analgésico específico para cefaleia, com ação vasodilatadora.',
    requiresPrescription: false
  },
  {
    name: 'Buscopan',
    activeIngredient: 'Butilbrometo de Escopolamina',
    therapeuticClass: 'Antiespasmódico',
    genericAvailable: true,
    commonDosages: ['10mg'],
    indications: ['Cólica intestinal', 'Cólica menstrual', 'Cólica urinária'],
    contraindications: ['Glaucoma', 'Megacólon', 'Miastenia gravis'],
    sideEffects: ['Boca seca', 'Visão turva', 'Retenção urinária'],
    usageWarning: 'Pode causar visão turva temporária.',
    basicInfo: 'Antiespasmódico que relaxa a musculatura lisa. Eficaz contra cólicas.',
    requiresPrescription: false
  }
];

/**
 * Carrega base de medicamentos comuns
 * @returns {Promise<number>} Quantidade importada
 */
export const loadCommonMedications = async () => {
  let loaded = 0;
  
  COMMON_MEDICATIONS_BR.forEach(med => {
    addMedicationToDatabase(med.name, med);
    loaded++;
  });
  
  return loaded;
};

// ============================================
// OPÇÃO 5: Scraper Ético com Rate Limiting
// ============================================

class EthicalScraper {
  constructor(baseUrl, delayMs = 2000) {
    this.baseUrl = baseUrl;
    this.delayMs = delayMs; // Delay entre requisições
    this.lastRequest = 0;
  }
  
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.delayMs) {
      await new Promise(resolve => 
        setTimeout(resolve, this.delayMs - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
  
  async fetch(url) {
    await this.wait();
    
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      console.error('Erro ao fazer requisição:', error);
      return null;
    }
  }
}

// ============================================
// Exportações
// ============================================

export default {
  importFromCSV,
  importFromJSON,
  fetchFromANVISA,
  loadCommonMedications,
  COMMON_MEDICATIONS_BR
};
