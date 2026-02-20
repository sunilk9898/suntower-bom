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

    // Listen for auth state changes
    supa.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        _user = session?.user || null;
        if (_user) {
          await _loadProfile();
          _startSessionMonitor();
        }
      } else if (event === 'SIGNED_OUT') {
        _clearState();
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

    // Check for existing session
    _restoreSession();
  }

  // Restore existing session on page load
  async function _restoreSession() {
    if (!supa) return;
    try {
      const { data: { session }, error } = await supa.auth.getSession();
      if (session && session.user) {
        _user = session.user;
        await _loadProfile();
        _startSessionMonitor();
        if (_onAuthChange) {
          _onAuthChange({
            event: 'RESTORED',
            user: _user,
            profile: _profile,
            role: _role
          });
        }
      }
    } catch (e) {
      console.error('SunAuth: session restore error:', e);
    }
  }

  // Load profile from Supabase
  async function _loadProfile() {
    if (!supa || !_user) return;
    try {
      const { data, error } = await supa.from('profiles')
        .select('*')
        .eq('id', _user.id)
        .single();

      if (data) {
        _profile = data;
        _role = data.role;
      } else {
        // Profile might not exist yet (trigger delay), retry once
        await new Promise(r => setTimeout(r, 1000));
        const retry = await supa.from('profiles')
          .select('*')
          .eq('id', _user.id)
          .single();
        if (retry.data) {
          _profile = retry.data;
          _role = retry.data.role;
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
      await _loadProfile();
      _startSessionMonitor();

      // Log audit event
      SunAudit.log('login', 'auth', null, { email: email });

      return { data: { user: _user, profile: _profile, role: _role } };
    } catch (e) {
      return { error: { message: e.message || 'Login failed' } };
    }
  }

  // Logout
  async function logout() {
    if (!supa) return;
    SunAudit.log('logout', 'auth', null, { email: _user?.email });
    _stopSessionMonitor();
    await supa.auth.signOut();
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
