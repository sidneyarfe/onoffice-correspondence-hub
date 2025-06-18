
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

      // Salvar senha temporária no profile (será feito pelo trigger automaticamente)
      // Mas vamos atualizar com a senha temporária
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          temporary_password: password,
          password_changed: false 
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Erro ao salvar senha temporária:', profileError);
        // Não vamos falhar por causa disso, apenas logar
      }

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

  const generateRandomPassword = async (): Promise<string> => {
    try {
      // Chamar a função do Supabase para gerar senha
      const { data, error } = await supabase.rpc('generate_random_password');
      
      if (error) {
        console.error('Erro ao gerar senha:', error);
        // Fallback para geração local
        return generateLocalPassword();
      }
      
      return data || generateLocalPassword();
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
