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
          <p className="mt-4 text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="py-12 text-center">
          <p className="text-red-400">Erro ao carregar dados: {error}</p>
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
      tile: 'bg-on-lime/15 text-on-lime',
    },
    {
      title: 'Documentos',
      value: stats.totalDocumentos.toString(),
      subtitle: stats.totalDocumentos === 0 ? 'Em preparação' : 'Disponíveis',
      icon: FileText,
      tile: 'bg-white/10 text-foreground',
    },
    {
      title: 'Conta ativa',
      value: stats.contaAtivaDias > 0 ? `${stats.contaAtivaDias} dias` : 'Hoje',
      subtitle: `Cliente desde ${stats.dataContratacao}`,
      icon: Clock,
      tile: 'bg-white/10 text-foreground',
    },
  ];

  return (
    <div className="on-bento">
      {/* Hero — glass sobre mesh, único h1 da tela */}
      <section className="on-glass relative col-span-full overflow-hidden rounded-xl p-6 lg:col-span-8 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-on-lime/10 blur-3xl"
        ></div>
        <span className="on-pill on-glow-sm bg-on-lime text-on-black">{stats.planoCorreto}</span>
        <h1 className="mt-4 text-3xl font-bold text-foreground lg:text-4xl">
          {isNewAccount ? `Bem-vindo, ${user?.name || 'Cliente'}!` : 'Seu escritório virtual'}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {isNewAccount
            ? 'Sua conta foi criada recentemente. Em breve você receberá suas primeiras correspondências.'
            : 'Acompanhe correspondências, documentos e a saúde da sua conta em um só lugar.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/cliente/correspondencias"
            className="on-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            <Mail className="h-4 w-4" />
            Ver correspondências
          </Link>
          <Link
            to="/cliente/documentos"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-white/15"
          >
            <FileText className="h-4 w-4" />
            Meus documentos
          </Link>
        </div>
      </section>

      {/* Vencimento — tile com glow quando urgente */}
      <section
        className={`on-card col-span-full flex flex-col justify-between p-6 md:col-span-3 lg:col-span-4 ${
          vencimentoUrgente ? 'on-glow border-on-lime/30' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Próximo vencimento
          </p>
          <span className={`on-tile h-9 w-9 ${vencimentoUrgente ? 'bg-on-lime/15 text-on-lime' : 'bg-white/10 text-foreground'}`}>
            <CreditCard className="h-4 w-4" />
          </span>
        </div>
        {stats.proximoVencimento ? (
          <div className="mt-4">
            <p className="font-dm text-3xl font-bold tracking-tight text-on-lime">
              {formatCurrency(stats.proximoVencimento.valor)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.proximoVencimento.dataVencimento} · em{' '}
              <span className={vencimentoUrgente ? 'font-semibold text-on-lime' : ''}>
                {stats.proximoVencimento.diasRestantes} dias
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Dados não disponíveis</p>
        )}
      </section>

      {/* Aviso de desenvolvimento — abaixo do hero (hierarquia preservada) */}
      <div className="on-glass col-span-full flex items-center gap-3 rounded-lg p-4">
        <span className="on-tile h-9 w-9 bg-on-lime/15 text-on-lime">
          <Info className="h-4 w-4" />
        </span>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Plataforma em desenvolvimento.</span>{' '}
          Algumas funcionalidades podem estar temporariamente indisponíveis.
        </p>
      </div>

      {/* KPIs */}
      {statsCards.map((stat, index) => (
        <Card key={index} className="on-card col-span-full border-0 md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-1 font-dm text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
              <span className={`on-tile ${stat.tile}`}>
                <stat.icon className="h-5 w-5" />
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Correspondências recentes */}
      <Card className="on-card col-span-full border-0 lg:col-span-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span>Correspondências recentes</span>
            <Link to="/cliente/correspondencias">
              <Button variant="outline" size="sm" className="rounded-md">
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
              <span className="on-tile mx-auto mb-4 bg-white/10 text-muted-foreground">
                <Mail className="h-5 w-5" />
              </span>
              <p className="text-muted-foreground">
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
                  className="flex items-center justify-between rounded-md bg-white/[0.04] p-3 transition-colors duration-200 hover:bg-white/[0.08]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {correspondence.remetente}
                      </h3>
                      {!correspondence.visualizada && (
                        <span className="on-pill on-glow-sm bg-on-lime text-on-black">Nova</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{correspondence.assunto}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {correspondence.arquivo_url && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg">
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

      {/* Atividades recentes */}
      <Card className="on-card col-span-full border-0 lg:col-span-6">
        <CardHeader>
          <CardTitle className="text-foreground">Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {atividadesLoading ? (
            <div className="py-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime"></div>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <span className="on-tile mx-auto mb-4 bg-white/10 text-muted-foreground">
                <Clock className="h-5 w-5" />
              </span>
              <p className="text-muted-foreground">Suas atividades aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-md bg-white/[0.04] p-3 transition-colors duration-200 hover:bg-white/[0.08]"
                >
                  <div className="on-glow-sm mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-on-lime"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {activity.acao.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">{activity.descricao}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(activity.data_atividade).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <div className="col-span-full">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Ações rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            to="/cliente/documentos"
            className="on-card group flex items-center gap-4 p-5 hover:border-on-lime/50"
          >
            <span className="on-tile bg-on-lime/15 text-on-lime">
              <FileText className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-foreground">
              {stats.totalDocumentos === 0 ? 'Ver documentos' : 'Baixar documentos'}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/cliente/correspondencias"
            className="on-card group flex items-center gap-4 p-5 hover:border-on-lime/50"
          >
            <span className="on-tile bg-white/10 text-foreground">
              <Mail className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-foreground">Ver correspondências</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          {/* Financeiro "Em breve" — consistente com a sidebar (sem link ativo) */}
          <div
            aria-disabled="true"
            className="on-card flex cursor-not-allowed items-center gap-4 p-5 opacity-60"
          >
            <span className="on-tile bg-white/10 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="flex-1 font-semibold text-muted-foreground">Área financeira</span>
            <span className="on-pill bg-white/10 text-muted-foreground">Em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOverview;
