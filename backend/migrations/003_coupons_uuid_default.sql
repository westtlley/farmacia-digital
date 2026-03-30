CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  coupons_table_exists BOOLEAN;
  id_data_type TEXT;
  invalid_uuid_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'coupons'
  )
  INTO coupons_table_exists;

  IF NOT coupons_table_exists THEN
    RETURN;
  END IF;

  SELECT data_type
  INTO id_data_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'coupons'
    AND column_name = 'id';

  IF id_data_type IS DISTINCT FROM 'uuid' THEN
    SELECT COUNT(*)
    INTO invalid_uuid_count
    FROM coupons
    WHERE id IS NOT NULL
      AND id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

    IF invalid_uuid_count > 0 THEN
      RAISE EXCEPTION 'Nao foi possivel converter coupons.id para UUID: % registro(s) possuem id invalido.', invalid_uuid_count
        USING HINT = 'Atualize os ids legados da tabela coupons para UUID antes de reaplicar esta migration.';
    END IF;

    ALTER TABLE coupons
      ALTER COLUMN id TYPE UUID
      USING id::uuid;
  END IF;

  ALTER TABLE coupons
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'coupons'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE coupons
      ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);
  END IF;
END $$;
