/**
 * Configuração do Cloudinary
 * Para usar imagens do Cloudinary, configure as variáveis de ambiente
 */

const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
  apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || '',
};

/**
 * Gera URL de imagem otimizada do Cloudinary
 * @param {string} imagePath - Caminho da imagem no Cloudinary
 * @param {object} options - Opções de transformação
 * @returns {string} URL da imagem otimizada
 */
export const getCloudinaryUrl = (imagePath, options = {}) => {
  if (!cloudinaryConfig.cloudName) {
    // Se não houver configuração do Cloudinary, retorna URL original
    return imagePath;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options;

  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  transformations.push(`c_${crop}`);
  if (gravity !== 'auto') transformations.push(`g_${gravity}`);

  const transformString = transformations.join(',');
  const baseUrl = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload`;

  // Se a imagem já é uma URL do Cloudinary, extrai o path
  if (imagePath.includes('cloudinary.com')) {
    const urlParts = imagePath.split('/upload/');
    if (urlParts.length > 1) {
      return `${baseUrl}/${transformString}/${urlParts[1]}`;
    }
  }

  // Se é um path local, adiciona as transformações
  return `${baseUrl}/${transformString}/${imagePath}`;
};

/**
 * Upload de imagem para o Cloudinary
 * @param {File} file - Arquivo de imagem
 * @param {object} options - Opções de upload
 * @returns {Promise<object>} Resultado do upload
 */
export const uploadToCloudinary = async (file, options = {}) => {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey) {
    throw new Error('Cloudinary não configurado. Configure as variáveis de ambiente.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', options.uploadPreset || 'default_preset');
  formData.append('cloud_name', cloudinaryConfig.cloudName);

  if (options.folder) {
    formData.append('folder', options.folder);
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao fazer upload para o Cloudinary');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error('Erro no upload do Cloudinary:', error);
    throw error;
  }
};

export default cloudinaryConfig;
