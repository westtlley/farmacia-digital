import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pill, Plus, Search, BookOpen, AlertTriangle, Upload, Download, Database } from 'lucide-react';
import { toast } from 'sonner';
import { getAllMedications, addMedicationToDatabase } from '@/api/medicationAPI';
import { 
  importFromCSV, 
  importFromJSON, 
  loadCommonMedications,
  COMMON_MEDICATIONS_BR 
} from '@/api/medicationScraper';

export default function AdminMedications() {
  const { sidebarOpen } = useAdminSidebar();
  const [medications, setMedications] = useState(getAllMedications());
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newMedication, setNewMedication] = useState({
    name: '',
    activeIngredient: '',
    therapeuticClass: '',
    genericAvailable: true,
    commonDosages: '',
    indications: '',
    contraindications: '',
    sideEffects: '',
    usageWarning: '',
    basicInfo: '',
    requiresPrescription: false
  });

  const handleAddMedication = () => {
    if (!newMedication.name || !newMedication.activeIngredient) {
      toast.error('Nome e princípio ativo são obrigatórios');
      return;
    }

    const medicationData = {
      ...newMedication,
      commonDosages: newMedication.commonDosages.split(',').map(d => d.trim()),
      indications: newMedication.indications.split(',').map(i => i.trim()),
      contraindications: newMedication.contraindications.split(',').map(c => c.trim()),
      sideEffects: newMedication.sideEffects.split(',').map(s => s.trim())
    };

    addMedicationToDatabase(newMedication.name, medicationData);
    setMedications(getAllMedications());
    
    toast.success('Medicamento adicionado com sucesso!');
    setShowAddForm(false);
    setNewMedication({
      name: '',
      activeIngredient: '',
      therapeuticClass: '',
      genericAvailable: true,
      commonDosages: '',
      indications: '',
      contraindications: '',
      sideEffects: '',
      usageWarning: '',
      basicInfo: '',
      requiresPrescription: false
    });
  };

  const handleLoadCommon = () => {
    try {
      loadCommonMedications();
      setMedications(getAllMedications());
      toast.success('Medicamentos comuns carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar medicamentos comuns:', error);
      toast.error('Erro ao carregar medicamentos comuns');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.csv')) {
        await importFromCSV(file);
      } else if (file.name.endsWith('.json')) {
        await importFromJSON(file);
      } else {
        toast.error('Formato de arquivo não suportado. Use CSV ou JSON.');
        return;
      }
      
      setMedications(getAllMedications());
      toast.success('Medicamentos importados com sucesso!');
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar medicamentos: ' + (error.message || 'Tente novamente'));
    }
    
    // Limpar input para permitir importar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(medications, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medicamentos_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Exportação JSON concluída!');
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      toast.error('Erro ao exportar JSON');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Nome', 'Princípio Ativo', 'Classe Terapêutica', 'Dosagens', 'Indicações', 'Contraindicações', 'Efeitos Colaterais', 'Genérico', 'Requer Receita'];
      const rows = Object.values(medications).map(med => [
        med.name,
        med.activeIngredient,
        med.therapeuticClass || '',
        med.commonDosages?.join('; ') || '',
        med.indications?.join('; ') || '',
        med.contraindications?.join('; ') || '',
        med.sideEffects?.join('; ') || '',
        med.genericAvailable ? 'Sim' : 'Não',
        med.requiresPrescription ? 'Sim' : 'Não'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const dataBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medicamentos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Exportação CSV concluída!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
    }
  };

  const filteredMedications = Object.entries(medications).filter(([key, med]) =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Base de Medicamentos</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Gerencie informações de medicamentos para o chatbot</p>
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-4 sm:p-6"
        >
        {/* Info Card */}
        <div className="mb-6">

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Base de Conhecimento do Chatbot</h3>
                  <p className="text-sm text-blue-700">
                    Os medicamentos cadastrados aqui serão usados pelo chatbot para responder perguntas sobre 
                    indicações, contraindicações, efeitos colaterais e informações gerais. Isso melhora a 
                    experiência do cliente e reduz a necessidade de contato com farmacêutico para dúvidas simples.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Medicamentos</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(medications).length}</p>
                </div>
                <Pill className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Com Receita</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(medications).filter(m => m.requiresPrescription).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Genéricos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(medications).filter(m => m.genericAvailable).length}
                  </p>
                </div>
                <Pill className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Manual
              </Button>
              <Button 
                onClick={handleLoadCommon}
                variant="outline"
                className="w-full"
              >
                <Database className="w-4 h-4 mr-2" />
                Carregar Comuns
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Import/Export and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar medicamento por nome ou princípio ativo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv,.json"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                >
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              💡 Importar: Envie arquivos CSV ou JSON com medicamentos | Exportar: Faça backup da sua base
            </div>
          </CardContent>
        </Card>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6 border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <CardTitle>Adicionar Novo Medicamento</CardTitle>
              <CardDescription>Preencha as informações do medicamento</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Medicamento *</Label>
                  <Input
                    value={newMedication.name}
                    onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                    placeholder="Ex: Dipirona"
                  />
                </div>
                <div>
                  <Label>Princípio Ativo *</Label>
                  <Input
                    value={newMedication.activeIngredient}
                    onChange={(e) => setNewMedication({...newMedication, activeIngredient: e.target.value})}
                    placeholder="Ex: Dipirona Sódica"
                  />
                </div>
              </div>

              <div>
                <Label>Classe Terapêutica</Label>
                <Input
                  value={newMedication.therapeuticClass}
                  onChange={(e) => setNewMedication({...newMedication, therapeuticClass: e.target.value})}
                  placeholder="Ex: Analgésico e antitérmico"
                />
              </div>

              <div>
                <Label>Dosagens Comuns (separadas por vírgula)</Label>
                <Input
                  value={newMedication.commonDosages}
                  onChange={(e) => setNewMedication({...newMedication, commonDosages: e.target.value})}
                  placeholder="Ex: 500mg, 1g"
                />
              </div>

              <div>
                <Label>Indicações (separadas por vírgula)</Label>
                <Textarea
                  value={newMedication.indications}
                  onChange={(e) => setNewMedication({...newMedication, indications: e.target.value})}
                  placeholder="Ex: Dor, Febre, Dor de cabeça"
                  rows={2}
                />
              </div>

              <div>
                <Label>Contraindicações (separadas por vírgula)</Label>
                <Textarea
                  value={newMedication.contraindications}
                  onChange={(e) => setNewMedication({...newMedication, contraindications: e.target.value})}
                  placeholder="Ex: Hipersensibilidade aos componentes, Gravidez"
                  rows={2}
                />
              </div>

              <div>
                <Label>Efeitos Colaterais (separados por vírgula)</Label>
                <Textarea
                  value={newMedication.sideEffects}
                  onChange={(e) => setNewMedication({...newMedication, sideEffects: e.target.value})}
                  placeholder="Ex: Náusea, Tontura, Sonolência"
                  rows={2}
                />
              </div>

              <div>
                <Label>Informação Básica</Label>
                <Textarea
                  value={newMedication.basicInfo}
                  onChange={(e) => setNewMedication({...newMedication, basicInfo: e.target.value})}
                  placeholder="Descrição breve sobre o medicamento"
                  rows={3}
                />
              </div>

              <div>
                <Label>Aviso de Uso</Label>
                <Input
                  value={newMedication.usageWarning}
                  onChange={(e) => setNewMedication({...newMedication, usageWarning: e.target.value})}
                  placeholder="Ex: Uso sob prescrição médica"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newMedication.genericAvailable}
                    onCheckedChange={(checked) => setNewMedication({...newMedication, genericAvailable: checked})}
                  />
                  <Label>Genérico Disponível</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newMedication.requiresPrescription}
                    onCheckedChange={(checked) => setNewMedication({...newMedication, requiresPrescription: checked})}
                  />
                  <Label>Requer Receita</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddMedication} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medications List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedications.map(([key, med]) => (
            <Card key={key} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{med.name}</CardTitle>
                    <CardDescription>{med.activeIngredient}</CardDescription>
                  </div>
                  {med.requiresPrescription && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded">
                      Receita
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Classe:</p>
                  <p className="text-sm text-gray-600">{med.therapeuticClass}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Indicações:</p>
                  <p className="text-sm text-gray-600">{med.indications.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Dosagens:</p>
                  <p className="text-sm text-gray-600">{med.commonDosages.join(', ')}</p>
                </div>
                {med.genericAvailable && (
                  <div className="pt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      Genérico Disponível
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
