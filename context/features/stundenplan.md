# Stundenplan Feature

**Status:** IN PROGRESS
**Location:** Section within LinksPage (replaces placeholder)
**Access:** Public (no auth required)

---

## Overview

Interactive timetable viewer for Theodor-Heuss-Gymnasium Freiburg (2025/2026). Shows the full school schedule for grades 5–10 and K2 (K1 data missing — to be added later).

## Data Source

- Raw data: `content/stundenplanV2.md` (markdown tables)
- Converted to: `frontend/src/data/stundenplan.ts` (typed TypeScript array)
- Static data — no backend/DB needed

## UI Design

### Layout
- Lives inside the existing Stundenplan `<section>` on LinksPage
- Timeline view: hours/time slots on the left, lesson blocks in the main area
- Dark theme consistent with rest of the site

### Filters (top bar, stackable)
| Filter | Type | Options |
|--------|------|---------|
| Tag (Day) | Single-select tabs | Mo, Di, Mi, Do, Fr |
| A/B Woche | Toggle | A / B (default: A) |
| Halbjahr | Toggle | Hj1 / Hj2 (default: Hj2) |
| Klasse | Multi-select dropdown | 5a–5d, 6a–6d, 7a–7d, 8a–8c, 9a–9d, 10a–10c, K2 |
| Lehrer | Searchable dropdown | All teacher codes |
| Fach | Multi-select dropdown | All subject codes |
| Raum | Searchable dropdown | All room codes |

### Default View
- Shows current weekday (Mon–Fri); on weekends shows Monday
- No class pre-selected → shows ALL classes for that day
- Timeline with time blocks on the left axis

### Timeline
| Stunde | Zeit |
|--------|------|
| 1 | 07:50–08:35 |
| 2 | 08:35–09:20 |
| Pause | 09:20–09:40 |
| 3 | 09:40–10:25 |
| 4 | 10:25–11:10 |
| Pause | 11:10–11:30 |
| 5 | 11:30–12:15 |
| 6 | 12:15–13:00 |
| 7 (Mittag) | 13:10–13:55 |
| 8 | 14:00–14:45 |
| 9 | 14:45–15:30 |
| Pause | 15:30–15:45 |
| 10 | 15:45–16:25 |
| 11 | 16:25–17:10 |

### Behavior
- Filtering is AND-based (all active filters must match)
- When multiple classes match, show them as separate columns or grouped cards
- Double-hour blocks (e.g. "1–2") span two rows
- A/B week filter: show only lessons matching selected week (A or B); AB lessons always show
- Hj filter: show only lessons matching selected Halbjahr; lessons without Hj marking always show

## Missing Data
- K1 timetable — leave out for now, note in NEXT-STEPS.md
