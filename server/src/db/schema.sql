PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- EXERCISES (catálogo)
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  description TEXT,
  media_url TEXT
);

-- WORKOUTS (agora com muscle_group)
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0, -- 👈 NOVO
  FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);

-- ITENS DO TREINO (nome final usado no controller: workout_items)
CREATE TABLE IF NOT EXISTS workout_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  weight REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
-- Estatísticas de uso de exercícios (para "populares")
CREATE TABLE IF NOT EXISTS exercise_stats (
  exercise_id INTEGER PRIMARY KEY,
  times_used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_workout_items_wid     ON workout_items(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_items_eid     ON workout_items(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_items_wid_pos ON workout_items(workout_id, position);
