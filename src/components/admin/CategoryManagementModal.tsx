import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useCorrespondenceCategories } from '@/hooks/useCorrespondenceCategories';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorOptions = [
  { value: 'red', label: 'Vermelho', bg: 'bg-red-50', text: 'text-red-800' },
  { value: 'blue', label: 'Azul', bg: 'bg-blue-50', text: 'text-blue-800' },
  { value: 'green', label: 'Verde', bg: 'bg-green-50', text: 'text-green-800' },
  { value: 'purple', label: 'Roxo', bg: 'bg-purple-50', text: 'text-purple-800' },
  { value: 'orange', label: 'Laranja', bg: 'bg-orange-50', text: 'text-orange-800' },
  { value: 'yellow', label: 'Amarelo', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  { value: 'gray', label: 'Cinza', bg: 'bg-gray-50', text: 'text-gray-800' },
];

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, loading, createCategory, updateCategory, deleteCategory, canDeleteCategory } = useCorrespondenceCategories();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: 'gray'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', cor: 'gray' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a categoria.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast({
          title: "Sucesso!",
          description: "Categoria atualizada com sucesso.",
        });
      } else {
        await createCategory(formData);
        toast({
          title: "Sucesso!",
          description: "Categoria criada com sucesso.",
        });
      }
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao salvar categoria.',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: any) => {
    setFormData({
      nome: category.nome,
      descricao: category.descricao || '',
      cor: category.cor
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: any) => {
    try {
      await deleteCategory(category.id);
      toast({
        title: "Sucesso!",
        description: "Categoria excluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao excluir categoria.',
        variant: "destructive"
      });
    }
  };

  const getCategoryBadge = (category: any) => {
    const colorConfig = colorOptions.find(c => c.value === category.cor) || colorOptions.find(c => c.value === 'gray')!;
    return (
      <Badge className={`${colorConfig.bg} ${colorConfig.text}`}>
        {category.nome}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botão Nova Categoria */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          )}

          {/* Formulário */}
          {showForm && (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => handleInputChange('nome', e.target.value)}
                        placeholder="Ex: Previdenciário"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cor">Cor</Label>
                      <Select value={formData.cor} onValueChange={(value) => handleInputChange('cor', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${option.bg} border`}></div>
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => handleInputChange('descricao', e.target.value)}
                      placeholder="Descreva o tipo de correspondências desta categoria"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Salvando...' : (editingCategory ? 'Atualizar' : 'Criar')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de Categorias */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Categorias Existentes</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando categorias...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryBadge(category)}
                          {category.is_system && (
                            <Badge variant="outline" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                        </div>
                        {category.descricao && (
                          <p className="text-sm text-gray-600">{category.descricao}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          className="p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {canDeleteCategory(category) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a categoria "{category.nome}"?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(category)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagementModal;