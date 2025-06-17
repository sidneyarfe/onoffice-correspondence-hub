
import React from 'react';
import Logo from '@/components/Logo';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PagamentoFalha = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 p-4">
      <Logo size="lg" />
      <XCircle className="w-16 h-16 text-red-500 my-6" />
      <h1 className="text-2xl font-bold text-gray-800">Ocorreu um erro no pagamento</h1>
      <p className="text-gray-600 mt-2 max-w-md">
        Não foi possível processar seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.
      </p>
      <Link to="/planos">
        <Button variant="outline" className="mt-8">Tentar Novamente</Button>
      </Link>
    </div>
  );
};

export default PagamentoFalha;
