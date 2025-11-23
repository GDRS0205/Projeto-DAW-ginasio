"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const status = res.locals.status || err.status || 500;
    const message = err.message || "Erro interno";
    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    }
    res.status(status).json({ error: message });
}
