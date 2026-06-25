import { useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Search, Trophy, Users2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { useCrmEtapas, useCrmNegocios, useCrmTags, useCrmMutations } from '@/hooks/useCrm';
import { ORIGEM_LABEL, type CrmEtapa, type CrmNegocio, type CrmOrigem } from '@/integrations/supabase/crm';
import CrmBoard from './crm/CrmBoard';
import CrmListView from './crm/CrmListView';
import CrmDealSheet from './crm/CrmDealSheet';
import NovoNegocioDialog from './crm/NovoNegocioDialog';
import IniciarContratacaoDialog from './crm/IniciarContratacaoDialog';

const ORIGENS: CrmOrigem[] = ['google_ads', 'meta_ads', 'site', 'manual', 'indicacao', 'outro'];

const AdminCRM = () => {
  const { toast } = useToast();
  const { data: etapas = [], isLoading: loadingEtapas } = useCrmEtapas();
  const { data: negocios = [], isLoading: loadingNegocios } = useCrmNegocios();
  const { data: tags = [] } = useCrmTags();
  const { moverEtapa } = useCrmMutations();

  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('all');
  const [filtroTag, setFiltroTag] = useState<string>('all');

  const [dealAberto, setDealAberto] = useState<CrmNegocio | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [contratacaoDeal, setContratacaoDeal] = useState<CrmNegocio | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return negocios.filter((n) => {
      if (filtroOrigem !== 'all' && (n.contato?.origem ?? 'site') !== filtroOrigem) return false;
      if (filtroTag !== 'all' && !(n.tags ?? []).some((t) => t.id === filtroTag)) return false;
      if (q) {
        const hay = `${n.titulo} ${n.contato?.nome ?? ''} ${n.contato?.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [negocios, busca, filtroOrigem, filtroTag]);

  const kpis = useMemo(() => {
    const abertos = negocios.filter((n) => n.status === 'aberto');
    const ganhos = negocios.filter((n) => n.status === 'ganho');
    const pipeline = abertos.reduce((s, n) => s + (n.valor_centavos ?? 0), 0);
    return { totalLeads: negocios.length, abertos: abertos.length, ganhos: ganhos.length, pipeline };
  }, [negocios]);

  const openDeal = (n: CrmNegocio) => { setDealAberto(n); setSheetOpen(true); };

  const handleMove = (negocioId: string, etapa: CrmEtapa) => {
    moverEtapa.mutate(
      { id: negocioId, etapa_id: etapa.id, status: etapa.tipo },
      { onSuccess: () => { if (etapa.tipo === 'ganho') toast({ title: '🎉 Negócio ganho!', description: etapa.nome }); } },
    );
  };

  // Mantém o deal aberto sincronizado com os dados mais frescos
  const dealSync = dealAberto ? negocios.find((n) => n.id === dealAberto.id) ?? dealAberto : null;

  const loading = loadingEtapas || loadingNegocios;

  return (
    // Preenche o <main> sem estourar a viewport: min-h-0 + min-w-0 em toda a cadeia de flex
    // (até o h-screen overflow-hidden). Header/KPIs/toolbar são shrink-0; só o board/lista
    // rolam internamente (board: X; colunas/lista: Y) — a página nunca rola.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Gestão de leads e funil de contratação</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo negócio
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users2} label="Leads" value={String(kpis.totalLeads)} />
        <KpiCard icon={List} label="Em aberto" value={String(kpis.abertos)} />
        <KpiCard icon={Trophy} label="Ganhos" value={String(kpis.ganhos)} accent />
        <KpiCard icon={DollarSign} label="Pipeline" value={formatCurrency(kpis.pipeline)} />
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar negócio, contato ou e-mail…" className="pl-9" />
        </div>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {ORIGENS.map((o) => <SelectItem key={o} value={o}>{ORIGEM_LABEL[o]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTag} onValueChange={setFiltroTag}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            onClick={() => setView('kanban')}
            className={`flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors ${view === 'kanban' ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button
            onClick={() => setView('lista')}
            className={`flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors ${view === 'lista' ? 'bg-on-lime font-semibold text-on-black' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
        </div>
      </div>

      {/* Conteúdo (preenche a altura restante; só o board/lista rolam internamente) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime" />
          </div>
        ) : etapas.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma etapa configurada. Aplique a migração do CRM (Story 4.0) para criar o pipeline padrão.
          </CardContent></Card>
        ) : view === 'kanban' ? (
          <CrmBoard etapas={etapas} negocios={filtrados} onOpenDeal={openDeal} onMove={handleMove} />
        ) : (
          <CrmListView etapas={etapas} negocios={filtrados} onOpenDeal={openDeal} />
        )}
      </div>

      {/* Overlays */}
      <CrmDealSheet
        negocio={dealSync}
        etapas={etapas}
        tags={tags}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onIniciarContratacao={(n) => { setContratacaoDeal(n); }}
      />
      <NovoNegocioDialog etapas={etapas} open={novoOpen} onOpenChange={setNovoOpen} />
      <IniciarContratacaoDialog
        negocio={contratacaoDeal}
        open={!!contratacaoDeal}
        onOpenChange={(o) => { if (!o) setContratacaoDeal(null); }}
      />
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, accent }: { icon: typeof Users2; label: string; value: string; accent?: boolean }) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className={`rounded-lg p-2 ${accent ? 'bg-emerald-500/15 text-emerald-500' : 'bg-on-lime/15 text-on-lime'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default AdminCRM;
