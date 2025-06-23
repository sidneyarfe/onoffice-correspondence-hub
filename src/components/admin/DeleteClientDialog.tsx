
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminClient } from '@/hooks/useAdminClients';
import { useClientManagement } from '@/hooks/useClientManagement';

interface DeleteClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: AdminClient | null;
  onSuccess: () => void;
}

const DeleteClientDialog = ({ isOpen, onClose, client, onSuccess }: DeleteClientDialogProps) => {
  const { deleteClient, loading } = useClientManagement();

  const handleDelete = async () => {
    if (!client) return;

    try {
      const result = await deleteClient(client.id);
      if (result.success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o cliente <strong>{client?.name}</strong>?
            <br />
            <br />
            Esta ação é irreversível e removerá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Dados da contratação</li>
              <li>Perfil do usuário</li>
              <li>Todas as informações relacionadas</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deletando...' : 'Deletar Cliente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteClientDialog;
