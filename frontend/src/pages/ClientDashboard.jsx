import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { CalendarPlus, XCircle, UserRound } from "lucide-react";
import Loading from "../components/Loading";
const status = {
  BOOKED: "Agendado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
export default function ClientDashboard() {
  const [a, setA] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(null),
    [err, setErr] = useState("");
  async function load() {
    try {
      const r = await api.get("/appointments/mine");
      setA(r.data);
    } catch (e) {
      setErr(
        e.response?.data?.message ||
          "Não foi possível carregar seus agendamentos.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function cancel(id) {
    if (!confirm("Cancelar este agendamento?")) return;
    setBusy(id);
    setErr("");
    try {
      await api.patch("/appointments/" + id + "/cancel");
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Não foi possível cancelar.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Área do cliente</span>
          <h1>Olá, seu próximo cuidado está aqui.</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="btn" to="/perfil">
            <UserRound size={17} /> Meus dados
          </Link>
          <Link className="btn" to="/agendar">
            <CalendarPlus size={18} /> Novo agendamento
          </Link>
        </div>
      </div>
      {err && <div className="alert">{err}</div>}
      <div className="card">
        <h2>Meus agendamentos</h2>
        {loading ? (
          <Loading text="Carregando agendamentos…" />
        ) : !a.length ? (
          <p>Nenhum agendamento encontrado.</p>
        ) : (
          <div className="list">
            {a.map((x) => (
              <div className="item" key={x.id}>
                <div>
                  <b>{x.service_name}</b>
                  <p>
                    {x.hairdresser_name} ·{" "}
                    {new Date(
                      x.appointment_date + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}{" "}
                    às {x.start_time.slice(0, 5)}
                  </p>
                </div>
                <span className={"badge " + x.status.toLowerCase()}>
                  {status[x.status]}
                </span>
                {x.status === "BOOKED" && (
                  <button
                    className="icon-btn"
                    disabled={busy === x.id}
                    onClick={() => cancel(x.id)}
                    title="Cancelar"
                  >
                    {busy === x.id ? (
                      <span className="mini-spinner" />
                    ) : (
                      <XCircle />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
