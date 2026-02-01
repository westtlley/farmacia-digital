import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

export default function AdminImportHistory() {
  const { sidebarOpen } = useAdminSidebar();
  const [selectedLog, setSelectedLog] = React.useState(null);

  const { data: importLogs = [], isLoading, error: importLogsError } = useQuery({
    queryKey: ['importLogs'],
    queryFn: () => base44.entities.ImportLog.list('-created_date', 100),
    onError: (error) => {
      console.error('Erro ao carregar histórico de importações:', error);
    }
  });

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Histórico de Importações</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{importLogs.length} importações realizadas</p>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6 max-w-6xl mx-auto"
        >
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200/50">
          <CardHeader>
            <CardTitle>Todas as Importações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Carregando histórico...</p>
              </div>
            ) : importLogsError ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                <p className="text-red-700 mb-2">Erro ao carregar histórico</p>
                <p className="text-sm text-gray-500">Tente recarregar a página</p>
              </div>
            ) : importLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Nenhuma importação realizada ainda</p>
                <Link to={createPageUrl('AdminImportProducts')}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    Fazer Primeira Importação
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Criados</TableHead>
                      <TableHead className="text-center">Atualizados</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center">Duração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium">{log.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {log.total_products}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-semibold">
                            {log.products_created}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {log.products_updated > 0 && (
                            <span className="text-blue-600 font-semibold">
                              {log.products_updated}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.products_errors > 0 ? (
                            <Button
                              variant="link"
                              className="text-red-600 font-semibold p-0 h-auto"
                              onClick={() => setSelectedLog(log)}
                            >
                              {log.products_errors}
                            </Button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-600">
                            <Clock className="w-3 h-3" />
                            {formatDuration(log.duration_seconds)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(log.status)}>
                            {getStatusLabel(log.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {importLogs.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-6 text-center">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{importLogs.length}</p>
                <p className="text-sm text-gray-500">Importações</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {importLogs.reduce((sum, log) => sum + log.products_created, 0)}
                </p>
                <p className="text-sm text-gray-500">Produtos Criados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {importLogs.reduce((sum, log) => sum + log.products_errors, 0)}
                </p>
                <p className="text-sm text-gray-500">Erros Totais</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(importLogs.reduce((sum, log) => sum + log.duration_seconds, 0))}
                </p>
                <p className="text-sm text-gray-500">Tempo Total</p>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Importação</DialogTitle>
            <DialogDescription>
              {selectedLog?.file_name} - {selectedLog && format(new Date(selectedLog.created_date), 'dd/MM/yyyy HH:mm')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{selectedLog.total_products}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Criados</p>
                  <p className="text-xl font-bold text-green-600">{selectedLog.products_created}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Atualizados</p>
                  <p className="text-xl font-bold text-blue-600">{selectedLog.products_updated}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Erros</p>
                  <p className="text-xl font-bold text-red-600">{selectedLog.products_errors}</p>
                </div>
              </div>

              {selectedLog.error_details && selectedLog.error_details.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Erros Encontrados ({selectedLog.error_details.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedLog.error_details.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Badge variant="destructive" className="mt-0.5">
                            Linha {error.row}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{error.product_name}</p>
                            <p className="text-sm text-red-600 mt-1">{error.error_message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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