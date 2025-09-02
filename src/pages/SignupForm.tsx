
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useCEP } from '@/hooks/useCEP';
import { useContractProcess } from '@/hooks/useContractProcess';
import { useContratacao } from '@/hooks/useContratacao';
import { cleanNumbers } from '@/utils/formatters';
import { validateSignupForm } from '@/utils/formValidation';
import Logo from '@/components/Logo';
import { PlanSummaryCard } from '@/components/signup/PlanSummaryCard';
import { ProgressCard } from '@/components/signup/ProgressCard';
import { PersonTypeSection } from '@/components/signup/PersonTypeSection';
import { CompanyDataSection } from '@/components/signup/CompanyDataSection';
import { PersonalDataSection } from '@/components/signup/PersonalDataSection';
import { AddressSection } from '@/components/signup/AddressSection';

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
    
    const errors = validateSignupForm(formData, personType);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Formulário incompleto",
        description: "Por favor, corrija os erros destacados.",
        variant: "destructive",
      });
      return;
    }

    updateStatus('form_submitted');

    try {
      // Preparar dados para envio ao n8n
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

      console.log('Enviando dados para o n8n...');

      // Enviar dados para o n8n
      updateStatus('contract_sending');
      const result = await processarContratacao(contratacaoData);
      
      console.log('Resultado do envio:', result);
      
      if (result && result.success) {
        updateStatus('contract_sent');
        
        console.log('Solicitação enviada com sucesso');
        console.log('Administradores processarão sua solicitação em breve');
        
        // Store submission ID for potential reference
        if (result.submissionId) {
          localStorage.setItem('lastSubmissionId', result.submissionId);
        }
        
        // Redirect to aguardando assinatura page
        setTimeout(() => {
          navigate('/aguardando-assinatura', { 
            state: { 
              email: formData.email,
              nome: formData.responsibleName
            }
          });
        }, 2000);
      } else {
        throw new Error('Falha no envio da solicitação');
      }
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      setError('Erro no processamento da solicitação. Tente novamente.');
      updateStatus('form_filling');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/">
              <Logo size="md" />
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
          <PlanSummaryCard selectedPlan={selectedPlan} />
          
          <ProgressCard 
            status={status} 
            progress={progress} 
            getStatusLabel={getStatusLabel} 
          />

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
                <PersonTypeSection 
                  personType={personType}
                  onPersonTypeChange={handlePersonTypeChange}
                  error={formErrors.personType}
                />

                {personType === 'juridica' && (
                  <CompanyDataSection
                    companyName={formData.companyName}
                    cnpj={formData.cnpj}
                    onInputChange={handleInputChange}
                    errors={formErrors}
                  />
                )}

                <PersonalDataSection
                  email={formData.email}
                  phone={formData.phone}
                  responsibleName={formData.responsibleName}
                  responsibleCpf={formData.responsibleCpf}
                  onInputChange={handleInputChange}
                  errors={formErrors}
                />

                <AddressSection
                  zipCode={formData.zipCode}
                  address={formData.address}
                  addressNumber={formData.addressNumber}
                  addressComplement={formData.addressComplement}
                  neighborhood={formData.neighborhood}
                  city={formData.city}
                  state={formData.state}
                  onInputChange={handleInputChange}
                  onCEPChange={handleCEPChange}
                  cepLoading={cepLoading}
                  errors={formErrors}
                />

                <Button
                  type="submit"
                  className="w-full on-button text-lg h-12"
                  disabled={contratacaoLoading || status !== 'form_filling'}
                >
                  {contratacaoLoading ? 'Processando...' : 'Finalizar Contratação'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                Ao finalizar, sua solicitação será enviada para análise e você receberá contato em breve
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
