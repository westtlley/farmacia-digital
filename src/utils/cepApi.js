/**
 * API para busca de CEP e cálculo de distância
 */

/**
 * Busca endereço pelo CEP usando ViaCEP
 */
export const searchCep = async (cep) => {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      zipcode: cleanCep,
      complement: ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw new Error('Erro ao buscar CEP. Tente novamente.');
  }
};

/**
 * Obtém coordenadas geográficas de um endereço usando múltiplas APIs
 */
export const getCoordinates = async (address) => {
  // Primeiro, tentar com endereço completo
  let addressString = `${address.street}, ${address.number || ''}, ${address.neighborhood}, ${address.city}, ${address.state}, Brasil`;
  
  try {
    // Tentar Nominatim primeiro
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FarmaciaDigital/1.0',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.length > 0 && data[0].lat && data[0].lon) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }

    // Se não encontrou, tentar sem número
    if (address.number) {
      addressString = `${address.street}, ${address.neighborhood}, ${address.city}, ${address.state}, Brasil`;
      const response2 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`,
        {
          headers: {
            'User-Agent': 'FarmaciaDigital/1.0',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        }
      );
      
      const data2 = await response2.json();
      if (data2.length > 0 && data2[0].lat && data2[0].lon) {
        return {
          lat: parseFloat(data2[0].lat),
          lon: parseFloat(data2[0].lon)
        };
      }
    }

    // Fallback: usar coordenadas aproximadas da cidade
    throw new Error('Endereço específico não encontrado, usando coordenadas da cidade');
  } catch (error) {
    console.error('Erro ao obter coordenadas:', error);
    
    // Fallback: buscar coordenadas da cidade como último recurso
    try {
      const cityAddress = `${address.city}, ${address.state}, Brasil`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityAddress)}&limit=1`,
        {
          headers: {
            'User-Agent': 'FarmaciaDigital/1.0',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        }
      );
      
      const data = await response.json();
      if (data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          approximate: true // Marcar como aproximado
        };
      }
    } catch (fallbackError) {
      console.error('Erro no fallback:', fallbackError);
    }
    
    throw new Error('Não foi possível obter a localização do endereço');
  }
};

/**
 * Calcula distância entre duas coordenadas usando fórmula de Haversine
 * Retorna distância em quilômetros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Arredondar para 1 casa decimal
};

/**
 * Calcula frete baseado em distância (similar Uber/99)
 * @param {number} distanceKm - Distância em quilômetros
 * @param {object} config - Configurações de frete
 */
export const calculateDeliveryFee = (distanceKm, config = {}) => {
  const {
    baseFee = 5.00,        // Taxa base
    pricePerKm = 2.50,     // Preço por km
    minFee = 8.00,         // Valor mínimo
    maxFee = 50.00,        // Valor máximo
    freeDeliveryAbove = 150 // Frete grátis acima de
  } = config;

  // Calcular frete baseado na distância
  let fee = baseFee + (distanceKm * pricePerKm);
  
  // Aplicar limites
  fee = Math.max(minFee, fee);
  fee = Math.min(maxFee, fee);
  
  return {
    fee: Math.round(fee * 100) / 100,
    distance: distanceKm,
    baseFee,
    pricePerKm,
    estimatedTime: calculateEstimatedTime(distanceKm)
  };
};

/**
 * Calcula tempo estimado de entrega baseado na distância
 */
const calculateEstimatedTime = (distanceKm) => {
  const avgSpeed = 30; // km/h média de motoboy
  const minutes = Math.round((distanceKm / avgSpeed) * 60);
  
  if (minutes < 30) return '30-45 min';
  if (minutes < 60) return '45-60 min';
  if (minutes < 90) return '1-1.5 horas';
  if (minutes < 120) return '1.5-2 horas';
  return '2-3 horas';
};
