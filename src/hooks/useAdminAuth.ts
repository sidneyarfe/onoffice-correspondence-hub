
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AdminAuthResult {
  success: boolean;
  admin?: AdminUser;
  error?: string;
}

// Interface para o retorno da função SQL
interface AuthenticateAdminResponse {
  success: boolean;
  admin?: AdminUser;
  error?: string;
}

export const useAdminAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const authenticateAdmin = async (email: string, password: string): Promise<AdminAuthResult> => {
    setIsLoading(true);
    console.log('=== INICIANDO AUTENTICAÇÃO ADMIN ===');
    console.log('Email:', email);
    
    try {
      // Chamar função SQL para autenticar admin
      const { data, error } = await supabase.rpc('authenticate_admin', {
        p_email: email,
        p_password: password
      });

      console.log('Resultado da autenticação:', { data, error });

      if (error) {
        console.error('Erro na função RPC:', error);
        return { success: false, error: 'Erro interno do sistema' };
      }

      // Type casting para a interface esperada
      const response = data as AuthenticateAdminResponse;

      if (!response || !response.success) {
        console.log('Autenticação falhou:', response?.error);
        return { success: false, error: response?.error || 'Credenciais inválidas' };
      }

      console.log('Admin autenticado com sucesso:', response.admin);
      return { success: true, admin: response.admin };

    } catch (error) {
      console.error('Erro geral na autenticação admin:', error);
      return { success: false, error: 'Erro de comunicação com o servidor' };
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminSystemHealth = async () => {
    try {
      const { data, error } = await supabase.rpc('check_admin_system_health');
      console.log('Saúde do sistema admin:', { data, error });
      return { data, error };
    } catch (error) {
      console.error('Erro ao verificar saúde do sistema:', error);
      return { data: null, error };
    }
  };

  return {
    authenticateAdmin,
    checkAdminSystemHealth,
    isLoading
  };
};
