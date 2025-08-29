import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAdminSignupSubmissions } from '@/hooks/useAdminSignupSubmissions';
import { formatDate } from '@/utils/formatters';
import { Check, Trash2, RefreshCw, Clock, CheckCircle } from 'lucide-react';

const AdminSignupSubmissions = () => {
  const { 
    submissions, 
    loading, 
    processing, 
    fetchSubmissions, 
    processSubmission, 
    deleteSubmission 
  } = useAdminSignupSubmissions();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      case 'processed':
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Processado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'MENSAL': return 'Mensal';
      case '6 MESES': return '6 Meses';
      case '1 ANO': return 'Anual';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Cadastro</CardTitle>
          <CardDescription>Carregando solicitações...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Solicitações de Cadastro</CardTitle>
          <CardDescription>
            Gerencie as solicitações de cadastro enviadas pelo formulário público
          </CardDescription>
        </div>
        <Button onClick={fetchSubmissions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            Nenhuma solicitação encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome/Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(submission.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{submission.nome_responsavel}</div>
                        <div className="text-sm text-muted-foreground">{submission.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{submission.telefone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPlanLabel(submission.plano_selecionado)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={submission.tipo_pessoa === 'juridica' ? 'default' : 'secondary'}>
                        {submission.tipo_pessoa === 'juridica' ? 'Jurídica' : 'Física'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {submission.status === 'pending' && (
                        <Button
                          onClick={() => processSubmission(submission.id)}
                          disabled={processing === submission.id}
                          size="sm"
                          className="gap-1"
                        >
                          {processing === submission.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Processar
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja realmente excluir a solicitação de {submission.nome_responsavel}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSubmission(submission.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSignupSubmissions;