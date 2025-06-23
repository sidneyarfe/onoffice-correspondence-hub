
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Mail, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';

const AdminOverview = () => {
  const { stats, activities, loading, error } = useAdminData();

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard Administrativo</h1>
          <p className="text-gray-600">Visão geral do sistema ON Office</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard Administrativo</h1>
          <p className="text-gray-600">Visão geral do sistema ON Office</p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Clientes Ativos',
      value: stats?.clientesAtivos?.toString() || '0',
      change: `${stats?.totalClientes || 0} total`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Correspondências Hoje',
      value: stats?.correspondenciasHoje?.toString() || '0',
      change: 'recebidas hoje',
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${stats?.receitaMensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      change: 'estimativa atual',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Taxa de Ativação',
      value: `${stats?.taxaAdimplencia?.toFixed(1) || '0.0'}%`,
      change: 'clientes ativos',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
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
        {statsCards.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-on-dark">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.change}</p>
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
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>Informações importantes sobre a operação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Sistema Operacional</h4>
                <p className="text-sm text-gray-600">Todos os serviços estão funcionando normalmente</p>
              </div>
            </div>
            {stats && stats.clientesAtivos > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50">
                <Users className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{stats.clientesAtivos} clientes ativos</h4>
                  <p className="text-sm text-gray-600">Sistema está processando dados em tempo real</p>
                </div>
              </div>
            )}
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
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-on-dark">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.client}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
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
