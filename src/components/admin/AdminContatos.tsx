import { useMemo, useState } from 'react';
import { Search, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCrmContatos } from '@/hooks/useCrm';
import { ORIGEM_LABEL, type CrmOrigem } from '@/integrations/supabase/crm';

const ORIGENS: CrmOrigem[] = ['google_ads', 'meta_ads', 'site', 'manual', 'indicacao', 'outro'];

const AdminContatos = () => {
  const { data: contatos = [], isLoading } = useCrmContatos();
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('all');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter((c) => {
      if (filtroOrigem !== 'all' && c.origem !== filtroOrigem) return false;
      if (q) {
        const hay = `${c.nome} ${c.email ?? ''} ${c.telefone ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contatos, busca, filtroOrigem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contatos</h1>
        <p className="text-muted-foreground">
          Todos os leads e contatos capturados — {contatos.length} no total
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone…" className="pl-9" />
        </div>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {ORIGENS.map((o) => <SelectItem key={o} value={o}>{ORIGEM_LABEL[o]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-on-lime" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-center">Negócios</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum contato encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-on-lime">
                              <Mail className="h-3.5 w-3.5" /> {c.email}
                            </a>
                          )}
                          {c.telefone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" /> {c.telefone}
                            </span>
                          )}
                          {!c.email && !c.telefone && '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{ORIGEM_LABEL[c.origem]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.tags.length === 0 && <span className="text-xs text-muted-foreground/50">—</span>}
                          {c.tags.map((t) => (
                            <span
                              key={t.id}
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: (t.cor ?? '#64748b') + '22', color: t.cor ?? '#94a3b8' }}
                            >
                              {t.nome}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{c.total_negocios}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {c.contratacao_id ? (
                          <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                            <CheckCircle2 className="h-3 w-3" /> Em contratação
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal">Lead</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminContatos;
