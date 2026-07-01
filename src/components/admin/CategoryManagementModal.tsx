import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Tag, Check, X, Loader2 } from 'lucide-react';
import { useCorrespondenceCategories, type CorrespondenceCategory } from '@/hooks/useCorrespondenceCategories';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Paleta livre de cores (hex) — armazenada direto em `cor` e usada como cor CSS na tabela.
const SWATCHES = [
  '#60FF00', '#3B82F6', '#A78BFA', '#F472B6', '#FBBF24',
  '#F97316', '#F87171', '#22D3EE', '#34D399', '#94A3B8',
];

const inputCls =
  'h-9 w-full rounded-lg border border-white/10 bg-[#141418] px-3 text-[13px] outline-none transition-colors focus:border-on-lime/50';

const Swatch: React.FC<{ color: string; active: boolean; onClick: () => void }> = ({ color, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={color}
    aria-label={`Cor ${color}`}
    className={`h-6 w-6 cursor-pointer rounded-full transition-transform hover:scale-110 ${
      active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e0e11]' : 'ring-1 ring-white/10'
    }`}
    style={{ backgroundColor: color }}
  />
);

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({ isOpen, onClose }) => {
  const { categories, loading, createCategory, updateCategory, deleteCategory, countCategoryUsage } =
    useCorrespondenceCategories();
  const { toast } = useToast();

  // criação inline
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState(SWATCHES[0]);
  const [creating, setCreating] = useState(false);

  // edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState(SWATCHES[0]);

  // confirmação de exclusão inline
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCreate = async () => {
    const nome = newNome.trim();
    if (!nome) return;
    setCreating(true);
    try {
      await createCategory({ nome, cor: newCor });
      setNewNome('');
      setNewCor(SWATCHES[0]);
      toast({ title: 'Tag criada', description: `"${nome}" adicionada.` });
    } catch (error) {
      toast({
        title: 'Erro ao criar tag',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: CorrespondenceCategory) => {
    setConfirmId(null);
    setEditingId(cat.id);
    setEditNome(cat.nome);
    setEditCor(cat.cor || SWATCHES[0]);
  };

  const handleSaveEdit = async (cat: CorrespondenceCategory) => {
    const nome = editNome.trim();
    if (!nome) return;
    setBusyId(cat.id);
    try {
      await updateCategory(cat.id, { nome, cor: editCor });
      setEditingId(null);
      toast({ title: 'Tag atualizada' });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cat: CorrespondenceCategory) => {
    setBusyId(cat.id);
    try {
      const usos = await countCategoryUsage(cat.nome);
      await deleteCategory(cat.id);
      setConfirmId(null);
      toast({
        title: 'Tag removida',
        description:
          usos > 0
            ? `"${cat.nome}" excluída. ${usos} correspondência(s) mantêm o rótulo antigo.`
            : `"${cat.nome}" excluída.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-[#0b0b0d]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
              <Tag className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[16px] font-bold">Tags de correspondência</div>
              <div className="text-[12px] font-normal text-muted-foreground">
                Crie, renomeie, recolora ou remova livremente.
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Criar nova tag (inline, sempre visível) */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0e11] p-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: newCor }} />
            <input
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Nome da nova tag…"
              className={inputCls}
            />
            <button
              onClick={handleCreate}
              disabled={!newNome.trim() || creating}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-on-lime px-3 text-[13px] font-semibold text-on-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-5">
            {SWATCHES.map((c) => (
              <Swatch key={c} color={c} active={newCor === c} onClick={() => setNewCor(c)} />
            ))}
          </div>
        </div>

        {/* Lista de tags */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando tags…
          </div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Nenhuma tag ainda.</div>
        ) : (
          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-0.5">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const isConfirming = confirmId === cat.id;
              const busy = busyId === cat.id;

              if (isEditing) {
                return (
                  <div key={cat.id} className="rounded-xl border border-on-lime/25 bg-[#0e0e11] p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: editCor }} />
                      <input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(cat);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className={inputCls}
                      />
                      <button
                        onClick={() => handleSaveEdit(cat)}
                        disabled={!editNome.trim() || busy}
                        title="Salvar"
                        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-on-lime text-on-black transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        title="Cancelar"
                        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-5">
                      {SWATCHES.map((c) => (
                        <Swatch key={c} color={c} active={editCor === c} onClick={() => setEditCor(c)} />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e11] px-3.5 py-2.5"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.cor || '#94A3B8' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium">{cat.nome}</span>
                      {cat.is_system && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-px text-[10px] font-semibold text-muted-foreground">
                          padrão
                        </span>
                      )}
                    </div>
                    {cat.descricao && (
                      <div className="truncate text-[11.5px] text-muted-foreground/70">{cat.descricao}</div>
                    )}
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-muted-foreground">Excluir?</span>
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={busy}
                        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-red-500/15 px-2.5 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/25"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        title="Editar"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
                      >
                        <Pencil className="h-[15px] w-[15px]" />
                      </button>
                      <button
                        onClick={() => setConfirmId(cat.id)}
                        title="Excluir"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-300"
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagementModal;
