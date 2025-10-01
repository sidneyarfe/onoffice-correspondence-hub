import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminData {
  email: string;
  full_name: string;
  password: string;
}

export interface SetPasswordData {
  userId: string;
  newPassword: string;
}

export const useAdminTeam = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: admins = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminUser[];
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (adminData: CreateAdminData) => {
      console.log('Criando novo administrador via Edge Function:', adminData.email);
      
      // Usar Edge Function para criar admin com privilégios service_role
      const { data, error } = await supabase.functions.invoke('create-admin-auth-user', {
        body: {
          email: adminData.email,
          password: adminData.password,
          full_name: adminData.full_name,
        },
      });

      if (error) {
        console.error('Erro ao criar admin via Edge Function:', error);
        throw new Error(error.message || 'Falha ao criar administrador');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao criar administrador');
      }

      console.log('Administrador criado com sucesso:', data);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast({
        title: 'Administrador criado',
        description: 'O administrador foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar administrador',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: SetPasswordData) => {
      console.log('Alterando senha do administrador via Edge Function:', userId);
      
      // Buscar dados do admin em profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('Não foi possível obter dados do administrador');
      }

      // Sempre usar Edge Function para alterar senha (tem privilégios service_role)
      const { data, error } = await supabase.functions.invoke('create-admin-auth-user', {
        body: {
          email: profile.email,
          password: newPassword,
          full_name: profile.full_name || profile.email,
        },
      });

      if (error) {
        console.error('Erro ao alterar senha via Edge Function:', error);
        throw new Error(error.message || 'Falha ao alterar senha');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao alterar senha');
      }

      console.log('Senha alterada com sucesso');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast({
        title: 'Senha atualizada',
        description: 'A senha do administrador foi alterada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string } }) => {
      console.log('Atualizando administrador:', id, data);
      
      // Usar Edge Function para atualizar email no Auth (requer service_role)
      const { data: updateData, error: updateError } = await supabase.functions.invoke('update-admin-auth-email', {
        body: {
          user_id: id,
          new_email: data.email,
        },
      });

      if (updateError) {
        console.error('Erro ao atualizar email via Edge Function:', updateError);
        throw new Error(updateError.message || 'Falha ao atualizar email');
      }

      if (!updateData?.success) {
        throw new Error(updateData?.error || 'Falha ao atualizar email');
      }

      // Atualizar full_name no profile (o email já foi atualizado pela Edge Function)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name })
        .eq('id', id);

      if (profileError) {
        console.error('Erro ao atualizar full_name:', profileError);
        throw profileError;
      }

      console.log('Administrador atualizado com sucesso');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast({
        title: 'Administrador atualizado',
        description: 'Os dados do administrador foram atualizados com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar administrador',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Email enviado',
        description: 'Um email com instruções para redefinir a senha foi enviado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  return {
    admins,
    isLoading,
    error,
    createAdmin: createAdminMutation.mutate,
    isCreatingAdmin: createAdminMutation.isPending,
    updateAdmin: updateAdminMutation.mutate,
    isUpdatingAdmin: updateAdminMutation.isPending,
    setPassword: setPasswordMutation.mutate,
    isSettingPassword: setPasswordMutation.isPending,
    sendPasswordReset: sendPasswordResetMutation.mutate,
    isSendingPasswordReset: sendPasswordResetMutation.isPending,
  };
};