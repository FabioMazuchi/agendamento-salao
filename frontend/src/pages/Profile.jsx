import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
const mask = (v) => {
  const d = String(v).replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};
export default function Profile() {
  const { user, updateUser, logout } = useAuth(),
    nav = useNavigate();
  const [name, setName] = useState(user?.name || ""),
    [phone, setPhone] = useState(mask(user?.phone || "")),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [err, setErr] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMessage("");
    try {
      const r = await api.patch("/users/me", { name: name.trim(), phone });
      updateUser(r.data.user);
      setMessage(r.data.message);
    } catch (e) {
      setErr(e.response?.data?.message || "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !confirm(
        "Deseja desativar sua conta? Seus dados serão preservados para que você possa voltar no futuro.",
      )
    )
      return;
    if (!password) {
      setErr("Informe sua senha para confirmar a exclusão.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await api.delete("/users/me", { data: { password } });
      alert(r.data.message);
      logout();
      nav("/");
    } catch (e) {
      setErr(e.response?.data?.message || "Não foi possível excluir a conta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Minha conta</span>
          <h1>Meus dados</h1>
        </div>
      </div>
      {message && <div className="success">{message}</div>}
      {err && <div className="alert">{err}</div>}
      <div className="card profile-card">
        <form className="auth-form" onSubmit={save}>
          <label>
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            E-mail
            <input value={user?.email || ""} disabled />
          </label>
          <label>
            Telefone
            <input
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(mask(e.target.value))}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? <Loading text="Salvando…" inline /> : "Salvar alterações"}
          </button>
        </form>
      </div>
      <div className="card danger-zone">
        <h2>Excluir conta</h2>
        <p>
          A conta será desativada, mas seus dados e histórico permanecerão
          armazenados para uma possível reativação.
        </p>
        <label>
          Confirme sua senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="btn danger-btn" disabled={busy} onClick={remove}>
          {busy ? (
            <Loading text="Desativando…" inline />
          ) : (
            "Excluir minha conta"
          )}
        </button>
      </div>
    </div>
  );
}
