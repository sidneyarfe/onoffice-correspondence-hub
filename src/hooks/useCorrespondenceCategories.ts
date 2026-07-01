import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/utils/adminEmails';
import { useRealtimeRefetch } from './useRealtimeRefetch';

export interface CorrespondenceCategory {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCorrespondenceCategories = () => {
  const [categories, setCategories] = useState<CorrespondenceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isAdmin = () => isAdminUser(user);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categorias_correspondencia')
        .select('*')
        .order('is_system', { ascending: false })
        .order('nome');

      if (fetchError) {
        setError(`Erro ao buscar categorias: ${fetchError.message}`);
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: {
    nome: string;
    descricao?: string;
    cor?: string;
  }) => {
    if (!isAdmin()) {
      throw new Error('Apenas administradores podem criar categorias');
    }

    const { data, error } = await supabase
      .from('categorias_correspondencia')
      .insert({
        ...categoryData,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    await fetchCategories(); // Refetch to update list
    return data;
  };

  const updateCategory = async (id: string, categoryData: {
    nome?: string;
    descricao?: string;
    cor?: string;
  }) => {
    if (!isAdmin()) {
      throw new Error('Apenas administradores podem editar categorias');
    }

    const { data, error } = await supabase
      .from('categorias_correspondencia')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchCategories(); // Refetch to update list
    return data;
  };

  const deleteCategory = async (id: string) => {
    if (!isAdmin()) {
      throw new Error('Apenas administradores podem excluir categorias');
    }

    // Gerência livre de tags: o admin decide. Correspondências já existentes mantêm o
    // texto da categoria; apenas a definição (cor/descrição) da tag deixa de existir.
    const { error } = await supabase
      .from('categorias_correspondencia')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchCategories(); // Refetch to update list
  };

  /** Quantas correspondências usam esta categoria (para avisar antes de excluir). */
  const countCategoryUsage = async (nome: string): Promise<number> => {
    const { count } = await supabase
      .from('correspondencias')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', nome);
    return count ?? 0;
  };

  // Livre escolha do admin: qualquer tag pode ser removida (inclusive as padrão).
  const canDeleteCategory = (_category: CorrespondenceCategory) => isAdmin();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Tags atualizam ao vivo em toda a UI (filtro da tabela, chips) ao criar/editar/remover.
  useRealtimeRefetch(['categorias_correspondencia'], fetchCategories);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    canDeleteCategory,
    countCategoryUsage,
    isAdmin: isAdmin()
  };
};