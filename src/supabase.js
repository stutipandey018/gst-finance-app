import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://llpawhuvdryamrmrkwpo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscGF3aHV2ZHJ5YW1ybXJrd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjgzOTUsImV4cCI6MjA5NTc0NDM5NX0.C8hreuTzB400jRsFS5omTh8TCQMLgvp3WGRAh22yGW4'

export const supabase = createClient(supabaseUrl, supabaseKey)