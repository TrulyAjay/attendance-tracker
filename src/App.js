import React, { useState, useCallback } from 'react';

/* ─── FONTS ──────────────────────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
document.head.appendChild(fontLink);

const styleEl = document.createElement('style');
styleEl.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f6fa; font-family: 'DM Sans', sans-serif; color: #111827; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
  button { font-family: 'DM Sans', sans-serif; }
  textarea, input { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.22s ease both; }
  .slide-down { animation: slideDown 0.18s ease both; }
`;
document.head.appendChild(styleEl);

/* ─── DESIGN TOKENS ──────────────────────────────────────────────────────── */
const T = {
  bg:           '#f5f6fa',
  surface:      '#ffffff',
  surfaceAlt:   '#f9fafb',
  border:       '#e5e7eb',
  borderLight:  '#f3f4f6',
  text:         '#111827',
  textSub:      '#6b7280',
  textMuted:    '#9ca3af',
  accent:       '#4f46e5',
  accentLight:  '#eef2ff',
  accentBorder: '#c7d2fe',
  green:        '#059669',
  greenBg:      '#d1fae5',
  greenBorder:  '#6ee7b7',
  red:          '#dc2626',
  redBg:        '#fee2e2',
  redBorder:    '#fca5a5',
  amber:        '#d97706',
  amberBg:      '#fef3c7',
  amberBorder:  '#fcd34d',
  blue:         '#2563eb',
  blueBg:       '#dbeafe',
  blueBorder:   '#93c5fd',
};

/* ─── SUBJECTS ───────────────────────────────────────────────────────────── */
const SUBJECTS = [
  { id:'ENGG_CHEM',     name:'Engineering Chemistry',                  abbr:'ENGG. CHEM.',   teacher:'Nidhi Rai (NR)',                               type:'theory',   color:'#e11d48' },
  { id:'ENGG_MATHS',    name:'Engineering Mathematics A',              abbr:'ENGG. MATHS',   teacher:'Santosh Verma (SV)',                           type:'theory',   color:'#7c3aed' },
  { id:'IEE',           name:'Introduction to Electrical Engineering', abbr:'IEE',           teacher:'Manoj Gupta (MG)',                             type:'theory',   color:'#0891b2' },
  { id:'COMP_PROG',     name:'Computer Programming',                   abbr:'COMP. PROG.',   teacher:'Vaibhav Kant Singh (VKS)',                     type:'theory',   color:'#059669' },
  { id:'ENV_SCIENCE',   name:'Environmental Science & Ecology',        abbr:'ENV. SCIENCE',  teacher:'Vinod Kumar (VK)',                             type:'theory',   color:'#65a30d' },
  { id:'IND_CONST',     name:'Indian Constitution',                    abbr:'IND. CONST.',   teacher:'Vineeta Kumari (VK)',                          type:'theory',   color:'#d97706' },
  { id:'ENGG_WORK',     name:'Engineering Workshop Practice',          abbr:'ENGG. WORK.',   teacher:'Manish Bhaskar (MB) & Pradeep Patanwar (PP)', type:'lab',      color:'#db2777' },
  { id:'COMP_PROG_LAB', name:'Computer Programming Lab',               abbr:'CP LAB',        teacher:'Vaibhav Kant Singh (VKS)',                     type:'lab',      color:'#2563eb' },
  { id:'IEE_LAB',       name:'IEE Lab',                               abbr:'IEE LAB',       teacher:'Manoj Gupta (MG)',                             type:'lab',      color:'#0891b2' },
  { id:'ENGG_CHEM_LAB', name:'Engineering Chemistry Lab',              abbr:'CHEM LAB',      teacher:'Nidhi Rai (NR) & B. Mandal (BM)',             type:'lab',      color:'#e11d48' },
  { id:'SPORTS_YOGA',   name:'Sports & Yoga',                         abbr:'SPORTS & YOGA', teacher:'Ratin Jogi',                                  type:'activity', color:'#16a34a' },
];

/*
  batch: 'all' | 'B1' | 'B2'
*/
const TIMETABLE = {
  MON: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', batch:'all' },
    { subjectId:'ENV_SCIENCE',   time:'11:00–12:00', batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–01:00', batch:'all' },
    { subjectId:'ENGG_CHEM_LAB', time:'02:00–04:00', batch:'B1'  },
    { subjectId:'SPORTS_YOGA',   time:'04:00–06:00', batch:'all' },
  ],
  TUE: [
    { subjectId:'IEE',           time:'10:00–11:00', batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–01:00', batch:'all' },
    { subjectId:'COMP_PROG',     time:'02:00–04:00', batch:'B1'  },
    { subjectId:'IEE_LAB',       time:'02:00–04:00', batch:'B2'  },
    { subjectId:'COMP_PROG_LAB', time:'04:00–06:00', batch:'B2'  },
  ],
  WED: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', batch:'all' },
    { subjectId:'IEE',           time:'12:00–01:00', batch:'all' },
    { subjectId:'IEE_LAB',       time:'02:00–04:00', batch:'B1'  },
    { subjectId:'ENGG_WORK',     time:'04:00–06:00', batch:'B2'  },
  ],
  THU: [
    { subjectId:'ENV_SCIENCE',   time:'10:00–11:00', batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', batch:'all' },
    { subjectId:'ENGG_CHEM',     time:'12:00–01:00', batch:'all' },
    { subjectId:'ENGG_WORK',     time:'02:00–04:00', batch:'B1'  },
    { subjectId:'ENGG_CHEM_LAB', time:'02:00–04:00', batch:'B2'  },
  ],
  FRI: [
    { subjectId:'COMP_PROG',     time:'10:00–11:00', batch:'all' },
    { subjectId:'ENGG_MATHS',    time:'11:00–12:00', batch:'all' },
    { subjectId:'IEE',           time:'12:00–01:00', batch:'all' },
    { subjectId:'IND_CONST',     time:'02:00–03:00', batch:'all' },
    { subjectId:'ENGG_WORK',     time:'04:00–06:00', batch:'all' },
  ],
};

const DAYS = ['MON','TUE','WED','THU','FRI'];
const MIN_ATT = 75;
const subjectMap = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

/* ─── STORAGE ────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'ece_att_v3';
function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return { records:{}, notes:{}, myBatch:'B1' };
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function getToday() { return new Date().toISOString().split('T')[0]; }
function getDayName(ds) { return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(ds+'T12:00:00').getDay()]; }
function formatDate(ds) { return new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }

function getSlotsForBatch(dayName, myBatch) {
  return (TIMETABLE[dayName] || []).filter(s => s.batch === 'all' || s.batch === myBatch);
}

function calcStats(records, myBatch) {
  const stats = {};
  SUBJECTS.forEach(s => { stats[s.id] = { present:0, absent:0, leave:0, total:0 }; });
  Object.entries(records).forEach(([date, dayRec]) => {
    const slots = getSlotsForBatch(getDayName(date), myBatch);
    slots.forEach((slot, idx) => {
      const val = dayRec[`${slot.subjectId}__${idx}`];
      if (val && stats[slot.subjectId]) {
        stats[slot.subjectId].total++;
        if (val==='P') stats[slot.subjectId].present++;
        else if (val==='A') stats[slot.subjectId].absent++;
        else if (val==='L') stats[slot.subjectId].leave++;
      }
    });
  });
  SUBJECTS.forEach(s => {
    const st = stats[s.id];
    st.pct = st.total > 0 ? Math.round((st.present/st.total)*100) : null;
    st.classesNeeded = (st.pct !== null && st.pct < MIN_ATT)
      ? Math.ceil((MIN_ATT*st.total - 100*st.present)/(100-MIN_ATT)) : 0;
    st.canBunk = (st.pct !== null && st.pct >= MIN_ATT)
      ? Math.floor((100*st.present - MIN_ATT*st.total)/MIN_ATT) : 0;
  });
  return stats;
}

/* ─── REUSABLE UI ────────────────────────────────────────────────────────── */

function Badge({ children, variant='default' }) {
  const v = {
    safe:    { bg:T.greenBg,  color:T.green, border:T.greenBorder },
    danger:  { bg:T.redBg,    color:T.red,   border:T.redBorder },
    warning: { bg:T.amberBg,  color:T.amber, border:T.amberBorder },
    info:    { bg:T.blueBg,   color:T.blue,  border:T.blueBorder },
    default: { bg:T.borderLight, color:T.textSub, border:T.border },
  }[variant] || {};
  return (
    <span style={{
      background:v.bg, color:v.color, border:`1px solid ${v.border}`,
      fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:99,
      display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap',
    }}>{children}</span>
  );
}

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 16px', borderRadius:99, cursor:'pointer', fontWeight:600, fontSize:13,
      border: active ? `1.5px solid ${color}` : `1.5px solid ${T.border}`,
      background: active ? color : T.surface,
      color: active ? '#fff' : T.textSub,
      transition:'all 0.15s',
    }}>{label}</button>
  );
}

function CircleProgress({ pct, size=64, stroke=5, color }) {
  const r = (size-stroke)/2;
  const circ = 2*Math.PI*r;
  const offset = pct == null ? circ : circ-(pct/100)*circ;
  const fill = pct==null ? T.border : pct>=75 ? T.green : pct>=60 ? T.amber : T.red;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.borderLight} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color||fill} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:'stroke-dashoffset 0.6s ease'}}/>
    </svg>
  );
}

function AttTag({ val }) {
  if (!val) return null;
  const m = { P:{l:'Present',bg:T.greenBg,c:T.green}, A:{l:'Absent',bg:T.redBg,c:T.red}, L:{l:'Leave',bg:T.amberBg,c:T.amber} }[val];
  return <span style={{background:m.bg,color:m.c,fontWeight:600,fontSize:12,padding:'3px 10px',borderRadius:99}}>{m.l}</span>;
}

function MarkBtns({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {[['P',T.green],['A',T.red],['L',T.amber]].map(([v,color]) => (
        <button key={v} onClick={() => onChange(value===v ? null : v)} style={{
          width:36,height:36,borderRadius:10,border:'none',cursor:'pointer',
          fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace",
          background: value===v ? color : T.borderLight,
          color: value===v ? '#fff' : T.textMuted,
          transition:'all 0.15s',
        }}>{v}</button>
      ))}
    </div>
  );
}

function Card({ children, style={}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => onClick && setHov(true)}
      onMouseLeave={() => onClick && setHov(false)}
      style={{
        background:T.surface, borderRadius:16, border:`1px solid ${T.border}`,
        padding:20, cursor:onClick?'pointer':'default',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition:'box-shadow 0.2s,transform 0.2s',
        ...style,
      }}
    >{children}</div>
  );
}

function Divider({ margin='12px 0' }) {
  return <div style={{height:1,background:T.borderLight,margin}} />;
}

function SectionHead({ title, sub }) {
  return (
    <div style={{marginBottom:20}}>
      <h2 style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-0.3px'}}>{title}</h2>
      {sub && <p style={{fontSize:13,color:T.textSub,marginTop:3}}>{sub}</p>}
    </div>
  );
}

/* ─── TODAY VIEW ─────────────────────────────────────────────────────────── */
function TodayView({ records, setRecords, notes, setNotes, myBatch }) {
  const today = getToday();
  const dayName = getDayName(today);
  const slots = getSlotsForBatch(dayName, myBatch);
  const dayRec = records[today] || {};

  function mark(subjectId, idx, val) {
    const key = `${subjectId}__${idx}`;
    let updated;
    if (!val) {
      const nr = { ...dayRec }; delete nr[key];
      updated = { ...records, [today]: nr };
    } else {
      updated = { ...records, [today]: { ...dayRec, [key]: val } };
    }
    setRecords(updated);
  }

  const marked = slots.filter((s,i) => dayRec[`${s.subjectId}__${i}`]).length;
  const present = slots.filter((s,i) => dayRec[`${s.subjectId}__${i}`]==='P').length;

  if (slots.length === 0) {
    return (
      <div className="fade-up" style={{textAlign:'center',padding:'80px 20px'}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <h2 style={{fontSize:22,fontWeight:700,color:T.text,marginBottom:8}}>No Classes Today!</h2>
        <p style={{color:T.textSub,fontSize:14}}>Enjoy your {dayName==='SUN'||dayName==='SAT'?'weekend':'free day'}.</p>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* Header row */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,color:T.text,letterSpacing:'-0.3px'}}>Today · {dayName}</h2>
          <p style={{fontSize:13,color:T.textSub,marginTop:3}}>{formatDate(today)} · Batch {myBatch}</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Badge variant={marked===slots.length?'safe':'default'}>{marked}/{slots.length} marked</Badge>
          {marked > 0 && <Badge variant="info">{present}P · {marked-present} A/L</Badge>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:4,background:T.borderLight,borderRadius:99,marginBottom:20,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${slots.length?(marked/slots.length)*100:0}%`,background:T.accent,borderRadius:99,transition:'width 0.4s ease'}}/>
      </div>

      {/* Slots */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {slots.map((slot,idx) => {
          const subj = subjectMap[slot.subjectId];
          const val = dayRec[`${slot.subjectId}__${idx}`];
          const marked = !!val;
          const borderColor = marked ? (val==='P'?T.greenBorder:val==='A'?T.redBorder:T.amberBorder) : T.border;
          return (
            <div key={idx} style={{
              background:T.surface, border:`1px solid ${borderColor}`,
              borderRadius:14, padding:'14px 18px',
              display:'flex', alignItems:'center', gap:14,
              transition:'border-color 0.2s',
            }}>
              <div style={{width:4,height:46,borderRadius:99,background:subj?.color||T.border,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:T.text,lineHeight:1.3}}>{subj?.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:5,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{slot.time}</span>
                  {slot.batch!=='all' && <Badge variant="info">Batch {slot.batch}</Badge>}
                  <span style={{fontSize:11,color:T.textMuted,background:T.borderLight,padding:'2px 8px',borderRadius:99}}>{subj?.type}</span>
                </div>
              </div>
              <MarkBtns value={val} onChange={v => mark(slot.subjectId, idx, v)}/>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div style={{marginTop:20}}>
        <label style={{fontSize:13,fontWeight:600,color:T.textSub,display:'block',marginBottom:8}}>Notes for today</label>
        <textarea
          placeholder="Homework, reminders, highlights..."
          value={notes[today]||''}
          onChange={e => setNotes({...notes,[today]:e.target.value})}
          style={{
            width:'100%',minHeight:88,background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:12,padding:'12px 16px',color:T.text,fontSize:14,
            resize:'vertical',outline:'none',lineHeight:1.6,transition:'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor=T.accent}
          onBlur={e => e.target.style.borderColor=T.border}
        />
      </div>
    </div>
  );
}

/* ─── CALENDAR VIEW ──────────────────────────────────────────────────────── */
function CalendarView({ records, setRecords, myBatch }) {
  const [cur, setCur] = useState(new Date());
  const [selDate, setSelDate] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const today = getToday();
  const y = cur.getFullYear(), m = cur.getMonth();
  const label = cur.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  const firstDay = new Date(y,m,1).getDay();
  const dim = new Date(y,m+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=dim;d++) cells.push(d);

  function ds(d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

  function info(d) {
    const date=ds(d), dn=getDayName(date);
    const slots=getSlotsForBatch(dn,myBatch), dr=records[date]||{};
    const total=slots.length;
    const marked=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]).length;
    const present=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='P').length;
    const absent=slots.filter((s,i)=>dr[`${s.subjectId}__${i}`]==='A').length;
    const isWE=dn==='SAT'||dn==='SUN';
    return{date,dn,slots,total,marked,present,absent,isWE};
  }

  const selSlots = selDate ? getSlotsForBatch(getDayName(selDate), myBatch) : [];

  function markSlot(date, subjectId, idx, val) {
    const dr = records[date]||{};
    const key = `${subjectId}__${idx}`;
    let updated;
    if(!val){const nr={...dr};delete nr[key];updated={...records,[date]:nr};}
    else updated={...records,[date]:{...dr,[key]:val}};
    setRecords(updated);
  }

  return (
    <div className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:'-0.3px'}}>{label}</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCur(new Date(y,m-1,1))} style={navStyle}>‹</button>
          <button onClick={()=>setCur(new Date())} style={{...navStyle,width:'auto',padding:'0 12px',fontSize:12}}>Today</button>
          <button onClick={()=>setCur(new Date(y,m+1,1))} style={navStyle}>›</button>
        </div>
      </div>

      <Card style={{padding:16}}>
        {/* Weekday headers */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:6}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
            <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,color:T.textMuted,padding:'4px 0'}}>{d}</div>
          ))}
        </div>
        {/* Day grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const{date,isWE,total,marked,present,absent}=info(d);
            const isTday=date===today, isSel=date===selDate;
            let dot=null;
            if(marked>0) dot=absent>0?T.red:present===marked?T.green:T.amber;
            return(
              <div key={d} onClick={()=>setSelDate(isSel?null:date)} style={{
                borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:'pointer',
                background:isSel?T.accentLight:isTday?'#f0f4ff':'transparent',
                border:`1.5px solid ${isSel?T.accent:isTday?T.accentBorder:'transparent'}`,
                opacity:isWE?0.35:1,transition:'all 0.15s',
              }}>
                <div style={{fontSize:13,fontWeight:isTday?700:400,color:isTday?T.accent:T.text}}>{d}</div>
                {dot?<div style={{width:5,height:5,borderRadius:'50%',background:dot,margin:'3px auto 0'}}/>
                    :total>0?<div style={{width:4,height:4,borderRadius:'50%',background:T.border,margin:'4px auto 0'}}/>:null}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{display:'flex',gap:14,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,flexWrap:'wrap'}}>
          {[{c:T.green,l:'All Present'},{c:T.red,l:'Has Absent'},{c:T.amber,l:'Partial'},{c:T.border,l:'No Classes'}].map(({c,l})=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.textSub}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}
            </div>
          ))}
        </div>
      </Card>

      {/* Selected date */}
      {selDate && (
        <div className="slide-down" style={{marginTop:14}}>
          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:T.text}}>{formatDate(selDate)}</div>
                <div style={{fontSize:12,color:T.textSub,marginTop:2}}>Batch {myBatch}</div>
              </div>
              <button onClick={()=>setSelDate(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.textMuted,fontSize:20,lineHeight:1}}>✕</button>
            </div>
            {selSlots.length===0
              ? <p style={{color:T.textMuted,fontSize:14,textAlign:'center',padding:'20px 0'}}>No classes scheduled.</p>
              : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {selSlots.map((slot,idx)=>{
                    const subj=subjectMap[slot.subjectId];
                    const val=(records[selDate]||{})[`${slot.subjectId}__${idx}`];
                    const isExp=expanded===`${selDate}__${idx}`;
                    return(
                      <div key={idx} style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
                        <div onClick={()=>setExpanded(isExp?null:`${selDate}__${idx}`)} style={{
                          display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                          background:isExp?T.borderLight:T.surface,cursor:'pointer',
                          borderLeft:`3px solid ${subj?.color||T.border}`,
                        }}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:14,color:T.text}}>{subj?.name}</div>
                            <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{slot.time}</div>
                          </div>
                          {val?<AttTag val={val}/>:<span style={{fontSize:12,color:T.textMuted}}>tap to mark</span>}
                          <span style={{color:T.textMuted,fontSize:12}}>{isExp?'▲':'▼'}</span>
                        </div>
                        {isExp&&(
                          <div style={{padding:'12px 14px',background:T.surface,borderTop:`1px solid ${T.borderLight}`}}>
                            <MarkBtns value={val} onChange={v=>markSlot(selDate,slot.subjectId,idx,v)}/>
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
function SubjectsView({ records, stats, myBatch }) {
  const [sel, setSel] = useState(null);
  const [ft, setFt] = useState('all');

  if (sel) return <SubjectDetail subjectId={sel} records={records} stats={stats} myBatch={myBatch} onBack={()=>setSel(null)}/>;

  const filtered = ft==='all' ? SUBJECTS : SUBJECTS.filter(s=>s.type===ft);

  return (
    <div className="fade-up">
      <SectionHead title="All Subjects" sub="Tap a subject for detailed history & stats"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All'],['theory','Theory'],['lab','Labs'],['activity','Activity']].map(([v,l])=>(
          <Pill key={v} label={l} active={ft===v} color={T.accent} onClick={()=>setFt(v)}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(s=>{
          const st=stats[s.id], pct=st.pct;
          const variant=pct==null?'default':pct>=75?'safe':pct>=60?'warning':'danger';
          const hint=pct==null?'No data yet':pct>=75?`Safe · can skip ${st.canBunk}`:pct>=60?`Low · need ${st.classesNeeded} more`:`Critical · need ${st.classesNeeded} more`;
          return(
            <div key={s.id} onClick={()=>setSel(s.id)} style={{
              background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,
              padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',
              borderLeft:`4px solid ${s.color}`,transition:'box-shadow 0.2s,border-color 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,0.08)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}
            >
              <div style={{position:'relative',flexShrink:0}}>
                <CircleProgress pct={pct} size={54} stroke={5} color={s.color}/>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:T.text}}>
                  {pct!=null?`${pct}%`:'—'}
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:T.text,lineHeight:1.3}}>{s.name}</div>
                <div style={{fontSize:12,color:T.textSub,marginTop:2}}>{s.teacher}</div>
                <div style={{display:'flex',gap:8,marginTop:7,alignItems:'center',flexWrap:'wrap'}}>
                  <Badge variant={variant}>{hint}</Badge>
                  <span style={{fontSize:12,color:T.textMuted}}>{st.present}P · {st.absent}A · {st.total} total</span>
                </div>
              </div>
              <span style={{color:T.textMuted,fontSize:18,flexShrink:0}}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubjectDetail({ subjectId, records, stats, myBatch, onBack }) {
  const subj = subjectMap[subjectId];
  const st = stats[subjectId];

  const history = [];
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
  const variant=pct==null?'default':pct>=75?'safe':pct>=60?'warning':'danger';

  return (
    <div className="fade-up">
      <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontWeight:600,fontSize:14,marginBottom:18,padding:0,display:'flex',alignItems:'center',gap:4}}>
        ← Back
      </button>
      <Card style={{marginBottom:14,borderLeft:`5px solid ${subj.color}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:subj.color,marginBottom:6}}>{subj.type}</div>
            <h2 style={{fontSize:19,fontWeight:700,color:T.text,letterSpacing:'-0.3px',lineHeight:1.3}}>{subj.name}</h2>
            <p style={{fontSize:13,color:T.textSub,marginTop:4}}>{subj.teacher}</p>
          </div>
          <div style={{position:'relative',flexShrink:0}}>
            <CircleProgress pct={pct} size={80} stroke={7} color={subj.color}/>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700,color:T.text}}>{pct!=null?`${pct}%`:'—'}</span>
            </div>
          </div>
        </div>
        <Divider/>
        <div style={{display:'flex'}}>
          {[{v:st.present,l:'Present',c:T.green},{v:st.absent,l:'Absent',c:T.red},{v:st.leave||0,l:'Leave',c:T.amber},{v:st.total,l:'Total',c:T.text}].map(({v,l,c},i,a)=>(
            <div key={l} style={{flex:1,textAlign:'center',borderRight:i<a.length-1?`1px solid ${T.borderLight}`:'none'}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:11,color:T.textSub,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        {st.classesNeeded>0&&(
          <div style={{marginTop:12,background:T.redBg,border:`1px solid ${T.redBorder}`,borderRadius:10,padding:'10px 14px',color:T.red,fontSize:13,fontWeight:500}}>
            ⚠️ Attend <strong>{st.classesNeeded}</strong> more consecutive classes to reach 75%
          </div>
        )}
        {st.canBunk>0&&(
          <div style={{marginTop:12,background:T.greenBg,border:`1px solid ${T.greenBorder}`,borderRadius:10,padding:'10px 14px',color:T.green,fontSize:13,fontWeight:500}}>
            ✅ You can safely skip <strong>{st.canBunk}</strong> more {st.canBunk===1?'class':'classes'}
          </div>
        )}
      </Card>

      <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:12}}>History ({history.length})</h3>
      {history.length===0
        ?<p style={{color:T.textMuted,fontSize:14,textAlign:'center',padding:'40px 0'}}>No marked classes yet.</p>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.map((c,i)=>(
            <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:500,fontSize:14,color:T.text}}>{formatDate(c.date)}</div>
                <div style={{fontSize:12,color:T.textMuted,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{c.time}</div>
              </div>
              <AttTag val={c.val}/>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ─── STATS VIEW ─────────────────────────────────────────────────────────── */
function StatsView({ stats }) {
  const totP=SUBJECTS.reduce((a,s)=>a+stats[s.id].present,0);
  const totT=SUBJECTS.reduce((a,s)=>a+stats[s.id].total,0);
  const oPct=totT>0?Math.round((totP/totT)*100):null;
  const safe=SUBJECTS.filter(s=>stats[s.id].pct>=75).length;
  const risk=SUBJECTS.filter(s=>stats[s.id].pct!=null&&stats[s.id].pct<75).length;
  const noData=SUBJECTS.filter(s=>stats[s.id].pct==null).length;
  const sorted=[...SUBJECTS].sort((a,b)=>(stats[b.id].pct||0)-(stats[a.id].pct||0));

  return (
    <div className="fade-up">
      <SectionHead title="Statistics" sub="Semester overview"/>
      {/* Summary pills */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:20}}>
        {[
          {l:'Overall',v:oPct!=null?`${oPct}%`:'—',c:oPct==null?T.textSub:oPct>=75?T.green:T.red,bg:oPct==null?T.borderLight:oPct>=75?T.greenBg:T.redBg},
          {l:'Safe',v:safe,c:T.green,bg:T.greenBg},
          {l:'At Risk',v:risk,c:T.red,bg:T.redBg},
          {l:'No Data',v:noData,c:T.textSub,bg:T.borderLight},
        ].map(({l,v,c,bg})=>(
          <div key={l} style={{background:bg,borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:26,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:12,color:T.textSub,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      <Card>
        <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:20}}>Subject-wise Attendance</h3>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {sorted.map(s=>{
            const st=stats[s.id],pct=st.pct;
            const barColor=pct==null?T.border:pct>=75?s.color:pct>=60?T.amber:T.red;
            return(
              <div key={s.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                    <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                  </div>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:barColor,flexShrink:0,marginLeft:8}}>
                    {pct!=null?`${pct}%`:'—'}
                  </span>
                </div>
                <div style={{position:'relative',height:8,background:T.borderLight,borderRadius:99,overflow:'visible'}}>
                  <div style={{height:'100%',width:`${pct||0}%`,background:barColor,borderRadius:99,transition:'width 0.8s ease'}}/>
                  <div style={{position:'absolute',top:-4,left:'75%',width:2,height:16,background:'#94a3b8',borderRadius:99}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:11,color:T.textMuted}}>
                  <span>{st.present}P · {st.absent}A · {st.total} classes</span>
                  {st.classesNeeded>0&&<span style={{color:T.red}}>Need {st.classesNeeded} more</span>}
                  {st.canBunk>0&&<span style={{color:T.green}}>Can skip {st.canBunk}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${T.borderLight}`,display:'flex',alignItems:'center',gap:6,fontSize:11,color:T.textMuted}}>
          <div style={{width:2,height:12,background:'#94a3b8',borderRadius:99}}/>
          <span>Vertical line marks the 75% attendance threshold</span>
        </div>
      </Card>
    </div>
  );
}

/* ─── SCHEDULE VIEW ──────────────────────────────────────────────────────── */
function ScheduleView({ myBatch }) {
  const [filter, setFilter] = useState('all');
  return (
    <div className="fade-up">
      <SectionHead title="Weekly Schedule" sub="2nd Semester · AY 2025-26"/>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[['all','All Batches'],['B1','Batch 1 (B-1)'],['B2','Batch 2 (B-2)']].map(([v,l])=>(
          <Pill key={v} label={l} active={filter===v} color={T.accent} onClick={()=>setFilter(v)}/>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {DAYS.map(day=>{
          const slots=filter==='all'?TIMETABLE[day]:TIMETABLE[day].filter(s=>s.batch==='all'||s.batch===filter);
          if(!slots||slots.length===0) return null;
          return(
            <Card key={day}>
              <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:12,display:'flex',justifyContent:'space-between'}}>
                {day}<span style={{fontSize:12,fontWeight:400,color:T.textMuted}}>{slots.length} slot{slots.length>1?'s':''}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {slots.map((slot,i)=>{
                  const subj=subjectMap[slot.subjectId];
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:T.borderLight,borderRadius:10,borderLeft:`3px solid ${subj?.color||T.border}`}}>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted,minWidth:90,flexShrink:0}}>{slot.time}</span>
                      <span style={{flex:1,fontSize:13,fontWeight:500,color:T.text}}>{subj?.name}</span>
                      <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        {slot.batch!=='all'&&<Badge variant="info">{slot.batch}</Badge>}
                        <span style={{fontSize:11,color:T.textMuted,background:T.surface,padding:'2px 8px',borderRadius:99,border:`1px solid ${T.border}`}}>{subj?.type}</span>
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

/* ─── APP ────────────────────────────────────────────────────────────────── */
const navStyle = {
  background:T.surface,border:`1px solid ${T.border}`,color:T.text,
  width:36,height:36,borderRadius:10,cursor:'pointer',fontSize:16,
  display:'flex',alignItems:'center',justifyContent:'center',
};

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState('today');
  const [settings, setSettings] = useState(false);

  const { records, notes, myBatch = 'B1' } = data;
  const setRecords = useCallback(r => setData(d=>{ const nd={...d,records:r}; saveData(nd); return nd; }), []);
  const setNotes   = useCallback(n => setData(d=>{ const nd={...d,notes:n};   saveData(nd); return nd; }), []);
  const setBatch   = useCallback(b => setData(d=>{ const nd={...d,myBatch:b}; saveData(nd); return nd; }), []);

  const stats = calcStats(records, myBatch);
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
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); setData(d); saveData(d); alert('Imported successfully!'); } catch{ alert('Invalid file'); } };
    r.readAsText(file); e.target.value='';
  }
  function clearAll() {
    if(window.confirm('Clear ALL attendance data? This cannot be undone.')) {
      const fresh={records:{},notes:{},myBatch};
      setData(fresh); saveData(fresh);
    }
  }

  const TABS = [
    {id:'today',   icon:'📋', label:'Today'},
    {id:'calendar',icon:'📅', label:'Calendar'},
    {id:'subjects',icon:'📚', label:'Subjects'},
    {id:'stats',   icon:'📊', label:'Stats'},
    {id:'schedule',icon:'🗓', label:'Schedule'},
  ];

  return (
    <div style={{minHeight:'100vh',background:T.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,position:'sticky',top:0,zIndex:200,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px'}}>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,paddingBottom:10,gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:11,background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:20}}>📡</span>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:T.text,letterSpacing:'-0.3px',lineHeight:1.2}}>ECE Attendance</div>
                <div style={{fontSize:11,color:T.textSub}}>B.Tech 1st Year · Sem 2 · AY 2025-26</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {oPct!=null&&(
                <div style={{
                  padding:'4px 12px',borderRadius:99,
                  background:oPct>=75?T.greenBg:T.redBg,
                  color:oPct>=75?T.green:T.red,
                  fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13,
                  border:`1px solid ${oPct>=75?T.greenBorder:T.redBorder}`,
                }}>{oPct}%</div>
              )}
              <button onClick={()=>setSettings(!settings)} style={{...navStyle,background:settings?T.accentLight:'',borderColor:settings?T.accentBorder:T.border,color:settings?T.accent:T.textSub,fontSize:18}}>⚙</button>
            </div>
          </div>

          {/* Settings panel */}
          {settings&&(
            <div className="slide-down" style={{borderTop:`1px solid ${T.borderLight}`,padding:'14px 0',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>My Batch</div>
                  <div style={{fontSize:11,color:T.textSub}}>Filters batch-specific lab/workshop slots</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Pill label="Batch 1 (B-1)" active={myBatch==='B1'} color={T.accent} onClick={()=>setBatch('B1')}/>
                  <Pill label="Batch 2 (B-2)" active={myBatch==='B2'} color={T.accent} onClick={()=>setBatch('B2')}/>
                </div>
              </div>
              <Divider margin="4px 0"/>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={exportData} style={actionBtn(T.blue)}>⬇ Export JSON</button>
                <label style={{...actionBtn(T.green),cursor:'pointer'}}>
                  ⬆ Import JSON
                  <input type="file" accept=".json" onChange={importData} style={{display:'none'}}/>
                </label>
                <button onClick={clearAll} style={actionBtn(T.red)}>🗑 Clear Data</button>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div style={{display:'flex',overflowX:'auto',gap:0,marginTop:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setSettings(false);}} style={{
                background:'none',border:'none',cursor:'pointer',padding:'10px 14px',
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

      {/* ── CONTENT ── */}
      <div style={{maxWidth:720,margin:'0 auto',padding:'24px 16px 80px'}}>
        {tab==='today'    && <TodayView    records={records} setRecords={setRecords} notes={notes} setNotes={setNotes} myBatch={myBatch}/>}
        {tab==='calendar' && <CalendarView records={records} setRecords={setRecords} myBatch={myBatch}/>}
        {tab==='subjects' && <SubjectsView records={records} stats={stats} myBatch={myBatch}/>}
        {tab==='stats'    && <StatsView    stats={stats}/>}
        {tab==='schedule' && <ScheduleView myBatch={myBatch}/>}
      </div>

      {/* ── LEGEND ── */}
      <div style={{
        position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',
        background:T.surface,border:`1px solid ${T.border}`,borderRadius:99,
        padding:'8px 20px',display:'flex',gap:16,
        boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12,fontWeight:600,whiteSpace:'nowrap',
      }}>
        <span style={{color:T.green}}>P = Present</span>
        <span style={{color:T.red}}>A = Absent</span>
        <span style={{color:T.amber}}>L = Leave</span>
      </div>
    </div>
  );
}

function actionBtn(color) {
  return {
    padding:'7px 14px',borderRadius:99,border:`1px solid ${color}33`,
    background:`${color}11`,color,fontWeight:600,fontSize:13,cursor:'pointer',
    fontFamily:"'DM Sans',sans-serif",
  };
}
