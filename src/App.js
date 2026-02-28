/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useRef } from 'react';

/* ── FIREBASE REST API ─────────────────────────────────────────────────────
   We use the Firestore REST API directly instead of the Firebase SDK.
   This avoids all WebSocket/offline issues since it's plain HTTPS fetch.
   ────────────────────────────────────────────────────────────────────────── */
const PROJECT   = 'attendance-tracker-2nd-s-4feb8';
const API_KEY   = 'AIzaSyBlTBey_GPGVwaWFH7BDTBBCTMK3OVmwxM';
const BASE      = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
// Write token — embedded in every write. Firestore Rules verify this matches.
// Students can READ freely. Only requests with this token can WRITE.
// Change this string if you ever want to invalidate all existing sessions.
const WRITE_TOKEN = 'ece_ajay_wt_7x9k2m4p';

/* Convert JS object → Firestore REST "fields" format */
function toFS(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'object') fields[k] = { mapValue: { fields: toFS(v) } };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}

/* Convert Firestore REST response → plain JS object */
function fromFS(fields) {
  if (!fields) return {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === '_wt') continue; // strip internal write token
    if (v.integerValue !== undefined)  obj[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.stringValue !== undefined)  obj[k] = v.stringValue;
    else if (v.mapValue)   obj[k] = fromFS(v.mapValue.fields);
    else if (v.nullValue !== undefined) obj[k] = null;
  }
  return obj;
}

/* Write (PATCH = upsert) a document — always includes writeToken for Rules verification */
async function fsSet(collection, docId, data) {
  const url = `${BASE}/${collection}/${docId}?key=${API_KEY}`;
  const secured = { ...data, _wt: WRITE_TOKEN }; // Rules check this field
  const body = JSON.stringify({ fields: toFS(secured) });
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.statusText); }
  return res.json();
}

/* Read a document */
async function fsGet(collection, docId) {
  const url = `${BASE}/${collection}/${docId}?key=${API_KEY}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.statusText); }
  const json = await res.json();
  return fromFS(json.fields);
}

/* Poll for changes every 10 seconds (replaces onSnapshot) */
function startPolling(collection, docId, onChange, intervalMs = 10000) {
  let lastJson = null;
  async function check() {
    try {
      const url = `${BASE}/${collection}/${docId}?key=${API_KEY}`;
      const res = await fetch(url);
      if (res.status === 404) { onChange(null); return; }
      if (!res.ok) return;
      const json = await res.json();
      const str = JSON.stringify(json.fields);
      if (str !== lastJson) { lastJson = str; onChange(fromFS(json.fields)); }
    } catch {}
  }
  check();
  const t = setInterval(check, intervalMs);
  return () => clearInterval(t);
}

/* ── GOOGLE AUTH ───────────────────────────────────────────────────────────
   Firebase Auth via popup. Firebase SDK loaded in public/index.html via CDN.
   window.firebaseAuthReady is a promise that resolves when SDK is loaded.
   ────────────────────────────────────────────────────────────────────────── */

/* Sign in with Google popup — uses Firebase compat SDK loaded via CDN in index.html */
async function signInWithGoogle() {
  if (!window.firebase) throw new Error('Firebase SDK not loaded. Please refresh and try again.');
  const cfg = { apiKey: API_KEY, authDomain: `${PROJECT}.firebaseapp.com`, projectId: PROJECT };
  // Initialize only once
  if (!window._fbApp) {
    window._fbApp = window.firebase.initializeApp(cfg);
  }
  const auth = window.firebase.auth(window._fbApp);
  const provider = new window.firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await auth.signInWithPopup(provider);
    return { uid: result.user.uid, name: result.user.displayName, email: result.user.email };
  } catch(e) {
    // Translate Firebase auth errors to readable messages
    if (e.code === 'auth/popup-blocked')    throw new Error('Popup was blocked. Please allow popups for this site and try again.');
    if (e.code === 'auth/popup-closed-by-user') throw new Error('Sign-in was cancelled.');
    if (e.code === 'auth/unauthorized-domain') throw new Error('This domain is not authorised in Firebase. Add it in Firebase Console → Authentication → Authorized domains.');
    throw new Error(e.message || 'Sign-in failed.');
  }
}

/* Save user attendance data to Firestore under their UID */
/* Get current Firebase ID token for authenticated REST calls */
async function getIdToken() {
  if (!window._fbApp) return null;
  try {
    const auth = window.firebase.auth(window._fbApp);
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch { return null; }
}

/* Save user attendance data — uses Firebase ID token for auth */
async function userSave(uid, data) {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');
  const url = `${BASE}/users/${uid}?key=${API_KEY}`;
  // Only save the fields we need for sync — skip darkMode (stays per-device)
  const toSave = {
    records:           data.records           || {},
    notes:             data.notes             || {},
    myBatch:           data.myBatch           || 'B1',
    holidays:          data.holidays          || {},
    monthlyAttendance: data.monthlyAttendance || {},
  };
  const body = JSON.stringify({ fields: toFS(toSave) });
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.statusText); }
}

/* Load user attendance data from Firestore */
async function userLoad(uid) {
  const token = await getIdToken();
  if (!token) return null;
  const url = `${BASE}/users/${uid}?key=${API_KEY}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const json = await res.json();
  return fromFS(json.fields);
}

/* Poll user data every 15s for cross-device sync */
function startUserPolling(uid, onChange, intervalMs = 15000) {
  let lastJson = null;
  async function check() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = `${BASE}/users/${uid}?key=${API_KEY}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 404) return;
      if (!res.ok) return;
      const json = await res.json();
      const str = JSON.stringify(json.fields);
      if (str !== lastJson) { lastJson = str; onChange(fromFS(json.fields)); }
    } catch {}
  }
  check();
  const t = setInterval(check, intervalMs);
  return () => clearInterval(t);
}

/* ── LOCAL STORAGE for auth state ── */
const AUTH_KEY = 'ece_auth_v1';
function loadAuth()  { try { const r=localStorage.getItem(AUTH_KEY); if(r) return JSON.parse(r); } catch{} return null; }
function saveAuth(d) { try { if(d) localStorage.setItem(AUTH_KEY, JSON.stringify(d)); else localStorage.removeItem(AUTH_KEY); } catch{} }

/* ── LOCAL STORAGE for profile (name + setup done flag) ── */
const PROFILE_KEY = 'ece_profile_v1';
function loadProfile()  { try { const r=localStorage.getItem(PROFILE_KEY); if(r) return JSON.parse(r); } catch{} return null; }
function saveProfile(d) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(d)); } catch{} }

/*
  ADMIN PASSWORD — only you know this.
  To change it: update this string + ADMIN_PW_KEY below, push to GitHub.
  Students never see this — it lives in the compiled bundle only.
*/
const ADMIN_PW = "Ajay@2026";

/*
  Firestore has ONE document: totals/monthly
  Shape: { "2026-02": { ENGG_CHEM:8, ENGG_MATHS:9, … }, "2026-03":{…} }
*/
async function cloudSave(data) {
  await fsSet('totals', 'monthly', data);
}

/* ── LOCAL STORAGE ─────────────────────────────────────────────────────────── */
const S_KEY    = 'ece_att_v6';
const LOCK_KEY = 'ece_lock_v1';

function loadS()  { try { const r=localStorage.getItem(S_KEY);    if(r) return JSON.parse(r); } catch{} return {records:{},notes:{},myBatch:'B1',darkMode:false,holidays:{},monthlyAttendance:{}}; }
function saveS(d) { try { localStorage.setItem(S_KEY, JSON.stringify(d)); } catch{} }
function loadLk() { try { const r=localStorage.getItem(LOCK_KEY); if(r) return JSON.parse(r); } catch{} return {until:0,fails:0}; }
function saveLk(d){ try { localStorage.setItem(LOCK_KEY, JSON.stringify(d)); } catch{} }

/* ── ADMIN PASSWORD — synced via Firestore ─────────────────────────────────
   We store the password (plain text) in Firestore doc: totals/adminConfig
   Only write is allowed if you already know the current password (enforced in UI).
   Reading it is public — but since it's the hash of the pw, it's safe.
   Actually we store it PLAIN but in a non-obvious doc that students have no
   reason to look at. Security = students don't know it exists.
   On second thought: let's store a simple bcrypt-style check:
   We store the password itself encrypted with a known salt using SubtleCrypto.
   Actually simplest that actually works: store pw hash in Firestore.
   SubtleCrypto SHA-256 the password, store hex. On login compare hashes.
*/
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* Save hashed password to Firestore so all devices get it */
async function cloudSavePw(newPw) {
  const hash = await sha256(newPw);
  await fsSet('totals', 'adminConfig', { pwHash: hash });
}

/* ── STYLES ────────────────────────────────────────────────────────────────── */
const _fl = document.createElement('link');
_fl.rel='stylesheet'; _fl.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap';
document.head.appendChild(_fl);
const _st = document.createElement('style');
_st.id='app-g'; document.head.appendChild(_st);
function applyGS(dark) {
  _st.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{overflow-x:hidden}
body{background:${dark?'#0f1117':'#f4f6fb'};font-family:'Poppins',sans-serif;color:${dark?'#f1f5f9':'#1a1d2e'};-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${dark?'#334155':'#d1d5db'};border-radius:99px}
button,textarea,input,select{font-family:'Poppins',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes welcomeIn{from{opacity:0;transform:translateY(32px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes welcomeOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-20px) scale(.97)}}
.fade-up{animation:fadeUp .22s ease both}.slide-down{animation:slideDown .18s ease both}`;
}
applyGS(false);

function T(dark) {
  return dark ? {
    bg:'#0f1117',surface:'#1e2130',surfaceAlt:'#262a3a',border:'#2d3348',borderLight:'#242840',
    text:'#f1f5f9',textSub:'#94a3b8',textMuted:'#64748b',
    accent:'#6366f1',accentLight:'#1e1e3a',accentBorder:'#3730a3',
    green:'#10b981',greenBg:'#064e3b',greenBorder:'#065f46',
    red:'#f87171',redBg:'#450a0a',redBorder:'#7f1d1d',
    amber:'#fbbf24',amberBg:'#451a03',amberBorder:'#78350f',
    blue:'#60a5fa',blueBg:'#1e3a5f',blueBorder:'#1d4ed8',
    purple:'#a78bfa',purpleBg:'#2e1065',purpleBorder:'#5b21b6',
  } : {
    bg:'#f4f6fb',surface:'#ffffff',surfaceAlt:'#f9fafb',border:'#e5e7eb',borderLight:'#f3f4f6',
    text:'#1a1d2e',textSub:'#6b7280',textMuted:'#9ca3af',
    accent:'#4f46e5',accentLight:'#eef2ff',accentBorder:'#c7d2fe',
    green:'#059669',greenBg:'#d1fae5',greenBorder:'#6ee7b7',
    red:'#dc2626',redBg:'#fee2e2',redBorder:'#fca5a5',
    amber:'#d97706',amberBg:'#fef3c7',amberBorder:'#fcd34d',
    blue:'#2563eb',blueBg:'#dbeafe',blueBorder:'#93c5fd',
    purple:'#7c3aed',purpleBg:'#ede9fe',purpleBorder:'#c4b5fd',
  };
}

/* ── SUBJECTS ──────────────────────────────────────────────────────────────── */
const SUBJECTS = [
  {id:'ENGG_CHEM',    name:'Engineering Chemistry',                  abbr:'ENGG. CHEM.',   teacher:'Nidhi Rai (NR)',                              type:'theory',   color:'#e11d48',semStart:'2026-02-02'},
  {id:'ENGG_MATHS',   name:'Engineering Mathematics A',              abbr:'ENGG. MATHS',   teacher:'Santosh Verma (SV)',                          type:'theory',   color:'#7c3aed',semStart:'2026-02-02'},
  {id:'IEE',          name:'Introduction to Electrical Engineering', abbr:'IEE',           teacher:'Manoj Gupta (MG)',                            type:'theory',   color:'#0891b2',semStart:'2026-02-02'},
  {id:'COMP_PROG',    name:'Computer Programming',                   abbr:'COMP. PROG.',   teacher:'Vaibhav Kant Singh (VKS)',                    type:'theory',   color:'#059669',semStart:'2026-01-27'},
  {id:'ENV_SCIENCE',  name:'Environmental Science & Ecology',        abbr:'ENV. SCIENCE',  teacher:'Vinod Kumar (VK)',                            type:'theory',   color:'#65a30d',semStart:'2026-02-02'},
  {id:'IND_CONST',    name:'Indian Constitution',                    abbr:'IND. CONST.',   teacher:'Vineeta Kumari (VK)',                         type:'theory',   color:'#d97706',semStart:'2026-02-02'},
  {id:'ENGG_WORK',    name:'Engineering Workshop Practice',          abbr:'ENGG. WORK.',   teacher:'Manish Bhaskar (MB) & Pradeep Patanwar (PP)',type:'lab',      color:'#db2777',semStart:'2026-02-02'},
  {id:'COMP_PROG_LAB',name:'Computer Programming Lab',               abbr:'CP LAB',        teacher:'Vaibhav Kant Singh (VKS)',                    type:'lab',      color:'#2563eb',semStart:'2026-01-27'},
  {id:'IEE_LAB',      name:'IEE Lab',                               abbr:'IEE LAB',       teacher:'Manoj Gupta (MG)',                            type:'lab',      color:'#0891b2',semStart:'2026-02-02'},
  {id:'ENGG_CHEM_LAB',name:'Engineering Chemistry Lab',              abbr:'CHEM LAB',      teacher:'Nidhi Rai (NR) & B. Mandal (BM)',            type:'lab',      color:'#e11d48',semStart:'2026-02-02'},
  {id:'SPORTS_YOGA',  name:'Sports & Yoga',                         abbr:'SPORTS & YOGA', teacher:'Ratin Jogi',                                 type:'activity', color:'#16a34a',semStart:'2026-02-02'},
];
const SEM_END='2026-04-30';
const MIN_ATT=75;
const subjectMap=Object.fromEntries(SUBJECTS.map(s=>[s.id,s]));

/* ── TIMETABLE ─────────────────────────────────────────────────────────────── */
const TT = {
  MON:[{id:'COMP_PROG',time:'10–11',startH:10,batch:'all'},{id:'ENV_SCIENCE',time:'11–12',startH:11,batch:'all'},{id:'ENGG_CHEM',time:'12–13',startH:12,batch:'all'},{id:'ENGG_CHEM_LAB',time:'14–16',startH:14,batch:'B1'},{id:'SPORTS_YOGA',time:'16–18',startH:16,batch:'all'}],
  TUE:[{id:'IEE',time:'10–11',startH:10,batch:'all'},{id:'ENGG_MATHS',time:'11–12',startH:11,batch:'all'},{id:'ENGG_CHEM',time:'12–13',startH:12,batch:'all'},{id:'COMP_PROG',time:'14–16',startH:14,batch:'B1'},{id:'IEE_LAB',time:'14–16',startH:14,batch:'B2'},{id:'COMP_PROG_LAB',time:'16–18',startH:16,batch:'B2'}],
  WED:[{id:'COMP_PROG',time:'10–11',startH:10,batch:'all'},{id:'ENGG_MATHS',time:'11–12',startH:11,batch:'all'},{id:'IEE',time:'12–13',startH:12,batch:'all'},{id:'IEE_LAB',time:'14–16',startH:14,batch:'B1'},{id:'ENGG_WORK',time:'16–18',startH:16,batch:'B2'}],
  THU:[{id:'ENV_SCIENCE',time:'10–11',startH:10,batch:'all'},{id:'ENGG_MATHS',time:'11–12',startH:11,batch:'all'},{id:'ENGG_CHEM',time:'12–13',startH:12,batch:'all'},{id:'ENGG_WORK',time:'14–16',startH:14,batch:'B1'},{id:'ENGG_CHEM_LAB',time:'14–16',startH:14,batch:'B2'}],
  FRI:[{id:'COMP_PROG',time:'10–11',startH:10,batch:'all'},{id:'ENGG_MATHS',time:'11–12',startH:11,batch:'all'},{id:'IEE',time:'12–13',startH:12,batch:'all'},{id:'IND_CONST',time:'14–15',startH:14,batch:'all'},{id:'ENGG_WORK',time:'16–18',startH:16,batch:'all'}],
};
const DAYS=['MON','TUE','WED','THU','FRI'];

/* ── DATE HELPERS ──────────────────────────────────────────────────────────── */
function today(){ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
function dayName(ds){ return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(ds+'T12:00:00').getDay()]; }
function fmtDate(ds){ return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
function fmtShort(ds){ return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }
function addDays(ds,n){ const d=new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dateRange(from,to){ const a=[]; let c=from; while(c<=to){a.push(c);c=addDays(c,1);} return a; }
function slots(dn,b){ return (TT[dn]||[]).filter(s=>s.batch==='all'||s.batch===b); }
function mk(ds){ return ds.slice(0,7); }
function mkLabel(m){ const [y,mo]=m.split('-'); return new Date(Number(y),Number(mo)-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}); }

/* ── CALC ──────────────────────────────────────────────────────────────────── */
function calcRem(batch,hols){
  const td=today(),rem={};
  SUBJECTS.forEach(s=>{rem[s.id]=0;});
  dateRange(addDays(td,1),SEM_END).forEach(date=>{
    if(hols?.[date]) return;
    const dn=dayName(date); if(dn==='SAT'||dn==='SUN') return;
    slots(dn,batch).forEach(sl=>{ if(date>=subjectMap[sl.id]?.semStart) rem[sl.id]++; });
  });
  return rem;
}
function calcTotalSched(batch,hols){
  const tot={};
  SUBJECTS.forEach(s=>{tot[s.id]=0;});
  SUBJECTS.forEach(subj=>{
    dateRange(subj.semStart,SEM_END).forEach(date=>{
      if(hols?.[date]) return;
      const dn=dayName(date); if(dn==='SAT'||dn==='SUN') return;
      slots(dn,batch).forEach(sl=>{ if(sl.id===subj.id) tot[subj.id]++; });
    });
  });
  return tot;
}
function calcStats(records,batch,hols,monthlyAtt){
  const st={};
  SUBJECTS.forEach(s=>{st[s.id]={present:0,absent:0,holiday:0,total:0};});
  const mWithEntry=new Set(Object.keys(monthlyAtt||{}));
  Object.entries(records).forEach(([date,dr])=>{
    if(hols?.[date]) return;
    if(mWithEntry.has(mk(date))) return;
    const dn=dayName(date);
    slots(dn,batch).forEach((sl,i)=>{
      const val=dr[`${sl.id}__${i}`];
      if(!val||!st[sl.id]) return;
      if(date<subjectMap[sl.id]?.semStart) return;
      st[sl.id].total++;
      if(val==='P') st[sl.id].present++;
      else if(val==='A') st[sl.id].absent++;
      else if(val==='H') st[sl.id].holiday++;
    });
  });
  Object.values(monthlyAtt||{}).forEach(sd=>{
    Object.entries(sd).forEach(([id,e])=>{
      if(!st[id]) return;
      st[id].total  +=(e.total||0);
      st[id].present+=(e.present||0);
      st[id].absent +=Math.max(0,(e.total||0)-(e.present||0));
    });
  });
  const rem=calcRem(batch,hols), totSched=calcTotalSched(batch,hols);
  SUBJECTS.forEach(s=>{
    const x=st[s.id];
    x.pct=x.total>0?Math.round((x.present/x.total)*100):null;
    const r=rem[s.id]||0,tf=x.total+r;
    x.canBunkTotal=tf>0?Math.max(0,Math.floor(x.present+r-(MIN_ATT/100)*tf)):0;
    x.classesNeeded=(x.pct!==null&&x.pct<MIN_ATT)?Math.ceil((MIN_ATT*x.total-100*x.present)/(100-MIN_ATT)):0;
    x.projectedPct=totSched[s.id]>0?Math.round(((x.present+r)/totSched[s.id])*100):null;
    x.remainingClasses=r; x.totalScheduled=totSched[s.id];
  });
  return st;
}

/* ── PDF ───────────────────────────────────────────────────────────────────── */
function genPDF(stats,batch,period){
  const now=new Date(),lbl=period==='biweekly'?'Bi-Weekly':'Monthly';
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const ov=totT>0?Math.round((totP/totT)*100):0;
  const rows=SUBJECTS.map(s=>{
    const x=stats[s.id],pct=x.pct??0;
    return `<tr><td>${s.name}</td><td>${s.type}</td><td>${x.present}</td><td>${x.absent}</td><td>${x.total}</td>
    <td style="font-weight:700;color:${pct>=75?'#059669':pct>=60?'#d97706':'#dc2626'}">${x.pct!=null?pct+'%':'—'}</td>
    <td style="color:${(x.projectedPct||0)>=75?'#059669':'#dc2626'}">${x.projectedPct!=null?x.projectedPct+'%':'—'}</td>
    <td style="color:${x.canBunkTotal>0?'#059669':'#dc2626'}">${x.canBunkTotal}</td>
    <td>${pct>=75?'✅ Safe':pct>=60?'⚠️ Low':'❌ Critical'}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><title>ECE Attendance Report</title>
  <style>body{font-family:'Poppins',sans-serif;color:#111;padding:32px;max-width:960px;margin:0 auto;font-size:13px}h1{font-size:22px;color:#4f46e5;margin-bottom:4px;font-weight:700}h2{font-size:13px;color:#6b7280;font-weight:400;margin-bottom:24px}.cards{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}.card{background:#f5f6fa;border-radius:10px;padding:14px 20px;text-align:center;min-width:100px}.card .val{font-size:26px;font-weight:700;color:#4f46e5}.card .lbl{font-size:11px;color:#6b7280;margin-top:2px}table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:10px 12px;text-align:left;font-weight:600;font-size:12px}td{padding:9px 12px;border-bottom:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}.footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center}.note{margin-top:16px;background:#eef2ff;border-radius:8px;padding:10px 14px;color:#4f46e5;font-size:12px}</style></head><body>
  <h1>📡 ECE Attendance Report — ${lbl}</h1><h2>B.Tech 1st Year · 2nd Sem · AY 2025-26 · Batch ${batch} · ${now.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</h2>
  <div class="cards"><div class="card"><div class="val">${ov}%</div><div class="lbl">Overall</div></div><div class="card"><div class="val" style="color:#059669">${SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</div><div class="lbl">Safe</div></div><div class="card"><div class="val" style="color:#dc2626">${SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</div><div class="lbl">At Risk</div></div><div class="card"><div class="val">${totP}</div><div class="lbl">Present</div></div><div class="card"><div class="val">${totT-totP}</div><div class="lbl">Absent</div></div></div>
  <table><thead><tr><th>Subject</th><th>Type</th><th>Present</th><th>Absent</th><th>Total</th><th>Current %</th><th>Projected %</th><th>Can Skip</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="note">📌 "Can Skip" = classes skippable till Apr 30 while staying above 75%.</div>
  <div class="footer">Generated by ECE Attendance Tracker · Made with ❤️ by Ajay G · ${now.toLocaleString('en-IN')}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
}

/* ── UI ATOMS ──────────────────────────────────────────────────────────────── */
function Badge({children,variant='default',t}){
  const V={safe:{bg:t.greenBg,c:t.green,b:t.greenBorder},danger:{bg:t.redBg,c:t.red,b:t.redBorder},warning:{bg:t.amberBg,c:t.amber,b:t.amberBorder},info:{bg:t.blueBg,c:t.blue,b:t.blueBorder},purple:{bg:t.purpleBg,c:t.purple,b:t.purpleBorder},default:{bg:t.borderLight,c:t.textSub,b:t.border}}[variant]||{};
  return <span style={{background:V.bg,color:V.c,border:`1px solid ${V.b}`,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>{children}</span>;
}
function Pill({label,active,color,onClick,t}){
  return <button onClick={onClick} style={{padding:'6px 16px',borderRadius:99,cursor:'pointer',fontWeight:600,fontSize:13,border:active?`1.5px solid ${color}`:`1.5px solid ${t.border}`,background:active?color:t.surface,color:active?'#fff':t.textSub,transition:'all .15s'}}>{label}</button>;
}
function Ring({pct,size=64,sw=5,color,t}){
  const r=(size-sw)/2,c=2*Math.PI*r,off=pct==null?c:c-(pct/100)*c;
  const col=color||(pct==null?t.border:pct>=75?t.green:pct>=60?t.amber:t.red);
  return <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.borderLight} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{transition:'stroke-dashoffset .6s ease'}}/></svg>;
}
function AttTag({val,t}){
  if(!val) return null;
  const m={P:{l:'Present',bg:t.greenBg,c:t.green},A:{l:'Absent',bg:t.redBg,c:t.red},H:{l:'Holiday',bg:t.amberBg,c:t.amber}}[val];
  return m?<span style={{background:m.bg,color:m.c,fontWeight:600,fontSize:12,padding:'3px 10px',borderRadius:99}}>{m.l}</span>:null;
}
function MarkBtns({value,onChange,t}){
  return <div style={{display:'flex',gap:6}}>{[['P',t.green,'Present'],['A',t.red,'Absent'],['H',t.amber,'Holiday']].map(([v,col,lbl])=><button key={v} onClick={()=>onChange(value===v?null:v)} title={lbl} style={{width:36,height:36,borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace",background:value===v?col:t.borderLight,color:value===v?'#fff':t.textMuted,transition:'all .15s'}}>{v}</button>)}</div>;
}
function Card({children,style={},onClick,t}){
  const [hv,setHv]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>onClick&&setHv(true)} onMouseLeave={()=>onClick&&setHv(false)} style={{background:t.surface,borderRadius:16,border:`1px solid ${t.border}`,padding:20,cursor:onClick?'pointer':'default',boxShadow:hv?'0 8px 24px rgba(0,0,0,.12)':'0 1px 4px rgba(0,0,0,.04)',transform:hv?'translateY(-2px)':'none',transition:'box-shadow .2s,transform .2s,background .3s,border-color .3s',...style}}>{children}</div>;
}
function Div({m='12px 0',t}){ return <div style={{height:1,background:t.borderLight,margin:m}}/>; }
function SH({title,sub}){ return <div style={{marginBottom:20}}><h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-.3px'}}>{title}</h2>{sub&&<p style={{fontSize:13,opacity:.55,marginTop:3}}>{sub}</p>}</div>; }
function navBtn(t){ return {background:t.surface,border:`1px solid ${t.border}`,color:t.text,width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'background .3s,border-color .3s'}; }
function aBtn(color){ return {padding:'7px 14px',borderRadius:99,border:`1px solid ${color}33`,background:`${color}11`,color,fontWeight:600,fontSize:13,cursor:'pointer'}; }
function Spinner({color}){ return <span style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${color}44`,borderTopColor:color,display:'inline-block',animation:'spin .8s linear infinite',flexShrink:0}}/>; }

/* ════════════════════════════════════════════════════════════════════════════
   WELCOME SCREEN — shown once on first visit
   ════════════════════════════════════════════════════════════════════════════ */
function WelcomeScreen({onDone, t}) {
  const [name,      setName]      = useState('');
  const [batch,     setBatch]     = useState('');
  const [step,      setStep]      = useState('form'); // 'form'|'out'
  const [err,       setErr]       = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const nameRef = useRef(null);

  useEffect(()=>{ setTimeout(()=>nameRef.current?.focus(), 300); },[]);

  function validate() {
    if (!name.trim()) { setErr('Please enter your name.'); return false; }
    if (!batch)       { setErr('Please select your batch.'); return false; }
    setErr(''); return true;
  }

  function triggerOut(profile, user) {
    setStep('out');
    setTimeout(()=> onDone(profile, user), 350);
  }

  function continueAsGuest() {
    if (!validate()) return;
    const profile = { name: name.trim(), batch, uid: null, setupDone: true };
    saveProfile(profile); saveAuth(null);
    triggerOut(profile, null);
  }

  async function handleGoogleSignIn() {
    if (!validate()) return;
    setSigningIn(true); setErr('');
    try {
      const user = await signInWithGoogle();
      // Use entered name (not Google name) as user requested
      const profile = { name: name.trim(), batch, uid: user.uid, setupDone: true };
      saveProfile(profile); saveAuth(user);
      triggerOut(profile, user);
    } catch(e) {
      // Don't show error if user simply closed/cancelled the popup
      if (!e.message.includes('cancelled') && !e.message.includes('closed')) {
        setErr(e.message || 'Sign-in failed. Try again or continue as guest.');
      }
      setSigningIn(false);
    }
  }

  const filled = name.trim() && batch;

  return (
    // Backdrop with blur
    <div style={{position:'fixed',inset:0,zIndex:999,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20,
      background:'rgba(0,0,0,0.45)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>

      {/* Dialog card */}
      <div style={{width:'100%',maxWidth:380,background:t.surface,borderRadius:24,
        padding:'32px 28px',boxShadow:'0 32px 80px rgba(0,0,0,.35)',
        border:`1px solid ${t.border}`,
        animation:step==='out'?'welcomeOut .35s ease forwards':'welcomeIn .45s cubic-bezier(.22,1,.36,1) both'}}>

        {/* Greeting */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:10}}>👋</div>
          <h1 style={{fontSize:22,fontWeight:800,letterSpacing:'-.4px',lineHeight:1.2,marginBottom:6}}>Welcome!</h1>
          <p style={{fontSize:13,opacity:.45,lineHeight:1.6}}>Quick setup before you start.</p>
        </div>

        {/* Name input */}
        <div style={{marginBottom:16}}>
          <input ref={nameRef} type="text" placeholder="Your Name" value={name}
            onChange={e=>{setName(e.target.value);setErr('');}}
            onKeyDown={e=>e.key==='Enter'&&filled&&continueAsGuest()}
            style={{width:'100%',padding:'13px 16px',borderRadius:12,fontSize:15,fontWeight:500,
              border:`2px solid ${name.trim()?t.accent:t.border}`,
              background:t.borderLight,color:t.text,outline:'none',
              boxShadow:name.trim()?`0 0 0 3px ${t.accent}22`:'none',
              transition:'border-color .2s,box-shadow .2s'}}/>
        </div>

        {/* Batch selector */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,opacity:.4,letterSpacing:'1px',
            textTransform:'uppercase',marginBottom:10,textAlign:'center'}}>Your Batch</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {['B1','B2'].map(b=>(
              <button key={b} onClick={()=>{setBatch(b);setErr('');}}
                style={{padding:'13px 10px',borderRadius:12,cursor:'pointer',
                  fontWeight:700,fontSize:16,transition:'all .2s cubic-bezier(.22,1,.36,1)',
                  border:`2px solid ${batch===b?t.accent:t.border}`,
                  background:batch===b?t.accent:t.surface,
                  color:batch===b?'#fff':t.textSub,
                  boxShadow:batch===b?`0 4px 16px ${t.accent}44`:'none',
                  transform:batch===b?'scale(1.04)':'scale(1)'}}>
                Batch {b.replace('B','')}
                {batch===b&&<div style={{fontSize:10,fontWeight:500,marginTop:3,opacity:.85}}>✓ Selected</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {err&&<div style={{marginBottom:12,padding:'9px 13px',borderRadius:10,fontSize:12,
          fontWeight:500,textAlign:'center',background:t.redBg,color:t.red,
          border:`1px solid ${t.redBorder}`}}>{err}</div>}

        {/* Action buttons — each independently enabled by name+batch */}
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          <button onClick={continueAsGuest} disabled={signingIn}
            style={{width:'100%',padding:'13px',borderRadius:12,border:'none',
              background:filled&&!signingIn?t.accent:t.borderLight,
              color:filled&&!signingIn?'#fff':t.textMuted,
              fontWeight:700,fontSize:14,cursor:filled&&!signingIn?'pointer':'not-allowed',
              transition:'all .2s',
              boxShadow:filled&&!signingIn?`0 4px 16px ${t.accent}44`:'none'}}>
            Continue as Guest →
          </button>
          <button onClick={handleGoogleSignIn} disabled={signingIn}
            style={{width:'100%',padding:'13px',borderRadius:12,
              border:`2px solid ${filled&&!signingIn?t.border:'transparent'}`,
              background:filled&&!signingIn?t.surface:t.borderLight,
              color:filled&&!signingIn?t.text:t.textMuted,
              fontWeight:600,fontSize:13,cursor:filled&&!signingIn?'pointer':'not-allowed',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s'}}>
            {signingIn
              ? <><Spinner color={t.accent}/><span>Signing in…</span></>
              : <><svg width="16" height="16" viewBox="0 0 48 48" style={{flexShrink:0}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google — sync across devices</>
            }
          </button>
        </div>

        <p style={{textAlign:'center',fontSize:11,opacity:.25,marginTop:14,lineHeight:1.6}}>
          Guest: data stays on this device only.<br/>Google: syncs across all your devices.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN LOGIN MODAL
   ════════════════════════════════════════════════════════════════════════════ */
function AdminLogin({onSuccess,onClose,t}){
  const [pw,setPw]     = useState('');
  const [err,setErr]   = useState('');
  const [lk,setLk]     = useState(false);
  const [secs,setSecs] = useState(0);
  const [busy,setBusy] = useState(false);
  // Live cloud password hash — fetched once on open
  const [cloudHash,setCloudHash] = useState(null); // null=loading, string=ready
  const ref = useRef(null);

  useEffect(()=>{
    ref.current?.focus();
    // Lockout check
    const l=loadLk(); if(l.until>Date.now()){ setLk(true); setSecs(Math.ceil((l.until-Date.now())/1000)); }
    // Fetch current pw hash from Firestore
    fsGet('totals','adminConfig').then(data=>{
      if(data&&data.pwHash) setCloudHash(data.pwHash);
      else sha256(ADMIN_PW).then(h=>setCloudHash(h));
    }).catch(()=>sha256(ADMIN_PW).then(h=>setCloudHash(h)));
  },[]);

  useEffect(()=>{
    if(!lk) return;
    const t=setInterval(()=>{ const r=Math.ceil((loadLk().until-Date.now())/1000); if(r<=0){setLk(false);setSecs(0);clearInterval(t);}else setSecs(r); },1000);
    return ()=>clearInterval(t);
  },[lk]);

  async function submit(){
    if(lk||busy||!pw.trim()||cloudHash===null) return;
    setBusy(true);
    try{
      const h=await sha256(pw);
      if(h===cloudHash){
        saveLk({until:0,fails:0}); onSuccess();
      } else {
        const l=loadLk(), f=(l.fails||0)+1;
        if(f>=5){ const u=Date.now()+15*60*1000; saveLk({until:u,fails:0}); setLk(true); setSecs(900); setErr('Too many wrong attempts — locked 15 min.'); }
        else { saveLk({...l,fails:f}); setErr(`Wrong password. ${5-f} attempt${5-f===1?'':'s'} left.`); }
        setPw('');
      }
    } finally { setBusy(false); }
  }

  const mm=String(Math.floor(secs/60)).padStart(2,'0'), ss2=String(secs%60).padStart(2,'0');
  const loading=cloudHash===null;

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="fade-up" style={{background:t.surface,borderRadius:22,padding:32,width:'100%',maxWidth:360,boxShadow:'0 24px 64px rgba(0,0,0,.4)'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:10}}>🔐</div>
          <h2 style={{fontSize:20,fontWeight:700}}>Admin Access</h2>
          <p style={{fontSize:13,opacity:.45,marginTop:4}}>{loading?'Connecting…':'Enter admin password'}</p>
        </div>
        {lk?(
          <div style={{background:t.redBg,border:`1px solid ${t.redBorder}`,borderRadius:14,padding:20,textAlign:'center',color:t.red}}>
            <div style={{fontWeight:700,marginBottom:6}}>🔒 Locked</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:700}}>{mm}:{ss2}</div>
            <div style={{fontSize:12,marginTop:6,opacity:.7}}>Try again after timer ends.</div>
          </div>
        ):(
          <>
            <input ref={ref} type="password" placeholder="Password" value={pw} disabled={loading}
              onChange={e=>{setPw(e.target.value);setErr('');}}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              style={{width:'100%',padding:'14px 16px',borderRadius:12,border:`1.5px solid ${err?t.redBorder:t.border}`,background:t.borderLight,color:t.text,fontSize:16,outline:'none',marginBottom:10,transition:'border-color .2s',opacity:loading?.5:1}}/>
            {err&&<div style={{color:t.red,fontSize:13,textAlign:'center',marginBottom:10,fontWeight:500}}>{err}</div>}
            <button onClick={submit} disabled={busy||loading||!pw}
              style={{width:'100%',padding:14,borderRadius:12,border:'none',background:t.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:busy||loading||!pw?'not-allowed':'pointer',opacity:busy||loading||!pw?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {(busy||loading)&&<Spinner color="#fff"/>}
              {loading?'Loading…':busy?'Verifying…':'Enter Admin Panel →'}
            </button>
          </>
        )}
        <button onClick={onClose} style={{width:'100%',marginTop:10,padding:11,borderRadius:12,border:`1px solid ${t.border}`,background:'none',color:t.textSub,fontWeight:500,fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN PANEL
   ════════════════════════════════════════════════════════════════════════════ */
function AdminPanel({onClose,onLogout,cloudTotals,t}){
  const [selMonth,setSelMonth] = useState(()=>{ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; });
  const [inputs,setInputs]     = useState({});
  const [saving,setSaving]     = useState(false);
  const [saveMsg,setSaveMsg]   = useState('');
  const [saveOk,setSaveOk]     = useState(false);
  // Change password
  const [pwOpen,setPwOpen]         = useState(false);
  const [pwOld,setPwOld]           = useState('');
  const [pwNew,setPwNew]           = useState('');
  const [pwConf,setPwConf]         = useState('');
  const [pwMsg,setPwMsg]           = useState('');
  const [pwOk,setPwOk]             = useState(false);
  const [pwBusy,setPwBusy]         = useState(false);

  // Month options: Jan 2026 → current month
  const monthOpts=[];
  let c='2026-01'; const tdMk=mk(today());
  while(c<=tdMk){ monthOpts.push(c); const [y,mo]=c.split('-').map(Number); c=mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`; }
  const published=Object.keys(cloudTotals).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort();

  useEffect(()=>{
    const ex=cloudTotals[selMonth]||{};
    const init={}; SUBJECTS.forEach(s=>{init[s.id]=ex[s.id]??'';});
    setInputs(init); setSaveMsg(''); setSaveOk(false);
  },[selMonth,cloudTotals]);

  async function publish(){
    const parsed={};
    for(const s of SUBJECTS){
      const v=inputs[s.id];
      if(v===''||v===undefined){parsed[s.id]=0;continue;}
      const n=parseInt(v,10);
      if(isNaN(n)||n<0){setSaveMsg('⚠️ Enter valid numbers only.'); return;}
      parsed[s.id]=n;
    }
    setSaving(true); setSaveMsg(''); setSaveOk(false);
    try{
      const all={...cloudTotals,[selMonth]:parsed};
      // Remove internal fields before writing
      const clean={};
      Object.entries(all).forEach(([k,v])=>{ if(/^\d{4}-\d{2}$/.test(k)) clean[k]=v; });
      await cloudSave(clean);
      setSaveOk(true); setSaveMsg(`✅ Saved! ${mkLabel(selMonth)} data is now live on all devices.`);
      setTimeout(()=>{setSaveMsg('');setSaveOk(false);},5000);
    } catch(e){
      setSaveMsg(`❌ Error: ${e.message}`);
    } finally { setSaving(false); }
  }

  async function changePassword(){
    setPwMsg(''); setPwOk(false);
    if(!pwOld||!pwNew||!pwConf){setPwMsg('⚠️ Fill all three fields.'); return;}
    if(pwNew.length<6){setPwMsg('⚠️ New password must be at least 6 characters.'); return;}
    if(pwNew!==pwConf){setPwMsg('⚠️ New passwords do not match.'); return;}
    if(pwOld===pwNew){setPwMsg('⚠️ New password must be different.'); return;}
    setPwBusy(true);
    try{
      // Fetch current hash from cloud to verify old password
      const data=await fsGet('totals','adminConfig');
      let currentHash;
      if(data&&data.pwHash) currentHash=data.pwHash;
      else currentHash=await sha256(ADMIN_PW); // first time, default pw
      const oldHash=await sha256(pwOld);
      if(oldHash!==currentHash){setPwMsg('❌ Current password is incorrect.'); return;}
      // Save new hash to Firestore
      await cloudSavePw(pwNew);
      setPwOk(true); setPwMsg('✅ Password updated! All devices will now use the new password.');
      setPwOld(''); setPwNew(''); setPwConf('');
      setTimeout(()=>{setPwOpen(false);setPwMsg('');setPwOk(false);},3000);
    } catch(e){
      setPwMsg(`❌ Error: ${e.message}`);
    } finally { setPwBusy(false); }
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:t.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:720,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 -8px 48px rgba(0,0,0,.3)'}}>

        {/* Header */}
        <div style={{padding:'18px 20px 14px',borderBottom:`1px solid ${t.borderLight}`,flexShrink:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:t.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🔐</div>
            <div><div style={{fontWeight:700,fontSize:16}}>Admin Panel</div><div style={{fontSize:11,opacity:.4}}>Only you can see this</div></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onLogout} style={{...aBtn(t.amber),fontSize:12,padding:'5px 12px'}}>Logout</button>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',opacity:.35,fontSize:22,color:t.text}}>✕</button>
          </div>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:20,display:'flex',flexDirection:'column',gap:20}}>

          {/* ── Monthly totals ── */}
          <div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📋 Set Monthly Class Totals</div>
            <p style={{fontSize:13,opacity:.5,lineHeight:1.65,marginBottom:16}}>
              Select a month, enter the <strong>total classes held</strong> for each subject, then tap <strong>Publish</strong>. It will instantly show on every student's device.
            </p>

            {/* Month selector */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              {monthOpts.map(m=>(
                <button key={m} onClick={()=>setSelMonth(m)} style={{position:'relative',padding:'7px 14px',borderRadius:99,fontWeight:600,fontSize:13,cursor:'pointer',border:`1.5px solid ${selMonth===m?t.accent:t.border}`,background:selMonth===m?t.accent:t.surface,color:selMonth===m?'#fff':t.textSub,transition:'all .15s'}}>
                  {mkLabel(m)}
                  {published.includes(m)&&<span style={{position:'absolute',top:-3,right:-3,width:8,height:8,borderRadius:'50%',background:t.green,border:`2px solid ${t.surface}`}}/>}
                </button>
              ))}
            </div>

            {/* Subject inputs */}
            <div style={{background:t.borderLight,borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,opacity:.45,letterSpacing:'1px',textTransform:'uppercase',marginBottom:14}}>{mkLabel(selMonth)} — Total classes held</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {SUBJECTS.map(s=>(
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:4,height:38,borderRadius:99,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div><div style={{fontSize:11,opacity:.35}}>{s.type}</div></div>
                    <input type="number" min="0" placeholder="0" value={inputs[s.id]??''}
                      onChange={e=>{setInputs({...inputs,[s.id]:e.target.value});setSaveMsg('');setSaveOk(false);}}
                      style={{width:74,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${t.border}`,background:t.surface,color:t.text,fontSize:15,fontWeight:700,textAlign:'center',outline:'none',fontFamily:"'DM Mono',monospace"}}/>
                  </div>
                ))}
              </div>
            </div>

            {saveMsg&&<div style={{marginBottom:12,padding:'11px 14px',borderRadius:11,fontSize:13,fontWeight:500,background:saveOk?t.greenBg:saving?t.borderLight:t.redBg,color:saveOk?t.green:saving?t.textSub:t.red,border:`1px solid ${saveOk?t.greenBorder:saving?t.border:t.redBorder}`,display:'flex',alignItems:'center',gap:8}}>{saving&&<Spinner color={t.textSub}/>}{saveMsg}</div>}

            <button onClick={publish} disabled={saving}
              style={{width:'100%',padding:14,borderRadius:13,border:'none',background:saveOk?t.green:t.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:saving?'not-allowed':'pointer',opacity:saving?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .3s'}}>
              {saving&&<Spinner color="#fff"/>}
              {saving?'Publishing…':saveOk?'✅ Published!':'🚀 Publish to All Devices'}
            </button>
          </div>

          {/* ── Published months summary ── */}
          {published.length>0&&(
            <>
              <Div t={t}/>
              <div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🌐 Currently Live on All Devices</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {published.map(m=>{
                    const d=cloudTotals[m]||{}, n=SUBJECTS.filter(s=>(d[s.id]||0)>0).length;
                    return(
                      <div key={m} style={{background:t.borderLight,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                        <div><div style={{fontWeight:600,fontSize:14}}>{mkLabel(m)}</div><div style={{fontSize:12,opacity:.45,marginTop:2}}>{n}/{SUBJECTS.length} subjects have data</div></div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          <Badge variant="safe" t={t}>🟢 Live</Badge>
                          <button onClick={()=>setSelMonth(m)} style={{...aBtn(t.blue),fontSize:11,padding:'4px 10px'}}>Edit</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Div t={t}/>

          {/* ── Change password ── */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:pwOpen?14:0}}>
              <div><div style={{fontWeight:700,fontSize:15}}>🔑 Change Admin Password</div>{!pwOpen&&<div style={{fontSize:12,opacity:.4,marginTop:2}}>Password syncs to all devices instantly</div>}</div>
              <button disabled={pwBusy} onClick={()=>{if(!pwBusy){setPwOpen(!pwOpen);setPwMsg('');setPwOk(false);setPwOld('');setPwNew('');setPwConf('');} }}
                style={{...aBtn(t.purple),fontSize:12,padding:'5px 12px',opacity:pwBusy?.4:1,cursor:pwBusy?'not-allowed':'pointer'}}>
                {pwOpen?'Cancel':'Change Password'}
              </button>
            </div>
            {pwOpen&&(
              <div className="slide-down" style={{display:'flex',flexDirection:'column',gap:10}}>
                {[['Current password','Current','password',pwOld,setPwOld],['New password (min 6 chars)','New password','new-password',pwNew,setPwNew],['Confirm new password','Confirm new','new-password',pwConf,setPwConf]].map(([label,ph,ac,val,set])=>(
                  <div key={label}>
                    <label style={{fontSize:12,fontWeight:600,opacity:.5,display:'block',marginBottom:5}}>{label}</label>
                    <input type="password" autoComplete={ac} placeholder={ph} value={val} disabled={pwBusy}
                      onChange={e=>{set(e.target.value);setPwMsg('');setPwOk(false);}}
                      style={{width:'100%',padding:'11px 14px',borderRadius:10,border:`1.5px solid ${t.border}`,background:t.borderLight,color:t.text,fontSize:15,outline:'none',opacity:pwBusy?.5:1}}/>
                  </div>
                ))}
                {pwMsg&&(
                  <div style={{padding:'11px 14px',borderRadius:11,fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:8,background:pwOk?t.greenBg:pwBusy?t.borderLight:t.redBg,color:pwOk?t.green:pwBusy?t.textSub:t.red,border:`1px solid ${pwOk?t.greenBorder:pwBusy?t.border:t.redBorder}`}}>
                    {pwBusy&&<Spinner color={t.textSub}/>}{pwMsg}
                  </div>
                )}
                <button onClick={changePassword} disabled={pwBusy||pwOk}
                  style={{padding:13,borderRadius:12,border:'none',background:pwOk?t.green:t.accent,color:'#fff',fontWeight:700,fontSize:14,cursor:pwBusy||pwOk?'not-allowed':'pointer',opacity:pwBusy||pwOk?.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .3s'}}>
                  {pwBusy&&<Spinner color="#fff"/>}
                  {pwBusy?'Updating…':pwOk?'✅ Done!':'Update Password on All Devices →'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MONTHLY VIEW (STUDENT)
   ════════════════════════════════════════════════════════════════════════════ */
function MonthlyView({monthlyAtt,setMonthlyAtt,cloudTotals,t}){
  const published=Object.keys(cloudTotals).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort();
  const [selM,setSelM]=useState(published[published.length-1]||'');
  const [entries,setEntries]=useState({});
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    if(!selM) return;
    const ex=monthlyAtt?.[selM]||{};
    const init={}; SUBJECTS.forEach(s=>{init[s.id]=ex[s.id]?.present??'';});
    setEntries(init); setSaved(false);
  },[selM,monthlyAtt]);

  if(published.length===0) return(
    <div className="fade-up" style={{textAlign:'center',padding:'64px 20px'}}>
      <div style={{fontSize:50,marginBottom:14}}>⏳</div>
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:8}}>Not Published Yet</h2>
      <p style={{fontSize:14,opacity:.5,lineHeight:1.7}}>The admin hasn't published the monthly data yet.<br/>It will appear here automatically once published.</p>
    </div>
  );

  const totals=cloudTotals[selM]||{};

  function save(){
    for(const s of SUBJECTS){
      const v=entries[s.id], total=totals[s.id]||0;
      if(v===''||v===undefined) continue;
      const n=parseInt(v,10);
      if(isNaN(n)||n<0){alert('Enter valid numbers only.');return;}
      if(n>total){alert(`${s.name}: cannot attend more than ${total} classes held.`);return;}
    }
    const parsed={};
    SUBJECTS.forEach(s=>{
      const total=totals[s.id]||0, v=entries[s.id];
      const present=v===''||v===undefined?0:Math.max(0,parseInt(v,10)||0);
      parsed[s.id]={total,present};
    });
    setMonthlyAtt({...(monthlyAtt||{}),[selM]:parsed});
    setSaved(true); setTimeout(()=>setSaved(false),2500);
  }

  return(
    <div className="fade-up">
      <SH title="Monthly Attendance" sub="Enter how many classes you attended from the official sheet"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {published.map(m=><button key={m} onClick={()=>setSelM(m)} style={{padding:'7px 16px',borderRadius:99,fontWeight:600,fontSize:13,cursor:'pointer',border:`1.5px solid ${selM===m?t.accent:t.border}`,background:selM===m?t.accent:t.surface,color:selM===m?'#fff':t.textSub,transition:'all .15s'}}>{mkLabel(m)}{monthlyAtt?.[m]&&<span style={{marginLeft:5,fontSize:11}}>✓</span>}</button>)}
      </div>
      {selM&&<>
        <div style={{background:t.accentLight,border:`1px solid ${t.accentBorder}`,borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:t.accent,lineHeight:1.65}}>
          📋 For each subject, enter <strong>how many classes you personally attended</strong> in {mkLabel(selM)}. The "Total Held" numbers are set by the CR/admin.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
          {SUBJECTS.map(s=>{
            const total=totals[s.id]||0, val=entries[s.id];
            const present=parseInt(val,10);
            const pct=!isNaN(present)&&total>0?Math.round((present/total)*100):null;
            const tooMany=!isNaN(present)&&present>total;
            const pctColor=pct==null?t.textSub:pct>=75?t.green:pct>=60?t.amber:t.red;
            return(
              <div key={s.id} style={{background:t.surface,border:`1.5px solid ${tooMany?t.redBorder:t.border}`,borderRadius:14,padding:'14px 16px',borderLeft:`4px solid ${s.color}`}}>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{s.name}</div>
                    <div style={{fontSize:12,opacity:.45,marginTop:3}}>Total held: <strong style={{fontFamily:"'DM Mono',monospace",color:t.text,opacity:1}}>{total}</strong>{total===0&&<span style={{color:t.amber,marginLeft:6,fontSize:11}}>— not set by admin yet</span>}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                    {pct!==null&&!tooMany&&<span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:pctColor}}>{pct}%</span>}
                    <span style={{fontSize:12,opacity:.45}}>I attended:</span>
                    <input type="number" min="0" max={total} placeholder="0" value={val??''}
                      onChange={e=>{setEntries({...entries,[s.id]:e.target.value});setSaved(false);}}
                      style={{width:66,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${tooMany?t.redBorder:t.border}`,background:t.borderLight,color:t.text,fontSize:15,fontWeight:700,textAlign:'center',outline:'none',fontFamily:"'DM Mono',monospace"}}/>
                  </div>
                </div>
                {tooMany&&<div style={{marginTop:8,color:t.red,fontSize:12,fontWeight:500}}>⚠️ Cannot be more than {total}</div>}
              </div>
            );
          })}
        </div>
        <button onClick={save} style={{width:'100%',padding:14,borderRadius:13,border:'none',background:saved?t.green:t.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',transition:'background .3s'}}>
          {saved?`✅ Saved! Your ${mkLabel(selM)} attendance is updated.`:`Save ${mkLabel(selM)} Attendance →`}
        </button>
      </>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TODAY VIEW
   ════════════════════════════════════════════════════════════════════════════ */
function TodayView({records,setRecords,notes,setNotes,myBatch,holidays,setHolidays,t}){
  const td=today(), dn=dayName(td), sl=slots(dn,myBatch), dr=records[td]||{}, isHol=holidays[td];
  function mark(id,i,val){ const k=`${id}__${i}`; let u; if(!val){const nr={...dr};delete nr[k];u={...records,[td]:nr};}else u={...records,[td]:{...dr,[k]:val}}; setRecords(u); }
  function markAll(){ const nr={...dr}; sl.forEach((s,i)=>{nr[`${s.id}__${i}`]='P';}); setRecords({...records,[td]:nr}); }
  function togHol(){ const u={...holidays}; if(u[td]) delete u[td]; else u[td]=true; setHolidays(u); }
  const marked=sl.filter((s,i)=>dr[`${s.id}__${i}`]).length;
  const present=sl.filter((s,i)=>dr[`${s.id}__${i}`]==='P').length;

  if(!sl.length||isHol) return(
    <div className="fade-up" style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:52,marginBottom:16}}>{isHol?'🏖️':'🎉'}</div>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>{isHol?'Holiday / No Classes':'No Classes Today!'}</h2>
      <p style={{fontSize:14,opacity:.55,marginBottom:24}}>{isHol?fmtDate(td):(dn==='SUN'||dn==='SAT'?'Enjoy your weekend.':'Free day!')}</p>
      {sl.length>0&&isHol&&<button onClick={togHol} style={{padding:'10px 24px',borderRadius:99,border:`1.5px solid ${t.border}`,background:t.surface,color:t.textSub,fontWeight:600,fontSize:14,cursor:'pointer'}}>Remove Holiday Mark</button>}
    </div>
  );

  return(
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:14}}>
        <div><h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-.3px'}}>{dn} · {fmtShort(td)}</h2><p style={{fontSize:13,opacity:.55,marginTop:2}}>Batch {myBatch}</p></div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Badge variant={marked===sl.length?'safe':'default'} t={t}>{marked}/{sl.length} marked</Badge>
          {marked>0&&<Badge variant="info" t={t}>{present}P · {marked-present}A</Badge>}
        </div>
      </div>
      <div style={{height:4,background:t.borderLight,borderRadius:99,marginBottom:14,overflow:'hidden'}}><div style={{height:'100%',width:`${sl.length?(marked/sl.length)*100:0}%`,background:t.accent,borderRadius:99,transition:'width .4s ease'}}/></div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={markAll} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${t.greenBorder}`,background:t.greenBg,color:t.green,fontWeight:600,fontSize:13,cursor:'pointer'}}>✓ Mark All Present</button>
        <button onClick={togHol} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${t.amberBorder}`,background:t.amberBg,color:t.amber,fontWeight:600,fontSize:13,cursor:'pointer'}}>🏖 Mark as Holiday</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {sl.map((slot,i)=>{
          const subj=subjectMap[slot.id], val=dr[`${slot.id}__${i}`];
          const bc=val?(val==='P'?t.greenBorder:val==='A'?t.redBorder:t.amberBorder):t.border;
          return(
            <div key={i} style={{background:t.surface,border:`1.5px solid ${bc}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'border-color .2s'}}>
              <div style={{width:4,height:46,borderRadius:99,background:subj?.color||t.border,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{subj?.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:5,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,opacity:.45,fontFamily:"'DM Mono',monospace"}}>{slot.time}</span>
                  {slot.batch!=='all'&&<Badge variant="info" t={t}>Batch {slot.batch}</Badge>}
                  <span style={{fontSize:11,opacity:.4,background:t.borderLight,padding:'2px 8px',borderRadius:99}}>{subj?.type}</span>
                </div>
              </div>
              <MarkBtns value={val} onChange={v=>mark(slot.id,i,v)} t={t}/>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:20}}>
        <label style={{fontSize:13,fontWeight:600,opacity:.55,display:'block',marginBottom:8}}>Notes for today</label>
        <textarea placeholder="Homework, reminders…" value={notes[td]||''} onChange={e=>setNotes({...notes,[td]:e.target.value})}
          style={{width:'100%',minHeight:80,background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:'12px 16px',color:t.text,fontSize:14,resize:'vertical',outline:'none',lineHeight:1.6,transition:'border-color .2s,background .3s'}}
          onFocus={e=>e.target.style.borderColor=t.accent} onBlur={e=>e.target.style.borderColor=t.border}/>
      </div>
    </div>
  );
}

/* ── CALENDAR ──────────────────────────────────────────────────────────────── */
function CalendarView({records,setRecords,myBatch,holidays,setHolidays,t}){
  const [cur,setCur]=useState(new Date());
  const [sel,setSel]=useState(null);
  const [exp,setExp]=useState(null);
  const td=today(), y=cur.getFullYear(), mo=cur.getMonth();
  const fd=new Date(y,mo,1).getDay(), dim=new Date(y,mo+1,0).getDate();
  const cells=[]; for(let i=0;i<fd;i++) cells.push(null); for(let d=1;d<=dim;d++) cells.push(d);
  function ds(d){ return `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  function info(d){ const date=ds(d),dn=dayName(date),sl=slots(dn,myBatch),dr=records[date]||{}; const marked=sl.filter((s,i)=>dr[`${s.id}__${i}`]).length,present=sl.filter((s,i)=>dr[`${s.id}__${i}`]==='P').length,absent=sl.filter((s,i)=>dr[`${s.id}__${i}`]==='A').length; return{date,dn,total:sl.length,marked,present,absent,isWE:dn==='SAT'||dn==='SUN',isHol:holidays[date]}; }
  const selSl=sel?slots(dayName(sel),myBatch):[];
  const isSelHol=sel&&holidays[sel];
  function markSlot(date,id,i,val){ const dr2=records[date]||{},k=`${id}__${i}`; let u; if(!val){const nr={...dr2};delete nr[k];u={...records,[date]:nr};}else u={...records,[date]:{...dr2,[k]:val}}; setRecords(u); }
  function togHol2(date){ const u={...holidays}; if(u[date]) delete u[date]; else u[date]=true; setHolidays(u); }
  return(
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-.3px'}}>{cur.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCur(new Date(y,mo-1,1))} style={navBtn(t)}>‹</button>
          <button onClick={()=>setCur(new Date())} style={{...navBtn(t),width:'auto',padding:'0 12px',fontSize:12}}>Today</button>
          <button onClick={()=>setCur(new Date(y,mo+1,1))} style={navBtn(t)}>›</button>
        </div>
      </div>
      <Card t={t} style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:6}}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,opacity:.35,padding:'4px 0'}}>{d}</div>)}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const {date,isWE,total,marked,present,absent,isHol}=info(d);
            const isTd=date===td,isSel=date===sel,isFut=date>td;
            let dot=null; if(isHol) dot='#f59e0b'; else if(marked>0) dot=absent>0?t.red:present===marked?t.green:t.amber;
            return(
              <div key={d} onClick={()=>setSel(isSel?null:date)} style={{borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer',background:isSel?t.accentLight:isTd?t.accentLight:'transparent',border:`1.5px solid ${isSel?t.accent:isTd?t.accentBorder:'transparent'}`,opacity:isWE?.3:isFut?.4:1,transition:'all .15s'}}>
                <div style={{fontSize:13,fontWeight:isTd?700:400,color:isTd?t.accent:t.text}}>{d}</div>
                {dot?<div style={{width:5,height:5,borderRadius:'50%',background:dot,margin:'3px auto 0'}}/>:total>0?<div style={{width:4,height:4,borderRadius:'50%',background:t.border,margin:'4px auto 0'}}/>:null}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:14,paddingTop:12,borderTop:`1px solid ${t.borderLight}`,flexWrap:'wrap'}}>
          {[{c:t.green,l:'All Present'},{c:t.red,l:'Has Absent'},{c:t.amber,l:'Partial'},{c:'#f59e0b',l:'Holiday'},{c:t.border,l:'No data'}].map(({c,l})=><div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,opacity:.6}}><div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}</div>)}
        </div>
      </Card>
      {sel&&(
        <div className="slide-down" style={{marginTop:14}}>
          <Card t={t}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div><div style={{fontWeight:700,fontSize:16}}>{fmtDate(sel)}</div><div style={{fontSize:12,opacity:.45,marginTop:2}}>Batch {myBatch}{sel>td&&' · Future (view only)'}</div></div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {sel<=td&&<button onClick={()=>togHol2(sel)} style={{padding:'5px 12px',borderRadius:99,border:`1px solid ${t.amberBorder}`,background:isSelHol?t.amber:t.amberBg,color:isSelHol?'#fff':t.amber,fontWeight:600,fontSize:12,cursor:'pointer'}}>{isSelHol?'Remove Holiday':'🏖 Holiday'}</button>}
                <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',opacity:.4,fontSize:20,color:t.text}}>✕</button>
              </div>
            </div>
            {isSelHol?<p style={{opacity:.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>Marked as Holiday.</p>
              :selSl.length===0?<p style={{opacity:.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>No classes scheduled.</p>
              :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                {selSl.map((slot,i)=>{
                  const subj=subjectMap[slot.id], val=(records[sel]||{})[`${slot.id}__${i}`];
                  const isExp2=exp===`${sel}__${i}`;
                  if(sel<subj?.semStart) return null;
                  return(
                    <div key={i} style={{border:`1px solid ${t.border}`,borderRadius:12,overflow:'hidden'}}>
                      <div onClick={()=>sel<=td&&setExp(isExp2?null:`${sel}__${i}`)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:isExp2?t.borderLight:t.surface,cursor:sel>td?'default':'pointer',borderLeft:`3px solid ${subj?.color||t.border}`}}>
                        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{subj?.name}</div><div style={{fontSize:11,opacity:.45,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{slot.time}</div></div>
                        {val?<AttTag val={val} t={t}/>:<span style={{fontSize:12,opacity:.35}}>{sel>td?'upcoming':'tap to mark'}</span>}
                        {sel<=td&&<span style={{opacity:.3,fontSize:12}}>{isExp2?'▲':'▼'}</span>}
                      </div>
                      {isExp2&&sel<=td&&<div style={{padding:'12px 14px',background:t.surface,borderTop:`1px solid ${t.borderLight}`}}><MarkBtns value={val} onChange={v=>markSlot(sel,slot.id,i,v)} t={t}/></div>}
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

/* ── SUBJECTS VIEW ─────────────────────────────────────────────────────────── */
function SubjectsView({records,stats,myBatch,t}){
  const [sel,setSel]=useState(null),[ft,setFt]=useState('all');
  if(sel) return <SubjectDetail id={sel} records={records} stats={stats} myBatch={myBatch} onBack={()=>setSel(null)} t={t}/>;
  const filtered=ft==='all'?SUBJECTS:SUBJECTS.filter(s=>s.type===ft);
  return(
    <div className="fade-up">
      <SH title="All Subjects" sub="Tap for detailed history & forecasts"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All'],['theory','Theory'],['lab','Labs'],['activity','Activity']].map(([v,l])=><Pill key={v} label={l} active={ft===v} color={t.accent} onClick={()=>setFt(v)} t={t}/>)}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(s=>{
          const x=stats[s.id],pct=x.pct;
          const variant=pct==null?'default':pct>=75?'safe':pct>=60?'warning':'danger';
          const hint=pct==null?'No data yet':pct>=75?`Safe · can skip ${x.canBunkTotal} more`:pct>=60?`Low · need ${x.classesNeeded} more`:`Critical · need ${x.classesNeeded} more`;
          return(
            <div key={s.id} onClick={()=>setSel(s.id)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',borderLeft:`4px solid ${s.color}`,transition:'box-shadow .2s'}} onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,.1)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{position:'relative',flexShrink:0}}><Ring pct={pct} size={54} sw={5} color={s.color} t={t}/><div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>{pct!=null?`${pct}%`:'—'}</div></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.3}}>{s.name}</div>
                <div style={{fontSize:12,opacity:.45,marginTop:2}}>{s.teacher}</div>
                <div style={{display:'flex',gap:8,marginTop:7,alignItems:'center',flexWrap:'wrap'}}>
                  <Badge variant={variant} t={t}>{hint}</Badge>
                  {x.canBunkTotal>0&&<Badge variant="purple" t={t}>🗓 {x.canBunkTotal} left till sem end</Badge>}
                </div>
              </div>
              <span style={{opacity:.25,fontSize:18,flexShrink:0}}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function SubjectDetail({id,records,stats,myBatch,onBack,t}){
  const subj=subjectMap[id], x=stats[id];
  const hist=[];
  Object.entries(records).forEach(([date,dr])=>{ slots(dayName(date),myBatch).forEach((sl,i)=>{ if(sl.id===id){const val=dr[`${sl.id}__${i}`];if(val) hist.push({date,time:sl.time,val});} }); });
  hist.sort((a,b)=>b.date.localeCompare(a.date));
  const pct=x.pct;
  return(
    <div className="fade-up">
      <button onClick={onBack} style={{background:'none',border:'none',color:t.accent,cursor:'pointer',fontWeight:600,fontSize:14,marginBottom:18,padding:0,display:'flex',alignItems:'center',gap:4}}>← Back</button>
      <Card t={t} style={{marginBottom:14,borderLeft:`5px solid ${subj.color}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:subj.color,marginBottom:6}}>{subj.type}</div><h2 style={{fontSize:19,fontWeight:700,letterSpacing:'-.3px',lineHeight:1.3}}>{subj.name}</h2><p style={{fontSize:13,opacity:.45,marginTop:4}}>{subj.teacher}</p></div>
          <div style={{position:'relative',flexShrink:0}}><Ring pct={pct} size={80} sw={7} color={subj.color} t={t}/><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700}}>{pct!=null?`${pct}%`:'—'}</span></div></div>
        </div>
        <Div t={t}/>
        <div style={{display:'flex'}}>
          {[{v:x.present,l:'Present',c:t.green},{v:x.absent,l:'Absent',c:t.red},{v:x.holiday||0,l:'Holiday',c:t.amber},{v:x.total,l:'Total',c:t.text}].map(({v,l,c},i,a)=><div key={l} style={{flex:1,textAlign:'center',borderRight:i<a.length-1?`1px solid ${t.borderLight}`:'none'}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:11,opacity:.45,marginTop:2}}>{l}</div></div>)}
        </div>
        <Div t={t} m="14px 0"/>
        <div style={{fontSize:12,fontWeight:700,opacity:.5,letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Semester Forecast</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style={{background:t.borderLight,borderRadius:10,padding:'10px 14px'}}><div style={{fontSize:11,opacity:.5,marginBottom:3}}>Remaining classes</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700}}>{x.remainingClasses}</div></div>
          <div style={{background:t.borderLight,borderRadius:10,padding:'10px 14px'}}><div style={{fontSize:11,opacity:.5,marginBottom:3}}>Projected final %</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:(x.projectedPct||0)>=75?t.green:t.red}}>{x.projectedPct!=null?`${x.projectedPct}%`:'—'}</div></div>
        </div>
        {x.canBunkTotal>0&&<div style={{background:t.greenBg,border:`1px solid ${t.greenBorder}`,borderRadius:10,padding:'12px 14px',color:t.green,fontSize:13,fontWeight:500,marginBottom:8}}>✅ You can skip <strong>{x.canBunkTotal}</strong> more class{x.canBunkTotal===1?'':'es'} till semester end and stay above 75%</div>}
        {x.canBunkTotal===0&&x.pct!==null&&<div style={{background:t.redBg,border:`1px solid ${t.redBorder}`,borderRadius:10,padding:'12px 14px',color:t.red,fontSize:13,fontWeight:500,marginBottom:8}}>⚠️ No more classes can be missed — attend all remaining {x.remainingClasses}</div>}
        {x.classesNeeded>0&&<div style={{background:t.redBg,border:`1px solid ${t.redBorder}`,borderRadius:10,padding:'12px 14px',color:t.red,fontSize:13,fontWeight:500}}>🚨 Attend <strong>{x.classesNeeded}</strong> more consecutive classes to reach 75% right now</div>}
      </Card>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>History ({hist.length})</h3>
      {hist.length===0?<p style={{opacity:.35,fontSize:14,textAlign:'center',padding:'40px 0'}}>No daily markings yet.</p>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>{hist.map((c,i)=><div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:500,fontSize:14}}>{fmtDate(c.date)}</div><div style={{fontSize:12,opacity:.35,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{c.time}</div></div><AttTag val={c.val} t={t}/></div>)}</div>}
    </div>
  );
}

/* ── STATS ─────────────────────────────────────────────────────────────────── */
function StatsView({stats,t}){
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0), totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  const safe=SUBJECTS.filter(s=>stats[s.id].pct>=75).length, risk=SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length, noData=SUBJECTS.filter(s=>stats[s.id].pct==null).length;
  const sorted=[...SUBJECTS].sort((a,b)=>(stats[b.id].pct||0)-(stats[a.id].pct||0));
  const best=sorted.find(s=>stats[s.id].pct!=null), worst=[...sorted].reverse().find(s=>stats[s.id].pct!=null);
  return(
    <div className="fade-up">
      <SH title="Statistics" sub="Semester overview"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[{l:'Overall',v:oPct!=null?`${oPct}%`:'—',c:oPct==null?t.textSub:oPct>=75?t.green:t.red,bg:oPct==null?t.borderLight:oPct>=75?t.greenBg:t.redBg},{l:'Safe',v:safe,c:t.green,bg:t.greenBg},{l:'At Risk',v:risk,c:t.red,bg:t.redBg},{l:'No Data',v:noData,c:t.textSub,bg:t.borderLight}].map(({l,v,c,bg})=><div key={l} style={{background:bg,borderRadius:14,padding:16,textAlign:'center'}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:26,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:12,opacity:.55,marginTop:4}}>{l}</div></div>)}
      </div>
      {(best||worst)&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:16}}>
        {best&&<Card t={t} style={{padding:16}}><div style={{fontSize:12,opacity:.45,marginBottom:6,fontWeight:600}}>🏆 Best Subject</div><div style={{fontWeight:700,fontSize:14,color:t.green,marginBottom:2}}>{best.name}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:t.green}}>{stats[best.id].pct}%</div></Card>}
        {worst&&worst.id!==best?.id&&<Card t={t} style={{padding:16}}><div style={{fontSize:12,opacity:.45,marginBottom:6,fontWeight:600}}>⚠️ Needs Attention</div><div style={{fontWeight:700,fontSize:14,color:t.red,marginBottom:2}}>{worst.name}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:t.red}}>{stats[worst.id].pct}%</div></Card>}
      </div>}
      <Card t={t}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Subject-wise Attendance</h3>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {sorted.map(s=>{
            const x=stats[s.id],pct=x.pct,bc=pct==null?t.border:pct>=75?s.color:pct>=60?t.amber:t.red;
            return(<div key={s.id}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}><div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/><span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span></div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:8}}>{x.canBunkTotal>0&&<span style={{fontSize:11,color:t.purple,fontWeight:600}}>skip {x.canBunkTotal} more</span>}<span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:bc}}>{pct!=null?`${pct}%`:'—'}</span></div>
              </div>
              <div style={{position:'relative',height:8,background:t.borderLight,borderRadius:99,overflow:'visible'}}><div style={{height:'100%',width:`${pct||0}%`,background:bc,borderRadius:99,transition:'width .8s ease'}}/><div style={{position:'absolute',top:-4,left:'75%',width:2,height:16,background:t.textMuted,borderRadius:99,opacity:.3}}/></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:11,opacity:.45}}><span>{x.present}P · {x.absent}A · {x.total} total · {x.remainingClasses} remaining</span>{x.classesNeeded>0&&<span style={{color:t.red,opacity:1}}>Need {x.classesNeeded} more</span>}</div>
            </div>);
          })}
        </div>
        <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${t.borderLight}`,display:'flex',alignItems:'center',gap:6,fontSize:11,opacity:.35}}><div style={{width:2,height:12,background:t.textMuted,borderRadius:99}}/><span>Vertical line = 75% threshold</span></div>
      </Card>
    </div>
  );
}

/* ── SCHEDULE ──────────────────────────────────────────────────────────────── */
function ScheduleView({myBatch,t}){
  const [filter,setFilter]=useState('all');
  return(
    <div className="fade-up">
      <SH title="Weekly Schedule" sub="2nd Semester · 02 Feb – 30 Apr 2026"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All Batches'],['B1','Batch 1'],['B2','Batch 2']].map(([v,l])=><Pill key={v} label={l} active={filter===v} color={t.accent} onClick={()=>setFilter(v)} t={t}/>)}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {DAYS.map(day=>{
          const sl2=filter==='all'?TT[day]:TT[day].filter(s=>s.batch==='all'||s.batch===filter);
          if(!sl2?.length) return null;
          return(
            <Card key={day} t={t}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12,display:'flex',justifyContent:'space-between'}}>{day}<span style={{fontSize:12,fontWeight:400,opacity:.35}}>{sl2.length} slot{sl2.length>1?'s':''}</span></div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {sl2.map((slot,i)=>{
                  const subj=subjectMap[slot.id];
                  return <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:t.borderLight,borderRadius:10,borderLeft:`3px solid ${subj?.color||t.border}`}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,opacity:.45,minWidth:60,flexShrink:0}}>{slot.time}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:500}}>{subj?.name}</span>
                    <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                      {slot.batch!=='all'&&<Badge variant="info" t={t}>{slot.batch}</Badge>}
                      <span style={{fontSize:11,opacity:.4,background:t.surface,padding:'2px 8px',borderRadius:99,border:`1px solid ${t.border}`}}>{subj?.type}</span>
                    </div>
                  </div>;
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── REPORTS ───────────────────────────────────────────────────────────────── */
function ReportsView({stats,myBatch,t}){
  const [period,setPeriod]=useState('biweekly');
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0), totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  return(
    <div className="fade-up">
      <SH title="Reports" sub="Export your attendance as a printable PDF"/>
      <Card t={t} style={{marginBottom:14}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:4}}>📄 Export PDF Report</h3>
        <p style={{fontSize:13,opacity:.45,marginBottom:16}}>Opens a printable page in a new tab.</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
          <Pill label="Bi-Weekly" active={period==='biweekly'} color={t.accent} onClick={()=>setPeriod('biweekly')} t={t}/>
          <Pill label="Monthly" active={period==='monthly'} color={t.accent} onClick={()=>setPeriod('monthly')} t={t}/>
        </div>
        <div style={{background:t.borderLight,borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:11,opacity:.45,marginBottom:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>Snapshot</div>
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:oPct>=75?t.green:t.red}}>{oPct!=null?`${oPct}%`:'—'}</span><br/><span style={{fontSize:11,opacity:.45}}>Overall</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20}}>{totP}/{totT}</span><br/><span style={{fontSize:11,opacity:.45}}>Present/Total</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:t.green}}>{SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</span><br/><span style={{fontSize:11,opacity:.45}}>Safe</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:t.red}}>{SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</span><br/><span style={{fontSize:11,opacity:.45}}>At risk</span></div>
          </div>
        </div>
        <button onClick={()=>genPDF(stats,myBatch,period)} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:t.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Generate & Print PDF →</button>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [data,setData]          = useState(()=>loadS());
  const [tab,setTab]            = useState('today');
  const [settings,setSettings]  = useState(false);
  const [showLogin,setShowLogin] = useState(false);
  const [showPanel,setShowPanel] = useState(false);
  const [adminIn,setAdminIn]    = useState(false);
  const [cloudTotals,setCT]     = useState({});
  const [syncOk,setSyncOk]      = useState(false);
  const [,setTick]              = useState(0);
  // Profile & auth state
  const [profile,setProfile]    = useState(()=>loadProfile()); // {name,batch,uid,setupDone}
  const [authUser,setAuthUser]  = useState(()=>loadAuth());    // {uid,name,email} or null

  const {records,notes,myBatch='B1',darkMode=false,holidays={},monthlyAttendance={}} = data;
  const th = T(darkMode);

  useEffect(()=>{ applyGS(darkMode); },[darkMode]);

  // When profile batch changes, sync it to app data
  useEffect(()=>{
    if(profile?.batch && profile.batch !== myBatch) {
      setData(d=>{ const nd={...d,myBatch:profile.batch}; saveS(nd); return nd; });
    }
  },[profile]);

  // Cross-device sync: if logged in, poll Firestore for user data
  useEffect(()=>{
    if(!authUser?.uid) return;
    // Load user data from cloud on login
    userLoad(authUser.uid).then(d=>{
      if(d && Object.keys(d).length>0){
        const merged={...loadS(),...d,darkMode:loadS().darkMode};
        setData(merged); saveS(merged);
      }
    });
    // Poll for changes every 15s
    const stop = startUserPolling(authUser.uid, d=>{
      if(!d) return;
      setData(prev=>{
        const merged={...prev,...d,darkMode:prev.darkMode};
        saveS(merged); return merged;
      });
    });
    return stop;
  },[authUser?.uid]);

  const setRecords  = useCallback(r=>setData(d=>{ const nd={...d,records:r};       saveS(nd); if(authUser?.uid) userSave(authUser.uid,nd).catch(()=>{}); return nd; }),[authUser]);
  const setNotes    = useCallback(n=>setData(d=>{ const nd={...d,notes:n};          saveS(nd); if(authUser?.uid) userSave(authUser.uid,nd).catch(()=>{}); return nd; }),[authUser]);
  const setBatch    = useCallback(b=>setData(d=>{ const nd={...d,myBatch:b};        saveS(nd); if(authUser?.uid) userSave(authUser.uid,nd).catch(()=>{}); return nd; }),[authUser]);
  const setDark     = useCallback(v=>setData(d=>{ const nd={...d,darkMode:v};       saveS(nd); return nd; }),[]);
  const setHolidays = useCallback(h=>setData(d=>{ const nd={...d,holidays:h};       saveS(nd); if(authUser?.uid) userSave(authUser.uid,nd).catch(()=>{}); return nd; }),[authUser]);
  const setMonthlyA = useCallback(m=>setData(d=>{ const nd={...d,monthlyAttendance:m}; saveS(nd); if(authUser?.uid) userSave(authUser.uid,nd).catch(()=>{}); return nd; }),[authUser]);

  function handleWelcomeDone(prof, user) {
    setProfile(prof);
    setAuthUser(user);
    if(prof.batch !== myBatch) setBatch(prof.batch);
  }

  /* Poll Firestore every 10s for monthly totals — works on all networks */
  useEffect(()=>{
    const stop = startPolling('totals','monthly', data=>{
      if(data){
        const clean={};
        Object.entries(data).forEach(([k,v])=>{ if(/^\d{4}-\d{2}$/.test(k)) clean[k]=v; });
        setCT(clean);
      }
      setSyncOk(true);
    }, 10000);
    return stop;
  },[]);

  /* Midnight refresh */
  useEffect(()=>{
    function msTill(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,1)-n; }
    let t; const sched=()=>{ t=setTimeout(()=>{setTick(x=>x+1);sched();},msTill()); };
    sched(); return()=>clearTimeout(t);
  },[]);

  const stats = calcStats(records,myBatch,holidays,monthlyAttendance);
  const totP  = SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT  = SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct  = totT>0?Math.round((totP/totT)*100):null;
  const hasPub = Object.keys(cloudTotals).length>0;

  function exportData(){ const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ece_backup.json';a.click();URL.revokeObjectURL(u); }
  function importData(e){ const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);setData(d);saveS(d);applyGS(d.darkMode||false);alert('Imported!');}catch{alert('Invalid backup file.');}};r.readAsText(f);e.target.value=''; }
  function clearAll(){ if(window.confirm('Delete ALL your attendance data? Cannot be undone.')){const fr={records:{},notes:{},myBatch,darkMode,holidays:{},monthlyAttendance:{}};setData(fr);saveS(fr);} }

  const TABS=[
    {id:'today',icon:'📋',label:'Today'},
    {id:'calendar',icon:'📅',label:'Calendar'},
    {id:'monthly',icon:'📊',label:'Monthly',dot:hasPub},
    {id:'subjects',icon:'📚',label:'Subjects'},
    {id:'stats',icon:'📈',label:'Stats'},
    {id:'schedule',icon:'🗓',label:'Schedule'},
    {id:'reports',icon:'📤',label:'Reports'},
  ];

  return(
    <div style={{minHeight:'100vh',background:th.bg,color:th.text,transition:'background .3s,color .3s'}}>

      {/* ── HEADER ── */}
      <div style={{background:th.surface,borderBottom:`1px solid ${th.border}`,position:'sticky',top:0,zIndex:200,boxShadow:'0 1px 6px rgba(0,0,0,.06)',transition:'background .3s,border-color .3s'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,paddingBottom:10,gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:11,background:th.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:20}}>📡</span></div>
              <div>
                {profile?.name
                  ? <div style={{fontWeight:700,fontSize:16,letterSpacing:'-.3px',lineHeight:1.2}}>Hey, {profile.name.split(' ')[0]} 👋</div>
                  : <div style={{fontWeight:700,fontSize:16,letterSpacing:'-.3px',lineHeight:1.2}}>ECE Attendance</div>
                }
                <div style={{fontSize:11,opacity:.45,display:'flex',alignItems:'center',gap:5}}>
                  {authUser ? '🔄 Synced · ' : ''}B.Tech 1st Year · Sem 2
                  <span style={{width:6,height:6,borderRadius:'50%',background:syncOk?'#10b981':'#f59e0b',display:'inline-block',flexShrink:0}}/>
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
              {oPct!=null&&<div style={{padding:'4px 12px',borderRadius:99,background:oPct>=75?th.greenBg:th.redBg,color:oPct>=75?th.green:th.red,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13,border:`1px solid ${oPct>=75?th.greenBorder:th.redBorder}`}}>{oPct}%</div>}
              {/* Admin button — low opacity so students don't notice */}
              <button onClick={()=>{ if(adminIn){setShowPanel(true);}else{setShowLogin(true);} }} title="Admin" style={{...navBtn(th),opacity:.3,fontSize:15}}>🔐</button>
              <button onClick={()=>setDark(!darkMode)} style={{...navBtn(th),fontSize:16}}>{darkMode?'☀️':'🌙'}</button>
              <button onClick={()=>setSettings(!settings)} style={{...navBtn(th),background:settings?th.accentLight:'',borderColor:settings?th.accentBorder:th.border,color:settings?th.accent:th.textSub,fontSize:18}}>⚙</button>
            </div>
          </div>

          {settings&&(
            <div className="slide-down" style={{borderTop:`1px solid ${th.borderLight}`,padding:'14px 0',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div><div style={{fontSize:13,fontWeight:600}}>My Batch</div><div style={{fontSize:11,opacity:.45}}>Filters batch-specific slots</div></div>
                <div style={{display:'flex',gap:8}}><Pill label="Batch 1 (B-1)" active={myBatch==='B1'} color={th.accent} onClick={()=>setBatch('B1')} t={th}/><Pill label="Batch 2 (B-2)" active={myBatch==='B2'} color={th.accent} onClick={()=>setBatch('B2')} t={th}/></div>
              </div>
              <Div m="4px 0" t={th}/>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={exportData} style={aBtn(th.blue)}>⬇ Export Backup</button>
                <label style={{...aBtn(th.green),cursor:'pointer'}}>⬆ Import Backup<input type="file" accept=".json" onChange={importData} style={{display:'none'}}/></label>
                <button onClick={clearAll} style={aBtn(th.red)}>🗑 Clear All Data</button>
                {authUser
                  ? <button onClick={()=>{saveAuth(null);setAuthUser(null);const p={...profile,uid:null};saveProfile(p);setProfile(p);}} style={aBtn(th.amber)}>Sign Out</button>
                  : <button onClick={async()=>{try{const u=await signInWithGoogle();saveAuth(u);setAuthUser(u);const p={...profile,uid:u.uid,name:u.name||profile?.name};saveProfile(p);setProfile(p);}catch(e){alert('Sign-in failed: '+e.message);}}} style={aBtn(th.accent)}>🔄 Sign in to Sync</button>
                }
              </div>
            </div>
          )}

          <div style={{display:'flex',overflowX:'auto',gap:0,marginTop:2}}>
            {TABS.map(tb=>(
              <button key={tb.id} onClick={()=>{setTab(tb.id);setSettings(false);}} style={{position:'relative',background:'none',border:'none',cursor:'pointer',padding:'10px 12px',fontWeight:600,fontSize:13,color:tab===tb.id?th.accent:th.textSub,borderBottom:`2px solid ${tab===tb.id?th.accent:'transparent'}`,whiteSpace:'nowrap',transition:'all .15s',display:'flex',gap:5,alignItems:'center'}}>
                <span>{tb.icon}</span>{tb.label}
                {tb.dot&&<span style={{width:7,height:7,borderRadius:'50%',background:th.accent,display:'inline-block',marginLeft:2,flexShrink:0}}/>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{maxWidth:720,margin:'0 auto',padding:'24px 16px 80px'}}>
        {tab==='today'    &&<TodayView    records={records} setRecords={setRecords} notes={notes} setNotes={setNotes} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} t={th}/>}
        {tab==='calendar' &&<CalendarView records={records} setRecords={setRecords} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} t={th}/>}
        {tab==='monthly'  &&<MonthlyView  monthlyAtt={monthlyAttendance} setMonthlyAtt={setMonthlyA} cloudTotals={cloudTotals} t={th}/>}
        {tab==='subjects' &&<SubjectsView records={records} stats={stats} myBatch={myBatch} t={th}/>}
        {tab==='stats'    &&<StatsView    stats={stats} t={th}/>}
        {tab==='schedule' &&<ScheduleView myBatch={myBatch} t={th}/>}
        {tab==='reports'  &&<ReportsView  stats={stats} myBatch={myBatch} t={th}/>}
      </div>

      {/* ── LEGEND ── */}
      <div style={{position:'fixed',bottom:12,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:100,pointerEvents:'none'}}>
        <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:99,padding:'8px 20px',display:'flex',gap:16,boxShadow:'0 4px 20px rgba(0,0,0,.12)',fontSize:12,fontWeight:600,whiteSpace:'nowrap',transition:'background .3s,border-color .3s',pointerEvents:'auto'}}>
          <span style={{color:th.green}}>P = Present</span><span style={{color:th.red}}>A = Absent</span><span style={{color:th.amber}}>H = Holiday</span>
        </div>
        <div style={{fontSize:11,fontWeight:500,opacity:.4,whiteSpace:'nowrap'}}>Made with ❤️ by Ajay G</div>
      </div>

      {/* ── MODALS ── */}
      {showLogin&&<AdminLogin onSuccess={()=>{setAdminIn(true);setShowLogin(false);setShowPanel(true);}} onClose={()=>setShowLogin(false)} t={th}/>}
      {showPanel&&adminIn&&<AdminPanel onClose={()=>setShowPanel(false)} onLogout={()=>{setAdminIn(false);setShowPanel(false);}} cloudTotals={cloudTotals} t={th}/>}

      {/* ── WELCOME SCREEN — rendered on top of app so blur shows real content behind ── */}
      {!profile?.setupDone&&<WelcomeScreen onDone={handleWelcomeDone} t={th}/>}
    </div>
  );
}
