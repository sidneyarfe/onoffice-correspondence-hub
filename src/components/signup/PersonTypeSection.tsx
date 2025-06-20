
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PersonTypeSectionProps {
  personType: 'fisica' | 'juridica' | '';
  onPersonTypeChange: (value: 'fisica' | 'juridica') => void;
  error?: string;
}

export const PersonTypeSection = ({ personType, onPersonTypeChange, error }: PersonTypeSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-semibold text-gray-800">
          O endereço fiscal será contratado através da: *
        </Label>
        <RadioGroup
          value={personType}
          onValueChange={onPersonTypeChange}
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
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};
