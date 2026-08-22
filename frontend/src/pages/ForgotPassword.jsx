import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import Loading from "../components/Loading";
export default function ForgotPassword() {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMessage("");
    try {
      const r = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setMessage(r.data.message);
      setEmail("");
    } catch (e) {
      setErr(
        e.response?.data?.message ||
          "Não foi possível solicitar a redefinição.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="panel register-panel">
        <h1>Recuperar senha</h1>
        <p>Informe seu e-mail para receber um link de redefinição.</p>
        {message && <div className="success">{message}</div>}
        {err && <div className="alert">{err}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <button className="btn full" disabled={busy}>
            {busy ? <Loading text="Enviando…" inline /> : "Enviar link"}
          </button>
        </form>
        <p className="center auth-footer-link">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}
