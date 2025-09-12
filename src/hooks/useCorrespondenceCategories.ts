import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const isAdmin = () => {
    if (!user?.email) return false;
    
    return user.email === 'onoffice1893@gmail.com' || 
           user.email === 'contato@onofficebelem.com.br' ||
           user.email === 'sidneyferreira12205@gmail.com' ||
           user.email.includes('@onoffice.com') ||
           user.type === 'admin';
  };

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

    // Verificar se a categoria está sendo usada
    const { count, error: countError } = await supabase
      .from('correspondencias')
      .select('*', { count: 'exact', head: true })
      .eq('categoria', categories.find(c => c.id === id)?.nome);

    if (countError) throw countError;

    if (count && count > 0) {
      throw new Error('Esta categoria não pode ser excluída pois está sendo usada por correspondências existentes');
    }

    const { error } = await supabase
      .from('categorias_correspondencia')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchCategories(); // Refetch to update list
  };

  const canDeleteCategory = (category: CorrespondenceCategory) => {
    return isAdmin() && (!category.is_system || category.created_by === user?.id);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    canDeleteCategory,
    isAdmin: isAdmin()
  };
};