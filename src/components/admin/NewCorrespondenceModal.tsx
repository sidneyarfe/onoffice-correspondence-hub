
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdminClients } from '@/hooks/useAdminClients';
import { Upload, X } from 'lucide-react';

interface NewCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewCorrespondenceModal: React.FC<NewCorrespondenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { clients } = useAdminClients();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    remetente: '',
    assunto: '',
    descricao: '',
    categoria: 'geral'
  });

  const categories = [
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'municipal', label: 'Municipal' },
    { value: 'estadual', label: 'Estadual' },
    { value: 'bancario', label: 'Bancário' },
    { value: 'trabalhista', label: 'Trabalhista' },
    { value: 'geral', label: 'Geral' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.remetente || !formData.assunto) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      let arquivo_url = null;

      // Upload do arquivo se existir
      if (selectedFile) {
        const fileName = `correspondencia-${Date.now()}-${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('correspondencias')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage
          .from('correspondencias')
          .getPublicUrl(uploadData.path);
        
        arquivo_url = urlData.publicUrl;
      }

      // Inserir correspondência
      const { error } = await supabase
        .from('correspondencias')
        .insert({
          ...formData,
          arquivo_url,
          data_recebimento: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Criar notificação para o cliente
      await supabase
        .from('notificacoes')
        .insert({
          user_id: formData.user_id,
          titulo: 'Nova Correspondência',
          mensagem: `Você recebeu uma nova correspondência: ${formData.assunto}`,
          tipo: 'info'
        });

      // Registrar atividade
      await supabase.rpc('registrar_atividade', {
        p_user_id: formData.user_id,
        p_acao: 'correspondencia_recebida',
        p_descricao: `Nova correspondência adicionada: ${formData.assunto}`
      });

      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        user_id: '',
        remetente: '',
        assunto: '',
        descricao: '',
        categoria: 'geral'
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro ao criar correspondência:', error);
      alert('Erro ao criar correspondência. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Correspondência</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div>
            <Label htmlFor="client">Cliente *</Label>
            <Select value={formData.user_id} onValueChange={(value) => handleInputChange('user_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.user_id || client.id}>
                    {client.name} - {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Remetente */}
          <div>
            <Label htmlFor="remetente">Remetente *</Label>
            <Input
              id="remetente"
              value={formData.remetente}
              onChange={(e) => handleInputChange('remetente', e.target.value)}
              placeholder="Ex: Receita Federal, Prefeitura..."
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assunto */}
          <div>
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={formData.assunto}
              onChange={(e) => handleInputChange('assunto', e.target.value)}
              placeholder="Descreva o assunto da correspondência"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={4}
            />
          </div>

          {/* Upload de Arquivo */}
          <div>
            <Label htmlFor="file-input">Anexo</Label>
            <div className="mt-2">
              {selectedFile ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <Label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-sm text-gray-600">Clique para selecionar um arquivo</span>
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, imagens ou documentos (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Correspondência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewCorrespondenceModal;
