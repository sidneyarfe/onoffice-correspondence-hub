
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

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

    // TODO: Implementar lógica de polling aqui.
    // 1. Criar uma Edge Function no Supabase (ex: 'getStatusContratacao') que recebe 'contratacaoId'.
    // 2. A função busca no DB e retorna o 'signing_url' quando disponível.
    // 3. Chamar essa função a cada 3 segundos com setInterval.
    // 4. Se a URL for encontrada, limpar o intervalo e redirecionar:
    //    window.location.href = signing_url;
    console.log('Iniciando polling para a contratação ID:', contratacaoId);

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
