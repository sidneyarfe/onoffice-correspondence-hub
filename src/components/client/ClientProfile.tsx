
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { User, Building, Mail, Phone, MapPin, Calendar, Shield, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ClientProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contratacao, setContratacao] = useState<any>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    responsibleName: '',
    responsibleCpf: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    const fetchContratacao = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('contratacoes_clientes')
          .select(`
            *,
            planos!inner(
              nome_plano,
              preco_em_centavos,
              entregaveis,
              periodicidade
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar contratação:', error);
          return;
        }

        setContratacao(data);
        
        if (data) {
          setFormData({
            companyName: data.razao_social || '',
            cnpj: data.cnpj || '',
            email: data.email || '',
            phone: data.telefone || '',
            responsibleName: data.nome_responsavel || '',
            responsibleCpf: data.cpf_responsavel || '',
            address: `${data.endereco}, ${data.numero_endereco}${data.complemento_endereco ? ` - ${data.complemento_endereco}` : ''}`,
            city: data.cidade || '',
            state: data.estado || '',
            zipCode: data.cep || '',
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContratacao();
  }, [user?.id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!contratacao?.id) return;

    try {
      // Parsear endereço para campos separados
      const enderecoCompleto = formData.address;
      const enderecoParts = enderecoCompleto.split(',');
      const endereco = enderecoParts[0]?.trim() || '';
      const numeroComComplemento = enderecoParts[1]?.trim() || '';
      const numeroParts = numeroComComplemento.split('-');
      const numero = numeroParts[0]?.trim() || '';
      const complemento = numeroParts[1]?.trim() || '';

      const updateData: any = {
        telefone: formData.phone,
        endereco: endereco,
        numero_endereco: numero,
        complemento_endereco: complemento,
        cidade: formData.city,
        estado: formData.state,
        cep: formData.zipCode,
      };

      // Para PJ, permitir editar mais campos
      if (contratacao.tipo_pessoa === 'PJ') {
        updateData.razao_social = formData.companyName;
        updateData.cnpj = formData.cnpj;
        updateData.email = formData.email;
        updateData.nome_responsavel = formData.responsibleName;
        updateData.cpf_responsavel = formData.responsibleCpf;
      }

      const { error } = await supabase
        .from('contratacoes_clientes')
        .update(updateData)
        .eq('id', contratacao.id);

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      // Recarregar dados
      const { data: updatedData } = await supabase
        .from('contratacoes_clientes')
        .select('*')
        .eq('id', contratacao.id)
        .single();

      if (updatedData) {
        setContratacao(updatedData);
        setFormData(prev => ({
          ...prev,
          phone: updatedData.telefone,
          companyName: updatedData.razao_social || '',
          cnpj: updatedData.cnpj || '',
          email: updatedData.email || '',
          responsibleName: updatedData.nome_responsavel || '',
          responsibleCpf: updatedData.cpf_responsavel || '',
          address: `${updatedData.endereco}, ${updatedData.numero_endereco}${updatedData.complemento_endereco ? ` - ${updatedData.complemento_endereco}` : ''}`,
          city: updatedData.cidade || '',
          state: updatedData.estado || '',
          zipCode: updatedData.cep || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar suas informações.",
        variant: "destructive"
      });
    }
  };

  const isPessoaFisica = contratacao?.tipo_pessoa === 'PF';
  const isPessoaJuridica = contratacao?.tipo_pessoa === 'PJ';

  // Calcular próximo vencimento e último pagamento
  const calculatePaymentDates = () => {
    if (!contratacao?.created_at) return { nextPayment: 'N/A', lastPayment: 'N/A' };
    
    const startDate = new Date(contratacao.created_at);
    const periodicidade = contratacao.planos?.periodicidade || 'anual';
    
    let nextPayment = new Date(startDate);
    switch (periodicidade) {
      case 'mensal':
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
      case 'semestral':
        nextPayment.setMonth(nextPayment.getMonth() + 6);
        break;
      case 'anual':
      default:
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
    }
    
    return {
      nextPayment: nextPayment.toLocaleDateString('pt-BR'),
      lastPayment: contratacao.ultimo_pagamento 
        ? new Date(contratacao.ultimo_pagamento).toLocaleDateString('pt-BR')
        : startDate.toLocaleDateString('pt-BR')
    };
  };

  const paymentDates = calculatePaymentDates();
  
  const planInfo = {
    name: contratacao?.planos?.nome_plano || contratacao?.plano_selecionado || 'Sem plano',
    price: contratacao?.planos?.preco_em_centavos ? (contratacao.planos.preco_em_centavos / 100) : 0,
    startDate: contratacao?.created_at ? new Date(contratacao.created_at).toLocaleDateString('pt-BR') : 'N/A',
    nextPayment: paymentDates.nextPayment,
    lastPayment: paymentDates.lastPayment,
    features: contratacao?.planos?.entregaveis || [
      'Endereço Comercial',
      'Endereço Fiscal',
      'Recebimento de Correspondências',
      'Atendimento Telefônico',
      'Inscrição Estadual',
      'Equipe para Fiscalizações',
      '5% desconto em Salas de Reunião',
      '2h/mês em Salas de Reunião'
    ]
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Meu Perfil</h1>
        <p className="text-gray-600">
          Gerencie as informações da sua {isPessoaFisica ? 'conta pessoal' : 'empresa'} e plano contratado
        </p>
      </div>

      {/* Company/Personal Information */}
      <Card className="on-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isPessoaFisica ? <User className="w-5 h-5 text-on-lime" /> : <Building className="w-5 h-5 text-on-lime" />}
              {isPessoaFisica ? 'Informações Pessoais' : 'Informações da Empresa'}
            </CardTitle>
            <CardDescription>
              {isPessoaFisica ? 'Seus dados pessoais cadastrados' : 'Dados cadastrais da sua empresa'}
            </CardDescription>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? 'Salvar' : 'Editar'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPessoaFisica && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Como seu cadastro é Pessoa Física, você pode editar apenas o telefone. 
                Os dados da empresa ficarão disponíveis após a formalização.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsibleName">Nome do Responsável</Label>
              <Input
                id="responsibleName"
                value={formData.responsibleName}
                onChange={(e) => handleInputChange('responsibleName', e.target.value)}
                disabled={!isEditing || isPessoaFisica}
                className={!isEditing || isPessoaFisica ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibleCpf">CPF do Responsável</Label>
              <Input
                id="responsibleCpf"
                value={formData.responsibleCpf}
                onChange={(e) => handleInputChange('responsibleCpf', e.target.value)}
                disabled={!isEditing || isPessoaFisica}
                className={!isEditing || isPessoaFisica ? "bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Razão Social</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                disabled={!isEditing || isPessoaFisica}
                placeholder={isPessoaFisica ? "Aguardando formalização" : ""}
                className={!isEditing || isPessoaFisica ? "bg-gray-100 text-gray-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                disabled={!isEditing || isPessoaFisica}
                placeholder={isPessoaFisica ? "Aguardando formalização" : ""}
                className={!isEditing || isPessoaFisica ? "bg-gray-100 text-gray-500" : ""}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing || isPessoaFisica}
                className={!isEditing || isPessoaFisica ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-100" : ""}
              placeholder="Rua, Número - Complemento"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-100" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-on-lime" />
            Plano Contratado
          </CardTitle>
          <CardDescription>
            Detalhes do seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-on-dark mb-2">{planInfo.name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Cliente desde: {planInfo.startDate}</span>
                </div>
                {planInfo.price > 0 && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Valor: R$ {planInfo.price.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Último pagamento: {planInfo.lastPayment}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Próximo vencimento: {planInfo.nextPayment}</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Ativo</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-on-dark mb-3">Recursos Incluídos:</h4>
              <ul className="space-y-1 text-sm">
                {planInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-on-lime rounded-full"></div>
                    <span className="text-gray-700">{typeof feature === 'string' ? feature : feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Address */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-on-lime" />
            Endereço Fiscal ON Office
          </CardTitle>
          <CardDescription>
            Seu endereço comercial oficial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-on-dark mb-1">Centro Empresarial ON Office</p>
            <p className="text-gray-700">Av. Generalíssimo Deodoro, 1893 - Nazaré</p>
            <p className="text-gray-700">Belém - PA, CEP: 66040-140</p>
            <p className="text-gray-700 mt-2">Tel: (91) 99246-3050</p>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Horário de funcionamento:</strong> Segunda a Sexta - 08:00 às 19:00, Sábado - 08:00 às 13:00
            </p>
            <p>
              <strong>Atendimento fiscal:</strong> Nossa equipe está preparada para receber fiscalizações
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Segurança da Conta</h3>
              <p className="text-blue-800 text-sm mb-3">
                Mantenha sua conta segura atualizando sua senha regularmente.
              </p>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                Alterar Senha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfile;
