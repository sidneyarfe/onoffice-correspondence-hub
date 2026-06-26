import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminClients, AdminClient } from '@/hooks/useAdminClients';
import { toast } from '@/hooks/use-toast';
import {
  ClientesFilterState,
  SortState,
  INITIAL_FILTERS,
  FunnelColumn,
  deriveFlags,
  statusMeta,
  docDe,
} from './clientes/clientesShared';
import ClientesList from './clientes/ClientesList';
import ClientesKanban from './clientes/ClientesKanban';
import ClienteFicha from './clientes/ClienteFicha';
import ClientePerfil from './clientes/ClientePerfil';
import EditarClienteModal from './clientes/EditarClienteModal';
import CobrancaModal from './clientes/CobrancaModal';
import RegistrarContratoModal from './clientes/RegistrarContratoModal';
import ExcluirClienteModal from './clientes/ExcluirClienteModal';
import ClientFormModal from './ClientFormModal';
import { ClientBatchImportModal } from './ClientBatchImportModal';

type View = 'lista' | 'kanban' | 'ficha' | 'perfil';
type ModalType = 'edit' | 'cobranca' | 'contrato' | 'excluir' | 'add' | 'import' | null;

const AdminClients: React.FC = () => {
  const { clients, loading, error, refetch, updateClientStatus, deleteClient } = useAdminClients();

  const [view, setView] = useState<View>('lista');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientesFilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const [modalClientId, setModalClientId] = useState<string | null>(null);
  const [chargeTarget, setChargeTarget] = useState<'ativo' | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId],
  );
  const modalClient = useMemo(
    () => clients.find((c) => c.id === modalClientId) || null,
    [clients, modalClientId],
  );

  // ---------- navegação ----------
  const openFicha = (c: AdminClient) => {
    setSelectedId(c.id);
    setView('ficha');
  };
  const backToLista = () => setView('lista');

  const closeModal = () => {
    setModal(null);
    setModalClientId(null);
    setChargeTarget(null);
  };

  const openEdit = (c: AdminClient) => {
    setModalClientId(c.id);
    setModal('edit');
  };
  const openCobranca = (c: AdminClient, target: 'ativo' | null = null) => {
    setModalClientId(c.id);
    setChargeTarget(target);
    setModal('cobranca');
  };
  const openContrato = (c: AdminClient) => {
    setModalClientId(c.id);
    setModal('contrato');
  };
  const openExcluir = (c: AdminClient) => {
    setModalClientId(c.id);
    setModal('excluir');
  };

  // cancela a contratação (soft) — permanece na ficha com status atualizado
  const cancelarContratacao = async (c: AdminClient) => {
    await updateClientStatus(c.id, 'cancelado');
    refetch();
  };
  // exclui o registro (hard) — volta para a lista
  const excluirCliente = async (c: AdminClient) => {
    await deleteClient(c.id);
    setView('lista');
    setSelectedId(null);
  };

  // ---------- CSV ----------
  const exportCSV = (rows: AdminClient[]) => {
    const headers = [
      'Nome', 'Tipo', 'Documento', 'E-mail', 'Telefone', 'Endereço', 'Bairro', 'Cidade', 'UF', 'CEP', 'Plano',
      'Status', 'Adesão', 'Vencimento',
    ];
    const body = rows.map((c) => [
      c.name,
      c.tipo_pessoa === 'juridica' ? 'PJ' : 'PF',
      docDe(c),
      c.email,
      c.telefone,
      c.endereco,
      c.bairro || '',
      c.cidade,
      c.estado,
      c.cep,
      c.plan,
      statusMeta(c.status).label,
      c.joinDate,
      c.nextDue,
    ]);
    const csv = [headers, ...body]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_onoffice_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast({ title: 'Exportação concluída', description: `${rows.length} clientes exportados para CSV.` });
  };

  // ---------- Kanban: mover com travas ----------
  const moveTo = async (c: AdminClient, ns: AdminClient['status']) => {
    if (c.status === ns) return;
    try {
      await updateClientStatus(c.id, ns);
      toast({ title: 'Etapa atualizada', description: `${c.name} → ${statusMeta(ns).label}.` });
    } catch {
      toast({ title: 'Erro ao mover', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' });
    }
  };

  const handleDropClient = (c: AdminClient, col: FunnelColumn['key']) => {
    const { assinado, pago } = deriveFlags(c);
    if (col === 'contrato_assinado') {
      if (assinado) moveTo(c, 'contrato_assinado');
      else openContrato(c);
      return;
    }
    if (col === 'pagamento') {
      if (!assinado) {
        toast({ title: 'Ação bloqueada', description: 'Contrato precisa estar assinado antes de cobrar.', variant: 'destructive' });
        return;
      }
      moveTo(c, pago ? 'pagamento_confirmado' : 'pagamento_pendente');
      return;
    }
    if (col === 'ativo') {
      if (pago) moveTo(c, 'ativo');
      else if (!assinado)
        toast({ title: 'Ação bloqueada', description: 'Registre o contrato assinado antes de ativar.', variant: 'destructive' });
      else openCobranca(c, 'ativo');
      return;
    }
    if (col === 'encerrado') {
      moveTo(c, c.status === 'suspenso' ? 'suspenso' : 'cancelado');
      return;
    }
    // 'iniciado' | 'contrato_enviado' — a chave da coluna é o próprio status
    moveTo(c, col);
  };

  // ---------- loading / error ----------
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Carregando todos os registros…</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-on-lime" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Erro ao carregar dados</p>
        </div>
        <div className="py-12 text-center">
          <p className="text-red-400">Erro ao carregar clientes: {error}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // ---------- render por view ----------
  // se a ficha/perfil perder o cliente (ex.: exclusão/refetch), cai para a lista
  const effectiveView: View = (view === 'ficha' || view === 'perfil') && !selectedClient ? 'lista' : view;

  return (
    <div>
      {effectiveView === 'lista' && (
        <ClientesList
          clients={clients}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          page={page}
          setPage={setPage}
          view="lista"
          onViewChange={setView}
          onOpenFicha={openFicha}
          onAdd={() => setModal('add')}
          onImport={() => setModal('import')}
          onExport={exportCSV}
          onRefresh={refetch}
          loading={loading}
        />
      )}

      {effectiveView === 'kanban' && (
        <ClientesKanban
          clients={clients}
          filters={filters}
          totalCount={clients.length}
          view="kanban"
          onViewChange={setView}
          onExport={exportCSV}
          onImport={() => setModal('import')}
          onAdd={() => setModal('add')}
          onOpenFicha={openFicha}
          onDropClient={handleDropClient}
        />
      )}

      {effectiveView === 'ficha' && selectedClient && (
        <ClienteFicha
          client={selectedClient}
          onBack={backToLista}
          onEdit={() => openEdit(selectedClient)}
          onCobrar={() => openCobranca(selectedClient)}
          onRegistrarContrato={() => openContrato(selectedClient)}
          onPerfil={() => setView('perfil')}
          onExcluir={() => openExcluir(selectedClient)}
        />
      )}

      {effectiveView === 'perfil' && selectedClient && (
        <ClientePerfil client={selectedClient} onBack={() => setView('ficha')} onSaved={refetch} />
      )}

      {/* ---------- Modais ---------- */}
      <EditarClienteModal
        isOpen={modal === 'edit'}
        onClose={closeModal}
        client={modalClient}
        onSaved={refetch}
      />
      <CobrancaModal
        isOpen={modal === 'cobranca'}
        onClose={closeModal}
        client={modalClient}
        target={chargeTarget}
        onDone={refetch}
      />
      <RegistrarContratoModal
        isOpen={modal === 'contrato'}
        onClose={closeModal}
        client={modalClient}
        onDone={refetch}
      />
      <ExcluirClienteModal
        isOpen={modal === 'excluir'}
        onClose={closeModal}
        client={modalClient}
        onCancelarContratacao={cancelarContratacao}
        onExcluirDefinitivo={excluirCliente}
      />

      <ClientFormModal
        isOpen={modal === 'add'}
        onClose={closeModal}
        client={null}
        onSuccess={refetch}
      />
      <ClientBatchImportModal
        isOpen={modal === 'import'}
        onClose={closeModal}
        onImportComplete={() => {
          refetch();
          closeModal();
        }}
      />
    </div>
  );
};

export default AdminClients;
