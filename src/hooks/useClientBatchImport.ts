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

  // Helpers para sanitização e geração de documentos válidos
  const digitsOnly = (s?: string | number) => {
    if (s === null || s === undefined) return '';
    const str = s.toString();
    return str.replace(/\D/g, '');
  };

  const isValidCPF = (cpfInput: string): boolean => {
    const cpf = digitsOnly(cpfInput);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;
    if (rev !== parseInt(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev >= 10) rev = 0;
    return rev === parseInt(cpf[10]);
  };

  const generateValidCPF = (): string => {
    const rand = () => Math.floor(Math.random() * 9);
    let n: number[] = Array.from({ length: 9 }, () => rand());
    // Evitar todos iguais
    if (new Set(n).size === 1) n[0] = (n[0] + 1) % 10;
    let d1 = 0;
    for (let i = 0; i < 9; i++) d1 += n[i] * (10 - i);
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;
    let d2 = 0;
    for (let i = 0; i < 9; i++) d2 += n[i] * (11 - i);
    d2 += d1 * 2;
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;
    return [...n, d1, d2].join('');
  };

  const isValidCNPJ = (cnpjInput: string): boolean => {
    const cnpj = digitsOnly(cnpjInput);
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cnpj[i]) * weights1[i];
    let d1 = sum % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cnpj[i]) * weights2[i];
    let d2 = sum % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    return d1 === parseInt(cnpj[12]) && d2 === parseInt(cnpj[13]);
  };

  const generateValidCNPJ = (): string => {
    // base de 12 dígitos aleatórios
    const rand = () => Math.floor(Math.random() * 9);
    const n: number[] = Array.from({ length: 12 }, () => rand());
    if (new Set(n).size === 1) n[0] = (n[0] + 1) % 10;
    const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += n[i] * weights1[i];
    let d1 = sum % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    sum = 0;
    for (let i = 0; i < 13; i++) sum += (i < 12 ? n[i] : d1) * weights2[i];
    let d2 = sum % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    return [...n, d1, d2].join('');
  };

  const textOr = (v: any, def: string) => {
    if (v === null || v === undefined) return def;
    const s = v.toString().trim();
    return s === '' ? def : s;
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

  const findProductAndPlanIds = async (productName: string, planName: string) => {
    try {
      // Buscar produto por nome
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select('id')
        .eq('nome_produto', productName)
        .single();

      if (produtoError || !produto) {
        return {
          produto_id: null,
          plano_id: null,
          error: `Produto '${productName}' não encontrado`
        };
      }

      // Buscar plano por nome e produto_id
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select('id')
        .eq('nome_plano', planName)
        .eq('produto_id', produto.id)
        .single();

      if (planoError || !plano) {
        return {
          produto_id: produto.id,
          plano_id: null,
          error: `Plano '${planName}' não encontrado para o produto '${productName}'`
        };
      }

      return {
        produto_id: produto.id,
        plano_id: plano.id,
        error: null
      };
    } catch (error) {
      return {
        produto_id: null,
        plano_id: null,
        error: `Erro ao buscar produto/plano: ${(error as Error).message}`
      };
    }
  };

  const addClientePlanoFromContract = async (contractId: string, planoId: string, clientData: ImportClientData) => {
    try {
      // Converter datas sem fuso (apenas parte de data)
      const dataInicio = (clientData.ultimo_pagamento || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const proximoVencimento = (clientData.proximo_vencimento || '').slice(0, 10) || dataInicio;

      // Adicionar à tabela cliente_planos
      const { error } = await supabase
        .from('cliente_planos')
        .insert({
          cliente_id: contractId,
          plano_id: planoId,
          data_inicio: dataInicio,
          proximo_vencimento: proximoVencimento,
          status: 'ativo',
          data_ultimo_pagamento: dataInicio,
          valor_pago_centavos: Math.round(clientData.preco * 100)
        });

      if (error) {
        console.error('Erro ao adicionar plano ao cliente:', error);
      }
    } catch (error) {
      console.error('Erro ao processar plano do cliente:', error);
    }
  };


  // Nova função para chamar webhook N8N com retry
  const callN8NWebhookWithRetry = async (contractId: string, clientData: ImportClientData, maxRetries = 3): Promise<{success: boolean, error?: string, temporaryPassword?: string}> => {
    const webhookUrl = 'https://sidneyarfe.app.n8n.cloud/webhook/7dd7b139-983a-4cd2-b4ee-224f028b2983';
    
    // Montar payload DINÂMICO com TODOS os campos mapeados (enviar "" quando vazio)
    const dynamicData: Record<string, any> = {};
    Object.entries(clientData).forEach(([key, value]) => {
      const isDocField = ['cpf_responsavel', 'cnpj', 'cep', 'telefone'].includes(key);
      let out: any = value;
      if (isDocField) {
        out = digitsOnly(value as any);
      }
      if (out === undefined || out === null) out = '';
      dynamicData[key] = out;
    });

    const webhookData = {
      id: contractId,
      source: 'batch_import',
      ...dynamicData,
    } as Record<string, any>;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} webhook para ${clientData.email}`);
        console.log('Payload enviado ao n8n (mapeado):', webhookData);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(`Webhook sucesso para ${clientData.email}:`, result);
        
        return {
          success: true,
          temporaryPassword: result.temporaryPassword || result.senha || 'Gerada com sucesso'
        };

      } catch (error) {
        console.error(`Tentativa ${attempt} falhou:`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Todas as ${maxRetries} tentativas falharam. Último erro: ${(error as Error).message}`
          };
        }
        
        // Esperar antes da próxima tentativa (backoff exponencial)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: 'Número máximo de tentativas excedido' };
  };

  const calculateNextDueDate = async (lastPayment: string, plan: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('calcular_proximo_vencimento', {
          p_data_contratacao: lastPayment,
          p_plano: plan
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao calcular próximo vencimento:', error);
      return null;
    }
  };

  const importClients = async (clients: ImportClientData[]) => {
    setIsImporting(true);
    cancelRef.current = false;

    const stats: ImportStats = {
      total: clients.length,
      processed: 0,
      success: 0,
      failed: 0,
      results: []
    };

    setImportStats(stats);

    for (let i = 0; i < clients.length; i++) {
      if (cancelRef.current) {
        break;
      }

      // Pause handling
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 300));
        if (cancelRef.current) break;
      }
      if (cancelRef.current) break;

      const client = clients[i];
      
      try {
        const result = await processClientWithWebhook(client);
        
        stats.results.push(result);
        stats.processed++;
        
        if (result.success) {
          stats.success++;
        } else {
          stats.failed++;
        }
        
        setImportStats({ ...stats });
        
        // Delay entre processamentos para não sobrecarregar o webhook N8N
        if (i < clients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        stats.results.push({
          success: false,
          clientData: client,
          error: (error as Error).message
        });
        stats.processed++;
        stats.failed++;
        setImportStats({ ...stats });
      }
    }

    setIsImporting(false);

    if (cancelRef.current) {
      toast({
        title: 'Importação cancelada',
        description: `${importStats.processed} processados antes do cancelamento`,
        variant: 'destructive'
      });
      cancelRef.current = false;
      pauseRef.current = false;
      setIsPaused(false);
      return;
    }
    
    toast({
      title: "Importação Concluída",
      description: `${stats.success} clientes importados com sucesso, ${stats.failed} falhas`,
      variant: stats.failed > 0 ? "destructive" : "default"
    });
  };

  const downloadTemplate = () => {
    const templateData = [{
      nome_responsavel: 'João Silva',
      email: 'cliente@exemplo.com',
      telefone: '(11) 99999-9999',
      produto_selecionado: 'Endereço Fiscal',
      plano_selecionado: 'Plano Anual 995',
      tipo_pessoa: 'fisica',
      preco: 995,
      status_contratacao: 'ATIVO',
      ultimo_pagamento: '2024-01-15 10:30:00',
      proximo_vencimento: '2025-01-15 10:30:00',
      created_at: '2024-01-15 10:30:00',
      cpf_responsavel: '123.456.789-00',
      razao_social: '',
      cnpj: '',
      endereco: 'Rua das Flores, 123',
      numero_endereco: '123',
      complemento_endereco: 'Apt 45',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'PA',
      cep: '01234-567',
      metodo_pagamento: 'pix'
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    // Ajustar largura das colunas conforme a nova estrutura
    const colWidths = [
      { wch: 20 }, // nome_responsavel
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 18 }, // produto_selecionado
      { wch: 20 }, // plano_selecionado
      { wch: 12 }, // tipo_pessoa
      { wch: 10 }, // preco
      { wch: 18 }, // status_contratacao
      { wch: 20 }, // ultimo_pagamento
      { wch: 20 }, // proximo_vencimento
      { wch: 20 }, // created_at
      { wch: 18 }, // cpf_responsavel
      { wch: 25 }, // razao_social
      { wch: 18 }, // cnpj
      { wch: 30 }, // endereco
      { wch: 12 }, // numero_endereco
      { wch: 20 }, // complemento_endereco
      { wch: 15 }, // bairro
      { wch: 15 }, // cidade
      { wch: 8 },  // estado
      { wch: 12 }, // cep
      { wch: 15 }  // metodo_pagamento
    ];
    worksheet['!cols'] = colWidths;

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