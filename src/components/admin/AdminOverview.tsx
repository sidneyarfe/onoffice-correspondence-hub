
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminData } from '@/hooks/useAdminData';
import { TrendingUp, Users, Mail, DollarSign, Activity, Clock } from 'lucide-react';

const AdminOverview = () => {
  const { stats, activities, loading, error } = useAdminData();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'correspondence':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'client':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const config = {
      correspondence: { className: 'bg-blue-50 text-blue-800', label: 'Correspondência' },
      payment: { className: 'bg-green-50 text-green-800', label: 'Pagamento' },
      client: { className: 'bg-purple-50 text-purple-800', label: 'Cliente' },
      view: { className: 'bg-gray-50 text-gray-800', label: 'Visualização' }
    };
    
    const typeConfig = config[type as keyof typeof config] || config.view;
    return <Badge className={typeConfig.className}>{typeConfig.label}</Badge>;
  };

  const formatActivityTitle = (action: string) => {
    // Remover IDs e deixar apenas o título da ação
    return action
      .replace(/: [a-f0-9-]{36}/g, '') // Remove UUIDs
      .replace(/Correspondência visualizada.*/, 'Correspondência visualizada')
      .replace(/Cliente acessou.*/, 'Acesso ao sistema')
      .replace(/Dashboard visualizado.*/, 'Dashboard acessado')
      .replace(/Perfil atualizado.*/, 'Perfil atualizado')
      .replace(/Documento visualizado.*/, 'Documento acessado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard Administrativo</h1>
        <p className="text-gray-600">
          Visão geral do sistema e estatísticas principais
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="on-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-on-lime">{stats?.totalClientes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.clientesAtivos || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correspondências Hoje</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.correspondenciasHoje || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recebidas hoje
            </p>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats?.receitaMensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita estimada
            </p>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Atividade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.taxaAdimplencia?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="on-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-on-lime" />
                Atividades Recentes
              </CardTitle>
              <CardDescription>
                Últimas ações realizadas no sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma atividade recente encontrada</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 p-2 rounded-full bg-gray-100">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-on-dark mb-1">
                          {formatActivityTitle(activity.action)}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Cliente: {activity.client}
                        </p>
                        <div className="flex items-center gap-2">
                          {getActivityBadge(activity.type)}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
