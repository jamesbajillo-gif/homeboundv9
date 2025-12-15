import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://db1.techpinoy.net';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16amNtdGx0d2RjcGJkdnVubXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDM0MDAsImV4cCI6MjA2NDE3OTQwMH0.yap8eSNbFjYJsz43kwUZtGh8O3V7V9YPQC5bgx3cFWs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
