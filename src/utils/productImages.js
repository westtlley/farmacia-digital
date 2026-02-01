/**
 * Utilitário para gerenciar imagens de produtos
 * Retorna imagem padrão baseada no tipo de medicamento
 */

// URLs das imagens padrão - SVGs simples e funcionais
export const DEFAULT_PRODUCT_IMAGES = {
  // Medicamento Genérico com Receita (tarja amarela + vermelha)
  generic: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <!-- Fundo branco -->
      <rect width="300" height="400" fill="#FFFFFF"/>
      
      <!-- Tarja amarela -->
      <rect x="0" y="250" width="300" height="60" fill="#FFC107"/>
      <text x="150" y="285" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#000000" text-anchor="middle">Medicamento Genérico</text>
      
      <!-- Tarja vermelha -->
      <rect x="0" y="310" width="300" height="50" fill="#D32F2F"/>
      <text x="150" y="340" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">VENDA SOB PRESCRIÇÃO MÉDICA</text>
      
      <!-- Texto lateral -->
      <text x="20" y="200" font-family="Arial, sans-serif" font-size="10" fill="#999999" transform="rotate(-90 20 200)">IMAGEM MERAMENTE ILUSTRATIVA</text>
    </svg>
  `)}`,
  
  // Medicamento de Referência/Similar com Receita (apenas tarja vermelha)
  reference: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <!-- Fundo branco -->
      <rect width="300" height="400" fill="#FFFFFF"/>
      
      <!-- Tarja vermelha -->
      <rect x="0" y="300" width="300" height="50" fill="#D32F2F"/>
      <text x="150" y="330" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">VENDA SOB PRESCRIÇÃO MÉDICA</text>
      
      <!-- Texto lateral -->
      <text x="20" y="200" font-family="Arial, sans-serif" font-size="10" fill="#999999" transform="rotate(-90 20 200)">IMAGEM MERAMENTE ILUSTRATIVA</text>
    </svg>
  `)}`,
  
  // Medicamento Isento de Prescrição (tarja azul)
  otc: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <!-- Fundo branco -->
      <rect width="300" height="400" fill="#FFFFFF"/>
      
      <!-- Tarja azul -->
      <rect x="0" y="300" width="300" height="50" fill="#2B6CB0"/>
      <text x="150" y="330" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">ISENTO DE PRESCRIÇÃO</text>
      
      <!-- Texto lateral -->
      <text x="20" y="200" font-family="Arial, sans-serif" font-size="10" fill="#999999" transform="rotate(-90 20 200)">IMAGEM MERAMENTE ILUSTRATIVA</text>
    </svg>
  `)}`,
  
  // Genérico Isento (tarja amarela + azul)
  genericOtc: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <!-- Fundo branco -->
      <rect width="300" height="400" fill="#FFFFFF"/>
      
      <!-- Tarja amarela -->
      <rect x="0" y="250" width="300" height="60" fill="#FFC107"/>
      <text x="150" y="285" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#000000" text-anchor="middle">Medicamento Genérico</text>
      
      <!-- Tarja azul -->
      <rect x="0" y="310" width="300" height="50" fill="#2B6CB0"/>
      <text x="150" y="340" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">ISENTO DE PRESCRIÇÃO</text>
      
      <!-- Texto lateral -->
      <text x="20" y="200" font-family="Arial, sans-serif" font-size="10" fill="#999999" transform="rotate(-90 20 200)">IMAGEM MERAMENTE ILUSTRATIVA</text>
    </svg>
  `)}`
};

/**
 * Retorna a imagem padrão adequada baseada nas propriedades do produto
 * @param {Object} product - Objeto do produto
 * @returns {string} URL da imagem padrão
 */
export const getDefaultProductImage = (product) => {
  const isGeneric = product.is_generic || product.genericAvailable || false;
  const requiresPrescription = product.requires_prescription || product.requiresPrescription || false;
  
  // Genérico com receita
  if (isGeneric && requiresPrescription) {
    return DEFAULT_PRODUCT_IMAGES.generic;
  }
  
  // Genérico sem receita
  if (isGeneric && !requiresPrescription) {
    return DEFAULT_PRODUCT_IMAGES.genericOtc;
  }
  
  // Não genérico com receita
  if (!isGeneric && requiresPrescription) {
    return DEFAULT_PRODUCT_IMAGES.reference;
  }
  
  // Não genérico sem receita (isento)
  return DEFAULT_PRODUCT_IMAGES.otc;
};

/**
 * Retorna a imagem do produto ou a imagem padrão
 * @param {Object} product - Objeto do produto
 * @returns {string} URL da imagem
 */
export const getProductImage = (product) => {
  // Se tem imagem, retorna ela
  if (product.image_url || product.image) {
    return product.image_url || product.image;
  }
  
  // Se não tem imagem, retorna a imagem padrão adequada
  return getDefaultProductImage(product);
};

/**
 * Verifica se a URL da imagem é válida
 * @param {string} url - URL da imagem
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  
  // Se é data URL, é válido
  if (url.startsWith('data:')) return true;
  
  // Se começa com http/https, é válido
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  
  // Se é um caminho relativo, é válido
  if (url.startsWith('/') || url.startsWith('./')) return true;
  
  return false;
};
