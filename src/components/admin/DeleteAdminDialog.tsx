import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DeleteAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  adminEmail: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteAdminDialog = ({
  open,
  onOpenChange,
  adminName,
  adminEmail,
  onConfirm,
  isDeleting
}: DeleteAdminDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Administrador</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja excluir o administrador <strong>{adminName}</strong> ({adminEmail})?
            </p>
            <p className="text-destructive font-medium">
              ⚠️ Esta ação é irreversível e removerá permanentemente:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Acesso ao painel administrativo</li>
              <li>Todas as permissões de administrador</li>
              <li>Histórico de atividades associadas</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir Administrador"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
