import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Calendar, Globe } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminTeam';
import { useAdminActivities } from '@/hooks/useAdminActivities';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminActivityModalProps {
  open: boolean;
  onClose: () => void;
  admin: AdminUser;
}

const AdminActivityModal: React.FC<AdminActivityModalProps> = ({
  open,
  onClose,
  admin,
}) => {
  const { activities, isLoading, error } = useAdminActivities(admin.id);

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-green-100 text-green-800';
    if (action.includes('CREATE') || action.includes('INSERT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-yellow-100 text-yellow-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividades de {admin.full_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando atividades...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">Erro ao carregar atividades: {error}</p>
            </div>
          )}

          {!isLoading && !error && activities.length === 0 && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
            </div>
          )}

          {!isLoading && !error && activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card key={activity.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getActionColor(activity.acao)}>
                            {activity.acao}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">
                          {activity.descricao}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(activity.data_atividade), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </div>
                          {activity.ip_address && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {activity.ip_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminActivityModal;