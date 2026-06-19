-- Fix soft-deleted clients that still hold the original vtexAccount/merchantId,
-- blocking re-registration of the same account.
UPDATE clients
SET
  vtex_account = vtex_account || '_deleted_' || id,
  merchant_id  = CASE WHEN merchant_id IS NOT NULL THEN merchant_id || '_deleted_' || id ELSE NULL END
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
