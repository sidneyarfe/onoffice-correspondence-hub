
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

const ProcessandoPagamento = () => {
  const [status, setStatus] = useState('Contrato assinado! Processando seu pagamento...');
  const navigate = useNavigate();

  useEffect(() => {
    // Lê o ID da memória do navegador
    const contratacaoId = localStorage.getItem('onofficeContratacaoId');

    if (!contratacaoId) {
      setStatus('Sessão não encontrada. Verifique o link de pagamento no seu e-mail ou entre em contato.');
      return;
    }

    console.log('ID da contratação obtido do localStorage:', contratacaoId);

    // Remove o ID do storage por segurança
    localStorage.removeItem('onofficeContratacaoId');

    const intervalId = setInterval(async () => {
      try {
        console.log('Verificando link de pagamento para ID:', contratacaoId);
        
        const { data, error } = await supabase
          .from('contratacoes_clientes')
          .select('pagarme_payment_link')
          .eq('id', contratacaoId)
          .single();

        if (error && error.code !== 'PGRST116') { 
          console.error('Erro na consulta:', error);
          throw error; 
        }

        if (data && (data as any).pagarme_payment_link) {
          console.log('Link de pagamento encontrado:', (data as any).pagarme_payment_link);
          setStatus('Link de pagamento encontrado! Redirecionando...');
          clearInterval(intervalId);
          
          setTimeout(() => {
            window.location.href = (data as any).pagarme_payment_link;
          }, 1500);
        } else {
          setStatus('Preparando link de pagamento...');
        }
      } catch (err) {
        console.error('Erro ao buscar o link de pagamento:', err);
        setStatus('Ocorreu um erro ao buscar seu link de pagamento.');
        clearInterval(intervalId);
      }
    }, 3000);

    return () => clearInterval(intervalId);

  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <Logo size="lg" />
      <div className="animate-spin h-8 w-8 border-4 border-on-lime border-t-transparent rounded-full"></div>
      <p className="text-xl text-gray-700">{status}</p>
      <p className="text-sm text-gray-500">Aguarde um instante, não feche esta página.</p>
    </div>
  );
};

export default ProcessandoPagamento;
