
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminCorrespondence } from '@/hooks/useAdminCorrespondences';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  correspondence: AdminCorrespondence | null;
  onSuccess: () => void;
}

const EditCorrespondenceModal: React.FC<EditCorrespondenceModalProps> = ({
  isOpen,
  onClose,
  correspondence,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    remetente: '',
    assunto: '',
    descricao: '',
    categoria: 'geral',
    data_recebimento: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (correspondence) {
      setFormData({
        remetente: correspondence.remetente,
        assunto: correspondence.assunto,
        descricao: correspondence.descricao || '',
        categoria: correspondence.categoria,
        data_recebimento: correspondence.data_recebimento
      });
    }
  }, [correspondence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correspondence) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('correspondencias')
        .update({
          remetente: formData.remetente,
          assunto: formData.assunto,
          descricao: formData.descricao || null,
          categoria: formData.categoria,
          data_recebimento: formData.data_recebimento
        })
        .eq('id', correspondence.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Correspondência atualizada com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar correspondência:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar correspondência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Correspondência</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="remetente">Remetente *</Label>
              <Input
                id="remetente"
                value={formData.remetente}
                onChange={(e) => handleInputChange('remetente', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiscal">Fiscal</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="bancario">Bancário</SelectItem>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={formData.assunto}
              onChange={(e) => handleInputChange('assunto', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_recebimento">Data de Recebimento *</Label>
            <Input
              id="data_recebimento"
              type="date"
              value={formData.data_recebimento}
              onChange={(e) => handleInputChange('data_recebimento', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              rows={4}
              placeholder="Descrição detalhada da correspondência..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="on-button">
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCorrespondenceModal;
