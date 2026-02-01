import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Camera,
  Check,
  Loader2,
  AlertCircle,
  X,
  Plus,
  Pill,
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';

export default function UploadPrescription() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou PDF.');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setFile(selectedFile);

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    setIsUploading(false);
    setIsAnalyzing(true);

    // Analyze prescription with AI
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dosage: { type: 'string' },
                quantity: { type: 'string' },
                instructions: { type: 'string' }
              }
            }
          },
          doctor_name: { type: 'string' },
          crm: { type: 'string' },
          date: { type: 'string' }
        }
      }
    });

    setIsAnalyzing(false);

    if (result.status === 'success' && result.output) {
      setExtractedData(result.output);
      setStep(2);
      toast.success('Receita analisada com sucesso!');
    } else {
      toast.error('Não foi possível analisar a receita. Tente novamente.');
    }
  };

  const theme = useTheme();
  
  const handleSendToWhatsApp = () => {
    let message = `Olá! Gostaria de fazer um pedido baseado na minha receita médica.\n\n`;
    message += `*Dados do Cliente:*\n`;
    message += `Nome: ${customerInfo.name}\n`;
    message += `Telefone: ${customerInfo.phone}\n\n`;
    
    if (extractedData?.medications?.length > 0) {
      message += `*Medicamentos da Receita:*\n`;
      extractedData.medications.forEach((med, i) => {
        message += `${i + 1}. ${med.name}`;
        if (med.dosage) message += ` - ${med.dosage}`;
        if (med.quantity) message += ` (${med.quantity})`;
        message += `\n`;
      });
    }
    
    if (customerInfo.notes) {
      message += `\n*Observações:*\n${customerInfo.notes}`;
    }
    
    message += `\n\nAguardo o orçamento. Obrigado!`;

    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (whatsappNumber) {
      const url = createWhatsAppUrl(whatsappNumber, message);
      if (url) window.open(url, '_blank');
    } else {
      toast.error('WhatsApp não configurado. Configure nas Configurações da farmácia.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enviar Receita Médica</h1>
          <p className="text-gray-500">
            Envie sua receita e receba um orçamento personalizado em minutos
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  step > s ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    1. Envie a foto ou PDF da receita
                  </h2>

                  {!file ? (
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium mb-2">
                          Clique para enviar ou arraste o arquivo
                        </p>
                        <p className="text-sm text-gray-400">
                          JPG, PNG ou PDF (máx. 10MB)
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="space-y-6">
                      {/* Preview */}
                      <div className="relative bg-gray-100 rounded-2xl p-4">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Receita"
                            className="max-h-80 mx-auto rounded-lg"
                          />
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <FileText className="w-16 h-16 text-gray-400" />
                            <div className="ml-4">
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setFile(null);
                            setFilePreview(null);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <Button
                        onClick={handleUpload}
                        disabled={isUploading || isAnalyzing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analisando receita...
                          </>
                        ) : (
                          <>
                            Analisar Receita
                            <ChevronRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Camera className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-gray-600">Tire uma foto clara</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-gray-600">Ou envie um PDF</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <Check className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-gray-600">Receba orçamento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    2. Confira os medicamentos identificados
                  </h2>

                  {extractedData?.medications?.length > 0 ? (
                    <div className="space-y-4 mb-8">
                      {extractedData.medications.map((med, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl"
                        >
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Pill className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{med.name}</p>
                            <p className="text-sm text-gray-500">
                              {med.dosage && `Dosagem: ${med.dosage}`}
                              {med.quantity && ` • Qtd: ${med.quantity}`}
                            </p>
                            {med.instructions && (
                              <p className="text-xs text-gray-400 mt-1">{med.instructions}</p>
                            )}
                          </div>
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 mb-8 bg-amber-50 rounded-xl">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <p className="text-amber-800 font-medium">
                        Não conseguimos identificar os medicamentos automaticamente
                      </p>
                      <p className="text-amber-600 text-sm mt-1">
                        Não se preocupe! Nosso farmacêutico irá analisar sua receita manualmente.
                      </p>
                    </div>
                  )}

                  {extractedData?.doctor_name && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                      <p className="text-sm text-gray-500">Médico</p>
                      <p className="font-medium text-gray-900">{extractedData.doctor_name}</p>
                      {extractedData.crm && (
                        <p className="text-sm text-gray-500">CRM: {extractedData.crm}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Enviar outra receita
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Continuar
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Contact Info */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    3. Seus dados para contato
                  </h2>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome completo
                      </label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp
                      </label>
                      <Input
                        value={customerInfo.phone}
                        onChange={(e) => {
                          const formatted = applyPhoneMask(e.target.value);
                          setCustomerInfo(prev => ({ ...prev, phone: formatted }));
                        }}
                        placeholder="(00) 00000-0000"
                        className="h-12"
                        maxLength={15}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações (opcional)
                      </label>
                      <Textarea
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Alguma informação adicional..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleSendToWhatsApp}
                      disabled={!customerInfo.name || !customerInfo.phone}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Solicitar Orçamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Importante</h3>
              <p className="text-sm text-blue-700">
                Medicamentos controlados (tarja preta) exigem a apresentação da receita original 
                no momento da entrega. O receituário será conferido e retido conforme legislação vigente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}