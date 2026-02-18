import { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Static Data (admin will update these) ───────────────────────────────────

const IMPORTANT_LINKS = [
  {
    icon: '🏫',
    title: 'School Website',
    description: 'Official school portal — news, info, and announcements.',
    url: 'https://example-school.de', // TODO: update with real URL
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: '📚',
    title: 'Moodle',
    description: 'Learning platform for homework, materials, and course content.',
    url: 'https://moodle.example-school.de', // TODO: update with real URL
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: '📅',
    title: 'Vertretungsplan',
    description: 'Substitution schedule — check for daily changes.',
    url: 'https://example-school.de/vertretung', // TODO: update with real URL
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: '📧',
    title: 'School Email',
    description: 'Access your school email account.',
    url: 'https://mail.example-school.de', // TODO: update with real URL
    color: 'from-green-500 to-green-600',
  },
];

const TEACHERS: { name: string; subjects: string[]; email: string }[] = [
  // TODO: populate with real teacher data
  { name: 'Frau Müller', subjects: ['Deutsch', 'Geschichte'], email: 'mueller@example-school.de' },
  { name: 'Herr Schmidt', subjects: ['Mathematik', 'Physik'], email: 'schmidt@example-school.de' },
  { name: 'Frau Weber', subjects: ['Englisch', 'Französisch'], email: 'weber@example-school.de' },
  { name: 'Herr Fischer', subjects: ['Biologie', 'Chemie'], email: 'fischer@example-school.de' },
  { name: 'Frau Koch', subjects: ['Kunst', 'Musik'], email: 'koch@example-school.de' },
  { name: 'Herr Bauer', subjects: ['Sport', 'Erdkunde'], email: 'bauer@example-school.de' },
];

// Stundenplan links per person (dropdown → embed/link)
// TODO: populate with real schedule links/embeds
const STUNDENPLAN_PEOPLE = [
  { name: 'Klasse 12a', url: '' },
  { name: 'Klasse 12b', url: '' },
  { name: 'Semesterplan', url: '' },
];

// ─── Components ───────────────────────────────────────────────────────────────

function LinkCard({ icon, title, description, url, color }: typeof IMPORTANT_LINKS[0]) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <span className="text-xs text-primary-500 mt-2 block">Open →</span>
    </a>
  );
}

function TeacherCard({ name, subjects, email }: typeof TEACHERS[0]) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{name}</p>
        <p className="text-xs text-gray-500 truncate">{subjects.join(' · ')}</p>
      </div>
      <a
        href={`mailto:${email}`}
        className="text-xs text-primary-600 hover:underline flex-shrink-0"
        title={email}
      >
        Email
      </a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const LinksPage = () => {
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  const filteredTeachers = teacherSearch.trim()
    ? TEACHERS.filter(t =>
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.subjects.some(s => s.toLowerCase().includes(teacherSearch.toLowerCase()))
      )
    : TEACHERS;

  const selectedPlanUrl = STUNDENPLAN_PEOPLE.find(p => p.name === selectedPlan)?.url ?? '';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Links & Resources</h1>
            <p className="text-gray-500 mt-1 text-sm">Everything you need for school — in one place.</p>
          </div>

          {/* Important Links */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Important Links</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {IMPORTANT_LINKS.map(link => (
                <LinkCard key={link.title} {...link} />
              ))}
            </div>
          </section>

          {/* Stundenplan */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📆 Stundenplan</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">Select plan:</label>
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— choose —</option>
                  {STUNDENPLAN_PEOPLE.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedPlan && selectedPlanUrl ? (
                <iframe
                  src={selectedPlanUrl}
                  className="w-full rounded-lg border border-gray-200"
                  style={{ height: '400px', border: 'none' }}
                  title={`Stundenplan — ${selectedPlan}`}
                />
              ) : selectedPlan && !selectedPlanUrl ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
                  Link for "{selectedPlan}" not yet configured. Ask the admin to add the URL.
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-400 text-sm">
                  Select a plan from the dropdown above to view the schedule.
                </div>
              )}
            </div>
          </section>

          {/* Teachers */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">👩‍🏫 Teachers</h2>
              <input
                type="text"
                value={teacherSearch}
                onChange={e => setTeacherSearch(e.target.value)}
                placeholder="Search by name or subject..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-60"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredTeachers.length === 0 ? (
                <p className="text-gray-400 text-sm col-span-2">No teachers found.</p>
              ) : (
                filteredTeachers.map(teacher => (
                  <TeacherCard key={teacher.name} {...teacher} />
                ))
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * Placeholder data — admin will update with real contacts.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};
