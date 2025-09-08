import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import { useClientManagement } from '@/hooks/useClientManagement';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: AdminClient | null;
  onSuccess: () => void;
}

type StatusContratacao = 'INICIADO' | 'CONTRATO_ENVIADO' | 'CONTRATO_ASSINADO' | 'PAGAMENTO_PENDENTE' | 'PAGAMENTO_CONFIRMADO' | 'ATIVO' | 'SUSPENSO' | 'CANCELADO';

const ClientFormModal = ({ isOpen, onClose, client, onSuccess }: ClientFormModalProps) => {
  const [formData, setFormData] = useState({
    nome_responsavel: '',
    razao_social: '',
    email: '',
    telefone: '',
    cpf_responsavel: '',
    cnpj: '',
    tipo_pessoa: 'fisica' as 'fisica' | 'juridica',
    endereco: '',
    numero_endereco: '',
    complemento_endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    plano_selecionado: '',
    status_contratacao: 'INICIADO' as StatusContratacao
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { updateClient } = useAdminClients();
  const { createClient } = useClientManagement(); // Para criar novos clientes

  const isEditing = !!client; // Detecta se está editando ou criando

  // Função corrigida para mapear status do AdminClient para o banco
  const mapAdminStatusToDb = (adminStatus: AdminClient['status']): StatusContratacao => {
    switch (adminStatus) {
      case 'iniciado':
        return 'INICIADO';
      case 'contrato_enviado':
        return 'CONTRATO_ENVIADO';
      case 'contrato_assinado':
        return 'CONTRATO_ASSINADO';
      case 'pagamento_pendente':
        return 'PAGAMENTO_PENDENTE';
      case 'pagamento_confirmado':
        return 'PAGAMENTO_CONFIRMADO';
      case 'ativo':
        return 'ATIVO';
      case 'suspenso':
        return 'SUSPENSO';
      case 'cancelado':
        return 'CANCELADO';
      default:
        return 'INICIADO';
    }
  };

  // Função para mapear status do banco para AdminClient (para inicialização)
  const mapDbStatusToAdmin = (dbStatus: string): AdminClient['status'] => {
    switch (dbStatus) {
      case 'INICIADO':
        return 'iniciado';
      case 'CONTRATO_ENVIADO':
        return 'contrato_enviado';
      case 'CONTRATO_ASSINADO':
        return 'contrato_assinado';
      case 'PAGAMENTO_PENDENTE':
        return 'pagamento_pendente';
      case 'PAGAMENTO_CONFIRMADO':
        return 'pagamento_confirmado';
      case 'ATIVO':
        return 'ativo';
      case 'SUSPENSO':
        return 'suspenso';
      case 'CANCELADO':
        return 'cancelado';
      default:
        return 'iniciado';
    }
  };

  useEffect(() => {
    if (client) {
      console.log('Carregando dados do cliente para edição:', client);
      
      // Mapear o status usando a função corrigida
      const dbStatus = mapAdminStatusToDb(client.status);

      // Extrair o endereço do campo formatado
      let enderecoLimpo = client.endereco;
      if (client.endereco.includes(',')) {
        enderecoLimpo = client.endereco.split(',')[0].trim();
      }

      // Mapear o plano para o formato do banco
      let planoDb = '1 ANO';
      switch (client.plan) {
        case 'Plano Anual':
          planoDb = '1 ANO';
          break;
        case 'Plano Bianual':
          planoDb = '2 ANOS';
          break;
        case 'Plano Mensal':
          planoDb = '1 MES';
          break;
        default:
          planoDb = '1 ANO';
      }

      setFormData({
        nome_responsavel: client.name,
        razao_social: client.razao_social || '',
        email: client.email,
        telefone: client.telefone,
        cpf_responsavel: client.cpf_responsavel,
        cnpj: client.cnpj === 'N/A' ? '' : client.cnpj,
        tipo_pessoa: client.tipo_pessoa as 'fisica' | 'juridica',
        endereco: enderecoLimpo,
        numero_endereco: client.numero_endereco,
        complemento_endereco: client.complemento_endereco || '',
        bairro: client.bairro || '',
        cidade: client.cidade,
        estado: client.estado,
        cep: client.cep,
        plano_selecionado: planoDb,
        status_contratacao: dbStatus
      });
    } else {
      // Limpar formulário para novo cliente
      setFormData({
        nome_responsavel: '',
        razao_social: '',
        email: '',
        telefone: '',
        cpf_responsavel: '',
        cnpj: '',
        tipo_pessoa: 'fisica',
        endereco: '',
        numero_endereco: '',
        complemento_endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        plano_selecionado: '1 ANO',
        status_contratacao: 'INICIADO'
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      if (isEditing && client) {
        // Editando cliente existente
        console.log('Enviando dados para atualização:', formData);
        await updateClient(client.id, formData);
        
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso"
        });
      } else {
        // Criando novo cliente via webhook n8n
        console.log('Criando novo cliente via webhook:', formData);
        const result = await createClient(formData);
        
        if (!result.success) {
          throw new Error(result.error || 'Falha ao criar cliente');
        }
        
        toast({
          title: "Sucesso", 
          description: "Cliente criado com sucesso! O login e senha serão gerados automaticamente."
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao processar formulário:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar cliente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`Alterando campo ${field} para:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Edite as informações do cliente ${client?.name}.`
              : 'Preencha as informações para adicionar um novo cliente. O login e senha serão gerados automaticamente.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Pessoais/Empresa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
              <Select 
                value={formData.tipo_pessoa} 
                onValueChange={(value) => handleInputChange('tipo_pessoa', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_contratacao">Status da Contratação</Label>
              <Select 
                value={formData.status_contratacao} 
                onValueChange={(value) => handleInputChange('status_contratacao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INICIADO">Iniciado</SelectItem>
                  <SelectItem value="CONTRATO_ENVIADO">Contrato Enviado</SelectItem>
                  <SelectItem value="CONTRATO_ASSINADO">Contrato Assinado</SelectItem>
                  <SelectItem value="PAGAMENTO_PENDENTE">Pagamento Pendente</SelectItem>
                  <SelectItem value="PAGAMENTO_CONFIRMADO">Pagamento Confirmado</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_responsavel">Nome do Responsável</Label>
              <Input
                id="nome_responsavel"
                value={formData.nome_responsavel}
                onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                required
              />
            </div>

            {formData.tipo_pessoa === 'juridica' && (
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => handleInputChange('razao_social', e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf_responsavel">CPF do Responsável</Label>
              <Input
                id="cpf_responsavel"
                value={formData.cpf_responsavel}
                onChange={(e) => handleInputChange('cpf_responsavel', e.target.value)}
                required
              />
            </div>

            {formData.tipo_pessoa === 'juridica' && (
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Endereço</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="endereco">Logradouro</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_endereco">Número</Label>
                <Input
                  id="numero_endereco"
                  value={formData.numero_endereco}
                  onChange={(e) => handleInputChange('numero_endereco', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="complemento_endereco">Complemento</Label>
                <Input
                  id="complemento_endereco"
                  value={formData.complemento_endereco}
                  onChange={(e) => handleInputChange('complemento_endereco', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Plano */}
          <div className="space-y-2">
            <Label htmlFor="plano_selecionado">Plano Selecionado</Label>
            <Select 
              value={formData.plano_selecionado} 
              onValueChange={(value) => handleInputChange('plano_selecionado', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 MES">Plano Mensal</SelectItem>
                <SelectItem value="1 ANO">Plano Anual</SelectItem>
                <SelectItem value="2 ANOS">Plano Bianual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (isEditing ? 'Salvando...' : 'Criando...') 
                : (isEditing ? 'Salvar' : 'Criar Cliente')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
