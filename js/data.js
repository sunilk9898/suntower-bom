// ============================================
// SUN TOWER RWA - Data Access Layer (Supabase)
// ============================================
// All CRUD operations go through this module.
// Replaces all localStorage reads/writes with Supabase queries.
// RLS enforces permissions server-side.

const SunData = (function() {
  'use strict';

  // ===== PROJECTS =====
  async function getProjects(committeeFilter) {
    if (!supa) return [];
    let q = supa.from('projects').select('*').order('created_at', { ascending: false });
    if (committeeFilter && committeeFilter !== 'All') {
      q = q.eq('committee', committeeFilter);
    }
    const { data, error } = await q;
    if (error) { console.error('getProjects:', error); return []; }
    return data || [];
  }

  async function getProject(id) {
    if (!supa) return null;
    const { data, error } = await supa.from('projects').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async function createProject(project) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('projects').insert({
      name: project.name,
      committee: project.committee,
      status: project.status || 'Planned',
      timeline: project.timeline || 'TBD',
      budget: project.budget || 'TBD',
      progress: project.progress || 0,
      description: project.description || '',
      created_by: SunAuth.getUserId()
    }).select().single();

    if (!error) {
      SunAudit.log('create_project', 'project', data.id, { name: project.name, committee: project.committee });
    }
    return { data, error };
  }

  async function updateProject(id, updates) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('projects').update(updates).eq('id', id).select().single();
    if (!error) {
      SunAudit.log('update_project', 'project', id, updates);
    }
    return { data, error };
  }

  // ===== PROJECT UPDATES =====
  async function getProjectUpdates(projectId) {
    if (!supa) return [];
    const { data, error } = await supa.from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async function addProjectUpdate(projectId, text) {
    if (!supa) return { error: { message: 'Not connected' } };
    const profile = SunAuth.getProfile();
    return await supa.from('project_updates').insert({
      project_id: projectId,
      update_text: text,
      author_id: SunAuth.getUserId(),
      author_name: profile?.display_name || profile?.email || 'BOM'
    }).select().single();
  }

  // ===== PROJECT EXPENSES =====
  async function getProjectExpenses(projectId) {
    if (!supa) return [];
    const { data, error } = await supa.from('project_expenses')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    return data || [];
  }

  async function addExpense(projectId, expense) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('project_expenses').insert({
      project_id: projectId,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor || null,
      date: expense.date || new Date().toISOString().split('T')[0],
      created_by: SunAuth.getUserId()
    }).select().single();

    if (!error) {
      SunAudit.log('add_expense', 'expense', data.id, { project_id: projectId, amount: expense.amount });
    }
    return { data, error };
  }

  async function approveExpense(expenseId, type) {
    if (!supa) return { error: { message: 'Not connected' } };
    const updates = {};
    if (type === 'bom') updates.bom_approved = true;
    if (type === 'gbm') updates.gbm_approved = true;
    updates.approved_by = SunAuth.getUserId();

    const { data, error } = await supa.from('project_expenses')
      .update(updates)
      .eq('id', expenseId)
      .select().single();

    if (!error) {
      SunAudit.log('approve_expense', 'expense', expenseId, { type });
    }
    return { data, error };
  }

  // ===== NOTICES =====
  async function getNotices(categoryFilter) {
    if (!supa) return [];
    let q = supa.from('notices').select('*').order('date', { ascending: false });
    if (categoryFilter && categoryFilter !== 'All') {
      q = q.eq('category', categoryFilter);
    }
    const { data, error } = await q;
    return data || [];
  }

  async function createNotice(notice) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('notices').insert({
      title: notice.title,
      summary: notice.summary || '',
      category: notice.category || 'General',
      date: notice.date || new Date().toISOString().split('T')[0],
      file_url: notice.file_url || '',
      file_type: notice.file_type || '',
      is_auto: notice.is_auto || false,
      created_by: SunAuth.getUserId()
    }).select().single();

    if (!error) {
      SunAudit.log('create_notice', 'notice', data.id, { title: notice.title, category: notice.category });
    }
    return { data, error };
  }

  // ===== COMMITTEE MEMBERS =====
  async function getCommitteeMembers() {
    if (!supa) return [];
    const { data, error } = await supa.from('committee_members')
      .select('*')
      .order('committee');
    return data || [];
  }

  async function saveCommitteeMember(committee, role, memberName, profileId) {
    if (!supa) return { error: { message: 'Not connected' } };
    // Upsert by unique (committee, role)
    const { data, error } = await supa.from('committee_members')
      .upsert({
        committee,
        role,
        member_name: memberName,
        profile_id: profileId || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'committee,role' })
      .select().single();

    return { data, error };
  }

  // Convert flat list to nested object format {A: {convenor, bomMember, residents[]}}
  function buildCommitteeMap(rows) {
    const map = {};
    ['A','B','C','D','E','F','G'].forEach(c => {
      map[c] = { convenor: '', bomMember: '', residents: ['', '', ''] };
    });
    (rows || []).forEach(r => {
      if (!map[r.committee]) return;
      if (r.role === 'convenor') map[r.committee].convenor = r.member_name || '';
      else if (r.role === 'bom_member') map[r.committee].bomMember = r.member_name || '';
      else if (r.role === 'resident_1') map[r.committee].residents[0] = r.member_name || '';
      else if (r.role === 'resident_2') map[r.committee].residents[1] = r.member_name || '';
      else if (r.role === 'resident_3') map[r.committee].residents[2] = r.member_name || '';
    });
    return map;
  }

  // ===== MESSAGES =====
  async function getMessages(limit) {
    if (!supa) return [];
    const { data, error } = await supa.from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    return data || [];
  }

  async function sendMessage(text, senderName) {
    if (!supa) return { error: { message: 'Not connected' } };
    return await supa.from('messages').insert({
      sender_id: SunAuth.getUserId(),
      sender_name: senderName || 'Resident',
      message: text
    }).select().single();
  }

  // ===== REGISTRATION REQUESTS =====
  async function submitRegistration(request) {
    if (!supa) return { error: { message: 'Not connected' } };
    return await supa.from('registration_requests').insert({
      owner_name: request.ownerName,
      flat_no: request.flatNo,
      mobile: request.mobile,
      email: request.email.toLowerCase()
    }).select().single();
  }

  async function getRegistrationRequests(statusFilter) {
    if (!supa) return [];
    let q = supa.from('registration_requests').select('*').order('request_date', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    return data || [];
  }

  async function updateRegistrationRequest(id, updates) {
    if (!supa) return { error: { message: 'Not connected' } };
    return await supa.from('registration_requests')
      .update({ ...updates, review_date: new Date().toISOString(), reviewed_by: SunAuth.getUserId() })
      .eq('id', id)
      .select().single();
  }

  // ===== PROFILES (admin) =====
  async function getProfiles(roleFilter) {
    if (!supa) return [];
    let q = supa.from('profiles').select('*').order('created_at', { ascending: false });
    if (roleFilter) q = q.eq('role', roleFilter);
    const { data, error } = await q;
    return data || [];
  }

  async function updateProfileAdmin(userId, updates) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select().single();

    if (!error) {
      SunAudit.log('update_profile', 'profile', userId, updates);
    }
    return { data, error };
  }

  // ===== DOCUMENTS =====
  async function getDocuments(categoryFilter) {
    if (!supa) return [];
    let q = supa.from('documents').select('*').order('created_at', { ascending: false });
    if (categoryFilter) q = q.eq('category', categoryFilter);
    const { data, error } = await q;
    return data || [];
  }

  async function createDocument(doc) {
    if (!supa) return { error: { message: 'Not connected' } };
    return await supa.from('documents').insert({
      title: doc.title,
      category: doc.category || 'public',
      file_url: doc.file_url || '',
      file_type: doc.file_type || '',
      description: doc.description || '',
      uploaded_by: SunAuth.getUserId()
    }).select().single();
  }

  // ===== AUDIT LOG =====
  async function getAuditLog(limit, filters) {
    if (!supa) return [];
    let q = supa.from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit || 100);

    if (filters) {
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.user_email) q = q.ilike('user_email', '%' + filters.user_email + '%');
      if (filters.resource_type) q = q.eq('resource_type', filters.resource_type);
      if (filters.from_date) q = q.gte('created_at', filters.from_date);
      if (filters.to_date) q = q.lte('created_at', filters.to_date);
    }

    const { data, error } = await q;
    return data || [];
  }

  // ===== SUPABASE STORAGE =====
  async function uploadFile(bucket, path, file) {
    if (!supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) return { error };

    const { data: urlData } = supa.storage.from(bucket).getPublicUrl(path);
    return { data: { path: data.path, url: urlData.publicUrl } };
  }

  return {
    // Projects
    getProjects,
    getProject,
    createProject,
    updateProject,
    // Project Updates
    getProjectUpdates,
    addProjectUpdate,
    // Project Expenses
    getProjectExpenses,
    addExpense,
    approveExpense,
    // Notices
    getNotices,
    createNotice,
    // Committee Members
    getCommitteeMembers,
    saveCommitteeMember,
    buildCommitteeMap,
    // Messages
    getMessages,
    sendMessage,
    // Registration
    submitRegistration,
    getRegistrationRequests,
    updateRegistrationRequest,
    // Profiles
    getProfiles,
    updateProfileAdmin,
    // Documents
    getDocuments,
    createDocument,
    // Audit
    getAuditLog,
    // Storage
    uploadFile
  };
})();
