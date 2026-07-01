import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeRefetch } from './useRealtimeRefetch';

export type ProdutoTipo = 'assinatura' | 'avulso';

export interface Produto {
  id: string;
  nome_produto: string;
  descricao: string | null;
  ativo: boolean;
  tipo: ProdutoTipo;
  exige_contrato: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plano {
  id: string;
  produto_id: string;
  nome_plano: string;
  descricao: string | null;
  entregaveis: string[];
  preco_em_centavos: number;
  numero_parcelas: number;
  valor_parcela_centavos: number | null;
  zapsign_template_id_pf: string | null;
  zapsign_template_id_pj: string | null;
  pagarme_plan_id: string | null;
  periodicidade: 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual';
  unidade: string | null;
  mostrar_parcelas: boolean;
  imagens: string[];
  imagem_capa_url: string | null;
  ativo: boolean;
  listado_publicamente: boolean;
  ordem_exibicao: number;
  popular: boolean;
  created_at: string;
  updated_at: string;
  produtos?: {
    id: string;
    nome_produto: string;
    ativo: boolean;
  };
}

// O banco guarda `tipo` como text; aqui coagimos para a união ProdutoTipo.
const normalizeProduto = (p: { tipo?: string | null } & Record<string, unknown>): Produto =>
  ({ ...p, tipo: (p.tipo === 'avulso' ? 'avulso' : 'assinatura') as ProdutoTipo }) as Produto;

// Cache de módulo: evita piscar/recarregar ao trocar de tela
let produtosCache: Produto[] | null = null;
let planosCache: Plano[] | null = null;

export const useProducts = () => {
  const [produtos, setProdutos] = useState<Produto[]>(produtosCache ?? []);
  const [planos, setPlanos] = useState<Plano[]>(planosCache ?? []);
  const [loading, setLoading] = useState(produtosCache === null || planosCache === null);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    try {
      if (produtosCache === null) setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      produtosCache = (data || []).map(normalizeProduto);
      setProdutos(produtosCache);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanos = async () => {
    try {
      if (planosCache === null) setLoading(true);
      const { data, error } = await supabase
        .from('planos')
        .select(`
          *,
          produtos:produto_id (
            id,
            nome_produto,
            ativo
          )
        `)
        .order('ordem_exibicao', { ascending: true });

      if (error) throw error;

      // Cast entregaveis from Json to string[] and fix periodicidade type
      const planosFormatted = (data || []).map(plano => ({
        ...plano,
        entregaveis: Array.isArray(plano.entregaveis) ? plano.entregaveis as string[] : [],
        imagens: Array.isArray(plano.imagens) ? plano.imagens as string[] : [],
        periodicidade: (plano.periodicidade || 'anual') as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual'
      }));

      planosCache = planosFormatted;
      setPlanos(planosFormatted);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os planos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanosAtivos = async (): Promise<Plano[]> => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select(`
          *,
          produtos:produto_id (
            id,
            nome_produto,
            ativo
          )
        `)
        .eq('ativo', true)
        .eq('listado_publicamente', true)
        .order('ordem_exibicao', { ascending: true });

      if (error) throw error;
      
      // Cast entregaveis from Json to string[] and fix periodicidade type
      const planosFormatted = (data || []).map(plano => ({
        ...plano,
        entregaveis: Array.isArray(plano.entregaveis) ? plano.entregaveis as string[] : [],
        imagens: Array.isArray(plano.imagens) ? plano.imagens as string[] : [],
        periodicidade: (plano.periodicidade || 'anual') as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual'
      }));
      
      return planosFormatted;
    } catch (error) {
      console.error('Erro ao buscar planos ativos:', error);
      return [];
    }
  };

  const createProduto = async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .insert([produto])
        .select()
        .single();

      if (error) throw error;

      const novo = normalizeProduto(data);
      setProdutos(prev => [novo, ...prev]);
      toast({
        title: 'Sucesso',
        description: 'Produto criado com sucesso',
      });
      return novo;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o produto',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProduto = async (id: string, updates: Partial<Produto>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const atualizado = normalizeProduto(data);
      setProdutos(prev => prev.map(p => p.id === id ? atualizado : p));
      toast({
        title: 'Sucesso',
        description: 'Produto atualizado com sucesso',
      });
      return atualizado;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o produto',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPlano = async (plano: Omit<Plano, 'id' | 'created_at' | 'updated_at' | 'produtos'>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planos')
        .insert([plano])
        .select(`
          *,
          produtos:produto_id (
            id,
            nome_produto,
            ativo
          )
        `)
        .single();

      if (error) throw error;

      // Cast entregaveis from Json to string[] and fix periodicidade type
      const planoFormatted = {
        ...data,
        entregaveis: Array.isArray(data.entregaveis) ? data.entregaveis as string[] : [],
        imagens: Array.isArray(data.imagens) ? data.imagens as string[] : [],
        periodicidade: (data.periodicidade || 'anual') as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual'
      };

      setPlanos(prev => [planoFormatted, ...prev]);
      toast({
        title: 'Sucesso',
        description: 'Plano criado com sucesso',
      });
      return planoFormatted;
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o plano',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePlano = async (id: string, updates: Partial<Plano>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          produtos:produto_id (
            id,
            nome_produto,
            ativo
          )
        `)
        .single();

      if (error) throw error;

      // Cast entregaveis from Json to string[] and fix periodicidade type
      const planoFormatted = {
        ...data,
        entregaveis: Array.isArray(data.entregaveis) ? data.entregaveis as string[] : [],
        imagens: Array.isArray(data.imagens) ? data.imagens as string[] : [],
        periodicidade: (data.periodicidade || 'anual') as 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bianual'
      };

      setPlanos(prev => prev.map(p => p.id === id ? planoFormatted : p));
      toast({
        title: 'Sucesso',
        description: 'Plano atualizado com sucesso',
      });
      return planoFormatted;
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o plano',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePlano = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('planos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPlanos(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Plano excluído com sucesso',
      });
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o plano',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
    fetchPlanos();
  }, []);

  // Realtime: atualiza catálogo quando produtos/planos mudam
  useRealtimeRefetch(['produtos', 'planos'], () => {
    fetchProdutos();
    fetchPlanos();
  });

  return {
    produtos,
    planos,
    loading,
    fetchProdutos,
    fetchPlanos,
    fetchPlanosAtivos,
    createProduto,
    updateProduto,
    createPlano,
    updatePlano,
    deletePlano,
  };
};