// ============================================
// SUN TOWER RWA - Audit Logging Module
// ============================================
// All security-relevant actions are logged to audit_log table.
// Only admin can read audit logs (RLS enforced).

const SunAudit = (function() {
  'use strict';

  // Log an audit event
  async function log(action, resourceType, resourceId, details) {
    if (!supa) return;
    try {
      const user = SunAuth.getUser();
      await supa.from('audit_log').insert({
        user_id: user?.id || null,
        user_email: user?.email || 'anonymous',
        action: action,
        resource_type: resourceType || null,
        resource_id: resourceId || null,
        details: details || {},
        ip_address: null // Could use a service, but not required
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  }

  // Build audit log viewer HTML (admin only)
  async function buildAuditViewer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!SunAuth.isAdmin()) {
      container.innerHTML = '<p style="color:#b71c1c">Admin access required.</p>';
      return;
    }

    container.innerHTML = '<p style="color:#999;text-align:center">Loading audit log...</p>';

    // Filters
    let filterHtml = `
      <div class="audit-filters" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px">
        <select class="form-control" id="auditActionFilter" style="max-width:200px" onchange="SunAudit.refresh()">
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="create_project">Create Project</option>
          <option value="update_project">Update Project</option>
          <option value="create_notice">Create Notice</option>
          <option value="approve_resident">Approve Resident</option>
          <option value="reject_resident">Reject Resident</option>
          <option value="create_account">Create Account</option>
          <option value="delete_account">Delete Account</option>
          <option value="password_change">Password Change</option>
          <option value="add_expense">Add Expense</option>
          <option value="approve_expense">Approve Expense</option>
        </select>
        <input type="text" class="form-control" id="auditUserFilter" placeholder="Filter by email" style="max-width:200px" onchange="SunAudit.refresh()">
        <input type="date" class="form-control" id="auditFromDate" style="max-width:160px" onchange="SunAudit.refresh()">
        <input type="date" class="form-control" id="auditToDate" style="max-width:160px" onchange="SunAudit.refresh()">
        <button class="btn btn-sm" style="background:var(--primary);color:#fff" onclick="SunAudit.refresh()">&#8635; Refresh</button>
      </div>
    `;

    container.innerHTML = filterHtml + '<div id="auditLogTable"><p style="color:#999;text-align:center">Loading...</p></div>';

    await refresh();
  }

  // Refresh audit table with current filters
  async function refresh() {
    const table = document.getElementById('auditLogTable');
    if (!table) return;

    const filters = {};
    const actionEl = document.getElementById('auditActionFilter');
    const userEl = document.getElementById('auditUserFilter');
    const fromEl = document.getElementById('auditFromDate');
    const toEl = document.getElementById('auditToDate');

    if (actionEl?.value) filters.action = actionEl.value;
    if (userEl?.value) filters.user_email = userEl.value;
    if (fromEl?.value) filters.from_date = fromEl.value + 'T00:00:00';
    if (toEl?.value) filters.to_date = toEl.value + 'T23:59:59';

    const logs = await SunData.getAuditLog(200, filters);

    if (!logs.length) {
      table.innerHTML = '<p style="color:#999;text-align:center;padding:20px">No audit entries found.</p>';
      return;
    }

    const actionColors = {
      login: '#2e7d32', logout: '#616161',
      create_project: '#1565c0', update_project: '#e65100',
      create_notice: '#4a148c', create_account: '#00695c',
      delete_account: '#b71c1c', approve_resident: '#2e7d32',
      reject_resident: '#b71c1c', password_change: '#e65100',
      add_expense: '#004d40', approve_expense: '#1a237e'
    };

    let h = `<div style="max-height:500px;overflow-y:auto">
      <table class="acct-table" style="font-size:0.8rem">
      <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Details</th></tr>`;

    logs.forEach(l => {
      const ts = new Date(l.created_at).toLocaleString();
      const col = actionColors[l.action] || '#333';
      const detStr = l.details ? JSON.stringify(l.details).slice(0, 80) : '';
      h += `<tr>
        <td style="white-space:nowrap">${ts}</td>
        <td>${l.user_email || '—'}</td>
        <td><span class="badge" style="background:${col};font-size:0.7rem">${l.action}</span></td>
        <td>${l.resource_type || ''}${l.resource_id ? ' #' + l.resource_id.slice(0, 8) : ''}</td>
        <td style="font-size:0.72rem;color:#666;max-width:200px;overflow:hidden;text-overflow:ellipsis">${detStr}</td>
      </tr>`;
    });

    h += '</table></div>';
    h += `<p style="font-size:0.75rem;color:#999;margin-top:8px">Showing ${logs.length} entries</p>`;
    table.innerHTML = h;
  }

  return {
    log,
    buildAuditViewer,
    refresh
  };
})();
