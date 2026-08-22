import "dotenv/config";
export const env = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "salao_maos_ungidas",
  },
  email: {
    mode: (
      process.env.EMAIL_MODE ||
      (process.env.NODE_ENV === "production" ? "hostinger" : "ethereal")
    ).toLowerCase(),
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
  mailFromName: process.env.MAIL_FROM_NAME || "Salão de Beleza Mãos Ungidas",
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER,
  googleReviewUrl: process.env.GOOGLE_REVIEW_URL || "",
  timezone: process.env.APP_TIMEZONE || "America/Sao_Paulo",
};
