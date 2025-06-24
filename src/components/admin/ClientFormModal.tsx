
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientFormData, useClientManagement } from '@/hooks/useClientManagement';
import { AdminClient } from '@/hooks/useAdminClients';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: AdminClient | null;
  onSuccess: () => void;
}

const ClientFormModal = ({ isOpen, onClose, client, onSuccess }: ClientFormModalProps) => {
  const { createClient, updateClient, loading } = useClientManagement();
  const [formData, setFormData] = useState<ClientFormData>({
    plano_selecionado: '1 ANO',
    tipo_pessoa: 'fisica',
    nome_responsavel: '',
    email: '',
    telefone: '',
    cpf_responsavel: '',
    cnpj: '',
    razao_social: '',
    endereco: '',
    numero_endereco: '',
    complemento_endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    status_contratacao: 'INICIADO'
  });

  useEffect(() => {
    if (client) {
      // Converter nome do plano de volta para o valor do banco
      let planoSelecionado = '1 ANO';
      if (client.plan === 'Plano Bianual') {
        planoSelecionado = '2 ANOS';
      } else if (client.plan === 'Plano Mensal') {
        planoSelecionado = '1 MES';
      }

      // Converter status de volta para o valor do banco
      let statusContratacao = 'INICIADO';
      switch (client.status) {
        case 'active':
          statusContratacao = 'ATIVO';
          break;
        case 'suspended':
          statusContratacao = 'SUSPENSO';
          break;
        case 'pending':
          statusContratacao = 'PAGAMENTO_PENDENTE';
          break;
        case 'overdue':
          statusContratacao = 'PAGAMENTO_PENDENTE';
          break;
      }

      // Carregar dados do cliente para edição
      setFormData({
        id: client.id,
        plano_selecionado: planoSelecionado,
        tipo_pessoa: client.tipo_pessoa,
        nome_responsavel: client.name,
        email: client.email,
        telefone: client.telefone,
        cpf_responsavel: client.cpf_responsavel,
        cnpj: client.cnpj !== 'N/A' ? client.cnpj : '',
        razao_social: client.razao_social || '',
        endereco: client.endereco.split(',')[0] || '',
        numero_endereco: client.numero_endereco,
        complemento_endereco: client.complemento_endereco || '',
        bairro: client.bairro || '',
        cidade: client.cidade,
        estado: client.estado,
        cep: client.cep,
        status_contratacao: statusContratacao
      });
    } else {
      // Reset para novo cliente
      setFormData({
        plano_selecionado: '1 ANO',
        tipo_pessoa: 'fisica',
        nome_responsavel: '',
        email: '',
        telefone: '',
        cpf_responsavel: '',
        cnpj: '',
        razao_social: '',
        endereco: '',
        numero_endereco: '',
        complemento_endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        status_contratacao: 'INICIADO'
      });
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (client?.id) {
        // Atualizar cliente existente
        const result = await updateClient(client.id, formData);
        if (result.success) {
          onSuccess();
          onClose();
        }
      } else {
        // Criar novo cliente
        const result = await createClient(formData);
        if (result.success) {
          onSuccess();
          onClose();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plano">Plano *</Label>
              <Select
                value={formData.plano_selecionado}
                onValueChange={(value) => handleInputChange('plano_selecionado', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 ANO">Plano Anual</SelectItem>
                  <SelectItem value="2 ANOS">Plano Bianual</SelectItem>
                  <SelectItem value="1 MES">Plano Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo_pessoa">Tipo de Pessoa *</Label>
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

            <div>
              <Label htmlFor="nome_responsavel">Nome do Responsável *</Label>
              <Input
                id="nome_responsavel"
                value={formData.nome_responsavel}
                onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="cpf_responsavel">CPF do Responsável *</Label>
              <Input
                id="cpf_responsavel"
                value={formData.cpf_responsavel}
                onChange={(e) => handleInputChange('cpf_responsavel', e.target.value)}
                required
              />
            </div>

            {formData.tipo_pessoa === 'juridica' && (
              <>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={formData.razao_social}
                    onChange={(e) => handleInputChange('razao_social', e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="endereco">Endereço *</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="numero_endereco">Número *</Label>
              <Input
                id="numero_endereco"
                value={formData.numero_endereco}
                onChange={(e) => handleInputChange('numero_endereco', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="complemento_endereco">Complemento</Label>
              <Input
                id="complemento_endereco"
                value={formData.complemento_endereco}
                onChange={(e) => handleInputChange('complemento_endereco', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="cep">CEP *</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => handleInputChange('cep', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="status_contratacao">Status *</Label>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (client ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
