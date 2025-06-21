
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { Bell, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientNotifications = () => {
  const { notificacoes, loading, marcarComoLida, naoLidas } = useNotificacoes();

  const getIconByType = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-dark mb-2">Notificações</h1>
          <p className="text-gray-600">
            Acompanhe as atualizações importantes da sua conta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-on-lime" />
          {naoLidas > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {naoLidas} não lidas
            </Badge>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notificacoes.length === 0 ? (
          <Card className="on-card">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nenhuma notificação
              </h3>
              <p className="text-gray-500">
                Quando houver atualizações importantes, elas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          notificacoes.map((notificacao) => (
            <Card 
              key={notificacao.id} 
              className={`on-card transition-all hover:shadow-md ${
                !notificacao.lida ? 'border-l-4 border-l-on-lime bg-green-50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getIconByType(notificacao.tipo)}
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {notificacao.titulo}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {formatDistanceToNow(new Date(notificacao.data_criacao), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getBadgeColor(notificacao.tipo)}>
                      {notificacao.tipo === 'success' ? 'Sucesso' :
                       notificacao.tipo === 'warning' ? 'Aviso' :
                       notificacao.tipo === 'error' ? 'Erro' : 'Info'}
                    </Badge>
                    {!notificacao.lida && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => marcarComoLida(notificacao.id)}
                        className="text-xs"
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-700 leading-relaxed">
                  {notificacao.mensagem}
                </p>
                {notificacao.lida && notificacao.data_leitura && (
                  <p className="text-xs text-gray-500 mt-3">
                    Lida em {formatDistanceToNow(new Date(notificacao.data_leitura), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {notificacoes.length > 0 && naoLidas > 0 && (
        <Card className="on-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-on-dark">Ações rápidas</h3>
                <p className="text-sm text-gray-600">
                  Você tem {naoLidas} notificações não lidas
                </p>
              </div>
              <Button
                onClick={() => {
                  notificacoes
                    .filter(n => !n.lida)
                    .forEach(n => marcarComoLida(n.id));
                }}
                className="bg-on-lime hover:bg-on-lime/90"
              >
                Marcar todas como lidas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientNotifications;
