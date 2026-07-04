import { useState, useEffect, useRef } from "react";
import {
  Music, Flame, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Plus, X, Clock, BookOpen, Settings2, MessageSquareText, Trash2,
  Download, Upload, Play, Pause, RotateCcw, TimerIcon,
} from "lucide-react";
import {
  initDb, getSetting, setSetting,
  getAllSessions, addSession as dbAddSession, deleteSession as dbDeleteSession,
  getAllNotes, addNote as dbAddNote, deleteNote as dbDeleteNote,
  exportDb, importDb,
} from "./db.js";

/* ------------------------------------------------------------------ */
/* Données — Phase 1 (16 semaines / 4 blocs de 4 semaines)             */
/* Déchiffrage calé sur ABRSM Piano Sight-Reading (grades acquis 1-8)  */
/* Règle : le déchiffrage se travaille TOUJOURS en dessous du niveau   */
/* de répertoire, en lecture unique, sans s'arrêter, sans rejouer.     */
/* ------------------------------------------------------------------ */

const BLOCKS = [
  {
    id: 1,
    name: "Mise en place",
    weeks: [1, 2, 3, 4],
    technique: "Position des mains, jeu 5 doigts (do-ré-mi-fa-sol) mains séparées, legato de base",
    repertoire: "Premières pièces de la Méthode Rose en position de do, mains séparées",
    dechiffrage: "Notes isolées sur 5 notes, rythmes simples — pré-ABRSM (le Grade 1 attendra le bloc 3, pas avant)",
    theorie: "La portée, les clés, les valeurs de notes, premiers exercices de lecture rythmique",
    objectif: "Jouer 2-3 petites pièces 5 doigts mains séparées sans hésitation",
  },
  {
    id: 2,
    name: "Coordination",
    weeks: [5, 6, 7, 8],
    technique: "Mains ensemble en position de do, débuts du staccato, petits déplacements de position",
    repertoire: "Pièces Méthode Rose mains ensemble, rythmes avec croches",
    dechiffrage: "ABRSM Sight-Reading Grade 1, premières pages, mains séparées uniquement",
    theorie: "Les croches, les silences courants, intervalles simples (2des, 3ces)",
    objectif: "Jouer une pièce simple mains ensemble sans s'arrêter, gamme de Do 1 octave mains séparées",
  },
  {
    id: 3,
    name: "Élargissement",
    weeks: [9, 10, 11, 12],
    technique: "Gammes de Sol et Fa majeur mains séparées (1 octave), doigtés standards",
    repertoire: "Pièces Méthode Rose avec changements de position",
    dechiffrage: "ABRSM Grade 1, exercices mains ensemble — une seule lecture, sans t'arrêter, même en cas d'erreur",
    theorie: "Armures à 1 dièse / 1 bémol, degrés I-IV-V",
    objectif: "Gammes Do/Sol/Fa mains séparées fluides, lecture aisée en clé de sol et de fa",
  },
  {
    id: 4,
    name: "Consolidation",
    weeks: [13, 14, 15, 16],
    technique: "Gammes Do/Sol/Fa mains ensemble (lentement), legato/staccato de base",
    repertoire: "Finaliser les pièces de Méthode Rose visées pour cette phase",
    dechiffrage: "ABRSM Grade 1 fluide en lecture unique ; si <2 erreurs systématiquement, entame le Grade 2",
    theorie: "Révision globale + auto-test avant le premier jalon trimestriel",
    objectif: "Gammes Do/Sol/Fa mains ensemble sans tension, déchiffrage Grade 1 fluide — prêt pour Czerny op.599",
  },
];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Plan du jour avec durées cibles par segment (pour le chronomètre).
 * Matin ≈ 30 min. Soir : base 45 min — si tu as 90 min, la règle est
 * de doubler le répertoire, jamais la technique mécanique (tendons).
 */
function buildDayTasks(block) {
  if (!block) return null;
  const t = (label, min) => ({ label, min });
  return {
    1: {
      matin: [
        t(`Gammes — ${block.technique}`, 10),
        t(`Déchiffrage — ${block.dechiffrage}`, 20),
      ],
      soir: [
        t("Échauffement technique (gammes + exercice, jamais en force)", 10),
        t(`Répertoire — ${block.repertoire}`, 30),
        t("Reprendre un morceau déjà acquis (plaisir + mémoire)", 5),
      ],
    },
    2: {
      matin: [
        t("Gammes du cycle en cours", 10),
        t(`Théorie (Danhauser) — ${block.theorie}`, 20),
      ],
      soir: [
        t(`Répertoire — ${block.repertoire}`, 30),
        t(`Déchiffrage — ${block.dechiffrage}`, 15),
      ],
    },
    3: { lesson: true },
    4: {
      matin: [
        t("Gammes du cycle en cours", 10),
        t(`Théorie / oreille — ${block.theorie}`, 20),
      ],
      soir: [
        t(`Répertoire — ${block.repertoire}`, 30),
        t(`Déchiffrage — ${block.dechiffrage}`, 15),
      ],
    },
    5: {
      matin: [
        t("Gammes — bilan de la semaine", 10),
        t("Déchiffrage un cran plus dur (grade ABRSM suivant, juste pour tester)", 20),
      ],
      soir: [
        t("Technique (échauffement)", 10),
        t("Répertoire", 30),
        t("Un morceau plaisir déjà su", 5),
      ],
    },
    6: {
      matin: [t("Libre / rattrapage de la semaine", 30)],
      soir: [
        t("Théorie / harmonie approfondie", 40),
        t("Nouveau morceau", 30),
        t("Écoute active analysée (un seul aspect : structure OU phrasé OU dynamique)", 20),
      ],
    },
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

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return toISO(new Date());
}

function shiftDate(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function frDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** Numéro de semaine du programme pour une date arbitraire. */
function weekForDate(startDateStr, dateStr) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((d - start) / 86400000);
  if (diffDays < 0) return null;
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Série de jours consécutifs. S'ancre sur aujourd'hui OU hier :
 * à 6h du matin, ne pas avoir encore pratiqué aujourd'hui ne doit pas
 * afficher 0 alors que la chaîne d'hier tient toujours.
 */
function computeStreak(log) {
  const dates = new Set(log.map((e) => e.date));
  const cursor = new Date();
  if (!dates.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeMonthMinutes(log) {
  const ym = todayISO().slice(0, 7);
  return log.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + Number(e.minutes || 0), 0);
}

function buildReport({ week, block, phaseDone, streak, monthMin, log, notes }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = log.filter((e) => new Date(e.date + "T00:00:00") >= cutoff);
  const totalMin = recent.reduce((s, e) => s + Number(e.minutes || 0), 0);
  const avg = recent.length ? Math.round(totalMin / recent.length) : 0;
  const sessionLines = recent.slice(0, 10).map((e) => `  - ${e.date} · ${e.session} · ${e.minutes} min${e.note ? " · " + e.note : ""}`);
  const noteLines = notes.map((n) => `  - ${n.text}`);
  return [
    `=== BILAN PIANO — ${todayISO()} ===`,
    `Phase : 1 | Semaine : ${phaseDone ? "16/16 (terminée)" : (week || "?") + "/16"} | Bloc : ${block ? block.name : "—"}`,
    `Régularité : ${streak} jours de série | ${(monthMin / 60).toFixed(1)} h ce mois-ci`,
    `Séances (30 derniers jours) : ${recent.length} séances, moyenne ${avg} min`,
    `Dernières séances :`,
    sessionLines.length ? sessionLines.join("\n") : "  (aucune)",
    `Questions en attente pour le prof :`,
    noteLines.length ? noteLines.join("\n") : "  (aucune)",
    ``,
    `Jalon (à remplir à la main — sois honnête) :`,
    `- Gammes du cycle sans hésitation ni tension : [oui/non + détail]`,
    `- Déchiffrage fluide au niveau ABRSM visé : [oui/non + détail]`,
    `- Pièces du bloc maîtrisées : [oui/non + détail]`,
    `- Théorie du bloc acquise : [oui/non + détail]`,
    `Blocages persistants : [...]`,
    `Retour du prof ce trimestre : [...]`,
    ``,
    `Consigne pour Claude : analyse critique contre la section 11 du programme.`,
    `Ajustement de rythme uniquement — jamais de refonte de méthode hors jalon.`,
  ].join("\n");
}

/* Triple bip discret en fin de segment (WebAudio, sans asset) */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.3);
    });
  } catch { /* audio indisponible : le visuel suffit */ }
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

/**
 * Chronomètre de segment. Basé sur un horodatage de fin (endAt), pas sur
 * un décompte d'intervalles : les navigateurs mobiles throttlent les
 * setInterval en arrière-plan, un décompte naïf dériverait.
 */
function SegmentTimer({ task, onClose }) {
  const [remaining, setRemaining] = useState(task.min * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const endAtRef = useRef(null);
  const pausedRemainingRef = useRef(task.min * 60);

  useEffect(() => {
    setRemaining(task.min * 60);
    pausedRemainingRef.current = task.min * 60;
    setRunning(false);
    setDone(false);
  }, [task]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setDone(true);
        beep();
      }
    };
    const id = setInterval(tick, 500);
    const onVis = () => tick(); // resynchronise au retour d'arrière-plan
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [running]);

  function toggle() {
    if (running) {
      pausedRemainingRef.current = remaining;
      setRunning(false);
    } else {
      if (done) return;
      endAtRef.current = Date.now() + pausedRemainingRef.current * 1000;
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setRemaining(task.min * 60);
    pausedRemainingRef.current = task.min * 60;
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = 100 - (remaining / (task.min * 60)) * 100;

  return (
    <div className="card p-4" style={{ borderColor: "var(--brass)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "var(--brass)" }}>
            Segment en cours · {task.min} min
          </p>
          <p className="text-sm mt-1 truncate" style={{ color: "var(--ivory)" }} title={task.label}>{task.label}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer le chronomètre">
          <X size={16} style={{ color: "var(--muted)" }} />
        </button>
      </div>
      <p className="font-mono text-4xl mt-3 text-center" style={{ color: done ? "var(--sage)" : "var(--ivory)" }}>
        {done ? "Terminé" : `${mm}:${ss}`}
      </p>
      <div className="timer-track mt-3" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {!done && (
          <button className="btn-brass px-4 py-2 text-sm flex items-center gap-1.5" onClick={toggle}>
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Démarrer"}
          </button>
        )}
        <button className="btn-ghost px-4 py-2 text-sm flex items-center gap-1.5" onClick={reset}>
          <RotateCcw size={14} /> Réinitialiser
        </button>
      </div>
      {done && (
        <p className="text-xs mt-3 text-center" style={{ color: "var(--muted)" }}>
          Passe au segment suivant — ne prolonge pas les exercices mécaniques au-delà du temps prévu.
        </p>
      )}
    </div>
  );
}

/** Liste de tâches minutées ; chaque tâche lance le chronomètre. */
function TaskList({ items, onPickTimer }) {
  return (
    <ul className="flex flex-col gap-2 mt-3">
      {items.map((it, i) => (
        <li key={i} className="task-row flex items-center justify-between gap-2 text-sm leading-relaxed">
          <span style={{ color: "var(--ivory)" }}>
            <span className="font-mono mr-2" style={{ color: "var(--brass)" }}>{it.min}′</span>
            {it.label}
          </span>
          <button
            className="btn-ghost px-2 py-1 shrink-0 flex items-center gap-1 text-xs"
            onClick={() => onPickTimer(it)}
            aria-label={`Chronométrer : ${it.label}`}
            title="Lancer le chronomètre sur ce segment"
          >
            <TimerIcon size={13} /> Chrono
          </button>
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
  const [report, setReport] = useState("");

  const [viewDate, setViewDate] = useState(todayISO());
  const [activeTimer, setActiveTimer] = useState(null);

  const [formType, setFormType] = useState("soir");
  const [formMinutes, setFormMinutes] = useState("");
  const [formNote, setFormNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [dateDraft, setDateDraft] = useState(todayISO());

  /* ---------- Init DB + Load data ---------- */
  useEffect(() => {
    (async () => {
      await initDb();
      const savedDate = getSetting("phase1StartDate");
      setStartDate(savedDate || null);
      setLog(getAllSessions());
      setNotes(getAllNotes());
      setLoading(false);
    })();
  }, []);

  /* ---------- Actions ---------- */
  function confirmStartDate() {
    setStartDate(dateDraft);
    setSetting("phase1StartDate", dateDraft);
  }

  function addSession() {
    if (!formMinutes) return;
    const newLog = dbAddSession({
      date: viewDate, // permet le rattrapage : logguer hier depuis la vue d'hier
      session: formType,
      minutes: Number(formMinutes),
      note: formNote,
    });
    setLog(newLog);
    setFormMinutes("");
    setFormNote("");
    setMessage(viewDate === todayISO() ? "Séance enregistrée ✓" : `Séance enregistrée pour le ${frDate(viewDate)} ✓`);
    setTimeout(() => setMessage(""), 2500);
  }

  function removeSession(id) {
    const newLog = dbDeleteSession(id);
    setLog(newLog);
  }

  function addNote() {
    if (!noteInput.trim()) return;
    const newNotes = dbAddNote(noteInput.trim());
    setNotes(newNotes);
    setNoteInput("");
  }

  function removeNote(id) {
    const newNotes = dbDeleteNote(id);
    setNotes(newNotes);
  }

  function handleExport() {
    const data = exportDb();
    if (!data) return;
    const blob = new Blob([data], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `piano-dashboard-backup-${todayISO()}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage("Base de données exportée ✓");
    setTimeout(() => setMessage(""), 2500);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const success = importDb(evt.target.result);
      if (success) {
        setStartDate(getSetting("phase1StartDate") || null);
        setLog(getAllSessions());
        setNotes(getAllNotes());
        setMessage("Base importée avec succès ✓");
      } else {
        setMessage("Erreur d'import : fichier invalide ✗");
      }
      setTimeout(() => setMessage(""), 3000);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  /* ---------- Dérivés (calés sur la date consultée, pas sur "maintenant") ---------- */
  const isToday = viewDate === todayISO();
  const rawWeek = weekForDate(startDate, viewDate);
  const week = rawWeek ? Math.min(Math.max(rawWeek, 1), 16) : null;
  const phaseDone = rawWeek && rawWeek > 16;
  const beforeStart = startDate && rawWeek === null;
  const block = week ? BLOCKS.find((b) => b.weeks.includes(week)) : null;
  const dayTasks = buildDayTasks(block);
  const viewIdx = new Date(viewDate + "T00:00:00").getDay();
  const dayInfo = dayTasks ? dayTasks[viewIdx] : null;
  const daySessions = log.filter((e) => e.date === viewDate);
  const streak = computeStreak(log);
  const monthMin = computeMonthMinutes(log);

  /* Semaine "réelle" (aujourd'hui) pour le header et la feuille de route */
  const rawWeekNow = weekForDate(startDate, todayISO());
  const weekNow = rawWeekNow ? Math.min(Math.max(rawWeekNow, 1), 16) : null;
  const phaseDoneNow = rawWeekNow && rawWeekNow > 16;
  const blockNow = weekNow ? BLOCKS.find((b) => b.weeks.includes(weekNow)) : null;

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
        .btn-danger{ background:transparent; border:none; color:var(--muted); cursor:pointer; padding:4px; border-radius:4px; transition:color .15s; }
        .btn-danger:hover{ color:#e05252; }
        .task-row{ padding:6px 8px; border-radius:8px; }
        .task-row:hover{ background:var(--card-2); }
        .timer-track{ height:6px; background:var(--ink-2); border-radius:3px; overflow:hidden; }
        .timer-fill{ height:100%; background:var(--brass); transition:width .5s linear; }
        .day-nav{ display:flex; align-items:center; gap:8px; }
        .day-nav button{ background:transparent; border:1px solid var(--line); border-radius:8px; padding:6px; color:var(--ivory); }
        .day-nav button:hover{ border-color:var(--brass); }
        @media (prefers-reduced-motion: reduce){ *{ transition:none !important; } }
      `}</style>

      {/* Header */}
      <header className="max-w-2xl mx-auto px-5 pt-8 pb-4">
        <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
          <Music size={18} />
          <span className="text-xs uppercase tracking-wide font-medium">Carnet de bord - By &copy;Hlabs 2026</span>
        </div>
        <h1 className="font-display text-3xl mt-1" style={{ color: "var(--ivory)" }}>
          Phase 1 — Fondations
        </h1>
        <StaffDivider />
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Chargement…</p>
        ) : startDate ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-mono" style={{ color: "var(--muted)" }}>
            <span>{phaseDoneNow ? "Phase 1 terminée" : `Semaine ${weekNow || "—"} / 16`}</span>
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
          { id: "today", label: "Jour" },
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
              Choisis le jour où tu as réellement commencé. Le numéro de semaine et le bloc en cours seront calculés automatiquement.
            </p>
            <div className="flex gap-2">
              <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
              <button className="btn-brass px-4 py-2 text-sm" onClick={confirmStartDate}>Valider</button>
            </div>
          </div>
        )}

        {/* ---------------- Jour (navigable) ---------------- */}
        {tab === "today" && startDate && (
          <>
            {/* Navigation entre les jours */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl">
                  {isToday ? "Aujourd'hui" : DAY_NAMES[viewIdx]} <span className="text-sm font-mono" style={{ color: "var(--muted)" }}>· {frDate(viewDate)}</span>
                </h2>
                {block && <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>Semaine {week}/16 · Bloc : {block.name}</span>}
              </div>
              <div className="day-nav">
                <button onClick={() => setViewDate(shiftDate(viewDate, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
                {!isToday && (
                  <button className="text-xs px-2" onClick={() => setViewDate(todayISO())}>Aujourd'hui</button>
                )}
                <button onClick={() => setViewDate(shiftDate(viewDate, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Chronomètre actif */}
            {activeTimer && <SegmentTimer task={activeTimer} onClose={() => setActiveTimer(null)} />}

            {beforeStart && (
              <div className="card p-5">
                <p className="text-sm" style={{ color: "var(--muted)" }}>Cette date précède ta date de départ — pas de programme prévu.</p>
              </div>
            )}

            {phaseDone && (
              <div className="card p-5">
                <p className="text-sm" style={{ color: "var(--muted)" }}>Cette date dépasse la Phase 1 (16 semaines). Fais le bilan T1 avec Claude et ton prof avant de charger la Phase 2.</p>
              </div>
            )}

            {dayInfo?.lesson && (
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
                <p className="text-xs mt-4 pt-3 border-t" style={{ color: "var(--muted)", borderColor: "var(--line)" }}>
                  Rituel du mercredi : (1) relis tes « Notes pour le prof » ci-dessous, (2) exporte ta base .db (Feuille de route → Sauvegarde) — c'est ta sauvegarde hebdomadaire.
                </p>
              </div>
            )}

            {dayInfo?.rest && (
              <div className="card p-5">
                <h3 className="font-display text-lg">Repos technique</h3>
                <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                  Facultatif de jouer. Écoute passive ou repos complet — les tendons en ont besoin sur la durée.
                </p>
              </div>
            )}

            {dayInfo && !dayInfo.lesson && !dayInfo.rest && (
              <div className="flex flex-col gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
                    <Clock size={15} /><span className="text-xs uppercase tracking-wide font-medium">Matin · 30 min</span>
                  </div>
                  <TaskList items={dayInfo.matin} onPickTimer={setActiveTimer} />
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2" style={{ color: "var(--brass)" }}>
                    <Clock size={15} /><span className="text-xs uppercase tracking-wide font-medium">Soir · 45-90 min</span>
                  </div>
                  <TaskList items={dayInfo.soir} onPickTimer={setActiveTimer} />
                  <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
                    Si tu as 90 min : double le temps de répertoire — jamais celui des exercices mécaniques.
                  </p>
                </div>
              </div>
            )}

            {/* Séances du jour consulté */}
            {daySessions.length > 0 && (
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wide font-medium mb-2" style={{ color: "var(--brass)" }}>
                  {isToday ? "Enregistré aujourd'hui" : `Enregistré ce jour-là`}
                </p>
                <ul className="flex flex-col gap-1">
                  {daySessions.map((e) => (
                    <li key={e.id} className="text-sm flex items-center justify-between">
                      <span><span style={{ color: "var(--ivory)" }}>{e.session}</span> · {e.minutes} min{e.note ? <span style={{ color: "var(--muted)" }}> · {e.note}</span> : null}</span>
                      <button className="btn-danger" onClick={() => removeSession(e.id)} aria-label="Supprimer"><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick log — logge sur la date consultée (rattrapage possible) */}
            {!beforeStart && (
              <div className="card p-5">
                <h3 className="font-display text-lg mb-1">Enregistrer une séance</h3>
                {!isToday && (
                  <p className="text-xs mb-2" style={{ color: "var(--brass)" }}>
                    Tu enregistres pour le {frDate(viewDate)} — utile pour rattraper un oubli, pas pour pré-remplir le futur.
                  </p>
                )}
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
            )}

            {/* Notes pour le prof */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1" style={{ color: "var(--brass)" }}>
                <MessageSquareText size={15} />
                <h3 className="font-display text-lg" style={{ color: "var(--ivory)" }}>Notes pour le prof</h3>
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                Accumule ici tes blocages pendant la semaine — à traiter lors de la séance en présentiel plutôt qu'en dispersant les questions.
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
                        const status = !weekNow ? "future" : w < weekNow ? "done" : w === weekNow ? "current" : "future";
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
                const isCurrent = blockNow?.id === b.id;
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
              <div className="flex items-center gap-2 mb-4" style={{ color: "var(--brass)" }}>
                <Settings2 size={15} />
                <span className="text-xs uppercase tracking-wide font-medium">Réglages & Sauvegarde</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: "var(--ivory)" }}>Date de départ</h4>
                  <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                    Date actuelle : <span className="font-mono text-xs">{startDate || "non définie"}</span>
                  </p>
                  <div className="flex gap-2">
                    <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="text-sm flex-1" />
                    <button className="btn-ghost px-3 py-2 text-sm" onClick={confirmStartDate}>Mettre à jour</button>
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6" style={{ borderColor: "var(--line)" }}>
                  <h4 className="text-sm font-medium mb-2" style={{ color: "var(--ivory)" }}>Base de données SQLite</h4>
                  <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                    Les données vivent uniquement dans CE navigateur. Logge sur un seul appareil (le téléphone) et exporte chaque mercredi — l'export est ta seule sauvegarde réelle.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-brass px-3 py-2 text-sm flex items-center gap-1.5 cursor-pointer" onClick={handleExport}>
                      <Download size={14} /> Exporter
                    </button>

                    <label className="btn-ghost px-3 py-2 text-sm flex items-center gap-1.5 cursor-pointer hover:border-[var(--brass)] border">
                      <Upload size={14} />
                      Importer
                      <input type="file" accept=".db" onChange={handleImport} className="hidden" />
                    </label>
                  </div>
                  {message && (
                    <p className="text-xs mt-3 font-medium" style={{ color: "var(--sage)" }}>{message}</p>
                  )}
                </div>
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

            <div className="card p-5">
              <h3 className="font-display text-lg mb-1">Rapport de bilan pour Claude</h3>
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
                À générer tous les 10-12 semaines (jalons), pas plus. Copie le bloc, complète les lignes du jalon à la main, puis colle-le dans une nouvelle conversation avec Claude.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  className="btn-brass px-4 py-2 text-sm"
                  onClick={() => setReport(buildReport({ week: weekNow, block: blockNow, phaseDone: phaseDoneNow, streak, monthMin, log, notes }))}
                >
                  Générer le rapport
                </button>
                {report && (
                  <button
                    className="btn-ghost px-4 py-2 text-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(report);
                        setMessage("Rapport copié.");
                      } catch {
                        setMessage("Copie auto impossible — sélectionne le texte ci-dessous.");
                      }
                      setTimeout(() => setMessage(""), 2500);
                    }}
                  >
                    Copier
                  </button>
                )}
                {message && <span className="text-sm self-center" style={{ color: "var(--sage)" }}>{message}</span>}
              </div>
              {report && (
                <textarea
                  readOnly
                  value={report}
                  rows={14}
                  className="w-full mt-3 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
              )}
            </div>

            <div className="flex items-center gap-2 mt-1" style={{ color: "var(--brass)" }}>
              <BookOpen size={15} /><span className="text-xs uppercase tracking-wide font-medium">Historique</span>
            </div>

            {log.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune séance enregistrée pour l'instant — commence par celle du jour, onglet « Jour ».</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {log.map((e) => (
                  <li key={e.id} className="card p-3 flex items-center justify-between text-sm">
                    <div>
                      <button
                        className="font-mono underline-offset-2 hover:underline"
                        style={{ color: "var(--brass)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        onClick={() => { setViewDate(e.date); setTab("today"); }}
                        title="Voir le programme de ce jour"
                      >
                        {e.date}
                      </button>
                      <span className="ml-3" style={{ color: "var(--ivory)" }}>{e.session} · {e.minutes} min</span>
                      {e.note && <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{e.note}</p>}
                    </div>
                    <button className="btn-danger" onClick={() => removeSession(e.id)} aria-label="Supprimer la séance" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
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