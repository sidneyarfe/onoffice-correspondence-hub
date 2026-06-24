// Helper compartilhado InfinitePay Checkout API (Epic 003 · Stories 3.5/3.6).
// Doc: POST https://api.checkout.infinitepay.io/links — link one-off (cartão + PIX, até 12x).
// ⚠️ Nomes exatos de alguns campos da API devem ser confirmados contra a doc oficial no deploy.

const INFINITEPAY_BASE = 'https://api.checkout.infinitepay.io';

export interface ItemCobranca {
  name: string;
  /** preço unitário em CENTAVOS */
  price: number;
  quantity: number;
}

export interface LinkPagamento {
  payment_url: string;
  slug: string | null;
  order_nsu: string;
  raw: unknown;
}

function authHeaders() {
  const token = Deno.env.get('INFINITEPAY_API_TOKEN');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Cria um link de pagamento one-off. `orderNsu` é a nossa chave (ex.: pagamento.id) para conciliar. */
export async function criarLinkPagamento(args: {
  items: ItemCobranca[];
  orderNsu: string;
  webhookUrl: string;
  redirectUrl: string;
  handle?: string;
}): Promise<LinkPagamento> {
  const handle = args.handle ?? Deno.env.get('INFINITEPAY_HANDLE');
  if (!handle) throw new Error('INFINITEPAY_HANDLE não configurado');

  const resp = await fetch(`${INFINITEPAY_BASE}/links`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      handle,
      order_nsu: args.orderNsu,
      redirect_url: args.redirectUrl,
      webhook_url: args.webhookUrl,
      items: args.items,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`InfinitePay /links falhou (${resp.status}): ${JSON.stringify(data)}`);
  }
  return {
    payment_url: data?.url ?? data?.payment_url ?? data?.link ?? '',
    slug: data?.slug ?? data?.invoice_slug ?? null,
    order_nsu: data?.order_nsu ?? args.orderNsu,
    raw: data,
  };
}

/** Reconferência defensiva de um pagamento (idempotência/conciliação). */
export async function consultarPagamento(args: {
  slug?: string | null;
  orderNsu?: string;
  handle?: string;
}): Promise<unknown> {
  const handle = args.handle ?? Deno.env.get('INFINITEPAY_HANDLE');
  const resp = await fetch(`${INFINITEPAY_BASE}/payment_check`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ handle, slug: args.slug, order_nsu: args.orderNsu }),
  });
  return await resp.json();
}
