
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CreditCard, Calendar, Download, ArrowUp, ArrowDown, FileText } from 'lucide-react';

const AdminFinancial = () => {
  const [periodFilter, setPeriodFilter] = useState('month');

  const financialStats = [
    {
      title: 'Receita Total',
      value: 'R$ 32.076',
      change: '+15% vs. mês anterior',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: 'up',
    },
    {
      title: 'Pagamentos Recebidos',
      value: '287',
      change: '+24 vs. mês anterior',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: 'up',
    },
    {
      title: 'Inadimplência',
      value: 'R$ 2.350',
      change: '-5% vs. mês anterior',
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: 'down',
    },
    {
      title: 'Ticket Médio',
      value: 'R$ 111,70',
      change: '+2.5% vs. mês anterior',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'up',
    },
  ];

  const recentTransactions = [
    {
      id: 1,
      client: 'Empresa Silva LTDA',
      description: 'Plano Anual - Junho/2024',
      date: '01/06/2024',
      amount: 99.00,
      status: 'paid',
    },
    {
      id: 2,
      client: 'Inovação Tech LTDA',
      description: 'Plano Mensal - Junho/2024',
      date: '31/05/2024',
      amount: 129.00,
      status: 'paid',
    },
    {
      id: 3,
      client: 'Consultoria XYZ',
      description: 'Plano 2 Anos - Abril/2024',
      date: '30/05/2024',
      amount: 69.00,
      status: 'overdue',
    },
    {
      id: 4,
      client: 'Serviços Gerais LTDA',
      description: 'Plano Anual - Taxa de Adesão',
      date: '28/05/2024',
      amount: 250.00,
      status: 'paid',
    },
    {
      id: 5,
      client: 'Nova Empresa LTDA',
      description: 'Plano Anual - Maio/2024',
      date: '15/05/2024',
      amount: 99.00,
      status: 'paid',
    },
  ];

  const overdueClients = [
    {
      id: 1,
      name: 'Consultoria XYZ',
      email: 'contato@consultoriaxyz.com',
      plan: 'Plano 2 Anos',
      daysOverdue: 22,
      amount: 69.00,
    },
    {
      id: 2,
      name: 'Importadora ABC',
      email: 'financeiro@importadoraabc.com',
      plan: 'Plano Anual',
      daysOverdue: 15,
      amount: 99.00,
    },
    {
      id: 3,
      name: 'Transportadora Rápida',
      email: 'admin@transportadora.com',
      plan: 'Plano Mensal',
      daysOverdue: 8,
      amount: 129.00,
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      overdue: { label: 'Vencido', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.paid;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <ArrowUp className="w-3 h-3 text-green-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-red-600" />
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Financeiro</h1>
          <p className="text-gray-600">
            Visão geral da saúde financeira do sistema
          </p>
        </div>
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
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-on-dark">{stat.value}</p>
                  <p className="text-xs flex items-center gap-1">
                    {getTrendIcon(stat.trend)}
                    <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
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
          <CardDescription>Últimos pagamentos processados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.client}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Accounts */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Clientes Inadimplentes
          </CardTitle>
          <CardDescription>Contas com pagamentos atrasados</CardDescription>
        </CardHeader>
        <CardContent>
          {overdueClients.length > 0 ? (
            <div className="space-y-4">
              {overdueClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    <p className="text-sm text-gray-600">Plano: {client.plan}</p>
                    <Badge className="mt-1 bg-red-100 text-red-800">
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
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">Nenhum cliente inadimplente no momento.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Relatórios Financeiros</CardTitle>
          <CardDescription>Exporte relatórios detalhados do sistema</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold">Receitas Mensais</div>
              <div className="text-xs text-gray-500">Extrato detalhado</div>
            </div>
          </Button>
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-red-600" />
            <div className="text-left">
              <div className="font-semibold">Inadimplência</div>
              <div className="text-xs text-gray-500">Contas em atraso</div>
            </div>
          </Button>
          <Button variant="outline" className="h-14 justify-start flex items-center gap-3">
            <FileText className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-semibold">Projeção Anual</div>
              <div className="text-xs text-gray-500">Receitas esperadas</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancial;
