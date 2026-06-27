-- Realtime: adiciona as tabelas principais à publicação supabase_realtime (idempotente).
-- Assim a UI recebe INSERT/UPDATE/DELETE e refaz o fetch sem recarregar a página.
-- Obs.: realtime é por TABELA-BASE (não em views como contratacoes_clientes/cliente_planos);
-- assinamos as bases (clientes, assinaturas, …) e a UI relê pelas views.

DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'clientes', 'assinaturas', 'pedidos', 'pedido_itens', 'contratos',
    'pagamentos', 'produtos', 'planos',
    'correspondencias', 'documentos_admin', 'documentos_cliente', 'documentos_disponibilidade',
    'notificacoes', 'atividades_cliente', 'categorias_correspondencia'
  ];
BEGIN
  -- garante a publicação (em projetos Supabase ela já existe)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t AND table_type = 'BASE TABLE')
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ROLLBACK (manual): ALTER PUBLICATION supabase_realtime DROP TABLE public.<tabela>; (por tabela)
