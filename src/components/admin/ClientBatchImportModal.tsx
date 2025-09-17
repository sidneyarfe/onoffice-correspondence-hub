import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Users,
  FileCheck,
  Pause,
  Play,
  Square,
  Settings
} from 'lucide-react';
import { useClientBatchImport, ImportClientData, ImportResult } from '@/hooks/useClientBatchImport';
import { useToast } from '@/hooks/use-toast';

interface ClientBatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ClientBatchImportModal: React.FC<ClientBatchImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportClientData[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: number]: string[]}>({});
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'import' | 'results'>('upload');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    isImporting,
    isPaused,
    importStats,
    parseExcelFile,
    getExcelHeaders,
    importClients,
    downloadTemplate,
    resetStats,
    validateClientData,
    pauseImport,
    resumeImport,
    cancelImport
  } = useClientBatchImport();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    try {
      // Obter headers primeiro
      const headers = await getExcelHeaders(selectedFile);
      setExcelHeaders(headers);
      
      const data = await parseExcelFile(selectedFile);
      setParsedData(data);
      
      // Validar todos os registros
      const errors: {[key: number]: string[]} = {};
      data.forEach((client, index) => {
        const clientErrors = validateClientData(client);
        if (clientErrors.length > 0) {
          errors[index] = clientErrors;
        }
      });
      
      setValidationErrors(errors);
      setActiveTab('preview');
      
      toast({
        title: "Arquivo carregado",
        description: `${data.length} registros encontrados`
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleStartImport = async () => {
    if (parsedData.length === 0) return;
    
    // Filtrar apenas registros válidos
    const validClients = parsedData.filter((_, index) => !validationErrors[index]);
    
    if (validClients.length === 0) {
      toast({
        title: "Nenhum registro válido",
        description: "Corrija os erros antes de importar",
        variant: "destructive"
      });
      return;
    }

    setActiveTab('import');
    resetStats();
    
    try {
      await importClients(validClients);
      setActiveTab('results');
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleRemapColumns = async () => {
    if (!file) return;
    
    try {
      const data = await parseExcelFile(file, columnMapping);
      setParsedData(data);
      
      // Revalidar com novos dados
      const errors: {[key: number]: string[]} = {};
      data.forEach((client, index) => {
        const clientErrors = validateClientData(client);
        if (clientErrors.length > 0) {
          errors[index] = clientErrors;
        }
      });
      
      setValidationErrors(errors);
      setShowColumnMapper(false);
      
      toast({
        title: "Colunas remapeadas",
        description: `${data.length} registros atualizados`
      });
    } catch (error) {
      toast({
        title: "Erro ao remapear colunas",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const requiredFields = [
    { key: 'nome_responsavel', label: 'Nome do Responsável' },
    { key: 'email', label: 'Email' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'produto_selecionado', label: 'Produto Selecionado' },
    { key: 'plano_selecionado', label: 'Plano Selecionado' },
    { key: 'tipo_pessoa', label: 'Tipo de Pessoa' },
    { key: 'preco', label: 'Preço' },
    { key: 'status_contratacao', label: 'Status Contratação' },
    { key: 'ultimo_pagamento', label: 'Último Pagamento' },
    { key: 'proximo_vencimento', label: 'Próximo Vencimento' },
    { key: 'created_at', label: 'Data de Criação' }
  ];

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors({});
    setExcelHeaders([]);
    setColumnMapping({});
    setShowColumnMapper(false);
    setActiveTab('upload');
    resetStats();
    onClose();
  };

  const getProgressPercentage = () => {
    if (importStats.total === 0) return 0;
    return (importStats.processed / importStats.total) * 100;
  };

  const downloadResults = () => {
    const results = importStats.results.map(result => ({
      email: result.clientData.email,
      nome: result.clientData.nome_responsavel,
      status: result.success ? 'Sucesso' : 'Erro',
      erro: result.error || '',
      senha_temporaria: result.credentials?.temporaryPassword || ''
    }));

    const worksheet = require('xlsx').utils.json_to_sheet(results);
    const workbook = require('xlsx').utils.book_new();
    require('xlsx').utils.book_append_sheet(workbook, worksheet, 'Resultados');
    require('xlsx').writeFile(workbook, `importacao_resultados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Importação em Lote de Clientes
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">1. Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={!file}>2. Preview</TabsTrigger>
            <TabsTrigger value="import" disabled={parsedData.length === 0}>3. Importar</TabsTrigger>
            <TabsTrigger value="results" disabled={importStats.total === 0}>4. Resultados</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Carregar Planilha
                </CardTitle>
                <CardDescription>
                  Faça upload da planilha Excel (.xlsx) com os dados dos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar Arquivo
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Template
                  </Button>
                </div>

                {file && (
                  <Alert>
                    <FileCheck className="w-4 h-4" />
                    <AlertDescription>
                      Arquivo selecionado: <strong>{file.name}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-gray-600">
                  <h4 className="font-medium mb-2">Campos obrigatórios na planilha:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>email, nome_responsável, telefone</li>
                    <li>produto_nome, plano_nome (novos campos)</li>
                    <li>tipo_pessoa (fisica, juridica)</li>
                    <li>ultimo_pagamento (DD/MM/AAAA)</li>
                    <li>endereco, cidade, estado, cep</li>
                    <li>plano_selecionado (1 ANO, 6 MESES, 1 MES) - compatibilidade</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Preview dos Dados
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColumnMapper(!showColumnMapper)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Mapear Colunas
                  </Button>
                </CardTitle>
                <CardDescription>
                  {parsedData.length} registros encontrados. 
                  {Object.keys(validationErrors).length > 0 && 
                    ` ${Object.keys(validationErrors).length} com erros.`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showColumnMapper && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
                      <CardDescription>
                        Selecione qual coluna da planilha corresponde a cada campo obrigatório
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {requiredFields.map((field) => (
                          <div key={field.key} className="space-y-2">
                            <label className="text-sm font-medium">{field.label}</label>
                            <Select
                              value={columnMapping[field.key] || ''}
                              onValueChange={(value) => 
                                setColumnMapping(prev => ({ ...prev, [field.key]: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar coluna..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-- Nenhuma --</SelectItem>
                                {excelHeaders.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowColumnMapper(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleRemapColumns}>
                          Aplicar Mapeamento
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {parsedData.map((client, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{client.nome_responsavel}</p>
                            <p className="text-sm text-gray-600">{client.email}</p>
                            <p className="text-sm text-gray-500">
                              {client.produto_selecionado || client.plano_selecionado} • {client.plano_selecionado || 'Plano Padrão'} • {client.tipo_pessoa}
                            </p>
                          </div>
                          <div>
                            {validationErrors[index] ? (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Válido
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {validationErrors[index] && (
                          <Alert className="mt-2">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>
                              <ul className="list-disc list-inside">
                                {validationErrors[index].map((error, errorIndex) => (
                                  <li key={errorIndex}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Registros válidos: {parsedData.length - Object.keys(validationErrors).length}
                  </div>
                  <Button 
                    onClick={handleStartImport}
                    disabled={parsedData.length - Object.keys(validationErrors).length === 0}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Iniciar Importação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importação em Progresso</CardTitle>
                <CardDescription>
                  Processando clientes... Por favor, aguarde.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso: {importStats.processed} de {importStats.total}</span>
                      <span>{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="w-full" />
                  </div>

                  {/* Controles de Importação */}
                  <div className="flex justify-center gap-2">
                    {isImporting && !isPaused && (
                      <Button variant="outline" onClick={pauseImport} className="flex items-center gap-2">
                        <Pause className="w-4 h-4" />
                        Pausar
                      </Button>
                    )}
                    {isImporting && isPaused && (
                      <Button variant="outline" onClick={resumeImport} className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Retomar
                      </Button>
                    )}
                    {isImporting && (
                      <Button variant="destructive" onClick={cancelImport} className="flex items-center gap-2">
                        <Square className="w-4 h-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>

                  {isPaused && (
                    <Alert>
                      <Pause className="w-4 h-4" />
                      <AlertDescription>
                        Importação pausada. Clique em "Retomar" para continuar.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                    <div className="text-sm text-gray-600">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                    <div className="text-sm text-gray-600">Falhas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importStats.total - importStats.processed}</div>
                    <div className="text-sm text-gray-600">Restantes</div>
                  </div>
                </div>

                {importStats.processed > 0 && (
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {importStats.results.map((result, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="flex-1">{result.clientData.email}</span>
                          {!result.success && (
                            <span className="text-red-600 text-xs">{result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultados da Importação</CardTitle>
                <CardDescription>
                  Importação concluída! Veja o resumo abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">{importStats.success}</div>
                      <div className="text-sm text-gray-600">Clientes Importados</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{importStats.failed}</div>
                      <div className="text-sm text-gray-600">Falhas</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">{importStats.total}</div>
                      <div className="text-sm text-gray-600">Total Processados</div>
                    </CardContent>
                  </Card>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {importStats.results.map((result, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{result.clientData.nome_responsavel}</p>
                            <p className="text-sm text-gray-600">{result.clientData.email}</p>
                            {result.success && result.credentials && (
                              <p className="text-sm text-green-600">Credenciais enviadas por email</p>
                            )}
                          </div>
                          <div>
                            {result.success ? (
                              <Badge variant="default">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {!result.success && result.error && (
                          <Alert className="mt-2">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>{result.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button onClick={downloadResults} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Relatório
                  </Button>
                  <Button onClick={handleClose}>
                    Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};