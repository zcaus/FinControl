import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dtnlbsygxjekgbddpqko.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bmxic3lneGpla2diZGRwcWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzOTI0NDcsImV4cCI6MjA3OTk2ODQ0N30.1Lk1L8iT3ErTGB_FafCh_cn6-WpNeaEhEgM4mBUaNvM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);