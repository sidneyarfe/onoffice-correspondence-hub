
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAdminDocuments, AdminDocument } from '@/hooks/useAdminDocuments';
import { Upload, File, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: AdminDocument | null;
  onSuccess: () => void;
}

const DocumentFormModal = ({ isOpen, onClose, document, onSuccess }: DocumentFormModalProps) => {
  const [formData, setFormData] = useState({
    tipo: document?.tipo || '',
    nome: document?.nome || '',
    descricao: document?.descricao || '',
    disponivel_por_padrao: document?.disponivel_por_padrao ?? true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createDocument, updateDocument, uploadDocumentFile, deleteDocumentFile } = useAdminDocuments();

  React.useEffect(() => {
    if (document) {
      setFormData({
        tipo: document.tipo,
        nome: document.nome,
        descricao: document.descricao || '',
        disponivel_por_padrao: document.disponivel_por_padrao
      });
    } else {
      setFormData({
        tipo: '',
        nome: '',
        descricao: '',
        disponivel_por_padrao: true
      });
    }
    setSelectedFile(null);
  }, [document, isOpen]);

  const checkAuthAndProfile = async () => {
    console.log('=== VERIFICANDO AUTENTICAÇÃO ===');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Usuário autenticado:', user?.id, user?.email);
    
    if (authError) {
      console.error('Erro de autenticação:', authError);
      return false;
    }

    if (!user) {
      console.error('Usuário não autenticado');
      return false;
    }

    // Verificar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Perfil do usuário:', profile);
    
    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      return false;
    }

    if (profile?.role !== 'admin') {
      console.error('Usuário não é admin:', profile?.role);
      return false;
    }

    console.log('✓ Usuário autenticado como admin');
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Arquivo selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Verificar tamanho do arquivo (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. O tamanho máximo é 50MB.",
          variant: "destructive"
        });
        return;
      }

      // Verificar tipo de arquivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        console.error('Tipo de arquivo não permitido:', file.type);
        toast({
          title: "Erro",
          description: "Tipo de arquivo não permitido. Use PDF, imagens, DOC ou XLS.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingFile = async () => {
    if (!document?.arquivo_url) return;

    console.log('Removendo arquivo existente:', document.arquivo_url);

    try {
      setUploading(true);
      await deleteDocumentFile(document.arquivo_url);
      await updateDocument(document.id, { arquivo_url: null });
      
      toast({
        title: "Sucesso",
        description: "Arquivo removido com sucesso"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover arquivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== INICIANDO SUBMISSÃO DO FORMULÁRIO ===');
    console.log('Dados do formulário:', formData);
    console.log('Arquivo selecionado:', selectedFile?.name);
    
    if (!formData.tipo || !formData.nome) {
      toast({
        title: "Erro",
        description: "Tipo e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Verificar autenticação antes de prosseguir
    const isAuthenticated = await checkAuthAndProfile();
    if (!isAuthenticated) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado como admin",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let arquivo_url = document?.arquivo_url || null;

      // Upload do arquivo se foi selecionado
      if (selectedFile) {
        console.log('Fazendo upload do arquivo...');
        setUploading(true);
        
        try {
          arquivo_url = await uploadDocumentFile(selectedFile, formData.tipo);
          console.log('Upload concluído:', arquivo_url);
        } catch (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Erro no upload: ${uploadError instanceof Error ? uploadError.message : 'Erro desconhecido'}`);
        } finally {
          setUploading(false);
        }
      }

      const documentData = {
        ...formData,
        arquivo_url
      };

      console.log('Salvando documento:', documentData);

      if (document) {
        await updateDocument(document.id, documentData);
        console.log('Documento atualizado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso"
        });
      } else {
        await createDocument(documentData);
        console.log('Documento criado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento criado com sucesso"
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro detalhado ao salvar documento:', error);
      
      let errorMessage = 'Erro ao salvar documento';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
          <DialogDescription>
            {document ? 'Edite as informações do documento.' : 'Crie um novo documento para disponibilizar aos clientes.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value.toUpperCase() }))}
                placeholder="Ex: IPTU, AVCB, INSCRICAO_ESTADUAL"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do documento"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição do documento"
              rows={3}
            />
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-4">
            <Label>Arquivo do Documento</Label>
            
            {/* Arquivo Existente */}
            {document?.arquivo_url && !selectedFile && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Arquivo atual</p>
                      <p className="text-sm text-gray-600">
                        {document.arquivo_url.split('/').pop()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveExistingFile}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Seleção de Novo Arquivo */}
            {!selectedFile && (!document?.arquivo_url || document?.arquivo_url) && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {document?.arquivo_url ? 'Substituir Arquivo' : 'Selecionar Arquivo'}
                </Button>
                <p className="text-xs text-gray-500">
                  Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (máx. 50MB)
                </p>
              </div>
            )}

            {/* Arquivo Selecionado */}
            {selectedFile && (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="disponivel_por_padrao"
              checked={formData.disponivel_por_padrao}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disponivel_por_padrao: checked }))}
            />
            <Label htmlFor="disponivel_por_padrao">Disponível por padrão para novos clientes</Label>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="min-w-[120px]"
            >
              {uploading ? 'Enviando...' : loading ? 'Salvando...' : document ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentFormModal;
