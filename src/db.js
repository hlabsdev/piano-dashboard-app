import initSqlJs from "sql.js";

/* ------------------------------------------------------------------ */
/* SQLite in-browser — persistance via localStorage                    */
/*                                                                    */
/* ⚠️ Limites connues (assumées, v1.0 gelée jusqu'au jalon T1) :      */
/* - localStorage est isolé par appareil/navigateur : les données ne  */
/*   se synchronisent PAS entre téléphone et laptop. Appareil maître  */
/*   + export hebdo = le protocole.                                   */
/* - Les navigateurs peuvent purger localStorage. L'export .db du     */
/*   mercredi est la sauvegarde de référence.                         */
/* ------------------------------------------------------------------ */

const DB_KEY = "piano-dashboard-db";
let db = null;
let SQLInstance = null;

/**
 * Encode un Uint8Array en base64 par chunks.
 * NE PAS remplacer par String.fromCharCode(...arr) : le spread passe
 * chaque octet comme argument et explose la pile d'appels dès que la
 * base dépasse ~100 Ko (RangeError), tuant la persistance en silence.
 */
function u8ToBase64(u8) {
  const CHUNK = 0x8000; // 32k octets par appel — sûr pour la pile
  let binary = "";
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToU8(str) {
  const binary = atob(str);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

/**
 * Sauvegarde le contenu binaire de la DB dans localStorage.
 */
function persist() {
  if (!db) return;
  try {
    const data = db.export();
    localStorage.setItem(DB_KEY, u8ToBase64(new Uint8Array(data)));
  } catch (e) {
    // QuotaExceededError ou navigation privée : on ne perd pas la session
    // en cours (la DB vit en mémoire), mais la persistance a échoué.
    console.error("Persistance localStorage échouée — exporte ta base .db maintenant", e);
  }
}

/**
 * Initialise sql.js, restaure la DB depuis localStorage si elle existe,
 * et crée les tables si nécessaire.
 */
export async function initDb() {
  SQLInstance = await initSqlJs({
    locateFile: (file) => (file.endsWith(".wasm") ? "/sql-wasm.wasm" : `/${file}`),
  });

  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      db = new SQLInstance.Database(base64ToU8(saved));
    } catch (e) {
      console.error("Base locale corrompue — démarrage sur une base vide", e);
      db = new SQLInstance.Database();
    }
  } else {
    db = new SQLInstance.Database();
  }

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
    "SELECT id, date, session, minutes, note FROM practice_log ORDER BY date DESC, id DESC"
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