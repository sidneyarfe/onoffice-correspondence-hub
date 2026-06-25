import { useState } from 'react';
import {
  Phone, Mail, MessageCircle, Plus, X, Check, FileSignature,
  StickyNote, PhoneCall, Users, Clock, Send, Tag as TagIcon, Trash2,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCrmAtividades, useCrmMutations } from '@/hooks/useCrm';
import {
  ATIVIDADE_LABEL, ORIGEM_LABEL,
  type CrmEtapa, type CrmNegocio, type CrmTag, type CrmAtividadeTipo,
} from '@/integrations/supabase/crm';

const ATIVIDADE_ICON: Record<CrmAtividadeTipo, typeof StickyNote> = {
  nota: StickyNote,
  ligacao: PhoneCall,
  reuniao: Users,
  whatsapp: MessageCircle,
  followup: Clock,
  email: Mail,
};

const onlyDigits = (s: string) => s.replace(/\D/g, '');

interface CrmDealSheetProps {
  negocio: CrmNegocio | null;
  etapas: CrmEtapa[];
  tags: CrmTag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIniciarContratacao: (negocio: CrmNegocio) => void;
}

const CrmDealSheet = ({ negocio, etapas, tags, open, onOpenChange, onIniciarContratacao }: CrmDealSheetProps) => {
  const { toast } = useToast();
  const { data: atividades = [] } = useCrmAtividades(negocio?.id ?? null);
  const { moverEtapa, criarAtividade, alternarAtividade, criarTag, vincularTagNegocio, excluirNegocio } = useCrmMutations();

  const [novoTipo, setNovoTipo] = useState<CrmAtividadeTipo>('nota');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaTag, setNovaTag] = useState('');

  if (!negocio) return null;
  const contato = negocio.contato;
  const tagIds = new Set((negocio.tags ?? []).map((t) => t.id));

  const handleWhatsApp = () => {
    const tel = onlyDigits(contato?.telefone ?? '');
    if (!tel) {
      toast({ title: 'Sem telefone', description: 'Este contato não tem WhatsApp cadastrado.', variant: 'destructive' });
      return;
    }
    const ddi = tel.length <= 11 ? `55${tel}` : tel;
    const msg = encodeURIComponent(`Olá ${contato?.nome ?? ''}! Aqui é da ON Office.`);
    window.open(`https://wa.me/${ddi}?text=${msg}`, '_blank');
  };

  const handleMove = (etapaId: string) => {
    const etapa = etapas.find((e) => e.id === etapaId);
    if (etapa) moverEtapa.mutate({ id: negocio.id, etapa_id: etapa.id, status: etapa.tipo });
  };

  const handleAddAtividade = () => {
    if (!novaDescricao.trim()) return;
    criarAtividade.mutate(
      { negocio_id: negocio.id, tipo: novoTipo, descricao: novaDescricao.trim(), concluida: novoTipo === 'nota' },
      { onSuccess: () => setNovaDescricao('') },
    );
  };

  const handleCriarTag = () => {
    const nome = novaTag.trim();
    if (!nome) return;
    criarTag.mutate(
      { nome },
      {
        onSuccess: (tag) => {
          vincularTagNegocio.mutate({ negocio_id: negocio.id, tag_id: tag.id, vincular: true });
          setNovaTag('');
        },
      },
    );
  };

  const handleExcluir = () => {
    excluirNegocio.mutate(
      { id: negocio.id },
      {
        onSuccess: () => { toast({ title: 'Negócio excluído' }); onOpenChange(false); },
        onError: (e) => toast({ title: 'Erro ao excluir', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="pr-6 text-left text-lg">{negocio.titulo}</SheetTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ORIGEM_LABEL[contato?.origem ?? 'site']}</Badge>
            {negocio.status === 'ganho' && <Badge className="bg-emerald-500 text-white">Ganho</Badge>}
            {negocio.status === 'perdido' && <Badge variant="destructive">Perdido</Badge>}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-5 py-4">
          {/* Contato */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</h4>
            <p className="text-sm font-medium text-foreground">{contato?.nome ?? '—'}</p>
            {contato?.email && (
              <a href={`mailto:${contato.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-on-lime">
                <Mail className="h-4 w-4" /> {contato.email}
              </a>
            )}
            {contato?.telefone && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /> {contato.telefone}
              </span>
            )}
            {contato?.utm_campaign && (
              <p className="text-xs text-muted-foreground/70">Campanha: {contato.utm_campaign}</p>
            )}
          </section>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleWhatsApp} className="bg-[#25D366] text-white hover:bg-[#1ebe5d]">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={() => onIniciarContratacao(negocio)}>
              <FileSignature className="mr-2 h-4 w-4" /> Contratação
            </Button>
          </div>

          {/* Etapa */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etapa</h4>
            <Select value={negocio.etapa_id ?? undefined} onValueChange={handleMove}>
              <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
              <SelectContent>
                {etapas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.cor ?? '#64748b' }} />
                      {e.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Tags */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <TagIcon className="mr-1 h-3.5 w-3.5" /> Gerenciar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Aplicar tags</DropdownMenuLabel>
                  {tags.length === 0 && (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma tag ainda.</p>
                  )}
                  {tags.map((t) => (
                    <DropdownMenuCheckboxItem
                      key={t.id}
                      checked={tagIds.has(t.id)}
                      onCheckedChange={(checked) =>
                        vincularTagNegocio.mutate({ negocio_id: negocio.id, tag_id: t.id, vincular: Boolean(checked) })
                      }
                    >
                      {t.nome}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="flex items-center gap-1 p-1">
                    <Input
                      value={novaTag}
                      onChange={(e) => setNovaTag(e.target.value)}
                      placeholder="Nova tag"
                      className="h-8 text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCriarTag(); } }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCriarTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(negocio.tags ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground/60">Sem tags</span>
              )}
              {(negocio.tags ?? []).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: (t.cor ?? '#64748b') + '22', color: t.cor ?? '#94a3b8' }}
                >
                  {t.nome}
                  <button
                    aria-label={`Remover tag ${t.nome}`}
                    onClick={() => vincularTagNegocio.mutate({ negocio_id: negocio.id, tag_id: t.id, vincular: false })}
                    className="cursor-pointer hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </section>

          <Separator />

          {/* Atividades */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atividades</h4>

            {/* Nova atividade */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as CrmAtividadeTipo)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ATIVIDADE_LABEL) as CrmAtividadeTipo[]).map((t) => (
                    <SelectItem key={t} value={t}>{ATIVIDADE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Descreva a atividade ou nota…"
                className="min-h-[60px] text-sm"
              />
              <Button size="sm" onClick={handleAddAtividade} disabled={!novaDescricao.trim()} className="w-full">
                <Send className="mr-2 h-3.5 w-3.5" /> Registrar
              </Button>
            </div>

            {/* Timeline */}
            <ul className="space-y-2">
              {atividades.length === 0 && (
                <li className="py-4 text-center text-xs text-muted-foreground/60">Nenhuma atividade registrada.</li>
              )}
              {atividades.map((a) => {
                const Icon = ATIVIDADE_ICON[a.tipo] ?? StickyNote;
                return (
                  <li key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-on-lime" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{ATIVIDADE_LABEL[a.tipo]}</span>
                        <time className="text-[11px] text-muted-foreground">
                          {new Date(a.data_atividade).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                      </div>
                      {a.descricao && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.descricao}</p>}
                      {a.tipo !== 'nota' && (
                        <button
                          onClick={() => alternarAtividade.mutate({ id: a.id, negocio_id: negocio.id, concluida: !a.concluida })}
                          className={`mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] ${
                            a.concluida ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Check className="h-3 w-3" /> {a.concluida ? 'Concluída' : 'Marcar como concluída'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <Separator />

          {/* Zona de perigo */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona de perigo</h4>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir negócio
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este negócio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O negócio “{negocio.titulo}” e todas as suas atividades serão removidos permanentemente.
                    O contato em si não é apagado. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExcluir}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CrmDealSheet;
