import { Router } from "express";
import { pool } from "../config/db.js";
import { getAvailableSlots, isValidDateString } from "../services/schedule.js";

const r = Router();

r.get("/hairdressers", async (_, res) => {
  const [rows] = await pool.query(
    "SELECT id,name FROM users WHERE role='HAIRDRESSER' AND active=1 ORDER BY name",
  );
  res.json(rows);
});

r.get("/services/:hairdresserId", async (req, res) => {
  const id = Number(req.params.hairdresserId);
  if (!Number.isInteger(id))
    return res.status(400).json({ message: "Cabeleireira inválida." });
  const [rows] = await pool.query(
    "SELECT s.id,s.name,s.duration_minutes,s.price_type,s.price,s.price_min,s.price_max,u.name hairdresser_name,u.phone hairdresser_phone FROM services s JOIN users u ON u.id=s.hairdresser_id WHERE s.hairdresser_id=? AND s.active=1 AND u.active=1 ORDER BY s.name",
    [id],
  );
  res.json(rows);
});

r.get("/availability", async (req, res) => {
  try {
    const { hairdresserId, serviceId, date } = req.query;
    if (
      !Number.isInteger(Number(hairdresserId)) ||
      !Number.isInteger(Number(serviceId)) ||
      !isValidDateString(date)
    ) {
      return res
        .status(400)
        .json({ message: "Informe profissional, serviço e uma data válida." });
    }
    res.json(
      await getAvailableSlots(Number(hairdresserId), Number(serviceId), date),
    );
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

export default r;
