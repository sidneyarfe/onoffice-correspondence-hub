
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';

interface CompanyDataSectionProps {
  companyName: string;
  cnpj: string;
  onInputChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export const CompanyDataSection = ({ companyName, cnpj, onInputChange, errors }: CompanyDataSectionProps) => {
  return (
    <div className="space-y-4 p-4 border border-white/10 rounded-lg bg-blue-500/10">
      <h3 className="font-semibold text-foreground">Dados da Empresa</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Razão Social *</Label>
          <Input
            id="companyName"
            placeholder="Nome da empresa"
            value={companyName}
            onChange={(e) => onInputChange('companyName', e.target.value)}
            className={errors.companyName ? 'border-red-500' : ''}
            required
          />
          {errors.companyName && (
            <p className="text-sm text-red-400">{errors.companyName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <MaskedInput
            id="cnpj"
            mask="cnpj"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onValueChange={(masked) => onInputChange('cnpj', masked)}
            className={errors.cnpj ? 'border-red-500' : ''}
            required
          />
          {errors.cnpj && (
            <p className="text-sm text-red-400">{errors.cnpj}</p>
          )}
        </div>
      </div>
    </div>
  );
};
