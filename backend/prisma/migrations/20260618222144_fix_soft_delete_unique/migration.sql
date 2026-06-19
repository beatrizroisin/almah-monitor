-- Fix soft-deleted clients that still hold the original vtexAccount/merchantId.
-- vtex_account is VARCHAR(100): keep up to 55 chars + '_deleted_' (9) + UUID (36) = 100
-- merchant_id  is VARCHAR(50):  keep up to 37 chars + '_del_' (5)     + 8 chars  = 50
UPDATE clients
SET
  vtex_account = LEFT(vtex_account, 55) || '_deleted_' || id::text,
  merchant_id  = CASE
                   WHEN merchant_id IS NOT NULL
                   THEN LEFT(merchant_id, 37) || '_del_' || LEFT(id::text, 8)
                   ELSE NULL
                 END
WHERE deleted_at IS NOT NULL
  AND vtex_account NOT LIKE '%_deleted_%';

-- Replace global UNIQUE constraints with partial indexes (only active records).
ALTER TABLE clients DROP CONSTRAINT IF EXISTS "clients_vtex_account_key";
ALTER TABLE clients DROP CONSTRAINT IF EXISTS "clients_merchant_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "clients_vtex_account_active_key"
  ON clients (vtex_account)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_merchant_id_active_key"
  ON clients (merchant_id)
  WHERE deleted_at IS NULL AND merchant_id IS NOT NULL;
