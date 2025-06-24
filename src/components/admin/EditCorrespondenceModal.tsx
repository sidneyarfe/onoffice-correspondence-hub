
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Download, FileText } from 'lucide-react';

interface EditCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  correspondence: AdminCorrespondence | null;
  onSuccess: () => void;
}

const EditCorrespondenceModal: React.FC<EditCorrespondenceModalProps> = ({
  isOpen,
  onClose,
  correspondence,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    remetente: '',
    assunto: '',
    descricao: '',
    categoria: 'geral',
    data_recebimento: ''
  });
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (correspondence) {
      setFormData({
        remetente: correspondence.remetente,
        assunto: correspondence.assunto,
        descricao: correspondence.descricao || '',
        categoria: correspondence.categoria,
        data_recebimento: correspondence.data_recebimento
      });
      setCurrentFile(correspondence.arquivo_url);
      setNewFile(null);
    }
  }, [correspondence]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewFile(file);
    }
  };

  const removeCurrentFile = () => {
    setCurrentFile(null);
  };

  const removeNewFile = () => {
    setNewFile(null);
  };

  const downloadCurrentFile = async () => {
    if (!currentFile) return;

    try {
      const { data } = await supabase.storage
        .from('correspondencias')
        .createSignedUrl(currentFile, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correspondence) return;

    setLoading(true);
    try {
      let finalArquivoUrl = currentFile;

      // Se há um novo arquivo, fazer upload
      if (newFile) {
        setUploadingFile(true);
        const fileName = `${Date.now()}_${newFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('correspondencias')
          .upload(fileName, newFile);

        if (uploadError) throw uploadError;
        finalArquivoUrl = uploadData.path;
        setUploadingFile(false);
      }

      // Se removeu o arquivo atual e não há novo arquivo
      if (!currentFile && !newFile) {
        finalArquivoUrl = null;
      }

      // Atualizar correspondência
      const { error } = await supabase
        .from('correspondencias')
        .update({
          remetente: formData.remetente,
          assunto: formData.assunto,
          descricao: formData.descricao || null,
          categoria: formData.categoria,
          data_recebimento: formData.data_recebimento,
          arquivo_url: finalArquivoUrl
        })
        .eq('id', correspondence.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Correspondência atualizada com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar correspondência:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar correspondência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Correspondência</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="remetente">Remetente *</Label>
              <Input
                id="remetente"
                value={formData.remetente}
                onChange={(e) => handleInputChange('remetente', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiscal">Fiscal</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="bancario">Bancário</SelectItem>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={formData.assunto}
              onChange={(e) => handleInputChange('assunto', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_recebimento">Data de Recebimento *</Label>
            <Input
              id="data_recebimento"
              type="date"
              value={formData.data_recebimento}
              onChange={(e) => handleInputChange('data_recebimento', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              rows={4}
              placeholder="Descrição detalhada da correspondência..."
            />
          </div>

          {/* Gerenciamento de Arquivos */}
          <div className="space-y-4">
            <Label>Arquivo Anexo</Label>
            
            {/* Arquivo Atual */}
            {currentFile && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Arquivo atual</p>
                      <p className="text-sm text-gray-600">Anexo existente</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadCurrentFile}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeCurrentFile}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Novo Arquivo */}
            {newFile && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Novo arquivo</p>
                      <p className="text-sm text-gray-600">{newFile.name}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeNewFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Upload de Arquivo */}
            {!newFile && (
              <div className="space-y-2">
                <Label htmlFor="arquivo">
                  {currentFile ? 'Substituir arquivo' : 'Adicionar arquivo'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="arquivo"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="flex-1"
                  />
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingFile} className="on-button">
              {loading ? 'Salvando...' : uploadingFile ? 'Enviando arquivo...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCorrespondenceModal;
