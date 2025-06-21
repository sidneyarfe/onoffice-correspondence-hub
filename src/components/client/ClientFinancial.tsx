
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Contratacao {
  id: string;
  plano_selecionado: string;
  created_at: string;
  status_contratacao: string;
}

interface Pagamento {
  id: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  descricao: string;
  numero_fatura: string | null;
}

const ClientFinancial = () => {
  const { user } = useAuth();
  const [contratacao, setContratacao] = useState<Contratacao | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user?.id) return;

      try {
        // Buscar dados da contratação
        const { data: contrat } = await supabase
          .from('contratacoes_clientes')
          .select('id, plano_selecionado, created_at, status_contratacao')
          .eq('user_id', user.id)
          .single();

        // Buscar histórico de pagamentos
        const { data: pays } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('user_id', user.id)
          .order('data_vencimento', { ascending: false });

        setContratacao(contrat);
        setPagamentos(pays || []);

        // Registrar atividade
        await supabase.rpc('registrar_atividade', {
          p_user_id: user.id,
          p_acao: 'financeiro_acesso',
          p_descricao: 'Usuário acessou a área financeira'
        });
      } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  if (!contratacao) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-red-600">Erro ao carregar dados da contratação</p>
        </div>
      </div>
    );
  }

  const formatPlanName = (plano: string) => {
    switch (plano) {
      case '1 ANO':
        return 'Plano Anual';
      case '6 MESES':
        return 'Plano Semestral';
      case '1 MES':
        return 'Plano Mensal';
      default:
        return plano;
    }
  };

  const getPlanValue = (plano: string) => {
    switch (plano) {
      case '1 ANO':
        return { monthly: 99, total: 1188 };
      case '6 MESES':
        return { monthly: 109, total: 654 };
      case '1 MES':
        return { monthly: 129, total: 129 };
      default:
        return { monthly: 99, total: 1188 };
    }
  };

  const calcularProximoVencimento = () => {
    const dataContratacao = new Date(contratacao.created_at);
    const proximoVencimento = new Date(dataContratacao);
    
    switch (contratacao.plano_selecionado) {
      case '1 ANO':
        proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
        break;
      case '6 MESES':
        proximoVencimento.setMonth(proximoVencimento.getMonth() + 6);
        break;
      case '1 MES':
        proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
        break;
      default:
        proximoVencimento.setFullYear(proximoVencimento.getFullYear() + 1);
    }
    
    return proximoVencimento;
  };

  const getDaysUntilDue = () => {
    const today = new Date();
    const dueDate = calcularProximoVencimento();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const planValue = getPlanValue(contratacao.plano_selecionado);
  const daysUntilDue = getDaysUntilDue();
  const proximoVencimento = calcularProximoVencimento();
  const isNewAccount = pagamentos.length === 0;
  const totalPago = pagamentos.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.valor, 0);
  const faturasPagas = pagamentos.filter(p => p.status === 'paid').length;
  const faturasEmAtraso = pagamentos.filter(p => p.status === 'overdue').length;

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

  const handleDownloadInvoice = async (fatura: Pagamento) => {
    if (!user?.id) return;

    await supabase.rpc('registrar_atividade', {
      p_user_id: user.id,
      p_acao: 'fatura_download',
      p_descricao: `Download da fatura: ${fatura.numero_fatura || fatura.id}`
    });

    console.log(`Baixando fatura: ${fatura.numero_fatura || fatura.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Área Financeira</h1>
        <p className="text-gray-600">
          {isNewAccount 
            ? 'Gerencie seu plano e acompanhe o próximo vencimento'
            : 'Gerencie seus pagamentos e visualize o histórico de faturas'
          }
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
              <h3 className="text-xl font-semibold text-on-dark mb-2">
                {formatPlanName(contratacao.plano_selecionado)}
              </h3>
              <p className="text-3xl font-bold text-on-lime">
                R$ {planValue.monthly}
                <span className="text-lg text-gray-600">/mês</span>
              </p>
              {contratacao.plano_selecionado === '1 ANO' && (
                <p className="text-sm text-gray-600 mt-1">
                  Total anual: R$ {planValue.total.toFixed(2)}
                </p>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cliente desde:</span>
                  <span className="font-medium">
                    {new Date(contratacao.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                isNewAccount 
                  ? 'bg-blue-50 border border-blue-200'
                  : daysUntilDue <= 30 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isNewAccount ? (
                    <Clock className="w-5 h-5 text-blue-600" />
                  ) : daysUntilDue <= 30 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <h4 className="font-semibold">
                    {isNewAccount ? 'Primeiro Vencimento' : 'Próximo Vencimento'}
                  </h4>
                </div>
                <p className="text-lg font-bold">
                  {proximoVencimento.toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm text-gray-600">
                  {isNewAccount 
                    ? `Conta nova - ${daysUntilDue} dias restantes`
                    : daysUntilDue > 0 
                      ? `${daysUntilDue} dias restantes` 
                      : 'Vencido'
                  }
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
            <div className="text-3xl font-bold text-on-lime">
              R$ {totalPago.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {isNewAccount ? 'Valor do Plano' : 'Total Pago'}
            </div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{faturasPagas}</div>
            <div className="text-sm text-gray-600">Faturas Pagas</div>
          </CardContent>
        </Card>
        <Card className="on-card">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{faturasEmAtraso}</div>
            <div className="text-sm text-gray-600">Faturas em Atraso</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            {isNewAccount 
              ? 'Seu histórico de pagamentos aparecerá aqui após o primeiro vencimento.'
              : 'Visualize e baixe suas faturas dos últimos meses'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isNewAccount ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Conta Nova
              </h3>
              <p className="text-gray-600">
                Você ainda não possui histórico de pagamentos. 
                Suas faturas aparecerão aqui após os vencimentos.
              </p>
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum pagamento encontrado
              </h3>
              <p className="text-gray-600">
                Seu histórico de pagamentos aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagamentos.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-on-dark">{payment.descricao}</h4>
                      <p className="text-sm text-gray-600">
                        Vencimento: {new Date(payment.data_vencimento).toLocaleDateString('pt-BR')}
                      </p>
                      {payment.data_pagamento && (
                        <p className="text-sm text-gray-600">
                          Pago em: {new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {payment.numero_fatura && (
                        <p className="text-sm text-gray-500">Fatura: {payment.numero_fatura}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">R$ {payment.valor.toFixed(2)}</div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
