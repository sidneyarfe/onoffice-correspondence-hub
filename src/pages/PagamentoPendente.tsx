
import React from 'react';
import Logo from '@/components/Logo';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PagamentoPendente = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 p-4">
      <Logo size="md" />
      <Clock className="w-16 h-16 text-yellow-500 my-6" />
      <h1 className="text-2xl font-bold text-gray-800">Pagamento em Processamento</h1>
      <p className="text-gray-600 mt-2 max-w-md">
        Seu pagamento está sendo processado pelo banco (isso é comum para boletos). Assim que for aprovado, sua conta será ativada.
      </p>
      <p className="text-gray-600 mt-4 max-w-md">
        Você receberá um e-mail de confirmação.
      </p>
      <Link to="/">
        <Button variant="outline" className="mt-8">Voltar para a página inicial</Button>
      </Link>
    </div>
  );
};

export default PagamentoPendente;
