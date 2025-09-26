
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useContratacaoStatus } from '@/hooks/useContratacaoStatus';
import { Loader2, MailOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProcessandoPagamento = () => {
  const navigate = useNavigate();
  const [contratacaoId, setContratacaoId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Lê o ID da memória do navegador
    const id = localStorage.getItem('onofficeContratacaoId');
    
    if (!id) {
      navigate('/');
      return;
    }

    console.log('ID da contratação obtido do localStorage:', id);
    
    // Remove o ID do storage por segurança
    localStorage.removeItem('onofficeContratacaoId');
    
    setContratacaoId(id);
  }, [navigate]);

  const { status, loading, error } = useContratacaoStatus(
    contratacaoId,
    (link) => {
      // Quando o link estiver pronto, redireciona o usuário
      console.log('Link de pagamento encontrado:', link);
      setTimeout(() => {
        window.location.href = link;
      }, 1500);
    },
    () => {
      // Função de callback chamada após 15 segundos
      setTimedOut(true);
    }
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4">
            <Logo size="md" />
          </div>
          <CardTitle className="text-2xl">
            {timedOut ? 'Obrigado por aguardar!' : 'Processando Pagamento'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timedOut ? (
            <div className="space-y-4">
              <MailOpen className="mx-auto h-12 w-12 text-primary" />
              <p className="text-muted-foreground">
                O processo está levando um pouco mais de tempo que o esperado.
              </p>
              <p className="font-semibold text-foreground">
                Não se preocupe, nós também enviamos o link de pagamento diretamente para o seu e-mail.
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, verifique sua caixa de entrada (e a pasta de spam).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Estamos gerando seu link de pagamento seguro. Isso pode levar alguns segundos...
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, não feche ou atualize esta página.
              </p>
              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessandoPagamento;
