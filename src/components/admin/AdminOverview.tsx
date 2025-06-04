import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Mail, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText } from 'lucide-react';

const AdminOverview = () => {
  const stats = [
    {
      title: 'Clientes Ativos',
      value: '324',
      change: '+12 este mês',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Correspondências Hoje',
      value: '47',
      change: '+8 desde ontem',
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Receita Mensal',
      value: 'R$ 32.076',
      change: '+5.2% vs. mês anterior',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Taxa de Adimplência',
      value: '96.8%',
      change: '+1.2% vs. mês anterior',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const alerts = [
    {
      type: 'urgent',
      title: '3 clientes com pagamento vencido',
      description: 'Requer ação imediata',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      type: 'warning',
      title: '15 correspondências pendentes de envio',
      description: 'Aguardando processamento',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      type: 'success',
      title: 'Backup realizado com sucesso',
      description: 'Hoje às 03:00',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const recentActivities = [
    {
      action: 'Nova correspondência processada',
      client: 'Empresa ABC LTDA',
      time: '5 min atrás',
      type: 'correspondence',
    },
    {
      action: 'Cliente adicionado',
      client: 'Inovação Tech LTDA',
      time: '23 min atrás',
      type: 'client',
    },
    {
      action: 'Pagamento confirmado',
      client: 'Consultoria XYZ',
      time: '1h atrás',
      type: 'payment',
    },
    {
      action: 'Correspondência visualizada',
      client: 'Serviços Gerais LTDA',
      time: '2h atrás',
      type: 'view',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'correspondence':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'client':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard Administrativo</h1>
        <p className="text-gray-600">Visão geral do sistema ON Office</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-on-dark">{stat.value}</p>
                  <p className="text-xs text-green-600">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Alertas do Sistema</CardTitle>
          <CardDescription>Itens que requerem sua atenção</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-center gap-4 p-4 rounded-lg ${alert.bgColor}`}>
                <alert.icon className={`w-6 h-6 ${alert.color}`} />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-600">{alert.description}</p>
                </div>
                <Button variant="outline" size="sm">
                  Ver detalhes
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities and Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-on-dark">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.client}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as funções principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-20 flex flex-col gap-2 on-button">
                <Users className="w-6 h-6" />
                <span>Adicionar Cliente</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2 bg-gray-800 hover:bg-gray-700 text-white">
                <Mail className="w-6 h-6" />
                <span>Nova Correspondência</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <CreditCard className="w-6 h-6" />
                <span>Gerar Cobrança</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                <FileText className="w-6 h-6" />
                <span>Relatório</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
