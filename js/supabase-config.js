// ============================================
// SUN TOWER RWA - Supabase Configuration
// ============================================
// INSTRUCTIONS:
// 1. Go to https://supabase.com → Sign Up (free)
// 2. Create project "suntower-rwa"
// 3. Go to Settings → API → Copy "Project URL" and "anon public" key
// 4. Paste below and set SUPABASE_ENABLED = true

const SUPABASE_URL = 'https://ogkxlgyybnjnikntzfag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTUzOTksImV4cCI6MjA4NzA5MTM5OX0.DTxO8qF6gd7oETddwrXVHMXOWTG0GfTJ8DHnljwQAqc';

// Supabase is now ACTIVE — all data syncs to cloud
const SUPABASE_ENABLED = true;

// Initialize Supabase client
let supa = null;
if (SUPABASE_ENABLED && typeof window.supabase !== 'undefined') {
  try {
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase connected');
  } catch(e) {
    console.log('Supabase init error:', e);
  }
}
