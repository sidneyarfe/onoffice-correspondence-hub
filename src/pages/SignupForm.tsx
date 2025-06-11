
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { MaskedInput } from '@/components/ui/masked-input';
import { useCEP } from '@/hooks/useCEP';
import { useContractProcess } from '@/hooks/useContractProcess';
import { useContratacao } from '@/hooks/useContratacao';
import { validateCNPJ, validateCPF, validateEmail, validatePhone } from '@/utils/validators';
import { cleanNumbers } from '@/utils/formatters';
import Logo from '@/components/Logo';
import { Input } from '@/components/ui/input';

const SignupForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPlan = location.state?.selectedPlan || 'MENSAL';
  const { fetchAddressByCEP, loading: cepLoading } = useCEP();
  const { status, progress, updateStatus, setError, getStatusLabel } = useContractProcess();
  const { processarContratacao, loading: contratacaoLoading } = useContratacao();
  
  const [personType, setPersonType] = useState<'fisica' | 'juridica' | ''>('');
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    responsibleName: '',
    responsibleCpf: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-completar endereço pelo CEP
  const handleCEPChange = async (maskedValue: string, rawValue: string) => {
    setFormData(prev => ({ ...prev, zipCode: maskedValue }));
    
    if (rawValue.length === 8) {
      const addressData = await fetchAddressByCEP(rawValue);
      if (addressData) {
        setFormData(prev => ({
          ...prev,
          address: addressData.logradouro,
          neighborhood: addressData.bairro,
          city: addressData.localidade,
          state: addressData.uf,
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar tipo de pessoa
    if (!personType) {
      errors.personType = 'Selecione se é Pessoa Física ou Jurídica';
    }

    // Campos obrigatórios sempre
    if (!validateEmail(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!validatePhone(formData.phone)) {
      errors.phone = 'Telefone inválido';
    }

    if (!formData.responsibleName.trim()) {
      errors.responsibleName = 'Nome do responsável é obrigatório';
    }

    if (!validateCPF(formData.responsibleCpf)) {
      errors.responsibleCpf = 'CPF inválido';
    }

    // Campos obrigatórios apenas se é pessoa jurídica
    if (personType === 'juridica') {
      if (!formData.companyName.trim()) {
        errors.companyName = 'Razão social é obrigatória';
      }

      if (!validateCNPJ(formData.cnpj)) {
        errors.cnpj = 'CNPJ inválido';
      }
    }

    if (!formData.address.trim()) {
      errors.address = 'Endereço é obrigatório';
    }

    if (!formData.city.trim()) {
      errors.city = 'Cidade é obrigatória';
    }

    if (!formData.state) {
      errors.state = 'Estado é obrigatório';
    }

    if (cleanNumbers(formData.zipCode).length !== 8) {
      errors.zipCode = 'CEP inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePersonTypeChange = (value: 'fisica' | 'juridica') => {
    setPersonType(value);
    
    // Limpar erro do tipo de pessoa
    if (formErrors.personType) {
      setFormErrors(prev => ({ ...prev, personType: '' }));
    }
    
    // Limpar dados da empresa se selecionar pessoa física
    if (value === 'fisica') {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        cnpj: ''
      }));
      // Limpar erros dos campos de empresa
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.companyName;
        delete newErrors.cnpj;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Formulário incompleto",
        description: "Por favor, corrija os erros destacados.",
        variant: "destructive",
      });
      return;
    }

    updateStatus('form_submitted');

    try {
      // Preparar dados para a API
      const contratacaoData = {
        plano_selecionado: selectedPlan,
        tipo_pessoa: personType as 'fisica' | 'juridica',
        email: formData.email,
        telefone: formData.phone,
        nome_responsavel: formData.responsibleName,
        cpf_responsavel: formData.responsibleCpf,
        razao_social: personType === 'juridica' ? formData.companyName : undefined,
        cnpj: personType === 'juridica' ? formData.cnpj : undefined,
        endereco: formData.address,
        numero_endereco: formData.addressNumber,
        complemento_endereco: formData.addressComplement || undefined,
        bairro: formData.neighborhood || undefined,
        cidade: formData.city,
        estado: formData.state,
        cep: cleanNumbers(formData.zipCode)
      };

      console.log('Dados da contratação:', contratacaoData);

      // Processar contratação
      updateStatus('contract_sending');
      const result = await processarContratacao(contratacaoData);
      
      console.log('Resultado da contratação:', result);
      
      // O webhook do n8n retorna os dados da contratação diretamente
      // Verificar se há um ID válido no resultado
      if (result && result.id) {
        updateStatus('contract_sent');
        
        console.log('Redirecionando para aguardando assinatura com ID:', result.id);
        
        // Redirecionar para a página de aguardo de assinatura
        setTimeout(() => {
          navigate('/aguardando-assinatura', { 
            state: { 
              contratacao_id: result.id
            }
          });
        }, 2000);
      } else {
        throw new Error('ID da contratação não encontrado na resposta');
      }
      
    } catch (error) {
      console.error('Erro no envio:', error);
      setError('Erro no processamento da contratação. Tente novamente.');
      updateStatus('form_filling');
    }
  };

  // Estados brasileiros
  const states = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/">
              <Logo size="lg" />
            </Link>
            <Link to="/login">
              <Button variant="outline" className="border-on-lime text-on-dark hover:bg-on-lime hover:text-on-black">
                Já sou cliente
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Plan Summary */}
          <Card className="on-card mb-8">
            <CardHeader>
              <CardTitle className="text-center text-on-dark">
                Plano Selecionado: {selectedPlan}
              </CardTitle>
              <CardDescription className="text-center">
                Complete os dados para finalizar a contratação
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Progress Indicator */}
          {status !== 'form_filling' && (
            <Card className="on-card mb-8">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progresso da contratação</span>
                    <span className="font-semibold text-on-dark">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-gray-600 mt-2">
                    {getStatusLabel()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signup Form */}
          <Card className="on-card">
            <CardHeader>
              <CardTitle className="text-2xl text-on-dark">Dados para Contratação</CardTitle>
              <CardDescription>
                Preencha as informações necessárias para criarmos sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Pessoa - Nova seção */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800">
                      O endereço fiscal será contratado através da: *
                    </Label>
                    <RadioGroup
                      value={personType}
                      onValueChange={handlePersonTypeChange}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fisica" id="fisica" />
                        <Label htmlFor="fisica" className="font-normal">
                          Pessoa Física
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="juridica" id="juridica" />
                        <Label htmlFor="juridica" className="font-normal">
                          Pessoa Jurídica
                        </Label>
                      </div>
                    </RadioGroup>
                    {formErrors.personType && (
                      <p className="text-sm text-red-600">{formErrors.personType}</p>
                    )}
                  </div>
                </div>

                {/* Dados da empresa - condicionais apenas para pessoa jurídica */}
                {personType === 'juridica' && (
                  <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <h3 className="font-semibold text-gray-800">Dados da Empresa</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Razão Social *</Label>
                        <Input
                          id="companyName"
                          placeholder="Nome da empresa"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          className={formErrors.companyName ? 'border-red-500' : ''}
                          required={personType === 'juridica'}
                        />
                        {formErrors.companyName && (
                          <p className="text-sm text-red-600">{formErrors.companyName}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ *</Label>
                        <MaskedInput
                          id="cnpj"
                          mask="cnpj"
                          placeholder="00.000.000/0000-00"
                          value={formData.cnpj}
                          onValueChange={(masked) => handleInputChange('cnpj', masked)}
                          className={formErrors.cnpj ? 'border-red-500' : ''}
                          required={personType === 'juridica'}
                        />
                        {formErrors.cnpj && (
                          <p className="text-sm text-red-600">{formErrors.cnpj}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dados pessoais - sempre obrigatórios */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Dados Pessoais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={formErrors.email ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-600">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <MaskedInput
                        id="phone"
                        mask="phone"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onValueChange={(masked) => handleInputChange('phone', masked)}
                        className={formErrors.phone ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.phone && (
                        <p className="text-sm text-red-600">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nome do Responsável *</Label>
                      <Input
                        id="responsibleName"
                        placeholder="Nome completo"
                        value={formData.responsibleName}
                        onChange={(e) => handleInputChange('responsibleName', e.target.value)}
                        className={formErrors.responsibleName ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.responsibleName && (
                        <p className="text-sm text-red-600">{formErrors.responsibleName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="responsibleCpf">CPF do Responsável *</Label>
                      <MaskedInput
                        id="responsibleCpf"
                        mask="cpf"
                        placeholder="000.000.000-00"
                        value={formData.responsibleCpf}
                        onValueChange={(masked) => handleInputChange('responsibleCpf', masked)}
                        className={formErrors.responsibleCpf ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.responsibleCpf && (
                        <p className="text-sm text-red-600">{formErrors.responsibleCpf}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Endereço</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP *</Label>
                    <div className="relative">
                      <MaskedInput
                        id="zipCode"
                        mask="cep"
                        placeholder="00000-000"
                        value={formData.zipCode}
                        onValueChange={handleCEPChange}
                        className={formErrors.zipCode ? 'border-red-500' : ''}
                        required
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-on-lime border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {formErrors.zipCode && (
                      <p className="text-sm text-red-600">{formErrors.zipCode}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address">Logradouro *</Label>
                      <Input
                        id="address"
                        placeholder="Rua, Avenida..."
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={formErrors.address ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.address && (
                        <p className="text-sm text-red-600">{formErrors.address}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="addressNumber">Número *</Label>
                      <Input
                        id="addressNumber"
                        placeholder="123"
                        value={formData.addressNumber}
                        onChange={(e) => handleInputChange('addressNumber', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="addressComplement">Compl.</Label>
                      <Input
                        id="addressComplement"
                        placeholder="Sala 101"
                        value={formData.addressComplement}
                        onChange={(e) => handleInputChange('addressComplement', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        placeholder="Bairro"
                        value={formData.neighborhood}
                        onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        placeholder="Cidade"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={formErrors.city ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.city && (
                        <p className="text-sm text-red-600">{formErrors.city}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Select onValueChange={(value) => handleInputChange('state', value)}>
                        <SelectTrigger className={formErrors.state ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.state && (
                        <p className="text-sm text-red-600">{formErrors.state}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full on-button text-lg h-12"
                  disabled={contratacaoLoading || status !== 'form_filling'}
                >
                  {contratacaoLoading ? 'Processando...' : 'Finalizar Contratação'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                Ao finalizar, você receberá o contrato por email para assinatura digital
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
