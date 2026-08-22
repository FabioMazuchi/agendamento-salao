import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import Loading from "../components/Loading";
export default function ResetPassword() {
  const [params] = useSearchParams(),
    token = params.get("token") || "",
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await api.post("/auth/reset-password", { token, password });
      setMessage(r.data.message);
      setPassword("");
      setConfirm("");
    } catch (e) {
      setErr(
        e.response?.data?.message || "Não foi possível redefinir a senha.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <div className="auth">
        <div className="panel">
          <div className="alert">Link de redefinição inválido.</div>
          <Link className="btn" to="/esqueci-senha">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  return (
    <div className="auth">
      <div className="panel register-panel">
        <h1>Nova senha</h1>
        <p>Escolha uma nova senha para sua conta.</p>
        {message && <div className="success">{message}</div>}
        {err && <div className="alert">{err}</div>}
        {!message && (
          <form className="auth-form" onSubmit={submit}>
            <label>
              Nova senha
              <input
                type="password"
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirmar senha
              <input
                type="password"
                minLength="6"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="btn full" disabled={busy}>
              {busy ? (
                <Loading text="Redefinindo…" inline />
              ) : (
                "Redefinir senha"
              )}
            </button>
          </form>
        )}
        {message && (
          <p className="center auth-footer-link">
            <Link className="btn" to="/login">
              Ir para o login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
