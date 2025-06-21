
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationsPopup = () => {
  const { notificacoes, loading, marcarComoLida, naoLidas } = useNotificacoes();
  const [isOpen, setIsOpen] = useState(false);

  const getIconByType = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const recentNotifications = notificacoes.slice(0, 5); // Mostrar apenas as 5 mais recentes

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {naoLidas > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
              {naoLidas > 99 ? '99+' : naoLidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-on-dark">Notificações</h3>
            {naoLidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-on-lime hover:text-on-lime/80"
                onClick={() => {
                  notificacoes
                    .filter(n => !n.lida)
                    .forEach(n => marcarComoLida(n.id));
                }}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                Nenhuma notificação ainda
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notificacao.lida ? 'bg-blue-50 border-l-2 border-l-on-lime' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIconByType(notificacao.tipo)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm text-on-dark truncate">
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-on-lime hover:text-on-lime/80 ml-2 flex-shrink-0"
                            onClick={() => marcarComoLida(notificacao.id)}
                          >
                            ✓
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(notificacao.data_criacao), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {recentNotifications.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-center text-xs text-gray-600">
              {notificacoes.length > 5
                ? `Mostrando 5 de ${notificacoes.length} notificações`
                : `${notificacoes.length} notificação${notificacoes.length !== 1 ? 'ões' : ''} total`}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopup;
