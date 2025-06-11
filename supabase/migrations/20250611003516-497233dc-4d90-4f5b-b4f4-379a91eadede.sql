
CREATE OR REPLACE FUNCTION get_signing_url(p_contratacao_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_signing_url TEXT;
BEGIN
  SELECT zapsign_signing_url INTO v_signing_url
  FROM public.contratacoes_clientes
  WHERE id = p_contratacao_id;

  RETURN v_signing_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
