import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, CalendarDays, LayoutDashboard } from "lucide-react";
import Loading from "./Loading";
export default function Layout({ children }) {
  const { user, logout, loading } = useAuth(),
    nav = useNavigate();
  return (
    <>
      <header className="top">
        <Link to="/" className="brand">
          <img src="/logo_salao.png" />
          <span>
            Salão de Beleza
            <br />
            <b>Mãos Ungidas</b>
          </span>
        </Link>
        <nav>
          {loading ? (
            <span className="header-loading">
              <span className="mini-spinner" /> Carregando…
            </span>
          ) : user ? (
            <>
              <span className="user-name">Olá, {user.name}</span>
              <Link to={user.role === "CLIENT" ? "/cliente" : "/cabeleireira"}>
                {user.role === "CLIENT" ? (
                  <CalendarDays size={18} />
                ) : (
                  <LayoutDashboard size={18} />
                )}{" "}
                Painel
              </Link>
              <button
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                <LogOut size={18} /> Sair
              </button>
            </>
          ) : (
            <Link className="header-login" to="/login">
              Entrar
            </Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer>© {new Date().getFullYear()} Salão de Beleza Mãos Ungidas</footer>
    </>
  );
}
