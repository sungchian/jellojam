import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://iifhubablhxibpsyeagi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZmh1YmFibGh4aWJwc3llYWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzYyMzUsImV4cCI6MjA5MjExMjIzNX0.OcdLCzEVrZ86wUJ6EitYorCyhfpJt_mQ1TkRmcv2-Z4'
)
