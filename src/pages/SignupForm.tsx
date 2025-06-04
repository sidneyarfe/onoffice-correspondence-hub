
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { MaskedInput } from '@/components/ui/masked-input';
import { useCEP } from '@/hooks/useCEP';
import { useContractProcess } from '@/hooks/useContractProcess';
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
  
  const [isLoading, setIsLoading] = useState(false);
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

    if (!formData.companyName.trim()) {
      errors.companyName = 'Razão social é obrigatória';
    }

    if (!validateCNPJ(formData.cnpj)) {
      errors.cnpj = 'CNPJ inválido';
    }

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

  const simulateContractProcess = async () => {
    // Simular envio de contrato
    updateStatus('contract_sending');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateStatus('contract_sent', { contractId: `CTR-${Date.now()}` });
    
    toast({
      title: "Contrato enviado!",
      description: "Verifique seu email para assinar o contrato digitalmente.",
    });

    // Simular processo de pagamento após 3 segundos
    setTimeout(() => {
      updateStatus('payment_processing', { paymentId: `PAY-${Date.now()}` });
      
      setTimeout(() => {
        updateStatus('payment_approved');
        
        toast({
          title: "Pagamento aprovado!",
          description: "Sua conta está sendo criada...",
        });
        
        setTimeout(() => {
          updateStatus('account_created');
          
          setTimeout(() => {
            updateStatus('completed');
            
            toast({
              title: "Parabéns! 🎉",
              description: "Sua conta foi criada com sucesso. Bem-vindo à ON Office!",
            });
            
            // Redirecionar para login após 3 segundos
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  message: 'Conta criada com sucesso! Faça login para acessar sua área.' 
                }
              });
            }, 3000);
          }, 2000);
        }, 2000);
      }, 3000);
    }, 3000);
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

    setIsLoading(true);
    updateStatus('form_submitted');

    try {
      console.log('Dados do formulário:', formData);
      console.log('Plano selecionado:', selectedPlan);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await simulateContractProcess();
      
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
                Complete os dados da sua empresa para finalizar a contratação
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
              <CardTitle className="text-2xl text-on-dark">Dados da Empresa</CardTitle>
              <CardDescription>
                Preencha todas as informações para criarmos sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Razão Social *</Label>
                    <Input
                      id="companyName"
                      placeholder="Nome da empresa"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className={formErrors.companyName ? 'border-red-500' : ''}
                      required
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
                      required
                    />
                    {formErrors.cnpj && (
                      <p className="text-sm text-red-600">{formErrors.cnpj}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@empresa.com"
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

                <Button
                  type="submit"
                  className="w-full on-button text-lg h-12"
                  disabled={isLoading || status !== 'form_filling'}
                >
                  {isLoading ? 'Processando...' : 'Finalizar Contratação'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                Ao finalizar, você receberá o contrato por email para assinatura digital via ZapSign
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
