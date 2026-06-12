
import React from 'react';
import Logo from '@/components/Logo';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PagamentoSucesso = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-white/[0.04] p-4">
      <Logo size="md" variant="light" />
      <CheckCircle className="w-16 h-16 text-on-lime my-6" />
      <h1 className="text-2xl font-bold text-foreground">Pagamento Aprovado!</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        Sua contratação foi finalizada com sucesso. Bem-vindo(a) à ON Office!
      </p>
      <p className="text-muted-foreground mt-4 max-w-md">
        Enviamos suas credenciais de acesso para o seu e-mail. Em breve, você poderá acessar seu painel.
      </p>
      <Link to="/">
        <Button className="mt-8">Ir para o site</Button>
      </Link>
    </div>
  );
};

export default PagamentoSucesso;
