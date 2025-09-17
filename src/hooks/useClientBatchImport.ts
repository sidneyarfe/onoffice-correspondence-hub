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
              if (v !== undefined && v !== null && v !== '') return v;
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
    if (!client.preco) errors.push('Preço é obrigatório');
    if (!client.status_contratacao) errors.push('Status da contratação é obrigatório');
    if (!client.ultimo_pagamento) errors.push('Último pagamento é obrigatório');
    if (!client.proximo_vencimento) errors.push('Próximo vencimento é obrigatório');
    if (!client.created_at) errors.push('Data de criação é obrigatória');
    
    // Validações específicas
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push('Email inválido');
    }
    
    if (client.tipo_pessoa && !['fisica', 'juridica'].includes(client.tipo_pessoa)) {
      errors.push('Tipo de pessoa deve ser: fisica ou juridica');
    }
    
    if (client.preco && client.preco <= 0) {
      errors.push('Preço deve ser maior que zero');
    }
    
    return errors;
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

      // Buscar produto_id e plano_id pelos nomes
      const { produto_id, plano_id, error: lookupError } = await findProductAndPlanIds(
        clientData.produto_selecionado,
        clientData.plano_selecionado
      );

      if (lookupError) {
        return {
          success: false,
          clientData,
          error: lookupError
        };
      }

      // 1) Inserção mínima para passar no RLS (status INICIADO) e NOT NULLs
      const initialInsert: any = {
        email: clientData.email,
        telefone: clientData.telefone,
        nome_responsavel: clientData.nome_responsavel,
        plano_selecionado: clientData.plano_selecionado,
        tipo_pessoa: clientData.tipo_pessoa,
        status_contratacao: 'INICIADO',
        // Campos NOT NULL na tabela (usar string vazia se ausente)
        cpf_responsavel: clientData.cpf_responsavel ?? '',
        endereco: clientData.endereco ?? '',
        numero_endereco: clientData.numero_endereco ?? '',
        cidade: clientData.cidade ?? '',
        estado: clientData.estado ?? '',
        cep: clientData.cep ?? ''
      };

      const { data: newContract, error: insertError } = await supabase
        .from('contratacoes_clientes')
        .insert(initialInsert)
        .select('id')
        .single();

      if (insertError || !newContract) {
        throw new Error(`Erro ao criar contrato: ${insertError?.message || 'Falha desconhecida (RLS?)'}`);
      }

      // 2) Atualização com os demais campos (como admin)
      const updateData: any = {
        produto_id: produto_id,
        plano_id: plano_id,
        produto_selecionado: clientData.produto_selecionado,
        preco: clientData.preco,
        status_contratacao: clientData.status_contratacao || 'ATIVO',
        ultimo_pagamento: clientData.ultimo_pagamento || null,
        proximo_vencimento: clientData.proximo_vencimento || null,
        created_at: clientData.created_at || null,
        cpf_responsavel: clientData.cpf_responsavel || null,
        razao_social: clientData.razao_social || null,
        cnpj: clientData.cnpj || null,
        endereco: clientData.endereco || null,
        numero_endereco: clientData.numero_endereco || null,
        complemento_endereco: clientData.complemento_endereco || null,
        bairro: clientData.bairro || null,
        cidade: clientData.cidade || null,
        estado: clientData.estado || null,
        cep: clientData.cep || null,
        metodo_pagamento: clientData.metodo_pagamento || null
      };

      const { error: updateError } = await supabase
        .from('contratacoes_clientes')
        .update(updateData)
        .eq('id', newContract.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar contrato: ${updateError.message}`);
      }

      // 3) Vincular plano ao cliente
      await addClientePlanoFromContract(newContract.id, plano_id!, clientData);

      return {
        success: true,
        clientData,
        credentials: {
          email: clientData.email,
          temporaryPassword: 'Criado via importação'
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
        
        // Delay entre processamentos para não sobrecarregar
        if (i < clients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2500));
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