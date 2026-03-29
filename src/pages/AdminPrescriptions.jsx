import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Clock,
  Eye,
  FileText,
  Loader2,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABELS = {
  uploaded: 'Enviada',
  pending_review: 'Em revisao',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  expired: 'Expirada',
};

const STATUS_COLORS = {
  uploaded: 'bg-blue-100 text-blue-800',
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-700',
};

export default function AdminPrescriptions() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data: prescriptions = [], isLoading, error: prescriptionsError } = useQuery({
    queryKey: ['adminPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-created_date', 100),
    onError: (error) => {
      console.error('Erro ao carregar receitas:', error);
      toast.error('Erro ao carregar receitas. Tente novamente.');
    }
  });

  useEffect(() => {
    if (!selectedPrescription) {
      setReviewNotes('');
      setPreviewUrl('');
      return;
    }

    setReviewNotes(selectedPrescription.review_notes || '');

    let isActive = true;
    let objectUrl = '';

    const loadPreview = async () => {
      setIsLoadingPreview(true);

      try {
        const fileBlob = await base44.entities.Prescription.getFileBlob(selectedPrescription.id);
        if (!isActive) {
          return;
        }

        objectUrl = URL.createObjectURL(fileBlob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        console.error('Erro ao carregar preview da receita:', error);
        if (isActive) {
          toast.error('Nao foi possivel carregar o arquivo da receita.');
        }
      } finally {
        if (isActive) {
          setIsLoadingPreview(false);
        }
      }
    };

    loadPreview();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedPrescription]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, review_status }) =>
      base44.entities.Prescription.update(id, {
        status,
        review_status,
        review_notes: reviewNotes.trim(),
      }),
    onSuccess: (response) => {
      const nextPrescription = response?.prescription || response;
      queryClient.invalidateQueries({ queryKey: ['adminPrescriptions'] });
      setSelectedPrescription(nextPrescription);
      toast.success('Receita atualizada com sucesso.');
    },
    onError: (error) => {
      console.error('Erro ao revisar receita:', error);
      toast.error(error.message || 'Nao foi possivel atualizar a receita.');
    },
  });

  const pendingCount = useMemo(
    () => prescriptions.filter((prescription) => prescription.review_status === 'pending').length,
    [prescriptions]
  );

  const renderPreview = () => {
    if (isLoadingPreview) {
      return (
        <div className="rounded-xl border bg-gray-50 p-8 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
          Carregando arquivo...
        </div>
      );
    }

    if (!selectedPrescription || !previewUrl) {
      return (
        <div className="rounded-xl border bg-gray-50 p-8 text-center text-gray-500">
          Nenhuma visualizacao disponivel.
        </div>
      );
    }

    if (selectedPrescription.mime_type === 'application/pdf') {
      return <iframe src={previewUrl} title="Receita enviada" className="w-full h-[420px] rounded-xl border" />;
    }

    return <img src={previewUrl} alt="Receita enviada" className="w-full rounded-xl border max-h-[420px] object-contain bg-gray-50" />;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />

      <motion.main
        initial={false}
        animate={{
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Receitas Medicas</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {prescriptions.length} receitas cadastradas, {pendingCount} aguardando revisao
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-900">
              Antibioticos e controlados so podem virar pedido com receita aprovada.
            </div>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6"
        >
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando receitas...</p>
            </div>
          ) : prescriptionsError ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <p className="text-red-700">Erro ao carregar receitas. Tente recarregar a pagina.</p>
              </CardContent>
            </Card>
          ) : prescriptions.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma receita encontrada</h3>
                <p className="text-gray-500">As receitas enviadas pelo site aparecerao aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id} className="bg-white border-gray-200 hover:shadow-lg transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{prescription.customer_name || 'Cliente'}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {prescription.customer_phone || 'Sem telefone'}
                          </p>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[prescription.status] || STATUS_COLORS.uploaded}>
                        {STATUS_LABELS[prescription.status] || prescription.status}
                      </Badge>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
                      <p><strong>Arquivo:</strong> {prescription.original_filename || 'Arquivo sem nome'}</p>
                      <p><strong>Review:</strong> {prescription.review_status}</p>
                      <p><strong>Pedido:</strong> {prescription.order_id || 'Ainda nao vinculado'}</p>
                    </div>

                    {prescription.items_declared?.length > 0 && (
                      <div className="rounded-xl bg-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-800 mb-2">Itens declarados</p>
                        <p className="text-sm text-blue-900">{prescription.items_declared.join(', ')}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(prescription.uploaded_at || prescription.created_date).toLocaleString('pt-BR')}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedPrescription(prescription)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Revisar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() =>
                          reviewMutation.mutate({
                            id: prescription.id,
                            status: 'approved',
                            review_status: 'approved',
                          })
                        }
                        disabled={reviewMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          reviewMutation.mutate({
                            id: prescription.id,
                            status: 'rejected',
                            review_status: 'rejected',
                          })
                        }
                        disabled={reviewMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Revisao da Receita</DialogTitle>
            </DialogHeader>

            {selectedPrescription && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {renderPreview()}

                  <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
                    <p><strong>Cliente:</strong> {selectedPrescription.customer_name}</p>
                    <p><strong>Telefone:</strong> {selectedPrescription.customer_phone || 'Nao informado'}</p>
                    <p><strong>Email:</strong> {selectedPrescription.customer_email || 'Nao informado'}</p>
                    <p><strong>Paciente:</strong> {selectedPrescription.patient_name || 'Nao informado'}</p>
                    <p><strong>Prescritor:</strong> {selectedPrescription.prescriber_name || 'Nao informado'}</p>
                    <p><strong>Documento:</strong> {selectedPrescription.document_number || 'Nao informado'}</p>
                    <p><strong>Pedido:</strong> {selectedPrescription.order_id || 'Ainda nao vinculado'}</p>
                    <p><strong>Status:</strong> {selectedPrescription.status}</p>
                    <p><strong>Review status:</strong> {selectedPrescription.review_status}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedPrescription.items_declared?.length > 0 && (
                    <div className="rounded-2xl border bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Itens declarados</p>
                      <p className="text-sm text-blue-800">{selectedPrescription.items_declared.join(', ')}</p>
                    </div>
                  )}

                  {selectedPrescription.notes && (
                    <div className="rounded-2xl border bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Observacoes do cliente</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPrescription.notes}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-gray-900">Notas da revisao</p>
                    </div>
                    <Textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      className="min-h-[140px]"
                      placeholder="Registre aqui a observacao do farmacista ou do operador."
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: selectedPrescription.id,
                          status: 'pending_review',
                          review_status: 'pending',
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      Marcar em revisao
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: selectedPrescription.id,
                          status: 'approved',
                          review_status: 'approved',
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      Aprovar receita
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: selectedPrescription.id,
                          status: 'rejected',
                          review_status: 'rejected',
                        })
                      }
                      disabled={reviewMutation.isPending}
                    >
                      Rejeitar receita
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.main>
    </div>
  );
}
