import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  Settings,
  KeyRound,
  Copy,
  X,
} from 'lucide-react';
import { useClientBatchImport, ImportClientData } from '@/hooks/useClientBatchImport';
import { useToast } from '@/hooks/use-toast';

interface ClientBatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = 'upload' | 'preview' | 'import' | 'results';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'preview', label: 'Conferência' },
  { key: 'import', label: 'Importar' },
  { key: 'results', label: 'Resultados' },
];

const MAPPING_FIELDS = [
  { key: 'nome_responsavel', label: 'Nome do responsável' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'tipo_pessoa', label: 'Tipo de pessoa (fisica/juridica)' },
  { key: 'produto', label: 'Produto (opcional)' },
  { key: 'oferta', label: 'Oferta (opcional)' },
  { key: 'status_contratacao', label: 'Status do cliente' },
  { key: 'cpf_responsavel', label: 'CPF do responsável' },
  { key: 'razao_social', label: 'Razão social' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'endereco', label: 'Logradouro' },
  { key: 'numero_endereco', label: 'Número' },
  { key: 'complemento_endereco', label: 'Complemento' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'UF' },
  { key: 'cep', label: 'CEP' },
  { key: 'ultimo_pagamento', label: 'Último pagamento' },
  { key: 'proximo_vencimento', label: 'Próximo vencimento' },
];

const selectCls =
  'h-9 w-full cursor-pointer appearance-none rounded-[9px] border border-white/10 bg-[#0e0e11] px-2.5 text-[12.5px] outline-none transition-colors focus:border-on-lime/50';

export const ClientBatchImportModal: React.FC<ClientBatchImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportClientData[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ [key: number]: string[] }>({});
  const [activeStep, setActiveStep] = useState<Step>('upload');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [provisionar, setProvisionar] = useState(true);
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
    cancelImport,
  } = useClientBatchImport();

  const validCount = parsedData.length - Object.keys(validationErrors).length;
  const progressPct = importStats.total === 0 ? 0 : (importStats.processed / importStats.total) * 100;

  const revalidate = (data: ImportClientData[]) => {
    const errors: { [key: number]: string[] } = {};
    data.forEach((client, index) => {
      const e = validateClientData(client);
      if (e.length > 0) errors[index] = e;
    });
    setValidationErrors(errors);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    try {
      setExcelHeaders(await getExcelHeaders(selectedFile));
      const data = await parseExcelFile(selectedFile);
      setParsedData(data);
      revalidate(data);
      setActiveStep('preview');
      toast({ title: 'Arquivo carregado', description: `${data.length} registros encontrados.` });
    } catch (error) {
      toast({ title: 'Erro ao processar arquivo', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleRemapColumns = async () => {
    if (!file) return;
    try {
      const data = await parseExcelFile(file, columnMapping);
      setParsedData(data);
      revalidate(data);
      setShowColumnMapper(false);
      toast({ title: 'Colunas remapeadas', description: `${data.length} registros atualizados.` });
    } catch (error) {
      toast({ title: 'Erro ao remapear colunas', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleStartImport = async () => {
    const validClients = parsedData.filter((_, index) => !validationErrors[index]);
    if (validClients.length === 0) {
      toast({ title: 'Nenhum registro válido', description: 'Corrija os erros antes de importar.', variant: 'destructive' });
      return;
    }
    setActiveStep('import');
    resetStats();
    try {
      await importClients(validClients, { provisionarAcesso: provisionar });
      setActiveStep('results');
      onImportComplete?.();
    } catch (error) {
      toast({ title: 'Erro na importação', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors({});
    setExcelHeaders([]);
    setColumnMapping({});
    setShowColumnMapper(false);
    setActiveStep('upload');
    resetStats();
    onClose();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const downloadResults = () => {
    const rows = importStats.results.map((r) => ({
      nome: r.clientData.nome_responsavel,
      email: r.clientData.email,
      status: r.success ? 'Sucesso' : 'Erro',
      senha_temporaria: r.credentials?.temporaryPassword || '',
      aviso: r.success ? r.error || '' : '',
      erro: r.success ? '' : r.error || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, `importacao_resultados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stepIndex = STEPS.findIndex((s) => s.key === activeStep);
  const canGo = (s: Step) => {
    if (s === 'preview') return !!file;
    if (s === 'import') return parsedData.length > 0;
    if (s === 'results') return importStats.total > 0;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden border-white/10 bg-card p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-on-lime/10 text-on-lime">
            <Users className="h-[18px] w-[18px]" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Importação em lote de clientes</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Crie vários clientes a partir de uma planilha — 100% interno, sem plataforma externa.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-6 py-3">
          {STEPS.map((s, idx) => {
            const active = s.key === activeStep;
            const reachable = canGo(s.key);
            return (
              <React.Fragment key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && setActiveStep(s.key)}
                  className={`flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12.5px] transition-colors ${
                    active
                      ? 'bg-on-lime/12 font-semibold text-on-lime'
                      : reachable
                      ? 'cursor-pointer font-medium text-muted-foreground hover:text-foreground'
                      : 'cursor-not-allowed font-medium text-muted-foreground/40'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
                      idx < stepIndex ? 'bg-on-lime text-on-black' : active ? 'bg-on-lime text-on-black' : 'bg-white/10 text-muted-foreground'
                    }`}
                  >
                    {idx < stepIndex ? '✓' : idx + 1}
                  </span>
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && <span className="h-px w-3 bg-white/10" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="max-h-[66vh] overflow-y-auto px-6 py-5">
          {/* ---------------- Upload ---------------- */}
          {activeStep === 'upload' && (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-white/[0.08] bg-[#0e0e11] p-5">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-on-lime" /> Carregar planilha
                </div>
                <p className="mb-4 text-[12.5px] text-muted-foreground">
                  Envie um arquivo Excel (.xlsx) com os dados dos clientes. Comece pelo template para garantir os nomes das colunas.
                </p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-4 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)]"
                  >
                    <Upload className="h-4 w-4" /> Selecionar arquivo
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
                  >
                    <Download className="h-4 w-4" /> Baixar template
                  </button>
                </div>
                {file && (
                  <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-on-lime/20 bg-on-lime/[0.05] px-3.5 py-2.5 text-[12.5px]">
                    <FileCheck className="h-4 w-4 text-on-lime" /> Arquivo selecionado: <strong>{file.name}</strong>
                  </div>
                )}
              </div>

              {/* Toggle de provisionamento */}
              <ProvisionToggle value={provisionar} onToggle={() => setProvisionar((v) => !v)} />

              <div className="rounded-[12px] border border-white/[0.06] px-4 py-3.5 text-[12.5px] text-muted-foreground">
                <div className="mb-1.5 font-semibold text-foreground">Como preencher</div>
                <ul className="list-inside list-disc space-y-1">
                  <li><b>Obrigatórios:</b> nome_responsavel, email, telefone, tipo_pessoa (fisica/juridica).</li>
                  <li><b>Produto/oferta são opcionais.</b> Se informados, <code className="text-foreground/90">produto</code> + <code className="text-foreground/90">oferta</code> precisam casar (pelo nome) com o catálogo (Produtos/Ofertas); senão a linha é recusada com aviso.</li>
                  <li>O preço, a periodicidade e o tipo (assinatura/avulso) vêm da oferta cadastrada — não da planilha.</li>
                  <li>Datas (ultimo_pagamento, proximo_vencimento) são opcionais.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ---------------- Conferência ---------------- */}
          {activeStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] text-muted-foreground">
                  <strong className="text-foreground">{parsedData.length}</strong> registros ·{' '}
                  <span className="text-on-lime">{validCount} válidos</span>
                  {Object.keys(validationErrors).length > 0 && (
                    <span className="text-red-400"> · {Object.keys(validationErrors).length} com erro</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowColumnMapper((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-white/10 px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-white/25"
                >
                  <Settings className="h-3.5 w-3.5" /> Mapear colunas
                </button>
              </div>

              {showColumnMapper && (
                <div className="rounded-[12px] border border-white/[0.08] bg-[#0e0e11] p-4">
                  <div className="mb-3 text-[12.5px] text-muted-foreground">
                    Associe cada campo do sistema à coluna correspondente da sua planilha.
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {MAPPING_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">{field.label}</label>
                        <select
                          value={columnMapping[field.key] || 'none'}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value === 'none' ? '' : e.target.value }))
                          }
                          className={selectCls}
                        >
                          <option value="none">— Nenhuma —</option>
                          {excelHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowColumnMapper(false)}
                      className="cursor-pointer rounded-[9px] border border-white/10 px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:border-white/25"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemapColumns}
                      className="cursor-pointer rounded-[9px] bg-on-lime px-4 py-2 text-[12.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_18px_rgba(96,255,0,0.3)]"
                    >
                      Aplicar mapeamento
                    </button>
                  </div>
                </div>
              )}

              <div className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto pr-0.5">
                {parsedData.map((client, index) => {
                  const errs = validationErrors[index];
                  return (
                    <div key={index} className="rounded-[11px] border border-white/[0.07] bg-[#0e0e11] px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{client.nome_responsavel || '— sem nome —'}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{client.email}</p>
                          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground/70">
                            {client.oferta
                              ? `${client.produto || '—'} · ${client.oferta}`
                              : 'Sem produto contratado'}{' '}
                            · {client.tipo_pessoa || '—'}
                          </p>
                        </div>
                        {errs ? (
                          <span className="on-pill shrink-0 bg-red-500/15 text-[11px] text-red-300">
                            <XCircle className="h-3 w-3" /> Erro
                          </span>
                        ) : (
                          <span className="on-pill shrink-0 bg-on-lime/15 text-[11px] text-on-lime">
                            <CheckCircle className="h-3 w-3" /> Válido
                          </span>
                        )}
                      </div>
                      {errs && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-500/[0.06] px-2.5 py-2 text-[11.5px] text-red-300">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <ul className="list-inside list-disc">
                            {errs.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------- Importação ---------------- */}
          {activeStep === 'import' && (
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Progresso: {importStats.processed} de {importStats.total}</span>
                  <span className="font-semibold text-on-lime">{Math.round(progressPct)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-on-lime transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="flex justify-center gap-2">
                {isImporting && !isPaused && (
                  <button type="button" onClick={pauseImport} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-white/10 px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:border-white/25">
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </button>
                )}
                {isImporting && isPaused && (
                  <button type="button" onClick={resumeImport} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-white/10 px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:border-white/25">
                    <Play className="h-3.5 w-3.5" /> Retomar
                  </button>
                )}
                {isImporting && (
                  <button type="button" onClick={cancelImport} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-red-500/30 px-3.5 py-2 text-[12.5px] font-medium text-red-300 transition-colors hover:bg-red-500/10">
                    <Square className="h-3.5 w-3.5" /> Cancelar
                  </button>
                )}
              </div>

              {isPaused && (
                <div className="flex items-center gap-2 rounded-[10px] border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-2.5 text-[12.5px] text-amber-200">
                  <Pause className="h-4 w-4" /> Importação pausada. Clique em “Retomar” para continuar.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Stat value={importStats.success} label="Sucessos" tone="lime" />
                <Stat value={importStats.failed} label="Falhas" tone="red" />
                <Stat value={importStats.total - importStats.processed} label="Restantes" tone="muted" />
              </div>

              {importStats.processed > 0 && (
                <div className="flex max-h-[28vh] flex-col gap-1 overflow-y-auto">
                  {importStats.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[12px]">
                      {r.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-on-lime" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                      <span className="flex-1 truncate">{r.clientData.email}</span>
                      {!r.success && <span className="shrink-0 text-[11px] text-red-400">{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- Resultados ---------------- */}
          {activeStep === 'results' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat value={importStats.success} label="Importados" tone="lime" big />
                <Stat value={importStats.failed} label="Falhas" tone="red" big />
                <Stat value={importStats.total} label="Total" tone="muted" big />
              </div>

              <div className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto pr-0.5">
                {importStats.results.map((r, index) => (
                  <div key={index} className="rounded-[11px] border border-white/[0.07] bg-[#0e0e11] px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{r.clientData.nome_responsavel}</p>
                        <p className="truncate text-[12px] text-muted-foreground">{r.clientData.email}</p>
                      </div>
                      {r.success ? (
                        <span className="on-pill shrink-0 bg-on-lime/15 text-[11px] text-on-lime">
                          <CheckCircle className="h-3 w-3" /> Sucesso
                        </span>
                      ) : (
                        <span className="on-pill shrink-0 bg-red-500/15 text-[11px] text-red-300">
                          <XCircle className="h-3 w-3" /> Erro
                        </span>
                      )}
                    </div>

                    {r.success && r.credentials?.temporaryPassword && (
                      <div className="mt-2 flex items-center gap-2 rounded-md border border-white/[0.08] bg-card px-2.5 py-2 text-[12px]">
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-on-lime" />
                        <span className="text-muted-foreground">Senha temporária:</span>
                        <span className="on-num flex-1 truncate font-semibold tracking-wide">{r.credentials.temporaryPassword}</span>
                        <button
                          type="button"
                          onClick={() => copy(r.credentials!.temporaryPassword)}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-on-lime/40 hover:text-on-lime"
                        >
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    )}
                    {r.success && !r.credentials && r.error && (
                      <div className="mt-2 rounded-md bg-amber-400/[0.06] px-2.5 py-2 text-[11.5px] text-amber-200">
                        Criado, mas o acesso não foi provisionado: {r.error}
                      </div>
                    )}
                    {r.success && !r.credentials && !r.error && (
                      <div className="mt-2 text-[11.5px] text-muted-foreground/70">Acesso ao portal não provisionado.</div>
                    )}
                    {!r.success && r.error && (
                      <div className="mt-2 flex items-start gap-2 rounded-md bg-red-500/[0.06] px-2.5 py-2 text-[11.5px] text-red-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
          >
            <X className="h-4 w-4" /> {activeStep === 'results' ? 'Fechar' : 'Cancelar'}
          </button>

          {activeStep === 'preview' && (
            <button
              type="button"
              onClick={handleStartImport}
              disabled={validCount === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-on-lime px-5 py-2.5 text-[13.5px] font-bold text-on-black transition-shadow hover:shadow-[0_0_22px_rgba(96,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> Importar {validCount} cliente{validCount === 1 ? '' : 's'}
            </button>
          )}
          {activeStep === 'results' && (
            <button
              type="button"
              onClick={downloadResults}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2.5 text-[13.5px] font-medium transition-colors hover:border-white/25"
            >
              <Download className="h-4 w-4" /> Baixar relatório
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat: React.FC<{ value: number; label: string; tone: 'lime' | 'red' | 'muted'; big?: boolean }> = ({
  value,
  label,
  tone,
  big,
}) => {
  const color = tone === 'lime' ? 'text-on-lime' : tone === 'red' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="rounded-[11px] border border-white/[0.07] bg-[#0e0e11] px-3 py-3 text-center">
      <div className={`on-num font-bold ${big ? 'text-3xl' : 'text-2xl'} ${color}`}>{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
};

const ProvisionToggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex w-full cursor-pointer items-center gap-3 rounded-[11px] border border-white/[0.08] bg-[#0e0e11] px-3.5 py-3 text-left transition-colors hover:border-white/20"
  >
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-on-lime' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </span>
    <span className="flex-1">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
        <KeyRound className="h-3.5 w-3.5 text-on-lime" /> Provisionar acesso ao portal
      </span>
      <span className="mt-0.5 block text-[11.5px] text-muted-foreground/80">
        Gera login e senha temporária para cada cliente importado. As senhas aparecem nos resultados e no relatório.
      </span>
    </span>
  </button>
);
