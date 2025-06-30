
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, File } from 'lucide-react';
import { AdminDocument, useAdminDocuments } from '@/hooks/useAdminDocuments';
import { supabase } from '@/integrations/supabase/client';

interface SimpleDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: AdminDocument | null;
  onSuccess: () => void;
}

const SimpleDocumentModal = ({ isOpen, onClose, document, onSuccess }: SimpleDocumentModalProps) => {
  const [formData, setFormData] = useState({
    tipo: document?.tipo || '',
    nome: document?.nome || '',
    descricao: document?.descricao || '',
    disponivel_por_padrao: document?.disponivel_por_padrao ?? true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createDocument, updateDocument } = useAdminDocuments();

  // Reset form when modal opens/closes or document changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        tipo: document?.tipo || '',
        nome: document?.nome || '',
        descricao: document?.descricao || '',
        disponivel_por_padrao: document?.disponivel_por_padrao ?? true
      });
      setSelectedFile(null);
      setUploadProgress(0);
    }
  }, [isOpen, document]);

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) {
        console.log('🔒 Admin session não encontrada no localStorage');
        return false;
      }

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const isValid = session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
      
      console.log('🔒 Verificação de admin session:', {
        isAdmin: session.isAdmin,
        timestampValid: Date.now() - session.timestamp <= TWENTY_FOUR_HOURS,
        isValid,
        adminEmail: session.adminEmail
      });
      
      return isValid;
    } catch (error) {
      console.error('🔒 Erro ao verificar admin session:', error);
      return false;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (50MB)
      if (file.size > 52428800) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 50MB",
          variant: "destructive"
        });
        return;
      }

      // Verificar tipo do arquivo
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
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas PDF, Word, Excel e imagens são permitidos",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      console.log('📤 Iniciando upload do arquivo:', file.name);
      
      if (!checkAdminAuth()) {
        throw new Error('Sessão admin não encontrada ou expirada');
      }

      setUploadProgress(10);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log('📤 Nome do arquivo gerado:', fileName);
      setUploadProgress(50);

      const { data, error } = await supabase.storage
        .from('documentos_fiscais')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro detalhado no upload:', {
          error,
          message: error.message
        });
        throw error;
      }

      setUploadProgress(100);
      console.log('✅ Upload concluído com sucesso:', data.path);
      return data.path;
    } catch (error) {
      console.error('❌ Erro completo no upload:', error);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Iniciando submissão do formulário...', formData);
    
    if (!formData.tipo || !formData.nome) {
      console.error('📋 Dados obrigatórios faltando:', { tipo: formData.tipo, nome: formData.nome });
      toast({
        title: "Erro",
        description: "Tipo e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!checkAdminAuth()) {
      toast({
        title: "Erro",
        description: "Sessão admin não encontrada. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let arquivo_url = document?.arquivo_url || null;

      // Fazer upload do arquivo se um foi selecionado
      if (selectedFile) {
        console.log('📤 Fazendo upload do novo arquivo...');
        arquivo_url = await uploadFile(selectedFile);
        console.log('✅ Arquivo enviado para:', arquivo_url);
      }

      const documentData = {
        ...formData,
        arquivo_url
      };

      console.log('💾 Dados finais para salvar:', documentData);

      if (document) {
        console.log('✏️ Atualizando documento existente:', document.id);
        await updateDocument(document.id, documentData);
        console.log('✅ Documento atualizado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso"
        });
      } else {
        console.log('➕ Criando novo documento');
        await createDocument(documentData);
        console.log('✅ Documento criado com sucesso');
        toast({
          title: "Sucesso",
          description: "Documento criado com sucesso"
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erro detalhado ao salvar documento:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar documento';
      
      toast({
        title: "Erro",
        description: `Falha ao salvar: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
          <DialogDescription>
            {document ? 'Edite as informações do documento.' : 'Crie um novo documento para disponibilizar aos clientes.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value.toUpperCase() }))}
                placeholder="Ex: IPTU, AVCB, INSCRICAO_ESTADUAL"
                required
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="disponivel_por_padrao"
              checked={formData.disponivel_por_padrao}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disponivel_por_padrao: checked }))}
              disabled={loading}
            />
            <Label htmlFor="disponivel_por_padrao">Disponível por padrão para novos clientes</Label>
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label>Arquivo do Documento</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {!selectedFile && !document?.arquivo_url && (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      Selecionar Arquivo
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      PDF, Word, Excel ou imagens até 50MB
                    </p>
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!selectedFile && document?.arquivo_url && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Arquivo atual anexado</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    Substituir
                  </Button>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Enviando arquivo... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadProgress > 0 && uploadProgress < 100 ? 'Enviando...' : 'Salvando...'}
                </>
              ) : (
                document ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleDocumentModal;
