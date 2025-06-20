
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddressSectionProps {
  zipCode: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  onInputChange: (field: string, value: string) => void;
  onCEPChange: (maskedValue: string, rawValue: string) => void;
  cepLoading: boolean;
  errors: Record<string, string>;
}

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

export const AddressSection = ({
  zipCode,
  address,
  addressNumber,
  addressComplement,
  neighborhood,
  city,
  state,
  onInputChange,
  onCEPChange,
  cepLoading,
  errors
}: AddressSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Endereço</h3>
      
      <div className="space-y-2">
        <Label htmlFor="zipCode">CEP *</Label>
        <div className="relative">
          <MaskedInput
            id="zipCode"
            mask="cep"
            placeholder="00000-000"
            value={zipCode}
            onValueChange={onCEPChange}
            className={errors.zipCode ? 'border-red-500' : ''}
            required
          />
          {cepLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-on-lime border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        {errors.zipCode && (
          <p className="text-sm text-red-600">{errors.zipCode}</p>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="address">Logradouro *</Label>
          <Input
            id="address"
            placeholder="Rua, Avenida..."
            value={address}
            onChange={(e) => onInputChange('address', e.target.value)}
            className={errors.address ? 'border-red-500' : ''}
            required
          />
          {errors.address && (
            <p className="text-sm text-red-600">{errors.address}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="addressNumber">Número *</Label>
          <Input
            id="addressNumber"
            placeholder="123"
            value={addressNumber}
            onChange={(e) => onInputChange('addressNumber', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="addressComplement">Compl.</Label>
          <Input
            id="addressComplement"
            placeholder="Sala 101"
            value={addressComplement}
            onChange={(e) => onInputChange('addressComplement', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            placeholder="Bairro"
            value={neighborhood}
            onChange={(e) => onInputChange('neighborhood', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="Cidade"
            value={city}
            onChange={(e) => onInputChange('city', e.target.value)}
            className={errors.city ? 'border-red-500' : ''}
            required
          />
          {errors.city && (
            <p className="text-sm text-red-600">{errors.city}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">Estado *</Label>
          <Select onValueChange={(value) => onInputChange('state', value)}>
            <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
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
          {errors.state && (
            <p className="text-sm text-red-600">{errors.state}</p>
          )}
        </div>
      </div>
    </div>
  );
};
