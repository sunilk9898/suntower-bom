// ============================================
// SUN TOWER RWA — Audit Module
// ============================================
// Handles: audit logging to Supabase, audit log viewer UI

const SunAudit = (function() {
  'use strict';

  /**
   * Log an action to the audit_log table.
   * @param {string} action - e.g. 'login', 'create_project', 'update_complaint'
   * @param {string} resourceType - e.g. 'auth', 'project', 'complaint'
   * @param {string|null} resourceId - UUID of the affected resource
   * @param {object} details - Additional context (JSON)
   */
  async function log(action, resourceType, resourceId, details) {
    try {
      if (typeof supa === 'undefined' || !supa) return;
      const user = SunAuth.getUser ? SunAuth.getUser() : null;
      await supa.from('audit_log').insert({
        action: action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        user_id: user ? user.id : null,
        user_email: user ? user.email : (details && details.email) || null,
        details: details || {},
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('SunAudit.log failed:', e.message);
    }
  }

  /**
   * Build an audit log viewer inside a container element.
   * @param {string} containerId - DOM element ID to render into
   */
  async function buildAuditViewer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;padding:20px;color:#666">Loading audit log...</p>';

    try {
      const logs = typeof SunData !== 'undefined' && SunData.getAuditLog
        ? await SunData.getAuditLog(200)
        : [];

      if (!logs.length) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999">No audit log entries found.</p>';
        return;
      }

      let html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
      html += '<thead><tr style="background:#f5f5f5;text-align:left">';
      html += '<th style="padding:8px;border-bottom:2px solid #ddd">Time</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #ddd">Action</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #ddd">Type</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #ddd">User</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #ddd">Details</th>';
      html += '</tr></thead><tbody>';

      logs.forEach(function(log) {
        const time = log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—';
        const action = (log.action || '').replace(/_/g, ' ');
        const type = log.resource_type || '—';
        const user = log.user_email || '—';
        const details = log.details ? JSON.stringify(log.details).substring(0, 120) : '';
        html += '<tr style="border-bottom:1px solid #eee">';
        html += '<td style="padding:6px 8px;white-space:nowrap">' + time + '</td>';
        html += '<td style="padding:6px 8px;text-transform:capitalize">' + action + '</td>';
        html += '<td style="padding:6px 8px">' + type + '</td>';
        html += '<td style="padding:6px 8px;font-size:0.75rem">' + user + '</td>';
        html += '<td style="padding:6px 8px;font-size:0.72rem;color:#666;max-width:200px;overflow:hidden;text-overflow:ellipsis">' + details + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<p style="color:red;padding:10px">Error loading audit log: ' + e.message + '</p>';
    }
  }

  return { log, buildAuditViewer };
})();
