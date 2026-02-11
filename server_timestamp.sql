-- Create a trigger function to enforce server-side timestamps
CREATE OR REPLACE FUNCTION public.handle_attempt_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set completed_at to NOW() if status is 'Completed'
  -- This prevents users from sending a fake past timestamp
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed' OR TG_OP = 'INSERT') THEN
    NEW.completed_at := NOW();
  END IF;
  
  -- Ensure started_at is reasonable (not in future)
  -- Optional: You could also force started_at if you create the attempt record at start time
  -- But for offline support, we trust started_at but verify it's not > NOW()
  IF NEW.started_at > NOW() THEN
    NEW.started_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_attempt_completion ON attempts;
CREATE TRIGGER on_attempt_completion
BEFORE INSERT OR UPDATE ON attempts
FOR EACH ROW
EXECUTE FUNCTION public.handle_attempt_completion();
