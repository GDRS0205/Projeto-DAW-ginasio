// server/src/db/db.ts
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const dbFile = join(__dirname, "gym.db");
const schemaPath = join(__dirname, "schema.sql");

export const db = new Database(dbFile);
db.pragma("foreign_keys = ON");

// aplica schema base (idempotente)
const schemaSQL = readFileSync(schemaPath, "utf-8");
db.exec(schemaSQL);

// ---------- helpers ----------
function colExists(table: string, col: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return cols.some((c) => c.name === col);
}
function tableExists(table: string) {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1`
    )
    .get(table) as any;
  return !!row?.name;
}

// ---------- MIGRAÇÕES LEVES ----------
// workouts.user_id (multi-utilizador)
if (!colExists("workouts", "user_id")) {
  db.exec(`
    ALTER TABLE workouts ADD COLUMN user_id INTEGER REFERENCES users(id);
    CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
  `);
  console.log("[DB] coluna user_id criada em workouts");
}

// workouts.muscle_group (default 'corpo inteiro')
if (!colExists("workouts", "muscle_group")) {
  db.exec(`
    ALTER TABLE workouts ADD COLUMN muscle_group TEXT NOT NULL DEFAULT 'corpo inteiro';
    UPDATE workouts SET muscle_group = 'corpo inteiro' WHERE muscle_group IS NULL;
  `);
  console.log("[DB] coluna muscle_group criada em workouts");
}

// workouts.notes (observações do treino)
if (!colExists("workouts", "notes")) {
  db.exec(`ALTER TABLE workouts ADD COLUMN notes TEXT;`);
  console.log("[DB] coluna notes criada em workouts");
}

// ✅ NOVO: workouts.is_favorite (favoritos dos treinos)
if (!colExists("workouts", "is_favorite")) {
  db.exec(`
    ALTER TABLE workouts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
    UPDATE workouts SET is_favorite = 0 WHERE is_favorite IS NULL;
  `);
  console.log("[DB] coluna is_favorite criada em workouts");
}

// workout_items.note (observações por exercício)
if (!colExists("workout_items", "note")) {
  db.exec(`ALTER TABLE workout_items ADD COLUMN note TEXT;`);
  console.log("[DB] coluna note criada em workout_items");
}

// histórico por item (para PR, últimas entradas, etc.)
if (!tableExists("workout_item_logs")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_item_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      FOREIGN KEY (item_id) REFERENCES workout_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_wil_item ON workout_item_logs(item_id);
    CREATE INDEX IF NOT EXISTS idx_wil_item_ts ON workout_item_logs(item_id, ts DESC);
  `);
  console.log("[DB] tabela workout_item_logs criada");
}

// estatísticas de exercícios (para /exercises/popular)
if (!tableExists("exercise_stats")) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_stats (
      exercise_id INTEGER PRIMARY KEY,
      times_used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);
  console.log("[DB] tabela exercise_stats criada");
}

console.log("[DB] Base de dados pronta.");
