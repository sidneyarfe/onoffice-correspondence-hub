
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';

interface PersonalDataSectionProps {
  email: string;
  phone: string;
  responsibleName: string;
  responsibleCpf: string;
  onInputChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export const PersonalDataSection = ({ 
  email, 
  phone, 
  responsibleName, 
  responsibleCpf, 
  onInputChange, 
  errors 
}: PersonalDataSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Dados Pessoais</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => onInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            required
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <MaskedInput
            id="phone"
            mask="phone"
            placeholder="(11) 99999-9999"
            value={phone}
            onValueChange={(masked) => onInputChange('phone', masked)}
            className={errors.phone ? 'border-red-500' : ''}
            required
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="responsibleName">Nome do Responsável *</Label>
          <Input
            id="responsibleName"
            placeholder="Nome completo"
            value={responsibleName}
            onChange={(e) => onInputChange('responsibleName', e.target.value)}
            className={errors.responsibleName ? 'border-red-500' : ''}
            required
          />
          {errors.responsibleName && (
            <p className="text-sm text-red-600">{errors.responsibleName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="responsibleCpf">CPF do Responsável *</Label>
          <MaskedInput
            id="responsibleCpf"
            mask="cpf"
            placeholder="000.000.000-00"
            value={responsibleCpf}
            onValueChange={(masked) => onInputChange('responsibleCpf', masked)}
            className={errors.responsibleCpf ? 'border-red-500' : ''}
            required
          />
          {errors.responsibleCpf && (
            <p className="text-sm text-red-600">{errors.responsibleCpf}</p>
          )}
        </div>
      </div>
    </div>
  );
};
