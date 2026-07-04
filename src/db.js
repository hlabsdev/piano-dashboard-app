import initSqlJs from "sql.js";

/* ------------------------------------------------------------------ */
/* SQLite in-browser — persistance via localStorage                    */
/* ------------------------------------------------------------------ */

const DB_KEY = "piano-dashboard-db";
let db = null;
let SQLInstance = null;

/**
 * Sauvegarde le contenu binaire de la DB dans localStorage.
 */
function persist() {
  if (!db) return;
  const data = db.export();
  const str = btoa(String.fromCharCode(...new Uint8Array(data)));
  localStorage.setItem(DB_KEY, str);
}

/**
 * Initialise sql.js, restaure la DB depuis localStorage si elle existe,
 * et crée les tables si nécessaire.
 */
export async function initDb() {
  SQLInstance = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  // Restaurer depuis localStorage si disponible
  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    const binary = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    db = new SQLInstance.Database(binary);
  } else {
    db = new SQLInstance.Database();
  }

  // Créer les tables si elles n'existent pas
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_log (
      id      INTEGER PRIMARY KEY,
      date    TEXT NOT NULL,
      session TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      note    TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lesson_notes (
      id         INTEGER PRIMARY KEY,
      text       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  persist();
  return db;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function getSetting(key) {
  if (!db) return null;
  const res = db.exec("SELECT value FROM settings WHERE key = ?", [key]);
  if (res.length === 0 || res[0].values.length === 0) return null;
  return res[0].values[0][0];
}

export function setSetting(key, value) {
  if (!db) return;
  db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
  persist();
}

/* ------------------------------------------------------------------ */
/* Practice log                                                        */
/* ------------------------------------------------------------------ */

export function getAllSessions() {
  if (!db) return [];
  const res = db.exec(
    "SELECT id, date, session, minutes, note FROM practice_log ORDER BY id DESC"
  );
  if (res.length === 0) return [];
  return res[0].values.map(([id, date, session, minutes, note]) => ({
    id,
    date,
    session,
    minutes,
    note: note || "",
  }));
}

export function addSession({ date, session, minutes, note }) {
  if (!db) return null;
  db.run(
    "INSERT INTO practice_log (id, date, session, minutes, note) VALUES (?, ?, ?, ?, ?)",
    [Date.now(), date, session, minutes, note || ""]
  );
  persist();
  return getAllSessions();
}

export function deleteSession(id) {
  if (!db) return;
  db.run("DELETE FROM practice_log WHERE id = ?", [id]);
  persist();
  return getAllSessions();
}

/* ------------------------------------------------------------------ */
/* Lesson notes                                                        */
/* ------------------------------------------------------------------ */

export function getAllNotes() {
  if (!db) return [];
  const res = db.exec(
    "SELECT id, text, created_at FROM lesson_notes ORDER BY id ASC"
  );
  if (res.length === 0) return [];
  return res[0].values.map(([id, text, created_at]) => ({
    id,
    text,
    created_at,
  }));
}

export function addNote(text) {
  if (!db) return null;
  db.run("INSERT INTO lesson_notes (id, text) VALUES (?, ?)", [
    Date.now(),
    text,
  ]);
  persist();
  return getAllNotes();
}

export function deleteNote(id) {
  if (!db) return;
  db.run("DELETE FROM lesson_notes WHERE id = ?", [id]);
  persist();
  return getAllNotes();
}

/* ------------------------------------------------------------------ */
/* Export / Import                                                    */
/* ------------------------------------------------------------------ */

export function exportDb() {
  if (!db) return null;
  return db.export();
}

export function importDb(arrayBuffer) {
  if (!SQLInstance) return false;
  try {
    const binary = new Uint8Array(arrayBuffer);
    const tempDb = new SQLInstance.Database(binary);
    // On valide que les tables requises existent bien avant de valider l'import
    tempDb.exec("SELECT 1 FROM settings LIMIT 1");
    tempDb.exec("SELECT 1 FROM practice_log LIMIT 1");
    tempDb.exec("SELECT 1 FROM lesson_notes LIMIT 1");
    
    db = tempDb;
    persist();
    return true;
  } catch (e) {
    console.error("Erreur lors de l'import de la base SQLite", e);
    return false;
  }
}

