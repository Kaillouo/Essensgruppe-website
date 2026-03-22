import { useState, useMemo, useRef, useEffect } from 'react';
import {
  lessons, Lesson, HOUR_TIMES, ALL_KLASSEN,
  DAYS, DAY_NAMES,
} from '../data/stundenplan';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getTodayDay(): Lesson['day'] {
  const jsDay = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  if (jsDay === 0 || jsDay === 6) return 'Mo'; // weekend → Monday
  return DAYS[jsDay - 1];
}

// All hour slots that exist for a given day (sorted)
function getHourSlots(filtered: Lesson[]): number[] {
  const set = new Set<number>();
  filtered.forEach(l => l.hours.forEach(h => set.add(h)));
  return [...set].sort((a, b) => a - b);
}

// Subject color — deterministic hash-based
const SUBJECT_COLORS = [
  'bg-blue-900/60 border-blue-700/50 text-blue-200',
  'bg-purple-900/60 border-purple-700/50 text-purple-200',
  'bg-emerald-900/60 border-emerald-700/50 text-emerald-200',
  'bg-amber-900/60 border-amber-700/50 text-amber-200',
  'bg-rose-900/60 border-rose-700/50 text-rose-200',
  'bg-cyan-900/60 border-cyan-700/50 text-cyan-200',
  'bg-orange-900/60 border-orange-700/50 text-orange-200',
  'bg-pink-900/60 border-pink-700/50 text-pink-200',
  'bg-teal-900/60 border-teal-700/50 text-teal-200',
  'bg-indigo-900/60 border-indigo-700/50 text-indigo-200',
];

function subjectColor(subject: string): string {
  let hash = 0;
  const s = subject.toLowerCase().replace(/[0-9]/g, '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

// ─── Filter Dropdown Component ──────────────────────────────────────────────────

function FilterDropdown({ label, options, selected, onChange, searchable }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = searchable && search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          selected.length > 0
            ? 'bg-primary-900/50 border-primary-600/50 text-primary-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-primary-600 text-white px-1.5 py-0.5 rounded-full text-[10px] leading-none">
            {selected.length}
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {selected.length > 0 && (
              <button
                onClick={() => { onChange([]); }}
                className="w-full text-left px-2 py-1 text-[11px] text-gray-500 hover:text-gray-300 mb-1"
              >
                Alle abwählen
              </button>
            )}
            {filtered.map(opt => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center gap-2 ${
                  selected.includes(opt) ? 'bg-primary-900/40 text-primary-300' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
                  selected.includes(opt) ? 'bg-primary-600 border-primary-500' : 'border-gray-600'
                }`}>
                  {selected.includes(opt) && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-xs py-2 text-center">Keine Ergebnisse</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function StundenplanSection() {
  const [selectedDay, setSelectedDay] = useState<Lesson['day']>(getTodayDay());
  const [weekFilter, setWeekFilter] = useState<'A' | 'B'>('A');
  const [hjFilter, setHjFilter] = useState<'Hj1' | 'Hj2'>('Hj2');
  const [selectedKlassen, setSelectedKlassen] = useState<string[]>(['K1']);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Week view: 1 class selected OR no class but teacher(s) selected
  const weekViewMode: 'klasse' | 'teacher' | null =
    selectedKlassen.length === 1 ? 'klasse'
    : selectedKlassen.length === 0 && selectedTeachers.length > 0 ? 'teacher'
    : null;
  const isWeekView = weekViewMode !== null;

  // Base pool: lessons matching week + halbjahr (global toggles)
  const basePool = useMemo(() => {
    return lessons.filter(l => {
      if (l.week !== 'AB' && l.week !== weekFilter) return false;
      if (l.halbjahr && l.halbjahr !== hjFilter) return false;
      return true;
    });
  }, [weekFilter, hjFilter]);

  // Cascading available options: Klasse → Lehrer → Fach
  const availableTeachers = useMemo(() => {
    let pool = basePool;
    if (selectedKlassen.length > 0) pool = pool.filter(l => selectedKlassen.includes(l.klasse));
    return [...new Set(pool.map(l => l.teacher))].filter(t => t !== '—').sort();
  }, [basePool, selectedKlassen]);

  const availableSubjects = useMemo(() => {
    let pool = basePool;
    if (selectedKlassen.length > 0) pool = pool.filter(l => selectedKlassen.includes(l.klasse));
    if (selectedTeachers.length > 0) pool = pool.filter(l => selectedTeachers.includes(l.teacher));
    return [...new Set(pool.map(l => l.subject))].sort();
  }, [basePool, selectedKlassen, selectedTeachers]);

  // Auto-clear selections that are no longer valid after upstream filter changes
  useEffect(() => {
    if (selectedTeachers.length > 0) {
      const valid = selectedTeachers.filter(t => availableTeachers.includes(t));
      if (valid.length !== selectedTeachers.length) setSelectedTeachers(valid);
    }
  }, [availableTeachers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const valid = selectedSubjects.filter(s => availableSubjects.includes(s));
      if (valid.length !== selectedSubjects.length) setSelectedSubjects(valid);
    }
  }, [availableSubjects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter lessons (skip day filter in week view)
  const filtered = useMemo(() => {
    return basePool.filter(l => {
      // Day — only filter by day in single-day mode
      if (!isWeekView && l.day !== selectedDay) return false;
      // Klasse filter
      if (selectedKlassen.length > 0 && !selectedKlassen.includes(l.klasse)) return false;
      // Teacher filter
      if (selectedTeachers.length > 0 && !selectedTeachers.includes(l.teacher)) return false;
      // Subject filter
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(l.subject)) return false;
      return true;
    });
  }, [selectedDay, selectedKlassen, selectedTeachers, selectedSubjects, isWeekView, basePool]);

  // Get all unique hours present, in order
  const hourSlots = useMemo(() => getHourSlots(filtered), [filtered]);

  // Group lessons by klasse for the selected day
  const klassenInView = useMemo(() => {
    const set = new Set(filtered.map(l => l.klasse));
    return ALL_KLASSEN.filter(k => set.has(k));
  }, [filtered]);

  // Build hour blocks for time labels
  const allHourBlocks = useMemo(() => {
    return hourSlots.map(h => ({
      hour: h,
      time: HOUR_TIMES[h],
      label: `${h}. Std`,
    }));
  }, [hourSlots]);

  // Get lessons for a specific klasse and hour (optionally filtered by day for week view)
  const getLessonsAt = (klasse: string, hour: number, day?: Lesson['day']) => {
    return filtered.filter(l =>
      l.klasse === klasse &&
      l.hours.includes(hour) &&
      (day ? l.day === day : true)
    );
  };

  // Get all lessons at a given hour+day (no klasse constraint — for teacher week view)
  const getAllLessonsAt = (hour: number, day: Lesson['day']) => {
    return filtered.filter(l => l.hours.includes(hour) && l.day === day);
  };

  // Check if an hour is the start of a multi-hour lesson
  const isLessonStart = (lesson: Lesson, hour: number) => lesson.hours[0] === hour;

  // Check if this hour is spanned by a previous hour's lesson (optionally per day)
  const isSpanned = (klasse: string, hour: number, day?: Lesson['day']) => {
    return filtered.some(l =>
      l.klasse === klasse &&
      l.hours.length > 1 &&
      l.hours.includes(hour) &&
      l.hours[0] !== hour &&
      (day ? l.day === day : true)
    );
  };

  const hasActiveFilters = selectedKlassen.length > 0 || selectedTeachers.length > 0 || selectedSubjects.length > 0;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-white mb-4">Stundenplan</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        {/* ─── Filter Bar ─── */}
        <div className="p-3 border-b border-gray-800 space-y-2">
          {/* Day tabs — hidden in week view */}
          {!isWeekView && (
            <div className="flex gap-1">
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedDay === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                  }`}
                >
                  <span className="hidden sm:inline">{DAY_NAMES[d]}</span>
                  <span className="sm:hidden">{d}</span>
                </button>
              ))}
            </div>
          )}
          {isWeekView && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary-400 font-medium">Wochenansicht</span>
              <span className="text-xs text-gray-500">
                — {weekViewMode === 'klasse'
                  ? selectedKlassen[0]
                  : selectedTeachers.length === 1
                    ? selectedTeachers[0]
                    : `${selectedTeachers.length} Lehrer`}
              </span>
            </div>
          )}

          {/* Toggles + filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* A/B toggle */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden">
              {(['A', 'B'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWeekFilter(w)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    weekFilter === w
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {w}-Woche
                </button>
              ))}
            </div>

            {/* Hj toggle */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden">
              {(['Hj1', 'Hj2'] as const).map(hj => (
                <button
                  key={hj}
                  onClick={() => setHjFilter(hj)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    hjFilter === hj
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {hj === 'Hj1' ? '1. Hj' : '2. Hj'}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-gray-700 mx-1 hidden sm:block" />

            {/* Dropdowns */}
            <FilterDropdown label="Klasse" options={ALL_KLASSEN} selected={selectedKlassen} onChange={setSelectedKlassen} />
            <FilterDropdown label="Lehrer" options={availableTeachers} selected={selectedTeachers} onChange={setSelectedTeachers} searchable />
            <FilterDropdown label="Fach" options={availableSubjects} selected={selectedSubjects} onChange={setSelectedSubjects} searchable />

            {hasActiveFilters && (
              <button
                onClick={() => { setSelectedKlassen([]); setSelectedTeachers([]); setSelectedSubjects([]); }}
                className="text-[11px] text-gray-500 hover:text-gray-300 underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* ─── Timetable Grid ─── */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">Keine Stunden für diese Auswahl gefunden.</p>
            </div>
          ) : isWeekView ? (
            /* ── Week view (1 class, days as columns) ── */
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="sticky left-0 bg-gray-900 z-10 p-2 text-gray-500 font-medium text-left w-20 min-w-[5rem]">Zeit</th>
                  {DAYS.map(d => (
                    <th key={d} className={`p-2 font-semibold text-center min-w-[7rem] ${
                      d === getTodayDay() ? 'text-primary-400' : 'text-gray-300'
                    }`}>
                      <span className="hidden sm:inline">{DAY_NAMES[d]}</span>
                      <span className="sm:hidden">{d}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allHourBlocks.map(({ hour, time, label }) => (
                  <tr key={hour} className="border-b border-gray-800/50">
                    <td className="sticky left-0 bg-gray-900 z-10 p-2 align-top">
                      <div className="text-gray-400 font-medium">{label}</div>
                      <div className="text-gray-600 text-[10px]">{time?.start}–{time?.end}</div>
                    </td>
                    {DAYS.map(day => {
                      if (weekViewMode === 'klasse') {
                        const klasse = selectedKlassen[0];
                        if (isSpanned(klasse, hour, day)) return null;

                        const lessonsHere = getLessonsAt(klasse, hour, day)
                          .filter(l => isLessonStart(l, hour) || l.hours.length === 1);

                        const maxSpan = lessonsHere.reduce((max, l) => {
                          const span = l.hours.filter(h => hourSlots.includes(h)).length;
                          return Math.max(max, span);
                        }, 1);

                        return (
                          <td key={day} className={`p-1 align-top ${day === getTodayDay() ? 'bg-primary-950/20' : ''}`} rowSpan={maxSpan > 1 ? maxSpan : undefined}>
                            <div className="space-y-1">
                              {lessonsHere.map((l, i) => (
                                <div
                                  key={i}
                                  className={`rounded-lg border px-2 py-1.5 ${subjectColor(l.subject)}`}
                                >
                                  <div className="font-semibold">{l.subject}</div>
                                  <div className="text-[10px] opacity-70">{l.teacher} · {l.room}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      }

                      // Teacher week view — no rowSpan to avoid layout conflicts with multiple teachers
                      const lessonsHere = getAllLessonsAt(hour, day)
                        .filter(l => isLessonStart(l, hour) || l.hours.length === 1);

                      return (
                        <td key={day} className={`p-1 align-top ${day === getTodayDay() ? 'bg-primary-950/20' : ''}`}>
                          <div className="space-y-1">
                            {lessonsHere.map((l, i) => (
                              <div
                                key={i}
                                className={`rounded-lg border px-2 py-1.5 ${subjectColor(l.subject)}`}
                              >
                                <div className="font-semibold">{l.subject}</div>
                                <div className="text-[10px] opacity-70">{l.klasse} · {l.room}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : klassenInView.length <= 6 ? (
            /* ── Grid view (for few classes, single day) ── */
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="sticky left-0 bg-gray-900 z-10 p-2 text-gray-500 font-medium text-left w-20 min-w-[5rem]">Zeit</th>
                  {klassenInView.map(k => (
                    <th key={k} className="p-2 text-gray-300 font-semibold text-center min-w-[7rem]">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allHourBlocks.map(({ hour, time, label }) => (
                  <tr key={hour} className="border-b border-gray-800/50">
                    <td className="sticky left-0 bg-gray-900 z-10 p-2 align-top">
                      <div className="text-gray-400 font-medium">{label}</div>
                      <div className="text-gray-600 text-[10px]">{time?.start}–{time?.end}</div>
                    </td>
                    {klassenInView.map(klasse => {
                      if (isSpanned(klasse, hour)) return null;

                      const lessonsHere = getLessonsAt(klasse, hour)
                        .filter(l => isLessonStart(l, hour) || l.hours.length === 1);

                      const maxSpan = lessonsHere.reduce((max, l) => {
                        const span = l.hours.filter(h => hourSlots.includes(h)).length;
                        return Math.max(max, span);
                      }, 1);

                      return (
                        <td key={klasse} className="p-1 align-top" rowSpan={maxSpan > 1 ? maxSpan : undefined}>
                          <div className="space-y-1">
                            {lessonsHere.map((l, i) => (
                              <div
                                key={i}
                                className={`rounded-lg border px-2 py-1.5 ${subjectColor(l.subject)} ${
                                  maxSpan > 1 ? 'h-full' : ''
                                }`}
                              >
                                <div className="font-semibold">{l.subject}</div>
                                <div className="text-[10px] opacity-70">{l.teacher} · {l.room}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Card view (for many classes) ── */
            <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {klassenInView.map(klasse => {
                const klasseLessons = filtered.filter(l => l.klasse === klasse);
                const byHour = new Map<string, Lesson[]>();
                klasseLessons.forEach(l => {
                  const key = l.hours.join(',');
                  if (!byHour.has(key)) byHour.set(key, []);
                  byHour.get(key)!.push(l);
                });

                return (
                  <div key={klasse} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
                      <span className="text-sm font-bold text-white">{klasse}</span>
                    </div>
                    <div className="p-2 flex flex-wrap gap-1.5">
                      {[...byHour.entries()]
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([hourKey, lsns]) => {
                          const hrs = hourKey.split(',').map(Number);
                          const startTime = HOUR_TIMES[hrs[0]]?.start ?? '';
                          const endTime = HOUR_TIMES[hrs[hrs.length - 1]]?.end ?? '';
                          return lsns.map((l, i) => (
                            <div
                              key={`${hourKey}-${i}`}
                              className={`rounded-lg border px-2.5 py-1.5 ${subjectColor(l.subject)}`}
                            >
                              <div className="font-semibold text-xs">{l.subject}</div>
                              <div className="text-[10px] opacity-70">{l.teacher} · {l.room}</div>
                              <div className="text-[10px] opacity-50 mt-0.5">
                                {hrs.length > 1 ? `${hrs[0]}.–${hrs[hrs.length - 1]}.` : `${hrs[0]}.`} Std · {startTime}–{endTime}
                              </div>
                            </div>
                          ));
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-800 flex items-center justify-between">
          <p className="text-[10px] text-gray-600">
            THG Freiburg · 2025/26 · {weekFilter}-Woche · {hjFilter === 'Hj1' ? '1.' : '2.'} Halbjahr
          </p>
          <p className="text-[10px] text-gray-600">
            {filtered.length} Einträge{isWeekView ? '' : ` · ${klassenInView.length} Klasse${klassenInView.length !== 1 ? 'n' : ''}`}
          </p>
        </div>
      </div>
    </section>
  );
}
