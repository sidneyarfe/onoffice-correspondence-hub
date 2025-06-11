
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';

const AguardandoAssinatura = () => {
  const [status, setStatus] = useState('Preparando seu contrato...');
  const location = useLocation();
  const navigate = useNavigate();
  const contratacaoId = location.state?.contratacao_id;

  useEffect(() => {
    if (!contratacaoId) {
      setStatus('ID de contratação não encontrado. Redirecionando...');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    console.log('Iniciando polling para a contratação ID:', contratacaoId);

    // Lógica de Polling a cada 3 segundos
    const intervalId = setInterval(async () => {
      console.log(`Verificando link para a contratação ID: ${contratacaoId}`);
      
      try {
        const { data: signing_url, error } = await supabase.rpc('get_signing_url', {
          p_contratacao_id: contratacaoId
        });

        if (error) {
          console.error('Erro ao buscar signing_url:', error);
          setStatus('Ocorreu um erro ao buscar seu contrato. Tentando novamente...');
          return;
        }

        // Se a URL for encontrada, redireciona o usuário
        if (signing_url) {
          console.log(`Link encontrado: ${signing_url}. Redirecionando...`);
          setStatus('Contrato pronto! Redirecionando para assinatura...');
          clearInterval(intervalId);
          
          // Aguardar um momento antes de redirecionar
          setTimeout(() => {
            window.location.href = signing_url;
          }, 1500);
        } else {
          setStatus('Contrato sendo preparado...');
        }

      } catch (err) {
        console.error('Erro na chamada RPC:', err);
        setStatus('Erro de comunicação. Tentando novamente...');
      }

    }, 3000); // Verifica a cada 3 segundos

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);

  }, [contratacaoId, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <Logo size="lg" />
      <div className="animate-spin h-8 w-8 border-4 border-on-lime border-t-transparent rounded-full"></div>
      <p className="text-xl text-gray-700">{status}</p>
      <p className="text-sm text-gray-500">Você será redirecionado automaticamente.</p>
    </div>
  );
};

export default AguardandoAssinatura;
