-- 1. First, DROP the foreign key constraint. We must do this BEFORE changing the type.
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_test_id_fkey;

-- 2. Now allow any text in test_id
ALTER TABLE attempts 
ALTER COLUMN test_id TYPE text;
