import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
export default function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    { login } = useAuth(),
    nav = useNavigate();
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      login(r.data);
      nav(r.data.user.role === "CLIENT" ? "/cliente" : "/cabeleireira");
    } catch (e) {
      setErr(e.response?.data?.message || "Erro ao entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="panel">
        <img src="/logo_salao.png" className="small-logo" />
        <h1>Bem-vindo(a)</h1>
        <p>Entre para continuar.</p>
        {err && <div className="alert">{err}</div>}
        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn full auth-submit" disabled={busy}>
            {busy ? <Loading text="Entrando…" inline /> : "Entrar"}
          </button>
        </form>
        <p className="center auth-footer-link">
          <Link to="/esqueci-senha">Esqueci minha senha</Link>
        </p>
        <p className="center">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
