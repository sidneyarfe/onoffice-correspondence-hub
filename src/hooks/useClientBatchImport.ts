import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ImportClientData {
  nome_responsavel: string;
  email: string;
  telefone: string;
  produto_selecionado: string;
  plano_selecionado: string;
  tipo_pessoa: string;
  preco: number;
  status_contratacao: string;
  ultimo_pagamento: string;
  proximo_vencimento: string;
  created_at: string;
  cpf_responsavel?: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  numero_endereco?: string;
  complemento_endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  metodo_pagamento?: string;
}

export interface ImportResult {
  success: boolean;
  clientData: ImportClientData;
  error?: string;
  credentials?: {
    email: string;
    temporaryPassword: string;
  };
}

export interface ImportStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  results: ImportResult[];
}

export const useClientBatchImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    results: []
  });
  const { toast } = useToast();

  // Controls for pause/cancel
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);

  const pauseImport = () => {
    pauseRef.current = true;
    setIsPaused(true);
  };
  const resumeImport = () => {
    pauseRef.current = false;
    setIsPaused(false);
  };
  const cancelImport = () => {
    cancelRef.current = true;
  };
  // Helpers: convert Excel serial/date to 'YYYY-MM-DD HH:MM:SS'
  const excelSerialToDate = (serial: number): Date => {
    // Excel serial dates are days since 1899-12-30
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400; // seconds
    const fractionalDay = serial - Math.floor(serial);
    const totalSeconds = Math.round(utcValue + fractionalDay * 86400);
    return new Date(totalSeconds * 1000);
  };

  const formatDateTime = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const parseExcelDate = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
      return formatDateTime(excelSerialToDate(value));
    }
    if (value instanceof Date) {
      return formatDateTime(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // If numeric string (e.g. "45811.78"), treat as Excel serial
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return formatDateTime(excelSerialToDate(parseFloat(trimmed)));
      }
      // Normalize common ISO-like strings: '2025-01-01T10:30:00Z' -> '2025-01-01 10:30:00'
      return trimmed.replace('T', ' ').replace('Z', '');
    }
    return '';
  };

  const getExcelHeaders = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = (rows[0] || []).map((h) => String(h));
          resolve(headers);
        } catch (err) {
          reject(new Error('Erro ao ler cabeçalhos da planilha'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const parseExcelFile = (file: File, columnMap?: Record<string, string>): Promise<ImportClientData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const getVal = (row: any, key: string, aliases: string[] = []) => {
            const mapped = columnMap?.[key];
            const candidates = [mapped, key, ...aliases].filter(Boolean) as string[];
            for (const k of candidates) {
              const v = row[k as any];
              if (v !== undefined && v !== null && v !== '') {
                // Para campos de documento (CPF, CNPJ, CEP), sempre converter para string
                const docFields = ['cpf_responsavel', 'cnpj', 'cep', 'telefone'];
                if (docFields.includes(key) && typeof v === 'number') {
                  return v.toString();
                }
                return v;
              }
            }
            return '';
          };

          const parsedData = jsonData.map((row: any) => ({
            nome_responsavel: getVal(row, 'nome_responsavel'),
            email: getVal(row, 'email'),
            telefone: getVal(row, 'telefone'),
            produto_selecionado: getVal(row, 'produto_selecionado', ['produto_nome']),
            plano_selecionado: getVal(row, 'plano_selecionado'),
            tipo_pessoa: getVal(row, 'tipo_pessoa'),
            preco: parseFloat(getVal(row, 'preco') as string) || 0,
            status_contratacao: getVal(row, 'status_contratacao') || 'ATIVO',
            ultimo_pagamento: parseExcelDate(getVal(row, 'ultimo_pagamento')),
            proximo_vencimento: parseExcelDate(getVal(row, 'proximo_vencimento')),
            created_at: parseExcelDate(getVal(row, 'created_at')) || new Date().toISOString().replace('T', ' ').split('.')[0],
            cpf_responsavel: getVal(row, 'cpf_responsavel'),
            razao_social: getVal(row, 'razao_social'),
            cnpj: getVal(row, 'cnpj'),
            endereco: getVal(row, 'endereco'),
            numero_endereco: getVal(row, 'numero_endereco'),
            complemento_endereco: getVal(row, 'complemento_endereco'),
            bairro: getVal(row, 'bairro'),
            cidade: getVal(row, 'cidade'),
            estado: getVal(row, 'estado'),
            cep: getVal(row, 'cep'),
            metodo_pagamento: getVal(row, 'metodo_pagamento')
          }));
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Erro ao processar arquivo Excel: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const validateClientData = (client: ImportClientData): string[] => {
    const errors: string[] = [];
    
    if (!client.email) errors.push('Email é obrigatório');
    if (!client.nome_responsavel) errors.push('Nome do responsável é obrigatório');
    if (!client.telefone) errors.push('Telefone é obrigatório');
    if (!client.produto_selecionado) errors.push('Produto selecionado é obrigatório');
    if (!client.plano_selecionado) errors.push('Plano selecionado é obrigatório');
    if (!client.tipo_pessoa) errors.push('Tipo de pessoa é obrigatório');
    
    // Validações leves
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push('Email inválido');
    }
    const tipo = (client.tipo_pessoa || '').toLowerCase();
    if (tipo && !['fisica', 'juridica', 'pf', 'pj'].includes(tipo)) {
      errors.push('Tipo de pessoa deve ser: fisica/juridica (ou pf/pj)');
    }
    
    return errors;
  };

  // Helpers para sanitização
  const digitsOnly = (s?: string | number) => {
    if (s === null || s === undefined) return '';
    const str = s.toString();
    return str.replace(/\D/g, '');
  };

  const normalizeTipoPessoa = (v?: string) => {
    const s = (v || '').toLowerCase();
    if (s === 'pf' || s === 'fisica') return 'fisica';
    if (s === 'pj' || s === 'juridica') return 'juridica';
    return s || 'fisica';
  };

  const processClientWithWebhook = async (clientData: ImportClientData): Promise<ImportResult> => {
    try {
      const validationErrors = validateClientData(clientData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          clientData,
          error: validationErrors.join(', ')
        };
      }

      console.log(`Processando cliente via webhook: ${clientData.email}`);

      // Preparar dados para o webhook N8N
      // Normalizar tipo_pessoa
      const tipoPessoa = normalizeTipoPessoa(clientData.tipo_pessoa);
      
      // Preparar payload completo para o webhook - todos os campos devem ser enviados
      const webhookPayload: any = {
        source: 'batch_import',
        nome_responsavel: clientData.nome_responsavel || '',
        email: clientData.email || '',
        telefone: digitsOnly(clientData.telefone) || '',
        produto_selecionado: clientData.produto_selecionado || '',
        plano_selecionado: clientData.plano_selecionado || '',
        tipo_pessoa: tipoPessoa,
        preco: clientData.preco || 0,
        status_contratacao: clientData.status_contratacao || 'ATIVO',
        ultimo_pagamento: clientData.ultimo_pagamento || '',
        proximo_vencimento: clientData.proximo_vencimento || '',
        created_at: clientData.created_at || '',
        cpf_responsavel: digitsOnly(clientData.cpf_responsavel) || '',
        razao_social: clientData.razao_social || '',
        cnpj: digitsOnly(clientData.cnpj) || '',
        endereco: clientData.endereco || '',
        numero_endereco: clientData.numero_endereco || '',
        complemento_endereco: clientData.complemento_endereco || '',
        bairro: clientData.bairro || '',
        cidade: clientData.cidade || '',
        estado: clientData.estado || '',
        cep: digitsOnly(clientData.cep) || '',
        metodo_pagamento: clientData.metodo_pagamento || ''
      };

      console.log('Payload preparado para webhook:', webhookPayload);

      // Chamar o webhook N8N diretamente - ele cuidará de tudo
      const webhookResult = await callN8NWebhookDirectly(webhookPayload);
      
      if (!webhookResult.success) {
        console.warn(`Webhook falhou para ${clientData.email}: ${webhookResult.error}`);
        return {
          success: false,
          clientData,
          error: `Falha no webhook N8N: ${webhookResult.error}`
        };
      }

      console.log(`Webhook executado com sucesso para ${clientData.email}`);

      return {
        success: true,
        clientData,
        credentials: {
          email: clientData.email,
          temporaryPassword: webhookResult.temporaryPassword || 'Processado pelo N8N'
        }
      };

    } catch (error) {
      console.error('Erro ao processar cliente:', error);
      return {
        success: false,
        clientData,
        error: (error as Error).message
      };
    }
  };

  const callN8NWebhookDirectly = async (clientData: any, maxRetries = 3): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
    const WEBHOOK_URL = 'https://sidneyarfe.app.n8n.cloud/webhook/7dd7b139-983a-4cd2-b4ee-224f028b2983';
    
    console.log('Dados que serão enviados para o webhook:', JSON.stringify(clientData, null, 2));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} - Chamando webhook N8N para ${clientData.email}...`);
        
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData)
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Erro desconhecido');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json().catch(() => ({ success: true }));
        console.log(`Webhook N8N executado com sucesso para ${clientData.email}:`, result);
        
        return {
          success: true,
          temporaryPassword: result.temporaryPassword || result.senha_temporaria || 'Processado pelo N8N'
        };

      } catch (error) {
        console.error(`Tentativa ${attempt} falhou para ${clientData.email}:`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Falha após ${maxRetries} tentativas: ${(error as Error).message}`
          };
        }
        
        // Aguardar antes da próxima tentativa (2^attempt segundos)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      error: 'Falha desconhecida após todas as tentativas'
    };
  };

  const importClients = async (clients: ImportClientData[]) => {
    if (clients.length === 0) return;

    setIsImporting(true);
    setImportStats({
      total: clients.length,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    });

    const results: ImportResult[] = [];

    for (let i = 0; i < clients.length; i++) {
      // Check for pause
      while (pauseRef.current && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check for cancel
      if (cancelRef.current) {
        console.log('Import cancelled by user');
        break;
      }

      const client = clients[i];
      console.log(`Processing client ${i + 1}/${clients.length}: ${client.email}`);

      try {
        const result = await processClientWithWebhook(client);
        results.push(result);

        setImportStats(prev => ({
          ...prev,
          processed: i + 1,
          success: prev.success + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
          results: [...prev.results, result]
        }));

        if (result.success) {
          console.log(`✅ Client ${client.email} imported successfully`);
        } else {
          console.error(`❌ Client ${client.email} failed: ${result.error}`);
        }

      } catch (error) {
        console.error(`Error processing client ${client.email}:`, error);
        const failResult: ImportResult = {
          success: false,
          clientData: client,
          error: (error as Error).message
        };
        results.push(failResult);

        setImportStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1,
          results: [...prev.results, failResult]
        }));
      }

      // Small delay between requests to avoid overwhelming the webhook
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsImporting(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);

    toast({
      title: "Importação concluída",
      description: `${results.filter(r => r.success).length} de ${clients.length} clientes importados com sucesso`,
    });
  };

  const downloadTemplate = () => {
    const template = [
      {
        nome_responsavel: 'João Silva',
        email: 'joao@exemplo.com',
        telefone: '11999999999',
        produto_selecionado: 'Endereço Fiscal (Pré-Plataforma)',
        plano_selecionado: 'Plano Anual 995',
        tipo_pessoa: 'fisica',
        preco: 995,
        status_contratacao: 'ATIVO',
        ultimo_pagamento: '2024-01-15 10:30:00',
        proximo_vencimento: '2025-01-15 10:30:00',
        cpf_responsavel: '12345678901',
        razao_social: '',
        cnpj: '',
        endereco: 'Rua das Flores, 123',
        numero_endereco: '123',
        complemento_endereco: 'Apt 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        metodo_pagamento: 'credit_card'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'template_importacao_clientes.xlsx');
  };

  const resetStats = () => {
    setImportStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    });
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);
  };

  return {
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
  };
};