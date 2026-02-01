import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText,
  Phone,
  Eye,
  Check,
  X,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPrescriptions() {
  const queryClient = useQueryClient();
  const { sidebarOpen } = useAdminSidebar();
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const { data: prescriptions = [], isLoading, error: prescriptionsError } = useQuery({
    queryKey: ['adminPrescriptions'],
    queryFn: () => base44.entities.Prescription.list('-created_date', 100),
    onError: (error) => {
      console.error('Erro ao carregar receitas:', error);
      toast.error('Erro ao carregar receitas. Tente recarregar a página.');
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Prescription.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminPrescriptions']);
      setSelectedPrescription(null);
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      analyzed: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      processing: 'Processando',
      analyzed: 'Analisada',
      completed: 'Concluída',
      rejected: 'Rejeitada'
    };
    return labels[status] || status;
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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Receitas Médicas</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{prescriptions.length} receitas recebidas</p>
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
              <p className="text-red-700">Erro ao carregar receitas. Tente recarregar a página.</p>
            </CardContent>
          </Card>
        ) : prescriptions.length === 0 ? (
          <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma receita encontrada</h3>
              <p className="text-gray-500">Ainda não há receitas cadastradas</p>
            </CardContent>
          </Card>
        ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prescriptions.map((prescription) => (
            <Card key={prescription.id} className="bg-white/60 backdrop-blur-sm border-gray-200/50 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{prescription.customer_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {prescription.customer_phone}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(prescription.status)}>
                    {getStatusLabel(prescription.status)}
                  </Badge>
                </div>

                {prescription.extracted_data?.medications && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Medicamentos:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {prescription.extracted_data.medications.slice(0, 2).map((med, i) => (
                        <li key={i}>• {med.name}</li>
                      ))}
                      {prescription.extracted_data.medications.length > 2 && (
                        <li className="text-gray-500">+ {prescription.extracted_data.medications.length - 2} mais</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Clock className="w-3 h-3" />
                  {new Date(prescription.created_date).toLocaleString('pt-BR')}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg"
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  {prescription.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 rounded-lg"
                        onClick={() => updateStatus.mutate({ id: prescription.id, status: 'analyzed' })}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() => updateStatus.mutate({ id: prescription.id, status: 'rejected' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
        </motion.div>

      {/* View Dialog */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Receita</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedPrescription.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{selectedPrescription.customer_phone}</p>
                </div>
              </div>
              
              {selectedPrescription.file_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Receita</p>
                  <img 
                    src={selectedPrescription.file_url} 
                    alt="Receita"
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </motion.main>
    </div>
  );
}