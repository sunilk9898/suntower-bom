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
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('projects').select('*').order('created_at', { ascending: false });
    if (committeeFilter && committeeFilter !== 'All') {
      q = q.eq('committee', committeeFilter);
    }
    const { data, error } = await q;
    if (error) { console.error('getProjects:', error); return []; }
    return data || [];
  }

  async function getProject(id) {
    if (typeof supa === 'undefined' || !supa) return null;
    const { data, error } = await supa.from('projects').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async function createProject(project) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('projects').update(updates).eq('id', id).select().single();
    if (!error) {
      SunAudit.log('update_project', 'project', id, updates);
    }
    return { data, error };
  }

  // ===== PROJECT UPDATES =====
  async function getProjectUpdates(projectId) {
    if (typeof supa === 'undefined' || !supa) return [];
    const { data, error } = await supa.from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async function addProjectUpdate(projectId, text) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
    const { data, error } = await supa.from('project_expenses')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    return data || [];
  }

  async function addExpense(projectId, expense) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('notices').select('*').order('date', { ascending: false });
    if (categoryFilter && categoryFilter !== 'All') {
      q = q.eq('category', categoryFilter);
    }
    const { data, error } = await q;
    return data || [];
  }

  async function createNotice(notice) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
    const { data, error } = await supa.from('committee_members')
      .select('*')
      .order('committee');
    return data || [];
  }

  async function saveCommitteeMember(committee, role, memberName, profileId) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
    const { data, error } = await supa.from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    return data || [];
  }

  async function sendMessage(text, senderName) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('messages').insert({
      sender_id: SunAuth.getUserId(),
      sender_name: senderName || 'Resident',
      message: text
    }).select().single();
  }

  // ===== REGISTRATION REQUESTS =====
  async function submitRegistration(request) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('registration_requests').insert({
      owner_name: request.ownerName,
      flat_no: request.flatNo,
      mobile: request.mobile,
      email: request.email.toLowerCase()
    }).select().single();
  }

  async function getRegistrationRequests(statusFilter) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('registration_requests').select('*').order('request_date', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    return data || [];
  }

  async function updateRegistrationRequest(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('registration_requests')
      .update({ ...updates, review_date: new Date().toISOString(), reviewed_by: SunAuth.getUserId() })
      .eq('id', id)
      .select().single();
  }

  // ===== PROFILES (admin) =====
  async function getProfiles(roleFilter) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('profiles').select('*').order('created_at', { ascending: false });
    if (roleFilter) q = q.eq('role', roleFilter);
    const { data, error } = await q;
    if (!data) return [];
    // Deduplicate by id, then by email (keep first occurrence = most recent due to order)
    const seenIds = new Set(); const seenEmails = new Set(); const unique = [];
    data.forEach(p => {
      if (seenIds.has(p.id)) return;
      seenIds.add(p.id);
      const email = (p.email || '').toLowerCase();
      if (email && seenEmails.has(email)) return;
      if (email) seenEmails.add(email);
      unique.push(p);
    });
    return unique;
  }

  async function updateProfileAdmin(userId, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('documents').select('*').order('created_at', { ascending: false });
    if (categoryFilter) q = q.eq('category', categoryFilter);
    const { data, error } = await q;
    return data || [];
  }

  async function createDocument(doc) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
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
    if (typeof supa === 'undefined' || !supa) return [];
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
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) return { error };

    const { data: urlData } = supa.storage.from(bucket).getPublicUrl(path);
    return { data: { path: data.path, url: urlData.publicUrl } };
  }

  // ===== RESIDENTS DIRECTORY =====
  async function getResidents(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('residents_directory').select('*').order('name');
    if (filters) {
      if (filters.tower) q = q.eq('tower', filters.tower);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.search) q = q.or('name.ilike.%' + filters.search + '%,flat_full.ilike.%' + filters.search + '%,mobile.ilike.%' + filters.search + '%');
    }
    const { data, error } = await q;
    if (error) { console.error('getResidents:', error); return []; }
    return data || [];
  }

  async function createResident(resident) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('residents_directory').insert({
      name: resident.name,
      flat_full: resident.flat_full || '',
      tower: resident.tower || '',
      flat_no: resident.flat_no || '',
      resident_type: resident.resident_type || '',
      occupancy: resident.occupancy || '',
      status: resident.status || 'Active',
      mobile: resident.mobile || '',
      email: resident.email || null
    }).select().single();
    if (!error) {
      SunAudit.log('create_resident', 'resident', data.id, { name: resident.name, flat: resident.flat_full });
    }
    return { data, error };
  }

  async function updateResident(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('residents_directory')
      .update(updates).eq('id', id).select().single();
    if (!error) {
      SunAudit.log('update_resident', 'resident', id, updates);
    }
    return { data, error };
  }

  // ===== COMPLAINTS =====
  async function getComplaints(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('complaints').select('*').order('created_at', { ascending: false });
    if (filters) {
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.priority) q = q.eq('priority', filters.priority);
      if (filters.resident_id) q = q.eq('resident_id', filters.resident_id);
    }
    const { data, error } = await q;
    if (error) { console.error('getComplaints:', error); return []; }
    return data || [];
  }

  async function getMyComplaints() {
    if (typeof supa === 'undefined' || !supa) return [];
    const uid = SunAuth.getUserId();
    if (!uid) return [];
    const { data, error } = await supa.from('complaints')
      .select('*')
      .eq('resident_id', uid)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async function createComplaint(complaint) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const profile = SunAuth.getProfile();
    const { data, error } = await supa.from('complaints').insert({
      resident_id: SunAuth.getUserId(),
      resident_name: complaint.resident_name || profile?.display_name || '',
      flat_no: complaint.flat_no || profile?.flat_no || '',
      category: complaint.category || 'Other',
      subject: complaint.subject,
      description: complaint.description || '',
      photo_url: complaint.photo_url || null,
      priority: complaint.priority || 'Medium'
    }).select().single();
    if (!error) {
      SunAudit.log('create_complaint', 'complaint', data.id, { subject: complaint.subject, category: complaint.category });
    }
    return { data, error };
  }

  async function updateComplaint(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const updateData = { ...updates };
    if (updates.status === 'Resolved' || updates.status === 'Closed') {
      updateData.resolved_at = new Date().toISOString();
    }
    const { data, error } = await supa.from('complaints')
      .update(updateData).eq('id', id).select().single();
    if (!error) {
      SunAudit.log('update_complaint', 'complaint', id, updates);
    }
    return { data, error };
  }

  // ===== FINANCIAL SUMMARY =====
  async function getFinancialSummary(monthsBack) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('financial_summary').select('*').order('month', { ascending: false });
    if (monthsBack) q = q.limit(monthsBack);
    const { data, error } = await q;
    if (error) { console.error('getFinancialSummary:', error); return []; }
    return data || [];
  }

  async function getFinancialMonth(month) {
    if (typeof supa === 'undefined' || !supa) return null;
    const { data, error } = await supa.from('financial_summary')
      .select('*').eq('month', month).single();
    if (error) return null;
    return data;
  }

  async function upsertFinancialSummary(entry) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('financial_summary').upsert({
      month: entry.month,
      total_collection: entry.total_collection || 0,
      total_expenses: entry.total_expenses || 0,
      fund_balance: entry.fund_balance || 0,
      maintenance_due: entry.maintenance_due || 0,
      maintenance_collected: entry.maintenance_collected || 0,
      category_breakup: entry.category_breakup || {},
      notes: entry.notes || '',
      created_by: SunAuth.getUserId()
    }, { onConflict: 'month' }).select().single();
    if (!error) {
      SunAudit.log('upsert_financial', 'financial_summary', data.id, { month: entry.month });
    }
    return { data, error };
  }

  // ===== EVENTS =====
  async function getEvents(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('events').select('*').order('event_date', { ascending: true });
    if (filters) {
      if (filters.upcoming) q = q.gte('event_date', new Date().toISOString());
      if (filters.event_type) q = q.eq('event_type', filters.event_type);
    }
    const { data, error } = await q;
    if (error) { console.error('getEvents:', error); return []; }
    return data || [];
  }

  async function createEvent(event) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('events').insert({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type || 'Other',
      event_date: event.event_date,
      end_date: event.end_date || null,
      venue: event.venue || '',
      organizer: event.organizer || '',
      created_by: SunAuth.getUserId()
    }).select().single();
    if (!error) {
      SunAudit.log('create_event', 'event', data.id, { title: event.title, type: event.event_type });
    }
    return { data, error };
  }

  async function updateEvent(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('events')
      .update(updates).eq('id', id).select().single();
    return { data, error };
  }

  async function rsvpEvent(eventId) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const uid = SunAuth.getUserId();
    // Fetch current RSVP list, add user if not already there
    const { data: ev, error: fetchErr } = await supa.from('events').select('rsvp_list').eq('id', eventId).single();
    if (fetchErr) return { error: fetchErr };
    const list = ev.rsvp_list || [];
    if (!list.includes(uid)) {
      list.push(uid);
    }
    return await supa.from('events').update({ rsvp_list: list }).eq('id', eventId).select().single();
  }

  // ===== POLLS =====
  async function getPolls(statusFilter) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('polls').select('*').order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) { console.error('getPolls:', error); return []; }
    return data || [];
  }

  async function createPoll(poll) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('polls').insert({
      question: poll.question,
      options: poll.options,
      expires_at: poll.expires_at || null,
      created_by: SunAuth.getUserId()
    }).select().single();
    if (!error) {
      SunAudit.log('create_poll', 'poll', data.id, { question: poll.question });
    }
    return { data, error };
  }

  async function votePoll(pollId, optionIndex) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const uid = SunAuth.getUserId();
    // Fetch current votes
    const { data: poll, error: fetchErr } = await supa.from('polls').select('votes').eq('id', pollId).single();
    if (fetchErr) return { error: fetchErr };
    const votes = poll.votes || {};
    // Remove user from any other option
    Object.keys(votes).forEach(k => {
      if (Array.isArray(votes[k])) {
        votes[k] = votes[k].filter(v => v !== uid);
      }
    });
    // Add to selected option
    const key = String(optionIndex);
    if (!Array.isArray(votes[key])) votes[key] = [];
    votes[key].push(uid);

    const { data, error } = await supa.from('polls').update({ votes }).eq('id', pollId).select().single();
    return { data, error };
  }

  async function closePoll(pollId) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('polls').update({ status: 'closed' }).eq('id', pollId).select().single();
  }

  // ===== MEETING MINUTES =====
  async function getMeetingMinutes(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('meeting_minutes').select('*').order('meeting_date', { ascending: false });
    if (filters) {
      if (filters.meeting_type) q = q.eq('meeting_type', filters.meeting_type);
    }
    const { data, error } = await q;
    if (error) { console.error('getMeetingMinutes:', error); return []; }
    return data || [];
  }

  async function createMeetingMinutes(minutes) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('meeting_minutes').insert({
      meeting_type: minutes.meeting_type || 'BOM',
      meeting_date: minutes.meeting_date,
      title: minutes.title,
      attendees: minutes.attendees || [],
      agenda: minutes.agenda || '',
      minutes_text: minutes.minutes_text || '',
      ai_summary: minutes.ai_summary || null,
      decisions: minutes.decisions || [],
      file_url: minutes.file_url || null,
      created_by: SunAuth.getUserId()
    }).select().single();
    if (!error) {
      SunAudit.log('create_meeting_minutes', 'meeting', data.id, { title: minutes.title, type: minutes.meeting_type });
    }
    return { data, error };
  }

  async function updateMeetingMinutes(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('meeting_minutes')
      .update(updates).eq('id', id).select().single();
    return { data, error };
  }

  // ===== RESOLUTIONS =====
  async function getResolutions(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('resolutions').select('*').order('created_at', { ascending: false });
    if (filters) {
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.meeting_id) q = q.eq('meeting_id', filters.meeting_id);
    }
    const { data, error } = await q;
    if (error) { console.error('getResolutions:', error); return []; }
    return data || [];
  }

  async function createResolution(resolution) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('resolutions').insert({
      resolution_no: resolution.resolution_no || null,
      meeting_id: resolution.meeting_id || null,
      title: resolution.title,
      description: resolution.description || '',
      proposed_by: resolution.proposed_by || '',
      seconded_by: resolution.seconded_by || '',
      votes_for: resolution.votes_for || 0,
      votes_against: resolution.votes_against || 0,
      status: resolution.status || 'Passed',
      implementation_date: resolution.implementation_date || null
    }).select().single();
    if (!error) {
      SunAudit.log('create_resolution', 'resolution', data.id, { title: resolution.title });
    }
    return { data, error };
  }

  async function updateResolution(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('resolutions')
      .update(updates).eq('id', id).select().single();
    return { data, error };
  }

  // ===== PAYMENT TRACKING =====
  async function getPaymentTracking(filters) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('payment_tracking').select('*').order('month', { ascending: false });
    if (filters) {
      if (filters.flat_no) q = q.eq('flat_no', filters.flat_no);
      if (filters.month) q = q.eq('month', filters.month);
      if (filters.status) q = q.eq('status', filters.status);
    }
    const { data, error } = await q;
    if (error) { console.error('getPaymentTracking:', error); return []; }
    return data || [];
  }

  async function getMyPaymentStatus() {
    if (typeof supa === 'undefined' || !supa) return [];
    const profile = SunAuth.getProfile();
    if (!profile?.flat_no) return [];
    const { data, error } = await supa.from('payment_tracking')
      .select('*')
      .eq('flat_no', profile.flat_no)
      .order('month', { ascending: false })
      .limit(12);
    return data || [];
  }

  async function createPayment(payment) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('payment_tracking').upsert({
      flat_no: payment.flat_no,
      month: payment.month,
      amount_due: payment.amount_due,
      amount_paid: payment.amount_paid || 0,
      payment_date: payment.payment_date || null,
      payment_mode: payment.payment_mode || null,
      receipt_no: payment.receipt_no || null,
      status: payment.status || 'Pending'
    }, { onConflict: 'flat_no,month' }).select().single();
    if (!error) {
      SunAudit.log('upsert_payment', 'payment', data.id, { flat: payment.flat_no, month: payment.month });
    }
    return { data, error };
  }

  async function updatePayment(id, updates) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('payment_tracking')
      .update(updates).eq('id', id).select().single();
    if (!error) {
      SunAudit.log('update_payment', 'payment', id, updates);
    }
    return { data, error };
  }

  // ===== GALLERY =====
  async function getGalleryImages(projectId) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('gallery').select('*').order('created_at', { ascending: false });
    if (projectId) q = q.eq('project_id', projectId);
    const { data, error } = await q;
    return data || [];
  }

  async function uploadGalleryImage(image) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const { data, error } = await supa.from('gallery').insert({
      project_id: image.project_id || null,
      title: image.title || '',
      image_url: image.image_url,
      caption: image.caption || '',
      uploaded_by: SunAuth.getUserId()
    }).select().single();
    return { data, error };
  }

  // ===== EMAIL QUEUE =====
  async function queueEmail(email) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('email_queue').insert({
      to_email: email.to_email,
      to_name: email.to_name || '',
      subject: email.subject,
      body_html: email.body_html,
      template: email.template || null,
      metadata: email.metadata || {}
    }).select().single();
  }

  async function getEmailQueue(statusFilter) {
    if (typeof supa === 'undefined' || !supa) return [];
    let q = supa.from('email_queue').select('*').order('created_at', { ascending: false }).limit(100);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    return data || [];
  }

  // ===== NOTIFICATION PREFERENCES =====
  async function getNotificationPrefs() {
    if (typeof supa === 'undefined' || !supa) return null;
    const uid = SunAuth.getUserId();
    if (!uid) return null;
    const { data, error } = await supa.from('notification_prefs')
      .select('*').eq('profile_id', uid).single();
    if (error) return null;
    return data;
  }

  async function updateNotificationPrefs(prefs) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    const uid = SunAuth.getUserId();
    if (!uid) return { error: { message: 'Not logged in' } };
    return await supa.from('notification_prefs').upsert({
      profile_id: uid,
      email_notices: prefs.email_notices !== false,
      email_complaints: prefs.email_complaints !== false,
      email_monthly_report: prefs.email_monthly_report !== false,
      email_events: prefs.email_events !== false
    }, { onConflict: 'profile_id' }).select().single();
  }

  // ===== AI REPORTS =====
  async function getAIReport(reportType, reportMonth) {
    if (typeof supa === 'undefined' || !supa) return null;
    let q = supa.from('ai_reports').select('*').eq('report_type', reportType);
    if (reportMonth) q = q.eq('report_month', reportMonth);
    q = q.order('generated_at', { ascending: false }).limit(1);
    const { data, error } = await q;
    if (error || !data || data.length === 0) return null;
    return data[0];
  }

  async function saveAIReport(report) {
    if (typeof supa === 'undefined' || !supa) return { error: { message: 'Not connected' } };
    return await supa.from('ai_reports').insert({
      report_type: report.report_type,
      report_month: report.report_month || null,
      content: report.content
    }).select().single();
  }

  // ===== DASHBOARD KPI HELPERS =====
  async function getDashboardKPIs() {
    if (typeof supa === 'undefined' || !supa) return {};
    try {
      // Run multiple queries in parallel for speed
      const [
        projectsRes,
        complaintsRes,
        expensesRes,
        eventsRes,
        paymentsRes,
        financialRes
      ] = await Promise.all([
        supa.from('projects').select('id,status,committee,progress', { count: 'exact' }),
        supa.from('complaints').select('id,status,priority,category', { count: 'exact' }),
        supa.from('project_expenses').select('id,amount,bom_approved,created_at', { count: 'exact' }),
        supa.from('events').select('id,event_date,title').gte('event_date', new Date().toISOString()).order('event_date').limit(5),
        supa.from('payment_tracking').select('id,status,amount_due,amount_paid', { count: 'exact' }),
        supa.from('financial_summary').select('*').order('month', { ascending: false }).limit(1)
      ]);

      const projects = projectsRes.data || [];
      const complaints = complaintsRes.data || [];
      const expenses = expensesRes.data || [];
      const events = eventsRes.data || [];
      const payments = paymentsRes.data || [];
      const latestFinancial = (financialRes.data && financialRes.data[0]) || null;

      return {
        activeProjects: projects.filter(p => ['In Progress', 'Tender'].includes(p.status)).length,
        totalProjects: projects.length,
        openComplaints: complaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length,
        criticalComplaints: complaints.filter(c => c.priority === 'Critical' && c.status !== 'Resolved' && c.status !== 'Closed').length,
        pendingApprovals: expenses.filter(e => !e.bom_approved).length,
        upcomingEvents: events,
        overduePayments: payments.filter(p => p.status === 'Overdue').length,
        overdueTotalAmount: payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + Number(p.amount_due || 0) - Number(p.amount_paid || 0), 0),
        fundBalance: latestFinancial?.fund_balance || 0,
        monthlyCollection: latestFinancial?.maintenance_collected || 0,
        monthlyExpenses: latestFinancial?.total_expenses || 0,
        categoryBreakup: latestFinancial?.category_breakup || {},
        committeeProgress: _calcCommitteeProgress(projects)
      };
    } catch (e) {
      console.error('getDashboardKPIs:', e);
      return {};
    }
  }

  // Helper: Calculate average progress per committee
  function _calcCommitteeProgress(projects) {
    const map = {};
    ['A','B','C','D','E','F','G'].forEach(c => { map[c] = { total: 0, progress: 0, active: 0 }; });
    (projects || []).forEach(p => {
      if (map[p.committee]) {
        map[p.committee].total++;
        map[p.committee].progress += (p.progress || 0);
        if (['In Progress', 'Tender'].includes(p.status)) map[p.committee].active++;
      }
    });
    Object.keys(map).forEach(c => {
      map[c].avgProgress = map[c].total > 0 ? Math.round(map[c].progress / map[c].total) : 0;
    });
    return map;
  }

  // ===== REALTIME SUBSCRIPTIONS =====
  function subscribeToTable(table, callback) {
    if (typeof supa === 'undefined' || !supa) return null;
    return supa.channel('public:' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
        callback(payload);
      })
      .subscribe();
  }

  function unsubscribe(subscription) {
    if (subscription && supa) {
      supa.removeChannel(subscription);
    }
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
    uploadFile,
    // Residents Directory
    getResidents,
    createResident,
    updateResident,
    // Complaints
    getComplaints,
    getMyComplaints,
    createComplaint,
    updateComplaint,
    // Financial Summary
    getFinancialSummary,
    getFinancialMonth,
    upsertFinancialSummary,
    // Events
    getEvents,
    createEvent,
    updateEvent,
    rsvpEvent,
    // Polls
    getPolls,
    createPoll,
    votePoll,
    closePoll,
    // Meeting Minutes
    getMeetingMinutes,
    createMeetingMinutes,
    updateMeetingMinutes,
    // Resolutions
    getResolutions,
    createResolution,
    updateResolution,
    // Payment Tracking
    getPaymentTracking,
    getMyPaymentStatus,
    createPayment,
    updatePayment,
    // Gallery
    getGalleryImages,
    uploadGalleryImage,
    // Email Queue
    queueEmail,
    getEmailQueue,
    // Notification Prefs
    getNotificationPrefs,
    updateNotificationPrefs,
    // AI Reports
    getAIReport,
    saveAIReport,
    // Dashboard
    getDashboardKPIs,
    // Realtime
    subscribeToTable,
    unsubscribe
  };
})();
