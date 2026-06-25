import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCrmMutations } from '@/hooks/useCrm';
import { ORIGEM_LABEL, type CrmEtapa, type CrmOrigem } from '@/integrations/supabase/crm';

const ORIGENS: CrmOrigem[] = ['manual', 'indicacao', 'google_ads', 'meta_ads', 'site', 'outro'];

interface NovoNegocioDialogProps {
  etapas: CrmEtapa[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NovoNegocioDialog = ({ etapas, open, onOpenChange }: NovoNegocioDialogProps) => {
  const { toast } = useToast();
  const { criarNegocioManual } = useCrmMutations();
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', titulo: '', valor: '', origem: 'manual' as CrmOrigem });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.nome.trim()) {
      toast({ title: 'Informe o nome do contato', variant: 'destructive' });
      return;
    }
    const etapaEntrada = etapas[0]?.id ?? null; // etapa ativa de menor ordem
    const valorCentavos = form.valor ? Math.round(parseFloat(form.valor.replace(',', '.')) * 100) : null;
    criarNegocioManual.mutate(
      {
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        origem: form.origem,
        titulo: form.titulo.trim() || `Negócio — ${form.nome.trim()}`,
        valor_centavos: valorCentavos,
        etapa_id: etapaEntrada,
      },
      {
        onSuccess: () => {
          toast({ title: 'Negócio criado' });
          setForm({ nome: '', email: '', telefone: '', titulo: '', valor: '', origem: 'manual' });
          onOpenChange(false);
        },
        onError: (e) => toast({ title: 'Erro ao criar', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
          <DialogDescription>Cadastre um lead manualmente e crie o negócio no funil.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nn-nome">Nome do contato *</Label>
            <Input id="nn-nome" value={form.nome} onChange={set('nome')} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nn-email">E-mail</Label>
              <Input id="nn-email" type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nn-tel">WhatsApp / Telefone</Label>
              <Input id="nn-tel" value={form.telefone} onChange={set('telefone')} placeholder="(91) 99999-0000" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nn-titulo">Título do negócio</Label>
            <Input id="nn-titulo" value={form.titulo} onChange={set('titulo')} placeholder="Ex.: Endereço Fiscal — anual" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nn-valor">Valor (R$)</Label>
              <Input id="nn-valor" inputMode="decimal" value={form.valor} onChange={set('valor')} placeholder="1195,00" />
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={(v) => setForm((f) => ({ ...f, origem: v as CrmOrigem }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => <SelectItem key={o} value={o}>{ORIGEM_LABEL[o]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criarNegocioManual.isPending}>
            {criarNegocioManual.isPending ? 'Criando…' : 'Criar negócio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NovoNegocioDialog;
