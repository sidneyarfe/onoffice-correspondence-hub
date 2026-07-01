import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useAdminClients } from '@/hooks/useAdminClients';
import { ClientAvatar, StatusPill, docDe } from './clientes/clientesShared';

interface ClientSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

/** Seletor de cliente com busca — alinhado ao design dark da plataforma (avatar, status, plano). */
const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  onValueChange,
  label = 'Cliente',
  placeholder = 'Pesquisar cliente...',
  required = false,
}) => {
  const { clients } = useAdminClients();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const availableClients = useMemo(() => clients.filter((c) => c.user_id), [clients]);
  const selectedClient = availableClients.find((c) => c.user_id === value) || null;

  const filteredClients = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return availableClients;
    return availableClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        docDe(c).toLowerCase().includes(q),
    );
  }, [availableClients, searchValue]);

  const handleSelect = (userId: string) => {
    onValueChange(userId);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-[12.5px] text-muted-foreground">
          {label} {required && <span className="text-red-400">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-auto min-h-[3rem] w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-[#0e0e11] px-3 py-2 text-left transition-colors hover:border-white/25"
          >
            {selectedClient ? (
              <div className="flex min-w-0 items-center gap-3">
                <ClientAvatar client={selectedClient} size={34} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">{selectedClient.name}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{selectedClient.email}</div>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                <Search className="h-4 w-4" /> {placeholder}
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] border-white/10 bg-card p-0"
        >
          <div className="border-b border-white/[0.06] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar por nome, e-mail ou documento…"
                className="h-9 w-full rounded-[9px] border border-white/10 bg-[#0e0e11] pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-on-lime/50"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-1.5">
            {filteredClients.length === 0 ? (
              <div className="py-6 text-center text-[12.5px] text-muted-foreground/60">
                {searchValue ? 'Nenhum cliente encontrado. Tente outro termo.' : 'Nenhum cliente com acesso provisionado.'}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredClients.map((c) => {
                  const active = value === c.user_id;
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => handleSelect(c.user_id!)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        active ? 'border-on-lime/40 bg-on-lime/[0.06]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      <ClientAvatar client={c} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold">{c.name}</span>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-on-lime" />}
                        </div>
                        <div className="truncate text-[11.5px] text-muted-foreground">{c.email}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusPill status={c.status} short />
                          <span className="truncate text-[10.5px] text-muted-foreground/70">{c.plan || 'Sem plano'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {availableClients.length === 0 && (
        <p className="text-[11.5px] text-amber-300">
          Nenhum cliente com acesso provisionado. Crie a conta do cliente antes de registrar a correspondência.
        </p>
      )}
    </div>
  );
};

export default ClientSearchSelect;
