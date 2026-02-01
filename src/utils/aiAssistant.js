/**
 * Utilitário para IA do Assistente Virtual
 * Usa API de IA para responder perguntas sobre medicamentos de forma inteligente
 */

// Função para buscar produtos similares ou genéricos
export const findSimilarProducts = (productName, allProducts) => {
  if (!productName || !allProducts) return { exact: [], similar: [], generic: [] };

  const searchTerm = productName.toLowerCase().trim();
  
  // Buscar produto exato
  const exactMatches = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm) && p.status === 'active'
  );

  if (exactMatches.length > 0) {
    return { exact: exactMatches, similar: [], generic: [] };
  }

  // Buscar genéricos (produtos com mesmo princípio ativo)
  const genericMatches = allProducts.filter(p => {
    if (p.status !== 'active') return false;
    
    // Buscar por princípio ativo ou marca genérica
    const hasActiveIngredient = p.active_ingredient && 
      p.active_ingredient.toLowerCase().includes(searchTerm);
    const isGeneric = p.is_generic && p.name.toLowerCase().includes(searchTerm);
    const hasSimilarName = calculateSimilarity(p.name.toLowerCase(), searchTerm) > 0.6;
    
    return hasActiveIngredient || isGeneric || hasSimilarName;
  });

  if (genericMatches.length > 0) {
    return { exact: [], similar: [], generic: genericMatches };
  }

  // Buscar produtos similares (mesma categoria ou indicação)
  const similarMatches = allProducts.filter(p => {
    if (p.status !== 'active') return false;
    
    const sameCategoryOrIndication = 
      (p.category && searchTerm.includes(p.category.toLowerCase())) ||
      (p.therapeutic_class && searchTerm.includes(p.therapeutic_class.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm));
    
    return sameCategoryOrIndication;
  });

  return { exact: [], similar: similarMatches.slice(0, 5), generic: [] };
};

// Calcula similaridade entre duas strings (algoritmo de Levenshtein simplificado)
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Gera resposta inteligente usando contexto local (sem API externa)
 * Analisa a pergunta do usuário e retorna resposta apropriada
 */
export const generateIntelligentResponse = async (userMessage, searchResults, pharmacyName = 'Farmácia') => {
  const message = userMessage.toLowerCase().trim();
  
  // Analisar intenção do usuário
  const intent = analyzeUserIntent(userMessage);
  
  // Responder a cumprimentos
  if (intent.greeting) {
    return {
      message: `Olá! 😊 Sou o assistente virtual da ${pharmacyName}. Estou aqui para ajudar!\n\nVocê pode me perguntar sobre medicamentos, preços, genéricos ou qualquer dúvida. Como posso te ajudar hoje?`,
      showOptions: true
    };
  }

  // Responder a agradecimentos
  if (intent.thanking) {
    return {
      message: `Por nada! 😊 Fico feliz em ajudar! Se precisar de mais alguma coisa, é só chamar!`,
      showOptions: true
    };
  }

  // Se está perguntando sobre sintomas
  if (intent.askingSymptom && intent.symptom) {
    return {
      message: `Entendo que você está com ${intent.symptom}. Para questões de saúde e indicação de medicamentos, é importante consultar um profissional.\n\n👨‍⚕️ Recomendo falar com nosso farmacêutico que pode te orientar melhor sobre o tratamento adequado.\n\nGostaria de falar com ele agora?`,
      showOptions: false,
      suggestPharmacist: true
    };
  }

  // Detectar se é uma pergunta sobre medicamento
  const isMedicationQuestion = 
    intent.medicationName ||
    intent.askingAvailability ||
    intent.askingPrice ||
    intent.askingGeneric ||
    message.includes('medicamento') ||
    message.includes('remédio') ||
    message.includes('comprimido') ||
    /\b\w+mida\b/.test(message) || // termina com "mida" (ex: dipirona)
    /\b\w+ona\b/.test(message) || // termina com "ona"
    /\b\w+ina\b/.test(message) || // termina com "ina"
    message.length < 30;

  if (!isMedicationQuestion) {
    return {
      message: `Desculpe, não entendi sua pergunta. 🤔\n\nVocê pode me perguntar sobre:\n• Medicamentos disponíveis\n• Preços e formas de pagamento\n• Genéricos e similares\n• Enviar sua receita\n\nOu falar direto com nosso farmacêutico!`,
      showOptions: true
    };
  }

  // Construir resposta baseada nos resultados
  const hasExact = searchResults.exact && searchResults.exact.length > 0;
  const hasGeneric = searchResults.generic && searchResults.generic.length > 0;
  const hasSimilar = searchResults.similar && searchResults.similar.length > 0;

  // Se encontrou produtos exatos
  if (hasExact) {
    const product = searchResults.exact[0];
    let response = '';
    
    if (intent.askingPrice) {
      response = `Sim! Temos ${product.name} disponível. 😊\n\n💰 Preço: R$ ${product.price.toFixed(2).replace('.', ',')}`;
    } else if (intent.askingAvailability) {
      response = `Sim! Temos ${product.name} disponível! 😊`;
      if (searchResults.exact.length > 1) {
        response += `\n\nEncontrei ${searchResults.exact.length} opções para você escolher:`;
      }
    } else if (intent.askingGeneric) {
      response = `Encontrei ${product.name}! 😊\n\nVou mostrar as opções disponíveis, incluindo genéricos se houver.`;
    } else {
      response = `Ótimo! Encontrei ${product.name}! 😊`;
    }
    
    return {
      message: response,
      products: searchResults.exact,
      showProducts: true
    };
  }

  // Se encontrou genéricos
  if (hasGeneric) {
    const productName = intent.medicationName || 'esse medicamento';
    const genericNames = searchResults.generic.slice(0, 3).map(p => p.name).join(', ');
    
    let response = `Não temos ${productName} com esse nome exato, mas tenho boas notícias! 😊\n\n`;
    
    if (intent.askingGeneric) {
      response += `Encontrei genéricos do que você procura:\n\n${genericNames}\n\n`;
    } else {
      response += `Temos versões genéricas ou similares:\n\n${genericNames}\n\n`;
    }
    
    response += `💊 Os genéricos têm o mesmo princípio ativo e eficácia, mas com preço mais acessível!`;
    
    return {
      message: response,
      products: searchResults.generic,
      showProducts: true
    };
  }

  // Se encontrou produtos similares
  if (hasSimilar) {
    const productName = intent.medicationName || 'esse produto';
    return {
      message: `Não encontrei ${productName} exatamente, mas temos algumas opções similares que podem te atender. 🔍\n\nRecomendo consultar nosso farmacêutico para uma orientação mais precisa sobre qual seria ideal para você!`,
      products: searchResults.similar,
      showProducts: true,
      suggestPharmacist: true
    };
  }

  // Não encontrou nada
  const productName = intent.medicationName || 'esse produto';
  return {
    message: `Desculpe, não encontrei ${productName} no momento. 😔\n\n🤔 O que você pode fazer:\n\n👨‍⚕️ **Falar com farmacêutico** - Ele pode te orientar sobre alternativas\n📋 **Enviar sua receita** - Analisamos e entramos em contato\n🔍 **Tentar outro nome** - Pode ser que esteja cadastrado com nome diferente\n\nComo prefere continuar?`,
    showOptions: false,
    suggestPharmacist: true
  };
};

/**
 * Extrai nomes de medicamentos de frases naturais
 */
const extractMedicationFromSentence = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Padrões comuns de perguntas
  const patterns = [
    // "Você tem/vende/possui [medicamento]"
    /(?:você\s+)?(?:tem|vende|possui|trabalha com|aceita)\s+(?:o\s+|a\s+)?([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
    // "Preciso de/Quero/Busco [medicamento]"
    /(?:preciso\s+de|quero|busco|procuro|gostaria\s+de|to\s+procurando)\s+(?:um\s+|uma\s+|o\s+|a\s+)?([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
    // "Quanto custa [medicamento]"
    /(?:quanto\s+custa|qual\s+o?\s+preço|valor\s+d[oa])\s+(?:o\s+|a\s+)?([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
    // "[medicamento] tem?" ou "tem [medicamento]?"
    /(?:^|\s)([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)\s+(?:tem|ta\s+disponivel|está\s+disponível)/i,
    // "Genérico de [medicamento]"
    /(?:genérico|similar)\s+de\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
    // Nome direto entre aspas ou após "chamado"
    /["']([^"']+)["']|(?:chamad[oa]|nome)\s+([a-záàâãéèêíïóôõöúçñ]+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      // Pegar o primeiro grupo de captura que não é undefined
      const extracted = match[1] || match[2] || match[3];
      if (extracted) {
        // Remover palavras comuns que não são medicamentos
        const stopWords = ['medicamento', 'remédio', 'produto', 'coisa', 'negócio', 'esse', 'isso'];
        const cleaned = extracted.trim().split(/\s+/)
          .filter(word => !stopWords.includes(word.toLowerCase()))
          .join(' ');
        if (cleaned) return cleaned;
      }
    }
  }

  // Se não encontrou padrão, mas a mensagem é curta (1-3 palavras), assume que é o nome
  const words = message.trim().split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    // Filtrar palavras muito comuns
    const commonWords = ['oi', 'olá', 'sim', 'não', 'ok', 'obrigado', 'obrigada', 'valeu', 'por', 'favor'];
    const filtered = words.filter(w => !commonWords.includes(w.toLowerCase()));
    if (filtered.length > 0) {
      return filtered.join(' ');
    }
  }

  return '';
};

/**
 * Detecta sintomas ou condições médicas
 */
const extractSymptomOrCondition = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const symptomPatterns = [
    /(?:remédio|medicamento|algo)\s+para\s+([^?.!]+)/i,
    /(?:estou|to|tô)\s+com\s+([^?.!]+)/i,
    /(?:tenho|sinto)\s+([^?.!]+)/i,
    /(?:dor|febre|tosse|gripe|resfriado|alergia|enjoo|náusea|azia)/i
  ];

  for (const pattern of symptomPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return '';
};

/**
 * Analisa contexto da conversa para entender melhor a intenção do usuário
 */
export const analyzeUserIntent = (message, conversationHistory = []) => {
  const lowerMessage = message.toLowerCase();
  
  // Detectar intenções comuns
  const intents = {
    askingPrice: /quanto\s+custa|preço|valor|quanto\s+(?:é|fica|sai)/i.test(lowerMessage),
    askingAvailability: /(?:você\s+)?(?:tem|vende|possui|trabalha\s+com)|disponível|estoque|ta\s+disponivel/i.test(lowerMessage),
    askingGeneric: /genérico|similar|versão\s+genérica|mais\s+barato/i.test(lowerMessage),
    askingIndication: /serve\s+para|indicação|para\s+que|usa\s+para|trata/i.test(lowerMessage),
    askingSideEffects: /efeito\s+colateral|contraindicação|faz\s+mal|pode\s+tomar|risco/i.test(lowerMessage),
    askingSymptom: /(?:remédio|medicamento|algo)\s+para|estou\s+com|tenho\s+(?:dor|febre|tosse)/i.test(lowerMessage),
    greeting: /^(?:oi|olá|ola|hey|ei|bom\s+dia|boa\s+tarde|boa\s+noite)/i.test(lowerMessage),
    thanking: /obrigad[oa]|valeu|thanks|vlw|brigadão/i.test(lowerMessage)
  };

  // Extrair nome de medicamento da frase
  const medicationName = extractMedicationFromSentence(message);
  
  // Extrair sintoma ou condição
  const symptom = extractSymptomOrCondition(message);

  return {
    ...intents,
    medicationName,
    symptom,
    needsPharmacistHelp: intents.askingSideEffects || intents.askingIndication || intents.askingSymptom,
    isSimpleQuery: message.trim().split(/\s+/).length <= 3,
    isNaturalLanguage: message.trim().split(/\s+/).length > 3
  };
};

/**
 * Formata lista de produtos para exibição no chat
 */
export const formatProductsForChat = (products, maxProducts = 5) => {
  return products.slice(0, maxProducts).map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand || '',
    price: p.price,
    dosage: p.dosage || '',
    isGeneric: p.is_generic || false,
    hasStock: p.stock_quantity > 0 || p.has_infinite_stock,
    image: p.image_url || p.image
  }));
};
