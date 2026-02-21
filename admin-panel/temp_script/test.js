import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihvnklncvlvlhxfgfsbg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlodm5rbG5jdmx2bGh4Zmdmc2JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDcwMzg5MCwiZXhwIjoyMDg2Mjc5ODkwfQ.uWxGgjbTQ61l1rFcookQ2rU6zD0qitDW8DdaIkvnUo4'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_string: `
      ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
      ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
      ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
    `
  })
  if (error) {
    if (error.message.includes('execute_sql')) {
        console.log('Needs other method');
    } else {
        console.error(error)
    }
  } else {
      console.log('Success')
  }
}

run()
