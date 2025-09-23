import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import { useClientManagement } from '@/hooks/useClientManagement';
import { validateCPF } from '@/utils/validators';

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
    produto_selecionado: '',
    produto_id: '' as string | undefined,
    plano_id: '' as string | undefined,
    status_contratacao: 'INICIADO' as StatusContratacao,
    proximo_vencimento: ''
  });
  const [loading, setLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const { toast } = useToast();
  const { updateClient } = useAdminClients();
  const { createClient } = useClientManagement();

  const isEditing = !!client;

  // Função para mapear status do AdminClient para o banco
  const mapAdminStatusToDb = (adminStatus: AdminClient['status']): StatusContratacao => {
    switch (adminStatus) {
      case 'iniciado': return 'INICIADO';
      case 'contrato_enviado': return 'CONTRATO_ENVIADO';
      case 'contrato_assinado': return 'CONTRATO_ASSINADO';
      case 'pagamento_pendente': return 'PAGAMENTO_PENDENTE';
      case 'pagamento_confirmado': return 'PAGAMENTO_CONFIRMADO';
      case 'ativo': return 'ATIVO';
      case 'suspenso': return 'SUSPENSO';
      case 'cancelado': return 'CANCELADO';
      default: return 'INICIADO';
    }
  };

  useEffect(() => {
    if (client) {
      console.log('Carregando dados do cliente para edição:', client);
      
      const dbStatus = mapAdminStatusToDb(client.status);
      let enderecoLimpo = client.endereco;
      if (client.endereco.includes(',')) {
        enderecoLimpo = client.endereco.split(',')[0].trim();
      }

      const produtoSelecionado = (client as any).produto_selecionado || '';
      const planoSelecionado = (client as any).plano_selecionado || '';
      const produtoId = (client as any).produto_id || '';
      const planoId = (client as any).plano_id || '';

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
        plano_selecionado: planoSelecionado,
        produto_selecionado: produtoSelecionado,
        produto_id: produtoId || undefined,
        plano_id: planoId || undefined,
        status_contratacao: dbStatus,
        proximo_vencimento: (client as any).proximo_vencimento ? ((client as any).proximo_vencimento as string).split('T')[0] : ''
      });
    } else {
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
        produto_selecionado: '',
        produto_id: undefined,
        plano_id: undefined,
        status_contratacao: 'INICIADO',
        proximo_vencimento: ''
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.cpf_responsavel && !validateCPF(formData.cpf_responsavel)) {
      setCpfError('CPF inválido');
      toast({
        title: "Erro de Validação",
        description: "Por favor, insira um CPF válido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && client) {
        console.log('Enviando dados para atualização:', formData);
        await updateClient(client.id, formData);
        
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso"
        });
      } else {
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
    
    if (field === 'cpf_responsavel' && cpfError) {
      setCpfError('');
    }
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
                className={cpfError ? 'border-red-500' : ''}
                required
              />
              {cpfError && (
                <p className="text-sm text-red-600">{cpfError}</p>
              )}
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

          {/* Data de Próximo Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="proximo_vencimento_editavel">Próximo Vencimento</Label>
            <Input
              id="proximo_vencimento"
              type="date"
              value={formData.proximo_vencimento}
              onChange={(e) => handleInputChange('proximo_vencimento', e.target.value)}
            />
          </div>

          {/* Planos do Cliente - apenas no modo edição */}
          {isEditing && client && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Planos do Cliente</h3>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-gray-600 mb-3">
                    Use o botão "Planos" na tabela de clientes para gerenciar os planos deste cliente
                  </p>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Info",
                        description: "Use o botão 'Planos' (ícone do cartão) na tabela de clientes para gerenciar os planos"
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Gerenciar Planos do Cliente
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Plano Selecionado - apenas no modo criação */}
          {!isEditing && (
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
          )}
          
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