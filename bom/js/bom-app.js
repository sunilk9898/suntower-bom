// ============================================
// SUN TOWER RWA — BOM Dashboard Application
// ============================================
// Extracted from monolithic index.html for standalone /bom/ dashboard

// ===== GLOBAL STATE =====
let db = null, auth = null, storage = null, currentUser = null, isAdmin = false, residentUser = null;

// ===== AUTH STATE (Supabase-backed) =====
SunAuth.init(function(state) {
  console.log('[BOM] Auth state:', state.event, state.role);
  if (state.event === 'SIGNED_IN' || state.event === 'RESTORED' || state.event === 'TOKEN_REFRESHED' || state.event === 'INITIAL_SESSION') {
    if (!state.user) { currentUser = null; isAdmin = false; updateUI(); lockBOMUI(); return; }
    currentUser = { email: state.user.email, id: state.user.id };
    isAdmin = state.role === 'admin';
    if (state.role === 'resident') {
      // Residents shouldn't be on BOM dashboard — show link to resident portal
      showToast('This is the BOM Dashboard. Redirecting to Resident Portal...', 'info');
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }
    if (state.role === 'admin' || state.role === 'bom') {
      updateUI();
      unlockBOM();
    } else {
      updateUI(); lockBOMUI();
    }
  } else if (state.event === 'SIGNED_OUT' || state.event === 'SESSION_EXPIRED') {
    currentUser = null; isAdmin = false;
    updateUI(); lockBOMUI();
  }
});

// ===== STATIC DATA =====
const EM = [{name:'Sh. Lakhmi Chand',flat:'STB-304',v:129},{name:'Sh. Sunil Kumar',flat:'STD-701',v:128},{name:'Sh. Santosh Kr. Srivastava',flat:'STC-104',v:123},{name:'Sh. Himanshu Chaudhary',flat:'STC-502',v:117},{name:'Sh. Mahesh Chand Gupta',flat:'STD-901',v:115},{name:'Sh. Biman Saha',flat:'STC-805',v:113},{name:'Sh. Raj Kumar Rana',flat:'STC-504',v:107},{name:'Sh. Laxman Singh Pangtey',flat:'STC-603',v:106},{name:'Sh. Rajeev Mehta',flat:'STC-902',v:106},{name:'Sh. Harendra Singh',flat:'STD-906',v:105}];

const TASKS = [{id:'A1',c:'A',cn:'Security',t:'100% Car Park Plus Sticker',f:'weekly',dp:'Gen Secretary'},{id:'A2',c:'A',cn:'Security',t:'CCTV monitoring',f:'weekly',dp:'Gen Secretary'},{id:'A3',c:'A',cn:'Security',t:'Security Supervisor monitoring',f:'daily',dp:'Gen Secretary'},{id:'A4',c:'A',cn:'Security',t:'Patrolling report verification',f:'weekly',dp:'Gen Secretary'},{id:'A5',c:'A',cn:'Security',t:'Security welfare (wage/PF)',f:'monthly',dp:'Gen Secretary'},{id:'A6',c:'A',cn:'Security',t:'PA system mock run',f:'daily',dp:'Member'},{id:'B1',c:'B',cn:'Housekeeping',t:'Tower team adoption',f:'weekly',dp:'Gen Secretary'},{id:'B2',c:'B',cn:'Housekeeping',t:'Plant & flower maintenance',f:'weekly',dp:'Member'},{id:'B3',c:'B',cn:'Housekeeping',t:'Lift car shining',f:'daily',dp:'Member'},{id:'B4',c:'B',cn:'Housekeeping',t:'Shaft cleaning',f:'weekly',dp:'Vice Gen Secretary'},{id:'B5',c:'B',cn:'Housekeeping',t:'Basement cleaning',f:'weekly',dp:'Member'},{id:'B6',c:'B',cn:'Housekeeping',t:'Common area cleaning',f:'weekly',dp:'Member'},{id:'B7',c:'B',cn:'Housekeeping',t:'Reception glass dusting',f:'weekly',dp:'Member'},{id:'B8',c:'B',cn:'Housekeeping',t:'Pigeon waste cleaning',f:'monthly',dp:'Member'},{id:'C1',c:'C',cn:'Fire',t:'FAD panel daily check',f:'daily',dp:'Vice Gen Secretary'},{id:'C2',c:'C',cn:'Fire',t:'Sprinkler mock run',f:'quarterly',dp:'Vice Gen Secretary'},{id:'C3',c:'C',cn:'Fire',t:'Smoke detector test',f:'weekly',dp:'Vice Gen Secretary'},{id:'C4',c:'C',cn:'Fire',t:'Sensor stock check',f:'monthly',dp:'Vice Gen Secretary'},{id:'C5',c:'C',cn:'Fire',t:'AMC vendor visit',f:'quarterly',dp:'Vice Gen Secretary'},{id:'D1',c:'D',cn:'Facilities',t:'Library & quiz',f:'weekly',dp:'Member'},{id:'D2',c:'D',cn:'Facilities',t:'Medical room',f:'weekly',dp:'Member'},{id:'D3',c:'D',cn:'Facilities',t:'Indoor play rooms',f:'weekly',dp:'Vice Gen Secretary'},{id:'D4',c:'D',cn:'Facilities',t:'Driver/guest room',f:'weekly',dp:'Member'},{id:'D5',c:'D',cn:'Facilities',t:'Club house events',f:'monthly',dp:'Vice Gen Secretary'},{id:'D6',c:'D',cn:'Facilities',t:'Tea counter',f:'daily',dp:'Member'},{id:'E1',c:'E',cn:'Revenue',t:'SEL dues collection',f:'monthly',dp:'Treasurer'},{id:'E2',c:'E',cn:'Revenue',t:'Gate 2 parking charges',f:'once',dp:'Treasurer'},{id:'E3',c:'E',cn:'Revenue',t:'MyGate ERP accounting',f:'once',dp:'Treasurer'},{id:'E4',c:'E',cn:'Revenue',t:'Lift display revenue',f:'monthly',dp:'Vice Treasurer'},{id:'E5',c:'E',cn:'Revenue',t:'Kiosk display revenue',f:'monthly',dp:'Vice Treasurer'},{id:'E6',c:'E',cn:'Revenue',t:'Club house renting',f:'weekly',dp:'Vice Treasurer'},{id:'E7',c:'E',cn:'Revenue',t:'Flat sell fee',f:'monthly',dp:'Treasurer'},{id:'E8',c:'E',cn:'Revenue',t:'Plant nursery',f:'monthly',dp:'Member'},{id:'F1',c:'F',cn:'Infra',t:'Security Room completion',f:'once',dp:'Vice President'},{id:'F2',c:'F',cn:'Infra',t:'Gate 2 Park Plus merge',f:'once',dp:'Vice President'},{id:'F3',c:'F',cn:'Infra',t:'Basement painting',f:'once',dp:'Vice President'},{id:'F4',c:'F',cn:'Infra',t:'Reception renovation',f:'once',dp:'Vice President'},{id:'F5',c:'F',cn:'Infra',t:'CCTV cameras',f:'once',dp:'Member'},{id:'F6',c:'F',cn:'Infra',t:'Lift renovation tender',f:'once',dp:'Vice President'},{id:'F7',c:'F',cn:'Infra',t:'Garden development',f:'once',dp:'Member'},{id:'F8',c:'F',cn:'Infra',t:'Fire NOC roof exit',f:'once',dp:'Vice Gen Secretary'},{id:'F9',c:'F',cn:'Infra',t:'Swimming pool',f:'once',dp:'Member'},{id:'F10',c:'F',cn:'Infra',t:'Club kitchen area',f:'once',dp:'Member'},{id:'F11',c:'F',cn:'Infra',t:'DG room tools rack',f:'once',dp:'Member'},{id:'F12',c:'F',cn:'Infra',t:'Indoor play renovation',f:'once',dp:'Member'},{id:'F13',c:'F',cn:'Infra',t:'Lift room painting',f:'once',dp:'Vice President'},{id:'F14',c:'F',cn:'Infra',t:'EV charging station',f:'once',dp:'Member'},{id:'F15',c:'F',cn:'Infra',t:'Overhead tank repair',f:'once',dp:'Vice President'},{id:'F16',c:'F',cn:'Infra',t:'Pipe shaft repair',f:'once',dp:'Vice President'},{id:'F17',c:'F',cn:'Infra',t:'Toilet renovation',f:'once',dp:'Member'},{id:'F18',c:'F',cn:'Infra',t:'Illumination',f:'once',dp:'Member'},{id:'G1',c:'G',cn:'Legal',t:'UP Apartment Act compliance',f:'quarterly',dp:'Member'},{id:'G2',c:'G',cn:'Legal',t:'Legal notice drafting & review',f:'monthly',dp:'Member'},{id:'G3',c:'G',cn:'Legal',t:'Dispute resolution & mediation',f:'monthly',dp:'Member'},{id:'G4',c:'G',cn:'Legal',t:'RWA documentation & bylaws',f:'quarterly',dp:'Member'},{id:'G5',c:'G',cn:'Legal',t:'Court/tribunal case follow-up',f:'monthly',dp:'Member'},{id:'G6',c:'G',cn:'Legal',t:'Agreement & contract review',f:'monthly',dp:'Member'}];

const POS = ['President','Vice President','Gen Secretary','Vice Gen Secretary','Joint Secretary','Treasurer','Vice Treasurer','Joint Treasurer','Sport Secretary','Culture Secretary','Spokesperson','Chairman','Co-Chairman','PRO','Advisor','Member','Executive Member','Custom...'];
const PROF = ['Engineer/Technical','CA/Finance/Banking','Legal/Advocate','Doctor/Medical','IT/Software','Business/Entrepreneur','Government Service','Education/Teacher','Retired Professional','Management/Corporate','Real Estate','Other'];

const DEF_PROJECTS = [{id:'P1',name:'Security Room Gate 1',committee:'F',status:'In Progress',timeline:'Feb-Mar 2026',budget:'TBD',progress:30,description:'Construction of new security room at Gate 1 entrance',updates:[],documents:[],meetings:[]},{id:'P2',name:'Gate 2 Park Plus',committee:'F',status:'Planned',timeline:'Mar 2026',budget:'TBD',progress:5,description:'Integration of Park Plus system at Gate 2',updates:[],documents:[],meetings:[]},{id:'P3',name:'Basement Painting',committee:'F',status:'Planned',timeline:'Apr 2026',budget:'TBD',progress:0,description:'Complete basement painting and waterproofing',updates:[],documents:[],meetings:[]},{id:'P4',name:'Reception Renovation',committee:'F',status:'Planned',timeline:'Apr-May 2026',budget:'TBD',progress:0,description:'Complete renovation of reception area',updates:[],documents:[],meetings:[]},{id:'P5',name:'CCTV Cameras',committee:'A',status:'Planned',timeline:'Mar 2026',budget:'TBD',progress:10,description:'Installation of new CCTV cameras across all areas',updates:[],documents:[],meetings:[]},{id:'P6',name:'EV Charging',committee:'F',status:'Planned',timeline:'Q2 2026',budget:'TBD',progress:0,description:'Electric vehicle charging stations in basement',updates:[],documents:[],meetings:[]},{id:'P7',name:'Lift Renovation',committee:'F',status:'Tender',timeline:'Q2-Q3 2026',budget:'TBD',progress:5,description:'Major lift renovation across all towers',updates:[],documents:[],meetings:[]},{id:'P8',name:'Fire NOC',committee:'C',status:'In Progress',timeline:'Ongoing',budget:'TBD',progress:40,description:'Fire NOC compliance and roof exit construction',updates:[],documents:[],meetings:[]}];

let projects = [];
function ensureProjectFields(p) { if (!p.expenses) p.expenses = []; if (!p.closureReport) p.closureReport = null; if (!p.updates) p.updates = []; if (!p.documents) p.documents = []; if (!p.meetings) p.meetings = []; return p; }
function loadProjects() { try { const s = localStorage.getItem('st_projects'); if (s) projects = JSON.parse(s).map(ensureProjectFields); else { projects = JSON.parse(JSON.stringify(DEF_PROJECTS)).map(ensureProjectFields); saveProjects(); } } catch(e) { projects = JSON.parse(JSON.stringify(DEF_PROJECTS)).map(ensureProjectFields); } }
function saveProjects() { localStorage.setItem('st_projects', JSON.stringify(projects)); supaSync('st_projects'); if (db) { projects.forEach(p => db.collection('projects').doc(p.id).set(p).catch(() => {})); } }

// ===== SUPABASE KV SYNC =====
function supaSync(key) { if (!supa) return; try { var v = localStorage.getItem(key); if (v) { supa.from('kv_store').upsert({key: key, value: JSON.parse(v), updated_at: new Date().toISOString()}).then(function(){}).catch(function(){}); } } catch(e) {} }
async function supaHydrate() { if (!supa) return; try { var res = await supa.from('kv_store').select('*'); if (res.data) { res.data.forEach(function(r) { localStorage.setItem(r.key, JSON.stringify(r.value)); }); console.log('Supabase: hydrated ' + res.data.length + ' keys'); } } catch(e) { console.log('Supabase hydrate error:', e); } }

let members = [], notices = [];
let assignments = JSON.parse(localStorage.getItem('st_assignments') || '{}');

// ===== PERMISSION MAP =====
const PERM_MAP = {
  isBOM: () => SunAuth.isBOM(),
  isAdmin: () => SunAuth.isAdmin(),
  isOfficeBearer: () => SunAuth.isOfficeBearer(),
  canManageComplaints: () => SunAuth.canManageComplaints(),
  canManageFinances: () => SunAuth.canManageFinances(),
  canManageMeetings: () => SunAuth.canManageMeetings(),
  canManageEvents: () => SunAuth.canManageEvents(),
  canCreatePolls: () => SunAuth.canCreatePolls(),
  canManageResidents: () => SunAuth.canManageResidents()
};

// ===== UI LOCK/UNLOCK =====
function lockBOMUI() {
  document.getElementById('bomContent').style.display = 'none';
  document.getElementById('bomLocked').style.display = 'block';
  var sb = document.getElementById('dashSidebar'); if (sb) sb.style.display = 'none';
  var st = document.getElementById('sidebarToggle'); if (st) st.style.display = 'none';
}

function unlockBOM() {
  document.getElementById('bomLocked').style.display = 'none';
  document.getElementById('bomContent').style.display = 'block';
  var sb = document.getElementById('dashSidebar'); if (sb) sb.style.display = '';
  var st = document.getElementById('sidebarToggle'); if (st) st.style.display = '';
  loadMemDB(); buildElectionTable(); loadResidentData();
  showSection('kpi');
  // Init sidebar permissions
  if (typeof BomSidebar !== 'undefined') {
    BomSidebar.init();
    BomSidebar.filterByPermissions(PERM_MAP);
  }
  if (isAdmin) {
    document.getElementById('adminLock')&&(document.getElementById('adminLock').style.display = 'none');
    document.getElementById('adminPanel')&&(document.getElementById('adminPanel').style.display = 'block');
    popAccDrop(); loadAdminMsgs(); loadAdminProfile(); loadRegRequests(); loadApprovedResidents(); buildAccountList();
    trackBOMLogin();
  }
}

// ===== SECTION NAVIGATION =====
function showSection(s) {
  document.querySelectorAll('.bom-sec').forEach(el => el.style.display = 'none');
  const el = document.getElementById('bs_' + s);
  if (el) el.style.display = 'block';
  if (typeof BomSidebar !== 'undefined') BomSidebar.setActive(s);
  // Load section data
  if (s === 'kpi') loadKPIDashboard();
  if (s === 'members') initMemForm();
  if (s === 'allocate') initAlloc();
  if (s === 'dashboard') genDash();
  if (s === 'challenges') buildChallenges();
  if (s === 'committees') buildCommittees();
  if (s === 'projects') buildProjDash();
  if (s === 'directory') initDirectory();
  if (s === 'complaints_mgmt') loadComplaintsManagement();
  if (s === 'financials') loadFinancials();
  if (s === 'meetings') loadMeetings();
  if (s === 'events_mgmt') loadEventsManage();
  if (s === 'polls_mgmt') loadPollsManage();
  if (s === 'resolutions') loadResolutionsList();
  if (s === 'documents') loadDocuments();
  if (s === 'admin' && isAdmin) { loadRegRequests(); loadApprovedResidents(); loadManageResidents(); loadAdminMsgs(); buildAccountList(); }
  window.scrollTo(0, 0);
}

// ===== AUTH UI =====
function showAuth() { document.getElementById('authOverlay').classList.remove('hidden'); document.getElementById('loginForm').style.display = 'block'; document.getElementById('forgotForm').style.display = 'none'; }
function hideAuth() { document.getElementById('authOverlay').classList.add('hidden'); }
function showForgotPw() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('forgotForm').style.display = 'block'; }
function showLoginFm() { document.getElementById('loginForm').style.display = 'block'; document.getElementById('forgotForm').style.display = 'none'; }

async function doLogin() {
  const e = document.getElementById('loginEmail').value.trim(), p = document.getElementById('loginPassword').value, err = document.getElementById('loginError'), suc = document.getElementById('loginSuccess');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!e || !p) { err.textContent = 'Enter email and password'; err.style.display = 'block'; return; }
  const result = await SunAuth.login(e, p);
  if (result.error) { err.textContent = result.error.message || 'Invalid email or password'; err.style.display = 'block'; return; }
  currentUser = { email: result.data.user.email, id: result.data.user.id };
  isAdmin = result.data.role === 'admin';
  if (result.data.role === 'resident') {
    suc.textContent = 'Resident account — redirecting to Resident Portal...';
    suc.style.display = 'block';
    setTimeout(() => { window.location.href = 'https://suntower.in'; }, 1500);
    return;
  }
  trackBOMLogin(); updateUI();
  suc.textContent = 'Welcome!'; suc.style.display = 'block';
  setTimeout(() => { hideAuth(); unlockBOM(); }, 500);
}

async function doForgotPw() {
  const e = document.getElementById('forgotEmail').value.trim(), err = document.getElementById('forgotError'), suc = document.getElementById('forgotSuccess');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!e) { err.textContent = 'Enter email'; err.style.display = 'block'; return; }
  const result = await SunAuth.resetPassword(e);
  if (result.error) { err.textContent = result.error.message; err.style.display = 'block'; }
  else { suc.textContent = 'Reset link sent to your email!'; suc.style.display = 'block'; }
}

async function doLogout() {
  await SunAuth.logout();
  currentUser = null; isAdmin = false;
  updateUI(); lockBOMUI();
}

function updateUI() {
  const u = document.getElementById('headerUser'), b = document.getElementById('headerAuthBtn');
  if (currentUser) {
    const role = SunAuth.getRole();
    const roleBadge = role === 'admin' ? '<span class="role-badge role-badge-admin">ADMIN</span>' : role === 'bom' ? '<span class="role-badge role-badge-bom">BOM</span>' : '';
    if (u) u.innerHTML = (currentUser.email || '') + ' ' + roleBadge;
    if (b) b.textContent = 'Logout';
  } else {
    if (u) u.innerHTML = '';
    if (b) b.textContent = 'Login';
  }
}

// ===== MEMBERS =====
function loadMemDB() { if (db) { db.collection('members').orderBy('rank').get().then(s => { if (!s.empty) { members = s.docs.map(d => d.data()); updatePosBadges(); } else loadMemLS(); }).catch(() => loadMemLS()); } else loadMemLS(); }
function loadMemLS() { try { const s = localStorage.getItem('suntower_members'); if (s) { members = JSON.parse(s); updatePosBadges(); } } catch(e) {} }

function buildElectionTable() {
  const t = document.getElementById('electionTable'); if (!t) return;
  const POS_ORDER = ['President','Vice President','Gen Secretary','Vice Gen Secretary','Joint Secretary','Treasurer','Vice Treasurer','Joint Treasurer','Sport Secretary','Culture Secretary','Spokesperson','Chairman','Co-Chairman','PRO','Advisor','Member','Executive Member'];
  const merged = EM.map((m, i) => { const mem = members[i]; return { name: m.name, flat: m.flat, v: m.v, pos: mem && mem.position ? mem.position : 'To be elected' }; });
  merged.sort((a, b) => { const ai = POS_ORDER.indexOf(a.pos); const bi = POS_ORDER.indexOf(b.pos); const pa = ai >= 0 ? ai : (a.pos === 'To be elected' ? 999 : POS_ORDER.length); const pb = bi >= 0 ? bi : (b.pos === 'To be elected' ? 999 : POS_ORDER.length); if (pa !== pb) return pa - pb; return b.v - a.v; });
  const pc = {'President':'badge-president','Vice President':'badge-vp','Gen Secretary':'badge-gs','Vice Gen Secretary':'badge-vgs','Treasurer':'badge-treasurer','Vice Treasurer':'badge-vt','Joint Treasurer':'badge-vt','Joint Secretary':'badge-vgs','Sport Secretary':'badge-info','Culture Secretary':'badge-info','Spokesperson':'badge-warning','Chairman':'badge-president','Co-Chairman':'badge-vp','PRO':'badge-info','Advisor':'badge-vt','Member':'badge-member','Executive Member':'badge-member'};
  let h = '<tr><th>#</th><th>Name</th><th>Flat</th><th>Votes</th><th>Position</th></tr>';
  merged.forEach((m, i) => { const cls = pc[m.pos] || 'badge-success'; h += `<tr style="background:#e8f5e9"><td>${i+1}</td><td><strong>${m.name}</strong></td><td>${m.flat}</td><td><strong>${m.v}</strong></td><td><span class="badge ${cls}">${m.pos}</span></td></tr>`; });
  t.innerHTML = h;
}
function updatePosBadges() { buildElectionTable(); }

function initMemForm() {
  const f = document.getElementById('memberForm'); if (!f) return;
  const ro = !isAdmin; f.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const m = members[i] || {}; const em = EM[i] || {}; const d = ro ? 'disabled' : '';
    const isCustomPos = m.position && !POS.includes(m.position) && m.position !== 'Custom...';
    const selVal = isCustomPos ? 'Custom...' : m.position || '';
    f.innerHTML += `<div class="member-card"><div style="text-align:center;font-weight:700;color:var(--primary);margin-bottom:10px">Member ${i+1} | Votes: ${em.v||''}</div><label>Name <small style="color:#999;font-weight:400">(type to search directory)</small></label><div class="autocomplete-wrapper" style="position:relative"><input type="text" id="n_${i}" value="${m.name||em.name||''}" ${d} oninput="memberResidentAC(this,${i})" autocomplete="off"><div class="autocomplete-list" id="acl_mem_${i}"></div></div><label>Flat</label><input type="text" id="f_${i}" value="${m.flat||em.flat||''}" ${d}><label>Profession</label><select id="pr_${i}" ${d}><option value="">--</option>${PROF.map(p=>`<option value="${p}" ${m.profession===p?'selected':''}>${p}</option>`).join('')}</select><label>Position</label><select id="po_${i}" ${d} onchange="handlePosChange(${i})"><option value="">-- To be elected --</option>${POS.map(p=>`<option value="${p}" ${selVal===p?'selected':''}>${p}</option>`).join('')}</select><div id="customPos_${i}" style="display:${isCustomPos?'block':'none'};margin-top:4px"><input type="text" id="cp_${i}" value="${isCustomPos?m.position:''}" placeholder="Enter custom designation" ${d} style="border:2px solid var(--secondary)"></div><label>Phone</label><input type="text" id="ph_${i}" value="${m.phone||''}" ${d}><label>Email</label><input type="email" id="em_${i}" value="${m.email||''}" ${d}></div>`;
  }
  const lock = document.getElementById('memberAdminLock'); if (lock) lock.style.display = ro ? 'block' : 'none';
  const actions = document.getElementById('memberActions'); if (actions) actions.style.display = ro ? 'none' : 'flex';
}

function handlePosChange(i) { const sel = document.getElementById('po_' + i).value; const box = document.getElementById('customPos_' + i); if (sel === 'Custom...') { box.style.display = 'block'; document.getElementById('cp_' + i).focus(); } else { box.style.display = 'none'; document.getElementById('cp_' + i).value = ''; } }

function saveMembers() {
  if (!isAdmin) { alert('Only Admin can save.'); return; }
  members = [];
  for (let i = 0; i < 10; i++) {
    let pos = document.getElementById('po_' + i).value;
    if (pos === 'Custom...') { const cp = document.getElementById('cp_' + i).value.trim(); if (cp) pos = cp; else pos = 'Member'; }
    members.push({ rank: i+1, name: document.getElementById('n_' + i).value.trim(), flat: document.getElementById('f_' + i).value.trim(), profession: document.getElementById('pr_' + i).value, position: pos, phone: document.getElementById('ph_' + i).value.trim(), email: document.getElementById('em_' + i).value.trim(), votes: EM[i]?.v || 0 });
  }
  if (db) {
    const b = db.batch(); members.forEach((m, i) => b.set(db.collection('members').doc('m_' + i), m));
    b.commit().then(() => { alert('Saved to database!'); updatePosBadges(); }).catch(e => { localStorage.setItem('suntower_members', JSON.stringify(members)); supaSync('suntower_members'); alert('Saved locally (DB unavailable)'); updatePosBadges(); });
  } else { localStorage.setItem('suntower_members', JSON.stringify(members)); supaSync('suntower_members'); alert('Saved locally!'); updatePosBadges(); }
}
function loadElected() { members = EM.map((m, i) => ({rank: i+1, name: m.name, flat: m.flat, profession: '', position: '', phone: '', email: '', votes: m.v})); initMemForm(); }

// ===== CHALLENGES =====
function buildChallenges() {
  const a = document.getElementById('challengesArea'); if (!a || a.innerHTML) return;
  const cc = {A:'#b71c1c',B:'#4a148c',C:'#1a237e',D:'#01579b',E:'#004d40',F:'#e65100',G:'#37474f'};
  const cn = {A:'Security/PANZEER',B:'Housekeeping/SHINEBURG',C:'Fire/SKENTERPRISE',D:'Facilities',E:'Revenue',F:'Infrastructure',G:'Legal'};
  let h = ''; let lc = '';
  TASKS.forEach(t => { if (t.c !== lc) { lc = t.c; h += `<div class="card" style="border-left-color:${cc[t.c]}"><h3>${t.c} - ${cn[t.c]}</h3><table><tr><th>#</th><th>Task</th><th>Freq</th></tr>`; } h += `<tr><td>${t.id}</td><td>${t.t}</td><td><span class="freq-badge freq-${t.f}">${t.f}</span></td></tr>`; const nx = TASKS[TASKS.indexOf(t)+1]; if (!nx || nx.c !== t.c) h += '</table></div>'; });
  a.innerHTML = h;
}

// ===== COMMITTEES =====
function loadCommitteeMembers() { try { const s = localStorage.getItem('st_committee_members'); return s ? JSON.parse(s) : {}; } catch(e) { return {}; } }
function saveCommitteeMembers(data) { localStorage.setItem('st_committee_members', JSON.stringify(data)); supaSync('st_committee_members'); }

// Migrate old format {convenor,bomMember,residents[3]} → new {bomMembers[{role,name}],residents[]}
function migrateCommData(sv) {
  if (sv.bomMembers) return sv;
  const bm = [];
  if (sv.convenor) bm.push({role:'Convenor',name:sv.convenor});
  if (sv.bomMember) bm.push({role:'Member',name:sv.bomMember});
  if (bm.length === 0) { bm.push({role:'Convenor',name:''}); bm.push({role:'Member',name:''}); }
  const res = (sv.residents || []).filter(r => r && r.trim());
  return { bomMembers: bm, residents: res };
}

// --- Committee Definitions (dynamic, stored in localStorage + Supabase) ---
const DEFAULT_COMM_DEFS = [
  {c:'A',n:'Security',icon:'&#128737;',bg:'#b71c1c',sop:'CCTV, patrolling, Park Plus, welfare checks'},
  {c:'B',n:'Housekeeping',icon:'&#128700;',bg:'#4a148c',sop:'Cleaning, lifts, plants, shaft maintenance'},
  {c:'C',n:'Fire Safety',icon:'&#128293;',bg:'#1a237e',sop:'FAD panels, sprinklers, smoke detectors, AMC'},
  {c:'D',n:'Facilities',icon:'&#127968;',bg:'#01579b',sop:'Library, medical, play areas, club house'},
  {c:'E',n:'Revenue',icon:'&#128176;',bg:'#004d40',sop:'Dues, parking, advertising, ERP, rentals'},
  {c:'F',n:'Infrastructure',icon:'&#128679;',bg:'#e65100',sop:'All 18 projects, tenders, renovations'},
  {c:'G',n:'Legal',icon:'&#9878;',bg:'#37474f',sop:'RWA compliance, UP Apartment Act, legal notices, dispute resolution, contracts'}
];
const COMM_COLORS = ['#b71c1c','#4a148c','#1a237e','#01579b','#004d40','#e65100','#37474f','#795548','#880e4f','#1b5e20','#ff6f00','#263238'];
let commDefs = [];
function loadCommitteeDefs() {
  try { const s = localStorage.getItem('st_committee_defs'); if (s) { commDefs = JSON.parse(s); return; } } catch(e) {}
  commDefs = JSON.parse(JSON.stringify(DEFAULT_COMM_DEFS));
}
function saveCommitteeDefs() { localStorage.setItem('st_committee_defs', JSON.stringify(commDefs)); supaSync('st_committee_defs'); }
function getNextCommLetter() {
  const used = commDefs.map(d => d.c);
  for (let i = 0; i < 26; i++) { const ch = String.fromCharCode(65 + i); if (!used.includes(ch)) return ch; }
  return (commDefs.length + 1).toString();
}

function saveCommitteesUI() {
  const cm = {};
  commDefs.forEach(def => {
    const c = def.c;
    const bomWrap = document.getElementById('cm_' + c + '_bom_wrap');
    const resWrap = document.getElementById('cm_' + c + '_res_wrap');
    const bomMembers = [];
    if (bomWrap) {
      bomWrap.querySelectorAll('.comm-member-slot').forEach((slot, i) => {
        const sel = slot.querySelector('select');
        if (sel) bomMembers.push({ role: i === 0 ? 'Convenor' : 'Member', name: sel.value });
      });
    }
    const residents = [];
    if (resWrap) {
      resWrap.querySelectorAll('.comm-member-slot').forEach(slot => {
        const inp = slot.querySelector('input');
        if (inp) residents.push(inp.value.trim());
      });
    }
    cm[c] = { bomMembers, residents };
  });
  saveCommitteeMembers(cm); showToast('Committee assignments saved!', 'success');
}

function buildCommittees() {
  const a = document.getElementById('committeesArea'); if (!a) return; a.innerHTML = '';
  loadCommitteeDefs();
  const saved = loadCommitteeMembers();
  const dis = isAdmin ? '' : 'disabled';
  const vm = members.filter(m => m && m.name);
  // Update title with dynamic count
  const titleEl = document.getElementById('commTitle');
  if (titleEl) titleEl.textContent = commDefs.length + ' Working Committees';
  let h = '<div class="grid-2">';
  commDefs.forEach(cm => {
    const raw = saved[cm.c] || {bomMembers:[{role:'Convenor',name:''},{role:'Member',name:''}],residents:['','','']};
    const sv = migrateCommData(raw);
    h += `<div class="committee-card" id="comm_card_${cm.c}">`;
    h += `<h3><div class="committee-icon" style="background:${cm.bg}">${cm.icon}</div>Committee ${cm.c} - ${cm.n}`;
    if (isAdmin) h += `<button class="comm-edit-btn" onclick="openEditCommittee('${cm.c}')" title="Edit committee">&#9998;</button>`;
    h += `</h3>`;
    // BOM Members
    h += `<div id="cm_${cm.c}_bom_wrap">`;
    sv.bomMembers.forEach((bm, i) => { h += renderBomSlot(cm.c, i, bm, vm, dis); });
    h += `</div>`;
    if (isAdmin) h += `<button class="comm-add-btn" onclick="addCommBomMember('${cm.c}')">+ Add BOM Member</button>`;
    // Residents
    h += `<div id="cm_${cm.c}_res_wrap">`;
    sv.residents.forEach((r, i) => { h += renderResSlot(cm.c, i, r, dis); });
    h += `</div>`;
    if (isAdmin) h += `<button class="comm-add-btn" onclick="addCommResident('${cm.c}')">+ Add Resident</button>`;
    h += `<div class="sop-box"><strong>SOP:</strong> ${cm.sop}</div></div>`;
  });
  // Add Committee card (admin only)
  if (isAdmin) {
    h += `<div class="committee-card comm-add-card" onclick="openAddCommittee()">
      <div class="comm-add-card-inner"><span class="comm-add-card-icon">+</span><span>Add Committee</span></div>
    </div>`;
  }
  h += '</div>'; a.innerHTML = h;
  const ca = document.getElementById('commActions'); if (ca) ca.style.display = isAdmin ? 'flex' : 'none';
}

function renderBomSlot(letter, idx, bm, vm, dis) {
  const label = idx === 0 ? 'BOM Convenor' : 'BOM Member';
  const rmBtn = (isAdmin && idx > 0) ? `<button class="comm-remove-btn" onclick="this.closest('.comm-member-slot').remove()" title="Remove">&times;</button>` : '';
  if (!vm) vm = members.filter(m => m && m.name);
  return `<div class="comm-member-slot"><span class="slot-type slot-bom">${label}</span><select class="form-control" style="flex:1;padding:5px" ${dis}><option value="">-- Select --</option>${vm.map(m=>`<option value="${m.name}" ${bm.name===m.name?'selected':''}>${m.name}</option>`).join('')}</select>${rmBtn}</div>`;
}

function renderResSlot(letter, idx, value, dis) {
  const rmBtn = isAdmin ? `<button class="comm-remove-btn" onclick="this.closest('.comm-member-slot').remove()" title="Remove">&times;</button>` : '';
  const uid = `cm_${letter}_r${idx}_${Date.now()}`;
  return `<div class="comm-member-slot"><span class="slot-type slot-resident">Resident ${idx+1}</span><div class="autocomplete-wrapper"><input class="form-control ac-resident" id="${uid}" style="padding:5px" placeholder="Type name or flat..." value="${value||''}" ${dis} autocomplete="off" oninput="residentAutocomplete(this)" onfocus="residentAutocomplete(this)" onblur="setTimeout(()=>closeAutocomplete(this),200)"><div class="autocomplete-list" id="acl_${uid}"></div></div>${rmBtn}</div>`;
}

function addCommBomMember(letter) {
  const wrap = document.getElementById('cm_' + letter + '_bom_wrap'); if (!wrap) return;
  const idx = wrap.querySelectorAll('.comm-member-slot').length;
  const vm = members.filter(m => m && m.name);
  const tmp = document.createElement('div');
  tmp.innerHTML = renderBomSlot(letter, idx, {role:'Member',name:''}, vm, '');
  wrap.appendChild(tmp.firstElementChild);
}

function addCommResident(letter) {
  const wrap = document.getElementById('cm_' + letter + '_res_wrap'); if (!wrap) return;
  const idx = wrap.querySelectorAll('.comm-member-slot').length;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderResSlot(letter, idx, '', '');
  wrap.appendChild(tmp.firstElementChild);
  wrap.querySelectorAll('.comm-member-slot .slot-type').forEach((el, i) => { el.textContent = 'Resident ' + (i+1); });
}

// --- Add / Edit Committee Modal ---
function openAddCommittee() {
  const letter = getNextCommLetter();
  showCommModal('Add New Committee', letter, '', '', COMM_COLORS[commDefs.length % COMM_COLORS.length], function(data) {
    commDefs.push({c: data.c, n: data.n, icon: data.icon, bg: data.bg, sop: data.sop});
    saveCommitteeDefs();
    buildCommittees();
    showToast('Committee ' + data.c + ' added!', 'success');
  });
}

function openEditCommittee(letter) {
  const def = commDefs.find(d => d.c === letter); if (!def) return;
  showCommModal('Edit Committee ' + letter, letter, def.n, def.sop, def.bg, function(data) {
    def.n = data.n; def.sop = data.sop; def.bg = data.bg; def.icon = data.icon;
    saveCommitteeDefs();
    buildCommittees();
    showToast('Committee ' + letter + ' updated!', 'success');
  }, letter);
}

function deleteCommittee(letter) {
  if (!confirm('Delete Committee ' + letter + '? This will also remove all member assignments for this committee.')) return;
  commDefs = commDefs.filter(d => d.c !== letter);
  saveCommitteeDefs();
  // Remove member data
  const cm = loadCommitteeMembers(); delete cm[letter]; saveCommitteeMembers(cm);
  buildCommittees();
  closeCommModal();
  showToast('Committee ' + letter + ' deleted', 'success');
}

function showCommModal(title, letter, name, sop, color, onSave, editLetter) {
  let existing = document.getElementById('commEditModal');
  if (existing) existing.remove();
  const isEdit = !!editLetter;
  const modal = document.createElement('div');
  modal.id = 'commEditModal'; modal.className = 'comm-modal-overlay';
  modal.innerHTML = `
    <div class="comm-modal">
      <div class="comm-modal-header"><h3>${title}</h3><button class="comm-remove-btn" onclick="closeCommModal()" style="font-size:20px">&times;</button></div>
      <div class="comm-modal-body">
        <label>Committee ID</label>
        <input class="form-control" id="cmf_letter" value="${letter}" ${isEdit ? 'disabled' : ''} maxlength="2" style="width:60px;text-transform:uppercase">
        <label>Name <span style="color:#e53935">*</span></label>
        <input class="form-control" id="cmf_name" value="${name}" placeholder="e.g. Security, Finance...">
        <label>SOP / Scope</label>
        <input class="form-control" id="cmf_sop" value="${sop}" placeholder="Describe responsibilities...">
        <label>Color</label>
        <div class="comm-color-swatches" id="cmf_colors"></div>
      </div>
      <div class="comm-modal-footer">
        ${isEdit ? `<button class="btn" style="background:#e53935;color:#fff;margin-right:auto" onclick="deleteCommittee('${editLetter}')">Delete</button>` : ''}
        <button class="btn btn-secondary" onclick="closeCommModal()">Cancel</button>
        <button class="btn btn-primary" id="cmf_save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Color swatches
  const swatchWrap = document.getElementById('cmf_colors');
  let selectedColor = color;
  COMM_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'comm-color-swatch' + (c === color ? ' active' : '');
    sw.style.background = c;
    sw.onclick = function() {
      swatchWrap.querySelectorAll('.comm-color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active'); selectedColor = c;
    };
    swatchWrap.appendChild(sw);
  });
  // Save handler
  document.getElementById('cmf_save').onclick = function() {
    const n = document.getElementById('cmf_name').value.trim();
    if (!n) { showToast('Committee name is required', 'error'); return; }
    const cId = document.getElementById('cmf_letter').value.trim().toUpperCase();
    if (!cId) { showToast('Committee ID is required', 'error'); return; }
    if (!isEdit && commDefs.find(d => d.c === cId)) { showToast('Committee ' + cId + ' already exists', 'error'); return; }
    const sopVal = document.getElementById('cmf_sop').value.trim();
    // Pick a default icon based on first letter or generic
    const icon = '&#128203;';
    onSave({c: cId, n: n, sop: sopVal, bg: selectedColor, icon: isEdit ? (commDefs.find(d=>d.c===cId)||{}).icon || icon : icon});
    closeCommModal();
  };
  // Close on backdrop click
  modal.addEventListener('click', function(e) { if (e.target === modal) closeCommModal(); });
}

function closeCommModal() {
  const m = document.getElementById('commEditModal'); if (m) m.remove();
}

// ===== RESIDENT DIRECTORY & AUTOCOMPLETE =====
let _residentData = []; let _residentDataLoaded = false;

function loadResidentData() {
  if (_residentDataLoaded) return Promise.resolve(_residentData);
  return fetch('/data/residents.json').then(r => { if (!r.ok) throw new Error('No JSON'); return r.json(); }).then(d => { _residentData = d; _residentDataLoaded = true; console.log('Resident data loaded from JSON:', d.length, 'records'); return d; }).catch(() => {
    // Try root path
    return fetch('/data/residents.json').then(r => { if (!r.ok) throw new Error('No JSON'); return r.json(); }).then(d => { _residentData = d; _residentDataLoaded = true; return d; }).catch(() => {
      if (typeof supa === 'undefined' || !supa) { console.warn('Supabase not available'); return []; }
      console.log('residents.json not found, trying Supabase residents_directory...');
      return supa.from('residents_directory').select('*').then(({data, error}) => {
        if (!error && data && data.length > 0) {
          const mapped = data.map(r => ({n: r.name||'', f: r.flat_full||'', t: r.tower||'', fn: r.flat_no||'', tp: r.resident_type||'Owner', st: r.status||'Active', oc: r.occupancy||'Self-occupied', mb: r.mobile||''}));
          _residentData = mapped; _residentDataLoaded = true; return mapped;
        }
        return supa.from('profiles').select('*').then(({data: pData, error: pErr}) => {
          if (pErr) { console.error('Supabase profiles error:', pErr); return []; }
          const seenIds = new Set(); const mapped = [];
          (pData || []).forEach(p => { if (seenIds.has(p.id)) return; seenIds.add(p.id); const email = (p.email||'').toLowerCase(); if (mapped.find(m => m._email === email)) return; const flat = p.flat_no || ''; const towerMatch = flat.match(/^(ST[A-D][12]?)/i); const tower = towerMatch ? towerMatch[1].toUpperCase() : ''; const fn = flat.replace(/^ST[A-D][12]?-?/i, ''); mapped.push({n: p.display_name||p.email||'', f: flat, t: tower, fn: fn, tp: p.type||'Owner', st: (p.status||'active') === 'active' ? 'Active' : 'Inactive', oc: p.occupancy||'Self-occupied', mb: p.mobile||'', _email: email}); });
          _residentData = mapped; _residentDataLoaded = true; return mapped;
        });
      });
    });
  });
}

function residentAutocomplete(input) {
  if (!_residentDataLoaded) { loadResidentData().then(() => residentAutocomplete(input)); return; }
  const q = input.value.toLowerCase().trim(); const listId = input.nextElementSibling?.id; if (!listId) return;
  const list = document.getElementById(listId); if (!list) return;
  if (q.length < 2) { list.classList.remove('show'); list.innerHTML = ''; return; }
  const matches = _residentData.filter(r => r.n.toLowerCase().includes(q) || r.f.toLowerCase().includes(q) || r.t.toLowerCase().includes(q)).slice(0, 15);
  if (!matches.length) { list.classList.remove('show'); list.innerHTML = ''; return; }
  list.innerHTML = matches.map(r => { const typeCls = r.tp === 'Owner' ? 'dir-badge-owner' : r.tp.includes('Tenant') ? 'dir-badge-tenant' : 'dir-badge-family'; return `<div class="autocomplete-item" onmousedown="selectResident(this,'${input.id}')"><div><span class="ac-name">${r.n}</span> <span class="ac-type dir-badge ${typeCls}">${r.tp}</span></div><span class="ac-flat">${r.f}</span></div>`; }).join('');
  list.classList.add('show');
}

function selectResident(item, inputId) { const name = item.querySelector('.ac-name').textContent; const flat = item.querySelector('.ac-flat').textContent; const inp = document.getElementById(inputId); if (inp) inp.value = name + ' (' + flat + ')'; closeAutocomplete(inp); }

function memberResidentAC(input, idx) {
  if (!_residentDataLoaded) { loadResidentData().then(() => memberResidentAC(input, idx)); return; }
  const q = input.value.toLowerCase().trim(); const list = document.getElementById('acl_mem_' + idx); if (!list) return;
  if (q.length < 2) { list.classList.remove('show'); list.innerHTML = ''; return; }
  const matches = _residentData.filter(r => r.n.toLowerCase().includes(q) || r.f.toLowerCase().includes(q) || r.t.toLowerCase().includes(q)).slice(0, 10);
  if (!matches.length) { list.classList.remove('show'); list.innerHTML = ''; return; }
  list.innerHTML = matches.map(r => { const typeCls = r.tp === 'Owner' ? 'dir-badge-owner' : r.tp.includes('Tenant') ? 'dir-badge-tenant' : 'dir-badge-family'; return `<div class="autocomplete-item" data-mobile="${r.mb||''}" onmousedown="selectMemberResident(this,${idx})"><div><span class="ac-name">${r.n}</span> <span class="ac-type dir-badge ${typeCls}">${r.tp}</span></div><span class="ac-flat">${r.f}</span></div>`; }).join('');
  list.classList.add('show');
}

function selectMemberResident(item, idx) {
  const name = item.querySelector('.ac-name').textContent;
  const flat = item.querySelector('.ac-flat').textContent;
  const mobile = item.getAttribute('data-mobile') || '';
  const inp = document.getElementById('n_' + idx); if (inp) inp.value = name;
  const fi = document.getElementById('f_' + idx); if (fi) fi.value = flat;
  const ph = document.getElementById('ph_' + idx); if (ph && mobile) ph.value = mobile;
  closeAutocomplete(inp);
}

function closeAutocomplete(input) { if (!input) return; const list = input.nextElementSibling; if (list) list.classList.remove('show'); }

// Directory Search
function initDirectory() { loadResidentData().then(() => { searchDirectory(); }); }

function searchDirectory() {
  if (!_residentDataLoaded) { loadResidentData().then(() => searchDirectory()); return; }
  const q = (document.getElementById('dirSearchInput')?.value || '').toLowerCase().trim();
  const tower = document.getElementById('dirTowerFilter')?.value || '';
  const type = document.getElementById('dirTypeFilter')?.value || '';
  const status = document.getElementById('dirStatusFilter')?.value || '';
  let results = _residentData.filter(r => {
    if (r.f.startsWith('COMMON')) return false;
    if (tower && r.t !== tower) return false;
    if (type && r.tp !== type) return false;
    if (status && r.st !== status) return false;
    if (q && !r.n.toLowerCase().includes(q) && !r.f.toLowerCase().includes(q) && !r.t.toLowerCase().includes(q) && !r.fn.includes(q)) return false;
    return true;
  });
  const statsEl = document.getElementById('dirStats');
  const totalOwners = results.filter(r => r.tp === 'Owner').length;
  const totalTenants = results.filter(r => r.tp.includes('Tenant')).length;
  const totalActive = results.filter(r => r.st === 'Active').length;
  const uniqueFlats = new Set(results.map(r => r.f)).size;
  statsEl.innerHTML = `<div class="dir-stat-card"><div class="stat-num">${results.length}</div><div class="stat-label">Total</div></div><div class="dir-stat-card"><div class="stat-num">${uniqueFlats}</div><div class="stat-label">Flats</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#1565c0">${totalOwners}</div><div class="stat-label">Owners</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#e65100">${totalTenants}</div><div class="stat-label">Tenants</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#2e7d32">${totalActive}</div><div class="stat-label">Active</div></div>`;
  const resEl = document.getElementById('dirResults');
  if (!results.length) { resEl.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:#999">No residents found matching your search.</div>'; return; }
  const showing = results.slice(0, 100);
  let h = '<div class="dir-table-wrap"><table class="dir-table"><thead><tr><th>Flat</th><th>Name</th><th>Type</th><th>Occupancy</th><th>Status</th><th>Mobile</th></tr></thead><tbody>';
  showing.forEach(r => { const typeCls = r.tp === 'Owner' ? 'dir-badge-owner' : r.tp.includes('Tenant') ? 'dir-badge-tenant' : 'dir-badge-family'; const statusCls = r.st === 'Active' ? 'dir-badge-active' : 'dir-badge-inactive'; h += `<tr><td><span class="dir-tower-tag">${r.t}</span>${r.fn}</td><td><strong>${r.n}</strong></td><td><span class="dir-badge ${typeCls}">${r.tp}</span></td><td style="font-size:0.78rem;color:#666">${r.oc}</td><td><span class="dir-badge ${statusCls}">${r.st}</span></td><td style="font-size:0.8rem;color:#555">${r.mb}</td></tr>`; });
  h += '</tbody></table></div>';
  if (results.length > 100) h += `<p style="text-align:center;color:#999;font-size:0.8rem;margin-top:8px">Showing 100 of ${results.length} results. Refine your search to see more.</p>`;
  resEl.innerHTML = h;
}

// ===== ALLOCATION =====
function initAlloc() {
  const a = document.getElementById('allocArea');
  const vm = members.filter(m => m && m.name);
  if (!vm.length) { a.innerHTML = '<div class="card"><p>Register members first.</p></div>'; return; }
  let h = '', lc = '';
  const cc = {A:'#b71c1c',B:'#4a148c',C:'#1a237e',D:'#01579b',E:'#004d40',F:'#e65100'};
  TASKS.forEach(t => {
    if (t.c !== lc) { lc = t.c; h += `<div class="task-category" style="border-left:4px solid ${cc[t.c]}">Cat ${t.c} - ${t.cn}</div>`; }
    h += `<div class="task-row"><strong style="min-width:35px;color:${cc[t.c]}">${t.id}</strong><span style="flex:1">${t.t}</span><select id="a_${t.id}" onchange="assignments['${t.id}']=this.value;saveAssignments()"><option value="">--</option>${vm.map(m=>`<option value="${m.name}" ${assignments[t.id]===m.name?'selected':''}>${m.name}</option>`).join('')}</select></div>`;
  });
  a.innerHTML = h;
}
function saveAssignments() { localStorage.setItem('st_assignments', JSON.stringify(assignments)); supaSync('st_assignments'); if (db) { db.collection('settings').doc('assignments').set(assignments).catch(() => {}); } }
function autoAssign() { const vm = members.filter(m => m && m.name); if (!vm.length) return; const pm = {}; vm.forEach(m => { const p = m.position || 'Member'; if (!pm[p]) pm[p] = []; pm[p].push(m.name); }); let mi = 0; TASKS.forEach(t => { if (t.dp === 'Member') { const ml = pm['Member'] || vm.map(m => m.name); assignments[t.id] = ml[mi++ % ml.length]; } else { assignments[t.id] = (pm[t.dp] && pm[t.dp][0]) || vm[0].name; } }); saveAssignments(); initAlloc(); }
function clearAssign() { assignments = {}; saveAssignments(); initAlloc(); }

function genDash() {
  const a = document.getElementById('dashArea'), ch = document.getElementById('chartArea');
  const vm = members.filter(m => m && m.name);
  if (!vm.length) { a.innerHTML = '<div class="card"><p>No members.</p></div>'; return; }
  const mt = {}; vm.forEach(m => { mt[m.name] = []; });
  TASKS.forEach(t => { if (assignments[t.id] && mt[assignments[t.id]]) mt[assignments[t.id]].push(t); });
  const tot = Object.values(mt).reduce((s, a) => s + a.length, 0);
  const pc = {'President':'#b71c1c','Vice President':'#4a148c','Gen Secretary':'#1a237e','Vice Gen Secretary':'#01579b','Treasurer':'#004d40','Vice Treasurer':'#1b5e20','Member':'#e65100'};
  let h = `<p><strong>Total:</strong> ${TASKS.length} | <strong>Assigned:</strong> ${tot} | <strong>Unassigned:</strong> ${TASKS.length - tot}</p><div class="summary-grid">`;
  vm.forEach(m => { const ts = mt[m.name] || []; const c = pc[m.position] || '#666'; h += `<div class="summary-card" style="border-top:4px solid ${c}"><div class="name">${m.name}</div><div class="position"><span class="badge" style="background:${c}">${m.position || 'Member'}</span></div><div class="task-count">${ts.length}</div><div style="font-size:0.8rem;color:#666">tasks</div></div>`; });
  h += '</div>'; a.innerHTML = h;
  const mx = Math.max(...vm.map(m => (mt[m.name] || []).length), 1);
  let c2 = '<div class="card"><h3>Workload</h3>';
  vm.forEach(m => { const cnt = (mt[m.name] || []).length; const p = (cnt / mx) * 100; const cl = pc[m.position] || '#666'; c2 += `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><span style="min-width:120px;font-size:0.85rem;font-weight:600">${m.name}</span><div style="flex:1;background:#e0e0e0;border-radius:8px;height:24px;position:relative"><div style="width:${p}%;background:${cl};border-radius:8px;height:100%"></div><span style="position:absolute;right:8px;top:3px;font-size:0.8rem;font-weight:600">${cnt}</span></div></div>`; });
  c2 += '</div>'; ch.innerHTML = c2;
}

function exportCSV() {
  const vm = members.filter(m => m && m.name);
  let csv = 'ID,Category,Task,Freq,Assigned,Position\n';
  TASKS.forEach(t => { const a = assignments[t.id] || ''; const m = vm.find(x => x.name === a); csv += `"${t.id}","${t.cn}","${t.t}","${t.f}","${a}","${m ? m.position : ''}"\n`; });
  const b = new Blob([csv], {type: 'text/csv'}); const u = URL.createObjectURL(b);
  const el = document.createElement('a'); el.href = u; el.download = 'SunTower_Allocation.csv'; el.click();
}

// ===== ADMIN =====
function popAccDrop() { const s = document.getElementById('accName'); if (!s) return; s.innerHTML = '<option value="">--</option>'; EM.forEach(m => { s.innerHTML += `<option>${m.name} (${m.flat})</option>`; }); }

async function createAccount() {
  const e = document.getElementById('accEmail').value.trim(), p = document.getElementById('accPass').value, n = document.getElementById('accName').value, err = document.getElementById('accErr'), scArea = document.getElementById('accSuccessCard');
  err.style.display = 'none'; scArea.innerHTML = '';
  if (!e || !p || p.length < 6) { err.textContent = 'Valid email & password (6+ chars) required'; err.style.display = 'block'; return; }
  try {
    const dispName = n || e;
    const flat = (n.match(/\(([^)]+)\)/) || [])[1] || '';
    err.textContent = 'Creating account...'; err.style.display = 'block'; err.style.color = '#1565c0';
    const result = await createSupabaseUser(e, p, 'bom', {display_name: dispName, flat_no: flat});
    err.style.display = 'none'; err.style.color = '';
    if (!result.ok) { err.textContent = 'Account creation failed: ' + (result.error || 'Unknown error'); err.style.display = 'block'; err.style.color = ''; return; }
    const u = JSON.parse(localStorage.getItem('st_users') || '{}'); u[e] = p;
    localStorage.setItem('st_users', JSON.stringify(u)); supaSync('st_users');
    saveBOMAcctMeta(n, e, p); showAcctSuccessCard(n, e, p);
    SunAudit.log('create_account', 'account', null, {email: e, name: n, role: 'bom', supabase: true});
  } catch(x) { err.textContent = x.message || 'Account creation failed'; err.style.display = 'block'; err.style.color = ''; }
}

function saveBOMAcctMeta(name, email, pass) {
  const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]');
  const dup = accts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (dup) { dup.name = name || dup.name; dup.password = pass; dup.updatedAt = new Date().toISOString(); dup.lastReset = new Date().toISOString(); }
  else { const flat = (name.match(/\(([^)]+)\)/) || [])[1] || ''; accts.push({id: 'BOM_' + Date.now(), name: name, email: email.toLowerCase(), password: pass, flat: flat, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLogin: null, status: 'never'}); }
  localStorage.setItem('st_bom_accounts', JSON.stringify(accts)); supaSync('st_bom_accounts'); buildAccountList();
}

function showAcctSuccessCard(name, email, pass) {
  const area = document.getElementById('accSuccessCard'); const dispName = name || email;
  const credText = `BOM Portal Login\nName: ${dispName}\nEmail: ${email}\nPassword: ${pass}\nURL: https://bom.suntower.in/`;
  const wpText = encodeURIComponent(`🏢 Sun Tower BOM Portal\n\nDear ${dispName},\n\nYour BOM account has been created:\n📧 Email: ${email}\n🔑 Password: ${pass}\n🔗 URL: https://bom.suntower.in/\n\nPlease login and change your password.\n\n— Sun Tower RWA Admin`);
  area.innerHTML = `<div class="acct-success-card"><h4>&#9989; Account Created Successfully</h4><dl class="acct-success-detail"><dt>Member</dt><dd><strong>${dispName}</strong></dd><dt>Email</dt><dd>${email}</dd><dt>Password</dt><dd><code style="background:#fff;padding:2px 8px;border-radius:4px;font-weight:700;color:#1a237e">${pass}</code></dd></dl><div class="acct-copy-bar"><button class="acct-copy-btn acct-copy-btn-cred" onclick="copyAcctCred('${credText.replace(/'/g, "\\'")}')">&#128203; Copy Credentials</button><button class="acct-copy-btn acct-copy-btn-wp" onclick="window.open('https://wa.me/?text=${wpText}','_blank')">&#128172; Share via WhatsApp</button><button class="acct-copy-btn acct-copy-btn-dismiss" onclick="this.closest('.acct-success-card').remove()">&#10005; Dismiss</button></div></div>`;
  document.getElementById('accEmail').value = ''; document.getElementById('accPass').value = ''; document.getElementById('accName').selectedIndex = 0;
}

function copyAcctCred(text) { navigator.clipboard.writeText(text.replace(/\\n/g, '\n')).then(() => { const btns = document.querySelectorAll('.acct-copy-btn-cred'); btns.forEach(b => { b.textContent = '✓ Copied!'; setTimeout(() => { b.innerHTML = '&#128203; Copy Credentials'; }, 2000); }); }).catch(() => { prompt('Copy credentials:', text.replace(/\\n/g, '\n')); }); }

function buildAccountList() {
  const area = document.getElementById('acctDashArea'); if (!area) return;
  const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]');
  const users = JSON.parse(localStorage.getItem('st_users') || '{}');
  const totalAccts = accts.length; const activeAccts = accts.filter(a => a.lastLogin).length; const neverLogged = totalAccts - activeAccts;
  let h = `<div class="acct-summary-bar"><div class="acct-summary-item"><div class="acct-sum-val">${totalAccts}</div><div class="acct-sum-lbl">Total Accounts</div></div><div class="acct-summary-item" style="border-top-color:#2e7d32"><div class="acct-sum-val" style="color:#2e7d32">${activeAccts}</div><div class="acct-sum-lbl">Active (Logged In)</div></div><div class="acct-summary-item" style="border-top-color:#e65100"><div class="acct-sum-val" style="color:#e65100">${neverLogged}</div><div class="acct-sum-lbl">Never Logged In</div></div></div>`;
  if (!accts.length) { h += `<div class="acct-empty"><div class="acct-empty-icon">&#128100;</div><p>No BOM accounts created yet.<br>Use the form above to create accounts for BOM members.</p></div>`; area.innerHTML = h; return; }
  h += `<table class="acct-table"><tr><th>#</th><th>Member</th><th>Email</th><th>Password</th><th>Created</th><th>Status</th><th>Actions</th></tr>`;
  accts.forEach((a, i) => {
    const dt = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—';
    const statusCls = a.lastLogin ? 'acct-status-active' : 'acct-status-never';
    const statusTxt = a.lastLogin ? 'Active' : 'Never Logged In';
    const pw = a.password || users[a.email] || '—';
    const credText = `BOM Portal Login\\nName: ${(a.name || '').replace(/'/g, "\\'")}\\nEmail: ${a.email}\\nPassword: ${pw}\\nURL: https://bom.suntower.in/`;
    const wpText = encodeURIComponent(`🏢 Sun Tower BOM Portal\n\nDear ${a.name || a.email},\n\nYour BOM account:\n📧 Email: ${a.email}\n🔑 Password: ${pw}\n🔗 URL: https://bom.suntower.in/\n\nPlease login and change your password.\n\n— Sun Tower RWA Admin`);
    h += `<tr><td>${i+1}</td><td><strong>${a.name || '—'}</strong>${a.flat ? '<br><span style="font-size:0.72rem;color:#999">' + a.flat + '</span>' : ''}</td><td style="font-size:0.8rem">${a.email}</td><td><span class="acct-pw-reveal" title="Click to copy" onclick="navigator.clipboard.writeText('${pw}');this.textContent='Copied!';setTimeout(()=>{this.textContent='${pw}'},1500)">${pw}</span></td><td style="font-size:0.8rem">${dt}</td><td><span class="acct-status ${statusCls}"><span class="acct-status-dot"></span> ${statusTxt}</span></td><td><div class="acct-action-group"><button class="btn btn-sm" style="background:var(--primary);color:#fff" onclick="copyAcctCred('${credText}')" title="Copy">&#128203;</button><button class="btn btn-sm" style="background:#25d366;color:#fff" onclick="window.open('https://wa.me/?text=${wpText}','_blank')" title="WhatsApp">&#128172;</button><button class="btn btn-sm" style="background:#e65100;color:#fff" onclick="editBOMAccount('${a.id}')" title="Edit">&#9998;</button><button class="btn btn-sm btn-danger" onclick="deleteBOMAccount('${a.id}')" title="Delete">&#128465;</button></div></td></tr>`;
  });
  h += `</table>`; area.innerHTML = h;
}

function editBOMAccount(id) {
  const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]'); const a = accts.find(x => x.id === id); if (!a) return;
  document.getElementById('mTitle').textContent = 'Edit BOM Account';
  const lastLogin = a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never';
  const created = a.createdAt ? new Date(a.createdAt).toLocaleString() : '—';
  const updated = a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—';
  document.getElementById('mBody').innerHTML = `<div class="acct-edit-form"><div class="acct-edit-row"><div class="form-group"><label>Member Name</label><input type="text" class="form-control" id="editAcctName" value="${a.name || ''}"></div><div class="form-group"><label>Flat Number</label><input type="text" class="form-control" id="editAcctFlat" value="${a.flat || ''}" style="text-transform:uppercase"></div></div><div class="form-group"><label>Email</label><input type="email" class="form-control" id="editAcctEmail" value="${a.email || ''}"></div><div class="acct-edit-row"><div class="form-group"><label>Password</label><input type="text" class="form-control" id="editAcctPass" value="${a.password || ''}"></div><div class="form-group"><label>Status</label><select class="form-control" id="editAcctStatus"><option value="never" ${a.status !== 'active' ? 'selected' : ''}>Never Logged In</option><option value="active" ${a.status === 'active' ? 'selected' : ''}>Active</option></select></div></div><div class="acct-edit-meta"><strong>Account ID:</strong> ${a.id}<br><strong>Created:</strong> ${created}<br><strong>Last Updated:</strong> ${updated}<br><strong>Last Login:</strong> ${lastLogin}</div><div class="acct-edit-actions"><button class="btn btn-primary" onclick="saveBOMAccountEdit('${a.id}')">&#128190; Save Changes</button><button class="btn btn-outline" onclick="closeModal()">Cancel</button></div></div>`;
  document.getElementById('noticeModal').classList.remove('hidden');
}

async function saveBOMAccountEdit(id) {
  const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]'); const idx = accts.findIndex(x => x.id === id); if (idx === -1) { alert('Account not found'); return; }
  const name = document.getElementById('editAcctName').value.trim(); const flat = document.getElementById('editAcctFlat').value.trim().toUpperCase();
  const email = document.getElementById('editAcctEmail').value.trim().toLowerCase(); const pass = document.getElementById('editAcctPass').value; const status = document.getElementById('editAcctStatus').value;
  if (!email) { alert('Email is required'); return; } if (pass && pass.length < 6) { alert('Password must be at least 6 characters'); return; }
  if (pass) {
    try {
      const listResp = await fetch(SUPABASE_URL + '/auth/v1/admin/users?page=1&per_page=200', { headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY} });
      if (listResp.ok) { const listData = await listResp.json(); const authUser = (listData.users || []).find(u => u.email && u.email.toLowerCase() === accts[idx].email.toLowerCase()); if (authUser) { const pwResult = await updateAuthPassword(authUser.id, pass); if (!pwResult.ok) { alert('Warning: Password not updated in auth system: ' + (pwResult.error || '')); return; } } }
    } catch(e) { console.warn('saveBOMAccountEdit: auth sync error', e); }
  }
  const oldEmail = accts[idx].email; accts[idx].name = name; accts[idx].flat = flat; accts[idx].email = email; if (pass) accts[idx].password = pass; accts[idx].status = status; accts[idx].updatedAt = new Date().toISOString();
  localStorage.setItem('st_bom_accounts', JSON.stringify(accts)); supaSync('st_bom_accounts');
  const users = JSON.parse(localStorage.getItem('st_users') || '{}'); if (oldEmail !== email) { delete users[oldEmail]; } if (pass) users[email] = pass; localStorage.setItem('st_users', JSON.stringify(users)); supaSync('st_users');
  closeModal(); buildAccountList();
}

function deleteBOMAccount(id) {
  const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]'); const a = accts.find(x => x.id === id); if (!a) return;
  if (!confirm(`Delete account for ${a.name || a.email}?\n\nThis will remove the account from the dashboard.\nThe login credentials in the system will also be removed.`)) return;
  const idx = accts.findIndex(x => x.id === id); accts.splice(idx, 1); localStorage.setItem('st_bom_accounts', JSON.stringify(accts)); supaSync('st_bom_accounts');
  const users = JSON.parse(localStorage.getItem('st_users') || '{}'); delete users[a.email]; localStorage.setItem('st_users', JSON.stringify(users)); supaSync('st_users'); buildAccountList();
}

// ===== SUPABASE AUTH API =====
async function createSupabaseUser(email, password, role, metadata) {
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/admin/users', { method: 'POST', headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({ email: email.trim().toLowerCase(), password: password, email_confirm: true, user_metadata: {role: role, display_name: metadata.display_name || '', flat_no: metadata.flat_no || ''} }) });
    if (resp.status === 422) {
      const listResp = await fetch(SUPABASE_URL + '/auth/v1/admin/users?page=1&per_page=200', { headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY} });
      if (listResp.ok) { const listData = await listResp.json(); const existing = (listData.users || []).find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase()); if (existing) { await updateAuthPassword(existing.id, password); await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + existing.id, { method: 'PATCH', headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}, body: JSON.stringify({display_name: metadata.display_name || '', flat_no: metadata.flat_no || '', mobile: metadata.mobile || '', role: role, status: 'active'}) }); return {ok: true, userId: existing.id, existed: true}; } }
      return {ok: false, error: 'User already exists but could not be found'};
    }
    if (!resp.ok) { const err = await resp.json().catch(() => ({})); return {ok: false, error: err.msg || 'HTTP ' + resp.status}; }
    const userData = await resp.json(); const userId = userData.id;
    await new Promise(r => setTimeout(r, 1500));
    await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId, { method: 'PATCH', headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}, body: JSON.stringify({display_name: metadata.display_name || '', flat_no: metadata.flat_no || '', mobile: metadata.mobile || '', role: role, status: 'active'}) });
    return {ok: true, userId: userId, existed: false};
  } catch(e) { console.error('createSupabaseUser error:', e); return {ok: false, error: e.message}; }
}

async function updateAuthPassword(userId, newPassword) {
  try {
    const resp = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + userId, { method: 'PUT', headers: {'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({password: newPassword}) });
    if (!resp.ok) { const err = await resp.json().catch(() => ({})); console.error('updateAuthPassword failed:', resp.status, err); return {ok: false, error: err.msg || 'Failed to update password'}; }
    return {ok: true};
  } catch(e) { console.error('updateAuthPassword error:', e); return {ok: false, error: e.message}; }
}

// ===== SYNC ALL ACCOUNTS =====
async function syncAllAccountsToAuth() {
  const statusDiv = document.getElementById('syncStatus');
  statusDiv.style.display = 'block'; statusDiv.style.background = '#e3f2fd'; statusDiv.style.color = '#1565c0';
  statusDiv.innerHTML = '&#9203; Syncing accounts to Supabase Auth...';
  let created = 0, existed = 0, failed = 0, errors = [];
  const bomAccts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]');
  const bomUsers = JSON.parse(localStorage.getItem('st_users') || '{}');
  for (const a of bomAccts) {
    const pw = a.password || bomUsers[a.email] || 'Sun' + ((a.flat || 'BOM').replace('-', '')) + '!';
    statusDiv.innerHTML = `&#9203; Syncing BOM: ${a.email}...`;
    const r = await createSupabaseUser(a.email, pw, 'bom', {display_name: a.name || '', flat_no: a.flat || ''});
    if (r.ok) { if (r.existed) { existed++; } else { created++; } } else { failed++; errors.push(a.email + ': ' + r.error); }
  }
  const resAccts = JSON.parse(localStorage.getItem('st_residents') || '[]').filter(r => r.status === 'approved');
  const resUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}');
  for (const r of resAccts) {
    const pw = resUsers[r.email?.toLowerCase()] || r.tempPass || 'Sun' + ((r.flatNo || 'User').replace('-', '')) + '!';
    if (!r.email) continue;
    statusDiv.innerHTML = `&#9203; Syncing Resident: ${r.email}...`;
    const res = await createSupabaseUser(r.email, pw, 'resident', {display_name: r.ownerName || '', flat_no: r.flatNo || '', mobile: r.mobile || ''});
    if (res.ok) { if (res.existed) { existed++; } else { created++; } } else { failed++; errors.push(r.email + ': ' + res.error); }
  }
  let msg = `&#9989; Sync complete: ${created} created, ${existed} already existed, ${failed} failed`;
  if (errors.length) msg += `<br><small style="color:#b71c1c">Errors: ${errors.join(', ')}</small>`;
  statusDiv.style.background = failed ? '#fff3e0' : '#e8f5e9'; statusDiv.style.color = failed ? '#e65100' : '#2e7d32';
  statusDiv.innerHTML = msg; buildAccountList(); loadApprovedResidents();
}

function trackBOMLogin() { if (!currentUser || !currentUser.email) return; const accts = JSON.parse(localStorage.getItem('st_bom_accounts') || '[]'); const idx = accts.findIndex(a => a.email.toLowerCase() === currentUser.email.toLowerCase()); if (idx !== -1) { accts[idx].lastLogin = new Date().toISOString(); accts[idx].status = 'active'; localStorage.setItem('st_bom_accounts', JSON.stringify(accts)); supaSync('st_bom_accounts'); } }

function loadAdminMsgs() { const c = document.getElementById('adminMsgs'); if (db) { db.collection('messages').orderBy('timestamp', 'desc').limit(20).get().then(s => { if (s.empty) { c.innerHTML = '<p>No messages.</p>'; return; } let h = '<table><tr><th>Date</th><th>From</th><th>Message</th></tr>'; s.forEach(d => { const x = d.data(); h += `<tr><td>${x.date || ''}</td><td>${x.name || 'Anon'}</td><td>${x.message}</td></tr>`; }); h += '</table>'; c.innerHTML = h; }).catch(() => { loadLocalMsgs(c); }); } else loadLocalMsgs(c); }
function loadLocalMsgs(c) { const m = JSON.parse(localStorage.getItem('st_messages') || '[]'); if (!m.length) { c.innerHTML = '<p>No messages.</p>'; return; } let h = '<table><tr><th>Date</th><th>Message</th></tr>'; m.forEach(x => { h += `<tr><td>${x.date || ''}</td><td>${x.message}</td></tr>`; }); h += '</table>'; c.innerHTML = h; }

// ===== ADMIN SETTINGS =====
async function changeAdminPass() {
  const cur = document.getElementById('curPass').value, np = document.getElementById('newPass').value, cf = document.getElementById('cfmPass').value, err = document.getElementById('passErr'), suc = document.getElementById('passSuc');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!cur || !np || !cf) { err.textContent = 'All fields are required'; err.style.display = 'block'; return; }
  if (np.length < 6) { err.textContent = 'New password must be at least 6 characters'; err.style.display = 'block'; return; }
  if (np !== cf) { err.textContent = 'New password and confirmation do not match'; err.style.display = 'block'; return; }
  const result = await SunAuth.changePassword(np);
  if (result.error) { err.textContent = result.error.message; err.style.display = 'block'; }
  else { suc.textContent = 'Password changed successfully!'; suc.style.display = 'block'; document.getElementById('curPass').value = ''; document.getElementById('newPass').value = ''; document.getElementById('cfmPass').value = ''; }
}

function loadAdminProfile() { const p = JSON.parse(localStorage.getItem('st_admin_profile') || '{}'); if (db) { db.collection('settings').doc('admin_profile').get().then(d => { if (d.exists) { const data = d.data(); document.getElementById('adminEmailField').value = data.email || ''; document.getElementById('adminMobile').value = data.mobile || ''; document.getElementById('adminDispName').value = data.displayName || ''; } else fillFromLS(); }).catch(() => fillFromLS()); } else fillFromLS(); function fillFromLS() { document.getElementById('adminEmailField').value = p.email || ''; document.getElementById('adminMobile').value = p.mobile || ''; document.getElementById('adminDispName').value = p.displayName || ''; } }

function saveAdminProfile() { const email = document.getElementById('adminEmailField').value.trim(), mobile = document.getElementById('adminMobile').value.trim(), name = document.getElementById('adminDispName').value.trim(), err = document.getElementById('profErr'), suc = document.getElementById('profSuc'); err.style.display = 'none'; suc.style.display = 'none'; if (!email) { err.textContent = 'Email is required'; err.style.display = 'block'; return; } const data = {email: email, mobile: mobile, displayName: name, updatedAt: new Date().toISOString()}; localStorage.setItem('st_admin_profile', JSON.stringify(data)); supaSync('st_admin_profile'); suc.textContent = 'Profile saved!'; suc.style.display = 'block'; }

// ===== REGISTRATION REQUESTS =====
async function loadRegRequests() {
  const area = document.getElementById('regRequestsArea'); let pending = [];
  try { const sbReqs = await SunData.getRegistrationRequests('pending'); sbReqs.forEach(r => { pending.push({id: r.id, ownerName: r.owner_name, flatNo: r.flat_no, mobile: r.mobile, email: r.email, requestDate: r.request_date, source: 'supabase'}); }); } catch(e) { console.warn('loadRegRequests: Supabase fetch failed', e); }
  const lsResidents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const lsPending = lsResidents.filter(r => r.status === 'pending');
  lsPending.forEach(r => { if (!pending.find(p => p.email.toLowerCase() === r.email.toLowerCase())) { pending.push({id: r.id, ownerName: r.ownerName, flatNo: r.flatNo, mobile: r.mobile, email: r.email, requestDate: r.requestDate, source: 'local'}); } });
  if (!pending.length) { area.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:15px">No pending registration requests.</p>'; return; }
  let h = '<table><tr><th>Date</th><th>Owner Name</th><th>Flat</th><th>Mobile</th><th>Email</th><th>Read</th><th>Write</th><th>Action</th></tr>';
  pending.forEach(r => { const dt = r.requestDate ? new Date(r.requestDate).toLocaleDateString() : ''; h += `<tr><td>${dt}</td><td><strong>${r.ownerName}</strong></td><td>${r.flatNo}</td><td>${r.mobile}</td><td style="font-size:0.8rem">${r.email}</td><td><input type="checkbox" id="perm_r_${r.id}" checked></td><td><input type="checkbox" id="perm_w_${r.id}"></td><td><button class="btn btn-sm" style="background:#00695c;color:#fff;margin:2px" onclick="approveResident('${r.id}')">Approve</button><button class="btn btn-sm btn-danger" style="margin:2px" onclick="rejectResident('${r.id}')">Reject</button></td></tr>`; });
  h += '</table>'; area.innerHTML = h;
}

async function approveResident(id) {
  const readPerm = document.getElementById('perm_r_' + id)?.checked ?? true;
  const writePerm = document.getElementById('perm_w_' + id)?.checked ?? false;
  try {
    let reqData = null;
    try { const sbReqs = await SunData.getRegistrationRequests('pending'); reqData = sbReqs.find(r => r.id === id); if (reqData) { reqData = {email: reqData.email, ownerName: reqData.owner_name, flatNo: reqData.flat_no, mobile: reqData.mobile, source: 'supabase'}; } } catch(e) {}
    if (!reqData) { const lsResidents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const lsReq = lsResidents.find(r => r.id === id); if (lsReq) { reqData = {email: lsReq.email, ownerName: lsReq.ownerName, flatNo: lsReq.flatNo, mobile: lsReq.mobile, source: 'local'}; } }
    if (!reqData || !reqData.email) { alert('Registration request not found'); return; }
    const tempPass = 'Sun' + (reqData.flatNo || 'User').replace(/-/g, '') + '!';
    const result = await createSupabaseUser(reqData.email, tempPass, 'resident', { display_name: reqData.ownerName || '', flat_no: reqData.flatNo || '', mobile: reqData.mobile || '' });
    if (!result.ok) { alert('APPROVAL FAILED\n\nCould not create auth user: ' + (result.error || 'Unknown error')); loadRegRequests(); return; }
    if (reqData.source === 'supabase') { try { await SunData.updateRegistrationRequest(id, {status: 'approved'}); } catch(e) { console.warn('Could not update request status:', e); } }
    const residents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const idx = residents.findIndex(r => r.id === id);
    if (idx !== -1) { residents[idx].status = 'approved'; residents[idx].permissions = {read: readPerm, write: writePerm}; residents[idx].approvedDate = new Date().toISOString(); residents[idx].tempPass = tempPass; localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents'); }
    const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}'); rUsers[reqData.email.toLowerCase()] = tempPass; localStorage.setItem('st_res_users', JSON.stringify(rUsers)); supaSync('st_res_users');
    alert('APPROVED!\n\nResident: ' + (reqData.ownerName || reqData.email) + '\nFlat: ' + (reqData.flatNo || '') + '\nEmail: ' + reqData.email + '\n\nLogin Password: ' + tempPass + '\n\nShare this password with the resident.');
    loadRegRequests(); loadApprovedResidents();
  } catch(x) { alert('Error: ' + x.message); }
}

function rejectResident(id) { if (!confirm('Reject this registration request?')) return; const residents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const idx = residents.findIndex(r => r.id === id); if (idx === -1) return; residents.splice(idx, 1); localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents'); loadRegRequests(); }

// ===== APPROVED RESIDENTS =====
let _approvedResidents = [];
async function loadApprovedResidents() {
  const area = document.getElementById('approvedResidentsArea'); _approvedResidents = [];
  const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}');
  try { const sbProfiles = await SunData.getProfiles('resident'); const seenIds = new Set(); sbProfiles.forEach(p => { if (seenIds.has(p.id)) return; seenIds.add(p.id); const email = (p.email || '').toLowerCase(); if (_approvedResidents.find(a => a.email && a.email.toLowerCase() === email)) return; _approvedResidents.push({id: p.id, ownerName: p.display_name || p.email, flatNo: p.flat_no || '', mobile: p.mobile || '', email: p.email, createdAt: p.created_at || '', updatedAt: p.updated_at || '', status: p.status || 'active', source: 'supabase'}); }); } catch(e) { console.warn('loadApprovedResidents: Supabase fetch failed', e); }
  const lsResidents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const lsApproved = lsResidents.filter(r => r.status === 'approved');
  lsApproved.forEach(r => { if (!_approvedResidents.find(a => a.email.toLowerCase() === r.email.toLowerCase())) { _approvedResidents.push({id: r.id, ownerName: r.ownerName, flatNo: r.flatNo, mobile: r.mobile, email: r.email, createdAt: r.approvedDate || r.requestDate || '', updatedAt: '', status: 'active', tempPass: r.tempPass, source: 'local'}); } });
  const total = _approvedResidents.length; const authCount = _approvedResidents.filter(r => r.source === 'supabase').length; const legacyCount = total - authCount;
  let h = `<div class="acct-summary-bar"><div class="acct-summary-item"><div class="acct-sum-val">${total}</div><div class="acct-sum-lbl">Total Residents</div></div><div class="acct-summary-item" style="border-top-color:#2e7d32"><div class="acct-sum-val" style="color:#2e7d32">${authCount}</div><div class="acct-sum-lbl">With Login (Auth)</div></div><div class="acct-summary-item" style="border-top-color:#e65100"><div class="acct-sum-val" style="color:#e65100">${legacyCount}</div><div class="acct-sum-lbl">Legacy (No Auth)</div></div></div>`;
  if (!total) { h += `<div class="acct-empty"><div class="acct-empty-icon">&#128101;</div><p>No approved residents yet.<br>Approve registration requests above to add residents.</p></div>`; area.innerHTML = h; return; }
  h += `<table class="acct-table"><tr><th>#</th><th>Name</th><th>Flat</th><th>Mobile</th><th>Email</th><th>Password</th><th>Source</th><th>Actions</th></tr>`;
  _approvedResidents.forEach((r, i) => {
    const pw = rUsers[r.email.toLowerCase()] || r.tempPass || '—';
    const srcBadge = r.source === 'supabase' ? '<span class="acct-status acct-status-active"><span class="acct-status-dot"></span> Auth</span>' : '<span class="acct-status acct-status-never"><span class="acct-status-dot"></span> Legacy</span>';
    const credText = `Resident Portal Login\\nName: ${(r.ownerName || '').replace(/'/g, "\\'")}\\nFlat: ${r.flatNo}\\nEmail: ${r.email}\\nPassword: ${pw}\\nURL: https://suntower.in`;
    const wpText = encodeURIComponent(`🏢 Sun Tower Resident Portal\n\nDear ${r.ownerName || r.email},\n\nYour resident account:\n📧 Email: ${r.email}\n🔑 Password: ${pw}\n🏠 Flat: ${r.flatNo}\n🔗 URL: https://suntower.in\n\nPlease login and change your password.\n\n— Sun Tower RWA Admin`);
    const safeId = r.id.replace(/'/g, "\\'");
    h += `<tr><td>${i+1}</td><td><strong>${r.ownerName || '—'}</strong></td><td>${r.flatNo}</td><td style="font-size:0.8rem">${r.mobile || '—'}</td><td style="font-size:0.8rem">${r.email}</td><td><span class="acct-pw-reveal" title="Click to copy" onclick="navigator.clipboard.writeText('${pw}');this.textContent='Copied!';setTimeout(()=>{this.textContent='${pw}'},1500)">${pw}</span></td><td>${srcBadge}</td><td><div class="acct-action-group"><button class="btn btn-sm" style="background:var(--primary);color:#fff" onclick="copyAcctCred('${credText}')" title="Copy Credentials">&#128203;</button><button class="btn btn-sm" style="background:#25d366;color:#fff" onclick="window.open('https://wa.me/?text=${wpText}','_blank')" title="WhatsApp">&#128172;</button><button class="btn btn-sm" style="background:#e65100;color:#fff" onclick="editResidentAccount('${safeId}')" title="Edit">&#9998;</button><button class="btn btn-sm btn-danger" onclick="deleteResidentAccount('${safeId}')" title="Delete">&#128465;</button><button class="btn btn-sm" style="background:#00695c;color:#fff;font-size:0.65rem" onclick="resetResPass('${safeId}')" title="Reset Password">&#128273; PW</button></div></td></tr>`;
  });
  h += `</table>`; area.innerHTML = h;
}

function editResidentAccount(id) {
  const r = _approvedResidents.find(x => x.id === id); if (!r) return;
  const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}');
  const pw = rUsers[r.email.toLowerCase()] || r.tempPass || '';
  const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
  const updated = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—';
  document.getElementById('mTitle').textContent = 'Edit Resident Account';
  document.getElementById('mBody').innerHTML = `<div class="acct-edit-form"><div class="acct-edit-row"><div class="form-group"><label>Name</label><input type="text" class="form-control" id="editResAcctName" value="${r.ownerName || ''}"></div><div class="form-group"><label>Flat Number</label><input type="text" class="form-control" id="editResAcctFlat" value="${r.flatNo || ''}" style="text-transform:uppercase"></div></div><div class="acct-edit-row"><div class="form-group"><label>Email</label><input type="email" class="form-control" id="editResAcctEmail" value="${r.email || ''}" ${r.source === 'supabase' ? 'readonly style="background:#f5f5f5"' : ''}></div><div class="form-group"><label>Mobile</label><input type="tel" class="form-control" id="editResAcctMobile" value="${r.mobile || ''}"></div></div><div class="acct-edit-row"><div class="form-group"><label>Password</label><input type="text" class="form-control" id="editResAcctPass" value="${pw}"></div><div class="form-group"><label>Status</label><select class="form-control" id="editResAcctStatus"><option value="active" ${r.status === 'active' ? 'selected' : ''}>Active</option><option value="suspended" ${r.status === 'suspended' ? 'selected' : ''}>Suspended</option><option value="inactive" ${r.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></div></div><div class="acct-edit-meta"><strong>Account ID:</strong> ${r.id}<br><strong>Source:</strong> ${r.source === 'supabase' ? 'Supabase Auth' : 'Legacy (localStorage)'}<br><strong>Created:</strong> ${created}<br><strong>Last Updated:</strong> ${updated}</div><div class="acct-edit-actions"><button class="btn btn-primary" onclick="saveResidentAccountEdit('${r.id.replace(/'/g, "\\'")}','${r.source}')">&#128190; Save Changes</button><button class="btn btn-outline" onclick="closeModal()">Cancel</button></div></div>`;
  document.getElementById('noticeModal').classList.remove('hidden');
}

async function saveResidentAccountEdit(id, source) {
  const name = document.getElementById('editResAcctName').value.trim(); const flat = document.getElementById('editResAcctFlat').value.trim().toUpperCase();
  const email = document.getElementById('editResAcctEmail').value.trim().toLowerCase(); const mobile = document.getElementById('editResAcctMobile').value.trim();
  const pass = document.getElementById('editResAcctPass').value; const status = document.getElementById('editResAcctStatus').value;
  if (!name) { alert('Name is required'); return; }
  if (source === 'supabase') { try { const result = await SunData.updateProfileAdmin(id, {display_name: name, flat_no: flat, mobile: mobile, status: status}); if (result.error) { alert('Error: ' + result.error.message); return; } } catch(e) { alert('Error: ' + e.message); return; } }
  else { const residents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const idx = residents.findIndex(r => r.id === id); if (idx !== -1) { residents[idx].ownerName = name; residents[idx].flatNo = flat; residents[idx].mobile = mobile; residents[idx].email = email; localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents'); } }
  if (pass) {
    if (source === 'supabase') { const authResult = await updateAuthPassword(id, pass); if (!authResult.ok) { alert('Warning: Could not update login password: ' + (authResult.error || 'Unknown error') + '\nProfile was saved but password unchanged.'); return; } }
    const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}'); const r = _approvedResidents.find(x => x.id === id);
    if (r) { const oldEmail = r.email.toLowerCase(); if (oldEmail !== email) delete rUsers[oldEmail]; rUsers[email] = pass; localStorage.setItem('st_res_users', JSON.stringify(rUsers)); supaSync('st_res_users'); }
  }
  closeModal(); loadApprovedResidents();
}

function deleteResidentAccount(id) {
  const r = _approvedResidents.find(x => x.id === id); if (!r) return;
  if (!confirm(`Delete resident account for ${r.ownerName || r.email}?\n\nThis will remove the resident from the approved list.\nThe login credentials will also be removed.`)) return;
  if (r.source === 'supabase') { SunData.updateProfileAdmin(id, {status: 'suspended', role: 'suspended'}).then(() => { loadApprovedResidents(); }).catch(e => alert('Error: ' + e.message)); }
  else { const residents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const idx = residents.findIndex(x => x.id === id); if (idx !== -1) { residents.splice(idx, 1); localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents'); } }
  const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}'); delete rUsers[r.email.toLowerCase()]; localStorage.setItem('st_res_users', JSON.stringify(rUsers)); supaSync('st_res_users'); loadApprovedResidents();
}

async function resetResPass(id) {
  try {
    const r = _approvedResidents.find(x => x.id === id); if (!r) { alert('Resident not found'); return; }
    const newPass = 'Sun' + (r.flatNo || 'User').replace('-', '') + '!';
    if (r.source === 'supabase' || r.source === 'auth') { const authResult = await updateAuthPassword(id, newPass); if (!authResult.ok) { alert('Error resetting password: ' + (authResult.error || 'Unknown error')); return; } }
    const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}'); rUsers[r.email.toLowerCase()] = newPass; localStorage.setItem('st_res_users', JSON.stringify(rUsers)); supaSync('st_res_users');
    alert('Password reset for ' + (r.ownerName || r.email) + ':\n\nNew password: ' + newPass + '\n\nShare with the resident.');
    loadApprovedResidents();
  } catch(x) { alert('Error: ' + x.message); }
}

function revokeResident(id) { if (!confirm('Revoke access for this resident?')) return; const residents = JSON.parse(localStorage.getItem('st_residents') || '[]'); const idx = residents.findIndex(r => r.id === id); if (idx === -1) return; const email = residents[idx].email.toLowerCase(); residents.splice(idx, 1); localStorage.setItem('st_residents', JSON.stringify(residents)); supaSync('st_residents'); const rUsers = JSON.parse(localStorage.getItem('st_res_users') || '{}'); delete rUsers[email]; localStorage.setItem('st_res_users', JSON.stringify(rUsers)); supaSync('st_res_users'); loadApprovedResidents(); }

// ===== MANAGE RESIDENT DATA =====
let _allManagedResidents = [];
async function loadManageResidents() {
  const area = document.getElementById('mgrResidentsArea'); const stats = document.getElementById('mgrResidentsStats');
  area.innerHTML = '<p style="color:var(--text-light)">Loading residents...</p>'; _allManagedResidents = [];
  try { const sbProfiles = await SunData.getProfiles('resident'); const seenIds = new Set(); sbProfiles.forEach(p => { if (seenIds.has(p.id)) return; seenIds.add(p.id); const email = (p.email || '').toLowerCase(); if (_allManagedResidents.find(a => a.email && a.email.toLowerCase() === email)) return; _allManagedResidents.push({id: p.id, name: p.display_name || '', flat: p.flat_no || '', tower: p.flat_no ? (p.flat_no.match(/^(ST[A-D][12])/i) || [])[1] || '' : '', email: p.email || '', mobile: p.mobile || '', type: '', status: p.status || 'active', source: 'auth'}); }); } catch(e) { console.warn('loadManageResidents: Supabase error', e); }
  try { if (!window._residentData || !window._residentData.length) { const resp = await fetch('/data/residents.json'); if (resp.ok) window._residentData = await resp.json(); } if (window._residentData) { window._residentData.forEach((r, i) => { const exists = _allManagedResidents.find(a => (a.email && r.mb && a.email.toLowerCase() === r.mb.toLowerCase()) || (a.name && r.n && a.name.toLowerCase() === r.n.toLowerCase() && a.flat === r.f)); if (!exists) { _allManagedResidents.push({id: 'dir_' + i, name: r.n || '', flat: r.f || '', tower: r.t || '', flatNo: r.fn || '', email: '', mobile: r.mb || '', type: r.tp || '', occupancy: r.oc || '', status: r.st || 'Active', source: 'directory'}); } }); } } catch(e) { console.warn('loadManageResidents: directory error', e); }
  const authCount = _allManagedResidents.filter(r => r.source === 'auth').length; const dirCount = _allManagedResidents.filter(r => r.source === 'directory').length; const activeCount = _allManagedResidents.filter(r => r.status === 'active' || r.status === 'Active').length;
  stats.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="dir-stat-card"><div class="stat-num">${_allManagedResidents.length}</div><div class="stat-label">Total</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#2e7d32">${authCount}</div><div class="stat-label">With Login</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#1565c0">${dirCount}</div><div class="stat-label">Directory Only</div></div><div class="dir-stat-card"><div class="stat-num" style="color:#00695c">${activeCount}</div><div class="stat-label">Active</div></div></div>`;
  filterManagedResidents();
}

function filterManagedResidents() {
  const area = document.getElementById('mgrResidentsArea');
  const q = (document.getElementById('mgrSearchInput')?.value || '').toLowerCase(); const tw = document.getElementById('mgrTowerFilter')?.value || '';
  let filtered = _allManagedResidents;
  if (q) { filtered = filtered.filter(r => (r.name + ' ' + r.flat + ' ' + r.email + ' ' + r.tower + ' ' + r.mobile).toLowerCase().includes(q)); }
  if (tw) { filtered = filtered.filter(r => r.tower === tw); }
  if (!filtered.length) { area.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:15px">No residents match your search.</p>'; return; }
  const showing = filtered.slice(0, 50);
  let h = `<p style="font-size:0.82rem;color:#666;margin-bottom:8px">Showing <strong>${showing.length}</strong> of <strong>${filtered.length}</strong> residents</p>`;
  h += '<div class="dir-table-wrap"><table class="dir-table"><thead><tr><th>Name</th><th>Flat</th><th>Tower</th><th>Mobile</th><th>Type</th><th>Status</th><th>Source</th><th>Action</th></tr></thead><tbody>';
  showing.forEach(r => {
    const srcBadge = r.source === 'auth' ? '<span class="dir-badge dir-badge-active">Auth</span>' : '<span class="dir-badge" style="background:#e3f2fd;color:#1565c0">Directory</span>';
    const statusBadge = (r.status === 'active' || r.status === 'Active') ? '<span class="dir-badge dir-badge-active">Active</span>' : '<span class="dir-badge dir-badge-inactive">Inactive</span>';
    const typeBadge = r.type ? `<span class="dir-badge ${r.type.includes('Owner') ? 'dir-badge-owner' : r.type.includes('Tenant') ? 'dir-badge-tenant' : 'dir-badge-family'}">${r.type}</span>` : '—';
    h += `<tr><td><strong>${r.name}</strong></td><td>${r.flat}</td><td>${r.tower ? '<span class="dir-tower-tag">' + r.tower + '</span>' : ''}</td><td style="font-size:0.8rem">${r.mobile || '—'}</td><td>${typeBadge}</td><td>${statusBadge}</td><td>${srcBadge}</td><td><button class="btn btn-sm" style="background:#1565c0;color:#fff;font-size:0.72rem" onclick="editManagedResident('${r.id}')">Edit</button></td></tr>`;
  });
  h += '</tbody></table></div>';
  if (filtered.length > 50) h += `<p style="text-align:center;margin-top:10px;color:#666;font-size:0.82rem">Refine your search to see more results (${filtered.length - 50} hidden)</p>`;
  area.innerHTML = h;
}

function showAddResidentForm() {
  const area = document.getElementById('addResidentFormArea');
  if (area.style.display !== 'none') { area.style.display = 'none'; return; }
  area.style.display = 'block';
  area.innerHTML = `<div class="mgr-form-card"><h4 style="color:#1565c0;margin-bottom:12px">&#10133; Add New Resident</h4><div class="grid-2"><div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="addResName" placeholder="e.g. Sh. Rajesh Kumar"></div><div class="form-group"><label>Flat Number *</label><input type="text" class="form-control" id="addResFlat" placeholder="e.g. STC-504, STD-701"></div></div><div class="grid-2"><div class="form-group"><label>Tower *</label><select class="form-control" id="addResTower"><option value="">Select Tower</option><option>STA1</option><option>STA2</option><option>STB1</option><option>STB2</option><option>STC1</option><option>STC2</option><option>STD1</option><option>STD2</option></select></div><div class="form-group"><label>Mobile</label><input type="tel" class="form-control" id="addResMobile" placeholder="e.g. 9876543210"></div></div><div class="grid-2"><div class="form-group"><label>Email</label><input type="email" class="form-control" id="addResEmail" placeholder="resident@email.com"></div><div class="form-group"><label>Resident Type</label><select class="form-control" id="addResType"><option value="Owner">Owner</option><option value="Tenant">Tenant</option><option value="Owner Family">Owner Family</option><option value="Tenant Family">Tenant Family</option></select></div></div><div class="grid-2"><div class="form-group"><label>Occupancy</label><select class="form-control" id="addResOccupancy"><option value="Residing">Residing</option><option value="Let out to one tenant">Let out to one tenant</option><option value="Let out to multiple tenants">Let out to multiple tenants</option><option value="Vacant">Vacant</option></select></div><div class="form-group"><label>Status</label><select class="form-control" id="addResStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div></div><div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-success" onclick="saveNewResident()">Save Resident</button><button class="btn btn-secondary" onclick="document.getElementById('addResidentFormArea').style.display='none'">Cancel</button></div><div class="auth-error" id="addResErr" style="margin-top:10px"></div><div class="auth-success" id="addResSuc" style="margin-top:10px"></div></div>`;
}

async function saveNewResident() {
  const name = document.getElementById('addResName').value.trim(); const flat = document.getElementById('addResFlat').value.trim().toUpperCase();
  const tower = document.getElementById('addResTower').value; const mobile = document.getElementById('addResMobile').value.trim();
  const email = document.getElementById('addResEmail').value.trim().toLowerCase(); const type = document.getElementById('addResType').value;
  const occupancy = document.getElementById('addResOccupancy').value; const status = document.getElementById('addResStatus').value;
  const err = document.getElementById('addResErr'); const suc = document.getElementById('addResSuc');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!name || !flat) { err.textContent = 'Name and Flat Number are required.'; err.style.display = 'block'; return; }
  if (!tower) { err.textContent = 'Please select a tower.'; err.style.display = 'block'; return; }
  const newEntry = {n: name, f: tower + ' ' + flat.replace(tower + '-', '').replace(tower, ''), t: tower, fn: flat.replace(tower + '-', '').replace(tower, '').trim(), tp: type, oc: occupancy, st: status, mb: mobile};
  if (!window._residentData) window._residentData = [];
  window._residentData.push(newEntry);
  const dirBackup = JSON.parse(localStorage.getItem('st_resident_directory') || '[]'); dirBackup.push(newEntry); localStorage.setItem('st_resident_directory', JSON.stringify(dirBackup));
  if (email) { suc.innerHTML = 'Resident <strong>' + name + '</strong> added to directory.'; }
  else { suc.innerHTML = 'Resident <strong>' + name + '</strong> added to directory successfully.'; }
  suc.style.display = 'block';
  document.getElementById('addResName').value = ''; document.getElementById('addResFlat').value = ''; document.getElementById('addResMobile').value = ''; document.getElementById('addResEmail').value = '';
  loadManageResidents();
}

function editManagedResident(id) {
  const r = _allManagedResidents.find(x => x.id === id); if (!r) return;
  const area = document.getElementById('editResidentFormArea'); area.style.display = 'block'; area.scrollIntoView({behavior: 'smooth', block: 'start'});
  area.innerHTML = `<div class="mgr-form-card" style="border-color:#e65100"><h4 style="color:#e65100;margin-bottom:12px">&#9998; Edit Resident: ${r.name}</h4><div class="grid-2"><div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="editResName" value="${r.name || ''}"></div><div class="form-group"><label>Flat *</label><input type="text" class="form-control" id="editResFlat" value="${r.flat || r.flatNo || ''}"></div></div><div class="grid-2"><div class="form-group"><label>Tower</label><select class="form-control" id="editResTower"><option value="">Select</option>${['STA1','STA2','STB1','STB2','STC1','STC2','STD1','STD2'].map(t => '<option' + (t === r.tower ? ' selected' : '') + '>' + t + '</option>').join('')}</select></div><div class="form-group"><label>Mobile</label><input type="tel" class="form-control" id="editResMobile" value="${r.mobile || ''}"></div></div><div class="grid-2"><div class="form-group"><label>Email</label><input type="email" class="form-control" id="editResEmail" value="${r.email || ''}" ${r.source === 'auth' ? 'readonly style="background:#f5f5f5"' : ''}></div><div class="form-group"><label>Type</label><select class="form-control" id="editResType">${['Owner','Tenant','Owner Family','Tenant Family','Co-Owner','Multi Tenant'].map(t => '<option' + (t === r.type ? ' selected' : '') + '>' + t + '</option>').join('')}</select></div></div><div class="grid-2"><div class="form-group"><label>Occupancy</label><select class="form-control" id="editResOcc">${['Residing','Let out to one tenant','Let out to multiple tenants','Vacant'].map(o => '<option' + (o === (r.occupancy || 'Residing') ? ' selected' : '') + '>' + o + '</option>').join('')}</select></div><div class="form-group"><label>Status</label><select class="form-control" id="editResStatus"><option ${(r.status === 'active' || r.status === 'Active') ? 'selected' : ''}>Active</option><option ${(r.status === 'inactive' || r.status === 'Inactive') ? 'selected' : ''}>Inactive</option></select></div></div><div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-success" onclick="saveManagedResident('${id}','${r.source}')">Save Changes</button><button class="btn btn-secondary" onclick="document.getElementById('editResidentFormArea').style.display='none'">Cancel</button></div><div class="auth-error" id="editResErr" style="margin-top:10px"></div><div class="auth-success" id="editResSuc" style="margin-top:10px"></div></div>`;
}

async function saveManagedResident(id, source) {
  const name = document.getElementById('editResName').value.trim(); const flat = document.getElementById('editResFlat').value.trim();
  const tower = document.getElementById('editResTower').value; const mobile = document.getElementById('editResMobile').value.trim();
  const email = document.getElementById('editResEmail').value.trim(); const type = document.getElementById('editResType').value;
  const occupancy = document.getElementById('editResOcc').value; const status = document.getElementById('editResStatus').value;
  const err = document.getElementById('editResErr'); const suc = document.getElementById('editResSuc');
  err.style.display = 'none'; suc.style.display = 'none';
  if (!name || !flat) { err.textContent = 'Name and Flat are required.'; err.style.display = 'block'; return; }
  if (source === 'auth') {
    try { const result = await SunData.updateProfileAdmin(id, {display_name: name, flat_no: flat, mobile: mobile, status: status.toLowerCase()}); if (result.error) { err.textContent = 'Error: ' + result.error.message; err.style.display = 'block'; return; } suc.textContent = 'Profile updated in Supabase successfully!'; suc.style.display = 'block'; } catch(e) { err.textContent = 'Error: ' + e.message; err.style.display = 'block'; return; }
  } else {
    const dirIdx = parseInt(id.replace('dir_', '')); if (window._residentData && window._residentData[dirIdx]) { window._residentData[dirIdx] = {n: name, f: tower + ' ' + (flat.replace(tower + '-', '').replace(tower, '').trim() || flat), t: tower, fn: flat.replace(tower + '-', '').replace(tower, '').trim() || flat, tp: type, oc: occupancy, st: status, mb: mobile}; }
    const edits = JSON.parse(localStorage.getItem('st_resident_edits') || '{}'); edits[id] = {n: name, f: tower + ' ' + (flat.replace(tower + '-', '').replace(tower, '').trim() || flat), t: tower, fn: flat.replace(tower + '-', '').replace(tower, '').trim() || flat, tp: type, oc: occupancy, st: status, mb: mobile}; localStorage.setItem('st_resident_edits', JSON.stringify(edits));
    suc.textContent = 'Resident updated in directory!'; suc.style.display = 'block';
  }
  setTimeout(() => { document.getElementById('editResidentFormArea').style.display = 'none'; loadManageResidents(); }, 1000);
}

// ===== PROJECT TRACKER =====
const COMM_NAMES = {A:'Security',B:'Housekeeping',C:'Fire Safety',D:'Facilities',E:'Revenue',F:'Infrastructure',G:'Legal'};
const COMM_COLORS = {A:'#b71c1c',B:'#4a148c',C:'#1a237e',D:'#01579b',E:'#004d40',F:'#e65100',G:'#37474f'};
const STATUS_COLORS = {'Planned':'#1565c0','In Progress':'#e65100','Tender':'#b71c1c','On Hold':'#616161','Completed':'#2e7d32'};
const COMM_ICONS = {A:'&#128737;',B:'&#128700;',C:'&#128293;',D:'&#127968;',E:'&#128176;',F:'&#128679;',G:'&#9878;'};
const COMM_SOP = {A:'CCTV, patrolling, Park Plus, welfare checks',B:'Cleaning, lifts, plants, shaft maintenance',C:'FAD panels, sprinklers, smoke detectors, AMC',D:'Library, medical, play areas, club house',E:'Dues, parking, advertising, ERP, rentals',F:'All 18 projects, tenders, renovations',G:'RWA compliance, UP Apartment Act, legal notices, disputes'};
let projCommFilter = 'All';

function getCurrentBOMMemberName() { if (!currentUser) return null; const m = members.find(x => x.email && x.email.toLowerCase() === currentUser.email.toLowerCase()); return m ? m.name : null; }
function getMemberCommittees(name) { const cm = loadCommitteeMembers(); const r = []; Object.keys(cm).forEach(c => { const d = cm[c]; if (d.bomMembers) { if (d.bomMembers.some(b => b.name === name)) r.push(c); } else { if (d.convenor === name || d.bomMember === name) r.push(c); } }); return r; }
function canEditProject(p) { if (SunAuth.isAdmin()) return true; if (SunAuth.canEditCommittee && SunAuth.canEditCommittee(p.committee)) return true; const cm = loadCommitteeMembers(); if (!Object.keys(cm).length) return true; const name = getCurrentBOMMemberName(); if (!name) return false; return getMemberCommittees(name).includes(p.committee); }

function buildProjDash() { loadProjects(); buildProjStatsBar(); buildProjFilterBar(); buildProjCreateForm(); buildProjCards(); runAIMonitor(); }

function buildProjStatsBar() { const a = document.getElementById('projStatsBar'); if (!a) return; const total = projects.length; const inProg = projects.filter(p => p.status === 'In Progress').length; const completed = projects.filter(p => p.status === 'Completed').length; const totalExp = projects.reduce((s, p) => { ensureProjectFields(p); return s + p.expenses.reduce((es, e) => es + (parseFloat(e.amount) || 0), 0); }, 0); a.innerHTML = `<div class="proj-stats-bar"><div class="proj-stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total Projects</div></div><div class="proj-stat-card" style="border-top-color:#e65100"><div class="stat-value" style="color:#e65100">${inProg}</div><div class="stat-label">In Progress</div></div><div class="proj-stat-card" style="border-top-color:#2e7d32"><div class="stat-value" style="color:#2e7d32">${completed}</div><div class="stat-label">Completed</div></div><div class="proj-stat-card" style="border-top-color:#004d40"><div class="stat-value" style="color:#004d40">&#8377;${totalExp.toLocaleString('en-IN')}</div><div class="stat-label">Total Expenses</div></div></div>`; }

function buildProjFilterBar() { const a = document.getElementById('projFilterBar'); if (!a) return; let h = '<div class="proj-filter-bar">'; const allActive = projCommFilter === 'All'; h += `<button class="proj-filter-btn" style="${allActive ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : ''}" onclick="filterProjects('All')">All</button>`; Object.keys(COMM_NAMES).forEach(c => { const active = projCommFilter === c; const col = COMM_COLORS[c] || '#666'; h += `<button class="proj-filter-btn" style="${active ? 'background:' + col + ';color:#fff;border-color:' + col : 'border-color:' + col + ';color:' + col}" onclick="filterProjects('${c}')">${COMM_ICONS[c] || ''} ${COMM_NAMES[c]}</button>`; }); h += '</div>'; a.innerHTML = h; }

function filterProjects(comm) { projCommFilter = comm; buildProjFilterBar(); buildProjCards(); }

function buildProjCreateForm() { const a = document.getElementById('projCreateArea'); if (!a) return; if (!currentUser) { a.innerHTML = ''; return; } a.innerHTML = `<div class="card" style="border-left:4px solid #2e7d32;margin-bottom:20px"><h3 style="color:#2e7d32;cursor:pointer;margin:0" onclick="document.getElementById('newProjForm').style.display=document.getElementById('newProjForm').style.display==='none'?'block':'none'">+ Create New Project <span style="font-size:0.8rem;color:#999">(click to expand)</span></h3><div id="newProjForm" style="display:none;margin-top:12px"><div class="grid-2"><div class="form-group"><label>Project Name *</label><input type="text" class="form-control" id="np_name" placeholder="e.g. Basement Waterproofing"></div><div class="form-group"><label>Committee *</label><select class="form-control" id="np_comm">${Object.keys(COMM_NAMES).map(c => `<option value="${c}">${c} - ${COMM_NAMES[c]}</option>`).join('')}</select></div></div><div class="grid-2"><div class="form-group"><label>Timeline</label><input type="text" class="form-control" id="np_timeline" placeholder="e.g. Mar-Apr 2026"></div><div class="form-group"><label>Budget (Rs.)</label><input type="text" class="form-control" id="np_budget" placeholder="e.g. 50000"></div></div><div class="form-group"><label>Description</label><textarea class="form-control" id="np_desc" rows="2" placeholder="Brief project description"></textarea></div><button class="btn btn-success" onclick="createNewProject()">Create Project</button></div></div>`; }

function buildProjCards() { const a = document.getElementById('projDashArea'); if (!a) return; let filtered = projects; if (projCommFilter !== 'All') filtered = projects.filter(p => p.committee === projCommFilter); if (!filtered.length) { a.innerHTML = `<div style="text-align:center;padding:40px;color:#999"><p style="font-size:1.2rem">No projects found${projCommFilter !== 'All' ? ' for ' + COMM_NAMES[projCommFilter] : ''}</p></div>`; return; } let h = '<div class="grid-2">'; filtered.forEach(p => { ensureProjectFields(p); const sc = STATUS_COLORS[p.status] || '#666'; const cc = COMM_COLORS[p.committee] || '#666'; const canEdit = canEditProject(p); const lastUpd = p.updates && p.updates.length ? p.updates[p.updates.length - 1].date : 'Never'; const expTotal = p.expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0); const progColor = p.progress >= 70 ? '#2e7d32' : p.progress >= 40 ? '#e65100' : '#b71c1c'; h += `<div class="proj-summary-card" style="border-left-color:${cc}"><div class="proj-card-header"><div><h4 class="proj-card-title" style="color:${cc}">${p.name}</h4><div class="proj-card-committee" style="color:${cc}">${COMM_ICONS[p.committee] || ''} Committee ${p.committee} &mdash; ${COMM_NAMES[p.committee] || ''}</div></div><span class="badge" style="background:${sc};font-size:0.72rem;white-space:nowrap">${p.status}</span></div><div class="proj-card-progress"><div class="proj-card-progress-bar"><div class="proj-card-progress-fill" style="width:${p.progress}%;background:linear-gradient(90deg,${cc},${progColor})"></div><div class="proj-card-progress-text" style="color:${p.progress > 45 ? '#fff' : '#333'}">${p.progress}%</div></div></div><div class="proj-card-meta"><span>&#128197; <strong>${p.timeline || 'TBD'}</strong></span><span>&#128176; <strong>${p.budget || 'TBD'}</strong></span><span>&#128200; Rs.${expTotal.toLocaleString('en-IN')}</span><span>&#128221; ${lastUpd}</span></div><div class="proj-card-actions"><button class="proj-action-btn proj-action-btn-committee" onclick="openCommitteeModal('${p.committee}')">${COMM_ICONS[p.committee] || ''} Committee</button><button class="proj-action-btn proj-action-btn-status" onclick="openProjectDetail('${p.id}')">&#128202; Status &amp; Details</button>${canEdit ? `<button class="proj-action-btn proj-action-btn-edit" onclick="openEditModal('${p.id}')">&#9998; Edit</button>` : `<span class="proj-action-btn proj-action-btn-view">&#128274; View Only</span>`}</div></div>`; }); h += '</div>'; a.innerHTML = h; }

function openProjectDetail(id) { loadProjects(); const p = projects.find(x => x.id === id); if (!p) return; ensureProjectFields(p); const sc = STATUS_COLORS[p.status] || '#666'; const cc = COMM_COLORS[p.committee] || '#666'; let updH = ''; if (p.updates && p.updates.length) { p.updates.slice().reverse().forEach(u => { updH += `<div style="border-left:3px solid ${cc};padding:8px 12px;margin:8px 0;background:#f5f5f5;border-radius:0 8px 8px 0"><div style="font-size:0.75rem;color:#999">${u.date} | ${u.by || 'Committee'}</div><div style="margin-top:4px">${u.text}</div></div>`; }); } else updH = '<p style="color:#999">No updates yet.</p>'; let mtgH = ''; if (p.meetings && p.meetings.length) { p.meetings.slice().reverse().forEach(m => { mtgH += `<div style="border-left:3px solid #1a237e;padding:8px 12px;margin:8px 0;background:#e8eaf6;border-radius:0 8px 8px 0"><div style="font-size:0.75rem;color:#999">${m.date}</div><div style="font-weight:600">${m.attendees || ''}</div><div style="margin-top:4px">${m.summary || ''}</div></div>`; }); } else mtgH = '<p style="color:#999">No meetings logged.</p>'; let docH = ''; if (p.documents && p.documents.length) { p.documents.forEach(d => { docH += `<div style="display:flex;align-items:center;gap:8px;padding:6px;margin:4px 0;background:#f5f5f5;border-radius:6px">&#128196; <a href="${d.url || '#'}" target="_blank" style="color:${cc};font-weight:600">${d.name}</a><span style="font-size:0.75rem;color:#999">${d.date || ''}</span></div>`; }); } else docH = '<p style="color:#999">No documents uploaded.</p>'; const expTotal = p.expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0); let expH = ''; if (p.expenses.length) { expH += `<table style="font-size:0.8rem;width:100%;margin:8px 0"><tr><th>Date</th><th>Description</th><th>Amount</th><th>BOM</th><th>GBM</th></tr>`; p.expenses.forEach(e => { expH += `<tr><td>${e.date || ''}</td><td>${e.description}</td><td>Rs.${(parseFloat(e.amount) || 0).toLocaleString('en-IN')}</td><td>${e.bomApproved ? '<span style="color:#2e7d32">Yes</span>' : '<span style="color:#999">No</span>'}</td><td>${e.gbmApproved ? '<span style="color:#2e7d32">Yes</span>' : '<span style="color:#999">No</span>'}</td></tr>`; }); expH += '</table>'; } else expH = '<p style="color:#999">No expenses recorded.</p>'; document.getElementById('mTitle').textContent = p.name; document.getElementById('mBody').innerHTML = `<div style="padding:15px"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px"><span class="badge" style="background:${sc};font-size:0.85rem">${p.status}</span><span class="badge" style="background:${cc};font-size:0.85rem">Committee ${p.committee} - ${COMM_NAMES[p.committee]}</span><span style="color:#666;font-size:0.85rem">Timeline: ${p.timeline}</span><span style="color:#666;font-size:0.85rem">Budget: ${p.budget || 'TBD'}</span></div><div style="margin-bottom:15px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong>Progress</strong><span>${p.progress}%</span></div><div style="background:#e0e0e0;border-radius:10px;height:24px"><div style="background:linear-gradient(90deg,${cc},${sc});height:100%;border-radius:10px;width:${p.progress}%;transition:0.3s"></div></div></div><p style="color:#666;margin-bottom:20px">${p.description || ''}</p><h4 style="color:${cc};border-bottom:2px solid ${cc};padding-bottom:5px;margin-bottom:10px">&#128221; Updates</h4>${updH}<h4 style="color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:5px;margin:20px 0 10px">&#128197; Meeting History</h4>${mtgH}<h4 style="color:#004d40;border-bottom:2px solid #004d40;padding-bottom:5px;margin:20px 0 10px">&#128196; Documents</h4>${docH}<h4 style="color:#004d40;border-bottom:2px solid #004d40;padding-bottom:5px;margin:20px 0 10px">&#128176; Expenses (Total: Rs. ${expTotal.toLocaleString('en-IN')})</h4>${expH}</div>`; document.getElementById('noticeModal').classList.remove('hidden'); }

function openCommitteeModal(commCode) { const cm = loadCommitteeMembers(); const cmMembers = cm[commCode] || {}; const cc = COMM_COLORS[commCode] || '#666'; const cn = COMM_NAMES[commCode] || commCode; const sop = COMM_SOP[commCode] || ''; const commProjects = projects.filter(p => p.committee === commCode); let memH = '<div class="comm-detail-members">'; [{key:'convenor',label:'BOM Convenor',bg:'#1a237e',fg:'#fff'},{key:'bomMember',label:'BOM Member',bg:'#004d40',fg:'#fff'}].forEach(r => { const name = cmMembers[r.key] || 'Not Assigned'; memH += `<div class="comm-detail-member"><span class="comm-detail-role" style="background:${r.bg};color:${r.fg}">${r.label}</span><strong>${name}</strong></div>`; }); if (cmMembers.residents) { cmMembers.residents.forEach((res, i) => { if (res) memH += `<div class="comm-detail-member"><span class="comm-detail-role" style="background:#e8eaf6;color:#1a237e">Resident ${i+1}</span>${res}</div>`; }); } memH += '</div>'; let projH = ''; if (commProjects.length) { projH = '<h4 style="margin:10px 0 8px;color:' + cc + '">Projects (' + commProjects.length + ')</h4>'; commProjects.forEach(p => { const sc = STATUS_COLORS[p.status] || '#666'; projH += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin:4px 0;background:#f5f5f5;border-radius:8px;border-left:3px solid ${sc};cursor:pointer" onclick="openProjectDetail('${p.id}');"><div><strong style="font-size:0.85rem">${p.name}</strong><div style="font-size:0.75rem;color:#999">${p.timeline || 'TBD'} | Progress: ${p.progress}%</div></div><span class="badge" style="background:${sc};font-size:0.7rem">${p.status}</span></div>`; }); } else { projH = '<p style="color:#999;font-size:0.85rem;margin-top:12px">No projects assigned to this committee.</p>'; } document.getElementById('mTitle').innerHTML = `Committee ${commCode} &mdash; ${cn}`; document.getElementById('mBody').innerHTML = `<div style="padding:15px"><div class="comm-detail-header"><div class="comm-detail-icon" style="background:${cc}">${COMM_ICONS[commCode] || commCode}</div><div><h3 style="margin:0;color:${cc}">${cn}</h3><p style="margin:4px 0 0;font-size:0.85rem;color:#666">${sop}</p></div></div><h4 style="margin:0 0 10px;color:#333">&#128101; Members</h4>${memH}${projH}</div>`; document.getElementById('noticeModal').classList.remove('hidden'); }

function openEditModal(projId) { loadProjects(); const p = projects.find(x => x.id === projId); if (!p) return; ensureProjectFields(p); const cc = COMM_COLORS[p.committee] || '#666'; document.getElementById('mTitle').innerHTML = `&#9998; Edit: ${p.name}`; document.getElementById('mBody').innerHTML = `<div style="padding:15px"><div class="grid-2" style="margin-bottom:15px"><div class="form-group"><label style="font-weight:700">Status</label><select class="form-control" id="ps_${p.id}"><option ${p.status==='Planned'?'selected':''}>Planned</option><option ${p.status==='In Progress'?'selected':''}>In Progress</option><option ${p.status==='Tender'?'selected':''}>Tender</option><option ${p.status==='On Hold'?'selected':''}>On Hold</option><option ${p.status==='Completed'?'selected':''}>Completed</option></select></div><div class="form-group"><label style="font-weight:700">Progress: <span id="pv_${p.id}">${p.progress}</span>%</label><input type="range" min="0" max="100" value="${p.progress}" id="pp_${p.id}" style="width:100%" oninput="document.getElementById('pv_${p.id}').textContent=this.value"></div></div><div class="form-group"><label style="font-weight:700">Add Update</label><textarea class="form-control" id="pu_${p.id}" rows="3" placeholder="Enter project update..."></textarea></div><button class="btn btn-primary" onclick="saveProjUpdate('${p.id}');closeModal();buildProjDash()">&#128190; Save Update</button></div>`; document.getElementById('noticeModal').classList.remove('hidden'); }

function createNewProject() { const name = document.getElementById('np_name').value.trim(); const comm = document.getElementById('np_comm').value; if (!name) { alert('Enter project name'); return; } const p = {id: 'P' + (projects.length + 1) + '_' + Date.now(), name: name, committee: comm, status: 'Planned', timeline: document.getElementById('np_timeline').value.trim() || 'TBD', budget: document.getElementById('np_budget').value.trim() || 'TBD', progress: 0, description: document.getElementById('np_desc').value.trim(), updates: [], documents: [], meetings: [], expenses: [], closureReport: null}; projects.push(p); saveProjects(); buildProjDash(); alert('Project "' + name + '" created under Committee ' + comm + '!'); }

function addExpense(id) { const p = projects.find(x => x.id === id); if (!p) return; const amt = document.getElementById('ex_amt_' + id).value; const desc = document.getElementById('ex_desc_' + id).value.trim(); const dt = document.getElementById('ex_date_' + id).value; if (!amt || !desc) { alert('Enter amount and description'); return; } ensureProjectFields(p); p.expenses.push({id: 'EXP_' + Date.now(), amount: parseFloat(amt), description: desc, date: dt || new Date().toISOString().split('T')[0], addedBy: currentUser ? currentUser.email : 'BOM', bomApproved: false, gbmApproved: false}); saveProjects(); buildProjDash(); alert('Expense added!'); }
function approveExpense(projId, expId, type) { const p = projects.find(x => x.id === projId); if (!p || !isAdmin) return; const e = p.expenses.find(x => x.id === expId); if (!e) return; if (type === 'bom') e.bomApproved = true; if (type === 'gbm') e.gbmApproved = true; saveProjects(); buildProjDash(); }

function saveProjUpdate(id) { const p = projects.find(x => x.id === id); if (!p) return; const status = document.getElementById('ps_' + id).value; const progress = parseInt(document.getElementById('pp_' + id).value); const text = document.getElementById('pu_' + id).value.trim(); p.status = status; p.progress = progress; if (text) { if (!p.updates) p.updates = []; p.updates.push({text: text, date: new Date().toLocaleDateString(), by: currentUser ? currentUser.email : 'BOM'}); } saveProjects(); }

function saveProjMeeting(id) { const p = projects.find(x => x.id === id); if (!p) return; const dt = document.getElementById('pmd_' + id).value; const att = document.getElementById('pma_' + id).value.trim(); const sum = document.getElementById('pms_' + id).value.trim(); if (!dt) { alert('Select meeting date'); return; } if (!p.meetings) p.meetings = []; p.meetings.push({date: dt, attendees: att, summary: sum}); saveProjects(); buildProjDash(); alert('Meeting logged!'); }

function saveProjDoc(id) { const p = projects.find(x => x.id === id); if (!p) return; const fl = document.getElementById('pf_' + id).files[0]; const nm = document.getElementById('pfn_' + id).value.trim() || 'Document'; if (!fl) { alert('Select a file'); return; } if (!p.documents) p.documents = []; const r = new FileReader(); r.onload = e => { p.documents.push({name: nm, url: e.target.result, date: new Date().toLocaleDateString(), type: fl.type}); saveProjects(); buildProjDash(); alert('Document uploaded!'); }; r.readAsDataURL(fl); }

// AI Monitor
function runAIMonitor() { loadProjects(); const insights = []; const escalations = []; const now = Date.now(); const DAY = 86400000; projects.forEach(p => { const lastUpd = p.updates && p.updates.length ? new Date(p.updates[p.updates.length - 1].date).getTime() : 0; const daysSinceUpd = lastUpd ? Math.floor((now - lastUpd) / DAY) : 999; const cn = COMM_NAMES[p.committee] || p.committee; if (p.status === 'Completed') return; if (daysSinceUpd >= 14) { escalations.push({project: p.name, committee: cn, commId: p.committee, type: 'No Updates', msg: `No updates for ${daysSinceUpd} days`, severity: 'red'}); insights.push(`🔴 <strong>${p.name}</strong> (${cn}): No update for ${daysSinceUpd} days — ESCALATED`); } else if (daysSinceUpd >= 7) { insights.push(`🟡 <strong>${p.name}</strong> (${cn}): Last update ${daysSinceUpd} days ago — needs attention`); } else if (lastUpd) { insights.push(`🟢 <strong>${p.name}</strong> (${cn}): Updated ${daysSinceUpd} day(s) ago — on track`); } else { escalations.push({project: p.name, committee: cn, commId: p.committee, type: 'Never Updated', msg: 'Project has never been updated', severity: 'red'}); insights.push(`🔴 <strong>${p.name}</strong> (${cn}): Never updated — ESCALATED`); } }); const area = document.getElementById('aiInsightsArea'); if (!area) return; const totalP = projects.filter(x => x.status !== 'Completed').length; const greenC = insights.filter(x => x.startsWith('🟢')).length; const score = totalP ? Math.round((greenC / totalP) * 100) : 0; const scoreColor = score >= 70 ? '#2e7d32' : score >= 40 ? '#e65100' : '#b71c1c'; area.innerHTML = `<div class="card" style="border-left:4px solid #1a237e;margin-top:20px"><h3 style="color:#1a237e">🤖 AI Project Monitor</h3><div class="grid-3" style="margin:15px 0"><div style="text-align:center;padding:15px;background:#e8f5e9;border-radius:10px"><div style="font-size:2rem;font-weight:700;color:${scoreColor}">${score}%</div><div style="font-size:0.8rem;color:#666">Health Score</div></div><div style="text-align:center;padding:15px;background:#fff3e0;border-radius:10px"><div style="font-size:2rem;font-weight:700;color:#e65100">${escalations.length}</div><div style="font-size:0.8rem;color:#666">Escalations</div></div><div style="text-align:center;padding:15px;background:#e3f2fd;border-radius:10px"><div style="font-size:2rem;font-weight:700;color:#1565c0">${totalP}</div><div style="font-size:0.8rem;color:#666">Active Projects</div></div></div><h4 style="margin:15px 0 10px">AI Insights</h4><div style="max-height:300px;overflow-y:auto">${insights.map(ins => `<div style="padding:6px 10px;margin:4px 0;background:#fafafa;border-radius:6px;font-size:0.85rem">${ins}</div>`).join('')}</div></div>`; if (escalations.length > 0) createEscalationNotices(escalations); }

function createEscalationNotices(escalations) { const existing = JSON.parse(localStorage.getItem('st_notices') || '[]'); const today = new Date().toISOString().split('T')[0]; const todayEsc = existing.filter(n => n.category === 'Escalation' && n.date === today); if (todayEsc.length >= escalations.length) return; escalations.forEach(e => { const dup = existing.find(n => n.category === 'Escalation' && n.date === today && n.title.includes(e.project)); if (dup) return; existing.unshift({title: '⚠ AI Alert: Committee ' + e.commId + ' (' + e.committee + ') - ' + e.type, summary: e.project + ': ' + e.msg + '. Immediate attention required by BOM.', category: 'Escalation', date: today, fileUrl: '', fileType: '', auto: true}); }); localStorage.setItem('st_notices', JSON.stringify(existing)); supaSync('st_notices'); updateEscBadge(); }

function updateEscBadge() { const n = JSON.parse(localStorage.getItem('st_notices') || '[]'); const esc = n.filter(x => x.category === 'Escalation'); const badge = document.getElementById('escalationBadge'); if (badge) { if (esc.length > 0) { badge.textContent = esc.length; badge.style.display = 'inline'; } else { badge.style.display = 'none'; } } }

// ===== KPI DASHBOARD =====
let _kpiCharts = {};
async function loadKPIDashboard() {
  try {
    const kpi = await SunData.getDashboardKPIs();
    document.getElementById('kpiFundBalance').textContent = '₹' + formatNum(kpi.fundBalance || 0);
    document.getElementById('kpiMonthlyCollection').textContent = '₹' + formatNum(kpi.monthlyCollection || 0);
    document.getElementById('kpiMonthlyExpenses').textContent = '₹' + formatNum(kpi.monthlyExpenses || 0);
    document.getElementById('kpiOverdueDues').textContent = kpi.overduePayments || 0;
    const overdueAmt = kpi.overdueTotalAmount || 0;
    document.getElementById('kpiOverdueAmount').textContent = overdueAmt > 0 ? '₹' + formatNum(overdueAmt) : '';
    document.getElementById('kpiActiveProjects').textContent = kpi.activeProjects || 0;
    document.getElementById('kpiOpenComplaints').textContent = kpi.openComplaints || 0;
    const critical = kpi.criticalComplaints || 0;
    const critEl = document.getElementById('kpiCriticalComplaints'); critEl.textContent = critical > 0 ? critical + ' Critical' : '';
    document.getElementById('kpiPendingApprovals').textContent = kpi.pendingApprovals || 0;
    document.getElementById('kpiUpcomingEvents').textContent = (kpi.upcomingEvents || []).length;
    renderExpenseTrendChart(kpi);
    renderCommitteeProgressChart(kpi.committeeProgress || {});
    loadKPIActionItems(kpi);
  } catch(e) { console.error('KPI load error:', e); }
}

function renderExpenseTrendChart(kpi) {
  if (_kpiCharts.expense) { _kpiCharts.expense.destroy(); }
  const ctx = document.getElementById('chartExpenseTrend'); if (!ctx) return;
  SunData.getFinancialSummary(6).then(data => {
    const months = data.reverse().map(d => { const dt = new Date(d.month); return dt.toLocaleString('en-IN', {month: 'short', year: '2-digit'}); });
    const collections = data.map(d => Number(d.total_collection) || 0); const expenses = data.map(d => Number(d.total_expenses) || 0);
    if (months.length === 0) { months.push('No data'); collections.push(0); expenses.push(0); }
    _kpiCharts.expense = new Chart(ctx, {type: 'line', data: { labels: months, datasets: [ {label: 'Collection', data: collections, borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.4}, {label: 'Expenses', data: expenses, borderColor: '#c62828', backgroundColor: 'rgba(198,40,40,0.1)', fill: true, tension: 0.4} ] }, options: {responsive: true, plugins: {legend: {position: 'top'}}, scales: {y: {beginAtZero: true, ticks: {callback: v => '₹' + formatNum(v)}}}}});
  });
}

function renderCommitteeProgressChart(cp) {
  if (_kpiCharts.committee) { _kpiCharts.committee.destroy(); }
  const ctx = document.getElementById('chartCommitteeProgress'); if (!ctx) return;
  const labels = ['A: Security','B: Housekeeping','C: Fire','D: Facilities','E: Revenue','F: Infra','G: Legal'];
  const progressData = labels.map((_, i) => { const c = ['A','B','C','D','E','F','G'][i]; return cp[c] ? cp[c].avgProgress : 0; });
  const colors = ['#1a237e','#2e7d32','#c62828','#e65100','#4a148c','#00695c','#0d47a1'];
  _kpiCharts.committee = new Chart(ctx, {type: 'bar', data: { labels: labels, datasets: [{label: 'Avg Progress %', data: progressData, backgroundColor: colors, borderRadius: 6}] }, options: {indexAxis: 'y', responsive: true, plugins: {legend: {display: false}}, scales: {x: {beginAtZero: true, max: 100, ticks: {callback: v => v + '%'}}}}});
}

async function loadKPIActionItems(kpi) {
  try { const complaints = await SunData.getComplaints({}); const recent = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').slice(0, 5); const el = document.getElementById('kpiRecentComplaints'); if (recent.length === 0) { el.innerHTML = '<div class="kpi-empty">No open complaints</div>'; } else { el.innerHTML = recent.map(c => `<div class="kpi-action-item" onclick="showSection('complaints_mgmt')"><span class="kpi-ai-label">${esc(c.subject)}</span><span class="kpi-ai-badge" style="background:${c.priority === 'Critical' ? '#fce4ec;color:#b71c1c' : c.priority === 'High' ? '#fff3e0;color:#e65100' : '#e8eaf6;color:#1a237e'}">${c.priority}</span></div>`).join(''); } } catch(e) {}
  try { const events = (kpi.upcomingEvents || []).slice(0, 5); const el = document.getElementById('kpiUpcomingDeadlines'); if (events.length === 0) { el.innerHTML = '<div class="kpi-empty">No upcoming events</div>'; } else { el.innerHTML = events.map(e => `<div class="kpi-action-item"><span class="kpi-ai-label">${esc(e.title)}</span><span class="kpi-ai-badge" style="background:#e8f5e9;color:#2e7d32">${new Date(e.event_date).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}</span></div>`).join(''); } } catch(e) {}
}

async function refreshAIInsights() {
  document.getElementById('kpiAiInsights').style.display = 'block';
  document.getElementById('kpiAiContent').innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div> Generating AI insights...</div>';
  try {
    const resp = await fetch(SUPABASE_URL + '/functions/v1/ai-analyze', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY}, body: JSON.stringify({type: 'financial_trend', data: await SunData.getFinancialSummary(6), cache_key: 'financial_trend_latest'}) });
    if (!resp.ok) throw new Error('AI unavailable');
    const result = await resp.json();
    let html = '<p><strong>' + esc(result.summary || 'Analysis complete') + '</strong></p>';
    if (result.recommendations) { html += '<ul>' + result.recommendations.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>'; }
    document.getElementById('kpiAiContent').innerHTML = html;
  } catch(e) { document.getElementById('kpiAiContent').innerHTML = '<p style="color:var(--text-light)">AI insights unavailable. Configure ANTHROPIC_API_KEY in Edge Function secrets.</p>'; }
}

// ===== COMPLAINTS MANAGEMENT =====
let _allComplaints = [];
async function loadComplaintsManagement() { _allComplaints = await SunData.getComplaints({}); renderComplaintStats(); renderComplaintsList('All'); }
function renderComplaintStats() { const open = _allComplaints.filter(c => c.status === 'Open').length; const inProg = _allComplaints.filter(c => c.status === 'In Progress' || c.status === 'Acknowledged').length; const resolved = _allComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length; const critical = _allComplaints.filter(c => c.priority === 'Critical' && c.status !== 'Resolved' && c.status !== 'Closed').length; document.getElementById('cmtOpen').textContent = open; document.getElementById('cmtInProgress').textContent = inProg; document.getElementById('cmtResolved').textContent = resolved; document.getElementById('cmtCritical').textContent = critical; }
function filterComplaints(status, btn) { document.querySelectorAll('#bs_complaints_mgmt .proj-filter-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); renderComplaintsList(status); }
function renderComplaintsList(filter) { const list = filter === 'All' ? _allComplaints : _allComplaints.filter(c => c.status === filter); const el = document.getElementById('complaintsList'); if (list.length === 0) { el.innerHTML = '<div class="kpi-empty">No complaints found</div>'; return; } el.innerHTML = list.map(c => `<div class="complaint-card" data-priority="${c.priority}"><div class="complaint-card-header"><div><div class="complaint-card-title">${esc(c.subject)}</div><div class="complaint-card-meta">${esc(c.resident_name)} | ${esc(c.flat_no)} | ${esc(c.category)} | ${new Date(c.created_at).toLocaleDateString('en-IN')}</div></div><div><span class="badge" style="background:${statusColor(c.status)}">${c.status}</span> <span class="badge" style="background:${priorityColor(c.priority)}">${c.priority}</span></div></div>${c.description ? '<p style="font-size:0.85rem;color:#555;margin-bottom:8px">' + esc(c.description) + '</p>' : ''}<div class="complaint-card-actions">${c.status === 'Open' ? '<button class="btn btn-sm btn-primary" onclick="updateComplaintStatus(\'' + c.id + '\',\'Acknowledged\')">Acknowledge</button>' : ''}${c.status !== 'Resolved' && c.status !== 'Closed' ? '<button class="btn btn-sm btn-success" onclick="updateComplaintStatus(\'' + c.id + '\',\'Resolved\')">Resolve</button>' : ''}${c.status !== 'Escalated' && c.status !== 'Resolved' ? '<button class="btn btn-sm btn-danger" onclick="updateComplaintStatus(\'' + c.id + '\',\'Escalated\')">Escalate</button>' : ''}</div></div>`).join(''); }
function statusColor(s) { return {'Open':'#0277bd','Acknowledged':'#1565c0','In Progress':'#e65100','Resolved':'#2e7d32','Closed':'#666','Escalated':'#b71c1c'}[s] || '#999'; }
function priorityColor(p) { return {'Critical':'#b71c1c','High':'#e65100','Medium':'#f57f17','Low':'#2e7d32'}[p] || '#999'; }
async function updateComplaintStatus(id, status) { const res = await SunData.updateComplaint(id, {status}); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } showToast('Complaint ' + status, 'success'); loadComplaintsManagement(); }

// ===== FINANCIALS =====
let _finCharts = {};
async function loadFinancials() { const data = await SunData.getFinancialSummary(12); renderFinancialCharts(data); renderFinancialTable(data); }
function renderFinancialCharts(data) { if (_finCharts.overview) { _finCharts.overview.destroy(); } if (_finCharts.breakdown) { _finCharts.breakdown.destroy(); } const sorted = data.slice().reverse(); const months = sorted.map(d => { const dt = new Date(d.month); return dt.toLocaleString('en-IN', {month: 'short', year: '2-digit'}); }); const collections = sorted.map(d => Number(d.total_collection) || 0); const expenses = sorted.map(d => Number(d.total_expenses) || 0); const ctx1 = document.getElementById('chartFinancialOverview'); if (ctx1 && months.length > 0) { _finCharts.overview = new Chart(ctx1, {type: 'bar', data: { labels: months, datasets: [ {label: 'Income', data: collections, backgroundColor: 'rgba(46,125,50,0.7)', borderRadius: 4}, {label: 'Expenses', data: expenses, backgroundColor: 'rgba(198,40,40,0.7)', borderRadius: 4} ] }, options: {responsive: true, plugins: {legend: {position: 'top'}}, scales: {y: {beginAtZero: true, ticks: {callback: v => '₹' + formatNum(v)}}}}}); } const latest = data[0]; const ctx2 = document.getElementById('chartExpenseBreakdown'); if (ctx2 && latest && latest.category_breakup) { const cats = Object.keys(latest.category_breakup); const vals = Object.values(latest.category_breakup).map(Number); const pieColors = ['#1a237e','#2e7d32','#c62828','#e65100','#4a148c','#00695c','#0d47a1','#880e4f','#33691e','#01579b']; _finCharts.breakdown = new Chart(ctx2, {type: 'doughnut', data: { labels: cats, datasets: [{data: vals, backgroundColor: pieColors.slice(0, cats.length)}] }, options: {responsive: true, plugins: {legend: {position: 'right', labels: {font: {size: 11}}}}}}); } }
function renderFinancialTable(data) { const el = document.getElementById('financialTable'); if (!data || data.length === 0) { el.innerHTML = '<div class="kpi-empty">No financial data yet.</div>'; return; } el.innerHTML = '<div class="card"><h3>Financial History</h3><div style="overflow-x:auto"><table><tr><th>Month</th><th>Collection</th><th>Expenses</th><th>Fund Balance</th><th>Maint Due</th><th>Maint Collected</th><th>Notes</th></tr>' + data.map(d => `<tr><td>${new Date(d.month).toLocaleString('en-IN', {month: 'short', year: 'numeric'})}</td><td>₹${formatNum(d.total_collection)}</td><td>₹${formatNum(d.total_expenses)}</td><td style="font-weight:700;color:var(--primary)">₹${formatNum(d.fund_balance)}</td><td>₹${formatNum(d.maintenance_due)}</td><td>₹${formatNum(d.maintenance_collected)}</td><td>${esc(d.notes || '')}</td></tr>`).join('') + '</table></div></div>'; }
async function saveFinancialEntry() { const month = document.getElementById('finMonth').value; if (!month) { showToast('Select a month', 'error'); return; } const entry = { month: month + '-01', fund_balance: Number(document.getElementById('finBalance').value) || 0, total_collection: Number(document.getElementById('finCollection').value) || 0, total_expenses: Number(document.getElementById('finExpenses').value) || 0, maintenance_due: Number(document.getElementById('finMaintDue').value) || 0, maintenance_collected: Number(document.getElementById('finMaintCollected').value) || 0, notes: document.getElementById('finNotes').value }; const res = await SunData.upsertFinancialSummary(entry); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } var s = document.getElementById('finSuccess'); s.textContent = 'Financial entry saved!'; s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 3000); loadFinancials(); }

// ===== MEETINGS =====
async function loadMeetings() { const filter = document.getElementById('meetingTypeFilter'); const type = filter ? filter.value : ''; const data = await SunData.getMeetingMinutes(type ? {meeting_type: type} : {}); const el = document.getElementById('meetingsList'); if (!data || data.length === 0) { el.innerHTML = '<div class="kpi-empty">No meeting minutes recorded yet.</div>'; return; } el.innerHTML = data.map(m => `<div class="meeting-card" onclick="viewMeeting('${m.id}')"><span class="meeting-card-type meeting-type-${m.meeting_type.toLowerCase()}">${m.meeting_type}</span><h4 style="margin-bottom:4px">${esc(m.title)}</h4><div style="font-size:0.82rem;color:var(--text-light)">${new Date(m.meeting_date).toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})}</div>${m.ai_summary ? '<div style="margin-top:8px;font-size:0.82rem;color:#333;background:#f5f5f5;padding:10px;border-radius:8px"><strong>AI Summary:</strong> ' + esc(m.ai_summary.substring(0, 200)) + '...</div>' : ''}${m.decisions && m.decisions.length > 0 ? '<div style="margin-top:6px;font-size:0.78rem;color:var(--text-light)">' + m.decisions.length + ' decisions recorded</div>' : ''}</div>`).join(''); }
function showMeetingForm() { document.getElementById('meetingForm').style.display = 'block'; document.getElementById('mtgDate').value = new Date().toISOString().split('T')[0]; }
async function saveMeetingMinutes() { const title = document.getElementById('mtgTitle').value; if (!title) { showToast('Enter meeting title', 'error'); return; } const decisions = document.getElementById('mtgDecisions').value.split('\n').filter(d => d.trim()).map(d => ({decision: d.trim()})); const res = await SunData.createMeetingMinutes({ meeting_type: document.getElementById('mtgType').value, meeting_date: document.getElementById('mtgDate').value, title: title, agenda: document.getElementById('mtgAgenda').value, minutes_text: document.getElementById('mtgMinutes').value, decisions: decisions }); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } var s = document.getElementById('mtgSuccess'); s.textContent = 'Meeting minutes saved!'; s.style.display = 'block'; document.getElementById('meetingForm').style.display = 'none'; loadMeetings(); }
function viewMeeting(id) { SunData.getMeetingMinutes({}).then(all => { const m = all.find(x => x.id === id); if (!m) return; document.getElementById('mTitle').textContent = m.title; let html = '<div class="meeting-card-type meeting-type-' + m.meeting_type.toLowerCase() + '">' + m.meeting_type + '</div>'; html += '<p style="margin:10px 0;color:var(--text-light)">' + new Date(m.meeting_date).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) + '</p>'; if (m.ai_summary) html += '<div style="background:#e8eaf6;padding:14px;border-radius:10px;margin:12px 0"><strong style="color:var(--primary)">AI Summary</strong><p style="margin-top:6px">' + esc(m.ai_summary) + '</p></div>'; if (m.agenda) html += '<h4 style="margin-top:16px;color:var(--primary)">Agenda</h4><p>' + esc(m.agenda).replace(/\n/g, '<br>') + '</p>'; if (m.minutes_text) html += '<h4 style="margin-top:16px;color:var(--primary)">Minutes</h4><p>' + esc(m.minutes_text).replace(/\n/g, '<br>') + '</p>'; if (m.decisions && m.decisions.length > 0) { html += '<h4 style="margin-top:16px;color:var(--primary)">Decisions</h4><ul>'; m.decisions.forEach(d => { html += '<li>' + esc(d.decision || d) + (d.assignee ? ' → <strong>' + esc(d.assignee) + '</strong>' : '') + '</li>'; }); html += '</ul>'; } document.getElementById('mBody').innerHTML = html; document.getElementById('noticeModal').classList.remove('hidden'); }); }

// ===== EVENTS MANAGEMENT =====
async function loadEventsManage() { const el = document.getElementById('eventsManageList'); if (!el) return; try { const events = await SunData.getEvents({}); if (!events || events.length === 0) { el.innerHTML = '<div class="kpi-empty">No events created yet</div>'; return; } el.innerHTML = events.map(e => { const d = new Date(e.event_date); const isPast = d < new Date(); const typeColors = {Meeting: '#1565c0', Festival: '#e91e63', Maintenance: '#e65100', Sports: '#2e7d32', Cultural: '#4527a0', Other: '#666'}; const color = typeColors[e.event_type] || '#666'; return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${color};${isPast ? 'opacity:0.6' : ''}"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px"><div style="flex:1"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="badge" style="background:${color}">${e.event_type || 'Event'}</span>${isPast ? '<span class="badge" style="background:#999">Past</span>' : ''}</div><h3 style="margin:0 0 4px;font-size:1.05rem">${esc(e.title)}</h3><div style="font-size:0.85rem;color:var(--text-light)">&#128197; ${d.toLocaleString('en-IN', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}${e.venue ? ' &bull; &#128205; ' + esc(e.venue) : ''}</div>${e.description ? '<p style="margin-top:8px;font-size:0.88rem;color:#444">' + esc(e.description) + '</p>' : ''}</div></div></div>`; }).join(''); } catch(e) { el.innerHTML = '<div class="kpi-empty">Error loading events</div>'; } }
async function saveEvent() { const title = document.getElementById('evtTitle').value.trim(); const evtDate = document.getElementById('evtDate').value; if (!title || !evtDate) { showToast('Title and date are required', 'error'); return; } const data = { title, event_type: document.getElementById('evtType').value, event_date: new Date(evtDate).toISOString(), end_date: document.getElementById('evtEndDate').value ? new Date(document.getElementById('evtEndDate').value).toISOString() : null, venue: document.getElementById('evtVenue').value, organizer: document.getElementById('evtOrganizer').value, description: document.getElementById('evtDescription').value }; const res = await SunData.createEvent(data); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } var s = document.getElementById('evtSuccess'); s.textContent = 'Event created!'; s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 3000); document.getElementById('eventForm').style.display = 'none'; loadEventsManage(); }

// ===== POLLS MANAGEMENT =====
async function loadPollsManage() { const el = document.getElementById('pollsManageList'); if (!el) return; try { const polls = await SunData.getPolls(); if (!polls || polls.length === 0) { el.innerHTML = '<div class="kpi-empty">No polls created yet</div>'; return; } el.innerHTML = polls.map(p => { const totalVotes = Object.values(p.votes || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0); const isActive = p.status === 'active'; return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${isActive ? '#1565c0' : '#999'}"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px"><div style="flex:1"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span class="badge" style="background:${isActive ? '#1565c0' : '#999'}">${isActive ? 'Active' : 'Closed'}</span><span style="font-size:0.82rem;color:var(--text-light)">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</span></div><h3 style="margin:0 0 10px;font-size:1rem">${esc(p.question)}</h3>${(p.options || []).map((opt, i) => { const votes = (p.votes || {})[String(i)] || []; const pct = totalVotes > 0 ? Math.round(votes.length / totalVotes * 100) : 0; return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:0.88rem"><span style="flex:1">${esc(opt)}</span><div style="width:100px;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#1565c0;border-radius:4px"></div></div><span style="min-width:40px;text-align:right;font-weight:600;color:#1565c0">${pct}%</span></div>`; }).join('')}</div>${isActive ? '<button class="btn btn-sm btn-danger" onclick="closePollAction(\'' + p.id + '\')">Close Poll</button>' : ''}</div><div style="font-size:0.75rem;color:#999;margin-top:8px">Created: ${new Date(p.created_at).toLocaleDateString('en-IN')}</div></div>`; }).join(''); } catch(e) { el.innerHTML = '<div class="kpi-empty">Error loading polls</div>'; } }
async function savePoll() { const question = document.getElementById('pollQuestion').value.trim(); const optionsText = document.getElementById('pollOptions').value.trim(); if (!question) { showToast('Enter a question', 'error'); return; } const options = optionsText.split('\n').map(o => o.trim()).filter(o => o); if (options.length < 2) { showToast('Add at least 2 options', 'error'); return; } const expiry = document.getElementById('pollExpiry').value; const data = {question, options, expires_at: expiry ? new Date(expiry).toISOString() : null}; const res = await SunData.createPoll(data); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } var s = document.getElementById('pollSuccess'); s.textContent = 'Poll created!'; s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 3000); document.getElementById('pollForm').style.display = 'none'; loadPollsManage(); }
async function closePollAction(pollId) { if (!confirm('Close this poll? No more votes will be accepted.')) return; const res = await SunData.closePoll(pollId); if (res.error) { showToast('Error closing poll', 'error'); return; } showToast('Poll closed', 'success'); loadPollsManage(); }

// ===== RESOLUTIONS =====
async function loadResolutionsList() { const el = document.getElementById('resolutionsList'); if (!el) return; try { const statusFilter = document.getElementById('resStatusFilter')?.value || ''; const params = statusFilter ? {status: statusFilter} : {}; const data = await SunData.getResolutions(params); if (!data || data.length === 0) { el.innerHTML = '<div class="kpi-empty">No resolutions recorded yet</div>'; return; } const statusColors = {Passed: '#2e7d32', Rejected: '#c62828', Deferred: '#f57c00', Implemented: '#1565c0'}; el.innerHTML = '<div class="card"><div style="overflow-x:auto"><table><tr><th>Res #</th><th>Title</th><th>Proposed By</th><th>Votes</th><th>Status</th><th>Date</th></tr>' + data.map(r => { const color = statusColors[r.status] || '#666'; return `<tr><td><strong>${esc(r.resolution_no || '—')}</strong></td><td>${esc(r.title)}</td><td>${esc(r.proposed_by || '—')}</td><td style="white-space:nowrap"><span style="color:#2e7d32;font-weight:600">${r.votes_for || 0}</span> / <span style="color:#c62828;font-weight:600">${r.votes_against || 0}</span></td><td><span class="badge" style="background:${color}">${r.status}</span></td><td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td></tr>`; }).join('') + '</table></div></div>'; } catch(e) { el.innerHTML = '<div class="kpi-empty">Error loading resolutions</div>'; } }
async function saveResolution() { const title = document.getElementById('resTitle').value.trim(); if (!title) { showToast('Enter a title', 'error'); return; } const data = { resolution_no: document.getElementById('resNo').value.trim() || null, title, description: document.getElementById('resDesc').value, proposed_by: document.getElementById('resProposed').value, seconded_by: document.getElementById('resSeconded').value, votes_for: Number(document.getElementById('resVotesFor').value) || 0, votes_against: Number(document.getElementById('resVotesAgainst').value) || 0, status: document.getElementById('resStatus').value, implementation_date: document.getElementById('resImplDate').value || null }; const res = await SunData.createResolution(data); if (res.error) { showToast('Error: ' + res.error.message, 'error'); return; } var s = document.getElementById('resSuccess'); s.textContent = 'Resolution saved!'; s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 3000); document.getElementById('resolutionForm').style.display = 'none'; loadResolutionsList(); }

// ===== DOCUMENTS =====
async function loadDocuments() { const el = document.getElementById('documentsList'); if (!el) return; try { const catFilter = document.getElementById('docCategoryFilter')?.value || ''; const searchQuery = document.getElementById('docSearch')?.value?.toLowerCase() || ''; let docs = notices.filter(n => n.fileUrl); if (catFilter) docs = docs.filter(d => d.category === catFilter); if (searchQuery) docs = docs.filter(d => (d.title || '').toLowerCase().includes(searchQuery) || (d.summary || '').toLowerCase().includes(searchQuery)); if (docs.length === 0) { el.innerHTML = '<div class="kpi-empty" style="grid-column:1/-1">No documents found</div>'; return; } el.innerHTML = docs.map((d, i) => { const catColors = {'General':'#1a237e','Maintenance':'#e65100','Security':'#b71c1c','Meeting':'#1565c0','Financial':'#2e7d32','Event':'#4527a0'}; const color = catColors[d.category] || '#666'; const isPdf = d.fileType === 'pdf' || d.fileUrl.includes('.pdf'); return `<div class="card" style="cursor:pointer;border-top:3px solid ${color};margin:0" onclick="openN(${notices.indexOf(d)})"><div style="font-size:2rem;margin-bottom:8px">${isPdf ? '📄' : '🖼️'}</div><h4 style="font-size:0.92rem;margin-bottom:4px">${esc(d.title || 'Document')}</h4><div style="font-size:0.78rem;color:var(--text-light);margin-bottom:8px">${esc(d.summary || '').substring(0, 80)}${(d.summary || '').length > 80 ? '...' : ''}</div><div style="display:flex;gap:6px;align-items:center"><span class="badge" style="background:${color};font-size:0.65rem">${esc(d.category || 'General')}</span><span style="font-size:0.72rem;color:#999">${esc(d.date || '')}</span></div></div>`; }).join(''); } catch(e) { el.innerHTML = '<div class="kpi-empty" style="grid-column:1/-1">Error loading documents</div>'; } }
async function saveDocument() { const title = document.getElementById('docTitle').value.trim(); const url = document.getElementById('docUrl').value.trim(); if (!title || !url) { showToast('Title and URL are required', 'error'); return; } const data = { title, category: document.getElementById('docCategory').value, summary: document.getElementById('docDesc').value, fileUrl: url, fileType: url.toLowerCase().includes('.pdf') ? 'pdf' : 'image', date: new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) }; notices.unshift(data); if (typeof SunData !== 'undefined' && SunData.addNotice) { await SunData.addNotice(data); } else { const stored = JSON.parse(localStorage.getItem('st_notices') || '[]'); stored.unshift(data); localStorage.setItem('st_notices', JSON.stringify(stored)); } var s = document.getElementById('docSuccess'); s.textContent = 'Document uploaded!'; s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 3000); document.getElementById('docUploadForm').style.display = 'none'; loadDocuments(); }

// ===== NOTICES =====
function uploadNotice() { const t = document.getElementById('nTitle').value.trim(), s = document.getElementById('nSummary').value.trim(), c = document.getElementById('nCat').value, d = document.getElementById('nDate').value, fl = document.getElementById('nFile').files[0], suc = document.getElementById('nSuc'); if (!t) { alert('Enter title'); return; } const n = {title: t, summary: s, category: c, date: d || new Date().toISOString().split('T')[0], fileUrl: '', fileType: ''}; if (fl) { const r = new FileReader(); r.onload = e => { n.fileUrl = e.target.result; n.fileType = fl.type.includes('pdf') ? 'pdf' : 'image'; const ex = JSON.parse(localStorage.getItem('st_notices') || '[]'); ex.unshift(n); localStorage.setItem('st_notices', JSON.stringify(ex)); supaSync('st_notices'); suc.textContent = 'Saved!'; suc.style.display = 'block'; document.getElementById('nTitle').value = ''; }; r.readAsDataURL(fl); } else { const ex = JSON.parse(localStorage.getItem('st_notices') || '[]'); ex.unshift(n); localStorage.setItem('st_notices', JSON.stringify(ex)); supaSync('st_notices'); suc.textContent = 'Saved!'; suc.style.display = 'block'; document.getElementById('nTitle').value = ''; } }

function loadNotices() { if (db) { db.collection('notices').orderBy('date', 'desc').get().then(s => { notices = s.docs.map(d => ({id: d.id, ...d.data()})); renderN(notices); }).catch(() => renderLocalN()); } else renderLocalN(); }
function renderLocalN() { notices = JSON.parse(localStorage.getItem('st_notices') || '[]'); renderN(notices); }
function renderN(l) { const g = document.getElementById('noticeGrid'); if (!g) return; const filtered = l; if (!filtered.length) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light)"><div style="font-size:3rem;margin-bottom:10px">&#128196;</div><p>No notices yet.</p></div>'; return; } const cc = {General: '#1a237e', Financial: '#004d40', Maintenance: '#e65100', Event: '#4a148c', Emergency: '#b71c1c', Meeting: '#01579b', Escalation: '#b71c1c'}; g.innerHTML = filtered.map((n, i) => { const oi = l.indexOf(n); return `<div class="notice-card" onclick="openN(${oi})" style="border-top-color:${cc[n.category] || '#1a237e'}"><div class="notice-body"><div class="notice-date">${n.date || ''}</div><div class="notice-title">${n.title || 'Notice'}</div><div class="notice-summary">${n.summary || ''}</div><div class="notice-cat"><span class="badge" style="background:${cc[n.category] || '#1a237e'};font-size:0.7rem">${n.category || 'General'}</span></div></div></div>`; }).join(''); }
function filterN(c, el) { document.querySelectorAll('.notice-filter-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); if (c === 'All') renderN(notices); else renderN(notices.filter(n => n.category === c)); }
function openN(i) { const n = notices[i]; if (!n) return; document.getElementById('mTitle').textContent = n.title || 'Notice'; const b = document.getElementById('mBody'); if (n.fileUrl) { if (n.fileType === 'pdf' || n.fileUrl.includes('.pdf')) b.innerHTML = `<iframe src="${n.fileUrl}" style="width:100%;min-height:600px;border:none"></iframe>`; else b.innerHTML = `<img src="${n.fileUrl}" style="max-width:100%">`; } else b.innerHTML = `<div style="padding:20px"><p><strong>Date:</strong> ${n.date || ''}</p><p><strong>Category:</strong> ${n.category || ''}</p><p style="margin-top:15px">${n.summary || ''}</p></div>`; document.getElementById('noticeModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('noticeModal').classList.add('hidden'); }

// ===== HELPERS =====
function esc(s) { return s ? s.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
function formatNum(n) { if (!n) return '0'; return Number(n).toLocaleString('en-IN'); }

function showToast(msg, type) {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = 'toast toast-' + (type || 'info'); t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ===== REALTIME SUBSCRIPTIONS =====
function initRealtime() {
  SunData.subscribeToTable('notices', payload => { if (payload.eventType === 'INSERT') { showToast('New Notice: ' + (payload.new.title || ''), 'info'); } });
  SunData.subscribeToTable('complaints', payload => { if (payload.eventType === 'UPDATE') { showToast('Complaint update: ' + payload.new.status, 'info'); } });
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => { console.log('[BOM] SW registered:', reg.scope); }).catch(err => { console.log('[BOM] SW registration failed:', err); });
  });
}

// ===== INIT =====
loadMemLS();
loadProjects(); updateEscBadge();
supaHydrate().then(function() { loadMemLS(); updateEscBadge(); loadProjects(); }).catch(function() {});

// If not logged in, show auth overlay
setTimeout(function() {
  if (!SunAuth.isLoggedIn()) {
    showAuth();
  }
}, 500);

// Start realtime when auth ready
if (SunAuth.isLoggedIn()) { initRealtime(); }

console.log('[BOM] Sun Tower BOM Dashboard initialized');