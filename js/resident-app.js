// ============================================
// SUN TOWER RWA — Resident Portal App
// ============================================
'use strict';

// ===== GLOBAL STATE =====
let currentUser = null;
let residentUser = null;
let notices = [];
let members = [];

// Election results (static)
const EM = [
  {name:'Sh. Lakhmi Chand',flat:'STB-304',v:129},
  {name:'Sh. Sunil Kumar',flat:'STD-701',v:128},
  {name:'Sh. Santosh Kr. Srivastava',flat:'STC-104',v:123},
  {name:'Sh. Himanshu Chaudhary',flat:'STC-502',v:117},
  {name:'Sh. Mahesh Chand Gupta',flat:'STD-901',v:115},
  {name:'Sh. Biman Saha',flat:'STC-805',v:113},
  {name:'Sh. Raj Kumar Rana',flat:'STC-504',v:107},
  {name:'Sh. Laxman Singh Pangtey',flat:'STC-603',v:106},
  {name:'Sh. Rajeev Mehta',flat:'STC-902',v:106},
  {name:'Sh. Harendra Singh',flat:'STD-906',v:105}
];

// Project defaults for resident view
const DEF_PROJECTS = [
  {id:'P1',name:'Security Room Gate 1',committee:'F',status:'In Progress',timeline:'Feb-Mar 2026',budget:'TBD',progress:30,description:'Construction of new security room at Gate 1 entrance'},
  {id:'P2',name:'Gate 2 Park Plus',committee:'F',status:'Planned',timeline:'Mar 2026',budget:'TBD',progress:5,description:'Integration of Park Plus system at Gate 2'},
  {id:'P3',name:'Basement Painting',committee:'F',status:'Planned',timeline:'Apr 2026',budget:'TBD',progress:0,description:'Complete basement painting and waterproofing'},
  {id:'P4',name:'Reception Renovation',committee:'F',status:'Planned',timeline:'Apr-May 2026',budget:'TBD',progress:0,description:'Complete renovation of reception area'},
  {id:'P5',name:'CCTV Cameras',committee:'A',status:'Planned',timeline:'Mar 2026',budget:'TBD',progress:10,description:'Installation of new CCTV cameras across all areas'},
  {id:'P6',name:'EV Charging',committee:'F',status:'Planned',timeline:'Q2 2026',budget:'TBD',progress:0,description:'Electric vehicle charging stations in basement'},
  {id:'P7',name:'Lift Renovation',committee:'F',status:'Tender',timeline:'Q2-Q3 2026',budget:'TBD',progress:5,description:'Major lift renovation across all towers'},
  {id:'P8',name:'Fire NOC',committee:'C',status:'In Progress',timeline:'Ongoing',budget:'TBD',progress:40,description:'Fire NOC compliance and roof exit construction'}
];

// ===== SUPABASE KV SYNC =====
function supaSync(key) {
  if (!supa) return;
  try {
    var v = localStorage.getItem(key);
    if (v) { supa.from('kv_store').upsert({key:key, value:JSON.parse(v), updated_at:new Date().toISOString()}).then(function(){}).catch(function(){}); }
  } catch(e) {}
}

async function supaHydrate() {
  if (!supa) return;
  try {
    var res = await supa.from('kv_store').select('*');
    if (res.data) { res.data.forEach(function(r) { localStorage.setItem(r.key, JSON.stringify(r.value)); }); }
  } catch(e) {}
}

// ===== AUTH STATE =====
SunAuth.init(function(state) {
  console.log('Resident Auth:', state.event, state.role);
  if (state.event === 'SIGNED_IN' || state.event === 'RESTORED' || state.event === 'TOKEN_REFRESHED' || state.event === 'INITIAL_SESSION') {
    if (!state.user) { currentUser = null; residentUser = null; updateUI(); return; }
    currentUser = { email: state.user.email, id: state.user.id };

    // BOM/admin users → redirect to /bom/
    if (state.role === 'admin' || state.role === 'bom') {
      window.location.href = 'https://bom.suntower.in/';
      return;
    }

    if (state.role === 'resident') {
      residentUser = state.profile ? {
        ownerName: state.profile.display_name || state.user.email,
        flatNo: state.profile.flat_no || '',
        email: state.user.email,
        status: 'approved'
      } : null;
    }
    updateUI();
    if (residentUser && (state.event === 'INITIAL_SESSION' || state.event === 'SIGNED_IN')) {
      unlockResident();
    }
  } else if (state.event === 'SIGNED_OUT' || state.event === 'SESSION_EXPIRED') {
    currentUser = null; residentUser = null;
    updateUI();
    lockResident();
  }
});

// ===== UI UPDATE =====
function updateUI() {
  const u = document.getElementById('headerUser');
  const b = document.getElementById('headerAuthBtn');
  if (currentUser && residentUser) {
    u.innerHTML = (residentUser.ownerName || currentUser.email) + ' <span class="role-badge role-badge-resident">RESIDENT</span>';
    b.textContent = 'Logout';
  } else if (currentUser) {
    u.innerHTML = currentUser.email;
    b.textContent = 'Logout';
  } else {
    u.innerHTML = '';
    b.textContent = 'Login';
  }
}

function toggleAuthBtn() {
  if (currentUser) { doResidentLogout(); return; }
  showResidentAuth('login');
}

// ===== RESIDENT AUTH =====
function showResidentAuth(mode) {
  document.getElementById('residentAuthOverlay').classList.remove('hidden');
  if (mode === 'register') {
    document.getElementById('resLoginForm').style.display = 'none';
    document.getElementById('resRegForm').style.display = 'block';
    document.getElementById('resForgotForm').style.display = 'none';
  } else if (mode === 'forgot') {
    document.getElementById('resLoginForm').style.display = 'none';
    document.getElementById('resRegForm').style.display = 'none';
    document.getElementById('resForgotForm').style.display = 'block';
  } else {
    document.getElementById('resLoginForm').style.display = 'block';
    document.getElementById('resRegForm').style.display = 'none';
    document.getElementById('resForgotForm').style.display = 'none';
  }
}
function hideResidentAuth() { document.getElementById('residentAuthOverlay').classList.add('hidden'); }
function showResLoginForm() { showResidentAuth('login'); }
function showResRegForm() { showResidentAuth('register'); }
function showResForgotPw() { showResidentAuth('forgot'); }

async function doResidentLogin() {
  const e = document.getElementById('resLoginEmail').value.trim();
  const p = document.getElementById('resLoginPassword').value;
  const flat = document.getElementById('resLoginFlat').value.trim().toUpperCase();
  const err = document.getElementById('resLoginError');
  const suc = document.getElementById('resLoginSuccess');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!e || !p) { err.textContent = 'Enter email and password'; err.style.display = 'block'; return; }

  const result = await SunAuth.login(e, p);
  if (result.error) { err.textContent = result.error.message || 'Invalid email or password.'; err.style.display = 'block'; return; }

  const profile = result.data.profile;
  // BOM/admin → redirect to /bom/
  if (!profile || profile.role === 'admin' || profile.role === 'bom') {
    currentUser = { email: result.data.user.email, id: result.data.user.id };
    suc.textContent = 'Redirecting to BOM Portal...'; suc.style.display = 'block';
    setTimeout(function() { window.location.href = 'https://bom.suntower.in/'; }, 600);
    return;
  }

  // Resident login
  residentUser = {
    ownerName: profile.display_name || e.split('@')[0],
    flatNo: profile.flat_no || flat || '',
    email: e.toLowerCase(),
    status: 'approved'
  };
  currentUser = { email: result.data.user.email, id: result.data.user.id };
  suc.textContent = 'Welcome, ' + (profile.display_name || 'Resident') + '!'; suc.style.display = 'block';
  setTimeout(function() { hideResidentAuth(); unlockResident(); updateUI(); }, 600);
}

function unlockResident() {
  document.getElementById('residentLocked').style.display = 'none';
  document.getElementById('residentContent').style.display = 'block';
  if (residentUser) {
    document.getElementById('residentNameDisplay').textContent = residentUser.ownerName || '';
    document.getElementById('residentFlatDisplay').textContent = residentUser.flatNo ? 'Flat: ' + residentUser.flatNo : '';
  }
  document.getElementById('chatWidget').style.display = 'block';
  updateMobileNav();
  loadResidentDashboard();
}

function lockResident() {
  document.getElementById('residentLocked').style.display = 'block';
  document.getElementById('residentContent').style.display = 'none';
  document.getElementById('chatWidget').style.display = 'none';
  updateMobileNav();
}

function doResidentLogout() {
  SunAuth.logout();
  residentUser = null; currentUser = null;
  lockResident();
  updateUI();
}

// ===== REGISTRATION =====
async function submitResidentReg() {
  const name = document.getElementById('regOwnerName').value.trim();
  const flat = document.getElementById('regFlatNo').value.trim();
  const mob = document.getElementById('regMobile').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const err = document.getElementById('resRegError');
  const suc = document.getElementById('resRegSuccess');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!name || !flat || !mob || !email) { err.textContent = 'All fields are required'; err.style.display = 'block'; return; }
  if (!/\S+@\S+\.\S+/.test(email)) { err.textContent = 'Enter a valid email address'; err.style.display = 'block'; return; }
  if (mob.length < 10) { err.textContent = 'Enter a valid 10-digit mobile number'; err.style.display = 'block'; return; }

  const result = await SunData.submitRegistration({ ownerName: name, flatNo: flat.toUpperCase(), mobile: mob, email: email });
  if (result.error) {
    if (result.error.message && result.error.message.includes('duplicate')) {
      err.textContent = 'This flat/email is already registered.'; err.style.display = 'block';
    } else {
      // Fallback to localStorage
      const residents = JSON.parse(localStorage.getItem('st_residents') || '[]');
      residents.push({ id: 'REG_' + Date.now(), ownerName: name, flatNo: flat.toUpperCase(), mobile: mob, email: email.toLowerCase(), status: 'pending', requestDate: new Date().toISOString() });
      localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents');
      suc.textContent = 'Registration submitted! Admin will verify and approve your account.'; suc.style.display = 'block';
    }
  } else {
    suc.textContent = 'Registration request submitted! You will receive login credentials after approval.'; suc.style.display = 'block';
  }
  document.getElementById('regOwnerName').value = ''; document.getElementById('regFlatNo').value = '';
  document.getElementById('regMobile').value = ''; document.getElementById('regEmail').value = '';
}

// ===== FORGOT PASSWORD =====
async function sendResidentOTP() {
  const email = document.getElementById('resForgotEmail').value.trim();
  const err = document.getElementById('resForgotError');
  const suc = document.getElementById('resForgotSuccess');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!email) { err.textContent = 'Enter your registered email'; err.style.display = 'block'; return; }
  const result = await SunAuth.resetPassword(email);
  if (result.error) { err.textContent = result.error.message || 'Email not found.'; err.style.display = 'block'; return; }
  suc.innerHTML = 'A password reset link has been sent to <strong>' + email + '</strong>.<br><span style="font-size:0.85rem;color:#666">Check your email and click the link to set a new password.</span>';
  suc.style.display = 'block';
}

// ===== SECTION TOGGLE =====
function toggleRsec(s) {
  document.querySelectorAll('[id^="rs_"]').forEach(function(el) { el.style.display = 'none'; });
  var el = document.getElementById('rs_' + s);
  if (el) el.style.display = 'block';
  if (s === 'bominfo') buildResElectionTable();
  if (s === 'projects') buildResProjectList();
  if (s === 'mycomplaints') loadMyComplaints();
  if (s === 'financials') loadResFinancials();
  if (s === 'polls') loadResidentPolls();
  if (s === 'events') loadResidentEvents();
  if (s === 'notices') loadResNotices();
  if (s === 'noticeboard') loadNotices();
}

// ===== DASHBOARD LOADER =====
async function loadResidentDashboard() {
  loadMemLS();
  loadResPaymentStatus();
  loadResActivityFeed();
  loadResBadges();
}

// ===== MEMBERS =====
function loadMemLS() {
  try {
    var s = localStorage.getItem('suntower_members');
    if (s) members = JSON.parse(s);
  } catch(e) {}
}

function buildResElectionTable() {
  var t = document.getElementById('resElectionTable');
  if (!t) return;
  var POS_ORDER = ['President','Vice President','Gen Secretary','Vice Gen Secretary','Joint Secretary','Treasurer','Vice Treasurer','Joint Treasurer','Sport Secretary','Culture Secretary','Spokesperson','Chairman','Co-Chairman','PRO','Advisor','Member','Executive Member'];
  var merged = EM.map(function(m, i) {
    var mem = members[i];
    return { name: m.name, flat: m.flat, v: m.v, pos: mem && mem.position ? mem.position : 'To be elected' };
  });
  merged.sort(function(a, b) {
    var ai = POS_ORDER.indexOf(a.pos); var bi = POS_ORDER.indexOf(b.pos);
    var pa = ai >= 0 ? ai : (a.pos === 'To be elected' ? 999 : POS_ORDER.length);
    var pb = bi >= 0 ? bi : (b.pos === 'To be elected' ? 999 : POS_ORDER.length);
    if (pa !== pb) return pa - pb; return b.v - a.v;
  });
  var pc = {'President':'badge-president','Vice President':'badge-vp','Gen Secretary':'badge-gs','Vice Gen Secretary':'badge-vgs','Treasurer':'badge-treasurer','Vice Treasurer':'badge-vt','Joint Treasurer':'badge-vt','Joint Secretary':'badge-vgs','Sport Secretary':'badge-info','Culture Secretary':'badge-info','Spokesperson':'badge-warning','Chairman':'badge-president','Co-Chairman':'badge-vp','PRO':'badge-info','Advisor':'badge-vt','Member':'badge-member','Executive Member':'badge-member'};
  var h = '<tr><th>#</th><th>Name</th><th>Flat</th><th>Votes</th><th>Position</th></tr>';
  merged.forEach(function(m, i) {
    var cls = pc[m.pos] || 'badge-success';
    h += '<tr style="background:#e8f5e9"><td>' + (i+1) + '</td><td><strong>' + m.name + '</strong></td><td>' + m.flat + '</td><td><strong>' + m.v + '</strong></td><td><span class="badge ' + cls + '">' + m.pos + '</span></td></tr>';
  });
  t.innerHTML = h;
}

// ===== PROJECTS =====
function buildResProjectList() {
  var el = document.getElementById('resProjectList');
  if (!el) return;
  var projects;
  try { var s = localStorage.getItem('st_projects'); projects = s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEF_PROJECTS)); } catch(e) { projects = JSON.parse(JSON.stringify(DEF_PROJECTS)); }
  var COMM_NAMES = {A:'Security',B:'Housekeeping',C:'Fire Safety',D:'Facilities',E:'Revenue',F:'Infrastructure',G:'Legal'};
  var STATUS_COLORS = {'Planned':'#1565c0','In Progress':'#e65100','Tender':'#b71c1c','On Hold':'#616161','Completed':'#2e7d32'};
  if (!projects.length) { el.innerHTML = '<div class="kpi-empty">No active projects</div>'; return; }
  el.innerHTML = projects.map(function(p) {
    var color = STATUS_COLORS[p.status] || '#666';
    return '<div class="card" style="margin-bottom:10px;border-left:4px solid ' + color + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div><h4 style="margin:0;font-size:0.95rem">' + esc(p.name) + '</h4>' +
      '<div style="font-size:0.8rem;color:#666;margin-top:2px">' + (COMM_NAMES[p.committee] || '') + ' | ' + (p.timeline || '') + '</div></div>' +
      '<span class="badge" style="background:' + color + '">' + p.status + '</span></div>' +
      '<div style="margin-top:8px;background:#e0e0e0;border-radius:6px;height:8px;overflow:hidden"><div style="height:100%;width:' + (p.progress || 0) + '%;background:' + color + ';border-radius:6px"></div></div>' +
      '<div style="font-size:0.75rem;color:#999;margin-top:3px">' + (p.progress || 0) + '% complete</div>' +
      '</div>';
  }).join('');
}

// ===== PAYMENT STATUS =====
async function loadResPaymentStatus() {
  try {
    var flat = residentUser && residentUser.flatNo || '';
    if (!flat) { setPaymentUI('unknown'); return; }
    var status = await SunData.getMyPaymentStatus(flat);
    if (!status || !status.length) { setPaymentUI('none'); return; }
    var latest = status[0];
    if (latest.status === 'Paid') setPaymentUI('paid', latest);
    else if (latest.status === 'Overdue') setPaymentUI('overdue', latest);
    else setPaymentUI('pending', latest);
  } catch(e) { setPaymentUI('unknown'); }
}

function setPaymentUI(type, data) {
  var icon = document.getElementById('resPaymentIcon');
  var label = document.getElementById('resPaymentLabel');
  var detail = document.getElementById('resPaymentDetail');
  var box = document.getElementById('resPaymentStatus');
  if (!icon || !label) return;
  if (type === 'paid') {
    box.style.background = 'linear-gradient(135deg,#e8f5e9,#c8e6c9)';
    icon.textContent = '\u2705';
    label.style.color = '#2e7d32'; label.textContent = 'Paid';
    detail.textContent = data ? '\u20B9' + formatNum(data.amount_paid) + ' \u2022 ' + new Date(data.month).toLocaleString('en-IN', {month:'short',year:'numeric'}) : 'Up to date';
  } else if (type === 'overdue') {
    box.style.background = 'linear-gradient(135deg,#ffebee,#ffcdd2)';
    icon.textContent = '\uD83D\uDD34';
    label.style.color = '#c62828'; label.textContent = 'Overdue';
    detail.textContent = data ? '\u20B9' + formatNum(data.amount_due) + ' due for ' + new Date(data.month).toLocaleString('en-IN', {month:'short',year:'numeric'}) : 'Payment overdue';
  } else if (type === 'pending') {
    box.style.background = 'linear-gradient(135deg,#fff8e1,#ffecb3)';
    icon.textContent = '\u23F3';
    label.style.color = '#e65100'; label.textContent = 'Pending';
    detail.textContent = data ? '\u20B9' + formatNum(data.amount_due) + ' for ' + new Date(data.month).toLocaleString('en-IN', {month:'short',year:'numeric'}) : 'Payment pending';
  } else if (type === 'none') {
    box.style.background = 'linear-gradient(135deg,#f5f5f5,#eeeeee)';
    icon.textContent = '\u2139\uFE0F';
    label.style.color = '#666'; label.textContent = 'No Data';
    detail.textContent = 'Payment tracking not yet set up';
  } else {
    label.textContent = '--'; detail.textContent = '';
  }
}

// ===== BADGES =====
async function loadResBadges() {
  try {
    var complaints = await SunData.getMyComplaints();
    var openComplaints = (complaints || []).filter(function(c) { return c.status !== 'Resolved' && c.status !== 'Closed'; });
    var badge = document.getElementById('resComplaintBadge');
    if (badge && openComplaints.length > 0) { badge.textContent = openComplaints.length; badge.style.display = 'flex'; }
    var polls = await SunData.getPolls('active');
    var pollBadge = document.getElementById('resPollBadge');
    if (pollBadge && polls && polls.length > 0) { pollBadge.textContent = polls.length; pollBadge.style.display = 'flex'; }
  } catch(e) {}
}

// ===== COMPLAINTS =====
async function submitResidentComplaint() {
  var subject = document.getElementById('rcSubject').value;
  var category = document.getElementById('rcCategory').value;
  var desc = document.getElementById('rcDescription').value;
  if (!subject) { showToast('Enter complaint subject', 'error'); return; }
  var res = await SunData.createComplaint({subject:subject, category:category, description:desc});
  if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; }
  showToast('Complaint submitted! Reference: ' + res.data.id.substring(0, 8), 'success');
  // Trigger email notification
  triggerComplaintEmail({subject:subject, category:category, id:res.data.id});
  document.getElementById('rcSubject').value = '';
  document.getElementById('rcDescription').value = '';
  document.getElementById('rsNewComplaintForm').style.display = 'none';
  loadMyComplaints();
}

async function loadMyComplaints() {
  var data = await SunData.getMyComplaints();
  var el = document.getElementById('myComplaintsList');
  if (!el) return;
  if (!data || data.length === 0) { el.innerHTML = '<div class="kpi-empty">No complaints submitted</div>'; return; }
  el.innerHTML = data.map(function(c) {
    return '<div class="complaint-card" data-priority="' + (c.priority||'') + '" style="margin-bottom:10px">' +
      '<div class="complaint-card-header"><div class="complaint-card-title">' + esc(c.subject) + '</div>' +
      '<span class="badge" style="background:' + statusColor(c.status) + '">' + c.status + '</span></div>' +
      '<div class="complaint-card-meta">' + esc(c.category) + ' | ' + new Date(c.created_at).toLocaleDateString('en-IN') + '</div>' +
      (c.resolution_notes ? '<p style="font-size:0.82rem;color:#2e7d32;margin-top:6px"><strong>Resolution:</strong> ' + esc(c.resolution_notes) + '</p>' : '') +
      '</div>';
  }).join('');
}

function statusColor(s) {
  var m = {'Open':'#e65100','In Progress':'#1565c0','Resolved':'#2e7d32','Closed':'#616161','Escalated':'#b71c1c'};
  return m[s] || '#666';
}

// ===== POLLS =====
async function loadResidentPolls() {
  var polls = await SunData.getPolls('active');
  var el = document.getElementById('resPollsList');
  if (!el) return;
  if (!polls || polls.length === 0) { el.innerHTML = '<div class="kpi-empty">No active polls</div>'; return; }
  var uid = SunAuth.getUserId();
  el.innerHTML = polls.map(function(p) {
    var totalVotes = Object.values(p.votes || {}).reduce(function(s, arr) { return s + (Array.isArray(arr) ? arr.length : 0); }, 0);
    return '<div class="poll-card"><div class="poll-question">' + esc(p.question) + '</div>' +
      (p.options || []).map(function(opt, i) {
        var votes = (p.votes || {})[String(i)] || [];
        var pct = totalVotes > 0 ? Math.round(votes.length / totalVotes * 100) : 0;
        var userVoted = Object.entries(p.votes || {}).find(function(entry) { return Array.isArray(entry[1]) && entry[1].includes(uid); });
        var isVoted = userVoted && String(userVoted[0]) === String(i);
        return '<div class="poll-option ' + (isVoted ? 'voted' : '') + '" onclick="castVote(\'' + p.id + '\',' + i + ')">' +
          '<span style="flex:1">' + esc(opt) + '</span>' +
          '<div class="poll-option-bar"><div class="poll-option-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="poll-option-pct">' + pct + '%</span></div>';
      }).join('') +
      '<div style="font-size:0.75rem;color:#999;margin-top:8px">' + totalVotes + ' vote' + (totalVotes !== 1 ? 's' : '') + '</div></div>';
  }).join('');
}

async function castVote(pollId, optIdx) {
  var res = await SunData.votePoll(pollId, optIdx);
  if (res.error) { showToast('Vote failed: ' + res.error.message, 'error'); return; }
  showToast('Vote recorded!', 'success');
  loadResidentPolls();
}

// ===== EVENTS =====
async function loadResidentEvents() {
  var events = await SunData.getEvents({upcoming:true});
  var el = document.getElementById('resEventsList');
  if (!el) return;
  if (!events || events.length === 0) { el.innerHTML = '<div class="kpi-empty">No upcoming events</div>'; return; }
  el.innerHTML = events.slice(0, 8).map(function(e) {
    var d = new Date(e.event_date);
    return '<div class="event-card">' +
      '<div class="event-date-box"><div class="event-date-day">' + d.getDate() + '</div><div class="event-date-month">' + d.toLocaleString('en-IN',{month:'short'}) + '</div></div>' +
      '<div style="flex:1"><h4 style="margin-bottom:2px">' + esc(e.title) + '</h4><div style="font-size:0.82rem;color:#666">' + esc(e.venue || '') + (e.event_type ? ' \u2022 ' + e.event_type : '') + '</div></div></div>';
  }).join('');
}

// ===== FINANCIALS =====
var resExpDonutChart = null;
var resIncExpChart = null;

async function loadResFinancials() {
  try {
    var data = await SunData.getFinancialSummary(6);
    if (!data || data.length === 0) {
      document.getElementById('resFundBalance').textContent = 'No data';
      document.getElementById('resMonthCollection').textContent = 'No data';
      document.getElementById('resMonthExpenses').textContent = 'No data';
      return;
    }
    var latest = data[0];
    document.getElementById('resFundBalance').textContent = '\u20B9' + formatNum(latest.fund_balance || 0);
    document.getElementById('resMonthCollection').textContent = '\u20B9' + formatNum(latest.maintenance_collected || latest.total_collection || 0);
    document.getElementById('resMonthExpenses').textContent = '\u20B9' + formatNum(latest.total_expenses || 0);
    renderResExpenseDonut(latest);
    renderResIncExpBar(data.reverse());
  } catch(e) { console.error('loadResFinancials error:', e); }
}

function renderResExpenseDonut(latest) {
  var ctx = document.getElementById('resExpenseDonut');
  if (!ctx) return;
  if (resExpDonutChart) resExpDonutChart.destroy();
  var breakup = latest.category_breakup || {};
  var labels = Object.keys(breakup);
  var values = Object.values(breakup);
  if (labels.length === 0) { labels.push('No breakdown data'); values.push(1); }
  var colors = ['#1a237e','#c62828','#2e7d32','#f57c00','#4527a0','#00695c','#795548','#e91e63','#607d8b','#ff5722'];
  resExpDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels:labels, datasets: [{ data:values, backgroundColor:colors.slice(0,labels.length), borderWidth:2, borderColor:'#fff' }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{size:11} } } } }
  });
}

function renderResIncExpBar(data) {
  var ctx = document.getElementById('resIncExpBar');
  if (!ctx) return;
  if (resIncExpChart) resIncExpChart.destroy();
  var labels = data.map(function(d) { return new Date(d.month).toLocaleString('en-IN',{month:'short',year:'2-digit'}); });
  resIncExpChart = new Chart(ctx, {
    type: 'bar',
    data: { labels:labels, datasets: [
      { label:'Collection', data:data.map(function(d){ return d.total_collection||d.maintenance_collected||0; }), backgroundColor:'rgba(46,125,50,0.7)', borderRadius:4 },
      { label:'Expenses', data:data.map(function(d){ return d.total_expenses||0; }), backgroundColor:'rgba(198,40,40,0.7)', borderRadius:4 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ callback:function(v){ return '\u20B9'+formatNum(v); } } } }, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{size:11} } } } }
  });
}

// ===== NOTICES =====
function loadNotices() {
  notices = JSON.parse(localStorage.getItem('st_notices') || '[]');
  renderN(notices);
}

function renderN(l) {
  var g = document.getElementById('noticeGrid');
  if (!g) return;
  // Filter out Escalation notices (BOM-only)
  var filtered = l.filter(function(n) { return n.category !== 'Escalation'; });
  if (!filtered.length) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666"><div style="font-size:3rem;margin-bottom:10px">&#128196;</div><p>No notices yet.</p></div>'; return; }
  var cc = {General:'#1a237e',Financial:'#004d40',Maintenance:'#e65100',Event:'#4a148c',Emergency:'#b71c1c',Meeting:'#01579b'};
  g.innerHTML = filtered.map(function(n, i) {
    var oi = l.indexOf(n);
    return '<div class="notice-card" onclick="openN(' + oi + ')" style="border-top-color:' + (cc[n.category] || '#1a237e') + '"><div class="notice-body"><div class="notice-date">' + (n.date || '') + '</div><div class="notice-title">' + (n.title || 'Notice') + '</div><div class="notice-summary">' + (n.summary || '') + '</div><div class="notice-cat"><span class="badge" style="background:' + (cc[n.category] || '#1a237e') + ';font-size:0.7rem">' + (n.category || 'General') + '</span></div></div></div>';
  }).join('');
}

function filterN(c, el) {
  document.querySelectorAll('.notice-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  if (c === 'All') renderN(notices);
  else renderN(notices.filter(function(n) { return n.category === c; }));
}

function openN(i) {
  var n = notices[i];
  if (!n) return;
  document.getElementById('mTitle').textContent = n.title || 'Notice';
  var b = document.getElementById('mBody');
  if (n.fileUrl) {
    if (n.fileType === 'pdf' || n.fileUrl.includes('.pdf')) b.innerHTML = '<iframe src="' + n.fileUrl + '" style="width:100%;min-height:600px;border:none"></iframe>';
    else b.innerHTML = '<img src="' + n.fileUrl + '" style="max-width:100%">';
  } else {
    b.innerHTML = '<div style="padding:20px"><p><strong>Date:</strong> ' + (n.date || '') + '</p><p><strong>Category:</strong> ' + (n.category || '') + '</p><p style="margin-top:15px">' + (n.summary || '') + '</p></div>';
  }
  document.getElementById('noticeModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('noticeModal').classList.add('hidden'); }

async function loadResNotices() {
  var el = document.getElementById('resNoticesList');
  if (!el) return;
  try {
    if (!notices || notices.length === 0) { el.innerHTML = '<div class="kpi-empty">No notices available</div>'; return; }
    var catColors = {General:'#1a237e',Maintenance:'#e65100',Security:'#b71c1c',Meeting:'#1565c0',Financial:'#2e7d32',Event:'#4527a0'};
    el.innerHTML = notices.slice(0, 15).map(function(n, i) {
      var color = catColors[n.category] || '#666';
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid #eee;cursor:pointer" onclick="openN(' + i + ')">' +
        '<div style="min-width:40px;text-align:center"><div style="font-size:1.3rem">' + (n.fileType === 'pdf' ? '\uD83D\uDCC4' : '\uD83D\uDCE2') + '</div></div>' +
        '<div style="flex:1"><div style="font-weight:600;font-size:0.92rem;margin-bottom:2px">' + esc(n.title || 'Notice') + '</div>' +
        '<div style="font-size:0.8rem;color:#666">' + esc((n.summary || '').substring(0, 100)) + ((n.summary || '').length > 100 ? '...' : '') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:4px;font-size:0.75rem"><span style="background:' + color + '20;color:' + color + ';padding:2px 8px;border-radius:10px;font-weight:500">' + esc(n.category || 'General') + '</span><span style="color:#999">' + esc(n.date || '') + '</span></div></div></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<div class="kpi-empty">Error loading notices</div>'; }
}

// ===== ACTIVITY FEED =====
async function loadResActivityFeed() {
  var el = document.getElementById('resActivityFeed');
  if (!el) return;
  try {
    var items = [];
    if (notices && notices.length > 0) {
      notices.slice(0, 5).forEach(function(n) {
        items.push({type:'notice', icon:'\uD83D\uDCE2', text:n.title || 'New notice', detail:n.category || '', time:n.date || '', ts:new Date(n.date || Date.now()).getTime()});
      });
    }
    try {
      var complaints = await SunData.getMyComplaints();
      if (complaints && complaints.length > 0) {
        complaints.slice(0, 3).forEach(function(c) {
          items.push({type:'complaint', icon:'\uD83D\uDCCB', text:'Complaint: ' + c.subject, detail:c.status, time:new Date(c.created_at).toLocaleDateString('en-IN'), ts:new Date(c.created_at).getTime()});
        });
      }
    } catch(e) {}
    try {
      var events = await SunData.getEvents({upcoming:true});
      if (events && events.length > 0) {
        events.slice(0, 3).forEach(function(e) {
          items.push({type:'event', icon:'\uD83D\uDCC5', text:e.title, detail:e.venue || e.event_type || '', time:new Date(e.event_date).toLocaleDateString('en-IN'), ts:new Date(e.event_date).getTime()});
        });
      }
    } catch(e) {}
    items.sort(function(a, b) { return b.ts - a.ts; });
    if (items.length === 0) { el.innerHTML = '<div class="kpi-empty">No recent activity</div>'; return; }
    var typeColors = {notice:'#1a237e', complaint:'#e65100', event:'#c62828'};
    el.innerHTML = items.slice(0, 10).map(function(item) {
      return '<div class="activity-item">' +
        '<div class="activity-icon" style="background:' + (typeColors[item.type] || '#666') + '20;color:' + (typeColors[item.type] || '#666') + '">' + item.icon + '</div>' +
        '<div class="activity-content"><div class="activity-text">' + esc(item.text) + '</div>' +
        '<div class="activity-meta">' + esc(item.detail) + (item.detail && item.time ? ' \u2022 ' : '') + esc(item.time) + '</div></div></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<div class="kpi-empty">Error loading activity</div>'; }
}

// ===== CHATBOT =====
function toggleChat() { document.getElementById('chatPanel').classList.toggle('open'); }
function sendChat() {
  var i = document.getElementById('chatIn'), m = i.value.trim();
  if (!m) return;
  var c = document.getElementById('chatMsgs');
  c.innerHTML += '<div class="chat-msg"><div class="chat-msg-user">' + m + '</div></div>';
  i.value = '';
  var d = { message: m, name: 'Resident', date: new Date().toLocaleDateString(), timestamp: new Date() };
  var ms = JSON.parse(localStorage.getItem('st_messages') || '[]');
  ms.push(d); localStorage.setItem('st_messages', JSON.stringify(ms)); supaSync('st_messages');
  setTimeout(function() {
    c.innerHTML += '<div class="chat-msg"><div class="chat-msg-bot">Thank you! BOM has been notified. For urgent matters call 0120-4311286.</div></div>';
    c.scrollTop = c.scrollHeight;
  }, 1000);
  c.scrollTop = c.scrollHeight;
}

// ===== MOBILE BOTTOM NAV =====
function mobNavTo(target) {
  document.querySelectorAll('.mob-nav-item').forEach(function(a) { a.classList.remove('active'); });
  var btn = document.getElementById('mobNav' + target.charAt(0).toUpperCase() + target.slice(1));
  if (btn) btn.classList.add('active');
  if (target === 'home') {
    document.querySelectorAll('[id^="rs_"]').forEach(function(el) { el.style.display = 'none'; });
    window.scrollTo({top:0, behavior:'smooth'});
  } else if (target === 'complaints') {
    toggleRsec('mycomplaints');
    var el = document.getElementById('rs_mycomplaints');
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  } else if (target === 'notices') {
    toggleRsec('notices');
    var el = document.getElementById('rs_notices');
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  } else if (target === 'profile') {
    window.scrollTo({top:0, behavior:'smooth'});
    showToast('Profile: ' + ((residentUser && residentUser.ownerName) || 'User'), 'info');
  }
}

function updateMobileNav() {
  var nav = document.getElementById('mobileBottomNav');
  if (!nav) return;
  if (window.innerWidth <= 600 && residentUser) { nav.style.display = 'flex'; }
  else { nav.style.display = 'none'; }
}
window.addEventListener('resize', updateMobileNav);

// ===== EMAIL TRIGGERS =====
async function triggerComplaintEmail(complaintData) {
  if (!residentUser || !residentUser.email) return;
  try {
    await SunData.queueEmail({
      to_email: residentUser.email,
      to_name: residentUser.ownerName || 'Resident',
      subject: '[Sun Tower RWA] Complaint Received: ' + complaintData.subject,
      template: 'complaint_ack',
      template_data: {
        resident_name: residentUser.ownerName || 'Resident',
        subject: complaintData.subject,
        category: complaintData.category || 'Other',
        complaint_id: complaintData.id || 'N/A'
      }
    });
  } catch(e) { console.log('Email trigger failed:', e); }
}

// ===== REALTIME =====
function initRealtime() {
  SunData.subscribeToTable('notices', function(payload) {
    if (payload.eventType === 'INSERT') showToast('New Notice: ' + (payload.new.title || ''), 'info');
  });
  SunData.subscribeToTable('complaints', function(payload) {
    if (payload.eventType === 'UPDATE' && payload.new.resident_id === SunAuth.getUserId()) {
      showToast('Complaint update: ' + payload.new.status, 'info');
    }
  });
}
if (SunAuth.isLoggedIn()) initRealtime();

// ===== HELPERS =====
function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatNum(n) { if (!n && n !== 0) return '0'; return Number(n).toLocaleString('en-IN'); }

function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'info');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('show'); }, 10);
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 3000);
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('SW registered:', reg.scope);
    }).catch(function(err) {
      console.log('SW registration failed:', err);
    });
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  updateMobileNav();
  supaHydrate();
  loadNotices();
});
