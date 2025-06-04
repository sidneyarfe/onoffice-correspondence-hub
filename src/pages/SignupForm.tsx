
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

const SignupForm = () => {
  const location = useLocation();
  const selectedPlan = location.state?.selectedPlan || 'MENSAL';
  
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
    zipCode: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Aqui seria a integração com ZapSign e Asaas
      console.log('Dados do formulário:', formData);
      console.log('Plano selecionado:', selectedPlan);
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Em breve você receberá o contrato para assinatura por email.",
      });
      
      // Simular redirecionamento para processo de pagamento
      setTimeout(() => {
        toast({
          title: "Redirecionando...",
          description: "Você será direcionado para o processo de pagamento.",
        });
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                      required
                    />
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
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
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
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="responsibleCpf">CPF do Responsável *</Label>
                    <Input
                      id="responsibleCpf"
                      placeholder="000.000.000-00"
                      value={formData.responsibleCpf}
                      onChange={(e) => handleInputChange('responsibleCpf', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço Atual *</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número, complemento"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        {/* Adicionar outros estados conforme necessário */}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full on-button text-lg h-12"
                  disabled={isLoading}
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
