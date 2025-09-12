import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAdminClients } from '@/hooks/useAdminClients';

interface ClientSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  onValueChange,
  label = "Cliente",
  placeholder = "Pesquisar cliente...",
  required = false
}) => {
  const { clients } = useAdminClients();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Filtrar apenas clientes com user_id
  const availableClients = clients.filter(client => client.user_id);

  // Encontrar cliente selecionado
  const selectedClient = availableClients.find(client => client.user_id === value);

  // Filtrar clientes baseado na busca
  const filteredClients = availableClients.filter(client => {
    const searchTerm = searchValue.toLowerCase();
    return client.name.toLowerCase().includes(searchTerm) ||
           client.email.toLowerCase().includes(searchTerm) ||
           (client.cnpj && client.cnpj.includes(searchTerm));
  });

  const handleSelect = (clientUserId: string) => {
    onValueChange(clientUserId);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto"
          >
            {selectedClient ? (
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-gray-100 rounded-full">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-sm text-gray-500">{selectedClient.email}</div>
                  {selectedClient.cnpj && (
                    <div className="text-xs text-gray-400">CNPJ: {selectedClient.cnpj}</div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 flex items-center gap-2">
                <Search className="w-4 h-4" />
                {placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b">
              <Input 
                placeholder="Digite para buscar cliente..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-8"
              />
            </div>
            
            <ScrollArea className="max-h-[300px]">
              {filteredClients.length === 0 ? (
                <div className="text-center py-6">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum cliente encontrado</p>
                  {searchValue && (
                    <p className="text-xs text-gray-400 mt-1">
                      Tente ajustar os termos de busca
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-1">
                  {filteredClients.map((client) => (
                    <Button
                      key={client.user_id}
                      variant="ghost"
                      onClick={() => handleSelect(client.user_id!)}
                      className="w-full justify-start h-auto p-3 text-left"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === client.user_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                          {client.cnpj && (
                            <div className="text-xs text-gray-400">CNPJ: {client.cnpj}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Status: {client.status} • Plano: {client.plan || 'Não definido'}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {availableClients.length === 0 && (
        <p className="text-sm text-yellow-600">
          Nenhum cliente disponível. Certifique-se de que os clientes tenham contas de usuário criadas.
        </p>
      )}
    </div>
  );
};

export default ClientSearchSelect;