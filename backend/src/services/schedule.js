import { pool } from "../config/db.js";
import { env } from "../config/env.js";

function hmToMin(hm) {
  const [h, m] = String(hm).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function minToHm(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    time: `${get("hour")}:${get("minute")}`,
  };
}

function zonedNow() {
  return zonedParts(new Date());
}

export function isValidDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  const d = new Date(`${date}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function isFutureDateTime(date, time) {
  if (!isValidDateString(date) || !/^[0-2]\d:[0-5]\d$/.test(String(time)))
    return false;
  const [h, m] = time.split(":").map(Number);
  if (h > 23 || m > 59) return false;
  const now = zonedNow();
  if (date > now.date) return true;
  if (date < now.date) return false;
  return h * 60 + m > now.minutes;
}

export async function getAvailableSlots(hairdresserId, serviceId, date) {
  if (!isValidDateString(date)) throw new Error("Data inválida.");
  const [svc] = await pool.query(
    "SELECT duration_minutes FROM services WHERE id=? AND hairdresser_id=? AND active=1",
    [serviceId, hairdresserId],
  );
  if (!svc.length) throw new Error("Serviço não encontrado.");
  const duration = Number(svc[0].duration_minutes);
  const d = new Date(`${date}T12:00:00`);
  const dow = d.getDay();
  const [work] = await pool.query(
    "SELECT start_time,end_time FROM work_hours WHERE hairdresser_id=? AND weekday=? AND active=1 ORDER BY start_time",
    [hairdresserId, dow],
  );
  if (!work.length) return [];
  const [breaks] = await pool.query(
    "SELECT start_time,end_time FROM time_blocks WHERE hairdresser_id=? AND block_date=?",
    [hairdresserId, date],
  );
  const [apps] = await pool.query(
    "SELECT start_time,end_time FROM appointments WHERE hairdresser_id=? AND appointment_date=? AND status IN ('BOOKED','COMPLETED')",
    [hairdresserId, date],
  );
  const blocked = [
    ...apps.map((a) => ({ s: hmToMin(a.start_time), e: hmToMin(a.end_time) })),
    ...breaks.map((a) => ({
      s: hmToMin(a.start_time),
      e: hmToMin(a.end_time),
    })),
  ];
  const slots = [];
  const now = zonedNow();
  const minFuture = date === now.date ? now.minutes : -1;
  for (const w of work) {
    for (
      let t = hmToMin(w.start_time);
      t + duration <= hmToMin(w.end_time);
      t += 30
    ) {
      const e = t + duration;
      if (t <= minFuture) continue;
      if (!blocked.some((b) => t < b.e && e > b.s)) slots.push(minToHm(t));
    }
  }
  return [...new Set(slots)];
}
