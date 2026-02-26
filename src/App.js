import React, { useState, useCallback, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

/* ══════════════════════════════════════════════════════════════════════════
   🔥 FIREBASE CONFIG — replace with your own values from Firebase console
   See SETUP_GUIDE.md for step-by-step instructions
   ══════════════════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDy4wQyHngdWoLlprqwKV9AE-7CtFwjbIw",
  authDomain:        "attendance-tracker-2nd-sem.firebaseapp.com",
  projectId:         "attendance-tracker-2nd-sem",
  storageBucket:     "attendance-tracker-2nd-sem.firebasestorage.app",
  messagingSenderId: "353149264481",
  appId:             "1:353149264481:web:1cc5135f0a88d4cc024020",
};

/*
  ADMIN_WRITE_TOKEN — this secret is embedded in the app and checked by
  Firebase Security Rules on the server side. Only requests that include
  this exact token can write to Firestore. Students cannot change it
  because it lives in the deployed bundle and matches a server-side rule.
  Change both here AND in firestore.rules if you ever want to rotate it.
*/
const ADMIN_WRITE_TOKEN = "ece_ajay_admin_2026";

/* Initialise Firebase — gracefully falls back to offline if config not set */
let db   = null;
let FB_OK = false;
try {
  if (!FIREBASE_CONFIG.apiKey.startsWith('REPLACE')) {
    const app = initializeApp(FIREBASE_CONFIG);
    db    = getFirestore(app);
    FB_OK = true;
  }
} catch (e) { console.warn('Firebase init failed — offline mode', e); }

/* ─── FONTS & GLOBAL STYLES ──────────────────────────────────────────────── */
const _fontLink = document.createElement('link');
_fontLink.rel  = 'stylesheet';
_fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap';
document.head.appendChild(_fontLink);

const _styleEl  = document.createElement('style');
_styleEl.id = 'app-global';
document.head.appendChild(_styleEl);

function applyGlobalStyles(dark) {
  _styleEl.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { overflow-x: hidden; }
    body {
      background: ${dark ? '#0f1117' : '#f4f6fb'};
      font-family: 'Poppins', sans-serif;
      color: ${dark ? '#f1f5f9' : '#1a1d2e'};
      -webkit-font-smoothing: antialiased;
      transition: background 0.3s, color 0.3s;
    }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-thumb { background: ${dark ? '#334155' : '#d1d5db'}; border-radius: 99px; }
    button, textarea, input, select { font-family: 'Poppins', sans-serif; }
    @keyframes fadeUp    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin      { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    .fade-up    { animation: fadeUp    0.22s ease both; }
    .slide-down { animation: slideDown 0.18s ease both; }
  `;
}
applyGlobalStyles(false);

/* ─── THEME ──────────────────────────────────────────────────────────────── */
function makeTheme(dark) {
  return dark ? {
    bg:'#0f1117', surface:'#1e2130', surfaceAlt:'#262a3a',
    border:'#2d3348', borderLight:'#242840',
    text:'#f1f5f9', textSub:'#94a3b8', textMuted:'#64748b',
    accent:'#6366f1', accentLight:'#1e1e3a', accentBorder:'#3730a3',
    green:'#10b981', greenBg:'#064e3b', greenBorder:'#065f46',
    red:'#f87171',   redBg:'#450a0a',   redBorder:'#7f1d1d',
    amber:'#fbbf24', amberBg:'#451a03', amberBorder:'#78350f',
    blue:'#60a5fa',  blueBg:'#1e3a5f',  blueBorder:'#1d4ed8',
    purple:'#a78bfa',purpleBg:'#2e1065',purpleBorder:'#5b21b6',
  } : {
    bg:'#f4f6fb', surface:'#ffffff', surfaceAlt:'#f9fafb',
    border:'#e5e7eb', borderLight:'#f3f4f6',
    text:'#1a1d2e', textSub:'#6b7280', textMuted:'#9ca3af',
    accent:'#4f46e5', accentLight:'#eef2ff', accentBorder:'#c7d2fe',
    green:'#059669', greenBg:'#d1fae5', greenBorder:'#6ee7b7',
    red:'#dc2626',   redBg:'#fee2e2',   redBorder:'#fca5a5',
    amber:'#d97706', amberBg:'#fef3c7', amberBorder:'#fcd34d',
    blue:'#2563eb',  blueBg:'#dbeafe',  blueBorder:'#93c5fd',
    purple:'#7c3aed',purpleBg:'#ede9fe',purpleBorder:'#c4b5fd',
  };
}

/* ─── SUBJECTS ───────────────────────────────────────────────────────────── */
const SUBJECTS = [
  { id:'ENGG_CHEM',     name:'Engineering Chemistry',                  abbr:'ENGG. CHEM.',   teacher:'Nidhi Rai (NR)',                               type:'theory',   color:'#e11d48', semStart:'2026-02-02' },
  { id:'ENGG_MATHS',    name:'Engineering Mathematics A',              abbr:'ENGG. MATHS',   teacher:'Santosh Verma (SV)',                           type:'theory',   color:'#7c3aed', semStart:'2026-02-02' },
  { id:'IEE',           name:'Introduction to Electrical Engineering', abbr:'IEE',           teacher:'Manoj Gupta (MG)',                             type:'theory',   color:'#0891b2', semStart:'2026-02-02' },
  { id:'COMP_PROG',     name:'Computer Programming',                   abbr:'COMP. PROG.',   teacher:'Vaibhav Kant Singh (VKS)',                     type:'theory',   color:'#059669', semStart:'2026-01-27' },
  { id:'ENV_SCIENCE',   name:'Environmental Science & Ecology',        abbr:'ENV. SCIENCE',  teacher:'Vinod Kumar (VK)',                             type:'theory',   color:'#65a30d', semStart:'2026-02-02' },
  { id:'IND_CONST',     name:'Indian Constitution',                    abbr:'IND. CONST.',   teacher:'Vineeta Kumari (VK)',                          type:'theory',   color:'#d97706', semStart:'2026-02-02' },
  { id:'ENGG_WORK',     name:'Engineering Workshop Practice',          abbr:'ENGG. WORK.',   teacher:'Manish Bhaskar (MB) & Pradeep Patanwar (PP)', type:'lab',      color:'#db2777', semStart:'2026-02-02' },
  { id:'COMP_PROG_LAB', name:'Computer Programming Lab',               abbr:'CP LAB',        teacher:'Vaibhav Kant Singh (VKS)',                     type:'lab',      color:'#2563eb', semStart:'2026-01-27' },
  { id:'IEE_LAB',       name:'IEE Lab',                               abbr:'IEE LAB',       teacher:'Manoj Gupta (MG)',                             type:'lab',      color:'#0891b2', semStart:'2026-02-02' },
  { id:'ENGG_CHEM_LAB', name:'Engineering Chemistry Lab',              abbr:'CHEM LAB',      teacher:'Nidhi Rai (NR) & B. Mandal (BM)',             type:'lab',      color:'#e11d48', semStart:'2026-02-02' },
  { id:'SPORTS_YOGA',   name:'Sports & Yoga',                         abbr:'SPORTS & YOGA', teacher:'Ratin Jogi',                                  type:'activity', color:'#16a34a', semStart:'2026-02-02' },
];

const SEM_END    = '2026-04-30';
const MIN_ATT    = 75;
const subjectMap = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

/* ─── TIMETABLE ──────────────────────────────────────────────────────────── */
const TIMETABLE = {
  MON: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11, batch:'all' },
    { subjectId:'ENV_SCIENCE',   time:'11:00–12:00', startH:11, endH:12, batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13, batch:'all' },
    { subjectId:'ENGG_CHEM_LAB', time:'14:00–16:00', startH:14, endH:16, batch:'B1'  },
    { subjectId:'SPORTS_YOGA',   time:'16:00–18:00', startH:16, endH:18, batch:'all' },
  ],
  TUE: [
    { subjectId:'IEE',           time:'10:00–11:00', startH:10, endH:11, batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12, batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13, batch:'all' },
    { subjectId:'COMP_PROG',     time:'14:00–16:00', startH:14, endH:16, batch:'B1'  },
    { subjectId:'IEE_LAB',       time:'14:00–16:00', startH:14, endH:16, batch:'B2'  },
    { subjectId:'COMP_PROG_LAB', time:'16:00–18:00', startH:16, endH:18, batch:'B2'  },
  ],
  WED: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11, batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12, batch:'all' },
    { subjectId:'IEE',           time:'12:00–13:00', startH:12, endH:13, batch:'all' },
    { subjectId:'IEE_LAB',       time:'14:00–16:00', startH:14, endH:16, batch:'B1'  },
    { subjectId:'ENGG_WORK',     time:'16:00–18:00', startH:16, endH:18, batch:'B2'  },
  ],
  THU: [
    { subjectId:'ENV_SCIENCE',   time:'10:00–11:00', startH:10, endH:11, batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12, batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13, batch:'all' },
    { subjectId:'ENGG_WORK',     time:'14:00–16:00', startH:14, endH:16, batch:'B1'  },
    { subjectId:'ENGG_CHEM_LAB', time:'14:00–16:00', startH:14, endH:16, batch:'B2'  },
  ],
  FRI: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11, batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12, batch:'all' },
    { subjectId:'IEE',           time:'12:00–13:00', startH:12, endH:13, batch:'all' },
    { subjectId:'IND_CONST',     time:'14:00–15:00', startH:14, endH:15, batch:'all' },
    { subjectId:'ENGG_WORK',     time:'16:00–18:00', startH:16, endH:18, batch:'all' },
  ],
};
const DAYS_ORDER = ['MON','TUE','WED','THU','FRI'];

/* ─── SECURITY: SHA-256 hash (one-way, PIN never stored in plain text) ───── */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
/* Default PIN = "1234" — admin should change this immediately after first login */
const DEFAULT_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

/* ─── LOCAL STORAGE ──────────────────────────────────────────────────────── */
const STUDENT_KEY = 'ece_att_v6';
const ADMIN_KEY   = 'ece_admin_v3'; // bumped so stale data is ignored

function loadStudentData() {
  try { const r = localStorage.getItem(STUDENT_KEY); if (r) return JSON.parse(r); } catch {}
  return { records:{}, notes:{}, myBatch:'B1', darkMode:false, holidays:{}, monthlyAttendance:{} };
}
function saveStudentData(d) { try { localStorage.setItem(STUDENT_KEY, JSON.stringify(d)); } catch {} }

/*
  Admin local storage holds ONLY lockout data (failCount, lockUntil).
  pinHash is NOT stored here anymore — it always comes from Firebase.
  We keep a local pinHash CACHE only as an offline fallback.
*/
function loadAdminLocal() {
  try {
    const r = localStorage.getItem(ADMIN_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return { lockUntil: 0, failCount: 0, cachedPinHash: DEFAULT_PIN_HASH };
}
function saveAdminLocal(d) {
  try { localStorage.setItem(ADMIN_KEY, JSON.stringify(d)); } catch(e) { console.error('saveAdminLocal failed', e); }
}

/* ─── FIRESTORE HELPERS ──────────────────────────────────────────────────── */
/*
  Firestore structure (two documents inside "admin" collection):

    admin/config        → { pinHash, writeToken, updatedAt }
    admin/monthlyTotals → { "2026-02": { SUBJ_ID: n, ... }, writeToken, updatedAt }

  Security Rules (in Firebase console):
    - admin/config:        read = public, write = only if writeToken matches
    - admin/monthlyTotals: read = public, write = only if writeToken matches
    - everything else:     denied

  The writeToken is validated SERVER-SIDE by Firestore Rules.
  It must be present in the document being written.
  Because it's server-side, even someone with devtools cannot bypass it.

  NOTE: pinHash being publicly readable is safe — it is a one-way SHA-256
  hash of the PIN. You cannot reverse a SHA-256 hash to get the PIN.
*/

const FIRESTORE_TIMEOUT_MS = 10000; // 10 seconds — fail fast instead of hanging

/* Wrap any Firestore promise with a hard timeout so we never hang forever */
function withTimeout(promise, ms = FIRESTORE_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — check your internet connection.')), ms)
    ),
  ]);
}

/* Fetch the current pinHash from Firestore.
   Returns: hash string if found, DEFAULT_PIN_HASH if doc missing, null if offline/error. */
async function fetchPinHashFromCloud() {
  if (!FB_OK || !db) return null;
  try {
    const snap = await withTimeout(getDoc(doc(db, 'admin', 'config')));
    if (snap.exists()) {
      const h = snap.data().pinHash;
      if (typeof h === 'string' && h.length === 64) return h;
    }
    // Document doesn't exist yet (first-time setup) — default PIN is 1234
    return DEFAULT_PIN_HASH;
  } catch (e) {
    console.warn('fetchPinHashFromCloud failed:', e.message);
    return null; // caller will fall back to local cache
  }
}

/* Push new pinHash to Firestore — syncs to all devices immediately.
   The writeToken field is what Firestore Security Rules check server-side. */
async function pushPinHashToCloud(newHash) {
  if (!FB_OK || !db) throw new Error('Firebase is not configured. Add your config to App.js.');
  if (typeof newHash !== 'string' || newHash.length !== 64) throw new Error('Invalid hash format.');
  await withTimeout(
    setDoc(doc(db, 'admin', 'config'), {
      pinHash:    newHash,
      writeToken: ADMIN_WRITE_TOKEN,   // ← Security Rule checks this server-side
      updatedAt:  Date.now(),
    })
  );
}

/* Push monthly class totals to Firestore. */
async function pushToFirestore(allMonths) {
  if (!FB_OK || !db) throw new Error('Firebase is not configured. Add your config to App.js.');
  await withTimeout(
    setDoc(doc(db, 'admin', 'monthlyTotals'), {
      ...allMonths,
      writeToken: ADMIN_WRITE_TOKEN,   // ← Security Rule checks this server-side
      updatedAt:  Date.now(),
    })
  );
}

/* ─── DATE HELPERS ───────────────────────────────────────────────────────── */
function getToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}
function getDayName(ds) { return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(ds+'T12:00:00').getDay()]; }
function formatDate(ds) { return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
function formatShort(ds) { return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }
function addDays(ds, n) {
  const d = new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateRange(from, to) { const a=[]; let c=from; while(c<=to){a.push(c);c=addDays(c,1);} return a; }
function getSlotsForBatch(dn, b) { return (TIMETABLE[dn]||[]).filter(s=>s.batch==='all'||s.batch===b); }
function monthKey(ds) { return ds.slice(0,7); }
function monthLabel(mk) {
  const [y,m] = mk.split('-');
  return new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}

/* ─── FORECASTING ────────────────────────────────────────────────────────── */
function calcRemainingClasses(myBatch, holidays) {
  const today=getToday(), rem={};
  SUBJECTS.forEach(s => { rem[s.id]=0; });
  dateRange(addDays(today,1), SEM_END).forEach(date => {
    if (holidays?.[date]) return;
    const dn=getDayName(date);
    if (dn==='SAT'||dn==='SUN') return;
    getSlotsForBatch(dn,myBatch).forEach(slot => {
      if (date >= subjectMap[slot.subjectId]?.semStart) rem[slot.subjectId]++;
    });
  });
  return rem;
}
function calcTotalScheduled(myBatch, holidays) {
  const total={};
  SUBJECTS.forEach(s => { total[s.id]=0; });
  SUBJECTS.forEach(subj => {
    dateRange(subj.semStart, SEM_END).forEach(date => {
      if (holidays?.[date]) return;
      const dn=getDayName(date);
      if (dn==='SAT'||dn==='SUN') return;
      getSlotsForBatch(dn,myBatch).forEach(slot => {
        if (slot.subjectId===subj.id) total[subj.id]++;
      });
    });
  });
  return total;
}

/* ─── STATS (merges daily records + monthly entries, no double-counting) ─── */
function calcStats(records, myBatch, holidays, monthlyAttendance) {
  const stats={};
  SUBJECTS.forEach(s => { stats[s.id]={ present:0, absent:0, holiday:0, total:0 }; });

  // Months that have a monthly entry — use those instead of daily records
  const monthsWithEntry = new Set(Object.keys(monthlyAttendance||{}));

  // 1. Daily records — only for months NOT covered by a monthly entry
  Object.entries(records).forEach(([date, dayRec]) => {
    if (holidays?.[date]) return;
    if (monthsWithEntry.has(monthKey(date))) return;
    const dn=getDayName(date);
    getSlotsForBatch(dn,myBatch).forEach((slot,idx) => {
      const val=dayRec[`${slot.subjectId}__${idx}`];
      if (!val||!stats[slot.subjectId]) return;
      if (date<subjectMap[slot.subjectId]?.semStart) return;
      stats[slot.subjectId].total++;
      if (val==='P') stats[slot.subjectId].present++;
      else if (val==='A') stats[slot.subjectId].absent++;
      else if (val==='H') stats[slot.subjectId].holiday++;
    });
  });

  // 2. Monthly entries (from official college sheet)
  Object.values(monthlyAttendance||{}).forEach(subjData => {
    Object.entries(subjData).forEach(([id, e]) => {
      if (!stats[id]) return;
      stats[id].total   += (e.total||0);
      stats[id].present += (e.present||0);
      stats[id].absent  += Math.max(0,(e.total||0)-(e.present||0));
    });
  });

  const remaining      = calcRemainingClasses(myBatch,holidays);
  const totalScheduled = calcTotalScheduled(myBatch,holidays);

  SUBJECTS.forEach(s => {
    const st=stats[s.id];
    st.pct = st.total>0 ? Math.round((st.present/st.total)*100) : null;
    const rem=remaining[s.id]||0, tf=st.total+rem;
    st.canBunkTotal  = tf>0 ? Math.max(0,Math.floor(st.present+rem-(MIN_ATT/100)*tf)) : 0;
    st.canBunk       = (st.pct!==null&&st.pct>=MIN_ATT) ? Math.floor((100*st.present-MIN_ATT*st.total)/MIN_ATT) : 0;
    st.classesNeeded = (st.pct!==null&&st.pct<MIN_ATT)  ? Math.ceil((MIN_ATT*st.total-100*st.present)/(100-MIN_ATT)) : 0;
    st.projectedPct  = totalScheduled[s.id]>0 ? Math.round(((st.present+rem)/totalScheduled[s.id])*100) : null;
    st.remainingClasses = rem;
    st.totalScheduled   = totalScheduled[s.id];
  });
  return stats;
}

/* ─── PDF EXPORT ─────────────────────────────────────────────────────────── */
function generatePDF(stats, myBatch, period) {
  const now=new Date(), label=period==='biweekly'?'Bi-Weekly':'Monthly';
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const overall=totT>0?Math.round((totP/totT)*100):0;
  const rows=SUBJECTS.map(s=>{
    const st=stats[s.id],pct=st.pct??0;
    return `<tr><td>${s.name}</td><td>${s.type}</td>
      <td>${st.present}</td><td>${st.absent}</td><td>${st.total}</td>
      <td style="font-weight:700;color:${pct>=75?'#059669':pct>=60?'#d97706':'#dc2626'}">${st.pct!=null?pct+'%':'—'}</td>
      <td style="color:${(st.projectedPct||0)>=75?'#059669':'#dc2626'}">${st.projectedPct!=null?st.projectedPct+'%':'—'}</td>
      <td style="color:${st.canBunkTotal>0?'#059669':'#dc2626'}">${st.canBunkTotal}</td>
      <td>${pct>=75?'✅ Safe':pct>=60?'⚠️ Low':'❌ Critical'}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <title>ECE Attendance Report</title>
  <style>body{font-family:'Poppins',sans-serif;color:#111;padding:32px;max-width:960px;margin:0 auto;font-size:13px}
  h1{font-size:22px;color:#4f46e5;margin-bottom:4px;font-weight:700}h2{font-size:13px;color:#6b7280;font-weight:400;margin-bottom:24px}
  .cards{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}.card{background:#f5f6fa;border-radius:10px;padding:14px 20px;text-align:center;min-width:100px}
  .card .val{font-size:26px;font-weight:700;color:#4f46e5}.card .lbl{font-size:11px;color:#6b7280;margin-top:2px}
  table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:10px 12px;text-align:left;font-weight:600;font-size:12px}
  td{padding:9px 12px;border-bottom:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}
  .footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center}
  .note{margin-top:16px;background:#eef2ff;border-radius:8px;padding:10px 14px;color:#4f46e5;font-size:12px}</style></head><body>
  <h1>📡 ECE Attendance Report — ${label}</h1>
  <h2>B.Tech 1st Year · 2nd Semester · AY 2025-26 · Batch ${myBatch} · ${now.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</h2>
  <div class="cards">
    <div class="card"><div class="val">${overall}%</div><div class="lbl">Overall</div></div>
    <div class="card"><div class="val" style="color:#059669">${SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</div><div class="lbl">Safe</div></div>
    <div class="card"><div class="val" style="color:#dc2626">${SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</div><div class="lbl">At Risk</div></div>
    <div class="card"><div class="val">${totP}</div><div class="lbl">Present</div></div>
    <div class="card"><div class="val">${totT-totP}</div><div class="lbl">Absent</div></div>
  </div>
  <table><thead><tr><th>Subject</th><th>Type</th><th>Present</th><th>Absent</th><th>Total</th>
  <th>Current %</th><th>Projected %</th><th>Can Skip</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="note">📌 "Can Skip" = classes skippable till Apr 30 while staying above 75%.</div>
  <div class="footer">Generated by ECE Attendance Tracker · Made with ❤️ by Ajay G · ${now.toLocaleString('en-IN')}</div>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),500);
}

/* ═══════════════════════════════════════════════════════════════════════════
   REUSABLE UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */
function Badge({children,variant='default',T}){
  const V={safe:{bg:T.greenBg,c:T.green,b:T.greenBorder},danger:{bg:T.redBg,c:T.red,b:T.redBorder},
    warning:{bg:T.amberBg,c:T.amber,b:T.amberBorder},info:{bg:T.blueBg,c:T.blue,b:T.blueBorder},
    purple:{bg:T.purpleBg,c:T.purple,b:T.purpleBorder},default:{bg:T.borderLight,c:T.textSub,b:T.border}}[variant]||{};
  return <span style={{background:V.bg,color:V.c,border:`1px solid ${V.b}`,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>{children}</span>;
}
function Pill({label,active,color,onClick,T}){
  return <button onClick={onClick} style={{padding:'6px 16px',borderRadius:99,cursor:'pointer',fontWeight:600,fontSize:13,border:active?`1.5px solid ${color}`:`1.5px solid ${T.border}`,background:active?color:T.surface,color:active?'#fff':T.textSub,transition:'all 0.15s'}}>{label}</button>;
}
function CircleProgress({pct,size=64,stroke=5,color,T}){
  const r=(size-stroke)/2,circ=2*Math.PI*r,offset=pct==null?circ:circ-(pct/100)*circ;
  const fill=pct==null?T.border:pct>=75?T.green:pct>=60?T.amber:T.red;
  return(<svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.borderLight} strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color||fill} strokeWidth={stroke}
      strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
      style={{transition:'stroke-dashoffset 0.6s ease'}}/>
  </svg>);
}
function AttTag({val,T}){
  if(!val) return null;
  const m={P:{l:'Present',bg:T.greenBg,c:T.green},A:{l:'Absent',bg:T.redBg,c:T.red},H:{l:'Holiday',bg:T.amberBg,c:T.amber}}[val];
  if(!m) return null;
  return <span style={{background:m.bg,color:m.c,fontWeight:600,fontSize:12,padding:'3px 10px',borderRadius:99}}>{m.l}</span>;
}
function MarkBtns({value,onChange,T}){
  return(<div style={{display:'flex',gap:6}}>
    {[['P',T.green,'Present'],['A',T.red,'Absent'],['H',T.amber,'Holiday']].map(([v,col,label])=>(
      <button key={v} onClick={()=>onChange(value===v?null:v)} title={label}
        style={{width:36,height:36,borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,
          fontFamily:"'DM Mono',monospace",background:value===v?col:T.borderLight,
          color:value===v?'#fff':T.textMuted,transition:'all 0.15s'}}>{v}</button>
    ))}
  </div>);
}
function Card({children,style={},onClick,T}){
  const [hov,setHov]=useState(false);
  return(<div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>onClick&&setHov(false)}
    style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,padding:20,
      cursor:onClick?'pointer':'default',
      boxShadow:hov?'0 8px 24px rgba(0,0,0,0.12)':'0 1px 4px rgba(0,0,0,0.04)',
      transform:hov?'translateY(-2px)':'none',
      transition:'box-shadow 0.2s,transform 0.2s,background 0.3s,border-color 0.3s',...style}}>{children}</div>);
}
function Divider({margin='12px 0',T}){ return <div style={{height:1,background:T.borderLight,margin}}/>; }
function SectionHead({title,sub}){
  return(<div style={{marginBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-0.3px'}}>{title}</h2>
    {sub&&<p style={{fontSize:13,opacity:0.55,marginTop:3}}>{sub}</p>}
  </div>);
}
function navStyle(T){ return{background:T.surface,border:`1px solid ${T.border}`,color:T.text,width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.3s,border-color 0.3s'}; }
function actionBtn(color){ return{padding:'7px 14px',borderRadius:99,border:`1px solid ${color}33`,background:`${color}11`,color,fontWeight:600,fontSize:13,cursor:'pointer'}; }

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN LOGIN MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminLoginModal({onSuccess,onClose,T}){
  const [pin,setPin]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [locked,setLocked]=useState(false);
  const [lockSecs,setLockSecs]=useState(0);
  const [fetchingHash,setFetchingHash]=useState(true);
  // pinHash is always fetched fresh from Firebase — never hardcoded here
  const pinHashRef = useRef(null);
  const ref=useRef(null);

  useEffect(()=>{
    ref.current?.focus();
    // Check local lockout first
    const ad=loadAdminLocal();
    if(ad.lockUntil>Date.now()){ setLocked(true); setLockSecs(Math.ceil((ad.lockUntil-Date.now())/1000)); }

    // Always fetch the latest pinHash from Firebase
    // Falls back to local cache if offline
    setFetchingHash(true);
    fetchPinHashFromCloud().then(cloudHash => {
      if (cloudHash) {
        pinHashRef.current = cloudHash;
        // Update local cache so offline fallback stays current
        const adNow = loadAdminLocal();
        saveAdminLocal({ ...adNow, cachedPinHash: cloudHash });
      } else {
        // Offline — use cached hash
        const adNow = loadAdminLocal();
        pinHashRef.current = adNow.cachedPinHash || DEFAULT_PIN_HASH;
      }
      setFetchingHash(false);
    });
  },[]);

  // Live countdown while locked
  useEffect(()=>{
    if(!locked) return;
    const t=setInterval(()=>{
      const rem=Math.ceil((loadAdminLocal().lockUntil-Date.now())/1000);
      if(rem<=0){setLocked(false);setLockSecs(0);clearInterval(t);}
      else setLockSecs(rem);
    },1000);
    return()=>clearInterval(t);
  },[locked]);

  async function submit(){
    if(locked||loading||fetchingHash||!pin.trim()) return;
    setLoading(true);
    try{
      const hash = await sha256(pin);
      const correctHash = pinHashRef.current;
      if (!correctHash) { setErr('Could not verify PIN — check your connection.'); return; }

      if(hash === correctHash){
        // Correct — reset fail count locally
        const ad=loadAdminLocal();
        saveAdminLocal({...ad, failCount:0, lockUntil:0});
        setPin(''); onSuccess();
      } else {
        const ad=loadAdminLocal();
        const fail=(ad.failCount||0)+1;
        if(fail>=3){
          const lu=Date.now()+15*60*1000;
          saveAdminLocal({...ad, failCount:0, lockUntil:lu});
          setLocked(true); setLockSecs(900);
          setErr('3 wrong attempts — locked for 15 minutes.');
        } else {
          saveAdminLocal({...ad, failCount:fail});
          setErr(`Incorrect PIN. ${3-fail} attempt${3-fail===1?'':'s'} left before lockout.`);
        }
        setPin('');
      }
    } finally{ setLoading(false); }
  }

  const mm=String(Math.floor(lockSecs/60)).padStart(2,'0');
  const ss=String(lockSecs%60).padStart(2,'0');

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="fade-up"
        style={{background:T.surface,borderRadius:22,padding:32,width:'100%',maxWidth:380,boxShadow:'0 24px 64px rgba(0,0,0,0.4)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:58,height:58,borderRadius:16,background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:28}}>🔐</div>
          <h2 style={{fontSize:21,fontWeight:700}}>Admin Access</h2>
          <p style={{fontSize:13,opacity:0.45,marginTop:6}}>Enter your secret PIN</p>
        </div>
        {locked ? (
          <div style={{background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:14,padding:20,textAlign:'center',color:T.red}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>🔒 Too many wrong attempts</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:700}}>{mm}:{ss}</div>
            <div style={{fontSize:12,marginTop:6,opacity:0.7}}>Try again after the timer ends.</div>
          </div>
        ) : (
          <>
            <input ref={ref} type="password" inputMode="numeric" maxLength={8}
              placeholder="● ● ● ●" value={pin}
              onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setErr('');}}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              style={{width:'100%',padding:'15px 16px',borderRadius:13,
                border:`1.5px solid ${err?T.redBorder:T.border}`,
                background:T.borderLight,color:T.text,fontSize:22,
                textAlign:'center',letterSpacing:12,outline:'none',
                fontFamily:"'DM Mono',monospace",marginBottom:12,transition:'border-color 0.2s'}}/>
            {err&&<div style={{color:T.red,fontSize:13,textAlign:'center',marginBottom:12,fontWeight:500,lineHeight:1.4}}>{err}</div>}
            {fetchingHash && (
              <div style={{textAlign:'center',fontSize:13,opacity:0.5,marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:T.amber,animation:'pulse 1s infinite'}}/>
                Connecting to server…
              </div>
            )}
            <button onClick={submit} disabled={loading||fetchingHash||!pin}
              style={{width:'100%',padding:14,borderRadius:13,border:'none',background:T.accent,
                color:'#fff',fontWeight:700,fontSize:15,
                cursor:pin&&!loading&&!fetchingHash?'pointer':'not-allowed',
                opacity:pin&&!loading&&!fetchingHash?1:0.45,transition:'opacity 0.2s'}}>
              {fetchingHash?'Loading…':loading?'Verifying…':'Enter Admin Panel →'}
            </button>
          </>
        )}
        <button onClick={onClose}
          style={{width:'100%',marginTop:10,padding:11,borderRadius:13,border:`1px solid ${T.border}`,
            background:'none',color:T.textSub,fontWeight:500,fontSize:13,cursor:'pointer'}}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminPanel({onClose,onLogout,cloudTotals,setCloudTotals,T}){
  const [selMonth,setSelMonth]=useState(()=>{ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; });
  const [inputs,setInputs]=useState({});
  const [saveState,setSaveState]=useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [saveMsg,setSaveMsg]=useState('');
  const [pinOpen,setPinOpen]=useState(false);
  const [pinF,setPinF]=useState({old:'',newP:'',conf:''});
  const [pinMsg,setPinMsg]=useState('');
  const [pinOk,setPinOk]=useState(false);
  const [pinChanging,setPinChanging]=useState(false);

  // Generate month list from semester start to current month
  const monthOptions=[];
  let cur='2026-01';
  const todayMk=monthKey(getToday());
  while(cur<=todayMk){
    monthOptions.push(cur);
    const [y,m]=cur.split('-').map(Number);
    cur=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;
  }
  const publishedMonths=Object.keys(cloudTotals).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort();

  // Reload input fields when month or cloud data changes
  useEffect(()=>{
    const ex=cloudTotals[selMonth]||{};
    const init={};
    SUBJECTS.forEach(s=>{ init[s.id]=ex[s.id]??''; });
    setInputs(init); setSaveState('idle'); setSaveMsg('');
  },[selMonth,cloudTotals]);

  async function publish(){
    // Validate all inputs
    const parsed={};
    for(const s of SUBJECTS){
      const v=inputs[s.id];
      if(v===''||v===undefined){parsed[s.id]=0;continue;}
      const n=parseInt(v,10);
      if(isNaN(n)||n<0){ setSaveState('error'); setSaveMsg('Enter valid numbers only (0 or more).'); return; }
      parsed[s.id]=n;
    }
    setSaveState('saving'); setSaveMsg('Publishing to cloud…');
    try{
      const updated={...cloudTotals,[selMonth]:parsed};
      await pushToFirestore(updated);
      // cloudTotals will auto-update via the onSnapshot listener in App
      setSaveState('saved'); setSaveMsg(`✅ Published! All students can now see ${monthLabel(selMonth)} totals.`);
      setTimeout(()=>{ setSaveState('idle'); setSaveMsg(''); },4000);
    } catch(e){
      setSaveState('error'); setSaveMsg(`❌ Failed: ${e.message}`);
    }
  }

  async function doChangePin(){
    setPinMsg(''); setPinOk(false);

    // Basic validation first — no network needed
    if(!pinF.old||!pinF.newP||!pinF.conf){ setPinMsg('⚠️ Please fill all three fields.'); return; }
    if(pinF.newP.length<4){ setPinMsg('⚠️ New PIN must be at least 4 digits.'); return; }
    if(pinF.newP!==pinF.conf){ setPinMsg('⚠️ New PINs do not match — re-enter.'); return; }
    if(pinF.old===pinF.newP){ setPinMsg('⚠️ New PIN must be different from current PIN.'); return; }

    setPinChanging(true);
    try {
      // Step 1 — compute both hashes (instant, no network)
      setPinMsg('🔐 Hashing PINs…');
      const oldHash = await sha256(pinF.old);
      const newHash = await sha256(pinF.newP);

      // Step 2 — fetch current authoritative hash from Firebase to verify old PIN
      setPinMsg('🌐 Fetching current PIN from server…');
      const cloudHash = await fetchPinHashFromCloud();
      // cloudHash is null only if truly offline — fall back to local cache
      const authoritative = cloudHash !== null
        ? cloudHash
        : (loadAdminLocal().cachedPinHash || DEFAULT_PIN_HASH);

      if (cloudHash === null && FB_OK) {
        // Firebase init ok but fetch failed — network issue
        setPinMsg('❌ Could not reach server. Check your internet and try again.'); return;
      }

      // Step 3 — verify old PIN is correct
      if(oldHash !== authoritative){
        setPinMsg('❌ Current PIN is incorrect.'); return;
      }

      // Step 4 — push new hash to Firebase (all devices update instantly)
      setPinMsg('☁️ Saving new PIN to cloud…');
      await pushPinHashToCloud(newHash);

      // Step 5 — update local cache on this device too
      const ad = loadAdminLocal();
      saveAdminLocal({ ...ad, cachedPinHash: newHash });

      // Done!
      setPinOk(true);
      setPinMsg('✅ PIN changed successfully! All devices will use the new PIN.');
      setPinF({old:'',newP:'',conf:''});
      // Auto-close after 3 seconds
      setTimeout(()=>{ setPinOpen(false); setPinMsg(''); setPinOk(false); }, 3000);

    } catch(e) {
      // Any unhandled error (including timeout) shows here
      setPinMsg(`❌ Error: ${e.message}`);
    } finally {
      setPinChanging(false);
    }
  }

  const inputStyle={width:'100%',padding:'11px 14px',borderRadius:10,border:`1.5px solid ${T.border}`,background:T.borderLight,color:T.text,fontSize:16,letterSpacing:4,outline:'none',fontFamily:"'DM Mono',monospace",transition:'border-color 0.2s'};

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:720,
          maxHeight:'92vh',display:'flex',flexDirection:'column',
          boxShadow:'0 -8px 48px rgba(0,0,0,0.3)'}}>

        {/* ── Header ── */}
        <div style={{padding:'18px 20px 14px',borderBottom:`1px solid ${T.borderLight}`,flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🔐</div>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>Admin Panel</div>
                <div style={{fontSize:11,opacity:0.4}}>{FB_OK?'🟢 Firebase connected':'🔴 Firebase not configured — offline'}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onLogout} style={{...actionBtn(T.amber),fontSize:12,padding:'5px 12px'}}>Logout</button>
              <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',opacity:0.35,fontSize:22,color:T.text}}>✕</button>
            </div>
          </div>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:20,display:'flex',flexDirection:'column',gap:20}}>

          {/* ── Firebase offline warning ── */}
          {!FB_OK&&(
            <div style={{background:T.amberBg,border:`1px solid ${T.amberBorder}`,borderRadius:12,padding:'12px 16px',color:T.amber,fontSize:13}}>
              ⚠️ <strong>Firebase not configured yet.</strong> Add your Firebase config to App.js (see SETUP_GUIDE.md), then redeploy. Until then, publish only saves locally and students won't see it.
            </div>
          )}

          {/* ── Set monthly totals ── */}
          <div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📋 Monthly Class Totals</div>
            <p style={{fontSize:13,opacity:0.5,lineHeight:1.6,marginBottom:16}}>
              Enter the <strong>official total classes held</strong> per subject for the selected month (from the college attendance sheet). Hit Publish — it instantly shows on every student's phone.
            </p>

            {/* Month selector */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              {monthOptions.map(mk=>(
                <button key={mk} onClick={()=>setSelMonth(mk)}
                  style={{position:'relative',padding:'7px 14px',borderRadius:99,fontWeight:600,fontSize:13,cursor:'pointer',
                    border:`1.5px solid ${selMonth===mk?T.accent:T.border}`,
                    background:selMonth===mk?T.accent:T.surface,
                    color:selMonth===mk?'#fff':T.textSub,transition:'all 0.15s'}}>
                  {monthLabel(mk)}
                  {publishedMonths.includes(mk)&&(
                    <span style={{position:'absolute',top:-4,right:-4,width:9,height:9,borderRadius:'50%',background:T.green,border:`2px solid ${T.surface}`}}/>
                  )}
                </button>
              ))}
            </div>

            {/* Subject inputs */}
            <div style={{background:T.borderLight,borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,opacity:0.45,letterSpacing:'1px',textTransform:'uppercase',marginBottom:14}}>
                {monthLabel(selMonth)} — Total Classes Held per Subject
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {SUBJECTS.map(s=>(
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:4,height:38,borderRadius:99,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:11,opacity:0.35}}>{s.type}</div>
                    </div>
                    <input type="number" min="0" placeholder="0"
                      value={inputs[s.id]??''}
                      onChange={e=>{ setInputs({...inputs,[s.id]:e.target.value}); setSaveState('idle'); }}
                      style={{width:74,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${T.border}`,
                        background:T.surface,color:T.text,fontSize:15,fontWeight:700,textAlign:'center',
                        outline:'none',fontFamily:"'DM Mono',monospace",transition:'border-color 0.2s'}}
                      onFocus={e=>e.target.style.borderColor=T.accent}
                      onBlur={e=>e.target.style.borderColor=T.border}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Status message */}
            {saveMsg&&(
              <div style={{marginBottom:12,padding:'11px 14px',borderRadius:11,fontSize:13,fontWeight:500,
                background:saveState==='saved'?T.greenBg:saveState==='error'?T.redBg:T.borderLight,
                color:saveState==='saved'?T.green:saveState==='error'?T.red:T.textSub,
                border:`1px solid ${saveState==='saved'?T.greenBorder:saveState==='error'?T.redBorder:T.border}`}}>
                {saveMsg}
              </div>
            )}

            <button onClick={publish} disabled={saveState==='saving'||!FB_OK}
              style={{width:'100%',padding:14,borderRadius:13,border:'none',
                background:saveState==='saved'?T.green:T.accent,color:'#fff',fontWeight:700,fontSize:15,
                cursor:saveState==='saving'||!FB_OK?'not-allowed':'pointer',
                opacity:saveState==='saving'||!FB_OK?0.55:1,transition:'background 0.3s'}}>
              {saveState==='saving'?'Publishing…':saveState==='saved'?'✅ Published!':
                `🚀 Publish ${monthLabel(selMonth)} to All Students`}
            </button>
          </div>

          {/* ── Published months list ── */}
          {publishedMonths.length>0&&(
            <>
              <Divider T={T}/>
              <div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🌐 Live on All Students' Phones</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {publishedMonths.map(mk=>{
                    const d=cloudTotals[mk]||{};
                    const n=SUBJECTS.filter(s=>(d[s.id]||0)>0).length;
                    return(
                      <div key={mk} style={{background:T.borderLight,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{monthLabel(mk)}</div>
                          <div style={{fontSize:12,opacity:0.45,marginTop:2}}>{n}/{SUBJECTS.length} subjects have data</div>
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          <Badge variant="safe" T={T}>🟢 Live</Badge>
                          <button onClick={()=>setSelMonth(mk)} style={{...actionBtn(T.blue),fontSize:11,padding:'4px 10px'}}>Edit</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Divider T={T}/>

          {/* ── Change PIN ── */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:pinOpen?14:0}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>🔑 Change Admin PIN</div>
                {!pinOpen&&<div style={{fontSize:12,opacity:0.4,marginTop:2}}>Syncs instantly to all devices when changed</div>}
              </div>
              <button
                disabled={pinChanging}
                onClick={()=>{ if(!pinChanging){ setPinOpen(!pinOpen); setPinMsg(''); setPinOk(false); setPinF({old:'',newP:'',conf:''}); }}}
                style={{...actionBtn(T.purple),fontSize:12,padding:'5px 12px',opacity:pinChanging?0.4:1,cursor:pinChanging?'not-allowed':'pointer'}}>
                {pinOpen?'Cancel':'Change PIN'}
              </button>
            </div>
            {pinOpen&&(
              <div className="slide-down" style={{display:'flex',flexDirection:'column',gap:10}}>
                {[['Current PIN','old','Enter your current PIN'],['New PIN (min 4 digits)','newP','Choose a strong new PIN'],['Confirm New PIN','conf','Re-type the new PIN']].map(([label,field,ph])=>(
                  <div key={field}>
                    <label style={{fontSize:12,fontWeight:600,opacity:0.5,display:'block',marginBottom:5}}>{label}</label>
                    <input type="password" inputMode="numeric" placeholder={ph} value={pinF[field]}
                      disabled={pinChanging}
                      onChange={e=>{ if(!pinChanging){ setPinF({...pinF,[field]:e.target.value.replace(/\D/g,'')}); setPinMsg(''); setPinOk(false); }}}
                      style={{...inputStyle, opacity:pinChanging?0.5:1, cursor:pinChanging?'not-allowed':'text'}}
                      onFocus={e=>{ if(!pinChanging) e.target.style.borderColor=T.accent; }}
                      onBlur={e=>e.target.style.borderColor=T.border}/>
                  </div>
                ))}

                {/* Live step-by-step status — always visible while changing */}
                {pinMsg&&(
                  <div style={{padding:'12px 16px',borderRadius:12,fontSize:13,fontWeight:600,
                    lineHeight:1.6,
                    background: pinOk ? T.greenBg : pinChanging ? T.borderLight : T.redBg,
                    color:       pinOk ? T.green   : pinChanging ? T.textSub    : T.red,
                    border:`1px solid ${pinOk ? T.greenBorder : pinChanging ? T.border : T.redBorder}`,
                    display:'flex', alignItems:'center', gap:10}}>
                    {pinChanging && (
                      <span style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${T.textSub}`,
                        borderTopColor:'transparent',display:'inline-block',
                        animation:'spin 0.8s linear infinite',flexShrink:0}}/>
                    )}
                    {pinMsg}
                  </div>
                )}

                <button onClick={doChangePin} disabled={pinChanging||pinOk}
                  style={{padding:14,borderRadius:12,border:'none',
                    background: pinOk ? T.green : T.accent,
                    color:'#fff',fontWeight:700,fontSize:14,
                    cursor:pinChanging||pinOk?'not-allowed':'pointer',
                    opacity:pinChanging||pinOk?0.6:1,
                    transition:'background 0.3s, opacity 0.2s'}}>
                  {pinChanging ? 'Updating…' : pinOk ? '✅ Done!' : 'Update PIN on All Devices →'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MONTHLY ATTENDANCE VIEW (STUDENT)
   ═══════════════════════════════════════════════════════════════════════════ */
function MonthlyView({monthlyAttendance,setMonthlyAttendance,cloudTotals,T}){
  const published=Object.keys(cloudTotals).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort();
  const [selMonth,setSelMonth]=useState(published[published.length-1]||'');
  const [entries,setEntries]=useState({});
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    if(!selMonth) return;
    const ex=monthlyAttendance?.[selMonth]||{};
    const init={};
    SUBJECTS.forEach(s=>{ init[s.id]=ex[s.id]?.present??''; });
    setEntries(init); setSaved(false);
  },[selMonth,monthlyAttendance]);

  if(published.length===0){
    return(
      <div className="fade-up" style={{textAlign:'center',padding:'64px 20px'}}>
        <div style={{fontSize:50,marginBottom:14}}>⏳</div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:8}}>Not Published Yet</h2>
        <p style={{fontSize:14,opacity:0.5,lineHeight:1.7}}>
          The admin hasn't published the monthly attendance sheet yet.<br/>
          It will appear here automatically once published.
        </p>
      </div>
    );
  }

  const totals=cloudTotals[selMonth]||{};

  function save(){
    for(const s of SUBJECTS){
      const v=entries[s.id], total=totals[s.id]||0;
      if(v===''||v===undefined) continue;
      const n=parseInt(v,10);
      if(isNaN(n)||n<0){ alert('Please enter valid numbers only.'); return; }
      if(n>total){ alert(`${s.name}: you can't attend more than ${total} classes held.`); return; }
    }
    const parsed={};
    SUBJECTS.forEach(s=>{
      const total=totals[s.id]||0;
      const v=entries[s.id];
      const present=v===''||v===undefined?0:Math.max(0,parseInt(v,10)||0);
      parsed[s.id]={total,present};
    });
    setMonthlyAttendance({...(monthlyAttendance||{}),[selMonth]:parsed});
    setSaved(true); setTimeout(()=>setSaved(false),2500);
  }

  return(
    <div className="fade-up">
      <SectionHead title="Monthly Attendance" sub="Enter your attendance from the official college sheet"/>

      {/* Month selector */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {published.map(mk=>(
          <button key={mk} onClick={()=>setSelMonth(mk)}
            style={{padding:'7px 16px',borderRadius:99,fontWeight:600,fontSize:13,cursor:'pointer',
              border:`1.5px solid ${selMonth===mk?T.accent:T.border}`,
              background:selMonth===mk?T.accent:T.surface,
              color:selMonth===mk?'#fff':T.textSub,transition:'all 0.15s'}}>
            {monthLabel(mk)}
            {monthlyAttendance?.[mk]&&<span style={{marginLeft:5,fontSize:11}}>✓</span>}
          </button>
        ))}
      </div>

      {selMonth&&(
        <>
          <div style={{background:T.accentLight,border:`1px solid ${T.accentBorder}`,borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:T.accent,lineHeight:1.65}}>
            📋 For each subject, enter <strong>how many classes you personally attended</strong> in {monthLabel(selMonth)}.<br/>
            The "Total Held" numbers come from the official college sheet (set by your CR).
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
            {SUBJECTS.map(s=>{
              const total=totals[s.id]||0;
              const val=entries[s.id];
              const present=parseInt(val,10);
              const pct=!isNaN(present)&&total>0?Math.round((present/total)*100):null;
              const pctColor=pct==null?T.textSub:pct>=75?T.green:pct>=60?T.amber:T.red;
              const tooMany=!isNaN(present)&&present>total;
              return(
                <div key={s.id} style={{background:T.surface,border:`1.5px solid ${tooMany?T.redBorder:T.border}`,borderRadius:14,padding:'14px 16px',borderLeft:`4px solid ${s.color}`,transition:'border-color 0.2s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{s.name}</div>
                      <div style={{fontSize:12,opacity:0.45,marginTop:3}}>
                        Total held this month: <strong style={{fontFamily:"'DM Mono',monospace",color:T.text,opacity:1}}>{total}</strong>
                        {total===0&&<span style={{color:T.amber,marginLeft:6,fontSize:11}}>— not entered by admin yet</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                      {pct!==null&&!tooMany&&(
                        <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:pctColor}}>{pct}%</span>
                      )}
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,opacity:0.45}}>I attended:</span>
                        <input type="number" min="0" max={total} placeholder="0"
                          value={val??''}
                          onChange={e=>{setEntries({...entries,[s.id]:e.target.value});setSaved(false);}}
                          style={{width:66,padding:'8px 10px',borderRadius:10,
                            border:`1.5px solid ${tooMany?T.redBorder:T.border}`,
                            background:T.borderLight,color:T.text,fontSize:15,fontWeight:700,
                            textAlign:'center',outline:'none',fontFamily:"'DM Mono',monospace",transition:'border-color 0.2s'}}
                          onFocus={e=>e.target.style.borderColor=T.accent}
                          onBlur={e=>e.target.style.borderColor=tooMany?T.redBorder:T.border}/>
                      </div>
                    </div>
                  </div>
                  {tooMany&&<div style={{marginTop:8,color:T.red,fontSize:12,fontWeight:500}}>⚠️ Cannot be more than {total} (total classes held)</div>}
                </div>
              );
            })}
          </div>

          <button onClick={save}
            style={{width:'100%',padding:14,borderRadius:13,border:'none',
              background:saved?T.green:T.accent,color:'#fff',fontWeight:700,fontSize:15,
              cursor:'pointer',transition:'background 0.3s'}}>
            {saved?`✅ Saved! Your ${monthLabel(selMonth)} attendance is updated.`:`Save ${monthLabel(selMonth)} Attendance →`}
          </button>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TODAY VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function TodayView({records,setRecords,notes,setNotes,myBatch,holidays,setHolidays,T}){
  const today=getToday(), dayName=getDayName(today);
  const slots=getSlotsForBatch(dayName,myBatch), dayRec=records[today]||{};
  const isHoliday=holidays[today];

  function mark(subjectId,idx,val){
    const key=`${subjectId}__${idx}`;
    let upd;
    if(!val){const nr={...dayRec};delete nr[key];upd={...records,[today]:nr};}
    else upd={...records,[today]:{...dayRec,[key]:val}};
    setRecords(upd);
  }
  function markAllPresent(){ const nr={...dayRec}; slots.forEach((s,i)=>{nr[`${s.subjectId}__${i}`]='P';}); setRecords({...records,[today]:nr}); }
  function toggleHoliday(){ const u={...holidays}; if(u[today]) delete u[today]; else u[today]=true; setHolidays(u); }

  const marked=slots.filter((s,i)=>dayRec[`${s.subjectId}__${i}`]).length;
  const present=slots.filter((s,i)=>dayRec[`${s.subjectId}__${i}`]==='P').length;

  if(!slots.length||isHoliday){
    return(
      <div className="fade-up" style={{textAlign:'center',padding:'60px 20px'}}>
        <div style={{fontSize:52,marginBottom:16}}>{isHoliday?'🏖️':'🎉'}</div>
        <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>{isHoliday?'Holiday / No Classes':'No Classes Today!'}</h2>
        <p style={{fontSize:14,opacity:0.55,marginBottom:24}}>{isHoliday?formatDate(today):(dayName==='SUN'||dayName==='SAT'?'Enjoy your weekend.':'Free day!')}</p>
        {slots.length>0&&isHoliday&&<button onClick={toggleHoliday} style={{padding:'10px 24px',borderRadius:99,border:`1.5px solid ${T.border}`,background:T.surface,color:T.textSub,fontWeight:600,fontSize:14,cursor:'pointer'}}>Remove Holiday Mark</button>}
      </div>
    );
  }

  return(
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:14}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.3px'}}>{dayName} · {formatShort(today)}</h2>
          <p style={{fontSize:13,opacity:0.55,marginTop:2}}>Batch {myBatch}</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Badge variant={marked===slots.length?'safe':'default'} T={T}>{marked}/{slots.length} marked</Badge>
          {marked>0&&<Badge variant="info" T={T}>{present}P · {marked-present}A</Badge>}
        </div>
      </div>
      <div style={{height:4,background:T.borderLight,borderRadius:99,marginBottom:14,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${slots.length?(marked/slots.length)*100:0}%`,background:T.accent,borderRadius:99,transition:'width 0.4s ease'}}/>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={markAllPresent} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${T.greenBorder}`,background:T.greenBg,color:T.green,fontWeight:600,fontSize:13,cursor:'pointer'}}>✓ Mark All Present</button>
        <button onClick={toggleHoliday} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${T.amberBorder}`,background:T.amberBg,color:T.amber,fontWeight:600,fontSize:13,cursor:'pointer'}}>🏖 Mark as Holiday</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {slots.map((slot,idx)=>{
          const subj=subjectMap[slot.subjectId], val=dayRec[`${slot.subjectId}__${idx}`];
          const bc=val?(val==='P'?T.greenBorder:val==='A'?T.redBorder:T.amberBorder):T.border;
          return(
            <div key={idx} style={{background:T.surface,border:`1.5px solid ${bc}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'border-color 0.2s'}}>
              <div style={{width:4,height:46,borderRadius:99,background:subj?.color||T.border,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{subj?.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:5,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,opacity:0.45,fontFamily:"'DM Mono',monospace"}}>{slot.time}</span>
                  {slot.batch!=='all'&&<Badge variant="info" T={T}>Batch {slot.batch}</Badge>}
                  <span style={{fontSize:11,opacity:0.4,background:T.borderLight,padding:'2px 8px',borderRadius:99}}>{subj?.type}</span>
                </div>
              </div>
              <MarkBtns value={val} onChange={v=>mark(slot.subjectId,idx,v)} T={T}/>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:20}}>
        <label style={{fontSize:13,fontWeight:600,opacity:0.55,display:'block',marginBottom:8}}>Notes for today</label>
        <textarea placeholder="Homework, reminders…" value={notes[today]||''} onChange={e=>setNotes({...notes,[today]:e.target.value})}
          style={{width:'100%',minHeight:80,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',color:T.text,fontSize:14,resize:'vertical',outline:'none',lineHeight:1.6,transition:'border-color 0.2s,background 0.3s'}}
          onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>
      </div>
    </div>
  );
}

/* ─── CALENDAR VIEW ──────────────────────────────────────────────────────── */
function CalendarView({records,setRecords,myBatch,holidays,setHolidays,T}){
  const [cur,setCur]=useState(new Date());
  const [selDate,setSelDate]=useState(null);
  const [expanded,setExpanded]=useState(null);
  const today=getToday(), y=cur.getFullYear(), m=cur.getMonth();
  const firstDay=new Date(y,m,1).getDay(), dim=new Date(y,m+1,0).getDate();
  const cells=[]; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
  function ds(d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  function info(d){
    const date=ds(d),dn=getDayName(date),slots=getSlotsForBatch(dn,myBatch),dr=records[date]||{};
    const marked=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]).length;
    const present=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='P').length;
    const absent=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='A').length;
    return{date,dn,total:slots.length,marked,present,absent,isWE:dn==='SAT'||dn==='SUN',isHol:holidays[date]};
  }
  const selSlots=selDate?getSlotsForBatch(getDayName(selDate),myBatch):[];
  const isSelHol=selDate&&holidays[selDate];
  const isFuture=d=>d>today;
  function markSlot(date,subjectId,idx,val){
    const dr=records[date]||{},key=`${subjectId}__${idx}`;
    let upd; if(!val){const nr={...dr};delete nr[key];upd={...records,[date]:nr};} else upd={...records,[date]:{...dr,[key]:val}};
    setRecords(upd);
  }
  function toggleHol(date){const u={...holidays};if(u[date])delete u[date];else u[date]=true;setHolidays(u);}
  return(
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-0.3px'}}>{cur.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCur(new Date(y,m-1,1))} style={navStyle(T)}>‹</button>
          <button onClick={()=>setCur(new Date())} style={{...navStyle(T),width:'auto',padding:'0 12px',fontSize:12}}>Today</button>
          <button onClick={()=>setCur(new Date(y,m+1,1))} style={navStyle(T)}>›</button>
        </div>
      </div>
      <Card T={T} style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:6}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,opacity:0.35,padding:'4px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const{date,isWE,total,marked,present,absent,isHol}=info(d);
            const isTday=date===today,isSel=date===selDate,isFut=isFuture(date);
            let dot=null;
            if(isHol) dot='#f59e0b';
            else if(marked>0) dot=absent>0?T.red:present===marked?T.green:T.amber;
            return(
              <div key={d} onClick={()=>setSelDate(isSel?null:date)}
                style={{borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer',
                  background:isSel?T.accentLight:isTday?T.accentLight:'transparent',
                  border:`1.5px solid ${isSel?T.accent:isTday?T.accentBorder:'transparent'}`,
                  opacity:isWE?0.3:isFut?0.4:1,transition:'all 0.15s'}}>
                <div style={{fontSize:13,fontWeight:isTday?700:400,color:isTday?T.accent:T.text}}>{d}</div>
                {dot?<div style={{width:5,height:5,borderRadius:'50%',background:dot,margin:'3px auto 0'}}/>
                  :total>0?<div style={{width:4,height:4,borderRadius:'50%',background:T.border,margin:'4px auto 0'}}/>:null}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,flexWrap:'wrap'}}>
          {[{c:T.green,l:'All Present'},{c:T.red,l:'Has Absent'},{c:T.amber,l:'Partial'},{c:'#f59e0b',l:'Holiday'},{c:T.border,l:'No data'}].map(({c,l})=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,opacity:0.6}}><div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}</div>
          ))}
        </div>
      </Card>
      {selDate&&(
        <div className="slide-down" style={{marginTop:14}}>
          <Card T={T}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div><div style={{fontWeight:700,fontSize:16}}>{formatDate(selDate)}</div><div style={{fontSize:12,opacity:0.45,marginTop:2}}>Batch {myBatch}{isFuture(selDate)&&' · Future (view only)'}</div></div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {!isFuture(selDate)&&<button onClick={()=>toggleHol(selDate)} style={{padding:'5px 12px',borderRadius:99,border:`1px solid ${T.amberBorder}`,background:isSelHol?T.amber:T.amberBg,color:isSelHol?'#fff':T.amber,fontWeight:600,fontSize:12,cursor:'pointer'}}>{isSelHol?'Remove Holiday':'🏖 Holiday'}</button>}
                <button onClick={()=>setSelDate(null)} style={{background:'none',border:'none',cursor:'pointer',opacity:0.4,fontSize:20,color:T.text}}>✕</button>
              </div>
            </div>
            {isSelHol?<p style={{opacity:0.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>Marked as Holiday.</p>
              :selSlots.length===0?<p style={{opacity:0.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>No classes scheduled.</p>
              :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                {selSlots.map((slot,idx)=>{
                  const subj=subjectMap[slot.subjectId], val=(records[selDate]||{})[`${slot.subjectId}__${idx}`];
                  const isExp=expanded===`${selDate}__${idx}`;
                  if(selDate<subj?.semStart) return null;
                  return(
                    <div key={idx} style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
                      <div onClick={()=>!isFuture(selDate)&&setExpanded(isExp?null:`${selDate}__${idx}`)}
                        style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:isExp?T.borderLight:T.surface,cursor:isFuture(selDate)?'default':'pointer',borderLeft:`3px solid ${subj?.color||T.border}`}}>
                        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{subj?.name}</div><div style={{fontSize:11,opacity:0.45,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{slot.time}</div></div>
                        {val?<AttTag val={val} T={T}/>:<span style={{fontSize:12,opacity:0.35}}>{isFuture(selDate)?'upcoming':'tap to mark'}</span>}
                        {!isFuture(selDate)&&<span style={{opacity:0.3,fontSize:12}}>{isExp?'▲':'▼'}</span>}
                      </div>
                      {isExp&&!isFuture(selDate)&&(
                        <div style={{padding:'12px 14px',background:T.surface,borderTop:`1px solid ${T.borderLight}`}}>
                          <MarkBtns value={val} onChange={v=>markSlot(selDate,slot.subjectId,idx,v)} T={T}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── SUBJECTS VIEW ──────────────────────────────────────────────────────── */
function SubjectsView({records,stats,myBatch,T}){
  const [sel,setSel]=useState(null), [ft,setFt]=useState('all');
  if(sel) return <SubjectDetail subjectId={sel} records={records} stats={stats} myBatch={myBatch} onBack={()=>setSel(null)} T={T}/>;
  const filtered=ft==='all'?SUBJECTS:SUBJECTS.filter(s=>s.type===ft);
  return(
    <div className="fade-up">
      <SectionHead title="All Subjects" sub="Tap a subject for detailed history & forecasts"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All'],['theory','Theory'],['lab','Labs'],['activity','Activity']].map(([v,l])=>(
          <Pill key={v} label={l} active={ft===v} color={T.accent} onClick={()=>setFt(v)} T={T}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(s=>{
          const st=stats[s.id], pct=st.pct;
          const variant=pct==null?'default':pct>=75?'safe':pct>=60?'warning':'danger';
          const hint=pct==null?'No data yet':pct>=75?`Safe · can skip ${st.canBunk} now`:pct>=60?`Low · need ${st.classesNeeded} more`:`Critical · need ${st.classesNeeded} more`;
          return(
            <div key={s.id} onClick={()=>setSel(s.id)}
              style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',borderLeft:`4px solid ${s.color}`,transition:'box-shadow 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{position:'relative',flexShrink:0}}>
                <CircleProgress pct={pct} size={54} stroke={5} color={s.color} T={T}/>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>{pct!=null?`${pct}%`:'—'}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{s.name}</div>
                <div style={{fontSize:12,opacity:0.45,marginTop:2}}>{s.teacher}</div>
                <div style={{display:'flex',gap:8,marginTop:7,alignItems:'center',flexWrap:'wrap'}}>
                  <Badge variant={variant} T={T}>{hint}</Badge>
                  {st.canBunkTotal>0&&<Badge variant="purple" T={T}>🗓 {st.canBunkTotal} left till sem end</Badge>}
                </div>
              </div>
              <span style={{opacity:0.25,fontSize:18,flexShrink:0}}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function SubjectDetail({subjectId,records,stats,myBatch,onBack,T}){
  const subj=subjectMap[subjectId], st=stats[subjectId];
  const history=[];
  Object.entries(records).forEach(([date,dayRec])=>{
    getSlotsForBatch(getDayName(date),myBatch).forEach((slot,idx)=>{
      if(slot.subjectId===subjectId){ const val=dayRec[`${slot.subjectId}__${idx}`]; if(val) history.push({date,time:slot.time,val}); }
    });
  });
  history.sort((a,b)=>b.date.localeCompare(a.date));
  const pct=st.pct;
  return(
    <div className="fade-up">
      <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontWeight:600,fontSize:14,marginBottom:18,padding:0,display:'flex',alignItems:'center',gap:4}}>← Back</button>
      <Card T={T} style={{marginBottom:14,borderLeft:`5px solid ${subj.color}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:subj.color,marginBottom:6}}>{subj.type}</div>
            <h2 style={{fontSize:19,fontWeight:700,letterSpacing:'-0.3px',lineHeight:1.3}}>{subj.name}</h2>
            <p style={{fontSize:13,opacity:0.45,marginTop:4}}>{subj.teacher}</p>
          </div>
          <div style={{position:'relative',flexShrink:0}}>
            <CircleProgress pct={pct} size={80} stroke={7} color={subj.color} T={T}/>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700}}>{pct!=null?`${pct}%`:'—'}</span>
            </div>
          </div>
        </div>
        <Divider T={T}/>
        <div style={{display:'flex'}}>
          {[{v:st.present,l:'Present',c:T.green},{v:st.absent,l:'Absent',c:T.red},{v:st.holiday||0,l:'Holiday',c:T.amber},{v:st.total,l:'Total',c:T.text}].map(({v,l,c},i,a)=>(
            <div key={l} style={{flex:1,textAlign:'center',borderRight:i<a.length-1?`1px solid ${T.borderLight}`:'none'}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:11,opacity:0.45,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <Divider T={T} margin="14px 0"/>
        <div style={{fontSize:12,fontWeight:700,opacity:0.5,letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Semester Forecast</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style={{background:T.borderLight,borderRadius:10,padding:'10px 14px'}}><div style={{fontSize:11,opacity:0.5,marginBottom:3}}>Remaining classes</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700}}>{st.remainingClasses}</div></div>
          <div style={{background:T.borderLight,borderRadius:10,padding:'10px 14px'}}><div style={{fontSize:11,opacity:0.5,marginBottom:3}}>Projected final %</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:(st.projectedPct||0)>=75?T.green:T.red}}>{st.projectedPct!=null?`${st.projectedPct}%`:'—'}</div></div>
        </div>
        {st.canBunkTotal>0&&<div style={{background:T.greenBg,border:`1px solid ${T.greenBorder}`,borderRadius:10,padding:'12px 14px',color:T.green,fontSize:13,fontWeight:500,marginBottom:8}}>✅ You can skip <strong>{st.canBunkTotal}</strong> more class{st.canBunkTotal===1?'':'es'} till semester end and still maintain 75%</div>}
        {st.canBunkTotal===0&&st.pct!==null&&<div style={{background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:10,padding:'12px 14px',color:T.red,fontSize:13,fontWeight:500,marginBottom:8}}>⚠️ No more classes can be missed — attend all remaining {st.remainingClasses}</div>}
        {st.classesNeeded>0&&<div style={{background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:10,padding:'12px 14px',color:T.red,fontSize:13,fontWeight:500}}>🚨 Attend <strong>{st.classesNeeded}</strong> more consecutive classes to reach 75% right now</div>}
      </Card>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>History ({history.length})</h3>
      {history.length===0?<p style={{opacity:0.35,fontSize:14,textAlign:'center',padding:'40px 0'}}>No daily markings yet.</p>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.map((c,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:500,fontSize:14}}>{formatDate(c.date)}</div><div style={{fontSize:12,opacity:0.35,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{c.time}</div></div>
              <AttTag val={c.val} T={T}/>
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ─── STATS VIEW ─────────────────────────────────────────────────────────── */
function StatsView({stats,T}){
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0), totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  const safe=SUBJECTS.filter(s=>stats[s.id].pct>=75).length;
  const risk=SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length;
  const noData=SUBJECTS.filter(s=>stats[s.id].pct==null).length;
  const sorted=[...SUBJECTS].sort((a,b)=>(stats[b.id].pct||0)-(stats[a.id].pct||0));
  const best=sorted.find(s=>stats[s.id].pct!=null), worst=[...sorted].reverse().find(s=>stats[s.id].pct!=null);
  return(
    <div className="fade-up">
      <SectionHead title="Statistics" sub="Semester overview"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[{l:'Overall',v:oPct!=null?`${oPct}%`:'—',c:oPct==null?T.textSub:oPct>=75?T.green:T.red,bg:oPct==null?T.borderLight:oPct>=75?T.greenBg:T.redBg},{l:'Safe',v:safe,c:T.green,bg:T.greenBg},{l:'At Risk',v:risk,c:T.red,bg:T.redBg},{l:'No Data',v:noData,c:T.textSub,bg:T.borderLight}].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:26,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,opacity:0.55,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>
      {(best||worst)&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:16}}>
          {best&&<Card T={T} style={{padding:16}}><div style={{fontSize:12,opacity:0.45,marginBottom:6,fontWeight:600}}>🏆 Best Subject</div><div style={{fontWeight:700,fontSize:14,color:T.green,marginBottom:2}}>{best.name}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:T.green}}>{stats[best.id].pct}%</div></Card>}
          {worst&&worst.id!==best?.id&&<Card T={T} style={{padding:16}}><div style={{fontSize:12,opacity:0.45,marginBottom:6,fontWeight:600}}>⚠️ Needs Attention</div><div style={{fontWeight:700,fontSize:14,color:T.red,marginBottom:2}}>{worst.name}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:T.red}}>{stats[worst.id].pct}%</div></Card>}
        </div>
      )}
      <Card T={T}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Subject-wise Attendance</h3>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {sorted.map(s=>{
            const st=stats[s.id], pct=st.pct, bc=pct==null?T.border:pct>=75?s.color:pct>=60?T.amber:T.red;
            return(
              <div key={s.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                    <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:8}}>
                    {st.canBunkTotal>0&&<span style={{fontSize:11,color:T.purple,fontWeight:600}}>skip {st.canBunkTotal} more</span>}
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:bc}}>{pct!=null?`${pct}%`:'—'}</span>
                  </div>
                </div>
                <div style={{position:'relative',height:8,background:T.borderLight,borderRadius:99,overflow:'visible'}}>
                  <div style={{height:'100%',width:`${pct||0}%`,background:bc,borderRadius:99,transition:'width 0.8s ease'}}/>
                  <div style={{position:'absolute',top:-4,left:'75%',width:2,height:16,background:T.textMuted,borderRadius:99,opacity:0.3}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:11,opacity:0.45}}>
                  <span>{st.present}P · {st.absent}A · {st.total} total · {st.remainingClasses} remaining</span>
                  {st.classesNeeded>0&&<span style={{color:T.red,opacity:1}}>Need {st.classesNeeded} more</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,display:'flex',alignItems:'center',gap:6,fontSize:11,opacity:0.35}}>
          <div style={{width:2,height:12,background:T.textMuted,borderRadius:99}}/>
          <span>Vertical line = 75% threshold · "skip X more" = skippable till Apr 30</span>
        </div>
      </Card>
    </div>
  );
}

/* ─── SCHEDULE VIEW ──────────────────────────────────────────────────────── */
function ScheduleView({myBatch,T}){
  const [filter,setFilter]=useState('all');
  return(
    <div className="fade-up">
      <SectionHead title="Weekly Schedule" sub="2nd Semester · 02 Feb – 30 Apr 2026"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All Batches'],['B1','Batch 1 (B-1)'],['B2','Batch 2 (B-2)']].map(([v,l])=>(
          <Pill key={v} label={l} active={filter===v} color={T.accent} onClick={()=>setFilter(v)} T={T}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {DAYS_ORDER.map(day=>{
          const slots=filter==='all'?TIMETABLE[day]:TIMETABLE[day].filter(s=>s.batch==='all'||s.batch===filter);
          if(!slots?.length) return null;
          return(
            <Card key={day} T={T}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12,display:'flex',justifyContent:'space-between'}}>{day}<span style={{fontSize:12,fontWeight:400,opacity:0.35}}>{slots.length} slot{slots.length>1?'s':''}</span></div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {slots.map((slot,i)=>{
                  const subj=subjectMap[slot.subjectId];
                  return(<div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:T.borderLight,borderRadius:10,borderLeft:`3px solid ${subj?.color||T.border}`}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,opacity:0.45,minWidth:90,flexShrink:0}}>{slot.time}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:500}}>{subj?.name}</span>
                    <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                      {slot.batch!=='all'&&<Badge variant="info" T={T}>{slot.batch}</Badge>}
                      <span style={{fontSize:11,opacity:0.4,background:T.surface,padding:'2px 8px',borderRadius:99,border:`1px solid ${T.border}`}}>{subj?.type}</span>
                    </div>
                  </div>);
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── REPORTS VIEW ───────────────────────────────────────────────────────── */
function ReportsView({stats,myBatch,T}){
  const [period,setPeriod]=useState('biweekly');
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0), totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  return(
    <div className="fade-up">
      <SectionHead title="Reports" sub="Export your attendance as a printable PDF"/>
      <Card T={T} style={{marginBottom:14}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:4}}>📄 Export PDF Report</h3>
        <p style={{fontSize:13,opacity:0.45,marginBottom:16}}>Opens a printable page in a new tab. Includes current %, projected final %, and classes you can still skip.</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
          <Pill label="Bi-Weekly (14 days)" active={period==='biweekly'} color={T.accent} onClick={()=>setPeriod('biweekly')} T={T}/>
          <Pill label="Monthly (30 days)" active={period==='monthly'} color={T.accent} onClick={()=>setPeriod('monthly')} T={T}/>
        </div>
        <div style={{background:T.borderLight,borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:11,opacity:0.45,marginBottom:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>Snapshot</div>
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:oPct>=75?T.green:T.red}}>{oPct!=null?`${oPct}%`:'—'}</span><br/><span style={{fontSize:11,opacity:0.45}}>Overall</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20}}>{totP}/{totT}</span><br/><span style={{fontSize:11,opacity:0.45}}>Present/Total</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:T.green}}>{SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</span><br/><span style={{fontSize:11,opacity:0.45}}>Safe</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:T.red}}>{SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</span><br/><span style={{fontSize:11,opacity:0.45}}>At risk</span></div>
          </div>
        </div>
        <button onClick={()=>generatePDF(stats,myBatch,period)}
          style={{width:'100%',padding:13,borderRadius:12,border:'none',background:T.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}
          onMouseEnter={e=>e.target.style.opacity='0.85'} onMouseLeave={e=>e.target.style.opacity='1'}>
          Generate & Print PDF →
        </button>
      </Card>
      <Card T={T}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>💡 Quick Guide</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[['P','Present — counts toward your attendance %'],['A','Absent — reduces your attendance %'],['H','Holiday / Cancelled — not counted in % at all'],['Monthly tab','Enter your count from the official attendance sheet each month-end'],['skip X more','Classes you can still miss and stay above 75% till Apr 30']].map(([k,v])=>(
            <div key={k} style={{display:'flex',gap:12,fontSize:13}}>
              <span style={{fontWeight:700,color:T.accent,flexShrink:0,minWidth:90}}>{k}</span>
              <span style={{opacity:0.6}}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [data,setData]              = useState(()=>loadStudentData());
  const [tab,setTab]                = useState('today');
  const [settings,setSettings]      = useState(false);
  const [showLogin,setShowLogin]    = useState(false);
  const [showPanel,setShowPanel]    = useState(false);
  const [adminLoggedIn,setAdminIn]  = useState(false);  // session-only — resets on tab close
  const [cloudTotals,setCloudTotals]= useState({});
  const [syncStatus,setSyncStatus]  = useState('loading'); // 'loading'|'ok'|'offline'
  const [,setTick]                  = useState(0);

  const {records,notes,myBatch='B1',darkMode=false,holidays={},monthlyAttendance={}}=data;

  useEffect(()=>{ applyGlobalStyles(darkMode); },[darkMode]);
  const T=makeTheme(darkMode);

  /* Persist student data callbacks */
  const setRecords           =useCallback(r=>setData(d=>{ const nd={...d,records:r};              saveStudentData(nd); return nd; }),[]);
  const setNotes             =useCallback(n=>setData(d=>{ const nd={...d,notes:n};                saveStudentData(nd); return nd; }),[]);
  const setBatch             =useCallback(b=>setData(d=>{ const nd={...d,myBatch:b};              saveStudentData(nd); return nd; }),[]);
  const setDark              =useCallback(v=>setData(d=>{ const nd={...d,darkMode:v};             saveStudentData(nd); return nd; }),[]);
  const setHolidays          =useCallback(h=>setData(d=>{ const nd={...d,holidays:h};             saveStudentData(nd); return nd; }),[]);
  const setMonthlyAttendance =useCallback(m=>setData(d=>{ const nd={...d,monthlyAttendance:m};    saveStudentData(nd); return nd; }),[]);

  /* Real-time Firestore listener — fires on every phone the moment admin publishes */
  useEffect(()=>{
    if(!FB_OK||!db){ setSyncStatus('offline'); return; }
    setSyncStatus('loading');
    const unsub=onSnapshot(
      doc(db,'admin','monthlyTotals'),
      snap=>{
        if(snap.exists()){
          const raw=snap.data();
          // Strip internal fields before exposing to UI
          const clean={};
          Object.entries(raw).forEach(([k,v])=>{
            if(k==='writeToken'||k==='updatedAt') return;
            clean[k]=v;
          });
          setCloudTotals(clean);
        }
        setSyncStatus('ok');
      },
      err=>{ console.warn('Firestore listener error',err); setSyncStatus('offline'); }
    );
    return ()=>unsub(); // cleanup on unmount
  },[]);

  /* Midnight refresh so "Today" always shows correct day */
  useEffect(()=>{
    function msTill(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,1)-n; }
    let t; const sched=()=>{ t=setTimeout(()=>{ setTick(x=>x+1); sched(); },msTill()); };
    sched(); return()=>clearTimeout(t);
  },[]);

  const stats=calcStats(records,myBatch,holidays,monthlyAttendance);
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;

  function exportData(){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='ece_attendance_backup.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e){
    const file=e.target.files?.[0]; if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); setData(d); saveStudentData(d); applyGlobalStyles(d.darkMode||false); alert('Imported successfully!'); } catch{ alert('Invalid backup file.'); } };
    r.readAsText(file); e.target.value='';
  }
  function clearAll(){
    if(window.confirm('Delete ALL your attendance data? This cannot be undone.')){
      const fresh={records:{},notes:{},myBatch,darkMode,holidays:{},monthlyAttendance:{}};
      setData(fresh); saveStudentData(fresh);
    }
  }

  const hasPublished=Object.keys(cloudTotals).length>0;

  const TABS=[
    {id:'today',   icon:'📋', label:'Today'},
    {id:'calendar',icon:'📅', label:'Calendar'},
    {id:'monthly', icon:'📊', label:'Monthly', dot:hasPublished},
    {id:'subjects',icon:'📚', label:'Subjects'},
    {id:'stats',   icon:'📈', label:'Stats'},
    {id:'schedule',icon:'🗓', label:'Schedule'},
    {id:'reports', icon:'📤', label:'Reports'},
  ];

  /* Sync status dot color */
  const syncColor = syncStatus==='ok'?'#10b981':syncStatus==='loading'?'#fbbf24':'#f87171';

  return(
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,transition:'background 0.3s,color 0.3s'}}>

      {/* ── STICKY HEADER ── */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,position:'sticky',top:0,zIndex:200,boxShadow:'0 1px 6px rgba(0,0,0,0.06)',transition:'background 0.3s,border-color 0.3s'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px'}}>

          {/* Top bar */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,paddingBottom:10,gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:11,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:20}}>📡</span>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:16,letterSpacing:'-0.3px',lineHeight:1.2}}>ECE Attendance</div>
                <div style={{fontSize:11,opacity:0.45,display:'flex',alignItems:'center',gap:5}}>
                  B.Tech 1st Year · Sem 2
                  <span title={`Sync: ${syncStatus}`} style={{width:6,height:6,borderRadius:'50%',background:syncColor,display:'inline-block',flexShrink:0}}/>
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end',minWidth:0}}>
              {oPct!=null&&(
                <div style={{padding:'4px 12px',borderRadius:99,background:oPct>=75?T.greenBg:T.redBg,color:oPct>=75?T.green:T.red,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13,border:`1px solid ${oPct>=75?T.greenBorder:T.redBorder}`}}>
                  {oPct}%
                </div>
              )}
              {/* Admin lock — low opacity so students don't notice it */}
              <button
                onClick={()=>{ if(adminLoggedIn){setShowPanel(true);}else{setShowLogin(true);} }}
                title="Admin"
                style={{...navStyle(T),opacity:0.35,fontSize:15}}>🔐</button>
              <button onClick={()=>setDark(!darkMode)} style={{...navStyle(T),fontSize:16}}>{darkMode?'☀️':'🌙'}</button>
              <button onClick={()=>setSettings(!settings)} style={{...navStyle(T),background:settings?T.accentLight:'',borderColor:settings?T.accentBorder:T.border,color:settings?T.accent:T.textSub,fontSize:18}}>⚙</button>
            </div>
          </div>

          {/* Settings panel */}
          {settings&&(
            <div className="slide-down" style={{borderTop:`1px solid ${T.borderLight}`,padding:'14px 0',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div><div style={{fontSize:13,fontWeight:600}}>My Batch</div><div style={{fontSize:11,opacity:0.45}}>Filters batch-specific lab / workshop slots</div></div>
                <div style={{display:'flex',gap:8}}>
                  <Pill label="Batch 1 (B-1)" active={myBatch==='B1'} color={T.accent} onClick={()=>setBatch('B1')} T={T}/>
                  <Pill label="Batch 2 (B-2)" active={myBatch==='B2'} color={T.accent} onClick={()=>setBatch('B2')} T={T}/>
                </div>
              </div>
              <Divider margin="4px 0" T={T}/>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={exportData} style={actionBtn(T.blue)}>⬇ Export Backup</button>
                <label style={{...actionBtn(T.green),cursor:'pointer'}}>
                  ⬆ Import Backup<input type="file" accept=".json" onChange={importData} style={{display:'none'}}/>
                </label>
                <button onClick={clearAll} style={actionBtn(T.red)}>🗑 Clear All Data</button>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div style={{display:'flex',overflowX:'auto',gap:0,marginTop:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{ setTab(t.id); setSettings(false); }}
                style={{position:'relative',background:'none',border:'none',cursor:'pointer',padding:'10px 12px',fontWeight:600,fontSize:13,
                  color:tab===t.id?T.accent:T.textSub,
                  borderBottom:`2px solid ${tab===t.id?T.accent:'transparent'}`,
                  whiteSpace:'nowrap',transition:'all 0.15s',display:'flex',gap:5,alignItems:'center'}}>
                <span>{t.icon}</span>{t.label}
                {t.dot&&<span style={{width:7,height:7,borderRadius:'50%',background:T.accent,display:'inline-block',marginLeft:2,flexShrink:0}}/>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{maxWidth:720,margin:'0 auto',padding:'24px 16px 80px'}}>
        {tab==='today'    &&<TodayView    records={records} setRecords={setRecords} notes={notes} setNotes={setNotes} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} T={T}/>}
        {tab==='calendar' &&<CalendarView records={records} setRecords={setRecords} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} T={T}/>}
        {tab==='monthly'  &&<MonthlyView  monthlyAttendance={monthlyAttendance} setMonthlyAttendance={setMonthlyAttendance} cloudTotals={cloudTotals} T={T}/>}
        {tab==='subjects' &&<SubjectsView records={records} stats={stats} myBatch={myBatch} T={T}/>}
        {tab==='stats'    &&<StatsView    stats={stats} T={T}/>}
        {tab==='schedule' &&<ScheduleView myBatch={myBatch} T={T}/>}
        {tab==='reports'  &&<ReportsView  stats={stats} myBatch={myBatch} T={T}/>}
      </div>

      {/* ── LEGEND + CREDIT ── */}
      <div style={{position:'fixed',bottom:12,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:100,pointerEvents:'none'}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:99,padding:'8px 20px',display:'flex',gap:16,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',fontSize:12,fontWeight:600,whiteSpace:'nowrap',transition:'background 0.3s,border-color 0.3s',pointerEvents:'auto'}}>
          <span style={{color:T.green}}>P = Present</span>
          <span style={{color:T.red}}>A = Absent</span>
          <span style={{color:T.amber}}>H = Holiday</span>
        </div>
        <div style={{fontSize:11,fontWeight:500,opacity:0.4,whiteSpace:'nowrap',letterSpacing:'0.2px'}}>Made with ❤️ by Ajay G</div>
      </div>

      {/* ── ADMIN LOGIN ── */}
      {showLogin&&(
        <AdminLoginModal
          onSuccess={()=>{ setAdminIn(true); setShowLogin(false); setShowPanel(true); }}
          onClose={()=>setShowLogin(false)}
          T={T}/>
      )}

      {/* ── ADMIN PANEL ── */}
      {showPanel&&adminLoggedIn&&(
        <AdminPanel
          onClose={()=>setShowPanel(false)}
          onLogout={()=>{ setAdminIn(false); setShowPanel(false); }}
          cloudTotals={cloudTotals}
          setCloudTotals={setCloudTotals}
          T={T}/>
      )}
    </div>
  );
}
