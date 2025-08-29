import { supabase } from '@/integrations/supabase/client';

// Client-side input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

// Validate password strength using database function
export const validatePasswordStrength = async (password: string): Promise<{
  isValid: boolean;
  issues: string[];
}> => {
  try {
    const { data, error } = await supabase.rpc('validate_password_strength', {
      password_input: password
    });

    if (error) {
      console.error('Erro ao validar força da senha:', error);
      return {
        isValid: false,
        issues: ['Erro ao validar senha']
      };
    }

    // Type cast the response
    const result = data as { is_valid: boolean; issues: string[] };
    
    return {
      isValid: result?.is_valid || false,
      issues: result?.issues || []
    };
  } catch (error) {
    console.error('Erro ao validar força da senha:', error);
    return {
      isValid: false,
      issues: ['Erro ao validar senha']
    };
  }
};

// Validate CPF format
export const validateCPF = async (cpf: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_cpf', {
      cpf_input: cpf
    });

    if (error) {
      console.error('Erro ao validar CPF:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao validar CPF:', error);
    return false;
  }
};

// Validate CNPJ format
export const validateCNPJ = async (cnpj: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_cnpj', {
      cnpj_input: cnpj
    });

    if (error) {
      console.error('Erro ao validar CNPJ:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao validar CNPJ:', error);
    return false;
  }
};

// Rate limiting check
export const checkRateLimit = async (email?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_ip_address: '127.0.0.1', // Client IP would be handled by Edge Functions
      p_email: email,
      p_max_submissions: 5,
      p_time_window_hours: 1
    });

    if (error) {
      console.error('Erro ao verificar limite de taxa:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Erro ao verificar limite de taxa:', error);
    return false;
  }
};