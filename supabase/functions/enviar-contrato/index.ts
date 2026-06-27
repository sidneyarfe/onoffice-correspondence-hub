import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPSIGN_CREATE_DOC = "https://api.zapsign.com.br/api/v1/models/create-doc/";

interface Body {
  contratacao_id: string;
  plano_id?: string;
  assinatura_id?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

const v = (de: string, para: unknown) => ({ de, para: para == null ? "" : String(para) });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contratacao_id, plano_id, assinatura_id }: Body = await req.json();
    if (!contratacao_id) return json({ error: "contratacao_id é obrigatório" }, 400);

    // O secret do projeto é ZAPSIGN_API_KEY; aceitamos ZAPSIGN_API_TOKEN como fallback.
    const zapsignToken = Deno.env.get("ZAPSIGN_API_KEY") ?? Deno.env.get("ZAPSIGN_API_TOKEN");
    if (!zapsignToken) return json({ error: "ZAPSIGN_API_KEY não configurado nas secrets" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      (Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "",
    );

    // 1. Cliente
    const { data: cli, error: cliErr } = await supabase
      .from("contratacoes_clientes")
      .select(
        "id, tipo_pessoa, nome_responsavel, razao_social, cpf_responsavel, cnpj, email, telefone, " +
          "endereco, numero_endereco, complemento_endereco, bairro, cidade, estado, cep, plano_id, plano_selecionado",
      )
      .eq("id", contratacao_id)
      .single();
    if (cliErr || !cli) return json({ error: "Contratação não encontrada", details: cliErr?.message }, 404);

    // 2. Plano (template ZapSign por PF/PJ)
    const efetivoPlanoId = plano_id || cli.plano_id;
    if (!efetivoPlanoId) return json({ error: "Cliente sem plano definido — informe plano_id" }, 400);

    const { data: plano, error: planoErr } = await supabase
      .from("planos")
      .select("id, nome_plano, zapsign_template_id_pf, zapsign_template_id_pj")
      .eq("id", efetivoPlanoId)
      .single();
    if (planoErr || !plano) return json({ error: "Plano não encontrado", details: planoErr?.message }, 404);

    const isPJ = cli.tipo_pessoa === "juridica";
    const templateId = isPJ ? plano.zapsign_template_id_pj : plano.zapsign_template_id_pf;
    if (!templateId) {
      return json({ error: `Plano "${plano.nome_plano}" sem template ZapSign para ${isPJ ? "PJ" : "PF"}` }, 422);
    }

    const signerName = (isPJ ? cli.razao_social : cli.nome_responsavel) || cli.nome_responsavel || "Cliente";

    // 3. dataVars do contrato (formato {de, para}) — ver docs/architecture/n8n-sistema-on-reference.md
    const data = [
      v("{{NOME_RESPONSAVEL}}", cli.nome_responsavel),
      v("{{CPF_RESPONSAVEL}}", cli.cpf_responsavel),
      v("{{EMAIL_RESPONSAVEL}}", cli.email),
      v("{{TELEFONE_RESPONSAVEL}}", cli.telefone),
      v("{{ENDERECO_LOGRADOURO}}", cli.endereco),
      v("{{ENDERECO_NUMERO}}", cli.numero_endereco),
      v("{{ENDERECO_COMPLEMENTO}}", cli.complemento_endereco),
      v("{{ENDERECO_BAIRRO}}", cli.bairro),
      v("{{ENDERECO_CIDADE}}", cli.cidade),
      v("{{ENDERECO_ESTADO}}", cli.estado),
      v("{{ENDERECO_CEP}}", cli.cep),
      v("{{PLANO_NOME}}", plano.nome_plano || cli.plano_selecionado),
      ...(isPJ ? [v("{{RAZAO_SOCIAL}}", cli.razao_social), v("{{CNPJ}}", cli.cnpj)] : []),
    ];

    // 4. Cria o documento no ZapSign (envia e-mail automático ao signatário)
    const zsRes = await fetch(ZAPSIGN_CREATE_DOC, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${zapsignToken}` },
      body: JSON.stringify({
        template_id: templateId,
        external_id: contratacao_id,
        signer_name: signerName,
        signer_email: cli.email,
        send_automatic_email: true,
        sandbox: false,
        data,
      }),
    });

    const zs = await zsRes.json().catch(() => ({}));
    if (!zsRes.ok) {
      console.error("ZapSign erro:", zsRes.status, zs);
      return json({ error: "Falha ao gerar contrato no ZapSign", status: zsRes.status, details: zs }, 502);
    }

    const documentToken: string | null = zs.token ?? null;
    const signingUrl: string | null = zs.signers?.[0]?.sign_url ?? null;

    // 5. Persiste como entidade `contratos` + reflete no cliente
    const { error: contratoErr } = await supabase.from("contratos").insert({
      cliente_id: contratacao_id,
      assinatura_id: assinatura_id ?? null,
      plano_id: efetivoPlanoId,
      zapsign_template_id: templateId,
      zapsign_document_token: documentToken,
      zapsign_signing_url: signingUrl,
      status: "enviado",
    });
    if (contratoErr) console.error("Erro ao gravar contratos:", contratoErr.message);

    await supabase
      .from("contratacoes_clientes")
      .update({
        zapsign_document_token: documentToken,
        status_contratacao: "CONTRATO_ENVIADO",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contratacao_id);

    return json({ success: true, signing_url: signingUrl, document_token: documentToken });
  } catch (error) {
    console.error("Erro em enviar-contrato:", error);
    return json({ error: (error as Error).message || "Erro interno" }, 500);
  }
});
