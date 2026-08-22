import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { auth } from "../middleware/auth.js";

const r = Router();

r.get("/me", auth(), async (req, res) => {
  try {
    const [x] = await pool.query(
      "SELECT id,name,email,phone,role,email_confirmed,active FROM users WHERE id=?",
      [req.user.id],
    );
    if (!x.length || !x[0].active)
      return res.status(404).json({ message: "Usuário não encontrado." });
    res.json(x[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível carregar o perfil." });
  }
});

r.patch("/me", auth("CLIENT"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim();
    if (!name) return res.status(400).json({ message: "Nome é obrigatório." });
    await pool.query(
      "UPDATE users SET name=?,phone=? WHERE id=? AND role='CLIENT'",
      [name, phone, req.user.id],
    );
    const [x] = await pool.query(
      "SELECT id,name,email,phone,role,email_confirmed FROM users WHERE id=?",
      [req.user.id],
    );
    res.json({ message: "Informações atualizadas.", user: x[0] });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Não foi possível atualizar as informações." });
  }
});

r.delete("/me", auth("CLIENT"), async (req, res) => {
  try {
    const password = String(req.body.password || "");
    if (!password)
      return res
        .status(400)
        .json({ message: "Informe sua senha para confirmar a exclusão." });
    const [x] = await pool.query(
      "SELECT password_hash FROM users WHERE id=? AND role='CLIENT'",
      [req.user.id],
    );
    if (!x.length || !(await bcrypt.compare(password, x[0].password_hash)))
      return res.status(401).json({ message: "Senha inválida." });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Remove apenas os agendamentos ainda pendentes deste cliente para que não apareçam mais na agenda da cabeleireira.
      await conn.query(
        "DELETE FROM appointments WHERE client_id=? AND status='BOOKED'",
        [req.user.id],
      );
      // Mantém os demais dados e o histórico, mas remove a credencial de acesso.
      await conn.query(
        "UPDATE users SET active=0,password_hash=NULL,password_reset_token=NULL,password_reset_expires=NULL,confirmation_token=NULL WHERE id=?",
        [req.user.id],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    res.json({
      message:
        "Conta desativada. Os agendamentos pendentes foram removidos e a senha foi excluída. Seus dados e histórico foram preservados para uma possível reativação futura.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível excluir a conta." });
  }
});

export default r;
