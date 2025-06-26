
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminHealthStatus {
  isHealthy: boolean;
  issues: string[];
  lastCheck: Date;
}

export const useAdminHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState<AdminHealthStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAdminAuth = () => {
    try {
      const adminSession = localStorage.getItem('onoffice_admin_session');
      if (!adminSession) return false;

      const session = JSON.parse(adminSession);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return session.isAdmin && (Date.now() - session.timestamp <= TWENTY_FOUR_HOURS);
    } catch {
      return false;
    }
  };

  const performHealthCheck = async (): Promise<AdminHealthStatus> => {
    const issues: string[] = [];

    try {
      // Verificar se é admin
      if (!checkAdminAuth()) {
        issues.push('Sessão admin não encontrada ou expirada');
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
      if (checkAdminAuth()) {
        runHealthCheck();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    healthStatus,
    checking,
    runHealthCheck,
    checkAdminAuth
  };
};
