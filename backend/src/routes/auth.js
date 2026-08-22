import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../config/db.js";
import { signToken } from "../utils/jwt.js";
import {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} from "../services/mailer.js";
const r = Router();
const emailOf = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();
const passwordOk = (v) => typeof v === "string" && v.length >= 6;

r.post("/register", async (req, res) => {
  try {
    const { name, password, phone = "" } = req.body,
      email = emailOf(req.body.email);
    if (!name?.trim() || !email || !password)
      return res
        .status(400)
        .json({ message: "Nome, e-mail e senha são obrigatórios." });
    if (!passwordOk(password))
      return res
        .status(400)
        .json({ message: "A senha deve ter pelo menos 6 caracteres." });
    const [exists] = await pool.query("SELECT id FROM users WHERE email=?", [
      email,
    ]);
    if (exists.length)
      return res
        .status(409)
        .json({
          message:
            "E-mail já cadastrado. Se esqueceu a senha, use a recuperação de senha.",
        });
    const hash = await bcrypt.hash(password, 12),
      token = crypto.randomBytes(32).toString("hex");
    const [x] = await pool.query(
      "INSERT INTO users(name,email,password_hash,phone,role,email_confirmed,confirmation_token) VALUES(?,?,?,?, 'CLIENT',0,?)",
      [name.trim(), email, hash, String(phone).trim(), token],
    );
    await sendConfirmationEmail(
      { id: x.insertId, name: name.trim(), email },
      token,
    );
    res
      .status(201)
      .json({
        message:
          "Cadastro realizado. Verifique seu e-mail para confirmar a conta.",
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao cadastrar." });
  }
});

r.get("/confirm-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token ausente." });
    const [x] = await pool.query(
      "UPDATE users SET email_confirmed=1,confirmation_token=NULL WHERE confirmation_token=?",
      [String(token)],
    );
    if (!x.affectedRows)
      return res
        .status(400)
        .json({ message: "Token inválido ou já utilizado." });
    res.json({ message: "E-mail confirmado com sucesso." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível confirmar o e-mail." });
  }
});

r.post("/forgot-password", async (req, res) => {
  try {
    const email = emailOf(req.body.email);
    const generic =
      "Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.";
    if (!email) return res.status(400).json({ message: "Informe seu e-mail." });
    const [rows] = await pool.query(
      "SELECT id,name,email FROM users WHERE email=? AND role='CLIENT'",
      [email],
    );
    if (rows.length) {
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query(
        "UPDATE users SET password_reset_token=?, password_reset_expires=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id=?",
        [token, rows[0].id],
      );
      await sendPasswordResetEmail(rows[0], token);
    }
    res.json({ message: generic });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Não foi possível solicitar a redefinição." });
  }
});

r.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || ""),
      password = req.body.password;
    if (!token || !passwordOk(password))
      return res
        .status(400)
        .json({
          message:
            "Informe um token válido e uma senha com pelo menos 6 caracteres.",
        });
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE password_reset_token=? AND password_reset_expires >= NOW()",
      [token],
    );
    if (!rows.length)
      return res.status(400).json({ message: "Link inválido ou expirado." });
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password_hash=?,password_reset_token=NULL,password_reset_expires=NULL,active=1 WHERE id=?",
      [hash, rows[0].id],
    );
    res.json({
      message: "Senha redefinida com sucesso. Sua conta está ativa novamente.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível redefinir a senha." });
  }
});

r.post("/login", async (req, res) => {
  try {
    const { password } = req.body,
      email = emailOf(req.body.email);
    const [rows] = await pool.query(
      "SELECT id,name,email,password_hash,phone,role,email_confirmed,active FROM users WHERE email=?",
      [email],
    );
    if (
      !rows.length ||
      !rows[0].password_hash ||
      !(await bcrypt.compare(password || "", rows[0].password_hash))
    )
      return res.status(401).json({ message: "E-mail ou senha inválidos." });
    if (!rows[0].email_confirmed)
      return res
        .status(403)
        .json({ message: "Confirme seu e-mail antes de entrar." });
    const u = rows[0];
    if (!u.active) {
      await pool.query("UPDATE users SET active=1 WHERE id=?", [u.id]);
      u.active = 1;
    }
    res.json({
      token: signToken(u),
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao entrar." });
  }
});
export default r;
