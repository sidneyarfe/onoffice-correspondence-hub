import React, { useCallback, useEffect, useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { registrarAtividade } from '@/utils/atividade';

interface DocAdmin {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  disponivel_por_padrao: boolean;
}
interface Disp {
  id: string;
  documento_tipo: string;
  disponivel: boolean;
}

interface EnderecoFiscalDocsProps {
  userId?: string | null;
  clientName: string;
}

/**
 * Gestão dos documentos de ENDEREÇO FISCAL disponíveis para o cliente.
 * Lista o catálogo (`documentos_admin`) e libera/oculta cada tipo para este cliente,
 * persistindo em `documentos_disponibilidade` (user_id + documento_tipo + disponivel).
 */
const EnderecoFiscalDocs: React.FC<EnderecoFiscalDocsProps> = ({ userId, clientName }) => {
  const { toast } = useToast();
  const [catalogo, setCatalogo] = useState<DocAdmin[]>([]);
  const [disp, setDisp] = useState<Disp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, dispRes] = await Promise.all([
        supabase.from('documentos_admin').select('id, tipo, nome, descricao, disponivel_por_padrao').order('nome'),
        userId
          ? supabase.from('documentos_disponibilidade').select('id, documento_tipo, disponivel').eq('user_id', userId)
          : Promise.resolve({ data: [] as Disp[] }),
      ]);
      setCatalogo((adminRes.data ?? []) as DocAdmin[]);
      setDisp((dispRes.data ?? []) as Disp[]);
    } catch (err) {
      console.error('Erro ao carregar documentos do endereço fiscal:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const estaDisponivel = (doc: DocAdmin) => {
    const rec = disp.find((d) => d.documento_tipo === doc.tipo);
    return rec ? rec.disponivel : doc.disponivel_por_padrao;
  };

  const toggle = async (doc: DocAdmin) => {
    if (!userId) return;
    const novo = !estaDisponivel(doc);
    setBusy(doc.id);
    const existing = disp.find((d) => d.documento_tipo === doc.tipo);
    try {
      if (existing) {
        const { error } = await supabase
          .from('documentos_disponibilidade')
          .update({ disponivel: novo, updated_at: new Date().toISOString() } as never)
          .eq('id', existing.id);
        if (error) throw error;
        setDisp((prev) => prev.map((d) => (d.id === existing.id ? { ...d, disponivel: novo } : d)));
      } else {
        const { data, error } = await supabase
          .from('documentos_disponibilidade')
          .insert({ user_id: userId, documento_tipo: doc.tipo, disponivel: novo } as never)
          .select('id, documento_tipo, disponivel')
          .single();
        if (error) throw error;
        setDisp((prev) => [...prev, data as Disp]);
      }
      registrarAtividade(
        userId,
        'documento_disponibilidade',
        `Documento "${doc.nome}" ${novo ? 'liberado' : 'ocultado'} para o cliente`,
      );
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a disponibilidade.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 border-t border-white/[0.05] pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
        <ShieldCheck className="h-3.5 w-3.5" /> Documentos do endereço fiscal
      </div>

      {!userId ? (
        <div className="rounded-lg border border-dashed border-white/[0.1] px-3 py-3 text-[12px] text-muted-foreground/60">
          Provisione o acesso do cliente para liberar documentos.
        </div>
      ) : loading ? (
        <div className="py-2 text-[12px] text-muted-foreground/60">Carregando…</div>
      ) : catalogo.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/[0.1] px-3 py-3 text-[12px] text-muted-foreground/60">
          Nenhum documento de endereço fiscal cadastrado no catálogo (aba Documentos do admin).
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {catalogo.map((doc) => {
            const on = estaDisponivel(doc);
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{doc.nome}</div>
                  <div className="truncate text-[11px] text-muted-foreground/70">{doc.tipo}</div>
                </div>
                <span className={`shrink-0 text-[10.5px] font-medium ${on ? 'text-on-lime' : 'text-muted-foreground/60'}`}>
                  {on ? 'Disponível' : 'Oculto'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? 'Ocultar' : 'Liberar'} ${doc.nome}`}
                  disabled={busy === doc.id}
                  onClick={() => toggle(doc)}
                  className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full px-[3px] transition-colors disabled:opacity-50 ${
                    on ? 'justify-end bg-on-lime' : 'justify-start bg-white/15'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnderecoFiscalDocs;
