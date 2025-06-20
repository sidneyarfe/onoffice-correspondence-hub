
import { validateCNPJ, validateCPF, validateEmail, validatePhone } from '@/utils/validators';
import { cleanNumbers } from '@/utils/formatters';

interface FormData {
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  responsibleName: string;
  responsibleCpf: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export const validateSignupForm = (formData: FormData, personType: 'fisica' | 'juridica' | ''): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validar tipo de pessoa
  if (!personType) {
    errors.personType = 'Selecione se é Pessoa Física ou Jurídica';
  }

  // Campos obrigatórios sempre
  if (!validateEmail(formData.email)) {
    errors.email = 'Email inválido';
  }

  if (!validatePhone(formData.phone)) {
    errors.phone = 'Telefone inválido';
  }

  if (!formData.responsibleName.trim()) {
    errors.responsibleName = 'Nome do responsável é obrigatório';
  }

  if (!validateCPF(formData.responsibleCpf)) {
    errors.responsibleCpf = 'CPF inválido';
  }

  // Campos obrigatórios apenas se é pessoa jurídica
  if (personType === 'juridica') {
    if (!formData.companyName.trim()) {
      errors.companyName = 'Razão social é obrigatória';
    }

    if (!validateCNPJ(formData.cnpj)) {
      errors.cnpj = 'CNPJ inválido';
    }
  }

  if (!formData.address.trim()) {
    errors.address = 'Endereço é obrigatório';
  }

  if (!formData.city.trim()) {
    errors.city = 'Cidade é obrigatória';
  }

  if (!formData.state) {
    errors.state = 'Estado é obrigatório';
  }

  if (cleanNumbers(formData.zipCode).length !== 8) {
    errors.zipCode = 'CEP inválido';
  }

  return errors;
};
