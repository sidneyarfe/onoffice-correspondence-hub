
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .substring(0, 14);
};

export const formatPhone = (value: string): string => {
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
};

export const formatCEP = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');
  return numbers.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
};

export const cleanNumbers = (value: string): string => {
  return value.replace(/[^\d]/g, '');
};

export const formatCurrency = (valueInCents: number | null | undefined): string => {
  if (valueInCents === null || valueInCents === undefined) {
    return 'R$ 0,00';
  }

  // Converte o valor de centavos para Reais
  const valueInReais = valueInCents / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInReais);
};
