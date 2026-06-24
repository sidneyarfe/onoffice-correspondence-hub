import { MailWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

export default function VerificarEmailPagamento() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white/10 p-4 space-y-6">
      <Logo size="md" variant="light" />
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Obrigado por aguardar!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MailWarning className="mx-auto h-12 w-12 text-yellow-500" />
            <p className="text-muted-foreground">
              O processo de geração do link está levando um pouco mais de tempo que o esperado.
            </p>
            <p className="font-semibold text-foreground">
              Não se preocupe, nós já enviamos o link de pagamento diretamente para o seu e-mail.
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, verifique sua caixa de entrada (e também a pasta de spam) para continuar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}