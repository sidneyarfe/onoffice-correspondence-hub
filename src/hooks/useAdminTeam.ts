import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  login_attempts: number;
  locked_until: string | null;
}

export interface CreateAdminData {
  email: string;
  full_name: string;
  password: string;
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
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminUser[];
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (adminData: CreateAdminData) => {
      const { data, error } = await supabase.rpc('upsert_admin', {
        p_email: adminData.email,
        p_password: adminData.password,
        p_full_name: adminData.full_name,
      });

      if (error) throw error;

      // Explicitly sync with Supabase Auth
      const { error: syncError } = await supabase.functions.invoke('create-admin-auth-user', {
        body: {
          email: adminData.email,
          password: adminData.password,
          full_name: adminData.full_name,
        },
      });

      if (syncError) {
        console.warn('Failed to sync admin with Auth:', syncError);
      }

      return data;
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

  const updateAdminStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast({
        title: 'Status atualizado',
        description: 'O status do administrador foi atualizado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string } }) => {
      const { error } = await supabase
        .from('admin_users')
        .update(data)
        .eq('id', id);

      if (error) throw error;
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

  const updateAdminPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      // Get admin data first
      const { data: adminData, error: fetchError } = await supabase
        .from('admin_users')
        .select('email, full_name')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Use upsert_admin to update password
      const { data, error } = await supabase.rpc('upsert_admin', {
        p_email: adminData.email,
        p_password: password,
        p_full_name: adminData.full_name,
      });

      if (error) throw error;

      // Explicitly sync with Supabase Auth
      const { error: syncError } = await supabase.functions.invoke('create-admin-auth-user', {
        body: {
          email: adminData.email,
          password: password,
          full_name: adminData.full_name,
        },
      });

      if (syncError) {
        console.warn('Failed to sync password with Auth:', syncError);
      }

      return data;
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

  return {
    admins,
    isLoading,
    error,
    createAdmin: createAdminMutation.mutate,
    isCreatingAdmin: createAdminMutation.isPending,
    updateAdminStatus: updateAdminStatusMutation.mutate,
    isUpdatingStatus: updateAdminStatusMutation.isPending,
    updateAdmin: updateAdminMutation.mutate,
    isUpdatingAdmin: updateAdminMutation.isPending,
    updateAdminPassword: updateAdminPasswordMutation.mutate,
    isUpdatingPassword: updateAdminPasswordMutation.isPending,
  };
};