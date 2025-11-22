// server/src/controllers/workouts.ts
import { Router } from "express";
import { db } from "../db/db";
import { requireAuth } from "../middleware/auth";

const router = Router();

/* ---------- Helpers numéricos ---------- */

const ensureNumber = (n: any, def = 0) =>
  Number.isFinite(Number(n)) ? Number(n) : def;

const intMin1 = (n: any) => Math.max(1, Math.floor(ensureNumber(n, 1)));
const nonNeg = (n: any) => Math.max(0, ensureNumber(n, 0));

/* ---------- Helpers de paginação / ordenação ---------- */

function parsePagination(q: any) {
  // o cliente envia p / s; mas aceitamos também page / size
  const page = Math.max(1, Number(q.p ?? q.page) || 1);
  const size = Math.min(50, Math.max(1, Number(q.s ?? q.size) || 10));
  const offset = (page - 1) * size;
  return { page, size, limit: size, offset };
}

function parseSort(q: any) {
  // o cliente envia t: "id,DESC" (ou sort)
  const allowed = new Set(["id", "name", "created_at", "muscle_group"]);
  const raw = String(q.t ?? q.sort ?? "id,DESC");
  const [colRaw, dirRaw] = raw.split(/[:, ]/);
  const column = allowed.has(colRaw) ? colRaw : "id";
  const dir = String(dirRaw || "DESC").toUpperCase();
  const direction = dir === "ASC" ? "ASC" : "DESC";
  return { column, direction };
}

/* ---------- Helper de ownership ---------- */

function getOwnedWorkout(id: number, userId: number) {
  return db
    .prepare(
      `SELECT id, user_id, name, muscle_group, created_at, notes, is_favorite
       FROM workouts
       WHERE id = ? AND user_id = ?`
    )
    .get(id, userId) as any | undefined;
}

/* =========================================================
   ROTAS MAIS ESPECÍFICAS (devem vir antes de "/:id")
   ========================================================= */

/** POST /api/workouts/exercises/:itemId/log  (adiciona log rápido) */
router.post("/exercises/:itemId/log", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const itemId = Number(req.params.itemId);
    const item = db
      .prepare(
        `SELECT id, workout_id, sets, reps, weight
         FROM workout_items WHERE id = ?`
      )
      .get(itemId) as any;
    if (!item?.id) return res.status(404).json({ error: "Item não encontrado." });

    const owner = getOwnedWorkout(item.workout_id, userId);
    if (!owner) return res.status(404).json({ error: "Item não encontrado." });

    const inSets = req.body?.sets ?? item.sets;
    const inReps = req.body?.reps ?? item.reps;
    const inWeight = req.body?.weight ?? item.weight;

    const sets = intMin1(inSets);
    const reps = intMin1(inReps);
    const weight = nonNeg(inWeight);

    const info = db
      .prepare(
        `INSERT INTO workout_item_logs (item_id, sets, reps, weight)
         VALUES (?, ?, ?, ?)`
      )
      .run(itemId, sets, reps, weight);

    const created = db
      .prepare(
        `SELECT id, item_id, ts, sets, reps, weight
         FROM workout_item_logs
         WHERE id = ?`
      )
      .get(Number(info.lastInsertRowid));

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** GET /api/workouts/exercises/:itemId/logs  (últimos logs + PR + melhor volume) */
router.get("/exercises/:itemId/logs", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const itemId = Number(req.params.itemId);
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 3));

    const item = db
      .prepare(
        `SELECT wi.id, wi.workout_id, wi.exercise_id
         FROM workout_items wi
         WHERE wi.id = ?`
      )
      .get(itemId) as any;
    if (!item?.id) return res.status(404).json({ error: "Item não encontrado." });

    const owner = getOwnedWorkout(item.workout_id, userId);
    if (!owner) return res.status(404).json({ error: "Item não encontrado." });

    const last = db
      .prepare(
        `SELECT id, item_id, ts, sets, reps, weight
         FROM workout_item_logs
         WHERE item_id = ?
         ORDER BY ts DESC, id DESC
         LIMIT ?`
      )
      .all(itemId, limit) as any[];

    const prRow = db
      .prepare(
        `SELECT MAX(weight) AS pr
         FROM workout_item_logs
         WHERE item_id = ?`
      )
      .get(itemId) as any;
    const pr = prRow?.pr ? Number(prRow.pr) : 0;

    const volRow = db
      .prepare(
        `SELECT MAX(sets * reps * weight) AS bestVolume
         FROM workout_item_logs
         WHERE item_id = ?`
      )
      .get(itemId) as any;
    const bestVolume = volRow?.bestVolume ? Number(volRow.bestVolume) : 0;

    res.json({ last, pr, bestVolume });
  } catch (e) {
    next(e);
  }
});

/** GET /api/workouts/prs – PR por exercício (para o ecrã de PRs) */
router.get("/prs", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const rows = db
      .prepare(
        `
        SELECT
          e.id            AS exercise_id,
          e.name          AS exercise_name,
          e.muscle_group  AS muscle_group,
          MAX(l.weight)   AS best_weight,
          MAX(l.sets * l.reps * l.weight) AS best_volume,
          (
            SELECT MAX(l2.ts)
            FROM workout_item_logs l2
            JOIN workout_items wi2 ON wi2.id = l2.item_id
            JOIN workouts w2 ON w2.id = wi2.workout_id
            WHERE w2.user_id = w.user_id
              AND wi2.exercise_id = e.id
          ) AS last_ts
        FROM workout_item_logs l
        JOIN workout_items wi ON wi.id = l.item_id
        JOIN workouts w ON w.id = wi.workout_id
        JOIN exercises e ON e.id = wi.exercise_id
        WHERE w.user_id = ?
        GROUP BY e.id, e.name, e.muscle_group, w.user_id
        -- SQLite não suporta "NULLS LAST"; truque para pôr NULL no fim:
        ORDER BY last_ts IS NULL, last_ts DESC, best_weight DESC
        `
      )
      .all(userId) as any[];

    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

/** GET /api/workouts/stats – estatísticas gerais para o dashboard */
router.get("/stats", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const totalWorkoutsRow = db
      .prepare(`SELECT COUNT(*) AS c FROM workouts WHERE user_id = ?`)
      .get(userId) as any;
    const totalWorkouts = Number(totalWorkoutsRow?.c || 0);

    const totalExercisesRow = db
      .prepare(`SELECT COUNT(*) AS c FROM exercises`)
      .get() as any;
    const totalExercises = Number(totalExercisesRow?.c || 0);

    const prRow = db
      .prepare(
        `SELECT COUNT(DISTINCT wi.exercise_id) AS c
         FROM workout_item_logs l
         JOIN workout_items wi ON wi.id = l.item_id
         JOIN workouts w ON w.id = wi.workout_id
         WHERE w.user_id = ?`
      )
      .get(userId) as any;
    const prExercises = Number(prRow?.c || 0);

    const datesRow = db
      .prepare(
        `SELECT MIN(created_at) AS first, MAX(created_at) AS last
         FROM workouts WHERE user_id = ?`
      )
      .get(userId) as any;

    const firstWorkoutDate = datesRow?.first || null;
    const lastWorkoutDate = datesRow?.last || null;

    const topGroupRow = db
      .prepare(
        `SELECT muscle_group, COUNT(*) AS c
         FROM workouts
         WHERE user_id = ?
         GROUP BY muscle_group
         ORDER BY c DESC
         LIMIT 1`
      )
      .get(userId) as any;

    const topMuscleGroup = topGroupRow?.muscle_group || null;

    res.json({
      totalWorkouts,
      totalExercises,
      prExercises,
      firstWorkoutDate,
      lastWorkoutDate,
      topMuscleGroup,
    });
  } catch (e) {
    next(e);
  }
});

/** PUT /api/workouts/exercises/:itemId – editar item */
router.put("/exercises/:itemId", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const itemId = Number(req.params.itemId);
    const item = db
      .prepare(
        `SELECT id, workout_id, sets, reps, weight, note
         FROM workout_items WHERE id = ?`
      )
      .get(itemId) as any;
    if (!item?.id) return res.status(404).json({ error: "Item não encontrado." });

    const owner = getOwnedWorkout(item.workout_id, userId);
    if (!owner) return res.status(404).json({ error: "Item não encontrado." });

    const patch = req.body || {};
    const sets = patch.sets != null ? intMin1(patch.sets) : item.sets;
    const reps = patch.reps != null ? intMin1(patch.reps) : item.reps;
    const weight = patch.weight != null ? nonNeg(patch.weight) : item.weight;
    const note =
      typeof patch.note === "string"
        ? patch.note
        : typeof item.note === "string"
        ? item.note
        : null;

    db.prepare(
      `UPDATE workout_items
       SET sets = ?, reps = ?, weight = ?, note = ?
       WHERE id = ?`
    ).run(sets, reps, weight, note, itemId);

    const updated = db
      .prepare(
        `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.sets, wi.reps, wi.weight,
                wi.position, wi.note,
                e.name AS name, e.muscle_group AS muscle_group
         FROM workout_items wi
         JOIN exercises e ON e.id = wi.exercise_id
         WHERE wi.id = ?`
      )
      .get(itemId);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/workouts/exercises/:itemId */
router.delete("/exercises/:itemId", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const itemId = Number(req.params.itemId);
    const item = db
      .prepare(
        `SELECT id, workout_id
         FROM workout_items WHERE id = ?`
      )
      .get(itemId) as any;
    if (!item?.id) return res.status(404).json({ error: "Item não encontrado." });

    const owner = getOwnedWorkout(item.workout_id, userId);
    if (!owner) return res.status(404).json({ error: "Item não encontrado." });

    db.prepare(`DELETE FROM workout_items WHERE id = ?`).run(itemId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   LISTA / CRIA / ETC
   ========================================================= */

/** GET /api/workouts – lista com paginação/filtros */
router.get("/", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const { page, size, limit, offset } = parsePagination(req.query);
    const { column, direction } = parseSort(req.query);

    const search =
      (req.query.search as string | undefined)?.trim().toLowerCase() ?? "";
    const group = (req.query.group as string | undefined)?.trim() ?? "";
    const favorites = req.query.favorites ? true : false;

    const where: string[] = ["w.user_id = ?"];
    const params: any[] = [userId];

    if (search) {
      where.push("LOWER(w.name) LIKE ?");
      params.push(`%${search}%`);
    }
    if (group) {
      where.push("w.muscle_group = ?");
      params.push(group);
    }
    if (favorites) {
      where.push("w.is_favorite = 1");
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const totalRow = db
      .prepare(`SELECT COUNT(*) AS total FROM workouts w ${whereSql}`)
      .get(...params) as any;
    const total = Number(totalRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / size));

    const rows = db
      .prepare(
        `SELECT w.id, w.name, w.muscle_group, w.created_at, w.is_favorite
         FROM workouts w
         ${whereSql}
         ORDER BY ${column} ${direction}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    res.json({ data: rows, total, page, size, totalPages });
  } catch (e) {
    next(e);
  }
});

/** POST /api/workouts – criar treino */
router.post("/", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const rawName = String(req.body?.name || "").trim();
    const rawGroup = String(req.body?.muscle_group || "corpo inteiro").trim();
    if (!rawName) return res.status(400).json({ error: "name é obrigatório" });

    const allowed = new Set([
      "peito",
      "costas",
      "pernas",
      "ombros",
      "braços",
      "core",
      "corpo inteiro",
    ]);
    const mg = allowed.has(rawGroup) ? rawGroup : "corpo inteiro";

    const info = db
      .prepare(
        `INSERT INTO workouts (name, muscle_group, user_id)
         VALUES (?, ?, ?)`
      )
      .run(rawName, mg, userId);

    const created = db
      .prepare(
        `SELECT id, name, muscle_group, created_at, is_favorite
         FROM workouts
         WHERE id = ? AND user_id = ?`
      )
      .get(Number(info.lastInsertRowid), userId);

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** POST /api/workouts/:id/exercises – adicionar item ao treino */
router.post("/:id/exercises", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const workoutId = Number(req.params.id);
    const w = getOwnedWorkout(workoutId, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const { exercise_id, sets = 3, reps = 10, weight = 0 } = req.body || {};
    if (!exercise_id)
      return res.status(400).json({ error: "exercise_id é obrigatório" });

    const ex = db
      .prepare(`SELECT id FROM exercises WHERE id = ?`)
      .get(exercise_id) as any;
    if (!ex?.id) return res.status(404).json({ error: "Exercício não encontrado." });

    const maxPosRow = db
      .prepare(
        `SELECT COALESCE(MAX(position), 0) AS maxp
         FROM workout_items
         WHERE workout_id = ?`
      )
      .get(workoutId) as any;
    const nextPos = (maxPosRow?.maxp || 0) + 1;

    const info = db
      .prepare(
        `INSERT INTO workout_items
           (workout_id, exercise_id, sets, reps, weight, position)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        workoutId,
        Number(exercise_id),
        intMin1(sets),
        intMin1(reps),
        nonNeg(weight),
        nextPos
      );

    const created = db
      .prepare(
        `SELECT wi.id, wi.workout_id, wi.exercise_id, wi.sets, wi.reps, wi.weight,
                wi.position, wi.note,
                e.name AS name, e.muscle_group AS muscle_group
         FROM workout_items wi
         JOIN exercises e ON e.id = wi.exercise_id
         WHERE wi.id = ?`
      )
      .get(Number(info.lastInsertRowid));

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/workouts/:id/reorder – reordenar itens */
router.put("/:id/reorder", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const workoutId = Number(req.params.id);
    const w = getOwnedWorkout(workoutId, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const itemIds: number[] = Array.isArray(req.body?.itemIds)
      ? req.body.itemIds
      : [];
    if (itemIds.length === 0)
      return res.status(400).json({ error: "itemIds é obrigatório" });

    const tx = db.transaction((ids: number[]) => {
      ids.forEach((itemId, idx) => {
        db.prepare(
          `UPDATE workout_items
           SET position = ?
           WHERE id = ?`
        ).run(idx + 1, itemId);
      });
    });

    tx(itemIds);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** POST /api/workouts/:id/duplicate – duplicar treino */
router.post("/:id/duplicate", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const srcId = Number(req.params.id);
    let { name } = req.body || {};

    const src = getOwnedWorkout(srcId, userId);
    if (!src)
      return res.status(404).json({ error: "Treino de origem não encontrado." });

    if (typeof name !== "string" || !name.trim()) {
      const iso = new Date().toISOString().slice(0, 10);
      name = `Cópia de ${src.name} (${iso})`;
    }
    name = name.trim();

    const tx = db.transaction((newName: string) => {
      const rW = db
        .prepare(
          `INSERT INTO workouts (name, muscle_group, user_id, is_favorite)
           VALUES (?, ?, ?, ?)`
        )
        .run(newName, src.muscle_group, userId, src.is_favorite ?? 0);
      const newId = Number(rW.lastInsertRowid);

      const items = db
        .prepare(
          `SELECT exercise_id, sets, reps, weight, position, note
           FROM workout_items
           WHERE workout_id = ?
           ORDER BY position ASC, id ASC`
        )
        .all(srcId) as any[];

      if (items.length) {
        const insI = db.prepare(
          `INSERT INTO workout_items
             (workout_id, exercise_id, sets, reps, weight, position, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        for (const it of items) {
          insI.run(
            newId,
            it.exercise_id,
            it.sets,
            it.reps,
            it.weight,
            it.position,
            it.note ?? null
          );
        }
      }
      return newId;
    });

    const newId = tx(name);
    const created = db
      .prepare(
        `SELECT id, name, muscle_group, created_at, is_favorite
         FROM workouts
         WHERE id = ? AND user_id = ?`
      )
      .get(newId, userId);

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/workouts/:id/note – atualizar notas do treino */
router.put("/:id/note", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const w = getOwnedWorkout(id, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const note = typeof req.body?.note === "string" ? req.body.note : "";
    db.prepare(`UPDATE workouts SET notes = ? WHERE id = ? AND user_id = ?`).run(
      note,
      id,
      userId
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** GET /api/workouts/:id/csv – exportar treino em CSV */
router.get("/:id/csv", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const w = getOwnedWorkout(id, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const rows = db
      .prepare(
        `SELECT wi.position, e.name AS exercise_name, e.muscle_group,
                wi.sets, wi.reps, wi.weight, wi.note
         FROM workout_items wi
         JOIN exercises e ON e.id = wi.exercise_id
         WHERE wi.workout_id = ?
         ORDER BY wi.position ASC, wi.id ASC`
      )
      .all(id) as any[];

    let csv = "pos;exercise;group;sets;reps;weight;note\n";
    for (const r of rows) {
      const line = [
        r.position,
        r.exercise_name,
        r.muscle_group,
        r.sets,
        r.reps,
        r.weight,
        (r.note ?? "").replace(/\r?\n/g, " "),
      ]
        .map((v) => String(v).replace(/;/g, ","))
        .join(";");
      csv += line + "\n";
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="treino-${id}.csv"`
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

/** GET /api/workouts/:id – detalhe do treino */
router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const w = getOwnedWorkout(id, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const exercises = db
      .prepare(
        `SELECT wi.id, wi.workout_id, wi.exercise_id,
                wi.sets, wi.reps, wi.weight,
                wi.position, wi.note,
                e.name AS name, e.muscle_group AS muscle_group
         FROM workout_items wi
         JOIN exercises e ON e.id = wi.exercise_id
         WHERE wi.workout_id = ?
         ORDER BY wi.position ASC, wi.id ASC`
      )
      .all(id) as any[];

    res.json({ id: w.id, name: w.name, notes: w.notes ?? null, exercises });
  } catch (e) {
    next(e);
  }
});

/** PUT /api/workouts/:id – editar nome / grupo */
router.put("/:id", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const w = getOwnedWorkout(id, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    const rawName = req.body?.name;
    const rawGroup = req.body?.muscle_group;

    const name =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : undefined;
    const allowed = new Set([
      "peito",
      "costas",
      "pernas",
      "ombros",
      "braços",
      "core",
      "corpo inteiro",
    ]);
    const mg =
      typeof rawGroup === "string" && allowed.has(rawGroup)
        ? rawGroup
        : undefined;

    if (!name && !mg)
      return res.status(400).json({ error: "Nada para atualizar." });

    const fields: string[] = [];
    const values: any[] = [];
    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (mg) {
      fields.push("muscle_group = ?");
      values.push(mg);
    }
    values.push(id, userId);

    db.prepare(
      `UPDATE workouts
       SET ${fields.join(", ")}
       WHERE id = ? AND user_id = ?`
    ).run(...values);

    const updated = db
      .prepare(
        `SELECT id, name, muscle_group, created_at, is_favorite
         FROM workouts
         WHERE id = ? AND user_id = ?`
      )
      .get(id, userId);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/workouts/:id/favorite – definir / remover favorito */
router.put("/:id/favorite", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const w = getOwnedWorkout(id, userId);
    if (!w) return res.status(404).json({ error: "Treino não encontrado." });

    // o cliente envia is_favorite: 0/1
    const newValRaw = req.body?.is_favorite;
    const newVal = newValRaw ? 1 : 0;

    db.prepare(
      `UPDATE workouts
       SET is_favorite = ?
       WHERE id = ? AND user_id = ?`
    ).run(newVal, id, userId);

    const updated = db
      .prepare(
        `SELECT id, name, muscle_group, created_at, is_favorite
         FROM workouts
         WHERE id = ? AND user_id = ?`
      )
      .get(id, userId);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/workouts/:id */
router.delete("/:id", requireAuth, (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sem sessão." });

    const id = Number(req.params.id);
    const r = db
      .prepare(`DELETE FROM workouts WHERE id = ? AND user_id = ?`)
      .run(id, userId);
    if (r.changes === 0)
      return res.status(404).json({ error: "Treino não encontrado." });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
