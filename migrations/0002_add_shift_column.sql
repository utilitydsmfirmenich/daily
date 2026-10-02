-- Migrasi 0002: Tambahkan kolom shift pada tabel activities
ALTER TABLE activities ADD COLUMN shift TEXT DEFAULT 'SHIFT_1';

-- Update data yang sudah ada berdasarkan jam mulai (start_time)
-- Shift 1 (07:30 - 19:29): start_time >= '07:30' AND start_time < '19:30'
-- Shift 2 (19:30 - 07:29): start_time >= '19:30' OR start_time < '07:30'
UPDATE activities 
SET shift = CASE 
  WHEN start_time >= '07:30' AND start_time < '19:30' THEN 'SHIFT_1'
  ELSE 'SHIFT_2'
END
WHERE shift IS NULL OR shift = '';
