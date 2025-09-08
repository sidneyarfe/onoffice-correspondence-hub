
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminHealthStatus {
  isHealthy: boolean;
  issues: string[];
  lastCheck: Date;
}

export const useAdminHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState<AdminHealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();

  const isAdmin = () => {
    if (!user?.email) return false;
    
    return user.email === 'onoffice1893@gmail.com' || 
           user.email === 'contato@onofficebelem.com.br' ||
           user.email === 'sidneyferreira12205@gmail.com' ||
           user.email.includes('@onoffice.com') ||
           user.type === 'admin';
  };

  const performHealthCheck = async (): Promise<AdminHealthStatus> => {
    const issues: string[] = [];

    try {
      // Verificar se é admin
      if (!isAdmin()) {
        issues.push('Usuário não é admin');
        return {
          isHealthy: false,
          issues,
          lastCheck: new Date()
        };
      }

      // Verificar conectividade básica
      try {
        await supabase.from('documentos_admin').select('count', { count: 'exact', head: true });
      } catch (connectivityError) {
        issues.push('Problemas de conectividade com banco de dados');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        lastCheck: new Date()
      };

    } catch (error) {
      console.error('Erro durante verificação de saúde:', error);
      issues.push(`Erro durante verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      return {
        isHealthy: false,
        issues,
        lastCheck: new Date()
      };
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const status = await performHealthCheck();
      setHealthStatus(status);
      return status;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdmin()) {
        runHealthCheck();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  return {
    healthStatus,
    checking,
    runHealthCheck,
    checkAdminAuth: isAdmin
  };
};
