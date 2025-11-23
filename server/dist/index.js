"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./db/db");
const exercises_1 = __importDefault(require("./controllers/exercises"));
const workouts_1 = __importDefault(require("./controllers/workouts"));
const auth_1 = __importDefault(require("./controllers/auth"));
const error_1 = require("./middleware/error");
const app = (0, express_1.default)();
/** Middlewares globais */
app.use((0, cors_1.default)({
    origin: true, // em dev aceita qualquer origem (o proxy do Vite)
    credentials: true, // permite cookies/autorização cross-site
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
/** Rotas */
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "..", "uploads")));
app.use("/api/auth", auth_1.default);
app.use("/api/exercises", exercises_1.default);
app.use("/api/workouts", workouts_1.default);
/** Health check */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
/** Seed de exercícios populares (só se estiver vazio) */
function seedPopularExercises() {
    try {
        const count = db_1.db.prepare("SELECT COUNT(*) AS n FROM exercises").get().n;
        if (count > 0)
            return;
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
        const stmt = db_1.db.prepare("INSERT INTO exercises (name, muscle_group, description) VALUES (?, ?, ?)");
        const tx = db_1.db.transaction((rows) => {
            rows.forEach((r) => stmt.run(r[0], r[1], r[2]));
        });
        tx(popular);
        console.log(`[seed] Inseridos ${popular.length} exercícios populares.`);
    }
    catch (err) {
        console.error("[seed] Erro ao inserir exercícios populares:", err);
    }
}
seedPopularExercises();
/** Erros */
app.use(error_1.errorHandler);
/** Arranque */
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}`);
});
