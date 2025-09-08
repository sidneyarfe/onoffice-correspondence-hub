-- Habilitar extensão pgcrypto para funções de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se as funções estão disponíveis
DO $$
BEGIN
  -- Testar se gen_salt funciona
  PERFORM gen_salt('bf');
  RAISE NOTICE 'Extensão pgcrypto habilitada com sucesso';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao habilitar pgcrypto: %', SQLERRM;
END;
$$;