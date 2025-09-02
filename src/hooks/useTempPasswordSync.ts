import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useTempPasswordSync = () => {
  const [loading, setLoading] = useState(false);

  const syncTemporaryPassword = async (userId: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Sincronizando senha temporária via edge function:', userId);
      
      // Chamar a edge function para sincronizar a senha
      const { data, error } = await supabase.functions.invoke('sync-temporary-password', {
        body: {
          user_id: userId,
          password: password
        }
      });

      if (error) {
        console.error('Erro ao sincronizar senha temporária:', error);
        toast({
          title: "Erro na sincronização",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (!data.success) {
        console.error('Falha na sincronização:', data.error);
        toast({
          title: "Falha na sincronização",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      console.log('Senha temporária sincronizada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro na sincronização da senha temporária:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const syncUserByEmail = async (email: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Buscando dados do usuário para sincronização:', email);
      
      // Buscar dados do usuário
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, temporary_password_hash, password_changed')
        .eq('email', email)
        .maybeSingle();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        return false;
      }

      if (!userData || !userData.temporary_password_hash || userData.password_changed) {
        console.log('Usuário não possui senha temporária válida');
        toast({
          title: "Aviso",
          description: "Usuário não possui senha temporária para sincronizar",
          variant: "destructive",
        });
        return false;
      }

      // Decodificar a senha temporária
      try {
        const decoded = atob(userData.temporary_password_hash);
        const saltPrefix = 'onoffice_salt_';
        
        if (!decoded.startsWith(saltPrefix)) {
          throw new Error('Hash inválido');
        }

        // Extrair senha (remover salt e timestamp)
        const withoutPrefix = decoded.substring(saltPrefix.length);
        const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');
        
        if (lastUnderscoreIndex === -1) {
          throw new Error('Formato de hash inválido');
        }

        const password = withoutPrefix.substring(0, lastUnderscoreIndex);
        
        // Sincronizar a senha
        const success = await syncTemporaryPassword(userData.id, password);
        
        if (success) {
          toast({
            title: "Sincronização bem-sucedida",
            description: `Senha temporária sincronizada para ${email}`,
          });
        }
        
        return success;
      } catch (decodeError) {
        console.error('Erro ao decodificar senha temporária:', decodeError);
        toast({
          title: "Erro na sincronização",
          description: "Não foi possível decodificar a senha temporária",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Erro na sincronização por email:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    syncTemporaryPassword,
    syncUserByEmail,
    loading
  };
};