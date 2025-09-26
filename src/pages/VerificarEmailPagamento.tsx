import { MailWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

export default function VerificarEmailPagamento() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 space-y-6">
      <Logo size="md" />
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Obrigado por aguardar!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MailWarning className="mx-auto h-12 w-12 text-yellow-500" />
            <p className="text-gray-600">
              O processo de geração do link está levando um pouco mais de tempo que o esperado.
            </p>
            <p className="font-semibold text-gray-800">
              Não se preocupe, nós já enviamos o link de pagamento diretamente para o seu e-mail.
            </p>
            <p className="text-sm text-gray-500">
              Por favor, verifique sua caixa de entrada (e também a pasta de spam) para continuar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}