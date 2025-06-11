
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useContratacaoStatus } from '@/hooks/useContratacaoStatus';

const AguardandoAssinatura = () => {
  const [status, setStatus] = useState('Preparando seu contrato...');
  const location = useLocation();
  const navigate = useNavigate();
  const contratacaoId = location.state?.contratacao_id;

  const { status: contratacaoStatus, error } = useContratacaoStatus(contratacaoId);

  useEffect(() => {
    if (!contratacaoId) {
      setStatus('ID de contratação não encontrado. Redirecionando...');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    console.log('Iniciando polling para a contratação ID:', contratacaoId);
  }, [contratacaoId, navigate]);

  useEffect(() => {
    if (error) {
      console.error('Erro no polling:', error);
      setStatus('Erro ao verificar status do contrato. Tentando novamente...');
      return;
    }

    if (contratacaoStatus?.signing_url) {
      console.log('URL de assinatura encontrada:', contratacaoStatus.signing_url);
      setStatus('Contrato pronto! Redirecionando para assinatura...');
      
      // Aguardar um momento antes de redirecionar
      setTimeout(() => {
        window.location.href = contratacaoStatus.signing_url;
      }, 1500);
    } else if (contratacaoStatus) {
      setStatus('Contrato sendo preparado...');
    }
  }, [contratacaoStatus, error]);

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
