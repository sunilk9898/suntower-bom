// ============================================
// SUN TOWER RWA - Supabase Configuration
// ============================================
// INSTRUCTIONS:
// 1. Go to https://supabase.com → Sign Up (free)
// 2. Create project "suntower-rwa"
// 3. Go to Settings → API → Copy "Project URL" and "anon public" key
// 4. Paste below and set SUPABASE_ENABLED = true

const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

// Set to true once you've configured Supabase above
const SUPABASE_ENABLED = false;

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
