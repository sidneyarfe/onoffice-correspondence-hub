
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminHealthStatus {
  isHealthy: boolean;
  issues: string[];
  lastCheck: Date;
  autoRepairAttempted: boolean;
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

  const performHealthCheck = async (attemptRepair = false): Promise<AdminHealthStatus> => {
    const issues: string[] = [];
    let autoRepairAttempted = false;

    try {
      // Verificar se é admin
      if (!checkAdminAuth()) {
        issues.push('Sessão admin não encontrada ou expirada');
        return {
          isHealthy: false,
          issues,
          lastCheck: new Date(),
          autoRepairAttempted: false
        };
      }

      const adminUser = localStorage.getItem('onoffice_admin_user');
      if (!adminUser) {
        issues.push('Dados do usuário admin não encontrados');
        return {
          isHealthy: false,
          issues,
          lastCheck: new Date(),
          autoRepairAttempted: false
        };
      }

      const userData = JSON.parse(adminUser);

      // Verificar se perfil admin existe
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .eq('role', 'admin')
        .single();

      if (profileError || !profile) {
        issues.push('Perfil admin não encontrado na tabela profiles');
        
        if (attemptRepair) {
          try {
            console.log('Tentando reparar perfil admin...');
            
            // Tentar usar função SQL se disponível
            const { data: repairResult, error: repairError } = await supabase.rpc('ensure_admin_profile', {
              p_user_id: userData.id,
              p_email: userData.email,
              p_full_name: userData.name
            });

            if (!repairError && repairResult) {
              console.log('✓ Perfil admin reparado via função SQL');
              autoRepairAttempted = true;
              // Remover o issue já que foi reparado
              const issueIndex = issues.indexOf('Perfil admin não encontrado na tabela profiles');
              if (issueIndex > -1) {
                issues.splice(issueIndex, 1);
              }
            } else {
              // Fallback para inserção direta
              const { error: insertError } = await supabase
                .from('profiles')
                .upsert({
                  id: userData.id,
                  email: userData.email,
                  full_name: userData.name,
                  role: 'admin',
                  password_changed: true
                });

              if (!insertError) {
                console.log('✓ Perfil admin reparado via upsert');
                autoRepairAttempted = true;
                const issueIndex = issues.indexOf('Perfil admin não encontrado na tabela profiles');
                if (issueIndex > -1) {
                  issues.splice(issueIndex, 1);
                }
              } else {
                console.error('❌ Falha no reparo do perfil admin:', insertError);
              }
            }
          } catch (repairError) {
            console.error('❌ Erro durante reparo:', repairError);
          }
        }
      }

      // Verificar conectividade com tabelas críticas
      try {
        await Promise.all([
          supabase.from('documentos_admin').select('count', { count: 'exact', head: true }),
          supabase.from('correspondencias').select('count', { count: 'exact', head: true }),
          supabase.from('contratacoes_clientes').select('count', { count: 'exact', head: true })
        ]);
      } catch (connectivityError) {
        issues.push('Problemas de conectividade com banco de dados');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        lastCheck: new Date(),
        autoRepairAttempted
      };

    } catch (error) {
      console.error('Erro durante verificação de saúde:', error);
      issues.push(`Erro durante verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      return {
        isHealthy: false,
        issues,
        lastCheck: new Date(),
        autoRepairAttempted
      };
    }
  };

  const runHealthCheck = async (attemptRepair = true) => {
    setChecking(true);
    try {
      const status = await performHealthCheck(attemptRepair);
      setHealthStatus(status);
      return status;
    } finally {
      setChecking(false);
    }
  };

  // Executar verificação inicial após um delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (checkAdminAuth()) {
        runHealthCheck(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return {
    healthStatus,
    checking,
    runHealthCheck,
    checkAdminAuth
  };
};
