
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CreateUserData {
  email: string;
  nome_responsavel: string;
  password?: string;
}

export const useUserCreation = () => {
  const [loading, setLoading] = useState(false);

  const createUserAccount = async (userData: CreateUserData) => {
    setLoading(true);
    
    try {
      // Gerar senha aleatória se não fornecida
      const password = userData.password || await generateRandomPassword();
      
      console.log('Criando usuário no Supabase Auth:', userData.email);
      
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
          data: {
            full_name: userData.nome_responsavel
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) {
        console.error('Erro na criação do usuário:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado');
      }

      console.log('Usuário criado com sucesso:', authData.user.id);

      // Salvar hash e senha temporária no perfil
      await saveTemporaryPasswordHash(authData.user.id, password);

      return {
        user_id: authData.user.id,
        email: authData.user.email,
        temporary_password: password,
        success: true
      };

    } catch (error) {
      console.error('Erro na criação do usuário:', error);
      
      toast({
        title: "Erro na criação da conta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveTemporaryPasswordHash = async (userId: string, password: string) => {
    try {
      // Usar hash simples local (Base64 + salt)
      const simpleHash = btoa(password + userId + 'salt'); // Base64 com salt
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          temporary_password_hash: simpleHash,
          password_changed: false 
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Erro ao salvar dados da senha temporária:', updateError);
      } else {
        console.log('Dados da senha temporária salvos com sucesso');
      }
    } catch (error) {
      console.error('Erro no processo de salvamento da senha:', error);
    }
  };

  const generateRandomPassword = async (): Promise<string> => {
    try {
      // Chamar a função do Supabase para gerar senha
      const { data, error } = await supabase.rpc('generate_random_password');
      
      if (error) {
        console.error('Erro ao gerar senha:', error);
        // Fallback para geração local
        return generateLocalPassword();
      }
      
      return String(data) || generateLocalPassword(); // Converter para string
    } catch (error) {
      console.error('Erro ao gerar senha:', error);
      return generateLocalPassword();
    }
  };

  const generateLocalPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return {
    createUserAccount,
    loading
  };
};
