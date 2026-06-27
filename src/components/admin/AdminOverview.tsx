import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAdminDataWithFallback } from '@/hooks/useAdminDataWithFallback';
import { useAdminHealthCheck } from '@/hooks/useAdminHealthCheck';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useCobrancasVencidas } from '@/hooks/useCobrancasVencidas';
import { TempPasswordResync } from '@/components/admin/TempPasswordResync';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FileText, DollarSign, TrendingUp, Activity, AlertTriangle, CheckCircle, RefreshCw, User, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const AdminOverview = () => {
  const {
    stats,
    loading,
    error,
    refetch
  } = useAdminDataWithFallback();
  const { activities: recentActivities, isLoading: activitiesLoading, refetch: refetchActivities } = useRecentActivities();
  const { items: vencidas, totalReais: totalVencido, loading: vencidasLoading, refetch: refetchVencidas } = useCobrancasVencidas();
  const {
    healthStatus,
    checking,
    runHealthCheck
  } = useAdminHealthCheck();
  const {
    user
  } = useAuth();
  const handleRefresh = () => {
    refetch();
    refetchActivities();
    refetchVencidas();
    runHealthCheck();
  };
  const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  if (loading) {
    return <div className="space-y-8">
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
              <span className="text-sm text-muted-foreground">Verificando sistema...</span>
            </div>
          </CardContent>
        </Card>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Card key={i} className="on-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-white/10 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        <Card className="on-card">
          <CardHeader>
            <CardTitle>Carregando dados...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto mb-4"></div>
                <p className="text-muted-foreground">Buscando dados administrativos...</p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Se demorar muito, tente atualizar a página
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema administrativo
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={checking} className="on-button">
          <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Health Status */}
      {healthStatus && <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {healthStatus.isHealthy ? <>
                    <CheckCircle className="w-5 h-5 text-on-lime" />
                    <span className="text-on-lime font-medium">Sistema Saudável</span>
                  </> : <>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-300 font-medium">
                      {healthStatus.issues.length} problema(s) detectado(s)
                    </span>
                  </>}
              </div>
              <span className="text-sm text-muted-foreground">
                Última verificação: {healthStatus.lastCheck.toLocaleTimeString('pt-BR')}
              </span>
            </div>
            
            {!healthStatus.isHealthy && healthStatus.issues.length > 0 && <div className="mt-4 space-y-2">
                {healthStatus.issues.map((issue, index) => <Alert key={index} className="border-amber-400/30 bg-amber-400/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-amber-300">
                      {issue}
                    </AlertDescription>
                  </Alert>)}
                <Button onClick={() => runHealthCheck()} disabled={checking} variant="outline" size="sm" className="mt-2">
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  Verificar Novamente
                </Button>
              </div>}
          </CardContent>
        </Card>}

      {/* Error Alert */}
      {error && <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-300">
            {error}
            <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-2">
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>}

      {/* Admin Tools - Only show if needed */}
      {user?.email === 'onoffice1893@gmail.com' && <TempPasswordResync />}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <p className="mt-1 font-dm text-3xl font-bold tracking-tight text-foreground">{stats?.totalClientes || 0}</p>
              </div>
              <span className="on-tile bg-white/10 text-foreground">
                <Users className="w-5 h-5" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                <p className="mt-1 font-dm text-3xl font-bold tracking-tight text-foreground">{stats?.clientesAtivos || 0}</p>
              </div>
              <span className="on-tile bg-on-lime/15 text-on-lime">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Correspondências Hoje</p>
                <p className="mt-1 font-dm text-3xl font-bold tracking-tight text-foreground">{stats?.correspondenciasHoje || 0}</p>
              </div>
              <span className="on-tile bg-white/10 text-foreground">
                <FileText className="w-5 h-5" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="on-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Mensal</p>
                <p className="mt-1 font-dm text-3xl font-bold tracking-tight text-on-lime">
                  R$ {stats?.receitaMensal?.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                }) || '0,00'}
                </p>
              </div>
              <span className="on-tile bg-on-lime/15 text-on-lime">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cobranças vencidas / a cobrar */}
      <Card className="on-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-300" />
                Cobranças vencidas / a cobrar
              </CardTitle>
              <CardDescription>
                Clientes ativos com vencimento no passado, ordenados por dias em atraso
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total a receber</p>
              <p className="font-dm text-2xl font-bold tracking-tight text-orange-300">{brl(totalVencido)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vencidasLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-300 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Calculando vencidos...</p>
            </div>
          ) : vencidas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-on-lime/60 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma cobrança vencida. Tudo em dia! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vencidas.slice(0, 10).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-md bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]"
                >
                  <span className="on-tile h-9 w-9 bg-orange-400/15 text-orange-300">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.clienteNome}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.diasAtraso >= 30
                        ? 'border-red-500/40 text-red-300'
                        : c.diasAtraso >= 7
                        ? 'border-orange-400/40 text-orange-300'
                        : 'border-amber-400/40 text-amber-300'
                    }
                  >
                    {c.diasAtraso} {c.diasAtraso === 1 ? 'dia' : 'dias'}
                  </Badge>
                  <div className="text-right">
                    <p className="font-dm text-sm font-semibold text-foreground">{brl(c.valorReais)}</p>
                    <p className="text-xs text-muted-foreground">
                      venc. {new Date(c.vencimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
              {vencidas.length > 10 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  + {vencidas.length - 10} cliente(s) vencido(s)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas ações realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando atividades...</p>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-4 rounded-md bg-white/[0.04] p-3 transition-colors duration-200 hover:bg-white/[0.08]">
                  <span className="on-tile h-9 w-9 bg-white/10 text-muted-foreground">
                    <Activity className="w-4 h-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.acao}
                    </p>
                    <p className="text-xs text-muted-foreground mb-1">
                      {activity.descricao}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {activity.user_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {format(new Date(activity.data_atividade), 'dd/MM HH:mm', { locale: ptBR })}
                      </div>
                      {activity.ip_address && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {activity.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.acao.split('_')[0]}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};
export default AdminOverview;