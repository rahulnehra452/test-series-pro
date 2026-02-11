-- Add questions column to attempts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attempts' AND column_name = 'questions') THEN
        ALTER TABLE public.attempts ADD COLUMN questions jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;
