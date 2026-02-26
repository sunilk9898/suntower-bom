// ============================================
// SUN TOWER RWA — Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://ogkxlgyybnjnikntzfag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTUzOTksImV4cCI6MjA4NzA5MTM5OX0.DTxO8qF6gd7oETddwrXVHMXOWTG0GfTJ8DHnljwQAqc';

// Initialize Supabase client
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
