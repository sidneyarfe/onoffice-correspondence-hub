
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

const ClientFinancial = () => {
  const currentPlan = {
    name: 'Plano Anual',
    value: 99,
    period: 'mensal',
    nextDue: '2024-07-01',
    status: 'ativo',
    contractDate: '2023-06-01',
  };

  const paymentHistory = [
    {
      id: 1,
      date: '2024-06-01',
      description: 'Plano Anual - Junho/2024',
      amount: 99.00,
      status: 'paid',
      invoice: 'FAT-2024-06-001',
    },
    {
      id: 2,
      date: '2024-05-01',
      description: 'Plano Anual - Maio/2024',
      amount: 99.00,
      status: 'paid',
      invoice: 'FAT-2024-05-001',
    },
    {
      id: 3,
      date: '2024-04-01',
      description: 'Plano Anual - Abril/2024',
      amount: 99.00,
      status: 'paid',
      invoice: 'FAT-2024-04-001',
    },
    {
      id: 4,
      date: '2024-03-01',
      description: 'Plano Anual - Março/2024',
      amount: 99.00,
      status: 'paid',
      invoice: 'FAT-2024-03-001',
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
    if (status === 'overdue') {
      return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
  };

  const handleDownloadInvoice = (invoice: string) => {
    console.log(`Baixando fatura: ${invoice}`);
    // Em produção, faria o download da fatura
  };

  const getDaysUntilDue = () => {
    const today = new Date();
    const dueDate = new Date(currentPlan.nextDue);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Área Financeira</h1>
        <p className="text-gray-600">
          Gerencie seus pagamentos e visualize o histórico de faturas
        </p>
      </div>

      {/* Current Plan */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-on-lime" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-on-dark mb-2">{currentPlan.name}</h3>
              <p className="text-3xl font-bold text-on-lime">
                R$ {currentPlan.value}
                <span className="text-lg text-gray-600">/{currentPlan.period}</span>
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cliente desde:</span>
                  <span className="font-medium">{currentPlan.contractDate}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${daysUntilDue <= 7 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {daysUntilDue <= 7 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <h4 className="font-semibold">Próximo Vencimento</h4>
                </div>
                <p className="text-lg font-bold">{currentPlan.nextDue}</p>
                <p className="text-sm text-gray-600">
                  {daysUntilDue > 0 ? `${daysUntilDue} dias restantes` : 'Vencido'}
                </p>
              </div>
              
              <Button className="w-full on-button">
                <CreditCard className="w-4 h-4 mr-2" />
                Atualizar Forma de Pagamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="on-card">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-on-lime">R$ 1.188</div>
            <div className="text-sm text-gray-600">Total Pago Este Ano</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600">Faturas Pagas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Faturas em Atraso</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            Visualize e baixe suas faturas dos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-on-dark">{payment.description}</h4>
                    <p className="text-sm text-gray-600">{payment.date}</p>
                    <p className="text-sm text-gray-500">Fatura: {payment.invoice}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">R$ {payment.amount.toFixed(2)}</div>
                    {getStatusBadge(payment.status)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadInvoice(payment.invoice)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Precisa de Ajuda?</h3>
              <p className="text-blue-800 text-sm mb-3">
                Nossa equipe está pronta para ajudar com questões financeiras ou dúvidas sobre seu plano.
              </p>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                Entrar em Contato
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientFinancial;
