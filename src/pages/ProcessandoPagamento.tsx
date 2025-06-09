
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';

const ProcessandoPagamento = () => {
  const [status, setStatus] = useState('Contrato assinado! Preparando seu link de pagamento...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Implementar lógica de polling semelhante à de AguardandoAssinatura.
    // A diferença é que esta página buscará pela 'asaas_payment_link'.
    // Ao encontrar, redirecionará para a URL de pagamento do Asaas.
    console.log('Cliente retornou do ZapSign. Iniciando polling para o link de pagamento.');

  }, [navigate]);

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
