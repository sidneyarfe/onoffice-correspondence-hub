import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { syncGabrielBogea } from '@/utils/syncAdminUser';

interface SyncAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export const SyncAdminModal: React.FC<SyncAdminModalProps> = ({ open, onClose }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeSyncGabriel = async () => {
    setIsExecuting(true);
    setResult(null);
    
    try {
      const syncResult = await syncGabrielBogea();
      setResult(syncResult);
      
      if (syncResult.success) {
        toast.success('Admin Gabriel Bogea sincronizado com sucesso!', {
          description: 'O login agora deve funcionar normalmente.'
        });
      } else {
        toast.error('Falha na sincronização', {
          description: syncResult.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      setResult(errorResult);
      toast.error('Erro ao executar sincronização', {
        description: errorResult.error
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar Admin no Supabase Auth</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gabriel Bogea</CardTitle>
              <CardDescription>
                gabrielbogea2@hotmail.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este admin foi criado na tabela admin_users mas precisa ser sincronizado 
                no Supabase Auth para permitir login.
              </p>

              {isExecuting && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Executando sincronização...</span>
                </div>
              )}

              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {result.success ? 'Sucesso!' : 'Erro'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {result.message || result.error}
                  </p>

                  {result.success && result.loginWorks && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        ✅ Login testado e funcionando!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        O admin pode agora fazer login normalmente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={executeSyncGabriel}
                  disabled={isExecuting}
                  className="flex-1"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sincronizando...
                    </>
                  ) : (
                    'Sincronizar Admin'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isExecuting}
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};