
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useContratacaoStatus } from '@/hooks/useContratacaoStatus';

const ProcessandoPagamento = () => {
  const [status, setStatus] = useState('Contrato assinado! Preparando seu link de pagamento...');
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

    console.log('Cliente retornou do ZapSign. Iniciando polling para o link de pagamento. ID:', contratacaoId);
  }, [contratacaoId, navigate]);

  useEffect(() => {
    if (error) {
      console.error('Erro no polling:', error);
      setStatus('Erro ao verificar status do pagamento. Tentando novamente...');
      return;
    }

    if (contratacaoStatus?.payment_link) {
      console.log('Link de pagamento encontrado:', contratacaoStatus.payment_link);
      setStatus('Link de pagamento pronto! Redirecionando...');
      
      // Aguardar um momento antes de redirecionar
      setTimeout(() => {
        window.location.href = contratacaoStatus.payment_link;
      }, 1500);
    } else if (contratacaoStatus) {
      setStatus('Preparando link de pagamento...');
    }
  }, [contratacaoStatus, error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <Logo size="lg" />
      <div className="animate-spin h-8 w-8 border-4 border-on-lime border-t-transparent rounded-full"></div>
      <p className="text-xl text-gray-700">{status}</p>
      <p className="text-sm text-gray-500">Aguarde um instante...</p>
    </div>
  );
};

export default ProcessandoPagamento;
