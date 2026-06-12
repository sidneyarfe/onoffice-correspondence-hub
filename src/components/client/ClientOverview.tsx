import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail,
  FileText,
  CreditCard,
  Clock,
  Download,
  Eye,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClientData } from '@/hooks/useClientData';
import { useCorrespondencias } from '@/hooks/useCorrespondencias';
import { useAtividades } from '@/hooks/useAtividades';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';

const ClientOverview = () => {
  const { user } = useAuth();
  const { stats, loading: statsLoading, error } = useClientData();
  const { correspondencias, loading: corrLoading } = useCorrespondencias();
  const { atividades, loading: atividadesLoading } = useAtividades();

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime"></div>
          <p className="mt-4 text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="py-12 text-center">
          <p className="text-red-600">Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const recentCorrespondences = correspondencias.slice(0, 3);
  const recentActivities = atividades.slice(0, 3);

  // Se for conta nova, mostrar mensagem de boas-vindas
  const isNewAccount = stats.contaAtivaDias <= 7;
  const vencimentoUrgente =
    stats.proximoVencimento && stats.proximoVencimento.diasRestantes <= 30;

  const statsCards = [
    {
      title: 'Correspondências',
      value: stats.totalCorrespondencias.toString(),
      subtitle:
        stats.correspondenciasNaoLidas > 0
          ? `${stats.correspondenciasNaoLidas} não lidas`
          : stats.totalCorrespondencias === 0
            ? 'Nenhuma recebida'
            : 'Todas lidas',
      icon: Mail,
      tile: 'bg-on-lime/20 text-on-dark',
    },
    {
      title: 'Documentos',
      value: stats.totalDocumentos.toString(),
      subtitle: stats.totalDocumentos === 0 ? 'Em preparação' : 'Disponíveis',
      icon: FileText,
      tile: 'bg-gray-100 text-on-dark',
    },
    {
      title: 'Próximo vencimento',
      value: stats.proximoVencimento
        ? `${stats.proximoVencimento.diasRestantes} dias`
        : 'N/A',
      subtitle: stats.proximoVencimento
        ? `${stats.proximoVencimento.dataVencimento} · ${formatCurrency(stats.proximoVencimento.valor)}`
        : 'Dados não disponíveis',
      icon: CreditCard,
      tile: vencimentoUrgente ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-on-dark',
      valueClass: vencimentoUrgente ? 'text-red-600' : 'text-on-dark',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Aviso de Desenvolvimento */}
      <div className="on-card flex items-center gap-3 p-4">
        <span className="on-tile bg-on-lime/20 text-on-dark">
          <Info className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-on-dark">Plataforma em Desenvolvimento</h2>
          <p className="text-sm text-gray-500">
            Nossa plataforma está sendo constantemente aprimorada. Algumas funcionalidades
            podem estar temporariamente indisponíveis.
          </p>
        </div>
      </div>

      {/* Hero — plano e boas-vindas */}
      <section className="on-gradient relative overflow-hidden rounded-2xl p-6 text-on-black shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="on-pill bg-on-black/85 text-on-lime">{stats.planoCorreto}</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {isNewAccount ? `Bem-vindo, ${user?.name || 'Cliente'}!` : 'Seu escritório virtual'}
            </h1>
            <p className="mt-1 font-medium text-on-black/70">
              {isNewAccount
                ? 'Sua conta foi criada recentemente. Em breve você receberá suas primeiras correspondências.'
                : stats.contaAtivaDias > 0
                  ? `Conta ativa há ${stats.contaAtivaDias} dias · Cliente desde ${stats.dataContratacao}`
                  : `Cliente desde ${stats.dataContratacao}`}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/cliente/correspondencias">
                <button className="cursor-pointer rounded-full bg-on-black px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-on-dark">
                  Ver correspondências
                </button>
              </Link>
              <Link to="/cliente/documentos">
                <button className="cursor-pointer rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-on-black transition-colors duration-200 hover:bg-white">
                  Meus documentos
                </button>
              </Link>
            </div>
          </div>

          {stats.proximoVencimento && (
            <div className="rounded-2xl bg-white/85 p-5 shadow-sm backdrop-blur lg:min-w-[240px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Próximo vencimento
              </p>
              <p className="mt-1 text-2xl font-bold text-on-dark">
                {formatCurrency(stats.proximoVencimento.valor)}
              </p>
              <p className={`text-sm font-medium ${vencimentoUrgente ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.proximoVencimento.dataVencimento} · em {stats.proximoVencimento.diasRestantes} dias
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statsCards.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className={`mt-1 text-3xl font-bold tracking-tight ${stat.valueClass || 'text-on-dark'}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <span className={`on-tile ${stat.tile}`}>
                  <stat.icon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Correspondences */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-on-dark">
              <span>Correspondências recentes</span>
              <Link to="/cliente/correspondencias">
                <Button variant="outline" size="sm" className="rounded-xl">
                  Ver todas
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {corrLoading ? (
              <div className="py-4 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime"></div>
              </div>
            ) : recentCorrespondences.length === 0 ? (
              <div className="py-8 text-center">
                <span className="on-tile mx-auto mb-4 bg-gray-100 text-gray-400">
                  <Mail className="h-5 w-5" />
                </span>
                <p className="text-gray-500">
                  {isNewAccount
                    ? 'Suas correspondências aparecerão aqui em breve'
                    : 'Nenhuma correspondência encontrada'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCorrespondences.map((correspondence) => (
                  <div
                    key={correspondence.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-3 transition-colors duration-200 hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-on-dark">
                          {correspondence.remetente}
                        </h3>
                        {!correspondence.visualizada && (
                          <span className="on-pill bg-on-lime text-on-black">Nova</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{correspondence.assunto}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {correspondence.arquivo_url && (
                        <Button variant="ghost" size="sm" className="rounded-lg">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="text-on-dark">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {atividadesLoading ? (
              <div className="py-4 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime"></div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="py-8 text-center">
                <span className="on-tile mx-auto mb-4 bg-gray-100 text-gray-400">
                  <Clock className="h-5 w-5" />
                </span>
                <p className="text-gray-500">Suas atividades aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 transition-colors duration-200 hover:bg-gray-100"
                  >
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-on-lime"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-on-dark">
                        {activity.acao.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">{activity.descricao}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.data_atividade).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-on-dark">Ações rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/cliente/documentos" className="on-card group flex items-center gap-4 p-5 hover:border-on-lime/60">
            <span className="on-tile bg-on-lime/20 text-on-dark">
              <FileText className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-on-dark">
              {stats.totalDocumentos === 0 ? 'Ver documentos' : 'Baixar documentos'}
            </span>
            <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link to="/cliente/correspondencias" className="on-card group flex items-center gap-4 p-5 hover:border-on-lime/60">
            <span className="on-tile bg-gray-100 text-on-dark">
              <Mail className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-on-dark">Ver correspondências</span>
            <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link to="/cliente/financeiro" className="on-card group flex items-center gap-4 p-5 hover:border-on-lime/60">
            <span className="on-tile bg-gray-100 text-on-dark">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-on-dark">Área financeira</span>
            <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientOverview;
