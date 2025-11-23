"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
/**
 * Middleware que valida o JWT enviado no header Authorization.
 * Define req.user = { id, email } se o token for válido.
 */
function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Sem sessão." });
        }
        const token = authHeader.slice(7); // remove "Bearer "
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded?.id) {
            return res.status(401).json({ error: "Token inválido." });
        }
        req.user = { id: decoded.id, email: decoded.email };
        next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ error: "Sessão inválida." });
    }
}
