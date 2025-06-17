
import React from 'react';
import Logo from '@/components/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

// !!! Link de assinatura PERMANENTE para o plano mensal !!!
const LINK_ASSINATURA_MENSAL = 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c9380849764e81a019769cafeab01f1';

const InstrucoesPagamento = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl text-center on-card">
        <CardHeader>
          <div className="mx-auto w-fit mb-4">
             <Logo size="md" />
          </div>
          <CardTitle className="text-2xl">Instruções Importantes</CardTitle>
          <CardDescription>Plano Mensal - Próximos Passos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-left bg-gray-50 p-4 rounded-lg border">
            <p className="text-gray-700 mb-2">
              Seu contrato foi assinado com sucesso! Para finalizar, siga as instruções de pagamento:
            </p>
            <ul className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>Assinatura Mensal:</strong> Ao clicar no botão abaixo, você será redirecionado para o Mercado Pago para autorizar a assinatura recorrente de R$ 129,00, onde poderá cadastrar seu cartão de crédito.
              </li>
              <li>
                <strong>Taxa de Adesão:</strong> A cobrança da taxa de adesão de R$ 250,00 será enviada separadamente para o seu e-mail para pagamento após a ativação da sua conta.
              </li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              <strong>Importante:</strong> Ao prosseguir para o checkout, por favor, utilize os mesmos dados (Nome, CPF e E-mail) informados no contrato.
            </p>
          </div>
          
          <a href={LINK_ASSINATURA_MENSAL} target="_blank" rel="noopener noreferrer">
            <Button className="w-full on-button text-lg h-12">
              Prosseguir para Ativar Assinatura <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstrucoesPagamento;
