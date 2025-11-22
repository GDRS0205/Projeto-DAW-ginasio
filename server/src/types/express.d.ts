// Declaração global para o req.user no Express (TypeScript)
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      email?: string;
      role?: string;
    };
  }
}
