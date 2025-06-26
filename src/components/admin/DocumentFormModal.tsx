
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAdminDocuments, AdminDocument } from '@/hooks/useAdminDocuments';
import { Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createDocument, updateDocument } = useAdminDocuments();

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
  }, [document, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== INICIANDO SUBMISSÃO DO FORMULÁRIO ===');
    console.log('Dados do formulário:', formData);
    
    if (!formData.tipo || !formData.nome) {
      toast({
        title: "Erro",
        description: "Tipo e nome são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const documentData = {
        ...formData,
        arquivo_url: document?.arquivo_url || null
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
                  Salvando...
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

export default DocumentFormModal;
