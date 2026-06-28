import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCorrespondenceCategories } from '@/hooks/useCorrespondenceCategories';
import ClientSearchSelect from './ClientSearchSelect';

interface NewCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** quando informado, fixa o cliente (ex.: registrar a partir da ficha) e oculta a busca */
  lockedUserId?: string;
  lockedClientName?: string;
}

const NewCorrespondenceModal: React.FC<NewCorrespondenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lockedUserId,
  lockedClientName,
}) => {
  const { categories } = useCorrespondenceCategories();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    remetente: '',
    assunto: '',
    descricao: '',
    categoria: 'geral'
  });

  // Fixa o cliente quando aberto a partir da ficha (lockedUserId)
  useEffect(() => {
    if (isOpen && lockedUserId) {
      setFormData((prev) => ({ ...prev, user_id: lockedUserId }));
    }
  }, [isOpen, lockedUserId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar tipo de arquivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas PDF, imagens e documentos Word são permitidos.",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const sendToN8nWebhook = async (correspondenceData: Record<string, unknown>) => {
    try {
      const webhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook/3afdd4ab-c39f-46d3-81b9-6776957b2744';

      // Preparar os parâmetros para GET request
      const val = (k: string) => (correspondenceData[k] == null ? '' : String(correspondenceData[k]));
      const params = new URLSearchParams({
        correspondence_id: val('id'),
        user_id: val('user_id'),
        cliente_nome: val('cliente_nome'),
        cliente_email: val('cliente_email'),
        remetente: val('remetente'),
        assunto: val('assunto'),
        descricao: val('descricao'),
        categoria: val('categoria'),
        data_recebimento: val('data_recebimento'),
        arquivo_url: val('arquivo_url'),
        visualizada: val('visualizada'),
        timestamp: new Date().toISOString(),
      });
      
      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.warn('Erro ao enviar para webhook n8n:', response.status);
      } else {
        console.log('Dados enviados com sucesso para o webhook n8n');
      }
    } catch (error) {
      console.warn('Erro ao enviar para webhook n8n:', error);
      // Não bloquear o processo se o webhook falhar
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.remetente || !formData.assunto) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let arquivo_url = null;

      // Upload do arquivo se existir
      if (selectedFile) {
        const fileName = `correspondencia-${Date.now()}-${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('correspondencias')
          .upload(fileName, selectedFile);

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
        }

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage
          .from('correspondencias')
          .getPublicUrl(uploadData.path);
        
        arquivo_url = urlData.publicUrl;
      }

      // Encontrar o nome da categoria para salvar
      const selectedCategory = categories.find(cat => cat.id === formData.categoria || cat.nome === formData.categoria);
      const categoryName = selectedCategory ? selectedCategory.nome : formData.categoria;

      // Inserir correspondência
      const { data: insertData, error: insertError } = await supabase
        .from('correspondencias')
        .insert({
          ...formData,
          categoria: categoryName,
          arquivo_url,
          data_recebimento: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir correspondência:', insertError);
        throw new Error(`Erro ao criar correspondência: ${insertError.message}`);
      }

      // Buscar dados do cliente para enviar ao webhook
      const { data: clientData } = await supabase
        .from('contratacoes_clientes')
        .select('nome_responsavel, email')
        .eq('user_id', formData.user_id)
        .single();

      // Preparar dados para o webhook
      const correspondenceDataForWebhook = {
        ...insertData,
        cliente_nome: clientData?.nome_responsavel || 'Cliente não encontrado',
        cliente_email: clientData?.email || 'Email não encontrado'
      };

      // Enviar dados para o webhook n8n
      await sendToN8nWebhook(correspondenceDataForWebhook);

      // Criar notificação para o cliente
      const { error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          user_id: formData.user_id,
          titulo: 'Nova Correspondência',
          mensagem: `Você recebeu uma nova correspondência: ${formData.assunto}`,
          tipo: 'info'
        });

      if (notifError) {
        console.warn('Erro ao criar notificação:', notifError);
        // Não bloquear o processo se a notificação falhar
      }

      // Registrar atividade
      const { error: atividadeError } = await supabase.rpc('registrar_atividade', {
        p_user_id: formData.user_id,
        p_acao: 'correspondencia_recebida',
        p_descricao: `Nova correspondência adicionada: ${formData.assunto}`
      });

      if (atividadeError) {
        console.warn('Erro ao registrar atividade:', atividadeError);
        // Não bloquear o processo se a atividade falhar
      }

      toast({
        title: "Sucesso!",
        description: "Correspondência criada com sucesso.",
      });

      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        user_id: '',
        remetente: '',
        assunto: '',
        descricao: '',
        categoria: 'geral'
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro ao criar correspondência:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro desconhecido ao criar correspondência.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Correspondência</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          {lockedUserId ? (
            <div>
              <Label>Cliente</Label>
              <div className="mt-1 flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-foreground/90">
                {lockedClientName || 'Cliente selecionado'}
              </div>
            </div>
          ) : (
            <ClientSearchSelect
              value={formData.user_id}
              onValueChange={(value) => handleInputChange('user_id', value)}
              label="Cliente"
              placeholder="Pesquisar cliente por nome, email ou CNPJ..."
              required
            />
          )}

          {/* Remetente */}
          <div>
            <Label htmlFor="remetente">Remetente *</Label>
            <Input
              id="remetente"
              value={formData.remetente}
              onChange={(e) => handleInputChange('remetente', e.target.value)}
              placeholder="Ex: Receita Federal, Prefeitura..."
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.nome}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.cor }}
                      />
                      {category.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assunto */}
          <div>
            <Label htmlFor="assunto">Assunto *</Label>
            <Input
              id="assunto"
              value={formData.assunto}
              onChange={(e) => handleInputChange('assunto', e.target.value)}
              placeholder="Descreva o assunto da correspondência"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={4}
            />
          </div>

          {/* Upload de Arquivo */}
          <div>
            <Label htmlFor="file-input">Anexo</Label>
            <div className="mt-2">
              {selectedFile ? (
                <div className="flex items-center justify-between p-3 bg-white/[0.04] rounded-lg border">
                  <span className="text-sm text-foreground/80">{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/15 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground/70 mx-auto mb-2" />
                  <Label htmlFor="file-input" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">Clique para selecionar um arquivo</span>
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, imagens ou documentos (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Correspondência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewCorrespondenceModal;
