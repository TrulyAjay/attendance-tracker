import React, { useState, useCallback, useEffect } from 'react';

/* ─── FONTS & GLOBAL STYLES ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap';
document.head.appendChild(fontLink);

const styleEl = document.createElement('style');
styleEl.id = 'app-global';
document.head.appendChild(styleEl);

function applyGlobalStyles(dark) {
  styleEl.textContent = `
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
    @keyframes fadeUp   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideDown{ from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
    .fade-up   { animation: fadeUp    0.22s ease both; }
    .slide-down{ animation: slideDown 0.18s ease both; }
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
  { id:'ENGG_CHEM',     name:'Engineering Chemistry',                  abbr:'ENGG. CHEM.',   teacher:'Nidhi Rai (NR)',                                type:'theory',   color:'#e11d48', semStart:'2026-02-02' },
  { id:'ENGG_MATHS',    name:'Engineering Mathematics A',              abbr:'ENGG. MATHS',   teacher:'Santosh Verma (SV)',                            type:'theory',   color:'#7c3aed', semStart:'2026-02-02' },
  { id:'IEE',           name:'Introduction to Electrical Engineering', abbr:'IEE',           teacher:'Manoj Gupta (MG)',                              type:'theory',   color:'#0891b2', semStart:'2026-02-02' },
  { id:'COMP_PROG',     name:'Computer Programming',                   abbr:'COMP. PROG.',   teacher:'Vaibhav Kant Singh (VKS)',                      type:'theory',   color:'#059669', semStart:'2026-01-27' },
  { id:'ENV_SCIENCE',   name:'Environmental Science & Ecology',        abbr:'ENV. SCIENCE',  teacher:'Vinod Kumar (VK)',                              type:'theory',   color:'#65a30d', semStart:'2026-02-02' },
  { id:'IND_CONST',     name:'Indian Constitution',                    abbr:'IND. CONST.',   teacher:'Vineeta Kumari (VK)',                           type:'theory',   color:'#d97706', semStart:'2026-02-02' },
  { id:'ENGG_WORK',     name:'Engineering Workshop Practice',          abbr:'ENGG. WORK.',   teacher:'Manish Bhaskar (MB) & Pradeep Patanwar (PP)',  type:'lab',      color:'#db2777', semStart:'2026-02-02' },
  { id:'COMP_PROG_LAB', name:'Computer Programming Lab',               abbr:'CP LAB',        teacher:'Vaibhav Kant Singh (VKS)',                      type:'lab',      color:'#2563eb', semStart:'2026-01-27' },
  { id:'IEE_LAB',       name:'IEE Lab',                               abbr:'IEE LAB',       teacher:'Manoj Gupta (MG)',                              type:'lab',      color:'#0891b2', semStart:'2026-02-02' },
  { id:'ENGG_CHEM_LAB', name:'Engineering Chemistry Lab',              abbr:'CHEM LAB',      teacher:'Nidhi Rai (NR) & B. Mandal (BM)',              type:'lab',      color:'#e11d48', semStart:'2026-02-02' },
  { id:'SPORTS_YOGA',   name:'Sports & Yoga',                         abbr:'SPORTS & YOGA', teacher:'Ratin Jogi',                                   type:'activity', color:'#16a34a', semStart:'2026-02-02' },
];

const SEM_END = '2026-04-30'; // April 30 (note: April has 30 days, not 31)

/* batch: 'all' | 'B1' | 'B2' */
const TIMETABLE = {
  MON: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11,  batch:'all' },
    { subjectId:'ENV_SCIENCE',   time:'11:00–12:00', startH:11, endH:12,  batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13,  batch:'all' },
    { subjectId:'ENGG_CHEM_LAB', time:'14:00–16:00', startH:14, endH:16,  batch:'B1'  },
    { subjectId:'SPORTS_YOGA',   time:'16:00–18:00', startH:16, endH:18,  batch:'all' },
  ],
  TUE: [
    { subjectId:'IEE',           time:'10:00–11:00', startH:10, endH:11,  batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12,  batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13,  batch:'all' },
    { subjectId:'COMP_PROG',     time:'14:00–16:00', startH:14, endH:16,  batch:'B1'  },
    { subjectId:'IEE_LAB',       time:'14:00–16:00', startH:14, endH:16,  batch:'B2'  },
    { subjectId:'COMP_PROG_LAB', time:'16:00–18:00', startH:16, endH:18,  batch:'B2'  },
  ],
  WED: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11,  batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12,  batch:'all' },
    { subjectId:'IEE',           time:'12:00–13:00', startH:12, endH:13,  batch:'all' },
    { subjectId:'IEE_LAB',       time:'14:00–16:00', startH:14, endH:16,  batch:'B1'  },
    { subjectId:'ENGG_WORK',     time:'16:00–18:00', startH:16, endH:18,  batch:'B2'  },
  ],
  THU: [
    { subjectId:'ENV_SCIENCE',   time:'10:00–11:00', startH:10, endH:11,  batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12,  batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–13:00', startH:12, endH:13,  batch:'all' },
    { subjectId:'ENGG_WORK',     time:'14:00–16:00', startH:14, endH:16,  batch:'B1'  },
    { subjectId:'ENGG_CHEM_LAB', time:'14:00–16:00', startH:14, endH:16,  batch:'B2'  },
  ],
  FRI: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', startH:10, endH:11,  batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', startH:11, endH:12,  batch:'all' },
    { subjectId:'IEE',           time:'12:00–13:00', startH:12, endH:13,  batch:'all' },
    { subjectId:'IND_CONST',     time:'14:00–15:00', startH:14, endH:15,  batch:'all' },
    { subjectId:'ENGG_WORK',     time:'16:00–18:00', startH:16, endH:18,  batch:'all' },
  ],
};

const DAYS_ORDER = ['MON','TUE','WED','THU','FRI'];
const MIN_ATT = 75;
const subjectMap = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

/* ─── STORAGE ────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'ece_att_v5';
function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return { records:{}, notes:{}, myBatch:'B1', darkMode:false, holidays:{} };
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

/* ─── DATE HELPERS ───────────────────────────────────────────────────────── */
function getToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}
function getDayName(ds) {
  return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(ds+'T12:00:00').getDay()];
}
function formatDate(ds) {
  return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}
function formatShort(ds) {
  return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}
function addDays(ds, n) {
  const d = new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateRange(from, to) {
  const dates = []; let cur = from;
  while (cur <= to) { dates.push(cur); cur = addDays(cur, 1); }
  return dates;
}

function getSlotsForBatch(dayName, myBatch) {
  return (TIMETABLE[dayName] || []).filter(s => s.batch === 'all' || s.batch === myBatch);
}

/* ─── SEMESTER FORECASTING ───────────────────────────────────────────────── */
// Count remaining scheduled classes for each subject from today+1 to SEM_END
function calcRemainingClasses(myBatch, holidays) {
  const today = getToday();
  const remaining = {};
  SUBJECTS.forEach(s => { remaining[s.id] = 0; });

  const dates = dateRange(addDays(today, 1), SEM_END);
  dates.forEach(date => {
    if (holidays && holidays[date]) return;
    const dn = getDayName(date);
    if (dn === 'SAT' || dn === 'SUN') return;
    const slots = getSlotsForBatch(dn, myBatch);
    slots.forEach(slot => {
      const subj = subjectMap[slot.subjectId];
      if (!subj) return;
      if (date >= subj.semStart) remaining[slot.subjectId]++;
    });
  });
  return remaining;
}

// Count total scheduled classes for each subject from semStart to SEM_END
function calcTotalScheduled(myBatch, holidays) {
  const total = {};
  SUBJECTS.forEach(s => { total[s.id] = 0; });

  SUBJECTS.forEach(subj => {
    const dates = dateRange(subj.semStart, SEM_END);
    dates.forEach(date => {
      if (holidays && holidays[date]) return;
      const dn = getDayName(date);
      if (dn === 'SAT' || dn === 'SUN') return;
      const slots = getSlotsForBatch(dn, myBatch);
      slots.forEach(slot => {
        if (slot.subjectId === subj.id) total[subj.id]++;
      });
    });
  });
  return total;
}

/* ─── ATTENDANCE STATS ───────────────────────────────────────────────────── */
function calcStats(records, myBatch, holidays) {
  const stats = {};
  SUBJECTS.forEach(s => { stats[s.id] = { present:0, absent:0, holiday:0, total:0 }; });

  Object.entries(records).forEach(([date, dayRec]) => {
    if (holidays && holidays[date]) return;
    const dn = getDayName(date);
    const slots = getSlotsForBatch(dn, myBatch);
    slots.forEach((slot, idx) => {
      const val = dayRec[`${slot.subjectId}__${idx}`];
      if (val && stats[slot.subjectId]) {
        const subj = subjectMap[slot.subjectId];
        if (date < subj.semStart) return; // ignore classes before sem start
        stats[slot.subjectId].total++;
        if (val === 'P') stats[slot.subjectId].present++;
        else if (val === 'A') stats[slot.subjectId].absent++;
        else if (val === 'H') stats[slot.subjectId].holiday++;
      }
    });
  });

  const remaining = calcRemainingClasses(myBatch, holidays);
  const totalScheduled = calcTotalScheduled(myBatch, holidays);

  SUBJECTS.forEach(s => {
    const st = stats[s.id];
    st.pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : null;

    // How many more can I skip and still end at 75%?
    // Need: present / (total + remaining) >= 0.75
    // Max absences from now: floor((present + remaining) - 0.75*(total+remaining))
    //                      = floor(present + remaining - 0.75*total - 0.75*remaining)
    //                      = floor(present + 0.25*remaining - 0.75*total)
    const rem = remaining[s.id] || 0;
    const totalFuture = st.total + rem;
    const canBunkFuture = totalFuture > 0
      ? Math.max(0, Math.floor(st.present + rem - MIN_ATT / 100 * totalFuture))
      : 0;
    st.canBunkTotal = canBunkFuture; // can skip from now to end of sem

    // Current canBunk (already above 75% right now)
    st.canBunk = (st.pct !== null && st.pct >= MIN_ATT)
      ? Math.floor((100 * st.present - MIN_ATT * st.total) / MIN_ATT) : 0;

    // Classes needed to reach 75% NOW
    st.classesNeeded = (st.pct !== null && st.pct < MIN_ATT)
      ? Math.ceil((MIN_ATT * st.total - 100 * st.present) / (100 - MIN_ATT)) : 0;

    // Projected final % if attend all remaining
    st.projectedPct = totalScheduled[s.id] > 0
      ? Math.round(((st.present + rem) / totalScheduled[s.id]) * 100)
      : null;

    st.remainingClasses = rem;
    st.totalScheduled = totalScheduled[s.id];
  });

  return stats;
}

/* ─── PDF EXPORT ─────────────────────────────────────────────────────────── */
function generatePDF(records, stats, myBatch, holidays, period) {
  const now = new Date();
  const label = period === 'biweekly' ? 'Bi-Weekly' : 'Monthly';
  const totP = SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT = SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const overall = totT > 0 ? Math.round((totP/totT)*100) : 0;

  const rows = SUBJECTS.map(s => {
    const st = stats[s.id];
    const pct = st.pct ?? 0;
    const proj = st.projectedPct ?? '—';
    const canSkip = st.canBunkTotal;
    const status = pct >= 75 ? '✅ Safe' : pct >= 60 ? '⚠️ Low' : '❌ Critical';
    return `<tr>
      <td>${s.name}</td><td>${s.type}</td>
      <td>${st.present}</td><td>${st.absent}</td><td>${st.total}</td>
      <td style="font-weight:700;color:${pct>=75?'#059669':pct>=60?'#d97706':'#dc2626'}">${st.pct!=null?pct+'%':'—'}</td>
      <td>${proj !== '—' ? proj+'%' : '—'}</td>
      <td style="color:${canSkip>0?'#059669':'#dc2626'}">${canSkip}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <title>Attendance Report</title>
  <style>
    body{font-family:'Poppins',sans-serif;color:#111;padding:32px;max-width:960px;margin:0 auto;font-size:13px}
    h1{font-size:22px;color:#4f46e5;margin-bottom:4px;font-weight:700}
    h2{font-size:13px;color:#6b7280;font-weight:400;margin-bottom:24px}
    .cards{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
    .card{background:#f5f6fa;border-radius:10px;padding:14px 20px;text-align:center;min-width:100px}
    .card .val{font-size:26px;font-weight:700;color:#4f46e5}
    .card .lbl{font-size:11px;color:#6b7280;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    th{background:#4f46e5;color:#fff;padding:10px 12px;text-align:left;font-weight:600;font-size:12px}
    td{padding:9px 12px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center}
    .note{margin-top:16px;background:#eef2ff;border-radius:8px;padding:10px 14px;color:#4f46e5;font-size:12px}
  </style></head><body>
  <h1>📡 ECE Attendance Report — ${label}</h1>
  <h2>B.Tech 1st Year · 2nd Semester · AY 2025-26 · Batch ${myBatch} · ${now.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</h2>
  <div class="cards">
    <div class="card"><div class="val">${overall}%</div><div class="lbl">Overall</div></div>
    <div class="card"><div class="val" style="color:#059669">${SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</div><div class="lbl">Safe Subjects</div></div>
    <div class="card"><div class="val" style="color:#dc2626">${SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</div><div class="lbl">At Risk</div></div>
    <div class="card"><div class="val">${totP}</div><div class="lbl">Present</div></div>
    <div class="card"><div class="val">${totT-totP}</div><div class="lbl">Absent</div></div>
  </div>
  <table>
    <thead><tr><th>Subject</th><th>Type</th><th>Present</th><th>Absent</th><th>Marked</th><th>Current %</th><th>Projected %</th><th>Can Skip</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">📌 "Can Skip" = classes you can still miss till ${SEM_END} and maintain 75% attendance.</div>
  <div class="footer">Generated by ECE Attendance Tracker · ${now.toLocaleString('en-IN')}</div>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ─── REUSABLE UI ────────────────────────────────────────────────────────── */

function Badge({ children, variant='default', T }) {
  const v = {
    safe:    {bg:T.greenBg,  color:T.green,  border:T.greenBorder},
    danger:  {bg:T.redBg,    color:T.red,    border:T.redBorder},
    warning: {bg:T.amberBg,  color:T.amber,  border:T.amberBorder},
    info:    {bg:T.blueBg,   color:T.blue,   border:T.blueBorder},
    purple:  {bg:T.purpleBg, color:T.purple, border:T.purpleBorder},
    default: {bg:T.borderLight,color:T.textSub,border:T.border},
  }[variant]||{};
  return (
    <span style={{background:v.bg,color:v.color,border:`1px solid ${v.border}`,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
      {children}
    </span>
  );
}

function Pill({ label, active, color, onClick, T }) {
  return (
    <button onClick={onClick} style={{padding:'6px 16px',borderRadius:99,cursor:'pointer',fontWeight:600,fontSize:13,border:active?`1.5px solid ${color}`:`1.5px solid ${T.border}`,background:active?color:T.surface,color:active?'#fff':T.textSub,transition:'all 0.15s'}}>
      {label}
    </button>
  );
}

function CircleProgress({ pct, size=64, stroke=5, color, T }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r;
  const offset=pct==null?circ:circ-(pct/100)*circ;
  const fill=pct==null?T.border:pct>=75?T.green:pct>=60?T.amber:T.red;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.borderLight} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color||fill} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:'stroke-dashoffset 0.6s ease'}}/>
    </svg>
  );
}

function AttTag({ val, T }) {
  if (!val) return null;
  const m={P:{l:'Present',bg:T.greenBg,c:T.green},A:{l:'Absent',bg:T.redBg,c:T.red},H:{l:'Holiday',bg:T.amberBg,c:T.amber}}[val];
  if (!m) return null;
  return <span style={{background:m.bg,color:m.c,fontWeight:600,fontSize:12,padding:'3px 10px',borderRadius:99}}>{m.l}</span>;
}

function MarkBtns({ value, onChange, T }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {[['P',T.green,'Present'],['A',T.red,'Absent'],['H',T.amber,'Holiday']].map(([v,color,label]) => (
        <button key={v} onClick={() => onChange(value===v?null:v)} title={label} style={{
          width:36,height:36,borderRadius:10,border:'none',cursor:'pointer',
          fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace",
          background:value===v?color:T.borderLight,
          color:value===v?'#fff':T.textMuted,
          transition:'all 0.15s',
        }}>{v}</button>
      ))}
    </div>
  );
}

function Card({ children, style={}, onClick, T }) {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>onClick&&setHov(false)} style={{
      background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,padding:20,
      cursor:onClick?'pointer':'default',
      boxShadow:hov?'0 8px 24px rgba(0,0,0,0.12)':'0 1px 4px rgba(0,0,0,0.04)',
      transform:hov?'translateY(-2px)':'none',
      transition:'box-shadow 0.2s,transform 0.2s,background 0.3s,border-color 0.3s',
      ...style,
    }}>{children}</div>
  );
}

function Divider({ margin='12px 0', T }) {
  return <div style={{height:1,background:T.borderLight,margin,transition:'background 0.3s'}}/>;
}

function SectionHead({ title, sub }) {
  return (
    <div style={{marginBottom:20}}>
      <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-0.3px'}}>{title}</h2>
      {sub && <p style={{fontSize:13,opacity:0.55,marginTop:3}}>{sub}</p>}
    </div>
  );
}

function navStyle(T) {
  return {background:T.surface,border:`1px solid ${T.border}`,color:T.text,width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.3s,border-color 0.3s'};
}

function actionBtn(color) {
  return {padding:'7px 14px',borderRadius:99,border:`1px solid ${color}33`,background:`${color}11`,color,fontWeight:600,fontSize:13,cursor:'pointer'};
}

/* ─── BACK-DATE FILL MODAL ───────────────────────────────────────────────── */
function BackfillModal({ myBatch, records, setRecords, holidays, onClose, T }) {
  const today = getToday();
  // All past weekdays from earliest semStart to yesterday
  const earliest = '2026-01-27';
  const yesterday = addDays(today, -1);
  const allDates = dateRange(earliest, yesterday).filter(d => {
    const dn = getDayName(d);
    return dn!=='SAT' && dn!=='SUN' && !holidays[d] && getSlotsForBatch(dn,myBatch).length>0;
  }).reverse(); // most recent first

  const [selDate, setSelDate] = useState(allDates[0]||null);
  const slots = selDate ? getSlotsForBatch(getDayName(selDate),myBatch) : [];
  const dayRec = (records[selDate]||{});

  const unmarkedDates = allDates.filter(d=>{
    const sl=getSlotsForBatch(getDayName(d),myBatch);
    const dr=records[d]||{};
    return sl.some((_,i)=>!dr[`${sl[i]?.subjectId}__${i}`]);
  });

  function mark(subjectId, idx, val) {
    const key=`${subjectId}__${idx}`;
    let updated;
    if(!val){const nr={...dayRec};delete nr[key];updated={...records,[selDate]:nr};}
    else updated={...records,[selDate]:{...dayRec,[key]:val}};
    setRecords(updated);
  }

  function markDayAll(val) {
    const nr={...dayRec};
    slots.forEach((s,i)=>{nr[`${s.subjectId}__${i}`]=val;});
    setRecords({...records,[selDate]:nr});
  }

  const marked=slots.filter((s,i)=>dayRec[`${s.subjectId}__${i}`]).length;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:720,
        maxHeight:'90vh',display:'flex',flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{padding:'20px 20px 12px',borderBottom:`1px solid ${T.borderLight}`,flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
            <h3 style={{fontWeight:700,fontSize:17}}>📅 Mark Past Attendance</h3>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,opacity:0.4,color:T.text}}>✕</button>
          </div>
          <p style={{fontSize:13,opacity:0.5}}>
            {unmarkedDates.length > 0
              ? `${unmarkedDates.length} past day${unmarkedDates.length>1?'s':''} have unmarked classes`
              : 'All past classes are marked ✅'}
          </p>
        </div>

        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          {/* Date list */}
          <div style={{width:130,borderRight:`1px solid ${T.borderLight}`,overflowY:'auto',flexShrink:0}}>
            {allDates.map(d=>{
              const sl=getSlotsForBatch(getDayName(d),myBatch);
              const dr=records[d]||{};
              const mk=sl.filter((_,i)=>dr[`${sl[i]?.subjectId}__${i}`]).length;
              const allMk=mk===sl.length;
              const isSel=d===selDate;
              return(
                <div key={d} onClick={()=>setSelDate(d)} style={{
                  padding:'10px 12px',cursor:'pointer',borderBottom:`1px solid ${T.borderLight}`,
                  background:isSel?T.accentLight:'transparent',
                  borderLeft:`3px solid ${isSel?T.accent:'transparent'}`,
                  transition:'background 0.15s',
                }}>
                  <div style={{fontWeight:600,fontSize:12,color:isSel?T.accent:T.text}}>{formatShort(d)}</div>
                  <div style={{fontSize:10,opacity:0.5,marginTop:1}}>{getDayName(d)}</div>
                  <div style={{marginTop:4}}>
                    {allMk
                      ? <span style={{fontSize:10,color:T.green,fontWeight:600}}>✓ Done</span>
                      : <span style={{fontSize:10,color:T.amber,fontWeight:600}}>{mk}/{sl.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slot marking */}
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            {!selDate ? (
              <p style={{opacity:0.4,textAlign:'center',marginTop:40}}>Select a date</p>
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{formatDate(selDate)}</div>
                    <div style={{fontSize:12,opacity:0.5,marginTop:2}}>{marked}/{slots.length} marked</div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>markDayAll('P')} style={{...actionBtn(T.green),fontSize:12,padding:'5px 12px'}}>✓ All Present</button>
                    <button onClick={()=>markDayAll('A')} style={{...actionBtn(T.red),fontSize:12,padding:'5px 12px'}}>✗ All Absent</button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {slots.map((slot,idx)=>{
                    const subj=subjectMap[slot.subjectId];
                    const val=dayRec[`${slot.subjectId}__${idx}`];
                    // only show slot if date >= subject's semStart
                    if(selDate < subj?.semStart) return null;
                    return(
                      <div key={idx} style={{
                        background:T.borderLight,borderRadius:12,padding:'12px 14px',
                        display:'flex',alignItems:'center',gap:12,
                        borderLeft:`3px solid ${subj?.color||T.border}`,
                      }}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,lineHeight:1.3}}>{subj?.name}</div>
                          <div style={{fontSize:11,opacity:0.5,marginTop:3,fontFamily:"'DM Mono',monospace"}}>{slot.time} · {slot.batch!=='all'?`Batch ${slot.batch}`:''}</div>
                        </div>
                        <MarkBtns value={val} onChange={v=>mark(slot.subjectId,idx,v)} T={T}/>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── TODAY VIEW ─────────────────────────────────────────────────────────── */
function TodayView({ records, setRecords, notes, setNotes, myBatch, holidays, setHolidays, onOpenBackfill, T }) {
  const today = getToday();
  const dayName = getDayName(today);
  const slots = getSlotsForBatch(dayName, myBatch);
  const dayRec = records[today]||{};
  const isHoliday = holidays[today];

  function mark(subjectId, idx, val) {
    const key=`${subjectId}__${idx}`;
    let updated;
    if(!val){const nr={...dayRec};delete nr[key];updated={...records,[today]:nr};}
    else updated={...records,[today]:{...dayRec,[key]:val}};
    setRecords(updated);
  }

  function markAllPresent() {
    const nr={...dayRec};
    slots.forEach((s,i)=>{nr[`${s.subjectId}__${i}`]='P';});
    setRecords({...records,[today]:nr});
  }

  function toggleHoliday() {
    const updated={...holidays};
    if(updated[today]) delete updated[today]; else updated[today]=true;
    setHolidays(updated);
  }

  const marked=slots.filter((s,i)=>dayRec[`${s.subjectId}__${i}`]).length;
  const present=slots.filter((s,i)=>dayRec[`${s.subjectId}__${i}`]==='P').length;

  if (!slots.length || isHoliday) {
    return (
      <div className="fade-up" style={{textAlign:'center',padding:'60px 20px'}}>
        <div style={{fontSize:52,marginBottom:16}}>{isHoliday?'🏖️':'🎉'}</div>
        <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>{isHoliday?'Holiday / No Classes':'No Classes Today!'}</h2>
        <p style={{fontSize:14,opacity:0.55,marginBottom:24}}>{isHoliday?formatDate(today):(dayName==='SUN'||dayName==='SAT'?'Enjoy your weekend.':'Free day!')}</p>
        {slots.length>0&&isHoliday&&(
          <button onClick={toggleHoliday} style={{padding:'10px 24px',borderRadius:99,border:`1.5px solid ${T.border}`,background:T.surface,color:T.textSub,fontWeight:600,fontSize:14,cursor:'pointer'}}>Remove Holiday Mark</button>
        )}
        <div style={{marginTop:20}}>
          <button onClick={onOpenBackfill} style={{padding:'10px 24px',borderRadius:99,background:T.accent,color:'#fff',border:'none',fontWeight:600,fontSize:14,cursor:'pointer'}}>
            📅 Mark Past Days
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* Header */}
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

      {/* Progress */}
      <div style={{height:4,background:T.borderLight,borderRadius:99,marginBottom:14,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${slots.length?(marked/slots.length)*100:0}%`,background:T.accent,borderRadius:99,transition:'width 0.4s ease'}}/>
      </div>

      {/* Quick actions */}
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={markAllPresent} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${T.greenBorder}`,background:T.greenBg,color:T.green,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          ✓ Mark All Present
        </button>
        <button onClick={toggleHoliday} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${T.amberBorder}`,background:T.amberBg,color:T.amber,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          🏖 Mark as Holiday
        </button>
        <button onClick={onOpenBackfill} style={{padding:'7px 16px',borderRadius:99,border:`1.5px solid ${T.accentBorder}`,background:T.accentLight,color:T.accent,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          📅 Past Days
        </button>
      </div>

      {/* Slots */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {slots.map((slot,idx)=>{
          const subj=subjectMap[slot.subjectId];
          const val=dayRec[`${slot.subjectId}__${idx}`];
          const borderColor=val?(val==='P'?T.greenBorder:val==='A'?T.redBorder:T.amberBorder):T.border;
          return(
            <div key={idx} style={{background:T.surface,border:`1.5px solid ${borderColor}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'border-color 0.2s'}}>
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

      {/* Notes */}
      <div style={{marginTop:20}}>
        <label style={{fontSize:13,fontWeight:600,opacity:0.55,display:'block',marginBottom:8}}>Notes for today</label>
        <textarea placeholder="Homework, reminders..." value={notes[today]||''} onChange={e=>setNotes({...notes,[today]:e.target.value})}
          style={{width:'100%',minHeight:80,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',color:T.text,fontSize:14,resize:'vertical',outline:'none',lineHeight:1.6,transition:'border-color 0.2s,background 0.3s'}}
          onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>
      </div>
    </div>
  );
}

/* ─── CALENDAR VIEW ──────────────────────────────────────────────────────── */
function CalendarView({ records, setRecords, myBatch, holidays, setHolidays, T }) {
  const [cur,setCur]=useState(new Date());
  const [selDate,setSelDate]=useState(null);
  const [expanded,setExpanded]=useState(null);
  const today=getToday();
  const y=cur.getFullYear(),m=cur.getMonth();
  const label=cur.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  const firstDay=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=dim;d++) cells.push(d);

  function ds(d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}

  function info(d){
    const date=ds(d),dn=getDayName(date);
    const slots=getSlotsForBatch(dn,myBatch),dr=records[date]||{};
    const total=slots.length;
    const marked=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]).length;
    const present=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='P').length;
    const absent=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='A').length;
    const isWE=dn==='SAT'||dn==='SUN',isHol=holidays[date];
    return{date,dn,slots,total,marked,present,absent,isWE,isHol};
  }

  const selSlots=selDate?getSlotsForBatch(getDayName(selDate),myBatch):[];
  const isSelHol=selDate&&holidays[selDate];

  function markSlot(date,subjectId,idx,val){
    const dr=records[date]||{},key=`${subjectId}__${idx}`;
    let updated;
    if(!val){const nr={...dr};delete nr[key];updated={...records,[date]:nr};}
    else updated={...records,[date]:{...dr,[key]:val}};
    setRecords(updated);
  }

  function toggleHoliday(date){
    const u={...holidays};
    if(u[date]) delete u[date]; else u[date]=true;
    setHolidays(u);
  }

  // Disable future dates for marking
  const isFuture = (date) => date > today;

  return (
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-0.3px'}}>{label}</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCur(new Date(y,m-1,1))} style={navStyle(T)}>‹</button>
          <button onClick={()=>setCur(new Date())} style={{...navStyle(T),width:'auto',padding:'0 12px',fontSize:12}}>Today</button>
          <button onClick={()=>setCur(new Date(y,m+1,1))} style={navStyle(T)}>›</button>
        </div>
      </div>

      <Card T={T} style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:6}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
            <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,opacity:0.35,padding:'4px 0'}}>{d}</div>
          ))}
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
              <div key={d} onClick={()=>setSelDate(isSel?null:date)} style={{
                borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer',
                background:isSel?T.accentLight:isTday?T.accentLight:'transparent',
                border:`1.5px solid ${isSel?T.accent:isTday?T.accentBorder:'transparent'}`,
                opacity:isWE?0.3:isFut?0.4:1,
                transition:'all 0.15s',
              }}>
                <div style={{fontSize:13,fontWeight:isTday?700:400,color:isTday?T.accent:T.text}}>{d}</div>
                {dot?<div style={{width:5,height:5,borderRadius:'50%',background:dot,margin:'3px auto 0'}}/>
                    :total>0?<div style={{width:4,height:4,borderRadius:'50%',background:T.border,margin:'4px auto 0'}}/>:null}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,flexWrap:'wrap'}}>
          {[{c:T.green,l:'All Present'},{c:T.red,l:'Has Absent'},{c:T.amber,l:'Partial'},{c:'#f59e0b',l:'Holiday'},{c:T.border,l:'No data'}].map(({c,l})=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,opacity:0.6}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}
            </div>
          ))}
        </div>
      </Card>

      {selDate&&(
        <div className="slide-down" style={{marginTop:14}}>
          <Card T={T}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>{formatDate(selDate)}</div>
                <div style={{fontSize:12,opacity:0.45,marginTop:2}}>Batch {myBatch} {isFuture(selDate)&&'· Future date (view only)'}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {!isFuture(selDate)&&(
                  <button onClick={()=>toggleHoliday(selDate)} style={{padding:'5px 12px',borderRadius:99,border:`1px solid ${T.amberBorder}`,background:isSelHol?T.amber:T.amberBg,color:isSelHol?'#fff':T.amber,fontWeight:600,fontSize:12,cursor:'pointer'}}>
                    {isSelHol?'Remove Holiday':'🏖 Holiday'}
                  </button>
                )}
                <button onClick={()=>setSelDate(null)} style={{background:'none',border:'none',cursor:'pointer',opacity:0.4,fontSize:20,color:T.text}}>✕</button>
              </div>
            </div>
            {isSelHol
              ?<p style={{opacity:0.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>This day is marked as Holiday.</p>
              :selSlots.length===0
                ?<p style={{opacity:0.45,fontSize:14,textAlign:'center',padding:'16px 0'}}>No classes scheduled.</p>
                :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {selSlots.map((slot,idx)=>{
                    const subj=subjectMap[slot.subjectId];
                    const val=(records[selDate]||{})[`${slot.subjectId}__${idx}`];
                    const isExp=expanded===`${selDate}__${idx}`;
                    if(selDate<subj?.semStart) return null;
                    return(
                      <div key={idx} style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
                        <div onClick={()=>!isFuture(selDate)&&setExpanded(isExp?null:`${selDate}__${idx}`)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:isExp?T.borderLight:T.surface,cursor:isFuture(selDate)?'default':'pointer',borderLeft:`3px solid ${subj?.color||T.border}`}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:14}}>{subj?.name}</div>
                            <div style={{fontSize:11,opacity:0.45,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{slot.time}</div>
                          </div>
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
                </div>
            }
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── SUBJECTS VIEW ──────────────────────────────────────────────────────── */
function SubjectsView({ records, stats, myBatch, T }) {
  const [sel,setSel]=useState(null);
  const [ft,setFt]=useState('all');
  if(sel) return <SubjectDetail subjectId={sel} records={records} stats={stats} myBatch={myBatch} onBack={()=>setSel(null)} T={T}/>;
  const filtered=ft==='all'?SUBJECTS:SUBJECTS.filter(s=>s.type===ft);
  return (
    <div className="fade-up">
      <SectionHead title="All Subjects" sub="Tap a subject for detailed history & forecasts"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All'],['theory','Theory'],['lab','Labs'],['activity','Activity']].map(([v,l])=>(
          <Pill key={v} label={l} active={ft===v} color={T.accent} onClick={()=>setFt(v)} T={T}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(s=>{
          const st=stats[s.id],pct=st.pct;
          const variant=pct==null?'default':pct>=75?'safe':pct>=60?'warning':'danger';
          const hint=pct==null?'No data yet':pct>=75?`Safe · can skip ${st.canBunk} now`:pct>=60?`Low · need ${st.classesNeeded} more`:`Critical · need ${st.classesNeeded} more`;
          return(
            <div key={s.id} onClick={()=>setSel(s.id)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',borderLeft:`4px solid ${s.color}`,transition:'box-shadow 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
            >
              <div style={{position:'relative',flexShrink:0}}>
                <CircleProgress pct={pct} size={54} stroke={5} color={s.color} T={T}/>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>
                  {pct!=null?`${pct}%`:'—'}
                </div>
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

function SubjectDetail({ subjectId, records, stats, myBatch, onBack, T }) {
  const subj=subjectMap[subjectId];
  const st=stats[subjectId];
  const history=[];
  Object.entries(records).forEach(([date,dayRec])=>{
    getSlotsForBatch(getDayName(date),myBatch).forEach((slot,idx)=>{
      if(slot.subjectId===subjectId){
        const val=dayRec[`${slot.subjectId}__${idx}`];
        if(val) history.push({date,time:slot.time,val});
      }
    });
  });
  history.sort((a,b)=>b.date.localeCompare(a.date));
  const pct=st.pct;

  return (
    <div className="fade-up">
      <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontWeight:600,fontSize:14,marginBottom:18,padding:0,display:'flex',alignItems:'center',gap:4}}>← Back</button>
      <Card T={T} style={{marginBottom:14,borderLeft:`5px solid ${subj.color}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:subj.color,marginBottom:6}}>{subj.type}</div>
            <h2 style={{fontSize:19,fontWeight:700,letterSpacing:'-0.3px',lineHeight:1.3}}>{subj.name}</h2>
            <p style={{fontSize:13,opacity:0.45,marginTop:4}}>{subj.teacher}</p>
            <p style={{fontSize:12,opacity:0.45,marginTop:2}}>Started: {formatShort(subj.semStart)}</p>
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
          {[{v:st.present,l:'Present',c:T.green},{v:st.absent,l:'Absent',c:T.red},{v:st.holiday||0,l:'Holiday',c:T.amber},{v:st.total,l:'Marked',c:T.text}].map(({v,l,c},i,a)=>(
            <div key={l} style={{flex:1,textAlign:'center',borderRight:i<a.length-1?`1px solid ${T.borderLight}`:'none'}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:11,opacity:0.45,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Semester forecast */}
        <Divider T={T} margin="14px 0"/>
        <div style={{fontSize:12,fontWeight:700,opacity:0.5,letterSpacing:'1px',textTransform:'uppercase',marginBottom:10}}>Semester Forecast</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style={{background:T.borderLight,borderRadius:10,padding:'10px 14px'}}>
            <div style={{fontSize:11,opacity:0.5,marginBottom:3}}>Classes remaining</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700}}>{st.remainingClasses}</div>
          </div>
          <div style={{background:T.borderLight,borderRadius:10,padding:'10px 14px'}}>
            <div style={{fontSize:11,opacity:0.5,marginBottom:3}}>Projected final %</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:st.projectedPct>=75?T.green:T.red}}>
              {st.projectedPct!=null?`${st.projectedPct}%`:'—'}
            </div>
          </div>
        </div>

        {st.canBunkTotal > 0 && (
          <div style={{background:T.greenBg,border:`1px solid ${T.greenBorder}`,borderRadius:10,padding:'12px 14px',color:T.green,fontSize:13,fontWeight:500,marginBottom:8}}>
            ✅ You can skip <strong>{st.canBunkTotal}</strong> more class{st.canBunkTotal===1?'':'es'} till semester end and still maintain 75%
          </div>
        )}
        {st.canBunkTotal === 0 && st.pct !== null && (
          <div style={{background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:10,padding:'12px 14px',color:T.red,fontSize:13,fontWeight:500,marginBottom:8}}>
            ⚠️ No more classes can be missed — attend all remaining {st.remainingClasses} classes to stay above 75%
          </div>
        )}
        {st.classesNeeded > 0 && (
          <div style={{background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:10,padding:'12px 14px',color:T.red,fontSize:13,fontWeight:500}}>
            🚨 Attend <strong>{st.classesNeeded}</strong> more consecutive classes to reach 75% right now
          </div>
        )}
      </Card>

      <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>History ({history.length})</h3>
      {history.length===0
        ?<p style={{opacity:0.35,fontSize:14,textAlign:'center',padding:'40px 0'}}>No marked classes yet.</p>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.map((c,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:500,fontSize:14}}>{formatDate(c.date)}</div>
                <div style={{fontSize:12,opacity:0.35,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{c.time}</div>
              </div>
              <AttTag val={c.val} T={T}/>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ─── STATS VIEW ─────────────────────────────────────────────────────────── */
function StatsView({ stats, T }) {
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  const safe=SUBJECTS.filter(s=>stats[s.id].pct>=75).length;
  const risk=SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length;
  const noData=SUBJECTS.filter(s=>stats[s.id].pct==null).length;
  const sorted=[...SUBJECTS].sort((a,b)=>(stats[b.id].pct||0)-(stats[a.id].pct||0));
  const best=sorted.find(s=>stats[s.id].pct!=null);
  const worst=[...sorted].reverse().find(s=>stats[s.id].pct!=null);

  return (
    <div className="fade-up">
      <SectionHead title="Statistics" sub="Semester overview"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[
          {l:'Overall',v:oPct!=null?`${oPct}%`:'—',c:oPct==null?T.textSub:oPct>=75?T.green:T.red,bg:oPct==null?T.borderLight:oPct>=75?T.greenBg:T.redBg},
          {l:'Safe',v:safe,c:T.green,bg:T.greenBg},
          {l:'At Risk',v:risk,c:T.red,bg:T.redBg},
          {l:'No Data',v:noData,c:T.textSub,bg:T.borderLight},
        ].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:14,padding:'16px',textAlign:'center',transition:'background 0.3s'}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:26,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,opacity:0.55,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Best / Worst */}
      {(best||worst)&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:16}}>
          {best&&(
            <Card T={T} style={{padding:16}}>
              <div style={{fontSize:12,opacity:0.45,marginBottom:6,fontWeight:600}}>🏆 Best Subject</div>
              <div style={{fontWeight:700,fontSize:14,color:T.green,marginBottom:2}}>{best.name}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:T.green}}>{stats[best.id].pct}%</div>
            </Card>
          )}
          {worst&&worst.id!==best?.id&&(
            <Card T={T} style={{padding:16}}>
              <div style={{fontSize:12,opacity:0.45,marginBottom:6,fontWeight:600}}>⚠️ Needs Attention</div>
              <div style={{fontWeight:700,fontSize:14,color:T.red,marginBottom:2}}>{worst.name}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:T.red}}>{stats[worst.id].pct}%</div>
            </Card>
          )}
        </div>
      )}

      <Card T={T}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Subject-wise Attendance</h3>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {sorted.map(s=>{
            const st=stats[s.id],pct=st.pct;
            const barColor=pct==null?T.border:pct>=75?s.color:pct>=60?T.amber:T.red;
            return(
              <div key={s.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                    <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:8}}>
                    {st.canBunkTotal>0&&<span style={{fontSize:11,color:T.purple,fontWeight:600}}>skip {st.canBunkTotal} more</span>}
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:barColor}}>{pct!=null?`${pct}%`:'—'}</span>
                  </div>
                </div>
                <div style={{position:'relative',height:8,background:T.borderLight,borderRadius:99,overflow:'visible'}}>
                  <div style={{height:'100%',width:`${pct||0}%`,background:barColor,borderRadius:99,transition:'width 0.8s ease'}}/>
                  <div style={{position:'absolute',top:-4,left:'75%',width:2,height:16,background:T.textMuted,borderRadius:99,opacity:0.3}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:11,opacity:0.45}}>
                  <span>{st.present}P · {st.absent}A · {st.total} classes · {st.remainingClasses} remaining</span>
                  {st.classesNeeded>0&&<span style={{color:T.red,opacity:1}}>Need {st.classesNeeded} more</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,display:'flex',alignItems:'center',gap:6,fontSize:11,opacity:0.35}}>
          <div style={{width:2,height:12,background:T.textMuted,borderRadius:99}}/>
          <span>Vertical line = 75% threshold · "skip X more" = classes skippable till Apr 30</span>
        </div>
      </Card>
    </div>
  );
}

/* ─── SCHEDULE VIEW ──────────────────────────────────────────────────────── */
function ScheduleView({ myBatch, T }) {
  const [filter,setFilter]=useState('all');
  return (
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
          if(!slots||slots.length===0) return null;
          return(
            <Card key={day} T={T}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12,display:'flex',justifyContent:'space-between'}}>
                {day}<span style={{fontSize:12,fontWeight:400,opacity:0.35}}>{slots.length} slot{slots.length>1?'s':''}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {slots.map((slot,i)=>{
                  const subj=subjectMap[slot.subjectId];
                  const isEarly=subj?.semStart==='2026-01-27';
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:T.borderLight,borderRadius:10,borderLeft:`3px solid ${subj?.color||T.border}`}}>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,opacity:0.45,minWidth:90,flexShrink:0}}>{slot.time}</span>
                      <span style={{flex:1,fontSize:13,fontWeight:500}}>{subj?.name}</span>
                      <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        {slot.batch!=='all'&&<Badge variant="info" T={T}>{slot.batch}</Badge>}
                        {isEarly&&<Badge variant="purple" T={T}>from Jan 27</Badge>}
                        <span style={{fontSize:11,opacity:0.4,background:T.surface,padding:'2px 8px',borderRadius:99,border:`1px solid ${T.border}`}}>{subj?.type}</span>
                      </div>
                    </div>
                  );
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
function ReportsView({ records, stats, myBatch, holidays, T }) {
  const [period, setPeriod] = useState('biweekly');
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;

  return (
    <div className="fade-up">
      <SectionHead title="Reports" sub="Export your attendance as a PDF report"/>
      <Card T={T} style={{marginBottom:14}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:4}}>📄 Export PDF Report</h3>
        <p style={{fontSize:13,opacity:0.45,marginBottom:16}}>Opens a printable report in a new tab. Includes current %, projected final %, and how many classes you can still skip.</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
          <Pill label="Bi-Weekly (14 days)" active={period==='biweekly'} color={T.accent} onClick={()=>setPeriod('biweekly')} T={T}/>
          <Pill label="Monthly (30 days)" active={period==='monthly'} color={T.accent} onClick={()=>setPeriod('monthly')} T={T}/>
        </div>
        <div style={{background:T.borderLight,borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:11,opacity:0.45,marginBottom:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>Preview</div>
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:oPct>=75?T.green:T.red}}>{oPct!=null?`${oPct}%`:'—'}</span><br/><span style={{fontSize:11,opacity:0.45}}>Overall</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20}}>{totP}/{totT}</span><br/><span style={{fontSize:11,opacity:0.45}}>Present/Total</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:T.green}}>{SUBJECTS.filter(s=>stats[s.id].pct>=75).length}</span><br/><span style={{fontSize:11,opacity:0.45}}>Safe</span></div>
            <div><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,color:T.red}}>{SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length}</span><br/><span style={{fontSize:11,opacity:0.45}}>At risk</span></div>
          </div>
        </div>
        <button onClick={()=>generatePDF(records,stats,myBatch,holidays,period)} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:T.accent,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',transition:'opacity 0.15s'}}
          onMouseEnter={e=>e.target.style.opacity='0.85'} onMouseLeave={e=>e.target.style.opacity='1'}>
          Generate & Print PDF →
        </button>
      </Card>

      <Card T={T}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>💡 Quick Guide</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[
            ['P','Present — counts toward your attendance'],
            ['A','Absent — reduces your attendance %'],
            ['H','Holiday / Cancelled class — excluded from calculation'],
            ['📅 Past Days','Button on Today tab — fill attendance for days you missed'],
            ['skip X more','Classes you can still miss and stay above 75% by Apr 30'],
          ].map(([k,v])=>(
            <div key={k} style={{display:'flex',gap:12,fontSize:13}}>
              <span style={{fontWeight:700,color:T.accent,flexShrink:0,minWidth:80}}>{k}</span>
              <span style={{opacity:0.6}}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState('today');
  const [settings, setSettings] = useState(false);
  const [showBackfill, setShowBackfill] = useState(false);
  const [, setTick] = useState(0);

  const { records, notes, myBatch='B1', darkMode=false, holidays={} } = data;

  useEffect(() => { applyGlobalStyles(darkMode); }, [darkMode]);

  const T = makeTheme(darkMode);

  const setRecords  = useCallback(r => setData(d=>{ const nd={...d,records:r};   saveData(nd); return nd; }), []);
  const setNotes    = useCallback(n => setData(d=>{ const nd={...d,notes:n};     saveData(nd); return nd; }), []);
  const setBatch    = useCallback(b => setData(d=>{ const nd={...d,myBatch:b};   saveData(nd); return nd; }), []);
  const setDark     = useCallback(v => setData(d=>{ const nd={...d,darkMode:v};  saveData(nd); return nd; }), []);
  const setHolidays = useCallback(h => setData(d=>{ const nd={...d,holidays:h};  saveData(nd); return nd; }), []);

  // Auto-refresh at midnight
  useEffect(() => {
    function msTillMidnight() {
      const n=new Date();
      return new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,1)-n;
    }
    let t; const sched=()=>{ t=setTimeout(()=>{ setTick(x=>x+1); sched(); }, msTillMidnight()); };
    sched(); return ()=>clearTimeout(t);
  }, []);

  const stats = calcStats(records, myBatch, holidays);
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;

  function exportData() {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='attendance_backup.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file=e.target.files?.[0]; if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); setData(d); saveData(d); applyGlobalStyles(d.darkMode||false); alert('Imported!'); } catch{ alert('Invalid file'); } };
    r.readAsText(file); e.target.value='';
  }
  function clearAll() {
    if(window.confirm('Clear ALL attendance data? This cannot be undone.')) {
      const fresh={records:{},notes:{},myBatch,darkMode,holidays:{}};
      setData(fresh); saveData(fresh);
    }
  }

  const TABS=[
    {id:'today',   icon:'📋',label:'Today'},
    {id:'calendar',icon:'📅',label:'Calendar'},
    {id:'subjects',icon:'📚',label:'Subjects'},
    {id:'stats',   icon:'📊',label:'Stats'},
    {id:'schedule',icon:'🗓',label:'Schedule'},
    {id:'reports', icon:'📤',label:'Reports'},
  ];

  // Count how many past days have unmarked classes
  const today=getToday();
  const earliest='2026-01-27';
  const yesterday=addDays(today,-1);
  const unmarkedCount = yesterday >= earliest
    ? dateRange(earliest,yesterday).filter(d=>{
        const dn=getDayName(d);
        if(dn==='SAT'||dn==='SUN'||holidays[d]) return false;
        const sl=getSlotsForBatch(dn,myBatch);
        if(!sl.length) return false;
        const dr=records[d]||{};
        return sl.some((_,i)=>!dr[`${sl[i]?.subjectId}__${i}`]);
      }).length
    : 0;

  return (
    <div style={{minHeight:'100vh',background:T.bg,color:T.text,transition:'background 0.3s,color 0.3s'}}>

      {/* HEADER */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,position:'sticky',top:0,zIndex:200,boxShadow:'0 1px 6px rgba(0,0,0,0.06)',transition:'background 0.3s,border-color 0.3s'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,paddingBottom:10,gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:11,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:20}}>📡</span>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:16,letterSpacing:'-0.3px',lineHeight:1.2}}>ECE Attendance</div>
                <div style={{fontSize:11,opacity:0.45}}>B.Tech 1st Year · Sem 2 · AY 2025-26</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end',minWidth:0}}>
              {oPct!=null&&(
                <div style={{padding:'4px 12px',borderRadius:99,background:oPct>=75?T.greenBg:T.redBg,color:oPct>=75?T.green:T.red,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13,border:`1px solid ${oPct>=75?T.greenBorder:T.redBorder}`}}>
                  {oPct}%
                </div>
              )}

              {unmarkedCount>0&&(
                <button onClick={()=>setShowBackfill(true)} style={{padding:'4px 10px',borderRadius:99,background:T.amberBg,border:`1px solid ${T.amberBorder}`,color:T.amber,fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
                  {unmarkedCount} unmarked
                </button>
              )}
              <button onClick={()=>setDark(!darkMode)} title={darkMode?'Light':'Dark'} style={{...navStyle(T),fontSize:16}}>
                {darkMode?'☀️':'🌙'}
              </button>
              <button onClick={()=>setSettings(!settings)} style={{...navStyle(T),background:settings?T.accentLight:'',borderColor:settings?T.accentBorder:T.border,color:settings?T.accent:T.textSub,fontSize:18}}>⚙</button>
            </div>
          </div>

          {settings&&(
            <div className="slide-down" style={{borderTop:`1px solid ${T.borderLight}`,padding:'14px 0',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>My Batch</div>
                  <div style={{fontSize:11,opacity:0.45}}>Filters batch-specific lab/workshop slots</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Pill label="Batch 1 (B-1)" active={myBatch==='B1'} color={T.accent} onClick={()=>setBatch('B1')} T={T}/>
                  <Pill label="Batch 2 (B-2)" active={myBatch==='B2'} color={T.accent} onClick={()=>setBatch('B2')} T={T}/>
                </div>
              </div>
              <Divider margin="4px 0" T={T}/>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={exportData} style={actionBtn(T.blue)}>⬇ Export JSON</button>
                <label style={{...actionBtn(T.green),cursor:'pointer'}}>⬆ Import JSON<input type="file" accept=".json" onChange={importData} style={{display:'none'}}/></label>
                <button onClick={clearAll} style={actionBtn(T.red)}>🗑 Clear Data</button>
              </div>
            </div>
          )}

          <div style={{display:'flex',overflowX:'auto',gap:0,marginTop:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setSettings(false);}} style={{
                background:'none',border:'none',cursor:'pointer',padding:'10px 12px',
                fontWeight:600,fontSize:13,
                color:tab===t.id?T.accent:T.textSub,
                borderBottom:`2px solid ${tab===t.id?T.accent:'transparent'}`,
                whiteSpace:'nowrap',transition:'all 0.15s',display:'flex',gap:5,alignItems:'center',
              }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:720,margin:'0 auto',padding:'24px 16px 80px'}}>
        {tab==='today'    && <TodayView    records={records} setRecords={setRecords} notes={notes} setNotes={setNotes} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} onOpenBackfill={()=>setShowBackfill(true)} T={T}/>}
        {tab==='calendar' && <CalendarView records={records} setRecords={setRecords} myBatch={myBatch} holidays={holidays} setHolidays={setHolidays} T={T}/>}
        {tab==='subjects' && <SubjectsView records={records} stats={stats} myBatch={myBatch} T={T}/>}
        {tab==='stats'    && <StatsView    stats={stats} T={T}/>}
        {tab==='schedule' && <ScheduleView myBatch={myBatch} T={T}/>}
        {tab==='reports'  && <ReportsView  records={records} stats={stats} myBatch={myBatch} holidays={holidays} T={T}/>}
      </div>

      {/* LEGEND + CREDIT */}
      <div style={{position:'fixed',bottom:12,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:100}}>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:99,padding:'8px 20px',display:'flex',gap:16,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',fontSize:12,fontWeight:600,whiteSpace:'nowrap',transition:'background 0.3s,border-color 0.3s'}}>
          <span style={{color:T.green}}>P = Present</span>
          <span style={{color:T.red}}>A = Absent</span>
          <span style={{color:T.amber}}>H = Holiday</span>
        </div>
        <div style={{fontSize:11,fontWeight:500,opacity:0.4,whiteSpace:'nowrap',letterSpacing:'0.2px'}}>
          Made with ❤️ by Ajay G
        </div>
      </div>

      {/* BACKFILL MODAL */}
      {showBackfill&&(
        <BackfillModal myBatch={myBatch} records={records} setRecords={setRecords} holidays={holidays} onClose={()=>setShowBackfill(false)} T={T}/>
      )}
    </div>
  );
}
