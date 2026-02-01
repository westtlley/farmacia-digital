import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Check, AlertCircle, Search } from 'lucide-react';
import { searchCep } from '@/utils/cepApi';
import { toast } from 'sonner';

export default function AddressForm({ 
  initialAddress = null, 
  onAddressChange,
  onCalculate,
  subtotal = 0,
  pharmacyAddress = null
}) {
  const [address, setAddress] = useState({
    zipcode: initialAddress?.zipcode || '',
    street: initialAddress?.street || '',
    number: initialAddress?.number || '',
    complement: initialAddress?.complement || '',
    neighborhood: initialAddress?.neighborhood || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || ''
  });

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [cepError, setCepError] = useState('');

  // Carregar endereço salvo
  useEffect(() => {
    const saved = localStorage.getItem('deliveryAddress');
    if (saved && !initialAddress) {
      try {
        const parsed = JSON.parse(saved);
        setAddress(parsed);
        if (onAddressChange) onAddressChange(parsed);
      } catch (error) {
        console.error('Erro ao carregar endereço salvo:', error);
      }
    }
  }, []);

  const formatCep = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCepChange = async (e) => {
    const formatted = formatCep(e.target.value);
    setAddress(prev => ({ ...prev, zipcode: formatted }));
    setCepError('');

    // Buscar CEP automaticamente quando tiver 8 dígitos
    const cleanCep = formatted.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      await searchCepByInput(cleanCep);
    }
  };

  const searchCepByInput = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError('CEP deve conter 8 dígitos');
      return;
    }

    setIsLoadingCep(true);
    setCepError('');

    try {
      const cepData = await searchCep(cleanCep);
      const updatedAddress = {
        ...address,
        ...cepData,
        zipcode: formatCep(cepData.zipcode)
      };
      
      setAddress(updatedAddress);
      
      if (onAddressChange) {
        onAddressChange(updatedAddress);
      }

      toast.success('Endereço encontrado!');
    } catch (error) {
      setCepError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setAddress(prev => {
      const updated = { ...prev, [field]: value };
      if (onAddressChange) onAddressChange(updated);
      return updated;
    });
  };

  const handleCalculate = async () => {
    // Validar campos obrigatórios
    if (!address.zipcode || address.zipcode.replace(/\D/g, '').length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    if (!address.street || !address.number || !address.neighborhood || !address.city || !address.state) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsCalculating(true);

    try {
      // Salvar endereço
      localStorage.setItem('deliveryAddress', JSON.stringify(address));

      if (onCalculate) {
        await onCalculate(address);
      }

      toast.success('Frete calculado com sucesso!');
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      toast.error('Erro ao calcular frete. Tente novamente.');
    } finally {
      setIsCalculating(false);
    }
  };

  const isAddressComplete = 
    address.zipcode?.replace(/\D/g, '').length === 8 &&
    address.street &&
    address.number &&
    address.neighborhood &&
    address.city &&
    address.state;

  return (
    <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <MapPin className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Endereço de Entrega</h3>
          <p className="text-sm text-gray-500">Preencha seu endereço completo</p>
        </div>
      </div>

      {/* CEP */}
      <div>
        <Label htmlFor="zipcode">CEP *</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="zipcode"
              type="text"
              value={address.zipcode}
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              className="pl-10"
              disabled={isLoadingCep}
            />
          </div>
          <Button
            type="button"
            onClick={() => searchCepByInput(address.zipcode.replace(/\D/g, ''))}
            disabled={isLoadingCep || address.zipcode.replace(/\D/g, '').length !== 8}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoadingCep ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        {cepError && (
          <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {cepError}
          </p>
        )}
        {isLoadingCep && (
          <p className="text-sm text-gray-500 mt-1">Buscando endereço...</p>
        )}
      </div>

      {/* Rua */}
      <div>
        <Label htmlFor="street">Rua/Logradouro *</Label>
        <Input
          id="street"
          value={address.street}
          onChange={(e) => handleFieldChange('street', e.target.value)}
          placeholder="Rua, Avenida, etc."
          className="mt-1"
        />
      </div>

      {/* Número e Complemento */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={address.number}
            onChange={(e) => handleFieldChange('number', e.target.value)}
            placeholder="123"
            className="mt-1"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address.complement}
            onChange={(e) => handleFieldChange('complement', e.target.value)}
            placeholder="Apto, Bloco, etc."
            className="mt-1"
          />
        </div>
      </div>

      {/* Bairro */}
      <div>
        <Label htmlFor="neighborhood">Bairro *</Label>
        <Input
          id="neighborhood"
          value={address.neighborhood}
          onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
          placeholder="Nome do bairro"
          className="mt-1"
        />
      </div>

      {/* Cidade e Estado */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="Nome da cidade"
            className="mt-1"
          />
        </div>
        <div className="col-span-1">
          <Label htmlFor="state">Estado *</Label>
          <Input
            id="state"
            value={address.state}
            onChange={(e) => handleFieldChange('state', e.target.value.toUpperCase())}
            placeholder="UF"
            maxLength={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Botão Calcular */}
      <Button
        onClick={handleCalculate}
        disabled={!isAddressComplete || isCalculating}
        className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
      >
        {isCalculating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Calculando frete...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Calcular Frete
          </>
        )}
      </Button>

      <a 
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-emerald-600 hover:underline block text-center"
      >
        Não sei meu CEP
      </a>
    </div>
  );
}
