
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdminDocument } from '@/hooks/useAdminDocuments';
import { Loader2 } from 'lucide-react';
import DocumentFormFields from './document-form/DocumentFormFields';
import FileUploadField from './document-form/FileUploadField';
import { useDocumentFormLogic } from './document-form/useDocumentFormLogic';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: AdminDocument | null;
  onSuccess: () => void;
}

const DocumentFormModal = ({ isOpen, onClose, document, onSuccess }: DocumentFormModalProps) => {
  const {
    formData,
    setFormData,
    selectedFile,
    setSelectedFile,
    loading,
    uploadProgress,
    handleSubmit,
    resetForm
  } = useDocumentFormLogic(document, onSuccess, onClose);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [document, isOpen, resetForm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
          <DialogDescription>
            {document ? 'Edite as informações do documento.' : 'Crie um novo documento para disponibilizar aos clientes.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <DocumentFormFields
            formData={formData}
            onFormDataChange={setFormData}
            loading={loading}
          />

          <FileUploadField
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            loading={loading}
            uploadProgress={uploadProgress}
            existingFileUrl={document?.arquivo_url}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadProgress > 0 && uploadProgress < 100 ? 'Enviando...' : 'Salvando...'}
                </>
              ) : (
                document ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentFormModal;
