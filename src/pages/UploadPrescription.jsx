import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  FileCheck,
  FileText,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { useTheme } from '@/components/pharmacy/ThemeProvider';
import { formatWhatsAppNumber, createWhatsAppUrl } from '@/utils/whatsapp';
import { applyPhoneMask } from '@/utils/phoneFormat';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadPrescription() {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPrescription, setCreatedPrescription] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    patient_name: '',
    prescriber_name: '',
    document_number: '',
    items_declared: '',
    notes: '',
  });

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return;
        }

        setCustomerInfo((prev) => ({
          ...prev,
          name: prev.name || user.full_name || '',
          patient_name: prev.patient_name || user.full_name || '',
          email: prev.email || user.email || '',
          phone: prev.phone || (user.phone ? applyPhoneMask(user.phone) : ''),
        }));
      } catch (error) {
        console.error('Erro ao carregar usuario para receita:', error);
      }
    };

    loadCurrentUser();
  }, []);

  const declaredItems = useMemo(
    () =>
      customerInfo.items_declared
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    [customerInfo.items_declared]
  );

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      toast.error('Formato invalido. Use PDF, JPG, PNG ou WEBP.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Arquivo muito grande. Limite de 10MB.');
      return;
    }

    setFile(selectedFile);
    setCreatedPrescription(null);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => setFilePreview(loadEvent.target?.result || null);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Selecione um arquivo de receita antes de continuar.');
      return;
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      toast.error('Informe nome e telefone para vincular a receita.');
      return;
    }

    setIsSubmitting(true);

    try {
      const prescription = await base44.entities.Prescription.create({
        file,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email.trim(),
        patient_name: customerInfo.patient_name.trim() || customerInfo.name.trim(),
        prescriber_name: customerInfo.prescriber_name.trim(),
        document_number: customerInfo.document_number.trim(),
        items_declared: declaredItems,
        notes: customerInfo.notes.trim(),
        status: 'uploaded',
        review_status: 'pending',
      });

      setCreatedPrescription(prescription);
      setStep(3);
      toast.success('Receita enviada com sucesso! A revisao agora e manual.');
    } catch (error) {
      console.error('Erro ao enviar receita:', error);
      toast.error(error.message || 'Nao foi possivel enviar a receita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToWhatsApp = () => {
    if (!createdPrescription) {
      return;
    }

    const whatsappNumber = formatWhatsAppNumber(theme.whatsapp);
    if (!whatsappNumber) {
      toast.error('WhatsApp nao configurado. Ajuste nas configuracoes da farmacia.');
      return;
    }

    let message = 'Ola! Acabei de enviar uma receita pelo site.\n\n';
    message += `Protocolo: ${createdPrescription.id}\n`;
    message += `Cliente: ${createdPrescription.customer_name}\n`;
    message += `Telefone: ${createdPrescription.customer_phone}\n`;

    if (createdPrescription.patient_name) {
      message += `Paciente: ${createdPrescription.patient_name}\n`;
    }

    if (declaredItems.length > 0) {
      message += `Itens declarados: ${declaredItems.join(', ')}\n`;
    }

    message += '\nAguardo a revisao da farmacia.';

    const url = createWhatsAppUrl(whatsappNumber, message);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enviar Receita Medica</h1>
          <p className="text-gray-500">
            O arquivo fica salvo no servidor e a analise e revisao sao manuais pelo painel administrativo.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { id: 1, label: 'Arquivo' },
            { id: 2, label: 'Dados' },
            { id: 3, label: 'Confirmacao' },
          ].map((entry, index) => (
            <div key={entry.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= entry.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step > entry.id ? <Check className="w-5 h-5" /> : entry.id}
              </div>
              {index < 2 && (
                <div className={`w-16 h-1 mx-2 ${step > entry.id ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="upload-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8 space-y-6">
                  <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-900">
                    <p className="font-semibold mb-1">Politica deste fluxo</p>
                    <p className="text-sm">
                      Nao ha OCR nem extracao automatica. O documento e anexado como prova e a farmacia revisa manualmente.
                    </p>
                  </div>

                  {!file ? (
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-700 font-medium mb-2">Selecione o arquivo da receita</p>
                        <p className="text-sm text-gray-500">PDF, JPG, PNG ou WEBP com ate 10MB</p>
                      </div>
                    </label>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative bg-gray-100 rounded-2xl p-4">
                        {filePreview ? (
                          <img src={filePreview} alt="Receita selecionada" className="max-h-80 mx-auto rounded-lg" />
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <FileText className="w-16 h-16 text-gray-400" />
                            <div className="ml-4">
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setFile(null);
                            setFilePreview(null);
                          }}
                          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep(2)}>
                          Continuar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="details-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="font-semibold">Revisao manual</p>
                      <p>A farmacia vai revisar o documento no admin antes de liberar itens que exigem aprovacao.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      value={customerInfo.name}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Nome do cliente"
                    />
                    <Input
                      value={customerInfo.phone}
                      onChange={(event) =>
                        setCustomerInfo((prev) => ({ ...prev, phone: applyPhoneMask(event.target.value) }))
                      }
                      placeholder="Telefone / WhatsApp"
                      maxLength={15}
                    />
                    <Input
                      type="email"
                      value={customerInfo.email}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Email (opcional)"
                    />
                    <Input
                      value={customerInfo.patient_name}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, patient_name: event.target.value }))}
                      placeholder="Nome do paciente (opcional)"
                    />
                    <Input
                      value={customerInfo.prescriber_name}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, prescriber_name: event.target.value }))}
                      placeholder="Nome do prescritor (opcional)"
                    />
                    <Input
                      value={customerInfo.document_number}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, document_number: event.target.value }))}
                      placeholder="Numero do documento (opcional)"
                    />
                  </div>

                  <div className="space-y-4">
                    <Textarea
                      value={customerInfo.items_declared}
                      onChange={(event) =>
                        setCustomerInfo((prev) => ({ ...prev, items_declared: event.target.value }))
                      }
                      placeholder="Itens declarados na receita (um por linha ou separados por virgula)"
                      className="min-h-[110px]"
                    />
                    <Textarea
                      value={customerInfo.notes}
                      onChange={(event) => setCustomerInfo((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Observacoes adicionais para a farmacia"
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Voltar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando receita...
                        </>
                      ) : (
                        'Enviar para revisao'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && createdPrescription && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8 space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileCheck className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Receita registrada</h2>
                    <p className="text-gray-600">
                      Protocolo <strong>{createdPrescription.id}</strong>. O documento ja esta no backend e no painel admin.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border bg-gray-50">
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      <p className="font-semibold text-gray-900">{createdPrescription.status}</p>
                    </div>
                    <div className="p-4 rounded-2xl border bg-gray-50">
                      <p className="text-sm text-gray-500 mb-1">Review status</p>
                      <p className="font-semibold text-gray-900">{createdPrescription.review_status}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold">O que vale agora</p>
                        <p>Itens simples com receita anexada podem seguir para checkout. Antibioticos e controlados dependem de aprovacao manual.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleSendToWhatsApp}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Avisar via WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep(1);
                        setFile(null);
                        setFilePreview(null);
                        setCreatedPrescription(null);
                        setCustomerInfo((prev) => ({
                          ...prev,
                          items_declared: '',
                          notes: '',
                          prescriber_name: '',
                          document_number: '',
                        }));
                      }}
                    >
                      Enviar outra receita
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
