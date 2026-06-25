import { useEffect, useState } from 'react';
import { Copy, ExternalLink, FileSignature } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { useProducts } from '@/hooks/useProducts';
import { useCrmEtapas, useCrmMutations } from '@/hooks/useCrm';
import { crmFrom, type CrmNegocio } from '@/integrations/supabase/crm';

interface IniciarContratacaoDialogProps {
  negocio: CrmNegocio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Pessoa = 'fisica' | 'juridica';

const IniciarContratacaoDialog = ({ negocio, open, onOpenChange }: IniciarContratacaoDialogProps) => {
  const { toast } = useToast();
  const { planos } = useProducts();
  const { data: etapas = [] } = useCrmEtapas();
  const { atualizarNegocio } = useCrmMutations();

  const [enviando, setEnviando] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo_pessoa: 'fisica' as Pessoa,
    cpf_responsavel: '', razao_social: '', cnpj: '',
    endereco: '', numero_endereco: '', complemento_endereco: '',
    bairro: '', cidade: '', estado: '', cep: '',
    plano_id: '',
  });

  // Prefill plano a partir do negócio
  useEffect(() => {
    if (open) {
      setSigningUrl(null);
      setForm((f) => ({ ...f, plano_id: negocio?.plano_id ?? '' }));
    }
  }, [open, negocio?.plano_id]);

  if (!negocio) return null;
  const contato = negocio.contato;
  const planosAtivos = planos.filter((p) => p.ativo);
  const planoSel = planosAtivos.find((p) => p.id === form.plano_id);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!contato?.email) {
      toast({ title: 'Contato sem e-mail', description: 'A contratação exige um e-mail no contato.', variant: 'destructive' });
      return;
    }
    if (!form.plano_id) {
      toast({ title: 'Selecione um plano', variant: 'destructive' });
      return;
    }
    if (!form.cpf_responsavel || !form.endereco || !form.cidade || !form.estado || !form.cep) {
      toast({ title: 'Preencha os dados obrigatórios', description: 'CPF, endereço, cidade, estado e CEP.', variant: 'destructive' });
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke('processar-contratacao', {
        body: {
          nome_responsavel: contato.nome,
          email: contato.email,
          telefone: contato.telefone ?? '',
          tipo_pessoa: form.tipo_pessoa,
          cpf_responsavel: form.cpf_responsavel,
          razao_social: form.tipo_pessoa === 'juridica' ? form.razao_social : null,
          cnpj: form.tipo_pessoa === 'juridica' ? form.cnpj : null,
          endereco: form.endereco,
          numero_endereco: form.numero_endereco,
          complemento_endereco: form.complemento_endereco || null,
          bairro: form.bairro || null,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
          plano_id: form.plano_id,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Falha ao processar contratação');

      const contratacaoId: string | null = data.contratacao_id ?? null;
      const url: string | null = data.signing_url ?? null;

      // Liga o negócio à contratação + move para "Contrato Enviado"
      const etapaContrato = etapas.find((e) => /contrato/i.test(e.nome)) ?? etapas.find((e) => e.tipo === 'aberto');
      atualizarNegocio.mutate({
        id: negocio.id,
        contratacao_id: contratacaoId,
        plano_id: form.plano_id,
        valor_centavos: planoSel?.preco_em_centavos ?? negocio.valor_centavos ?? null,
        etapa_id: etapaContrato?.id ?? negocio.etapa_id,
      });
      // Liga o contato à contratação (best-effort)
      if (contratacaoId && contato.id) {
        await crmFrom('crm_contatos').update({ contratacao_id: contratacaoId }).eq('id', contato.id);
      }

      setSigningUrl(url);
      toast({ title: 'Contratação iniciada', description: 'Contrato gerado. A cobrança é criada automaticamente após a assinatura.' });
    } catch (e) {
      toast({ title: 'Erro na contratação', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  const copy = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-on-lime" /> Iniciar contratação
          </DialogTitle>
          <DialogDescription>
            Gera o contrato (ZapSign) para <strong>{contato?.nome}</strong>. A cobrança InfinitePay é
            criada automaticamente após a assinatura.
          </DialogDescription>
        </DialogHeader>

        {signingUrl ? (
          <div className="space-y-3 rounded-lg border border-on-lime/30 bg-on-lime/5 p-4">
            <p className="text-sm font-medium">Contrato gerado com sucesso 🎉</p>
            <p className="text-xs text-muted-foreground">Link de assinatura do cliente:</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={signingUrl} className="text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(signingUrl)}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => window.open(signingUrl, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">O negócio foi movido para “Contrato Enviado”.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Plano *</Label>
              <Select value={form.plano_id} onValueChange={(v) => setForm((f) => ({ ...f, plano_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  {planosAtivos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_plano} — {formatCurrency(p.preco_em_centavos)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tipo de pessoa *</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v) => setForm((f) => ({ ...f, tipo_pessoa: v as Pessoa }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo_pessoa === 'juridica' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ic-razao">Razão social</Label>
                  <Input id="ic-razao" value={form.razao_social} onChange={set('razao_social')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ic-cnpj">CNPJ</Label>
                  <Input id="ic-cnpj" value={form.cnpj} onChange={set('cnpj')} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ic-cpf">CPF do responsável *</Label>
              <Input id="ic-cpf" value={form.cpf_responsavel} onChange={set('cpf_responsavel')} placeholder="000.000.000-00" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="ic-end">Endereço *</Label>
                <Input id="ic-end" value={form.endereco} onChange={set('endereco')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ic-num">Número</Label>
                <Input id="ic-num" value={form.numero_endereco} onChange={set('numero_endereco')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ic-compl">Complemento</Label>
                <Input id="ic-compl" value={form.complemento_endereco} onChange={set('complemento_endereco')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ic-bairro">Bairro</Label>
                <Input id="ic-bairro" value={form.bairro} onChange={set('bairro')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ic-cidade">Cidade *</Label>
                <Input id="ic-cidade" value={form.cidade} onChange={set('cidade')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ic-uf">UF *</Label>
                <Input id="ic-uf" value={form.estado} onChange={set('estado')} maxLength={2} placeholder="PA" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ic-cep">CEP *</Label>
                <Input id="ic-cep" value={form.cep} onChange={set('cep')} placeholder="66000-000" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {signingUrl ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={enviando}>
                {enviando ? 'Gerando contrato…' : 'Gerar contrato + cobrança'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IniciarContratacaoDialog;
