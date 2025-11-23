"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// server/src/db/db.ts
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = require("fs");
const path_1 = require("path");
const dbFile = (0, path_1.join)(__dirname, "gym.db");
const schemaPath = (0, path_1.join)(__dirname, "schema.sql");
exports.db = new better_sqlite3_1.default(dbFile);
exports.db.pragma("foreign_keys = ON");
// aplica schema base (idempotente)
const schemaSQL = (0, fs_1.readFileSync)(schemaPath, "utf-8");
exports.db.exec(schemaSQL);
// ---------- helpers ----------
function colExists(table, col) {
    const cols = exports.db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => c.name === col);
}
function tableExists(table) {
    const row = exports.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1`)
        .get(table);
    return !!row?.name;
}
// ---------- MIGRAÇÕES LEVES ----------
// workouts.user_id (multi-utilizador)
if (!colExists("workouts", "user_id")) {
    exports.db.exec(`
    ALTER TABLE workouts ADD COLUMN user_id INTEGER REFERENCES users(id);
    CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
  `);
    console.log("[DB] coluna user_id criada em workouts");
}
// workouts.muscle_group (default 'corpo inteiro')
if (!colExists("workouts", "muscle_group")) {
    exports.db.exec(`
    ALTER TABLE workouts ADD COLUMN muscle_group TEXT NOT NULL DEFAULT 'corpo inteiro';
    UPDATE workouts SET muscle_group = 'corpo inteiro' WHERE muscle_group IS NULL;
  `);
    console.log("[DB] coluna muscle_group criada em workouts");
}
// workouts.notes (observações do treino)
if (!colExists("workouts", "notes")) {
    exports.db.exec(`ALTER TABLE workouts ADD COLUMN notes TEXT;`);
    console.log("[DB] coluna notes criada em workouts");
}
// ✅ NOVO: workouts.is_favorite (favoritos dos treinos)
if (!colExists("workouts", "is_favorite")) {
    exports.db.exec(`
    ALTER TABLE workouts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
    UPDATE workouts SET is_favorite = 0 WHERE is_favorite IS NULL;
  `);
    console.log("[DB] coluna is_favorite criada em workouts");
}
// workout_items.note (observações por exercício)
if (!colExists("workout_items", "note")) {
    exports.db.exec(`ALTER TABLE workout_items ADD COLUMN note TEXT;`);
    console.log("[DB] coluna note criada em workout_items");
}
// histórico por item (para PR, últimas entradas, etc.)
if (!tableExists("workout_item_logs")) {
    exports.db.exec(`
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
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_stats (
      exercise_id INTEGER PRIMARY KEY,
      times_used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);
    console.log("[DB] tabela exercise_stats criada");
}
console.log("[DB] Base de dados pronta.");
