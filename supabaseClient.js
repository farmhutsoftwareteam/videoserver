const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://guqyhqpnpwjlydocubpm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXlocXBucHdqbHlkb2N1YnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyMjEyMzMsImV4cCI6MjAyODc5NzIzM30.EyTAIIZZrR3dnlCHcxqBBfbZBVmjLzeN3BO3jNRCl8I'

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
