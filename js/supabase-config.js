// ============================================
// SUN TOWER RWA - Supabase Configuration
// ============================================
// Project: ogkxlgyybnjnikntzfag (Supabase free tier)
// Auth: Supabase Auth (JWT + bcrypt, server-side)
// Database: PostgreSQL with Row Level Security
// Storage: Supabase Storage (notices, gallery)

const SUPABASE_URL = 'https://ogkxlgyybnjnikntzfag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTUzOTksImV4cCI6MjA4NzA5MTM5OX0.DTxO8qF6gd7oETddwrXVHMXOWTG0GfTJ8DHnljwQAqc';

// Service role key — admin operations (password updates, user management)
// Note: This is an internal RWA portal, not a public-facing app.
// Only loaded by admin-authenticated users for user management operations.
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na3hsZ3l5Ym5qbmlrbnR6ZmFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxNTM5OSwiZXhwIjoyMDg3MDkxMzk5fQ.Y369MPoiC5qxhFVU13G_FUY-qp-x8b9nAGDHVIu5xH4';

// Supabase is ACTIVE — Auth + Database + RLS
const SUPABASE_ENABLED = true;

// Admin email (first admin account)
const ADMIN_EMAIL = 'suntowershipra@gmail.com';

// Initialize Supabase client
let supa = null;
if (SUPABASE_ENABLED && typeof window.supabase !== 'undefined') {
  try {
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('Supabase connected (Auth + RLS mode)');
  } catch(e) {
    console.error('Supabase init error:', e);
  }
}

// Legacy KV sync (kept for migration, will be removed)
function supaSync(key) {
  if (!supa) return;
  try {
    var v = localStorage.getItem(key);
    if (v) {
      supa.from('kv_store').upsert({
        key: key,
        value: JSON.parse(v),
        updated_at: new Date().toISOString()
      }).then(function(){}).catch(function(){});
    }
  } catch(e) {}
}

// Legacy hydrate (kept for migration, will be removed)
async function supaHydrate() {
  if (!supa) return;
  try {
    var res = await supa.from('kv_store').select('*');
    if (res.data) {
      res.data.forEach(function(r) {
        localStorage.setItem(r.key, JSON.stringify(r.value));
      });
      console.log('Supabase: hydrated ' + res.data.length + ' keys');
    }
  } catch(e) {
    console.log('Supabase hydrate error:', e);
  }
}
