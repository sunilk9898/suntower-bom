// ============================================
// SUN TOWER RWA — Supabase Configuration
// ============================================

const SUPABASE_URL = 'https://ogkxlgyybnjnikntzfag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTUzOTksImV4cCI6MjA4NzA5MTM5OX0.DTxO8qF6gd7oETddwrXVHMXOWTG0GfTJ8DHnljwQAqc';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxNTM5OSwiZXhwIjoyMDg3MDkxMzk5fQ.Y369MPoiC5qxhFVU13G_FUY-qp-x8b9nAGDHVIu5xH4';

// Initialize Supabase client
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
