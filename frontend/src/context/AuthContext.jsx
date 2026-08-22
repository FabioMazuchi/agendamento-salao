import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
const C = createContext(null);
export const useAuth = () => useContext(C);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("salao_user") || "null"),
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("salao_token"))
      api
        .get("/users/me")
        .then((r) => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  function login(data) {
    localStorage.setItem("salao_token", data.token);
    localStorage.setItem("salao_user", JSON.stringify(data.user));
    setUser(data.user);
  }
  function logout() {
    localStorage.removeItem("salao_token");
    localStorage.removeItem("salao_user");
    setUser(null);
  }
  function updateUser(u) {
    localStorage.setItem("salao_user", JSON.stringify(u));
    setUser(u);
  }
  return (
    <C.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </C.Provider>
  );
}
