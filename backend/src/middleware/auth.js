import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function auth(requiredRole = null) {
  return (req, res, next) => {
    try {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Não autenticado." });
      const payload = jwt.verify(token, env.jwtSecret);
      if (requiredRole && payload.role !== requiredRole)
        return res.status(403).json({ message: "Acesso não autorizado." });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ message: "Sessão inválida ou expirada." });
    }
  };
}
