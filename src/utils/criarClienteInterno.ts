import { supabase } from '@/integrations/supabase/client';
import { calcularProximoVencimento, paraDataISO } from '@/utils/vencimento';
import { registrarAtividade } from '@/utils/atividade';

/**
 * Criação de cliente 100% interna — sem dependência de plataforma externa (n8n, etc.) e
 * alinhada ao modelo atual de **clientes / produtos / ofertas**:
 *
 *  - O **cliente** (`contratacoes_clientes`) tem o seu próprio `status_contratacao` (funil),
 *    INDEPENDENTE do status das assinaturas.
 *  - O cliente contrata um **produto** através de uma **oferta** (`planos`):
 *      • produto de **assinatura** → linha em `assinaturas` (com período + status próprios);
 *      • produto **avulso** → `pedidos` + `pedido_itens` (a cobrança avulsa registrada).
 *  - Os itens contratados são OPCIONAIS: dá para criar o cliente sem nenhum produto e vender
 *    depois pela ficha.
 *  - Opcionalmente provisiona o acesso ao portal via Edge Function `create-user-from-contratacao`.
 *
 * Reaproveitado pelo cadastro manual (`ClientFormModal`) e pela importação em lote
 * (`useClientBatchImport`), espelhando a mesma lógica de `IniciarContratacaoDialog`/`VenderProdutoModal`.
 */

export type StatusContratacao =
  | 'INICIADO'
  | 'CONTRATO_ENVIADO'
  | 'CONTRATO_ASSINADO'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGAMENTO_CONFIRMADO'
  | 'ATIVO'
  | 'SUSPENSO'
  | 'CANCELADO';

// Valores PERSISTIDOS em `assinaturas.status` (o display "vigente"/"em_atraso" é derivado em clienteStatus).
export type StatusAssinatura = 'aguardando_assinatura' | 'aguardando_pagamento' | 'ativo' | 'suspenso' | 'cancelado';

/** Assinatura contratada (produto recorrente através de uma oferta). */
export interface ItemAssinatura {
  tipo: 'assinatura';
  produto_id: string;
  plano_id: string; // oferta
  produto_nome: string;
  oferta_nome: string;
  periodicidade?: string | null;
  preco_centavos: number;
  /** Início do período contratado (YYYY-MM-DD). Default: hoje. */
  data_inicio?: string | null;
  /** Override do vencimento; sem ele, calcula por `data_inicio` + `periodicidade`. */
  proximo_vencimento?: string | null;
  /** Status da assinatura — INDEPENDENTE do status do cliente. Default: 'ativo'. */
  status?: StatusAssinatura;
}

/** Produto avulso contratado (cobrança avulsa via pedido). */
export interface ItemAvulso {
  tipo: 'avulso';
  produto_id: string;
  plano_id: string; // oferta
  produto_nome: string;
  oferta_nome: string;
  modalidade: string; // unidade (hora, diaria, mes, …)
  quantidade: number;
  preco_unit_centavos: number; // já calculado pela modalidade
}

export type ClienteItem = ItemAssinatura | ItemAvulso;

export interface CriarClienteInput {
  tipo_pessoa: 'fisica' | 'juridica';
  nome_responsavel: string;
  email: string;
  telefone?: string | null;
  cpf_responsavel?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  numero_endereco?: string | null;
  complemento_endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  /** Status do CLIENTE (funil) — independente das assinaturas. Default: 'INICIADO'. */
  status_contratacao?: StatusContratacao;
  /** Produtos contratados (assinaturas + avulsos). Opcional. */
  itens?: ClienteItem[];
  /** Provisiona o login do cliente via Edge Function (default: true). */
  provisionarAcesso?: boolean;
}

export interface CriarClienteResult {
  contratacaoId: string;
  /** Cliente já existia (mesmo e-mail) e foi atualizado em vez de criado. */
  reused: boolean;
  userId?: string;
  email: string;
  /** Senha temporária gerada quando o acesso é provisionado. */
  temporaryPassword?: string;
  /** Cliente foi criado, mas o provisionamento do acesso falhou (não-fatal). */
  provisionWarning?: string;
}

const isAssinatura = (i: ClienteItem): i is ItemAssinatura => i.tipo === 'assinatura';
const isAvulso = (i: ClienteItem): i is ItemAvulso => i.tipo === 'avulso';

export async function criarClienteInterno(input: CriarClienteInput): Promise<CriarClienteResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('E-mail é obrigatório');

  const itens = input.itens ?? [];
  const assinaturas = itens.filter(isAssinatura);
  const avulsos = itens.filter(isAvulso);
  const status = input.status_contratacao ?? 'INICIADO';
  const hoje = new Date();

  // Assinatura "primária" → preenche os campos legados do cliente (coluna "Plano" da lista/ficha).
  const primeira = assinaturas[0] ?? null;
  const inicioPrimeira = primeira?.data_inicio ? new Date(primeira.data_inicio) : hoje;
  const vencPrimeira = primeira
    ? primeira.proximo_vencimento ?? paraDataISO(calcularProximoVencimento(inicioPrimeira, primeira.periodicidade))
    : null;

  const dadosPessoa: Record<string, unknown> = {
    nome_responsavel: input.nome_responsavel,
    cpf_responsavel: input.cpf_responsavel || null,
    email,
    telefone: input.telefone || null,
    tipo_pessoa: input.tipo_pessoa,
    razao_social: input.tipo_pessoa === 'juridica' ? input.razao_social || null : null,
    cnpj: input.tipo_pessoa === 'juridica' ? input.cnpj || null : null,
    endereco: input.endereco || null,
    numero_endereco: input.numero_endereco || null,
    complemento_endereco: input.complemento_endereco || null,
    bairro: input.bairro || null,
    cidade: input.cidade || null,
    estado: input.estado || null,
    cep: input.cep || null,
    status_contratacao: status,
    updated_at: new Date().toISOString(),
  };
  // Só grava campos de plano quando há assinatura — assim não apaga dados de um cliente já existente.
  if (primeira) {
    dadosPessoa.plano_id = primeira.plano_id;
    dadosPessoa.produto_id = primeira.produto_id;
    dadosPessoa.plano_selecionado = primeira.oferta_nome;
    dadosPessoa.produto_selecionado = primeira.produto_nome;
    dadosPessoa.preco = primeira.preco_centavos;
    dadosPessoa.proximo_vencimento = vencPrimeira;
  }

  // 1. Upsert da contratação (reusa por e-mail se já existir)
  const { data: existente } = await supabase
    .from('contratacoes_clientes')
    .select('id, user_id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  let contratacaoId: string;
  let userId: string | undefined;
  let reused = false;

  if (existente?.id) {
    reused = true;
    contratacaoId = (existente as { id: string }).id;
    userId = (existente as { user_id?: string | null }).user_id || undefined;
    const { error } = await supabase
      .from('contratacoes_clientes')
      .update(dadosPessoa as never)
      .eq('id', contratacaoId);
    if (error) throw new Error(`Falha ao atualizar cliente: ${error.message}`);
  } else {
    const { data: novo, error } = await supabase
      .from('contratacoes_clientes')
      .insert(dadosPessoa as never)
      .select('id')
      .single();
    if (error || !novo) throw new Error(`Falha ao criar cliente: ${error?.message ?? 'erro desconhecido'}`);
    contratacaoId = (novo as { id: string }).id;
  }

  // 2. Assinaturas (recorrentes) — cada uma com período e status próprios
  for (const a of assinaturas) {
    const inicio = a.data_inicio ? new Date(a.data_inicio) : hoje;
    const venc = a.proximo_vencimento ?? paraDataISO(calcularProximoVencimento(inicio, a.periodicidade));
    const { error } = await supabase.from('assinaturas').insert({
      cliente_id: contratacaoId,
      plano_id: a.plano_id,
      produto_id: a.produto_id,
      status: a.status ?? 'ativo',
      data_contratacao: paraDataISO(hoje),
      data_inicio: paraDataISO(inicio),
      proximo_vencimento: venc,
      preco_snapshot_centavos: a.preco_centavos,
    } as never);
    if (error) throw new Error(`Falha ao criar assinatura (${a.oferta_nome}): ${error.message}`);
  }

  // 3. Avulsos (cobrança avulsa) — um pedido com os itens
  if (avulsos.length) {
    const { data: pedido, error: pedErr } = await supabase
      .from('pedidos')
      .insert({ cliente_id: contratacaoId, status: 'aberto' } as never)
      .select('id')
      .single();
    if (pedErr || !pedido) throw new Error(`Falha ao registrar pedido avulso: ${pedErr?.message ?? 'erro desconhecido'}`);
    const pedidoId = (pedido as { id: string }).id;
    const { error: itensErr } = await supabase.from('pedido_itens').insert(
      avulsos.map((v) => ({
        pedido_id: pedidoId,
        produto_id: v.produto_id,
        plano_id: v.plano_id,
        descricao: `${v.produto_nome} — ${v.oferta_nome} (${v.modalidade})`,
        quantidade: v.quantidade,
        unidade: v.modalidade,
        preco_unit_centavos: v.preco_unit_centavos,
      })) as never,
    );
    if (itensErr) throw new Error(`Falha ao registrar itens avulsos: ${itensErr.message}`);
  }

  // 4. Provisiona o acesso ao portal (Edge Function interna — gera senha temporária)
  let temporaryPassword: string | undefined;
  let provisionWarning: string | undefined;
  if (input.provisionarAcesso !== false) {
    try {
      const { data, error } = await supabase.functions.invoke('create-user-from-contratacao', {
        body: { contratacao_id: contratacaoId },
      });
      if (error) throw error;
      const resp = data as {
        success?: boolean;
        temporary_password?: string;
        user_id?: string;
        error?: string;
      };
      if (!resp?.success) {
        provisionWarning = resp?.error || 'Não foi possível provisionar o acesso ao portal.';
      } else {
        temporaryPassword = resp.temporary_password;
        userId = resp.user_id || userId;
      }
    } catch (e) {
      provisionWarning = e instanceof Error ? e.message : 'Falha ao provisionar acesso ao portal.';
    }
  }

  // 5. Log de atividade (best-effort, no-op sem user_id)
  const resumo =
    itens.length === 0
      ? 'sem produtos contratados'
      : [
          assinaturas.length ? `${assinaturas.length} assinatura(s)` : '',
          avulsos.length ? `${avulsos.length} avulso(s)` : '',
        ]
          .filter(Boolean)
          .join(' + ');
  await registrarAtividade(userId, 'cliente_criado_admin', `Cliente cadastrado pelo admin: ${resumo}`);

  return { contratacaoId, reused, userId, email, temporaryPassword, provisionWarning };
}
