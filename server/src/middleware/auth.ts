import { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

/**
 * Middleware que valida o JWT enviado no header Authorization.
 * Define req.user = { id, email } se o token for válido.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sem sessão." });
    }

    const token = authHeader.slice(7); // remove "Bearer "
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded?.id) {
      return res.status(401).json({ error: "Token inválido." });
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Sessão inválida." });
  }
}
