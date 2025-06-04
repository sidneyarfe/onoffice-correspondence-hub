
import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends React.ComponentProps<"input"> {
  mask: 'cnpj' | 'cpf' | 'phone' | 'cep';
  onValueChange?: (value: string, rawValue: string) => void;
}

const masks = {
  cnpj: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  },
  cpf: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  },
  phone: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
  },
  cep: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  }
};

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, onValueChange, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const maskedValue = masks[mask](inputValue);
      const rawValue = inputValue.replace(/[^\d]/g, '');
      
      e.target.value = maskedValue;
      
      if (onValueChange) {
        onValueChange(maskedValue, rawValue);
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        className={cn(className)}
        onChange={handleChange}
        value={value}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
