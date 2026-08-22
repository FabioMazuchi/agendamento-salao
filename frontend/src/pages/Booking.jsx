import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, MessageCircle } from "lucide-react";
import Loading from "../components/Loading";

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const money = (v) =>
  `R$ ${Number(v || 0)
    .toFixed(2)
    .replace(".", ",")}`;
const servicePrice = (s) =>
  s?.price_type === "RANGE"
    ? `${money(s.price_min)} a ${money(s.price_max)}`
    : s
      ? money(s.price)
      : "";
function whatsappUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default function Booking() {
  const { user } = useAuth(),
    [hs, setHs] = useState([]),
    [sv, setSv] = useState([]),
    [f, setF] = useState({
      hairdresserId: "",
      serviceId: "",
      date: "",
      time: "",
      notes: "",
    }),
    [slots, setSlots] = useState([]),
    [msg, setMsg] = useState(""),
    [err, setErr] = useState(""),
    [loading, setLoading] = useState(true),
    [loadingSlots, setLoadingSlots] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get("/public/hairdressers")
      .then((r) => {
        if (active) setHs(r.data);
      })
      .catch((e) =>
        setErr(
          e.response?.data?.message ||
            "Não foi possível carregar as cabeleireiras.",
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!f.hairdresserId) {
      setSv([]);
      setF((x) => ({ ...x, serviceId: "", time: "" }));
      return;
    }
    let active = true;
    setLoadingSlots(true);
    api
      .get("/public/services/" + f.hairdresserId)
      .then((r) => {
        if (active) setSv(r.data);
      })
      .catch((e) =>
        setErr(
          e.response?.data?.message || "Não foi possível carregar os serviços.",
        ),
      )
      .finally(() => active && setLoadingSlots(false));
    setF((x) => ({ ...x, serviceId: "", time: "" }));
    return () => {
      active = false;
    };
  }, [f.hairdresserId]);
  useEffect(() => {
    if (!f.hairdresserId || !f.serviceId || !f.date) {
      setSlots([]);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    api
      .get("/public/availability", {
        params: {
          hairdresserId: f.hairdresserId,
          serviceId: f.serviceId,
          date: f.date,
        },
      })
      .then((r) => {
        if (active) setSlots(r.data);
      })
      .catch((e) => {
        if (active) {
          setSlots([]);
          setErr(
            e.response?.data?.message ||
              "Não foi possível carregar os horários.",
          );
        }
      })
      .finally(() => active && setLoadingSlots(false));
    return () => {
      active = false;
    };
  }, [f.hairdresserId, f.serviceId, f.date]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  const selectedService = useMemo(
    () => sv.find((s) => String(s.id) === String(f.serviceId)),
    [sv, f.serviceId],
  );
  const wa =
    selectedService?.price_type === "RANGE"
      ? whatsappUrl(
          selectedService.hairdresser_phone,
          `Olá, ${selectedService.hairdresser_name}! Gostaria de saber mais sobre o valor do serviço ${selectedService.name}.`,
        )
      : "";
  if (!user) return <Navigate to="/login" />;
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api.post("/appointments", f);
      setMsg(r.data.message);
      setF((x) => ({ ...x, time: "" }));
      setSlots([]);
    } catch (e) {
      setErr(e.response?.data?.message || "Erro ao agendar.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading text="Carregando opções de agendamento…" />;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Novo agendamento</span>
          <h1>Escolha seu horário</h1>
        </div>
        <CalendarDays />
      </div>
      {msg && (
        <div className="success">
          <CheckCircle2 /> {msg}
        </div>
      )}
      {err && <div className="alert">{err}</div>}
      <form className="card form-grid" onSubmit={submit}>
        <label>
          Cabeleireira
          <select
            value={f.hairdresserId}
            onChange={(e) => setF({ ...f, hairdresserId: e.target.value })}
            required
          >
            <option value="">Selecione</option>
            {hs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Serviço
          <select
            value={f.serviceId}
            onChange={(e) => setF({ ...f, serviceId: e.target.value })}
            required
          >
            <option value="">Selecione</option>
            {sv.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min · {servicePrice(s)}
              </option>
            ))}
          </select>
        </label>
        {selectedService?.price_type === "RANGE" && (
          <div className="price-contact">
            <div>
              <b>Valor estimado: {servicePrice(selectedService)}</b>
              <p>
                Para confirmar o valor do procedimento, fale diretamente com a
                cabeleireira.
              </p>
            </div>
            {wa ? (
              <a
                className="whatsapp-link"
                href={wa}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} /> Falar no WhatsApp
              </a>
            ) : (
              <small>
                O WhatsApp da cabeleireira ainda não foi cadastrado.
              </small>
            )}
          </div>
        )}
        <label>
          Data
          <input
            type="date"
            min={localDate()}
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value, time: "" })}
            required
          />
        </label>
        <div>
          <span className="label">Horários disponíveis</span>
          {loadingSlots ? (
            <Loading text="Calculando horários…" inline />
          ) : (
            <div className="slots">
              {slots.length ? (
                slots.map((t) => (
                  <button
                    type="button"
                    className={f.time === t ? "slot active" : "slot"}
                    onClick={() => setF({ ...f, time: t })}
                    key={t}
                  >
                    {t}
                  </button>
                ))
              ) : (
                <small>
                  {f.hairdresserId && f.serviceId && f.date
                    ? "Nenhum horário futuro disponível para esta data."
                    : "Selecione profissional, serviço e data."}
                </small>
              )}
            </div>
          )}
        </div>
        <label>
          Observações
          <textarea
            value={f.notes}
            maxLength="1000"
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </label>
        <button className="btn full" disabled={!f.time || busy}>
          {busy ? (
            <Loading text="Agendando…" inline />
          ) : (
            "Confirmar agendamento"
          )}
        </button>
      </form>
    </div>
  );
}
