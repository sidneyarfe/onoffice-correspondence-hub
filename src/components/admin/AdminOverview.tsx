
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAdminDataWithFallback } from '@/hooks/useAdminDataWithFallback';
import { useAdminHealthCheck } from '@/hooks/useAdminHealthCheck';
import { TempPasswordResync } from '@/components/admin/TempPasswordResync';
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const AdminOverview = () => {
  const { stats, activities, loading, error, refetch } = useAdminDataWithFallback();
  const { healthStatus, checking, runHealthCheck } = useAdminHealthCheck();

  const handleRefresh = () => {
    refetch();
    runHealthCheck();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Health Status Card */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-lime"></div>
              <span className="text-sm text-gray-600">Verificando sistema...</span>
            </div>
          </CardContent>
        </Card>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="on-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="on-card">
          <CardHeader>
            <CardTitle>Carregando dados...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
                <p className="text-gray-600">Buscando dados administrativos...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Se demorar muito, tente atualizar a página
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Visão geral do sistema administrativo
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={checking} className="on-button">
          <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {healthStatus.isHealthy ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium">Sistema Saudável</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-700 font-medium">
                      {healthStatus.issues.length} problema(s) detectado(s)
                    </span>
                  </>
                )}
              </div>
              <span className="text-sm text-gray-500">
                Última verificação: {healthStatus.lastCheck.toLocaleTimeString('pt-BR')}
              </span>
            </div>
            
            {!healthStatus.isHealthy && healthStatus.issues.length > 0 && (
              <div className="mt-4 space-y-2">
                {healthStatus.issues.map((issue, index) => (
                  <Alert key={index} className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-amber-800">
                      {issue}
                    </AlertDescription>
                  </Alert>
                ))}
                <Button 
                  onClick={() => runHealthCheck()} 
                  disabled={checking}
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  Verificar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
            <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-2">
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Temp Password Resync Tool */}
      <div className="flex justify-center">
        <TempPasswordResync />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold text-on-dark">{stats?.totalClientes || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats?.clientesAtivos || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Correspondências Hoje</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.correspondenciasHoje || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-on-lime">
                  R$ {stats?.receitaMensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas ações realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Activity className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.client} • {activity.time}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma atividade recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
