
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
    dataVencimento: string;
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

        // Buscar dados de contratação com plano relacionado
        const { data: contratacao } = await supabase
          .from('contratacoes_clientes')
          .select(`
            plano_selecionado, 
            created_at,
            plano_id,
            planos!inner(
              preco_em_centavos,
              nome_plano,
              periodicidade
            )
          `)
          .eq('user_id', user.id)
          .single();

        console.log('Dados de contratação:', contratacao);

        // Calcular próximo vencimento baseado na contratação
        let proximoVencimento = null;
        if (contratacao?.created_at && contratacao?.plano_selecionado) {
          const dataContratacao = new Date(contratacao.created_at);
          let dataVencimento = new Date(dataContratacao);
          
          // Calcular data de vencimento baseado no plano
          const plano = contratacao.plano_selecionado.toUpperCase();
          if (plano.includes('1 ANO') || plano.includes('ANUAL')) {
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
          } else if (plano.includes('6 MESES') || plano.includes('SEMESTRAL')) {
            dataVencimento.setMonth(dataVencimento.getMonth() + 6);
          } else if (plano.includes('1 MES') || plano.includes('MENSAL')) {
            dataVencimento.setMonth(dataVencimento.getMonth() + 1);
          } else {
            // Default para 1 ano se não conseguir identificar
            dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
          }

          const hoje = new Date();
          const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          // Usar valor do plano da tabela planos (convertendo de centavos para reais)
          let valor = 0;
          if (contratacao.planos?.preco_em_centavos) {
            valor = contratacao.planos.preco_em_centavos / 100;
          } else {
            // Fallback para valores aproximados se não houver plano linkado
            if (plano.includes('1 ANO') || plano.includes('ANUAL')) {
              valor = 1200;
            } else if (plano.includes('6 MESES') || plano.includes('SEMESTRAL')) {
              valor = 660;
            } else if (plano.includes('1 MES') || plano.includes('MENSAL')) {
              valor = 120;
            }
          }

          proximoVencimento = {
            diasRestantes,
            valor,
            dataVencimento: dataVencimento.toLocaleDateString('pt-BR')
          };

          console.log('Próximo vencimento calculado:', proximoVencimento);
        }

        const totalCorrespondencias = correspondencias?.length || 0;
        const correspondenciasNaoLidas = correspondencias?.filter(c => !c.visualizada).length || 0;
        const totalDocumentos = documentos?.length || 0;

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
