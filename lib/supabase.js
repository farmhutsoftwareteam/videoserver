const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Ensure you have the dotenv package to load environment variables from a .env file

// Ensure you have these environment variables set in your .env file
const SUPABASE_URL = process.env.SUPABASE_URL; // Your Supabase project URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // Your Supabase anon key

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single Supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = supabase;
