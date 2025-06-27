
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, File } from 'lucide-react';

interface FileUploadFieldProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  loading: boolean;
  uploadProgress: number;
  existingFileUrl?: string | null;
}

const FileUploadField = ({ 
  selectedFile, 
  onFileSelect, 
  loading, 
  uploadProgress, 
  existingFileUrl 
}: FileUploadFieldProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (50MB)
      if (file.size > 52428800) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 50MB",
          variant: "destructive"
        });
        return;
      }

      // Verificar tipo do arquivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas PDF, Word, Excel e imagens são permitidos",
          variant: "destructive"
        });
        return;
      }

      onFileSelect(file);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>Arquivo do Documento</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {!selectedFile && !existingFileUrl && (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Selecionar Arquivo
              </Button>
              <p className="mt-2 text-sm text-gray-500">
                PDF, Word, Excel ou imagens até 50MB
              </p>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <File className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!selectedFile && existingFileUrl && (
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div className="flex items-center space-x-2">
              <File className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Arquivo atual anexado</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Substituir
            </Button>
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Enviando arquivo... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        disabled={loading}
      />
    </div>
  );
};

export default FileUploadField;
