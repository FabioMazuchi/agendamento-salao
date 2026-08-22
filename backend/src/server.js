import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import appointmentRoutes from "./routes/appointments.js";
import hairdresserRoutes from "./routes/hairdresser.js";
import usersRoutes from "./routes/users.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// app.use(
//   cors({
//     origin: env.frontendUrl === "*" ? true : env.frontendUrl,
//     credentials: true,
//   }),
// );

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://salaomaosungidas.com.br',
  'https://www.salaomaosungidas.com.br'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem Origin, como algumas chamadas diretas
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`Origem não permitida pelo CORS: ${origin}`)
    );
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
  authRoutes,
);
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", service: "salao-maos-ungidas-api" }),
);
app.use("/api/public", publicRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/hairdresser", hairdresserRoutes);
app.use("/api/users", usersRoutes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
});

app.listen(env.port, () => {
  console.log(`API rodando na porta ${env.port}`);
});
