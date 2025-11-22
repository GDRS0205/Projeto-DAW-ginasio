import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import cookieParser from "cookie-parser";

import { db } from "./db/db";
import exercisesRouter from "./controllers/exercises";
import workoutsRouter from "./controllers/workouts";
import authRouter from "./controllers/auth";
import { errorHandler } from "./middleware/error";

const app = express();

/** Middlewares globais */
app.use(
  cors({
    origin: true,        // em dev aceita qualquer origem (o proxy do Vite)
    credentials: true,   // permite cookies/autorização cross-site
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

/** Rotas */
app.use("/uploads", express.static(path.join(__dirname, "..", "..", "uploads")));
app.use("/api/auth", authRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/workouts", workoutsRouter);

/** Health check */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** Seed de exercícios populares (só se estiver vazio) */
function seedPopularExercises() {
  try {
    const count = (db.prepare("SELECT COUNT(*) AS n FROM exercises").get() as any).n as number;
    if (count > 0) return;

    const popular = [
      ["Agachamento", "pernas", "Com barra nas costas"],
      ["Levantamento Terra", "costas", "Deadlift convencional"],
      ["Leg Press", "pernas", "Máquina leg press"],
      ["Extensão de Pernas", "pernas", "Leg extension"],
      ["Curl Femoral", "pernas", "Leg curl"],
      ["Press Militar", "ombros", "Press com barra"],
      ["Remada Curvada", "costas", "Com barra"],
      ["Puxada Frente", "costas", "Lat pulldown"],
      ["Bíceps Barra", "braços", "Curl de bíceps"],
      ["Prancha", "core", "Prancha isométrica"],
    ];

    const stmt = db.prepare(
      "INSERT INTO exercises (name, muscle_group, description) VALUES (?, ?, ?)"
    );
    const tx = db.transaction((rows: string[][]) => {
      rows.forEach((r) => stmt.run(r[0], r[1], r[2]));
    });
    tx(popular);
    console.log(`[seed] Inseridos ${popular.length} exercícios populares.`);
  } catch (err) {
    console.error("[seed] Erro ao inserir exercícios populares:", err);
  }
}
seedPopularExercises();

/** Erros */
app.use(errorHandler);

/** Arranque */
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});

