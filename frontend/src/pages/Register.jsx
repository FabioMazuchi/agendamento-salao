import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Phone, UserPlus, UserRound } from "lucide-react";
import { api } from "../services/api";
import Loading from "../components/Loading";

function maskPhone(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11)
    return d.length <= 10
      ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return value;
}

const emptyForm = { name: "", email: "", phone: "", password: "" };

export default function Register() {
  const [f, setF] = useState(emptyForm),
    [msg, setMsg] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.post("/auth/register", f);
      setMsg(r.data.message);
      setF(emptyForm);
    } catch (e) {
      setErr(e.response?.data?.message || "Erro ao cadastrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="panel register-panel">
        <img src="/logo_salao.png" className="small-logo" />
        <h1>Criar conta</h1>
        <p>Seu e-mail será confirmado antes do primeiro acesso.</p>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="alert">{err}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>
            <span className="field-label">
              <UserRound size={16} /> Nome
            </span>
            <input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              maxLength="120"
              autoComplete="name"
              required
            />
          </label>
          <label>
            <span className="field-label">
              <Mail size={16} /> E-mail
            </span>
            <input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              maxLength="180"
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span className="field-label">
              <Phone size={16} /> Telefone
            </span>
            <input
              inputMode="tel"
              autoComplete="tel"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: maskPhone(e.target.value) })}
              placeholder="(11) 99999-9999"
              maxLength="15"
            />
          </label>
          <label>
            <span className="field-label">
              <Lock size={16} /> Senha
            </span>
            <input
              type="password"
              minLength="8"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="btn full auth-submit" disabled={busy}>
            {busy ? (
              <Loading text="Cadastrando…" inline />
            ) : (
              <>
                <UserPlus size={17} /> Cadastrar
              </>
            )}
          </button>
        </form>
        <p className="center auth-footer-link">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}
