import { useEffect, useState } from "react";
import { api } from "../services/api";
import { DollarSign, CalendarDays, Scissors, Save } from "lucide-react";
import Loading from "../components/Loading";

const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const statuses = {
  BOOKED: "Agendado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
const money = (value) =>
  `R$ ${Number(value || 0)
    .toFixed(2)
    .replace(".", ",")}`;
const servicePrice = (s) =>
  s.price_type === "RANGE"
    ? `${money(s.price_min)} a ${money(s.price_max)}`
    : money(s.price);

export default function HairdresserDashboard() {
  const [apps, setApps] = useState([]);
  const [services, setServices] = useState([]);
  const [finance, setFinance] = useState({ summary: {}, history: [] });
  const [hours, setHours] = useState(
    days.map((_, weekday) => ({
      weekday,
      active: weekday > 0 && weekday < 7,
      start_time: "09:00",
      end_time: "15:00",
    })),
  );
  const [form, setForm] = useState({
    name: "",
    duration_minutes: 60,
    price_type: "FIXED",
    price: "",
    price_min: "",
    price_max: "",
  });
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [priceModal, setPriceModal] = useState(null);
  const [finalPrice, setFinalPrice] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [a, s, f, h] = await Promise.all([
        api.get("/appointments/hairdresser"),
        api.get("/hairdresser/services"),
        api.get("/hairdresser/finance"),
        api.get("/hairdresser/work-hours"),
      ]);
      setApps(a.data);
      setServices(s.data);
      setFinance(f.data);
      if (h.data.length) {
        const mapped = days.map((_, weekday) => ({
          weekday,
          active: false,
          start_time: "09:00",
          end_time: "15:00",
        }));
        h.data.forEach((x) => (mapped[x.weekday] = { ...x, active: true }));
        setHours(mapped);
      }
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível carregar o painel.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function add(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/hairdresser/services", form);
      setForm({
        name: "",
        duration_minutes: 60,
        price_type: "FIXED",
        price: "",
        price_min: "",
        price_max: "",
      });
      setMsg("Serviço cadastrado com sucesso.");
      await load();
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível cadastrar o serviço.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function editService(s) {
    const name = prompt("Nome do serviço:", s.name);
    if (name === null) return;
    const duration = Number(prompt("Duração em minutos:", s.duration_minutes));
    if (!duration) return;
    const currentType = s.price_type === "RANGE" ? "faixa" : "fixo";
    const answer = prompt("Tipo de preço: fixo ou faixa", currentType);
    if (answer === null) return;
    const normalized = answer.trim().toLowerCase();
    const price_type =
      normalized === "faixa" || normalized === "range"
        ? "RANGE"
        : normalized === "fixo" || normalized === "fixed"
          ? "FIXED"
          : null;
    if (!price_type) {
      setErr("Digite “fixo” ou “faixa”.");
      return;
    }
    const payload = {
      name,
      duration_minutes: duration,
      price_type,
      active: s.active,
    };
    if (price_type === "FIXED") {
      const price = prompt("Preço fixo:", s.price ?? "");
      if (price === null) return;
      payload.price = price;
    } else {
      const min = prompt("Valor mínimo:", s.price_min ?? "");
      if (min === null) return;
      const max = prompt("Valor máximo:", s.price_max ?? "");
      if (max === null) return;
      payload.price_min = min;
      payload.price_max = max;
    }
    setActionId(s.id);
    setErr("");
    try {
      await api.put("/hairdresser/services/" + s.id, payload);
      setMsg("Serviço atualizado.");
      await load();
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível atualizar o serviço.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function toggleService(s) {
    setActionId(s.id);
    setErr("");
    try {
      if (s.active) await api.delete("/hairdresser/services/" + s.id);
      else
        await api.put("/hairdresser/services/" + s.id, {
          name: s.name,
          duration_minutes: s.duration_minutes,
          price_type: s.price_type,
          price: s.price,
          price_min: s.price_min,
          price_max: s.price_max,
          active: true,
        });
      setMsg(s.active ? "Serviço desativado." : "Serviço ativado.");
      await load();
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível alterar o serviço.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function status(id, statusValue, finalPriceValue) {
    setActionId(id);
    setErr("");
    try {
      await api.patch("/appointments/" + id + "/status", {
        status: statusValue,
        ...(finalPriceValue !== undefined
          ? { finalPrice: finalPriceValue }
          : {}),
      });
      setPriceModal(null);
      setFinalPrice("");
      setMsg("Atendimento concluído.");
      await load();
    } catch (e) {
      setErr(
        e.response?.data?.message ||
          "Não foi possível atualizar o atendimento.",
      );
    } finally {
      setActionId(null);
    }
  }

  function completeAppointment(a) {
    if (a.service_price_type === "RANGE") {
      setFinalPrice("");
      setPriceModal(a);
      return;
    }
    status(a.id, "COMPLETED");
  }

  function confirmRangeCompletion() {
    if (!priceModal) return;
    const value = Number(String(finalPrice).replace(",", "."));
    const min = Number(priceModal.service_price_min);
    const max = Number(priceModal.service_price_max);
    if (!Number.isFinite(value) || value < min || value > max) {
      setErr(`Informe um valor entre ${money(min)} e ${money(max)}.`);
      return;
    }
    status(priceModal.id, "COMPLETED", value);
  }

  async function saveHours() {
    setBusy(true);
    setErr("");
    try {
      await api.put("/hairdresser/work-hours", { hours });
      setMsg("Horários salvos.");
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível salvar os horários.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Carregando área da cabeleireira…" />;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Área da cabeleireira</span>
          <h1>Seu painel de atendimento</h1>
        </div>
      </div>
      {err && <div className="alert">{err}</div>}
      {msg && <div className="success">{msg}</div>}
      <div className="tabs">
        <button onClick={() => setTab("dashboard")}>Dashboard</button>
        <button onClick={() => setTab("services")}>
          <Scissors size={16} /> Serviços
        </button>
        <button onClick={() => setTab("hours")}>
          <CalendarDays size={16} /> Horários
        </button>
        <button onClick={() => setTab("history")}>Histórico</button>
      </div>

      {tab === "dashboard" && (
        <>
          <div className="stats">
            <div>
              <DollarSign />
              <span>Receita do mês</span>
              <b>R$ {Number(finance.summary.revenue || 0).toFixed(2)}</b>
            </div>
            <div>
              <CalendarDays />
              <span>Agendados</span>
              <b>{finance.summary.booked || 0}</b>
            </div>
            <div>
              <Scissors />
              <span>Concluídos</span>
              <b>{finance.summary.completed || 0}</b>
            </div>
          </div>
          <div className="card">
            <h2>Próximos atendimentos</h2>
            {apps
              .filter((a) => a.status === "BOOKED")
              .slice(0, 8)
              .map((a) => (
                <div className="item" key={a.id}>
                  <div>
                    <b>{a.client_name}</b>
                    <p>
                      {a.service_name} ·{" "}
                      {new Date(
                        a.appointment_date + "T12:00:00",
                      ).toLocaleDateString("pt-BR")}{" "}
                      às {a.start_time.slice(0, 5)}
                      {a.service_price_type === "RANGE" && (
                        <>
                          {" "}
                          ·{" "}
                          <strong>
                            {money(a.service_price_min)} a{" "}
                            {money(a.service_price_max)}
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    className="btn small"
                    disabled={actionId === a.id}
                    onClick={() => completeAppointment(a)}
                  >
                    {actionId === a.id ? (
                      <Loading text="Salvando…" inline />
                    ) : (
                      "Concluir"
                    )}
                  </button>
                </div>
              ))}
            {!apps.filter((a) => a.status === "BOOKED").length && (
              <p>Nenhum atendimento agendado.</p>
            )}
          </div>
        </>
      )}

      {tab === "services" && (
        <div className="two-col">
          <div className="card">
            <h2>Novo serviço</h2>
            <form className="service-form" onSubmit={add}>
              <label>
                Nome
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Duração (minutos)
                <input
                  type="number"
                  min="15"
                  max="1440"
                  step="15"
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration_minutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              <fieldset className="price-type">
                <legend>Tipo de preço</legend>
                <label className="check">
                  <input
                    type="radio"
                    name="price_type"
                    checked={form.price_type === "FIXED"}
                    onChange={() => setForm({ ...form, price_type: "FIXED" })}
                  />{" "}
                  Valor fixo
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name="price_type"
                    checked={form.price_type === "RANGE"}
                    onChange={() => setForm({ ...form, price_type: "RANGE" })}
                  />{" "}
                  Faixa de preço
                </label>
              </fieldset>
              {form.price_type === "FIXED" ? (
                <label>
                  Valor fixo
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                  />
                </label>
              ) : (
                <div className="price-range">
                  <label>
                    Valor mínimo
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.price_min}
                      onChange={(e) =>
                        setForm({ ...form, price_min: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Valor máximo
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.price_max}
                      onChange={(e) =>
                        setForm({ ...form, price_max: e.target.value })
                      }
                      required
                    />
                  </label>
                  <small>
                    O cliente verá a faixa de preço e poderá entrar em contato
                    pelo WhatsApp.
                  </small>
                </div>
              )}
              <button className="btn full" disabled={busy}>
                {busy ? <Loading text="Cadastrando…" inline /> : "Cadastrar"}
              </button>
            </form>
          </div>
          <div className="card">
            <h2>Serviços cadastrados</h2>
            {!services.length ? (
              <p>Nenhum serviço cadastrado.</p>
            ) : (
              services.map((s) => (
                <div className="item" key={s.id}>
                  <div>
                    <b>{s.name}</b>
                    <p>
                      {s.duration_minutes} min · {servicePrice(s)}
                      {s.price_type === "RANGE" && " · Consulte pelo WhatsApp"}
                    </p>
                  </div>
                  <div className="service-actions">
                    <span
                      className={
                        "service-status " + (s.active ? "active" : "inactive")
                      }
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                    <span
                      className="text-action"
                      role="button"
                      tabIndex={0}
                      aria-disabled={actionId === s.id}
                      onClick={() => {
                        if (actionId !== s.id) editService(s);
                      }}
                    >
                      Editar
                    </span>
                    <span
                      className={
                        "text-action " + (s.active ? "danger" : "activate")
                      }
                      role="button"
                      tabIndex={0}
                      aria-disabled={actionId === s.id}
                      onClick={() => {
                        if (actionId !== s.id) toggleService(s);
                      }}
                    >
                      {s.active ? "Desativar" : "Ativar"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "hours" && (
        <div className="card">
          <h2>Horários de trabalho</h2>
          {hours.map((h) => (
            <div className="hour-row" key={h.weekday}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={h.active}
                  onChange={(e) =>
                    setHours(
                      hours.map((x) =>
                        x.weekday === h.weekday
                          ? { ...x, active: e.target.checked }
                          : x,
                      ),
                    )
                  }
                />
                {days[h.weekday]}
              </label>
              <input
                type="time"
                disabled={!h.active}
                value={h.start_time}
                onChange={(e) =>
                  setHours(
                    hours.map((x) =>
                      x.weekday === h.weekday
                        ? { ...x, start_time: e.target.value }
                        : x,
                    ),
                  )
                }
              />
              <span>até</span>
              <input
                type="time"
                disabled={!h.active}
                value={h.end_time}
                onChange={(e) =>
                  setHours(
                    hours.map((x) =>
                      x.weekday === h.weekday
                        ? { ...x, end_time: e.target.value }
                        : x,
                    ),
                  )
                }
              />
            </div>
          ))}
          <button className="btn save-btn" disabled={busy} onClick={saveHours}>
            {busy ? (
              <Loading text="Salvando…" inline />
            ) : (
              <>
                <Save size={18} /> Salvar horários
              </>
            )}
          </button>
        </div>
      )}

      {priceModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>Informar valor final</h2>
            <p>
              Este serviço possui faixa de preço. Informe o valor combinado com
              o cliente antes de concluir o atendimento.
            </p>
            <p>
              <strong>
                Faixa cadastrada: {money(priceModal.service_price_min)} a{" "}
                {money(priceModal.service_price_max)}
              </strong>
            </p>
            <label>
              Valor final do atendimento
              <input
                type="number"
                min={priceModal.service_price_min}
                max={priceModal.service_price_max}
                step="0.01"
                inputMode="decimal"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="Ex.: 150,00"
                autoFocus
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="text-action danger"
                onClick={() => {
                  setPriceModal(null);
                  setFinalPrice("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn small"
                disabled={actionId === priceModal.id}
                onClick={confirmRangeCompletion}
              >
                {actionId === priceModal.id ? (
                  <Loading text="Concluindo…" inline />
                ) : (
                  "Confirmar e concluir"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <h2>Histórico de atendimentos</h2>
          {!apps.length ? (
            <p>Nenhum atendimento encontrado.</p>
          ) : (
            apps.map((a) => {
              const shown =
                a.price !== null
                  ? money(a.price)
                  : a.service_price_type === "RANGE"
                    ? `${money(a.service_price_min)} a ${money(a.service_price_max)}`
                    : money(a.service_price);
              return (
                <div className="item" key={a.id}>
                  <div>
                    <b>{a.client_name}</b>
                    <p>
                      {a.service_name} ·{" "}
                      {new Date(
                        a.appointment_date + "T12:00:00",
                      ).toLocaleDateString("pt-BR")}{" "}
                      às {a.start_time.slice(0, 5)} · <strong>{shown}</strong>
                    </p>
                  </div>
                  <span className={"badge " + a.status.toLowerCase()}>
                    {statuses[a.status]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
