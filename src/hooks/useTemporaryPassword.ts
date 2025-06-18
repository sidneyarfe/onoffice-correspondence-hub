
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useTemporaryPassword = () => {
  const [loading, setLoading] = useState(false);

  const validateTemporaryPassword = async (userId: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Validando senha temporária para usuário:', userId);
      
      const { data, error } = await supabase.rpc('validate_temporary_password', {
        p_user_id: userId,
        p_password: password
      });

      if (error) {
        console.error('Erro ao validar senha temporária:', error);
        return false;
      }

      console.log('Resultado da validação:', data);
      return data === true;
    } catch (error) {
      console.error('Erro na validação da senha temporária:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markPasswordAsChanged = async (userId: string): Promise<boolean> => {
    try {
      console.log('Marcando senha como alterada para usuário:', userId);
      
      const { data, error } = await supabase.rpc('mark_password_changed', {
        p_user_id: userId
      });

      if (error) {
        console.error('Erro ao marcar senha como alterada:', error);
        return false;
      }

      console.log('Senha marcada como alterada com sucesso');
      return data === true;
    } catch (error) {
      console.error('Erro ao marcar senha como alterada:', error);
      return false;
    }
  };

  const checkIfPasswordNeedsChange = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('password_changed')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao verificar status da senha:', error);
        return false;
      }

      // Se password_changed é false ou null, precisa trocar
      return data.password_changed === false || data.password_changed === null;
    } catch (error) {
      console.error('Erro ao verificar status da senha:', error);
      return false;
    }
  };

  const changePassword = async (userId: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log('Alterando senha do usuário:', userId);
      
      // Alterar senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) {
        console.error('Erro ao alterar senha no Auth:', authError);
        toast({
          title: "Erro ao alterar senha",
          description: authError.message,
          variant: "destructive",
        });
        return false;
      }

      // Marcar senha como alterada no perfil
      const success = await markPasswordAsChanged(userId);
      
      if (success) {
        toast({
          title: "Senha alterada com sucesso!",
          description: "Sua senha foi atualizada.",
        });
        return true;
      } else {
        toast({
          title: "Aviso",
          description: "Senha alterada, mas houve um problema ao atualizar o status.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    validateTemporaryPassword,
    markPasswordAsChanged,
    checkIfPasswordNeedsChange,
    changePassword,
    loading
  };
};
