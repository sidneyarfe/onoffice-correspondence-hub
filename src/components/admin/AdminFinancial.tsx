
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CreditCard, Calendar, Download, ArrowUp, ArrowDown, FileText, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  client: string;
  description: string;
  date: string;
  amount: number;
  status: string;
  type: 'real' | 'simulated';
}

interface OverdueClient {
  id: string;
  name: string;
  email: string;
  plan: string;
  amount: number;
  daysOverdue: number;
}

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  overdueAmount: number;
  activeClientsCount: number;
  totalClients: number;
  paidTransactions: number;
  averageTicket: number;
}

interface FinancialData {
  success: boolean;
  financialStats: FinancialStats;
  transactions: Transaction[];
  overdueClients: OverdueClient[];
}

const AdminFinancial = () => {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState('month');

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Buscando dados financeiros...');
      
      const { data: responseData, error: functionError } = await supabase.functions.invoke('get-financial-overview', {
        body: { period: periodFilter }
      });
      
      if (functionError) {
        console.error('Erro na função:', functionError);
        throw functionError;
      }
      
      if (!responseData.success) {
        console.error('Erro nos dados:', responseData.error);
        throw new Error(responseData.error);
      }

      console.log('Dados recebidos:', responseData);
      setData(responseData);
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [periodFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Pago', className: 'bg-on-lime/15 text-on-lime' },
      pending: { label: 'Pendente', className: 'bg-amber-400/15 text-amber-300' },
      overdue: { label: 'Vencido', className: 'bg-red-500/15 text-red-300' },
      approved: { label: 'Aprovado', className: 'bg-on-lime/15 text-on-lime' },
      active_imported: { label: 'Ativo (Importado)', className: 'bg-blue-500/15 text-blue-300' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.paid;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <ArrowUp className="w-3 h-3 text-on-lime" />
    ) : (
      <ArrowDown className="w-3 h-3 text-red-400" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financeiro</h1>
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="on-card">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financeiro</h1>
          <p className="text-red-400">Erro ao carregar dados: {error}</p>
        </div>
        <Button onClick={fetchFinancialData} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const financialStats = [
    {
      title: 'Receita Total',
      value: `R$ ${data?.financialStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      change: '+15% vs. mês anterior',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: 'up',
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${data?.financialStats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      change: '+12% vs. mês anterior',
      icon: CreditCard,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      trend: 'up',
    },
    {
      title: 'Clientes Ativos',
      value: data?.financialStats.activeClientsCount.toString() || '0',
      change: `${data?.financialStats.totalClients || 0} total`,
      icon: Users,
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/10',
      trend: 'up',
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${data?.financialStats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      change: '+2.5% vs. mês anterior',
      icon: FileText,
      color: 'text-orange-300',
      bgColor: 'bg-orange-400/10',
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral consolidada da saúde financeira do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <div className="w-full md:w-64">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Este Trimestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
                <SelectItem value="all">Todo o Período</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={fetchFinancialData} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs flex items-center gap-1">
                    {getTrendIcon(stat.trend)}
                    <span className={stat.trend === 'up' ? 'text-on-lime' : 'text-red-400'}>
                      {stat.change}
                    </span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>
            Pagamentos reais do Mercado Pago e mensalidades calculadas de clientes importados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-white/10">
                {data?.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/[0.06]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{transaction.client}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      R$ {transaction.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Badge variant={transaction.type === 'real' ? 'default' : 'secondary'}>
                        {transaction.type === 'real' ? 'MP' : 'Calc'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Accounts */}
      {data?.overdueClients && data.overdueClients.length > 0 && (
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Clientes Inadimplentes
            </CardTitle>
            <CardDescription>Contas com pagamentos atrasados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.overdueClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                    <p className="text-sm text-muted-foreground">Plano: {client.plan}</p>
                    <Badge className="mt-1 bg-red-500/15 text-red-300">
                      {client.daysOverdue} dias em atraso
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">R$ {client.amount.toFixed(2)}</div>
                    <Button size="sm" className="mt-2 bg-red-500 hover:bg-red-600 text-white">
                      Notificar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Relatórios Financeiros</CardTitle>
          <CardDescription>Exporte relatórios detalhados do sistema</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <div className="font-semibold">Receitas Mensais</div>
              <div className="text-xs text-muted-foreground">Extrato detalhado</div>
            </div>
          </Button>
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-red-400" />
            <div className="text-left">
              <div className="font-semibold">Inadimplência</div>
              <div className="text-xs text-muted-foreground">Contas em atraso</div>
            </div>
          </Button>
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-on-lime" />
            <div className="text-left">
              <div className="font-semibold">Projeção Anual</div>
              <div className="text-xs text-muted-foreground">Receitas esperadas</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancial;
