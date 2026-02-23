import React, { useState, useCallback } from 'react';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { id: 'ENGG_CHEM', name: 'Engineering Chemistry', abbr: 'ENGG. CHEM.', color: '#FF6B6B', teacher: 'B. Menesal (BM)', type: 'theory' },
  { id: 'ENGG_MATHS', name: 'Engineering Mathematics A', abbr: 'ENGG. MATHS', color: '#4ECDC4', teacher: 'Ratan Sogi (RJ)', type: 'theory' },
  { id: 'IEE', name: 'Intro to Electrical Engineering', abbr: 'IEE', color: '#FFE66D', teacher: 'Manoj Gupta (MG)', type: 'theory' },
  { id: 'COMP_PROG', name: 'Computer Programming', abbr: 'COMP. PROG.', color: '#A8E6CF', teacher: 'Pradees Patanwar (PP)', type: 'theory' },
  { id: 'ENV_SCIENCE', name: 'Environmental Science & Ecology', abbr: 'ENV. SCIENCE', color: '#C3A6FF', teacher: 'Manish Bhaskar (MB)', type: 'theory' },
  { id: 'IND_CONST', name: 'Indian Constitution', abbr: 'IND. CONST.', color: '#FFB347', teacher: 'Vaibhav Kant Singh (VKS)', type: 'theory' },
  { id: 'ENGG_WORK', name: 'Engineering Workshop Practice', abbr: 'ENGG. WORK. PRAC.', color: '#FF9FF3', teacher: 'Vikas Kumar (VK)', type: 'lab' },
  { id: 'COMP_PROG_LAB', name: 'Computer Programming Lab', abbr: 'COMP. PROG. LAB', color: '#54A0FF', teacher: 'Pradees Patanwar (PP)', type: 'lab' },
  { id: 'IEE_LAB', name: 'IEE Lab', abbr: 'IEE LAB', color: '#5F27CD', teacher: 'Manoj Gupta (MG)', type: 'lab' },
  { id: 'ENGG_CHEM_LAB', name: 'Engineering Chemistry Lab', abbr: 'ENGG. CHEM. LAB', color: '#EE5A24', teacher: 'B. Menesal (BM)', type: 'lab' },
  { id: 'SPORTS_YOGA', name: 'Sports & Yoga', abbr: 'SPORTS & YOGA', color: '#1DD1A1', teacher: 'Ramesh Ji (RJ)', type: 'activity' },
];

// Timetable: each slot = { subjectId, time }
const TIMETABLE = {
  MON: [
    { subjectId: 'COMP_PROG', time: '10:00–11:00' },
    { subjectId: 'ENV_SCIENCE', time: '11:00–12:00' },
    { subjectId: 'ENGG_CHEM', time: '12:00–01:00' },
    { subjectId: 'ENGG_CHEM', time: '02:00–03:00' },
    { subjectId: 'SPORTS_YOGA', time: '03:00–05:00' },
  ],
  TUE: [
    { subjectId: 'IEE', time: '10:00–11:00' },
    { subjectId: 'ENGG_MATHS', time: '11:00–12:00' },
    { subjectId: 'ENGG_CHEM', time: '12:00–01:00' },
    { subjectId: 'COMP_PROG', time: '02:00–03:00' },
    { subjectId: 'IEE_LAB', time: '03:00–05:00' },
  ],
  WED: [
    { subjectId: 'COMP_PROG', time: '10:00–11:00' },
    { subjectId: 'ENGG_MATHS', time: '11:00–12:00' },
    { subjectId: 'IEE', time: '12:00–01:00' },
    { subjectId: 'IEE_LAB', time: '02:00–03:00' },
  ],
  THU: [
    { subjectId: 'ENV_SCIENCE', time: '10:00–11:00' },
    { subjectId: 'ENGG_MATHS', time: '11:00–12:00' },
    { subjectId: 'ENGG_CHEM', time: '12:00–01:00' },
    { subjectId: 'ENGG_WORK', time: '02:00–05:00' },
    { subjectId: 'ENGG_CHEM_LAB', time: '02:00–05:00' },
  ],
  FRI: [
    { subjectId: 'COMP_PROG', time: '10:00–11:00' },
    { subjectId: 'ENGG_MATHS', time: '11:00–12:00' },
    { subjectId: 'IEE', time: '12:00–01:00' },
    { subjectId: 'IND_CONST', time: '02:00–03:00' },
    { subjectId: 'ENGG_WORK', time: '04:00–06:00' },
  ],
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const MIN_ATTENDANCE = 75;

// ─── STORAGE ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ece_attendance_v2';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { records: {}, notes: {}, semesterStart: null };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getDayName(dateStr) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date(dateStr + 'T12:00:00').getDay()];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function calcStats(records) {
  const stats = {};
  SUBJECTS.forEach(s => {
    stats[s.id] = { present: 0, absent: 0, total: 0 };
  });
  Object.values(records).forEach(dayRecords => {
    Object.entries(dayRecords).forEach(([key, val]) => {
      // key format: subjectId__slotIndex
      const subjectId = key.split('__')[0];
      if (stats[subjectId]) {
        stats[subjectId].total++;
        if (val === 'P') stats[subjectId].present++;
        else if (val === 'A') stats[subjectId].absent++;
      }
    });
  });
  SUBJECTS.forEach(s => {
    const st = stats[s.id];
    st.pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : null;
    // Classes to attend to reach 75%
    const needed = st.pct !== null && st.pct < MIN_ATTENDANCE
      ? Math.ceil((MIN_ATTENDANCE * st.total - 100 * st.present) / (100 - MIN_ATTENDANCE))
      : 0;
    st.classesNeeded = needed;
    // Classes can bunk maintaining 75%
    const canBunk = st.pct !== null && st.pct >= MIN_ATTENDANCE
      ? Math.floor((100 * st.present - MIN_ATTENDANCE * st.total) / MIN_ATTENDANCE)
      : 0;
    st.canBunk = canBunk;
  });
  return stats;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const subjectMap = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

// Circular progress
function CircularProgress({ pct, size = 80, stroke = 8, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = pct == null ? circ : circ - (pct / 100) * circ;
  const trackColor = '#1e1e2e';
  const progressColor = pct == null ? '#444' : pct >= 75 ? color || '#4ECDC4' : pct >= 60 ? '#FFE66D' : '#FF6B6B';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={progressColor} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

function SubjectCard({ subject, stats, onClick }) {
  const st = stats[subject.id];
  const pct = st.pct;
  const status = pct == null ? 'no-data' : pct >= 75 ? 'safe' : pct >= 60 ? 'warning' : 'danger';
  const statusText = { 'no-data': 'No Data', safe: 'Safe ✓', warning: 'Low', danger: 'Critical!' };

  return (
    <div onClick={onClick} style={{
      background: 'linear-gradient(135deg, #16162a 0%, #1e1e3a 100%)',
      border: `1px solid ${subject.color}33`,
      borderRadius: 16,
      padding: '20px',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${subject.color}33`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: subject.color, borderRadius: '16px 16px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{subject.name}</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>{subject.teacher}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ color: '#4ECDC4' }}>✓ {st.present}</span>
            <span style={{ color: '#FF6B6B' }}>✗ {st.absent}</span>
            <span style={{ color: '#888' }}>/{st.total}</span>
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircularProgress pct={pct} size={72} stroke={7} color={subject.color} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {pct != null ? `${pct}%` : '—'}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #ffffff11', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: status === 'safe' ? '#4ECDC422' : status === 'warning' ? '#FFE66D22' : status === 'danger' ? '#FF6B6B22' : '#ffffff11',
          color: status === 'safe' ? '#4ECDC4' : status === 'warning' ? '#FFE66D' : status === 'danger' ? '#FF6B6B' : '#888',
        }}>{statusText[status]}</span>
        {st.classesNeeded > 0 && <span style={{ fontSize: 11, color: '#FF6B6B' }}>Need {st.classesNeeded} more</span>}
        {st.canBunk > 0 && <span style={{ fontSize: 11, color: '#4ECDC4' }}>Can skip {st.canBunk}</span>}
      </div>
    </div>
  );
}

function TodayView({ records, setRecords, notes, setNotes }) {
  const today = getToday();
  const dayName = getDayName(today);
  const slots = TIMETABLE[dayName] || [];
  const dayRecords = records[today] || {};

  function mark(subjectId, slotIdx, val) {
    const key = `${subjectId}__${slotIdx}`;
    const updated = { ...records, [today]: { ...dayRecords, [key]: val } };
    setRecords(updated);
  }

  if (slots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 22, color: '#fff', marginBottom: 8 }}>No Classes Today!</div>
        <div style={{ fontSize: 14 }}>Enjoy your {dayName === 'SUN' || dayName === 'SAT' ? 'weekend' : 'free day'}.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 4 }}>Today's Classes</div>
        <div style={{ color: '#888', fontSize: 14 }}>{formatDate(today)} · {dayName} · {slots.length} slots</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slots.map((slot, idx) => {
          const subj = subjectMap[slot.subjectId];
          const key = `${slot.subjectId}__${idx}`;
          const val = dayRecords[key];
          return (
            <div key={idx} style={{
              background: '#16162a', borderRadius: 14, padding: '16px 20px',
              border: `1px solid ${val === 'P' ? '#4ECDC455' : val === 'A' ? '#FF6B6B55' : '#ffffff11'}`,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 4, height: 48, borderRadius: 4, background: subj?.color || '#888', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, color: '#fff' }}>{subj?.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{slot.time}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['P', 'A', 'L'].map(s => (
                  <button key={s} onClick={() => mark(slot.subjectId, idx, s)} style={{
                    width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 13,
                    background: val === s
                      ? s === 'P' ? '#4ECDC4' : s === 'A' ? '#FF6B6B' : '#FFE66D'
                      : '#ffffff11',
                    color: val === s ? '#0a0a1a' : '#888',
                    transition: 'all 0.15s',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20 }}>
        <textarea
          placeholder="Notes for today..."
          value={notes[today] || ''}
          onChange={e => setNotes({ ...notes, [today]: e.target.value })}
          style={{
            width: '100%', minHeight: 80, background: '#16162a', border: '1px solid #ffffff15',
            borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14,
            fontFamily: 'Space Mono', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

function AttendancePicker({ date, slot, idx, records, setRecords, onClose }) {
  const dayRecords = records[date] || {};
  const key = `${slot.subjectId}__${idx}`;
  const val = dayRecords[key];

  function mark(v) {
    const updated = { ...records, [date]: { ...dayRecords, [key]: v } };
    setRecords(updated);
    onClose();
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      {['P', 'A', 'L'].map(s => (
        <button key={s} onClick={() => mark(s)} style={{
          flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 14,
          background: val === s ? (s === 'P' ? '#4ECDC4' : s === 'A' ? '#FF6B6B' : '#FFE66D') : '#ffffff11',
          color: val === s ? '#0a0a1a' : '#ccc',
        }}>{s === 'P' ? 'Present' : s === 'A' ? 'Absent' : 'Leave'}</button>
      ))}
    </div>
  );
}

function CalendarView({ records, setRecords }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedSlot, setExpandedSlot] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getDateStr(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function getDaySummary(d) {
    const dateStr = getDateStr(d);
    const dayName = getDayName(dateStr);
    const slots = TIMETABLE[dayName] || [];
    const dayRecords = records[dateStr] || {};
    const total = slots.length;
    const present = slots.filter((s, i) => dayRecords[`${s.subjectId}__${i}`] === 'P').length;
    const marked = slots.filter((s, i) => dayRecords[`${s.subjectId}__${i}`] != null).length;
    return { total, present, marked, slots, dayName, dateStr };
  }

  const today = getToday();
  const selectedSlots = selectedDate ? TIMETABLE[getDayName(selectedDate)] || [] : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: '#fff' }}>{monthName}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#666', fontFamily: 'Space Mono', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const { total, present, marked, dayName, dateStr } = getDaySummary(d);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isWeekend = dayName === 'SAT' || dayName === 'SUN';
          const dotColor = marked > 0 ? (present === marked ? '#4ECDC4' : present > 0 ? '#FFE66D' : '#FF6B6B') : null;

          return (
            <div key={d} onClick={() => setSelectedDate(isSelected ? null : dateStr)} style={{
              background: isSelected ? '#5F27CD33' : isToday ? '#ffffff11' : 'transparent',
              border: isToday ? '1px solid #5F27CD88' : isSelected ? '1px solid #5F27CD' : '1px solid transparent',
              borderRadius: 10, padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
              opacity: isWeekend ? 0.4 : 1,
            }}>
              <div style={{ fontSize: 13, fontFamily: 'Space Mono', color: isToday ? '#A8E6CF' : '#ccc', fontWeight: isToday ? 700 : 400 }}>{d}</div>
              {dotColor && <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, margin: '3px auto 0' }} />}
              {total > 0 && !dotColor && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ffffff22', margin: '4px auto 0' }} />}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div style={{ marginTop: 20, background: '#16162a', borderRadius: 14, padding: 20, border: '1px solid #ffffff11' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 16 }}>
            {formatDate(selectedDate)}
          </div>
          {selectedSlots.length === 0 ? (
            <div style={{ color: '#666', fontSize: 14 }}>No classes scheduled.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedSlots.map((slot, idx) => {
                const subj = subjectMap[slot.subjectId];
                const key = `${slot.subjectId}__${idx}`;
                const val = (records[selectedDate] || {})[key];
                const isExpanded = expandedSlot === `${selectedDate}__${idx}`;
                return (
                  <div key={idx} style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedSlot(isExpanded ? null : `${selectedDate}__${idx}`)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: '#0a0a1a', cursor: 'pointer',
                      borderLeft: `3px solid ${subj?.color || '#888'}`,
                    }}>
                      <span style={{ fontFamily: 'Syne', fontSize: 14, color: '#fff', flex: 1 }}>{subj?.name}</span>
                      <span style={{ fontSize: 12, color: '#666' }}>{slot.time}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontFamily: 'Space Mono',
                        background: val === 'P' ? '#4ECDC422' : val === 'A' ? '#FF6B6B22' : val === 'L' ? '#FFE66D22' : '#ffffff11',
                        color: val === 'P' ? '#4ECDC4' : val === 'A' ? '#FF6B6B' : val === 'L' ? '#FFE66D' : '#555',
                      }}>{val || '·'}</span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px', background: '#0a0a1a' }}>
                        <AttendancePicker date={selectedDate} slot={slot} idx={idx} records={records} setRecords={setRecords} onClose={() => setExpandedSlot(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navBtn = {
  background: '#ffffff11', border: 'none', color: '#fff', width: 36, height: 36,
  borderRadius: 10, cursor: 'pointer', fontSize: 18, fontFamily: 'Space Mono',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function StatsView({ stats }) {
  const overallPresent = SUBJECTS.reduce((a, s) => a + stats[s.id].present, 0);
  const overallTotal = SUBJECTS.reduce((a, s) => a + stats[s.id].total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : null;

  const safe = SUBJECTS.filter(s => stats[s.id].pct >= 75).length;
  const warn = SUBJECTS.filter(s => stats[s.id].pct != null && stats[s.id].pct < 75).length;

  return (
    <div>
      {/* Overview card */}
      <div style={{
        background: 'linear-gradient(135deg, #5F27CD22, #4ECDC422)',
        borderRadius: 20, padding: 28, marginBottom: 24,
        border: '1px solid #5F27CD44', textAlign: 'center',
      }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          <CircularProgress pct={overallPct} size={120} stroke={10} color="#5F27CD" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {overallPct != null ? `${overallPct}%` : '—'}
            </span>
            <span style={{ fontSize: 10, color: '#888' }}>overall</span>
          </div>
        </div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 8 }}>Overall Attendance</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: '#888' }}>
          <span>{overallPresent} present</span>
          <span>{overallTotal - overallPresent} absent</span>
          <span>{overallTotal} total</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <div style={{ background: '#4ECDC422', borderRadius: 10, padding: '6px 14px', color: '#4ECDC4', fontSize: 12, fontWeight: 600 }}>✓ {safe} safe</div>
          <div style={{ background: '#FF6B6B22', borderRadius: 10, padding: '6px 14px', color: '#FF6B6B', fontSize: 12, fontWeight: 600 }}>⚠ {warn} at risk</div>
        </div>
      </div>

      {/* Subject bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...SUBJECTS].sort((a, b) => (stats[b.id].pct || 0) - (stats[a.id].pct || 0)).map(s => {
          const st = stats[s.id];
          const pct = st.pct;
          const barColor = pct == null ? '#444' : pct >= 75 ? s.color : pct >= 60 ? '#FFE66D' : '#FF6B6B';
          return (
            <div key={s.id} style={{ background: '#16162a', borderRadius: 12, padding: '14px 18px', border: '1px solid #ffffff0a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.name}</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 13, color: barColor, fontWeight: 700 }}>
                  {pct != null ? `${pct}%` : 'N/A'}
                </span>
              </div>
              <div style={{ height: 6, background: '#ffffff11', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct || 0}%`, background: barColor,
                  borderRadius: 6, transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#666' }}>
                <span>{st.present}P / {st.absent}A / {st.total} classes</span>
                {st.classesNeeded > 0 && <span style={{ color: '#FF6B6B' }}>Need {st.classesNeeded} more classes</span>}
                {st.canBunk > 0 && <span style={{ color: '#4ECDC4' }}>Can skip {st.canBunk}</span>}
              </div>
              {/* 75% target line visual */}
              <div style={{ position: 'relative', marginTop: 4 }}>
                <div style={{ position: 'absolute', left: '75%', top: -18, transform: 'translateX(-50%)', width: 1, height: 6, background: '#ffffff33' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimetableView() {
  return (
    <div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 20 }}>Weekly Schedule</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DAYS.map(day => (
          <div key={day} style={{ background: '#16162a', borderRadius: 14, padding: 18, border: '1px solid #ffffff0a' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 12 }}>{day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIMETABLE[day].map((slot, i) => {
                const subj = subjectMap[slot.subjectId];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: '#0a0a1a', borderLeft: `3px solid ${subj?.color}` }}>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#666', minWidth: 80 }}>{slot.time}</span>
                    <span style={{ fontSize: 13, color: '#fff', flex: 1 }}>{subj?.name}</span>
                    <span style={{ fontSize: 10, color: '#666', background: '#ffffff0a', padding: '2px 8px', borderRadius: 6 }}>{subj?.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [activeTab, setActiveTab] = useState('today');
  const [selectedSubject, setSelectedSubject] = useState(null);

  const { records, notes } = data;

  const setRecords = useCallback((r) => {
    setData(d => { const nd = { ...d, records: r }; saveData(nd); return nd; });
  }, []);

  const setNotes = useCallback((n) => {
    setData(d => { const nd = { ...d, notes: n }; saveData(nd); return nd; });
  }, []);

  const stats = calcStats(records);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attendance_backup.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        setData(imported);
        saveData(imported);
        alert('Data imported successfully!');
      } catch { alert('Invalid file!'); }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (window.confirm('Clear all attendance data? This cannot be undone.')) {
      const fresh = { records: {}, notes: {}, semesterStart: null };
      setData(fresh);
      saveData(fresh);
    }
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: '📋' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'subjects', label: 'Subjects', icon: '📚' },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'schedule', label: 'Schedule', icon: '🗓' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a1a',
      fontFamily: 'Syne, sans-serif',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #0d0d24 0%, #0a0a1a 100%)',
        borderBottom: '1px solid #ffffff0f',
        padding: '20px 20px 0',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>
                <span style={{ color: '#5F27CD' }}>ECE</span> Attendance
              </div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'Space Mono', marginTop: 2 }}>
                B.Tech 1st Year · 2nd Sem · AY 2025-26
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportData} title="Export" style={{ ...iconBtn, background: '#5F27CD22', color: '#A29BFE' }}>⬇</button>
              <label title="Import" style={{ ...iconBtn, background: '#4ECDC422', color: '#4ECDC4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ⬆<input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
              </label>
              <button onClick={clearAllData} title="Clear Data" style={{ ...iconBtn, background: '#FF6B6B22', color: '#FF6B6B' }}>🗑</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 1 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedSubject(null); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px',
                fontFamily: 'Syne', fontWeight: 600, fontSize: 13, color: activeTab === t.id ? '#fff' : '#555',
                borderBottom: activeTab === t.id ? '2px solid #5F27CD' : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'color 0.15s',
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 100px' }}>
        {activeTab === 'today' && (
          <TodayView records={records} setRecords={setRecords} notes={notes} setNotes={setNotes} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView records={records} setRecords={setRecords} />
        )}
        {activeTab === 'subjects' && !selectedSubject && (
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 20 }}>All Subjects</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {SUBJECTS.map(s => (
                <SubjectCard key={s.id} subject={s} stats={stats} onClick={() => setSelectedSubject(s.id)} />
              ))}
            </div>
          </div>
        )}
        {activeTab === 'subjects' && selectedSubject && (
          <SubjectDetail subjectId={selectedSubject} records={records} stats={stats} onBack={() => setSelectedSubject(null)} />
        )}
        {activeTab === 'stats' && <StatsView stats={stats} />}
        {activeTab === 'schedule' && <TimetableView />}
      </div>

      {/* Bottom floating legend */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        background: '#16162aee', backdropFilter: 'blur(12px)',
        border: '1px solid #ffffff11', borderRadius: 50,
        padding: '8px 20px', display: 'flex', gap: 16, fontSize: 12, fontFamily: 'Space Mono',
      }}>
        <span style={{ color: '#4ECDC4' }}>P = Present</span>
        <span style={{ color: '#FF6B6B' }}>A = Absent</span>
        <span style={{ color: '#FFE66D' }}>L = Leave</span>
      </div>
    </div>
  );
}

function SubjectDetail({ subjectId, records, stats, onBack }) {
  const subject = subjectMap[subjectId];
  const st = stats[subjectId];

  // Gather all classes for this subject
  const classes = [];
  Object.entries(records).forEach(([date, dayRec]) => {
    const dayName = getDayName(date);
    const slots = TIMETABLE[dayName] || [];
    slots.forEach((slot, idx) => {
      if (slot.subjectId === subjectId) {
        const key = `${subjectId}__${idx}`;
        const val = dayRec[key];
        if (val) classes.push({ date, time: slot.time, val });
      }
    });
  });
  classes.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'Syne', fontSize: 14, marginBottom: 20, padding: 0 }}>
        ← Back to Subjects
      </button>
      <div style={{ background: `linear-gradient(135deg, ${subject.color}11, #16162a)`, borderRadius: 20, padding: 24, marginBottom: 24, border: `1px solid ${subject.color}33` }}>
        <div style={{ width: 6, height: 40, background: subject.color, borderRadius: 4, marginBottom: 12 }} />
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 4 }}>{subject.name}</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>{subject.teacher}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: subject.color }}>{st.pct != null ? `${st.pct}%` : '—'}</div>
            <div style={{ fontSize: 11, color: '#666' }}>attendance</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: '#4ECDC4' }}>{st.present}</div>
            <div style={{ fontSize: 11, color: '#666' }}>present</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: '#FF6B6B' }}>{st.absent}</div>
            <div style={{ fontSize: 11, color: '#666' }}>absent</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 28, fontWeight: 700, color: '#fff' }}>{st.total}</div>
            <div style={{ fontSize: 11, color: '#666' }}>total</div>
          </div>
        </div>
        {st.classesNeeded > 0 && (
          <div style={{ marginTop: 16, background: '#FF6B6B22', borderRadius: 10, padding: '10px 16px', color: '#FF6B6B', fontSize: 13 }}>
            ⚠ Attend {st.classesNeeded} more consecutive classes to reach 75%
          </div>
        )}
        {st.canBunk > 0 && (
          <div style={{ marginTop: 16, background: '#4ECDC422', borderRadius: 10, padding: '10px 16px', color: '#4ECDC4', fontSize: 13 }}>
            ✓ You can safely skip {st.canBunk} more class{st.canBunk > 1 ? 'es' : ''}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 12 }}>Class History</div>
      {classes.length === 0 ? (
        <div style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No marked classes yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {classes.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#16162a', borderRadius: 10, padding: '12px 16px', border: '1px solid #ffffff0a' }}>
              <div>
                <div style={{ fontSize: 13, color: '#fff' }}>{formatDate(c.date)}</div>
                <div style={{ fontSize: 11, color: '#666', fontFamily: 'Space Mono' }}>{c.time}</div>
              </div>
              <span style={{
                fontFamily: 'Space Mono', fontWeight: 700, padding: '4px 14px', borderRadius: 8, fontSize: 13,
                background: c.val === 'P' ? '#4ECDC422' : c.val === 'A' ? '#FF6B6B22' : '#FFE66D22',
                color: c.val === 'P' ? '#4ECDC4' : c.val === 'A' ? '#FF6B6B' : '#FFE66D',
              }}>{c.val === 'P' ? 'Present' : c.val === 'A' ? 'Absent' : 'Leave'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
