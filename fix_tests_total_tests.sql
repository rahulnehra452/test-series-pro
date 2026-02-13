-- Ensure tests table has total_tests for app metadata/seeding compatibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tests'
          AND column_name = 'total_tests'
    ) THEN
        ALTER TABLE public.tests
            ADD COLUMN total_tests integer DEFAULT 1;
    END IF;
END $$;
