import { useState, useEffect } from "react";
import {
  Music, Flame, ChevronDown, ChevronUp, Plus, X, Clock,
  BookOpen, Settings2, Check, MessageSquareText,
} from "lucide-react";

// Fallback window.storage to localStorage for local browser execution
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (key) => {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    set: async (key, val) => {
      localStorage.setItem(key, val);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Données — Phase 1 (16 semaines / 4 blocs de 4 semaines)             */
/* ------------------------------------------------------------------ */

const BLOCKS = [
  {
    id: 1,
    name: "Mise en place",
    weeks: [1, 2, 3, 4],
    technique: "Position des mains, jeu 5 doigts (do-ré-mi-fa-sol) mains séparées, legato de base",
    repertoire: "Premières pièces de la Méthode Rose en position de do, mains séparées",
    dechiffrage: "Notes isolées sur 5 notes, rythmes simples (rondes, blanches, noires)",
    theorie: "La portée, les clés, les valeurs de notes, premiers exercices de lecture rythmique",
    objectif: "Jouer 2-3 petites pièces 5 doigts mains séparées sans hésitation",
  },
  {
    id: 2,
    name: "Coordination",
    weeks: [5, 6, 7, 8],
    technique: "Mains ensemble en position de do, débuts du staccato, petits déplacements de position",
    repertoire: "Pièces Méthode Rose mains ensemble, rythmes avec croches",
    dechiffrage: "Courtes phrases mains séparées puis mains ensemble très simples",
    theorie: "Les croches, les silences courants, intervalles simples (2des, 3ces)",
    objectif: "Jouer une pièce simple mains ensemble sans s'arrêter, gamme de Do 1 octave mains séparées",
  },
  {
    id: 3,
    name: "Élargissement",
    weeks: [9, 10, 11, 12],
    technique: "Gammes de Sol et Fa majeur mains séparées (1 octave), doigtés standards",
    repertoire: "Pièces Méthode Rose avec changements de position",
    dechiffrage: "Notes hors position de do, rythmes pointés simples",
    theorie: "Armures à 1 dièse / 1 bémol, degrés I-IV-V",
    objectif: "Gammes Do/Sol/Fa mains séparées fluides, lecture aisée en clé de sol et de fa",
  },
  {
    id: 4,
    name: "Consolidation",
    weeks: [13, 14, 15, 16],
    technique: "Gammes Do/Sol/Fa mains ensemble (lentement), legato/staccato de base",
    repertoire: "Finaliser les pièces de Méthode Rose visées pour cette phase",
    dechiffrage: "Petites pièces complètes niveau très facile, une seule lecture",
    theorie: "Révision globale + auto-test avant le premier jalon trimestriel",
    objectif: "Gammes Do/Sol/Fa mains ensemble sans tension, déchiffrage fluide — prêt pour Czerny op.599",
  },
];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function buildDayTasks(block) {
  if (!block) return null;
  return {
    1: { matin: [`Gammes — ${block.technique}`, `Déchiffrage — ${block.dechiffrage}`],
         soir: [`Technique (échauffement)`, `Répertoire — ${block.repertoire}`, `Reprends un morceau déjà acquis`] },
    2: { matin: [`Gammes`, `Théorie (Danhauser) — ${block.theorie}`],
         soir: [`Répertoire — ${block.repertoire}`, `Déchiffrage — ${block.dechiffrage}`] },
    3: { lesson: true },
    4: { matin: [`Gammes`, `Théorie / oreille — ${block.theorie}`],
         soir: [`Répertoire — ${block.repertoire}`, `Déchiffrage — ${block.dechiffrage}`] },
    5: { matin: [`Gammes — bilan de la semaine`, `Déchiffrage un cran plus dur`],
         soir: [`Technique`, `Répertoire`, `Un morceau plaisir déjà su`] },
    6: { matin: [`Libre / rattrapage`],
         soir: [`Théorie / harmonie approfondie (30-45 min)`, `Nouveau morceau`, `Écoute active analysée`] },
    0: { rest: true },
  };
}

const LESSON_STRUCTURE = [
  { t: "Contrôle technique", d: "5 min", note: "Gammes + exercice en cours, correction immédiate de la posture" },
  { t: "Déchiffrage à vue", d: "10 min", note: "Devant le prof — le seul vrai contrôle, sans auto-évaluation biaisée" },
  { t: "Répertoire", d: "40-50 min", note: "Points difficiles de la semaine, phrasé, interprétation" },
  { t: "Théorie", d: "10-15 min", note: "Vérification Danhauser / oreille, clarifications" },
  { t: "Debrief", d: "10 min", note: "Priorités de la semaine suivante, questions restées ouvertes" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekNumber(startDateStr) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor((now - start) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function computeStreak(log) {
  const dates = new Set(log.map((e) => e.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (dates.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function computeMonthMinutes(log) {
  const ym = todayISO().slice(0, 7);
  return log.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + Number(e.minutes || 0), 0);
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    return res?.value ? JSON.parse(res.value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("Erreur de sauvegarde", key, e);
  }
}

/* ------------------------------------------------------------------ */
/* UI atoms                                                            */
/* ------------------------------------------------------------------ */

function StaffDivider() {
  return (
    <div className="staff-bg" aria-hidden="true">
      <div /><div /><div /><div /><div />
    </div>
  );
}

function TaskList({ items }) {
  return (
    <ul className="flex flex-col gap-2 mt-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--ivory)" }}>
          <Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--brass)" }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Main App                                                             */
/* ------------------------------------------------------------------ */

export default function App() {
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [log, setLog] = useState([]);
  const [notes, setNotes] = useState([]);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [message, setMessage] = useState("");

  const [formType, setFormType] = useState("soir");
  const [formMinutes, setFormMinutes] = useState("");
  const [formNote, setFormNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [dateDraft, setDateDraft] = useState(todayISO());

  useEffect(() => {
    (async () => {
      const s = await loadKey("settings", null);
      setStartDate(s?.phase1StartDate || null);
      setLog(await loadKey("practice-log", []));
      setNotes(await loadKey("lesson-notes", []));
      setLoading(false);
    })();
  }, []);

  async function confirmStartDate() {
    setStartDate(dateDraft);
    await saveKey("settings", { phase1StartDate: dateDraft });
  }

  async function addSession() {
    if (!formMinutes) return;
    const entry = { id: Date.now(), date: todayISO(), session: formType, minutes: Number(formMinutes), note: formNote };
    const newLog = [entry, ...log];
    setLog(newLog);
    setFormMinutes("");
    setFormNote("");
    setMessage("Séance enregistrée.");
    setTimeout(() => setMessage(""), 2200);
    await saveKey("practice-log", newLog);
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    const newNotes = [...notes, { id: Date.now(), text: noteInput.trim() }];
    setNotes(newNotes);
    setNoteInput("");
    await saveKey("lesson-notes", newNotes);
  }

  async function removeNote(id) {
    const newNotes = notes.filter((n) => n.id !== id);
    setNotes(newNotes);
    await saveKey("lesson-notes", newNotes);
  }

  const rawWeek = getWeekNumber(startDate);
  const week = rawWeek ? Math.min(Math.max(rawWeek, 1), 16) : null;
  const phaseDone = rawWeek && rawWeek > 16;
  const block = week ? BLOCKS.find((b) => b.weeks.includes(week)) : null;
  const dayTasks = buildDayTasks(block);
  const todayIdx = new Date().getDay();
  const todayInfo = dayTasks ? dayTasks[todayIdx] : null;
  const streak = computeStreak(log);
  const monthMin = computeMonthMinutes(log);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root{
          --ink:#141F38; --ink-2:#1B2B4C; --card:#1D2C4E; --card-2:#233258;
          --ivory:#F2EFE6; --muted:#93A0BC; --brass:#CBA135; --brass-dim:#8A7127;
          --sage:#7FA37A; --line:#2C3D66;
        }
        *{ box-sizing:border-box; }
        .app-root{ background:var(--ink); min-height:100vh; font-family:'Inter',sans-serif; color:var(--ivory); padding-bottom:2rem; }
        .font-display{ font-family:'Fraunces',serif; }
        .font-mono{ font-family:'IBM Plex Mono',monospace; }
        .staff-bg{ display:flex; flex-direction:column; gap:3px; height:18px; opacity:0.35; margin:6px 0 14px; }
        .staff-bg div{ height:1px; background:var(--line); }
        .card{ background:var(--card); border:1px solid var(--line); border-radius:10px; }
        .btn-brass{ background:var(--brass); color:var(--ink); font-weight:600; border:none; border-radius:8px; transition:filter .15s; }
        .btn-brass:hover{ filter:brightness(1.08); }
        .btn-ghost{ background:transparent; border:1px solid var(--line); color:var(--ivory); border-radius:8px; }
        .btn-ghost:hover{ border-color:var(--brass); }
        input, textarea, select{ background:var(--ink-2); border:1px solid var(--line); color:var(--ivory); border-radius:8px; padding:8px 10px; font-family:'Inter',sans-serif; }
        input:focus-visible, textarea:focus-visible, select:focus-visible, button:focus-visible{ outline:2px solid var(--brass); outline-offset:2px; }
        .tab-btn{ color:var(--muted); border-bottom:2px solid transparent; padding-bottom:8px; }
        .tab-btn.active{ color:var(--ivory); border-bottom-color:var(--brass); }
        .key{ width:14px; height:44px; border-radius:0 0 4px 4px; border:1px solid var(--line); }
        .key-future{ background:var(--ink-2); }
        .key-current{ background:var(--brass); border-color:var(--brass); box-shadow:0 0 0 3px rgba(203,161,53,0.25); }
        .key-done{ background:var(--brass-dim); border-color:var(--brass-dim); }
        @media (prefers-reduced-motion: reduce){ *{ transition:none !important; } }
      `}</style>

      {/* Header */}
      <header className="max-w-2xl mx-auto px-5 pt-8 pb-4">
        <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
          <Music size={18} />
          <span className="text-xs uppercase tracking-wide font-medium">Carnet de bord</span>
        </div>
        <h1 className="font-display text-3xl mt-1" style={{ color: "var(--ivory)" }}>
          Phase 1 — Fondations
        </h1>
        <StaffDivider />
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Chargement…</p>
        ) : startDate ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-mono" style={{ color: "var(--muted)" }}>
            <span>{phaseDone ? "Phase 1 terminée" : `Semaine ${week} / 16`}</span>
            <span className="flex items-center gap-1"><Flame size={14} style={{ color: "var(--brass)" }} /> {streak} j de suite</span>
            <span>{(monthMin / 60).toFixed(1)} h ce mois-ci</span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Définis ta date de départ pour activer le suivi.</p>
        )}
      </header>

      {/* Tabs */}
      <nav className="max-w-2xl mx-auto px-5 flex gap-6 border-b" style={{ borderColor: "var(--line)" }}>
        {[
          { id: "today", label: "Aujourd'hui" },
          { id: "route", label: "Feuille de route" },
          { id: "journal", label: "Journal" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn text-sm font-medium ${tab === t.id ? "active" : ""}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-2xl mx-auto px-5 mt-6 flex flex-col gap-5">
        {!loading && !startDate && (
          <div className="card p-5">
            <h2 className="font-display text-lg mb-2">Date de départ — Phase 1</h2>
            <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
              Choisis le jour où tu commences réellement. Le numéro de semaine et le bloc en cours seront calculés automatiquement.
            </p>
            <div className="flex gap-2">
              <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
              <button className="btn-brass px-4 py-2 text-sm" onClick={confirmStartDate}>Valider</button>
            </div>
          </div>
        )}

        {/* ---------------- Aujourd'hui ---------------- */}
        {tab === "today" && startDate && block && (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl">{DAY_NAMES[todayIdx]}</h2>
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>Bloc : {block.name}</span>
            </div>

            {todayInfo?.lesson && (
              <div className="card p-5" style={{ borderColor: "var(--brass)" }}>
                <h3 className="font-display text-lg" style={{ color: "var(--brass)" }}>Jour de cours (1h30)</h3>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Structure recommandée pour ta séance avec le prof :</p>
                <ul className="flex flex-col gap-3 mt-3">
                  {LESSON_STRUCTURE.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono shrink-0" style={{ color: "var(--brass)", width: "68px" }}>{s.d}</span>
                      <span><strong style={{ color: "var(--ivory)" }}>{s.t}</strong> — <span style={{ color: "var(--muted)" }}>{s.note}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {todayInfo?.rest && (
              <div className="card p-5">
                <h3 className="font-display text-lg">Repos technique</h3>
                <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                  Facultatif de jouer. Écoute passive ou repos complet — les tendons en ont besoin sur la durée.
                </p>
              </div>
            )}

            {todayInfo && !todayInfo.lesson && !todayInfo.rest && (
              <div className="flex flex-col gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
                    <Clock size={15} /><span className="text-xs uppercase tracking-wide font-medium">Matin · 30 min</span>
                  </div>
                  <TaskList items={todayInfo.matin} />
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
                    <Clock size={15} /><span className="text-xs uppercase tracking-wide font-medium">Soir · 45-90 min</span>
                  </div>
                  <TaskList items={todayInfo.soir} />
                </div>
              </div>
            )}

            {/* Quick log */}
            <div className="card p-5">
              <h3 className="font-display text-lg mb-3">Enregistrer une séance</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="matin">Matin</option>
                  <option value="soir">Soir</option>
                  <option value="les-deux">Les deux</option>
                </select>
                <input type="number" placeholder="Minutes" value={formMinutes} onChange={(e) => setFormMinutes(e.target.value)} style={{ width: "100px" }} />
              </div>
              <textarea placeholder="Note rapide (facultatif)" value={formNote} onChange={(e) => setFormNote(e.target.value)} className="w-full" rows={2} />
              <div className="flex items-center gap-3 mt-3">
                <button className="btn-brass px-4 py-2 text-sm flex items-center gap-1" onClick={addSession}>
                  <Plus size={15} /> Enregistrer
                </button>
                {message && <span className="text-sm" style={{ color: "var(--sage)" }}>{message}</span>}
              </div>
            </div>

            {/* Notes pour le prof */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1" style={{ color: "var(--brass)" }}>
                <MessageSquareText size={15} />
                <h3 className="font-display text-lg" style={{ color: "var(--ivory)" }}>Notes pour le prof</h3>
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                Accumule ici tes blocages pendant la semaine — à traiter au cours du mercredi plutôt qu'en dispersant les questions.
              </p>
              <div className="flex gap-2 mb-3">
                <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Ex : doigté mesure 12, morceau X" className="flex-1" onKeyDown={(e) => e.key === "Enter" && addNote()} />
                <button className="btn-ghost px-3 py-2 text-sm" onClick={addNote}><Plus size={15} /></button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune question en attente.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {notes.map((n) => (
                    <li key={n.id} className="flex items-center justify-between text-sm">
                      <span>{n.text}</span>
                      <button onClick={() => removeNote(n.id)} aria-label="Supprimer"><X size={14} style={{ color: "var(--muted)" }} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ---------------- Feuille de route ---------------- */}
        {tab === "route" && (
          <>
            <div className="card p-5">
              <h2 className="font-display text-lg mb-4">16 semaines</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {BLOCKS.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-2">
                    <div className="flex gap-1">
                      {b.weeks.map((w) => {
                        const status = !week ? "future" : w < week ? "done" : w === week ? "current" : "future";
                        return <div key={w} className={`key key-${status}`} title={`Semaine ${w}`} />;
                      })}
                    </div>
                    <span className="text-xs font-mono text-center" style={{ color: "var(--muted)", maxWidth: "80px" }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {BLOCKS.map((b) => {
                const isOpen = expandedBlock === b.id;
                const isCurrent = block?.id === b.id;
                return (
                  <div key={b.id} className="card p-4" style={isCurrent ? { borderColor: "var(--brass)" } : {}}>
                    <button className="w-full flex items-center justify-between text-left" onClick={() => setExpandedBlock(isOpen ? null : b.id)}>
                      <span className="font-display text-base flex items-center gap-2">
                        {b.name}
                        {isCurrent && <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: "var(--brass)", color: "var(--ink)" }}>en cours</span>}
                      </span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isOpen && (
                      <div className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                        <p><strong style={{ color: "var(--ivory)" }}>Technique — </strong>{b.technique}</p>
                        <p><strong style={{ color: "var(--ivory)" }}>Répertoire — </strong>{b.repertoire}</p>
                        <p><strong style={{ color: "var(--ivory)" }}>Déchiffrage — </strong>{b.dechiffrage}</p>
                        <p><strong style={{ color: "var(--ivory)" }}>Théorie — </strong>{b.theorie}</p>
                        <p><strong style={{ color: "var(--sage)" }}>Objectif de sortie — </strong>{b.objectif}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2" style={{ color: "var(--brass)" }}>
                <Settings2 size={15} /><span className="text-xs uppercase tracking-wide font-medium">Réglages</span>
              </div>
              <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Date de départ actuelle : <span className="font-mono">{startDate || "non définie"}</span></p>
              <div className="flex gap-2">
                <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
                <button className="btn-ghost px-3 py-2 text-sm" onClick={confirmStartDate}>Mettre à jour</button>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Journal ---------------- */}
        {tab === "journal" && (
          <>
            <div className="card p-5 flex gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Séances</p>
                <p className="font-display text-2xl">{log.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Série en cours</p>
                <p className="font-display text-2xl">{streak} j</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Ce mois-ci</p>
                <p className="font-display text-2xl">{(monthMin / 60).toFixed(1)} h</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1" style={{ color: "var(--brass)" }}>
              <BookOpen size={15} /><span className="text-xs uppercase tracking-wide font-medium">Historique</span>
            </div>

            {log.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune séance enregistrée pour l'instant — commence par celle du jour, onglet « Aujourd'hui ».</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {log.map((e) => (
                  <li key={e.id} className="card p-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono" style={{ color: "var(--brass)" }}>{e.date}</span>
                      <span className="ml-3" style={{ color: "var(--ivory)" }}>{e.session} · {e.minutes} min</span>
                      {e.note && <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
