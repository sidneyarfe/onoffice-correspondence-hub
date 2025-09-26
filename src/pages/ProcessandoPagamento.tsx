
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContratacaoStatus } from '@/hooks/useContratacaoStatus';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

export default function ProcessandoPagamento() {
  const [searchParams] = useSearchParams();
  const contratacaoId = searchParams.get('id');
  const navigate = useNavigate();

  // Hook para buscar o link de pagamento
  useContratacaoStatus(contratacaoId, (link) => {
    // Se o link for encontrado, redireciona para o pagamento
    window.location.href = link;
  });

  // Efeito para o timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      // Após 15 segundos, redireciona para a nova página
      navigate('/verificar-email-pagamento');
    }, 15000); // 15 segundos

    // Limpa o timer se o componente for desmontado (ou seja, se o link for encontrado antes)
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 space-y-6">
      <Logo size="md" />
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Processando Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="text-gray-600">
              Estamos gerando seu link de pagamento seguro. Isso pode levar alguns segundos...
            </p>
            <p className="text-sm text-gray-500">
              Por favor, não feche ou atualize esta página.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
