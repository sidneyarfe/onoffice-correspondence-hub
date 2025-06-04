
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User, Building, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ClientProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: 'Empresa Silva LTDA',
    cnpj: '12.345.678/0001-90',
    email: 'joao@empresa.com',
    phone: '(11) 99999-9999',
    responsibleName: 'João Silva',
    responsibleCpf: '123.456.789-00',
    address: 'Rua das Empresas, 123 - Sala 45',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Salvando dados:', formData);
    setIsEditing(false);
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram atualizadas com sucesso.",
    });
  };

  const planInfo = {
    name: 'Plano Anual',
    startDate: '01/06/2023',
    features: [
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Meu Perfil</h1>
        <p className="text-gray-600">
          Gerencie as informações da sua empresa e plano contratado
        </p>
      </div>

      {/* Company Information */}
      <Card className="on-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-on-lime" />
              Informações da Empresa
            </CardTitle>
            <CardDescription>
              Dados cadastrais da sua empresa
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Razão Social</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                disabled={!isEditing}
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
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsibleName">Nome do Responsável</Label>
              <Input
                id="responsibleName"
                value={formData.responsibleName}
                onChange={(e) => handleInputChange('responsibleName', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibleCpf">CPF do Responsável</Label>
              <Input
                id="responsibleCpf"
                value={formData.responsibleCpf}
                onChange={(e) => handleInputChange('responsibleCpf', e.target.value)}
                disabled={!isEditing}
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                disabled={!isEditing}
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Cliente desde: {planInfo.startDate}</span>
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
                    <span className="text-gray-700">{feature}</span>
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
            <p className="text-gray-700">Rua das Empresas, 123 - Sala 45</p>
            <p className="text-gray-700">Centro - São Paulo/SP</p>
            <p className="text-gray-700">CEP: 01234-567</p>
            <p className="text-gray-700 mt-2">Tel: (11) 3000-0000</p>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Horário de funcionamento:</strong> Segunda a Sexta, das 8h às 18h
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
