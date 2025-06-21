
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, FileText, CreditCard, Clock, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClientData } from '@/hooks/useClientData';
import { useCorrespondencias } from '@/hooks/useCorrespondencias';
import { useAtividades } from '@/hooks/useAtividades';
import { useAuth } from '@/contexts/AuthContext';

const ClientOverview = () => {
  const { user } = useAuth();
  const { stats, loading: statsLoading, error } = useClientData();
  const { correspondencias, loading: corrLoading } = useCorrespondencias();
  const { atividades, loading: atividadesLoading } = useAtividades();

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
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

  const statsCards = [
    {
      title: 'Correspondências',
      value: stats.totalCorrespondencias.toString(),
      subtitle: stats.correspondenciasNaoLidas > 0 
        ? `${stats.correspondenciasNaoLidas} não lidas`
        : stats.totalCorrespondencias === 0 
          ? 'Nenhuma recebida'
          : 'Todas lidas',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Documentos',
      value: stats.totalDocumentos.toString(),
      subtitle: stats.totalDocumentos === 0 ? 'Em preparação' : 'Disponíveis',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Próximo Vencimento',
      value: stats.proximoVencimento ? `${stats.proximoVencimento.diasRestantes} dias` : 'N/A',
      subtitle: stats.proximoVencimento ? `R$ ${stats.proximoVencimento.valor.toFixed(2)}` : '',
      icon: CreditCard,
      color: stats.proximoVencimento && stats.proximoVencimento.diasRestantes <= 30 
        ? 'text-red-600' 
        : 'text-orange-600',
      bgColor: stats.proximoVencimento && stats.proximoVencimento.diasRestantes <= 30 
        ? 'bg-red-50' 
        : 'bg-orange-50',
    },
    {
      title: stats.planoCorreto,
      value: stats.contaAtivaDias > 0 ? `${stats.contaAtivaDias} dias` : 'Hoje',
      subtitle: `Cliente desde ${stats.dataContratacao}`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-on-dark mb-2">
          {isNewAccount ? `Bem-vindo, ${user?.name || 'Cliente'}!` : 'Dashboard'}
        </h1>
        <p className="text-gray-600">
          {isNewAccount 
            ? 'Sua conta foi criada recentemente. Em breve você receberá suas primeiras correspondências.'
            : 'Acompanhe suas correspondências e documentos'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="on-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-on-dark">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Correspondences */}
        <Card className="on-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Correspondências Recentes</span>
              <Link to="/cliente/correspondencias">
                <Button variant="outline" size="sm">Ver todas</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {corrLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-on-lime mx-auto"></div>
              </div>
            ) : recentCorrespondences.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isNewAccount 
                    ? 'Suas correspondências aparecerão aqui em breve'
                    : 'Nenhuma correspondência encontrada'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCorrespondences.map((correspondence) => (
                  <div key={correspondence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-on-dark">{correspondence.remetente}</h4>
                        {!correspondence.visualizada && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Nova</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{correspondence.assunto}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(correspondence.data_recebimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {correspondence.arquivo_url && (
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
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
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {atividadesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-on-lime mx-auto"></div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Suas atividades aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-on-lime rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="font-medium text-on-dark">{activity.acao.replace('_', ' ')}</p>
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
      <Card className="on-card">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse rapidamente os recursos mais utilizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/cliente/documentos">
              <Button className="w-full h-16 on-button flex flex-col gap-2">
                <FileText className="w-6 h-6" />
                <span>
                  {stats.totalDocumentos === 0 ? 'Ver Documentos' : 'Baixar Documentos'}
                </span>
              </Button>
            </Link>
            <Link to="/cliente/correspondencias">
              <Button className="w-full h-16 bg-gray-800 hover:bg-gray-700 text-white flex flex-col gap-2">
                <Mail className="w-6 h-6" />
                <span>Ver Correspondências</span>
              </Button>
            </Link>
            <Link to="/cliente/financeiro">
              <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col gap-2">
                <CreditCard className="w-6 h-6" />
                <span>Área Financeira</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientOverview;
