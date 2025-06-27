
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface DocumentFormData {
  tipo: string;
  nome: string;
  descricao: string;
  disponivel_por_padrao: boolean;
}

interface DocumentFormFieldsProps {
  formData: DocumentFormData;
  onFormDataChange: (data: DocumentFormData) => void;
  loading: boolean;
}

const DocumentFormFields = ({ formData, onFormDataChange, loading }: DocumentFormFieldsProps) => {
  const handleInputChange = (field: keyof DocumentFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Input
            id="tipo"
            value={formData.tipo}
            onChange={(e) => handleInputChange('tipo', e.target.value.toUpperCase())}
            placeholder="Ex: IPTU, AVCB, INSCRICAO_ESTADUAL"
            required
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            placeholder="Nome do documento"
            required
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          placeholder="Descrição do documento"
          rows={3}
          disabled={loading}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="disponivel_por_padrao"
          checked={formData.disponivel_por_padrao}
          onCheckedChange={(checked) => handleInputChange('disponivel_por_padrao', checked)}
          disabled={loading}
        />
        <Label htmlFor="disponivel_por_padrao">Disponível por padrão para novos clientes</Label>
      </div>
    </>
  );
};

export default DocumentFormFields;
