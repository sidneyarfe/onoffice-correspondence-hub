
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientStats {
  totalCorrespondencias: number;
  correspondenciasNaoLidas: number;
  totalDocumentos: number;
  proximoVencimento: {
    diasRestantes: number;
    valor: number;
  } | null;
  contaAtivaDias: number;
  dataContratacao: string;
  planoCorreto: string;
}

export const useClientData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Buscar correspondências
        const { data: correspondencias } = await supabase
          .from('correspondencias')
          .select('id, visualizada')
          .eq('user_id', user.id);

        // Buscar documentos disponíveis da tabela documentos_admin
        const { data: documentos } = await supabase
          .from('documentos_admin')
          .select('id')
          .eq('disponivel_por_padrao', true);

        // Buscar dados de contratação
        const { data: contratacao } = await supabase
          .from('contratacoes_clientes')
          .select('plano_selecionado, created_at')
          .eq('user_id', user.id)
          .single();

        // Buscar próximo pagamento
        const { data: proximoPagamento } = await supabase
          .from('pagamentos')
          .select('valor, data_vencimento')
          .eq('user_id', user.id)
          .eq('status', 'pendente')
          .order('data_vencimento', { ascending: true })
          .limit(1)
          .single();

        const totalCorrespondencias = correspondencias?.length || 0;
        const correspondenciasNaoLidas = correspondencias?.filter(c => !c.visualizada).length || 0;
        const totalDocumentos = documentos?.length || 0;

        let proximoVencimento = null;
        if (proximoPagamento) {
          const dataVencimento = new Date(proximoPagamento.data_vencimento);
          const hoje = new Date();
          const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          proximoVencimento = {
            diasRestantes,
            valor: Number(proximoPagamento.valor)
          };
        }

        const dataContratacao = contratacao?.created_at 
          ? new Date(contratacao.created_at).toLocaleDateString('pt-BR')
          : 'N/A';

        const contaAtivaDias = contratacao?.created_at
          ? Math.floor((new Date().getTime() - new Date(contratacao.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const planoCorreto = contratacao?.plano_selecionado || 'Plano Básico';

        setStats({
          totalCorrespondencias,
          correspondenciasNaoLidas,
          totalDocumentos,
          proximoVencimento,
          contaAtivaDias,
          dataContratacao,
          planoCorreto
        });

      } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [user?.id]);

  return { stats, loading, error };
};
