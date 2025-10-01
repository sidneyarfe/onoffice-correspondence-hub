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
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminData.email,
        password: adminData.password,
        email_confirm: true,
        user_metadata: {
          full_name: adminData.full_name,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Criar perfil com role='admin'
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: adminData.email,
          full_name: adminData.full_name,
          role: 'admin',
        });

      if (profileError) throw profileError;

      return authData.user;
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
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
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
      // Atualizar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
        })
        .eq('id', id);

      if (profileError) throw profileError;

      // Atualizar email no Auth se mudou
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        email: data.email,
      });

      if (authError) throw authError;
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