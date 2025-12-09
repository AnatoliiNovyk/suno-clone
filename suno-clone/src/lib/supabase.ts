import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mwsigocoyiuywrrrgjcv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13c2lnb2NveWl1eXdycnJnamN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODcwMTQsImV4cCI6MjA4MDg2MzAxNH0.T35QmVUR77QvzqFqjY54NQ-9mydkQjU1C__FDC4xF6M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
