import { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Links Gallery ────────────────────────────────────────────────────────────

const LINKS = [
  { domain: 'theodor-heuss-gymnasium-freiburg.de', label: 'Schulwebsite', url: 'https://www.theodor-heuss-gymnasium-freiburg.de' },
  { domain: 'moodle.org', label: 'Moodle', url: 'https://04105971160.moodle.bw.schule/' },
  { domain: 'webuntis.com', label: 'Webuntis', url: 'https://th-heuss-gym.webuntis.com/WebUntis/?school=th-heuss-gym#/basic/login' },
  { domain: 'nextcloud.com', label: 'Nextcloud', url: 'https://cloud.thg-freiburg.de/nextcloud' },
  { domain: 'gofundme.com', label: 'GoFundMe', url: 'https://gofund.me/6c2bc4e83' },
  { domain: 'discord.com', label: 'Discord', url: 'https://discord.gg/X5nzxXZU' },
  { domain: 'openai.com', label: 'ChatGPT', url: 'https://chatgpt.com' },
];

// ─── Teacher Data (THG Freiburg 2025/26) ──────────────────────────────────────

const TEACHERS: { name: string; subjects: string[]; email: string }[] = [
  { name: 'Marike Arenz', subjects: ['E', 'F'], email: 'marike.arenz@thg-freiburg.de' },
  { name: 'Swantje Armbruster', subjects: ['D', 'Sport', 'Ek'], email: 'swantje.armbruster@thg-freiburg.de' },
  { name: 'Elena Baier', subjects: ['BK', 'Sport'], email: 'elena.baier@thg-freiburg.de' },
  { name: 'Elisabeth Basteck', subjects: ['VKL'], email: 'elisabeth.basteck@thg-freiburg.de' },
  { name: 'Elisabeth Bauer', subjects: ['Mu', 'F'], email: 'elisabeth.bauer@thg-freiburg.de' },
  { name: 'Melanie Bloss', subjects: ['F', 'Bio', 'rkRel'], email: 'melanie.bloss@thg-freiburg.de' },
  { name: 'Marcus Buerger', subjects: ['Bio', 'Ch'], email: 'marcus.buerger@thg-freiburg.de' },
  { name: 'Michael Claus', subjects: ['Ch', 'Ph', 'NWT'], email: 'michael.claus@thg-freiburg.de' },
  { name: 'Stefani Cordes', subjects: ['E', 'Sport'], email: 'stefani.cordes@thg-freiburg.de' },
  { name: 'Heike Daka', subjects: ['D', 'Span', 'Wi'], email: 'heike.daka@thg-freiburg.de' },
  { name: 'Nicolas Derks', subjects: ['E', 'D', 'L'], email: 'nicolas.derks@thg-freiburg.de' },
  { name: 'Lena Dreher', subjects: ['M', 'F'], email: 'lena.dreher@thg-freiburg.de' },
  { name: 'Yasmin Eckert', subjects: ['M', 'Ek'], email: 'yasmin.eckert@thg-freiburg.de' },
  { name: 'Clemens Engelhardt', subjects: ['E', 'Ch'], email: 'clemens.engelhardt@thg-freiburg.de' },
  { name: 'Thorsten Essmueller', subjects: ['Bio', 'E'], email: 'thorsten.essmueller@thg-freiburg.de' },
  { name: 'Isabelle Finsterwalder', subjects: ['E', 'Ek'], email: 'isabelle.finsterwalder@thg-freiburg.de' },
  { name: 'Sibylla Fischer', subjects: ['D', 'G', 'Gk'], email: 'sibylla.fischer@thg-freiburg.de' },
  { name: 'Joerg Frech', subjects: ['D', 'Sport'], email: 'joerg.frech@thg-freiburg.de' },
  { name: 'Esther Gehrmann', subjects: ['F', 'Span', 'Sport'], email: 'esther.gehrmann@thg-freiburg.de' },
  { name: 'Andrea Glombik', subjects: ['BK', 'D'], email: 'andrea.glombik@thg-freiburg.de' },
  { name: 'Anika Haering', subjects: ['M', 'rkRel'], email: 'anika.haering@thg-freiburg.de' },
  { name: 'Johanna Hauber', subjects: ['E', 'Ek'], email: 'johanna.hauber@thg-freiburg.de' },
  { name: 'Hannah Heers', subjects: ['D', 'GK', 'Wi'], email: 'hannah.heers@thg-freiburg.de' },
  { name: 'Joachim Henkel', subjects: ['Mus', 'D'], email: 'joachim.henkel@thg-freiburg.de' },
  { name: 'Gregor Herrmann-Wagner', subjects: ['evRel'], email: 'gregor.herrmann-wagner@thg-freiburg.de' },
  { name: 'Malte Herms', subjects: ['Bio', 'Sport'], email: 'malte.herms@thg-freiburg.de' },
  { name: 'Judith Herter', subjects: ['E', 'D'], email: 'judith.herter@thg-freiburg.de' },
  { name: 'Christine Hoefling', subjects: ['G', 'E', 'Eth'], email: 'christine.hoefling@thg-freiburg.de' },
  { name: 'Sabine Hoeke', subjects: ['Bio', 'Sport'], email: 'sabine.hoeke@thg-freiburg.de' },
  { name: 'Eva Jaeger', subjects: ['M', 'F'], email: 'eva.jaeger@thg-freiburg.de' },
  { name: 'Harald Janson', subjects: ['E', 'F', 'Sport'], email: 'harald.janson@thg-freiburg.de' },
  { name: 'Korinna Jehle', subjects: ['Bio', 'D'], email: 'korinna.jehle@thg-freiburg.de' },
  { name: 'Rainer Jensen', subjects: ['M', 'Ek'], email: 'rainer.jensen@thg-freiburg.de' },
  { name: 'Achim Kaltenhaeuser', subjects: ['M', 'Ph'], email: 'achim.kaltenhaeuser@thg-freiburg.de' },
  { name: 'Lotte Kaminski', subjects: ['D', 'Eth'], email: 'lotte.kaminski@thg-freiburg.de' },
  { name: 'Guenter Karrasch', subjects: ['D', 'G', 'Gk'], email: 'guenter.karrasch@thg-freiburg.de' },
  { name: 'Birgit Ketterer', subjects: ['D', 'Sport'], email: 'birgit.ketterer@thg-freiburg.de' },
  { name: 'Martin Kettler', subjects: ['M', 'Ph'], email: 'martin.kettler@thg-freiburg.de' },
  { name: 'Andrea Klatt', subjects: ['D', 'G'], email: 'andrea.klatt@thg-freiburg.de' },
  { name: 'Friederike Koepcke', subjects: ['D', 'F'], email: 'friederike.koepcke@thg-freiburg.de' },
  { name: 'Robert Kohleisen', subjects: ['E', 'G', 'Gk'], email: 'robert.kohleisen@thg-freiburg.de' },
  { name: 'Marius Kopfmann', subjects: ['E', 'Spa'], email: 'marius.kopfmann@thg-freiburg.de' },
  { name: 'Kathrin Kuehn', subjects: ['D', 'Gk', 'E'], email: 'kathrin.kuehn@thg-freiburg.de' },
  { name: 'Andrea Kullmann', subjects: ['F', 'Sport'], email: 'andrea.kullmann@thg-freiburg.de' },
  { name: 'Holger Liebmann', subjects: ['D', 'L'], email: 'holger.liebmann@thg-freiburg.de' },
  { name: 'Arne Lucht', subjects: ['M', 'Gk', 'Ek'], email: 'arne.lucht@thg-freiburg.de' },
  { name: 'Julia Mager', subjects: ['D', 'F'], email: 'julia.mager@thg-freiburg.de' },
  { name: 'Katrin Malzacher', subjects: ['Bio', 'Ch'], email: 'katrin.malzacher@thg-freiburg.de' },
  { name: 'Yvonne Mamalis', subjects: ['F', 'Span', 'Ek'], email: 'yvonne.mamalis@thg-freiburg.de' },
  { name: 'Lina Mangold', subjects: ['D', 'Powi'], email: 'lina.mangold@thg-freiburg.de' },
  { name: 'Milena Marmora', subjects: ['E', 'Bio'], email: 'milena.marmora@thg-freiburg.de' },
  { name: 'Eric Martin', subjects: ['E', 'Eth'], email: 'eric.martin@thg-freiburg.de' },
  { name: 'Mareike Martin', subjects: ['D', 'evRel'], email: 'mareike.martin@thg-freiburg.de' },
  { name: 'Juergen Mehnert', subjects: ['M', 'Ph'], email: 'juergen.mehnert@thg-freiburg.de' },
  { name: 'Andres Meihofer', subjects: ['M', 'Ek', 'Gk', 'G', 'Wi'], email: 'andres.meihofer@thg-freiburg.de' },
  { name: 'Angelika Metzger', subjects: ['M', 'Ph'], email: 'angelika.metzger@thg-freiburg.de' },
  { name: 'Petra Mody', subjects: ['D', 'F', 'Ek'], email: 'petra.mody@thg-freiburg.de' },
  { name: 'Gesa Mueller', subjects: ['D', 'Bio'], email: 'gesa.mueller@thg-freiburg.de' },
  { name: 'Ursula Philipp', subjects: ['rkRel', 'M'], email: 'ursula.philipp@thg-freiburg.de' },
  { name: 'Oliver Reim', subjects: ['M', 'Sport'], email: 'oliver.reim@thg-freiburg.de' },
  { name: 'Klaus Riesterer', subjects: ['Bio', 'Sport'], email: 'klaus.riesterer@thg-freiburg.de' },
  { name: 'Silke Riffel', subjects: ['D', 'E', 'G', 'Eth'], email: 'silke.riffel@thg-freiburg.de' },
  { name: 'Thomas Rosswog', subjects: ['Ph', 'Ek'], email: 'thomas.rosswog@thg-freiburg.de' },
  { name: 'Kerstin Schade', subjects: ['D', 'F'], email: 'kerstin.schade@thg-freiburg.de' },
  { name: 'Kathrin Schade-Dilger', subjects: ['Mus', 'F'], email: 'kathrin.schade-dilger@thg-freiburg.de' },
  { name: 'Paul Schenk', subjects: ['Ph', 'Sport'], email: 'paul.schenk@thg-freiburg.de' },
  { name: 'Anna Schlosser', subjects: ['M', 'rkRel'], email: 'anna.schlosser@thg-freiburg.de' },
  { name: 'Heiko Schrauber', subjects: ['G', 'L'], email: 'heiko.schrauber@thg-freiburg.de' },
  { name: 'Georg Schwind', subjects: ['rkRel', 'G', 'Phil'], email: 'georg.schwind@thg-freiburg.de' },
  { name: 'Ulrich Seitz', subjects: ['D', 'Ek'], email: 'ulrich.seitz@thg-freiburg.de' },
  { name: 'Tanja Seller', subjects: ['Ch', 'Bio'], email: 'tanja.seller@thg-freiburg.de' },
  { name: 'Kerstin Sosnowski', subjects: ['Sport', 'Ek'], email: 'kerstin.sosnowski@thg-freiburg.de' },
  { name: 'Katrin Steineck-Trinques', subjects: ['M', 'E'], email: 'katrin.steineck-trinques@thg-freiburg.de' },
  { name: 'Simon Steinmetz', subjects: ['D', 'Sport'], email: 'simon.steinmetz@thg-freiburg.de' },
  { name: 'Florian Stoeckle', subjects: ['G', 'Ch'], email: 'florian.stoeckle@thg-freiburg.de' },
  { name: 'Maren Stoelzle', subjects: ['D', 'Sport', 'Eth'], email: 'maren.stoelzle@thg-freiburg.de' },
  { name: 'Johanna Stoll', subjects: ['E', 'Spa'], email: 'johanna.stoll@thg-freiburg.de' },
  { name: 'Bettina Struwe', subjects: ['Bio', 'Sport'], email: 'bettina.struwe@thg-freiburg.de' },
  { name: 'Susanne Teutsch', subjects: ['F', 'Span', 'G', 'Gk'], email: 'susanne.teutsch@thg-freiburg.de' },
  { name: 'Barbara Voegele', subjects: ['F', 'G'], email: 'barbara.voegele@thg-freiburg.de' },
  { name: 'Tobias Vogel', subjects: ['M', 'Bio', 'Sport'], email: 'tobias.vogel@thg-freiburg.de' },
  { name: 'Charlotte Weber', subjects: ['BK', 'M'], email: 'charlotte.weber@thg-freiburg.de' },
  { name: 'Ines Weiler', subjects: ['BK', 'Bio'], email: 'ines.weiler@thg-freiburg.de' },
  { name: 'Rene Wermuth', subjects: ['F', 'D', 'Eth'], email: 'rene.wermuth@thg-freiburg.de' },
  { name: 'Sarah Werner', subjects: ['D', 'Span'], email: 'sarah.werner@thg-freiburg.de' },
  { name: 'Andreas Wiedemann', subjects: ['D', 'G', 'Gk', 'M'], email: 'andreas.wiedemann@thg-freiburg.de' },
  { name: 'Marlon Zickgraf', subjects: ['Mus'], email: 'marlon.zickgraf@thg-freiburg.de' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export const LinksPage = () => {
  const [teacherSearch, setTeacherSearch] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const filteredTeachers = teacherSearch.trim()
    ? TEACHERS.filter(t =>
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.subjects.some(s => s.toLowerCase().includes(teacherSearch.toLowerCase()))
      )
    : TEACHERS;

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Links & Ressourcen</h1>
            <p className="text-gray-500 mt-1 text-sm">Alles Wichtige – an einem Ort.</p>
          </div>

          {/* Links Icon Gallery */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Links</h2>
            <div className="flex flex-wrap gap-3">
              {LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:shadow-lg hover:shadow-primary-900/30 hover:-translate-y-0.5 hover:border-gray-600 transition-all duration-200 text-sm font-medium text-gray-200 hover:text-white"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${link.domain}&sz=64`}
                    alt={link.label}
                    className="w-5 h-5 rounded-sm flex-shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  {link.label}
                </a>
              ))}
            </div>
          </section>

          {/* Stundenplan placeholder */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Stundenplan</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-900/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-300 font-medium">Stundenplan kommt bald</p>
              <p className="text-gray-500 text-sm mt-1">Daten werden noch hochgeladen.</p>
            </div>
          </section>

          {/* Teachers */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-xl font-bold text-white">Lehrerverzeichnis</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  placeholder="Name oder Fach suchen..."
                  className="border border-gray-600 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
                />
                {teacherSearch && (
                  <span className="text-xs text-gray-500">{filteredTeachers.length} gefunden</span>
                )}
              </div>
            </div>

            {/* Scrollable container */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto p-3 grid sm:grid-cols-2 gap-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {filteredTeachers.length === 0 ? (
                  <p className="text-gray-500 text-sm col-span-2 py-6 text-center">Keine Lehrkraft gefunden.</p>
                ) : (
                  filteredTeachers.map(teacher => (
                    <div
                      key={teacher.email}
                      className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-100 text-sm">{teacher.name}</p>
                        <p className="text-xs text-gray-500 truncate">{teacher.subjects.join(' · ')}</p>
                      </div>
                      <button
                        onClick={() => copyEmail(teacher.email)}
                        className={`text-xs flex-shrink-0 px-2.5 py-1 rounded-lg transition-colors ${
                          copiedEmail === teacher.email
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 hover:bg-primary-900/50 text-gray-400 hover:text-primary-400'
                        }`}
                        title={teacher.email}
                      >
                        {copiedEmail === teacher.email ? '✓ Kopiert' : 'E-Mail'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3">Stand: 04.02.2026 · THG Freiburg</p>
          </section>

          {/* Coming Soon Placeholders */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Bald verfügbar</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl p-6 opacity-70">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-bold text-gray-300 mb-1">Essensgruppe AI</h3>
                <p className="text-sm text-gray-500">Chatbot mit Sitzungsgedächtnis – coming soon.</p>
                <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full bg-gray-700 text-gray-400">In Entwicklung</span>
              </div>
              <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl p-6 opacity-70">
                <div className="text-3xl mb-3">🚨</div>
                <h3 className="font-bold text-gray-300 mb-1">PANIK Modus</h3>
                <p className="text-sm text-gray-500">Fokus-Aufgabenseite – wie Notion oder Moodle, nur schneller.</p>
                <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full bg-red-900/40 text-red-400">Demnächst</span>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};
