// server/src/controllers/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/db";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 dias

// Garante tabela users (caso não exista)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function signToken(u: { id: number; email: string }) {
  return jwt.sign({ id: u.id, email: u.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SEC,
  });
}

/**
 * POST /api/auth/register
 *  → { ok, message, token, email }
 */
router.post("/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email e password são obrigatórios." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "A password deve ter pelo menos 6 caracteres." });
  }

  try {
    const exists = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as any;
    if (exists?.id) {
      return res
        .status(409)
        .json({ error: "Este email já está registado." });
    }

    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email, hash);

    const user = { id: Number(info.lastInsertRowid), email };
    const token = signToken(user);

    return res.status(201).json({
      ok: true,
      message: "Conta criada com sucesso.",
      token,
      email: user.email,
    });
  } catch (e) {
    console.error("REGISTER error:", e);
    return res.status(500).json({ error: "Não foi possível criar conta." });
  }
});

/**
 * POST /api/auth/login
 *  → { token, email }
 *
 * Nota: se o utilizador NÃO existir, é criado automaticamente.
 * Assim não ficas preso em problemas de registo durante o desenvolvimento.
 */
router.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email e password são obrigatórios." });
  }

  try {
    let row = db
      .prepare(
        "SELECT id, email, password_hash FROM users WHERE email = ?"
      )
      .get(email) as any;

    if (!row?.id) {
      // 🔁 Se não existir, cria automaticamente o utilizador
      const hash = bcrypt.hashSync(password, 10);
      const info = db
        .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
        .run(email, hash);
      row = {
        id: Number(info.lastInsertRowid),
        email,
        password_hash: hash,
      };
      console.log("[AUTH] Utilizador criado automaticamente no login:", email);
    } else {
      // Se já existir, verifica password
      const ok = bcrypt.compareSync(password, row.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }
    }

    const user = { id: row.id, email: row.email };
    const token = signToken(user);
    return res.json({ token, email: user.email });
  } catch (e) {
    console.error("LOGIN error:", e);
    return res.status(500).json({ error: "Falha no login." });
  }
});

export default router;
