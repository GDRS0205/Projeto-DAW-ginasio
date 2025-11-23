"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/controllers/exercises.ts
const express_1 = require("express");
const db_1 = require("../db/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function parsePagination(q) {
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(100, Math.max(1, Number(q.size) || 10));
    const offset = (page - 1) * size;
    return { page, size, offset, limit: size };
}
function parseSort(q) {
    const allowed = new Set(["id", "name", "muscle_group"]);
    const [col, dir] = String(q.sort || "name,ASC").split(",");
    const column = allowed.has(col) ? col : "name";
    const direction = String(dir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
    return { column, direction };
}
/* ============ POPULARES ============ */
router.get("/popular", (req, res, next) => {
    try {
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
        const rows = db_1.db
            .prepare(`
        SELECT e.id, e.name, e.muscle_group, e.description, e.media_url,
               COALESCE(s.times_used, 0) AS times_used
        FROM exercises e
        LEFT JOIN exercise_stats s ON s.exercise_id = e.id
        ORDER BY times_used DESC, e.name ASC
        LIMIT ?
      `)
            .all(limit);
        res.json({ data: rows });
    }
    catch (e) {
        next(e);
    }
});
/* ============ LISTAR ============ */
// GET /api/exercises
router.get("/", (req, res, next) => {
    try {
        const { page, size, offset, limit } = parsePagination(req.query);
        const { column, direction } = parseSort(req.query);
        const search = String(req.query.search ?? "").trim();
        const muscle = String(req.query.muscle ?? "").trim();
        const where = `WHERE name LIKE ? AND muscle_group LIKE ?`;
        const params = [`%${search}%`, `%${muscle}%`];
        const total = db_1.db
            .prepare(`SELECT COUNT(*) as n FROM exercises ${where}`)
            .get(...params).n;
        const rows = db_1.db
            .prepare(`SELECT id, name, muscle_group, description, media_url
         FROM exercises
         ${where}
         ORDER BY ${column} ${direction}
         LIMIT ? OFFSET ?`)
            .all(...params, limit, offset);
        res.json({
            data: rows,
            page,
            size,
            total,
            totalPages: Math.ceil(total / size),
        });
    }
    catch (e) {
        next(e);
    }
});
/* ============ DETALHE ============ */
// GET /api/exercises/:id
router.get("/:id", (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const row = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(id);
        if (!row)
            return res.status(404).json({ error: "Exercício não encontrado." });
        res.json(row);
    }
    catch (e) {
        next(e);
    }
});
/* ============ CRIAR ============ */
// POST /api/exercises
router.post("/", auth_1.requireAuth, (req, res, next) => {
    try {
        const { name, muscle_group, description } = req.body || {};
        if (!name || !muscle_group) {
            return res
                .status(400)
                .json({ error: "name e muscle_group são obrigatórios" });
        }
        const info = db_1.db
            .prepare("INSERT INTO exercises (name, muscle_group, description) VALUES (?, ?, ?)")
            .run(String(name), String(muscle_group), description ? String(description) : null);
        const created = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(Number(info.lastInsertRowid));
        res.status(201).json(created);
    }
    catch (e) {
        next(e);
    }
});
/* ============ ATUALIZAR ============ */
// PUT /api/exercises/:id
router.put("/:id", auth_1.requireAuth, (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { name, muscle_group, description } = req.body || {};
        const existing = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(id); // 👈 evita o erro de TS
        if (!existing) {
            return res.status(404).json({ error: "Exercício não encontrado." });
        }
        const newName = typeof name === "string" && name.trim().length > 0
            ? name.trim()
            : existing.name;
        const allowedGroups = new Set([
            "peito",
            "costas",
            "pernas",
            "ombros",
            "braços",
            "core",
            "corpo inteiro",
        ]);
        const newGroup = typeof muscle_group === "string" && allowedGroups.has(muscle_group)
            ? muscle_group
            : existing.muscle_group;
        const newDesc = typeof description === "string"
            ? description
            : existing.description ?? null;
        db_1.db.prepare(`
      UPDATE exercises
      SET name = ?, muscle_group = ?, description = ?
      WHERE id = ?
    `).run(newName, newGroup, newDesc, id);
        const updated = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(id);
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
});
/* ============ APAGAR ============ */
// DELETE /api/exercises/:id
router.delete("/:id", auth_1.requireAuth, (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const r = db_1.db.prepare("DELETE FROM exercises WHERE id = ?").run(id);
        if (r.changes === 0) {
            return res.status(404).json({ error: "Exercício não encontrado." });
        }
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
/* ============ DUPLICAR ============ */
// POST /api/exercises/:id/duplicate
router.post("/:id/duplicate", auth_1.requireAuth, (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const bodyName = (req.body?.name ?? "").toString().trim();
        const existing = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(id);
        if (!existing) {
            return res.status(404).json({ error: "Exercício de origem não encontrado." });
        }
        const newName = bodyName.length > 0 ? bodyName : `${existing.name} (cópia)`;
        const info = db_1.db
            .prepare(`
        INSERT INTO exercises (name, muscle_group, description, media_url)
        VALUES (?, ?, ?, ?)
      `)
            .run(newName, existing.muscle_group, existing.description ?? null, existing.media_url ?? null);
        const created = db_1.db
            .prepare("SELECT id, name, muscle_group, description, media_url FROM exercises WHERE id = ?")
            .get(Number(info.lastInsertRowid));
        res.status(201).json(created);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
