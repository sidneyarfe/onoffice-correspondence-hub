
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
        return <CheckCircle className="w-5 h-5 text-on-lime" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-300" />;
      case 'error':
        return <X className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'bg-on-lime/15 text-on-lime';
      case 'warning':
        return 'bg-amber-400/15 text-amber-300';
      case 'error':
        return 'bg-red-500/15 text-red-300';
      default:
        return 'bg-blue-500/15 text-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-on-lime mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe as atualizações importantes da sua conta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-on-lime" />
          {naoLidas > 0 && (
            <Badge className="bg-red-500/15 text-red-300">
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
              <Bell className="w-12 h-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                Nenhuma notificação
              </h3>
              <p className="text-muted-foreground">
                Quando houver atualizações importantes, elas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          notificacoes.map((notificacao) => (
            <Card 
              key={notificacao.id} 
              className={`on-card transition-all hover:shadow-md ${
                !notificacao.lida ? 'border-l-4 border-l-on-lime bg-on-lime/10' : ''
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
                <p className="text-foreground/80 leading-relaxed">
                  {notificacao.mensagem}
                </p>
                {notificacao.lida && notificacao.data_leitura && (
                  <p className="text-xs text-muted-foreground mt-3">
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
                <h3 className="font-semibold text-foreground">Ações rápidas</h3>
                <p className="text-sm text-muted-foreground">
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
