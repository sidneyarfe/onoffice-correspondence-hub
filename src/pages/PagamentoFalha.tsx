
import React from 'react';
import Logo from '@/components/Logo';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PagamentoFalha = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-white/[0.04] p-4">
      <Logo size="md" variant="light" />
      <XCircle className="w-16 h-16 text-red-500 my-6" />
      <h1 className="text-2xl font-bold text-foreground">Ocorreu um erro no pagamento</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        Não foi possível processar seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.
      </p>
      <Link to="/planos">
        <Button variant="outline" className="mt-8">Tentar Novamente</Button>
      </Link>
    </div>
  );
};

export default PagamentoFalha;
