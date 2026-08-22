import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";
import Loading from "../components/Loading";
import { CircleAlert, MailCheck } from "lucide-react";

export default function ConfirmEmail() {
  const [q] = useSearchParams();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(null);

  const token = q.get("token");

  useEffect(() => {
    let active = true;

    if (!token) {
      setMsg("Token de confirmação não informado.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    // O React StrictMode executa efeitos duas vezes em desenvolvimento.
    // Reutilizamos a mesma Promise para evitar confirmar o mesmo token duas vezes.
    if (!requestRef.current) {
      requestRef.current = api.get("/auth/confirm-email", {
        params: { token },
        timeout: 15000,
      });
    }

    requestRef.current
      .then((response) => {
        if (active)
          setMsg(response.data.message || "E-mail verificado com sucesso.");
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error.code === "ECONNABORTED"
            ? "Não foi possível confirmar o e-mail. O servidor demorou para responder."
            : error.response?.data?.message ||
              "Não foi possível confirmar o e-mail.";
        setMsg(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const success =
    msg.toLowerCase().includes("confirmado") ||
    msg.toLowerCase().includes("verificado");

  return (
    <div className="auth">
      <div className="panel center confirm-panel">
        <img
          src="/logo_salao.png"
          className="small-logo"
          alt="Salão de Beleza Mãos Ungidas"
        />
        {loading ? (
          <Loading text="Confirmando e-mail…" />
        ) : (
          <>
            <div
              className={`confirm-icon ${success ? "success-icon" : "error-icon"}`}
            >
              {success ? <MailCheck size={32} /> : <CircleAlert size={32} />}
            </div>
            <h1>{success ? "E-mail verificado com sucesso" : msg}</h1>
            <p>
              {success
                ? "Seu cadastro foi confirmado. Agora você já pode entrar no sistema."
                : "Confira o link recebido por e-mail e tente novamente."}
            </p>
            <Link className="btn small" to="/login">
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
