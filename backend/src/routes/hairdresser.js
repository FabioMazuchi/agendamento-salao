import { Router } from "express";
import { pool } from "../config/db.js";
import { auth } from "../middleware/auth.js";

const r = Router();

function parsePricing(body) {
  const priceType = String(body.price_type || "").toUpperCase();
  const price =
    body.price === "" || body.price === null || body.price === undefined
      ? null
      : Number(body.price);
  const priceMin =
    body.price_min === "" ||
    body.price_min === null ||
    body.price_min === undefined
      ? null
      : Number(body.price_min);
  const priceMax =
    body.price_max === "" ||
    body.price_max === null ||
    body.price_max === undefined
      ? null
      : Number(body.price_max);

  if (!["FIXED", "RANGE"].includes(priceType))
    throw new Error("Selecione preço fixo ou faixa de preço.");
  if (priceType === "FIXED") {
    if (!Number.isFinite(price) || price < 0)
      throw new Error("Informe um preço fixo válido.");
    return { priceType, price, priceMin: null, priceMax: null };
  }
  if (
    !Number.isFinite(priceMin) ||
    !Number.isFinite(priceMax) ||
    priceMin < 0 ||
    priceMax < priceMin
  ) {
    throw new Error("Informe valores mínimo e máximo válidos.");
  }
  return { priceType, price: null, priceMin, priceMax };
}

r.get("/services", auth("HAIRDRESSER"), async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id,hairdresser_id,name,duration_minutes,price_type,price,price_min,price_max,active,created_at FROM services WHERE hairdresser_id=? ORDER BY active DESC,name",
    [req.user.id],
  );
  res.json(rows);
});

r.post("/services", auth("HAIRDRESSER"), async (req, res) => {
  try {
    const { name, duration_minutes } = req.body;
    const duration = Number(duration_minutes);
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 150 ||
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 1440
    ) {
      return res.status(400).json({ message: "Nome e duração são inválidos." });
    }
    const p = parsePricing(req.body);
    const [result] = await pool.query(
      "INSERT INTO services(hairdresser_id,name,duration_minutes,price_type,price,price_min,price_max) VALUES(?,?,?,?,?,?,?)",
      [
        req.user.id,
        name.trim(),
        duration,
        p.priceType,
        p.price,
        p.priceMin,
        p.priceMax,
      ],
    );
    res
      .status(201)
      .json({ id: result.insertId, message: "Serviço cadastrado." });
  } catch (e) {
    if (e.message) return res.status(400).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: "Não foi possível cadastrar o serviço." });
  }
});

r.put("/services/:id", auth("HAIRDRESSER"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, duration_minutes, active = true } = req.body;
    const duration = Number(duration_minutes);
    if (
      !Number.isInteger(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 1440
    ) {
      return res.status(400).json({ message: "Dados do serviço inválidos." });
    }
    const p = parsePricing(req.body);
    const [result] = await pool.query(
      "UPDATE services SET name=?,duration_minutes=?,price_type=?,price=?,price_min=?,price_max=?,active=? WHERE id=? AND hairdresser_id=?",
      [
        name.trim(),
        duration,
        p.priceType,
        p.price,
        p.priceMin,
        p.priceMax,
        active ? 1 : 0,
        id,
        req.user.id,
      ],
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Serviço não encontrado." });
    res.json({ message: "Serviço atualizado." });
  } catch (e) {
    if (e.message) return res.status(400).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: "Não foi possível atualizar o serviço." });
  }
});

r.delete("/services/:id", auth("HAIRDRESSER"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
      return res.status(400).json({ message: "Serviço inválido." });
    await pool.query(
      "UPDATE services SET active=0 WHERE id=? AND hairdresser_id=?",
      [id, req.user.id],
    );
    res.json({ message: "Serviço desativado." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Não foi possível desativar o serviço." });
  }
});

r.get("/work-hours", auth("HAIRDRESSER"), async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM work_hours WHERE hairdresser_id=? ORDER BY weekday,start_time",
    [req.user.id],
  );
  res.json(rows);
});

r.put("/work-hours", auth("HAIRDRESSER"), async (req, res) => {
  const { hours = [] } = req.body;
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.query("DELETE FROM work_hours WHERE hairdresser_id=?", [
      req.user.id,
    ]);
    for (const h of hours) {
      if (h.active)
        await c.query(
          "INSERT INTO work_hours(hairdresser_id,weekday,start_time,end_time,active) VALUES(?,?,?,?,1)",
          [req.user.id, h.weekday, h.start_time, h.end_time],
        );
    }
    await c.commit();
    res.json({ message: "Horários de trabalho salvos." });
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
});

r.get("/finance", auth("HAIRDRESSER"), async (req, res) => {
  const [summary] = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN a.status='COMPLETED' THEN COALESCE(a.price,s.price,0) ELSE 0 END),0) revenue, SUM(CASE WHEN a.status='COMPLETED' THEN 1 ELSE 0 END) completed, SUM(CASE WHEN a.status='BOOKED' THEN 1 ELSE 0 END) booked FROM appointments a JOIN services s ON s.id=a.service_id WHERE a.hairdresser_id=? AND a.appointment_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND a.appointment_date<LAST_DAY(CURDATE())+INTERVAL 1 DAY",
    [req.user.id],
  );
  const [history] = await pool.query(
    "SELECT DATE_FORMAT(a.appointment_date,'%Y-%m') month,COALESCE(SUM(CASE WHEN a.status='COMPLETED' THEN COALESCE(a.price,s.price,0) ELSE 0 END),0) revenue FROM appointments a JOIN services s ON s.id=a.service_id WHERE a.hairdresser_id=? GROUP BY month ORDER BY month DESC LIMIT 6",
    [req.user.id],
  );
  res.json({ summary: summary[0], history });
});

export default r;
