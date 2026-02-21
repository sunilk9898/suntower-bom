// ============================================
// SUN TOWER RWA - Auth Module (Supabase Auth)
// ============================================
// Handles: login, logout, session, role checking, token lifecycle

const SunAuth = (function() {
  'use strict';

  let _user = null;       // Supabase auth user
  let _profile = null;    // Profile from profiles table
  let _role = null;       // 'admin' | 'bom' | 'resident' | null
  let _sessionTimer = null;
  let _onAuthChange = null; // callback
  const SESSION_WARN_MS = 55 * 60 * 1000; // Warn at 55 min
  const SESSION_CHECK_MS = 5 * 60 * 1000;  // Check every 5 min

  // Initialize auth listener
  function init(onChangeCallback) {
    _onAuthChange = onChangeCallback;
    if (!supa) {
      console.warn('SunAuth: Supabase not available');
      return;
    }

    // Listen for auth state changes (including INITIAL_SESSION for newer SDK)
    // IMPORTANT: _loadProfile uses direct fetch() to avoid Supabase client lock deadlock.
    // We do NOT call _restoreSession separately — onAuthStateChange handles INITIAL_SESSION.
    supa.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (!session || !session.user) {
          // Got auth event with no valid session — treat as signed out
          _clearState();
          if (_onAuthChange) {
            _onAuthChange({ event: 'SIGNED_OUT', user: null, profile: null, role: null });
          }
          return;
        }
        _user = session.user;
        await _loadProfile(session.access_token);
        _startSessionMonitor();
      } else if (event === 'SIGNED_OUT') {
        _clearState();
        _purgeStoredTokens();
      }

      if (_onAuthChange) {
        _onAuthChange({
          event,
          user: _user,
          profile: _profile,
          role: _role
        });
      }

    });
  }

  // Load profile from Supabase
  // IMPORTANT: Uses direct fetch() instead of supa.from() to avoid deadlock.
  // The Supabase JS client holds an internal navigator.locks lock during
  // onAuthStateChange callbacks. Calling supa.from().select() inside that
  // callback causes a deadlock because the REST request waits for the lock
  // to release, but the lock waits for the callback to finish.
  // Accepts optional accessToken param (preferred) — avoids reading stale localStorage.
  async function _loadProfile(tokenParam) {
    if (!_user) return;
    try {
      // Prefer passed token (from session object); fall back to localStorage
      let accessToken = tokenParam;
      if (!accessToken) {
        const tokenKey = 'sb-ogkxlgyybnjnikntzfag-auth-token';
        const stored = localStorage.getItem(tokenKey);
        if (!stored) {
          console.warn('SunAuth: no stored token for profile fetch');
          return;
        }
        const tokenData = JSON.parse(stored);
        accessToken = tokenData.access_token;
        if (!accessToken) {
          console.warn('SunAuth: no access_token in stored session');
          return;
        }
      }

      const url = SUPABASE_URL + '/rest/v1/profiles?select=*&id=eq.' + _user.id;
      const resp = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!resp.ok) {
        console.warn('SunAuth: profile fetch HTTP', resp.status);
        return;
      }

      const rows = await resp.json();
      if (rows && rows.length > 0) {
        _profile = rows[0];
        _role = rows[0].role;
        console.log('SunAuth: profile loaded, role =', _role);
      } else {
        // Profile might not exist yet (trigger delay), retry once after 1s
        await new Promise(r => setTimeout(r, 1000));
        const resp2 = await fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        if (resp2.ok) {
          const rows2 = await resp2.json();
          if (rows2 && rows2.length > 0) {
            _profile = rows2[0];
            _role = rows2[0].role;
            console.log('SunAuth: profile loaded (retry), role =', _role);
          }
        }
      }
    } catch (e) {
      console.error('SunAuth: profile load error:', e);
    }
  }

  // Login with email + password
  async function login(email, password) {
    if (!supa) {
      return { error: { message: 'Supabase not configured. Contact admin.' } };
    }
    try {
      const { data, error } = await supa.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        return { error };
      }

      _user = data.user;
      await _loadProfile(data.session?.access_token);
      _startSessionMonitor();

      // Log audit event
      SunAudit.log('login', 'auth', null, { email: email });

      return { data: { user: _user, profile: _profile, role: _role } };
    } catch (e) {
      return { error: { message: e.message || 'Login failed' } };
    }
  }

  // Logout — scope:'global' invalidates refresh token server-side
  async function logout() {
    if (!supa) return;
    SunAudit.log('logout', 'auth', null, { email: _user?.email });
    _stopSessionMonitor();
    try {
      await supa.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.warn('SunAuth: signOut error (continuing cleanup):', e);
    }
    _purgeStoredTokens();
    _clearState();
  }

  // Forgot password
  async function resetPassword(email) {
    if (!supa) {
      return { error: { message: 'Supabase not configured.' } };
    }
    try {
      const { error } = await supa.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin
      });
      if (error) return { error };
      return { data: { message: 'Reset link sent to your email.' } };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  // Change password (when logged in)
  async function changePassword(newPassword) {
    if (!supa || !_user) {
      return { error: { message: 'Not logged in.' } };
    }
    try {
      const { error } = await supa.auth.updateUser({ password: newPassword });
      if (error) return { error };
      SunAudit.log('password_change', 'auth', _user.id, {});
      return { data: { message: 'Password changed successfully.' } };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  // Session monitoring
  function _startSessionMonitor() {
    _stopSessionMonitor();
    _sessionTimer = setInterval(async () => {
      if (!supa) return;
      try {
        const { data: { session } } = await supa.auth.getSession();
        if (!session) {
          _showSessionExpired();
          _clearState();
        }
      } catch (e) {
        console.warn('Session check failed:', e);
      }
    }, SESSION_CHECK_MS);
  }

  function _stopSessionMonitor() {
    if (_sessionTimer) {
      clearInterval(_sessionTimer);
      _sessionTimer = null;
    }
  }

  function _showSessionExpired() {
    const overlay = document.getElementById('sessionExpiredOverlay');
    if (overlay) overlay.classList.remove('hidden');
    if (_onAuthChange) {
      _onAuthChange({ event: 'SESSION_EXPIRED', user: null, profile: null, role: null });
    }
  }

  function _clearState() {
    _user = null;
    _profile = null;
    _role = null;
    _stopSessionMonitor();
  }

  // Purge all Supabase auth tokens from localStorage
  // Keys follow pattern: sb-<project-ref>-auth-token
  function _purgeStoredTokens() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (keysToRemove.length > 0) {
        console.log('SunAuth: purged', keysToRemove.length, 'stored auth tokens');
      }
    } catch (e) {
      console.warn('SunAuth: token purge error:', e);
    }
  }

  // Role check helpers
  function isAdmin() { return _role === 'admin'; }
  function isBOM() { return _role === 'bom' || _role === 'admin'; }
  function isResident() { return _role === 'resident'; }
  function isLoggedIn() { return !!_user; }
  function getRole() { return _role; }
  function getUser() { return _user; }
  function getProfile() { return _profile; }
  function getUserEmail() { return _user?.email || ''; }
  function getUserId() { return _user?.id || null; }

  // Check if user can edit a specific committee's projects
  function canEditCommittee(committeeCode) {
    if (!_profile) return false;
    if (_role === 'admin') return true;
    if (_role === 'bom' && _profile.committees) {
      return _profile.committees.includes(committeeCode);
    }
    return false;
  }

  // Update profile
  async function updateProfile(updates) {
    if (!supa || !_user) return { error: { message: 'Not logged in' } };
    try {
      const { data, error } = await supa.from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', _user.id)
        .select()
        .single();

      if (error) return { error };
      _profile = data;
      _role = data.role;
      return { data };
    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  return {
    init,
    login,
    logout,
    resetPassword,
    changePassword,
    updateProfile,
    isAdmin,
    isBOM,
    isResident,
    isLoggedIn,
    getRole,
    getUser,
    getProfile,
    getUserEmail,
    getUserId,
    canEditCommittee
  };
})();
