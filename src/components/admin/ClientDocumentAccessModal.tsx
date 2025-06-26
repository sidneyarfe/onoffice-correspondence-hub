
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ClientDocumentAccess {
  id: string;
  user_id: string;
  documento_tipo: string;
  disponivel: boolean;
  cliente_nome: string;
  cliente_email: string;
}

interface ClientDocumentAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  documentName: string;
}

const ClientDocumentAccessModal = ({ isOpen, onClose, documentType, documentName }: ClientDocumentAccessModalProps) => {
  const [clientAccess, setClientAccess] = useState<ClientDocumentAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchClientAccess();
    }
  }, [isOpen]);

  const fetchClientAccess = async () => {
    setLoading(true);
    try {
      // Implementação simplificada - por enquanto apenas simula dados
      const mockData: ClientDocumentAccess[] = [
        {
          id: '1',
          user_id: 'user1',
          documento_tipo: documentType,
          disponivel: true,
          cliente_nome: 'Cliente Exemplo 1',
          cliente_email: 'cliente1@example.com'
        },
        {
          id: '2',
          user_id: 'user2',
          documento_tipo: documentType,
          disponivel: false,
          cliente_nome: 'Cliente Exemplo 2',
          cliente_email: 'cliente2@example.com'
        }
      ];
      
      setClientAccess(mockData);
    } catch (error) {
      console.error('Erro ao buscar acesso dos clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de acesso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (userId: string, currentAccess: boolean) => {
    setUpdating(userId);
    try {
      // Implementação simplificada - apenas atualiza o estado local
      setClientAccess(prev => 
        prev.map(client => 
          client.user_id === userId 
            ? { ...client, disponivel: !currentAccess }
            : client
        )
      );
      
      toast({
        title: "Sucesso",
        description: `Acesso ${!currentAccess ? 'liberado' : 'removido'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao atualizar acesso:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar acesso",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso ao Documento</DialogTitle>
          <DialogDescription>
            Gerencie quais clientes têm acesso ao documento: {documentName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Carregando clientes...</span>
            </div>
          ) : clientAccess.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum cliente encontrado para este documento
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {clientAccess.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{client.cliente_nome}</div>
                    <div className="text-sm text-gray-500">{client.cliente_email}</div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant={client.disponivel ? "default" : "secondary"}>
                      {client.disponivel ? "Liberado" : "Bloqueado"}
                    </Badge>
                    
                    <Switch
                      checked={client.disponivel}
                      onCheckedChange={() => handleToggleAccess(client.user_id, client.disponivel)}
                      disabled={updating === client.user_id}
                    />
                    
                    {updating === client.user_id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDocumentAccessModal;
