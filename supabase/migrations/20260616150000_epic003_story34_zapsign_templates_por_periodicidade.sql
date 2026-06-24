-- Epic 003 · Story 3.4 (AC9) — Popular planos.zapsign_template_id_pf/pj a partir dos IDs do n8n,
-- mapeados por periodicidade. Idempotente: só preenche onde está NULL (não sobrescreve config manual).
-- Fonte: docs/architecture/n8n-sistema-on-reference.md (template IDs MENSAL/1ANO/2ANOS × PF/PJ).

-- mensal  (n8n: MENSAL)
UPDATE public.planos SET
  zapsign_template_id_pf = COALESCE(zapsign_template_id_pf, 'f6eb9976-f66f-47d7-8ddc-39666ea306f6'),
  zapsign_template_id_pj = COALESCE(zapsign_template_id_pj, 'b93bf9ad-f2ad-4df3-bb62-77497f8f88ff')
WHERE periodicidade = 'mensal';

-- anual   (n8n: 1 ANO)
UPDATE public.planos SET
  zapsign_template_id_pf = COALESCE(zapsign_template_id_pf, 'ded30f07-d15e-44f1-83ac-2b40ec39dcf3'),
  zapsign_template_id_pj = COALESCE(zapsign_template_id_pj, '64cda768-d413-48a2-84f9-e15df4590720')
WHERE periodicidade = 'anual';

-- bianual (n8n: 2 ANOS)
UPDATE public.planos SET
  zapsign_template_id_pf = COALESCE(zapsign_template_id_pf, 'd331ff41-38cf-4bf8-9a59-ea8c535915b5'),
  zapsign_template_id_pj = COALESCE(zapsign_template_id_pj, '93388498-5ad5-4e4d-b2b2-f7c935de4856')
WHERE periodicidade = 'bianual';

-- Periodicidades sem template conhecido (semanal/trimestral/semestral) ficam NULL — a function
-- valida e retorna erro claro se um plano sem template for contratado.
