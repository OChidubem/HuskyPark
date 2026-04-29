BEGIN;

ALTER TABLE lot_status_report
ADD COLUMN IF NOT EXISTS approx_available INTEGER CHECK (approx_available >= 0);

UPDATE report_status_type
SET status_name = 'lot_full'
WHERE status_name = 'full';

COMMIT;
