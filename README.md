# ECE Attendance Tracker
**B.Tech First Year · 2nd Semester · AY 2025-26**  
Department of Electronics & Communication Engineering  
Guru Ghasidas Vishwavidyalaya

---

## Features
- ✅ **Today's Classes** — Mark Present / Absent / Leave for today's slots
- 📅 **Calendar View** — Browse any past/future date, mark attendance from history
- 📚 **Subject-wise Stats** — Per-subject attendance %, history, safe-to-skip calculator
- 📊 **Overall Stats** — Global bar chart with 75% threshold indicators
- 🗓 **Weekly Schedule** — Full timetable reference
- 💾 **Persistent Storage** — Saved to localStorage (survives refresh)
- ⬇️ **Export JSON** — Backup your data anytime
- ⬆️ **Import JSON** — Restore from backup
- 🗑️ **Clear Data** — Reset everything

## Subjects Included
| Subject | Teacher |
|---|---|
| Engineering Chemistry | B. Menesal |
| Engineering Mathematics A | Ratan Sogi |
| Intro to Electrical Engineering | Manoj Gupta |
| Computer Programming | Pradees Patanwar |
| Environmental Science & Ecology | Manish Bhaskar |
| Indian Constitution | Vaibhav Kant Singh |
| Engineering Workshop Practice | Vikas Kumar |
| Computer Programming Lab | Pradees Patanwar |
| IEE Lab | Manoj Gupta |
| Engineering Chemistry Lab | B. Menesal |
| Sports & Yoga | — |

## Running Locally

```bash
npm install
npm start
```

## Deploy to Netlify
1. Push to GitHub
2. Connect repo on netlify.com
3. Build command: `npm run build`
4. Publish directory: `build`
5. Done — auto-configured via `netlify.toml`

## Deploy to Vercel
1. Push to GitHub
2. Import project on vercel.com
3. Framework: **Create React App**
4. Done — auto-configured via `vercel.json`

## Attendance Logic
- **75%+** → Safe ✓ (shows how many classes you can skip)
- **60–74%** → Warning ⚠️
- **<60%** → Critical (shows how many classes needed to reach 75%)

Formula for classes needed:
> `ceil((75 × total − 100 × present) / 25)`
