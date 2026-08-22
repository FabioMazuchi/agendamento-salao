import { Router } from "express";
import { pool } from "../config/db.js";
import { auth } from "../middleware/auth.js";
import { sendAppointmentEmail, sendReviewEmail } from "../services/mailer.js";
import {
  getAvailableSlots,
  isFutureDateTime,
  isValidDateString,
} from "../services/schedule.js";

const r = Router();
const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

r.post("/", auth("CLIENT"), async (req, res) => {
  const { hairdresserId, serviceId, date, time, notes = "" } = req.body;
  if (
    !Number.isInteger(Number(hairdresserId)) ||
    !Number.isInteger(Number(serviceId)) ||
    !isValidDateString(date) ||
    !/^\d{2}:\d{2}$/.test(String(time))
  )
    return res.status(400).json({ message: "Dados do agendamento inválidos." });
  if (!isFutureDateTime(date, time))
    return res
      .status(400)
      .json({ message: "Só é possível agendar horários futuros." });
  if (typeof notes !== "string" || notes.length > 1000)
    return res.status(400).json({ message: "Observações inválidas." });
  const client = await pool.getConnection();
  try {
    await client.beginTransaction();
    // Serializa reservas da mesma profissional para impedir condições de corrida.
    const [hair] = await client.query(
      "SELECT id,name,email FROM users WHERE id=? AND role='HAIRDRESSER' AND active=1 FOR UPDATE",
      [Number(hairdresserId)],
    );
    if (!hair.length) {
      await client.rollback();
      return res.status(404).json({ message: "Cabeleireira não encontrada." });
    }
    const [svc] = await client.query(
      "SELECT s.id,s.name,s.duration_minutes,s.price_type,s.price,s.price_min,s.price_max FROM services s WHERE s.id=? AND s.hairdresser_id=? AND s.active=1",
      [Number(serviceId), Number(hairdresserId)],
    );
    if (!svc.length) {
      await client.rollback();
      return res.status(404).json({ message: "Serviço não encontrado." });
    }
    const duration = Number(svc[0].duration_minutes);
    const slots = await getAvailableSlots(
      Number(hairdresserId),
      Number(serviceId),
      date,
    );
    if (!slots.includes(time)) {
      await client.rollback();
      return res
        .status(409)
        .json({
          message: "Este horário não está disponível para o serviço escolhido.",
        });
    }
    const end = new Date(`1970-01-01T${time}:00`);
    end.setMinutes(end.getMinutes() + duration);
    const endTime = end.toTimeString().slice(0, 5);
    const [conflict] = await client.query(
      "SELECT id FROM appointments WHERE hairdresser_id=? AND appointment_date=? AND status IN ('BOOKED','COMPLETED') AND start_time < ? AND end_time > ? FOR UPDATE",
      [Number(hairdresserId), date, endTime, time],
    );
    if (conflict.length) {
      await client.rollback();
      return res
        .status(409)
        .json({
          message: "Este horário acabou de ser ocupado. Escolha outro.",
        });
    }
    const [x] = await client.query(
      "INSERT INTO appointments(client_id,hairdresser_id,service_id,appointment_date,start_time,end_time,status,price,notes) VALUES(?,?,?,?,?,?,?,?,?)",
      [
        req.user.id,
        Number(hairdresserId),
        Number(serviceId),
        date,
        time,
        endTime,
        "BOOKED",
        svc[0].price_type === "FIXED" ? svc[0].price : null,
        notes.trim(),
      ],
    );
    await client.commit();
    const [u] = await pool.query("SELECT name,email FROM users WHERE id=?", [
      req.user.id,
    ]);
    await sendAppointmentEmail({
      to: u[0].email,
      name: u[0].name,
      date: fmt(date),
      time,
      hairdresser: hair[0].name,
      service: svc[0].name,
    });
    if (hair[0].email)
      await sendAppointmentEmail({
        to: hair[0].email,
        name: hair[0].name,
        date: fmt(date),
        time,
        hairdresser: hair[0].name,
        service: svc[0].name,
      });
    res
      .status(201)
      .json({
        id: x.insertId,
        message: "Agendamento realizado com sucesso.",
        endTime,
      });
  } catch (e) {
    await client.rollback();
    console.error(e);
    if (e.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({
          message: "Este horário acabou de ser ocupado. Escolha outro.",
        });
    res
      .status(500)
      .json({ message: "Não foi possível realizar o agendamento." });
  } finally {
    client.release();
  }
});

r.get("/mine", auth("CLIENT"), async (req, res) => {
  try {
    const [x] = await pool.query(
      `SELECT a.*,s.name service_name,u.name hairdresser_name FROM appointments a JOIN services s ON s.id=a.service_id JOIN users u ON u.id=a.hairdresser_id WHERE a.client_id=? ORDER BY a.appointment_date DESC,a.start_time DESC`,
      [req.user.id],
    );
    res.json(x);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Não foi possível carregar seus agendamentos." });
  }
});

r.patch("/:id/cancel", auth("CLIENT"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ message: "Agendamento inválido." });
    const [x] = await pool.query(
      "UPDATE appointments SET status='CANCELLED' WHERE id=? AND client_id=? AND status='BOOKED'",
      [id, req.user.id],
    );
    res.json({
      message: x.affectedRows
        ? "Agendamento cancelado."
        : "Não foi possível cancelar.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível cancelar." });
  }
});

r.get("/hairdresser", auth("HAIRDRESSER"), async (req, res) => {
  try {
    const [x] = await pool.query(
      `SELECT a.*,s.name service_name,s.price_type service_price_type,s.price service_price,s.price_min service_price_min,s.price_max service_price_max,u.name client_name,u.email client_email,u.phone client_phone FROM appointments a JOIN services s ON s.id=a.service_id JOIN users u ON u.id=a.client_id WHERE a.hairdresser_id=? ORDER BY a.appointment_date DESC,a.start_time DESC`,
      [req.user.id],
    );
    res.json(x);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Não foi possível carregar os atendimentos." });
  }
});

r.patch("/:id/status", auth("HAIRDRESSER"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, finalPrice } = req.body;
    if (
      !Number.isInteger(id) ||
      !["BOOKED", "COMPLETED", "CANCELLED"].includes(status)
    )
      return res.status(400).json({ message: "Status inválido." });
    const [rows] = await pool.query(
      `SELECT a.*,s.name service_name,s.price_type,s.price_min,s.price_max,u.name client_name,u.email client_email FROM appointments a JOIN services s ON s.id=a.service_id JOIN users u ON u.id=a.client_id WHERE a.id=? AND a.hairdresser_id=?`,
      [id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Agendamento não encontrado." });
    const a = rows[0];
    let priceToSave = a.price;
    if (
      status === "COMPLETED" &&
      a.status !== "COMPLETED" &&
      a.price_type === "RANGE"
    ) {
      const value = Number(finalPrice);
      const min = Number(a.price_min),
        max = Number(a.price_max);
      if (!Number.isFinite(value) || value < min || value > max)
        return res
          .status(400)
          .json({
            message: `Informe o valor combinado entre R$ ${min.toFixed(2)} e R$ ${max.toFixed(2)}.`,
          });
      priceToSave = value;
    }
    await pool.query(
      "UPDATE appointments SET status=?, price=? WHERE id=? AND hairdresser_id=?",
      [status, priceToSave, id, req.user.id],
    );
    if (status === "COMPLETED" && a.status !== "COMPLETED") {
      const [count] = await pool.query(
        "SELECT COUNT(*) c FROM appointments WHERE client_id=? AND status='COMPLETED'",
        [a.client_id],
      );
      const [sent] = await pool.query(
        "SELECT id FROM review_requests WHERE client_id=?",
        [a.client_id],
      );
      if (Number(count[0].c) === 1 && !sent.length) {
        await sendReviewEmail({ to: a.client_email, name: a.client_name });
        await pool.query(
          "INSERT INTO review_requests(client_id,appointment_id) VALUES(?,?)",
          [a.client_id, a.id],
        );
      }
    }
    res.json({ message: "Status atualizado.", price: priceToSave });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível atualizar o status." });
  }
});
export default r;
