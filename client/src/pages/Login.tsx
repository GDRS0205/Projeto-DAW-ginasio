// client/src/pages/Login.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { setAuth } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const next = location.state?.from?.pathname || "/workouts";

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"login" | "reg" | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pass) {
      showError("Preenche email e password.");
      return;
    }
    try {
      setBusy("login");
      const data = await login(email, pass);
      // data: { token, email }
      setAuth({ token: data.token, email: data.email });
      showSuccess("Sessão iniciada!");
      navigate(next, { replace: true });
    } catch (err: any) {
      showError(err?.response?.data?.error ?? "Credenciais inválidas.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRegister() {
    if (!email || !pass) {
      showError("Preenche email e password para criar conta.");
      return;
    }
    try {
      setBusy("reg");
      const r = await register(email, pass);
      if (r.ok) {
        showSuccess(r.message || "Conta criada! Agora podes entrar.");
        showInfo("Agora inicia sessão com as credenciais que acabaste de criar.");
      } else {
        showError(r.error ?? "Não foi possível criar a conta.");
      }
    } catch (err: any) {
      showError(err?.response?.data?.error ?? "Erro ao criar conta.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2>Entrar</h2>

      <form className="form" onSubmit={handleLogin} noValidate>
        <label>
          Email
          <input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              required
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="ghost"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>

        <div className="actions" style={{ gap: 8 }}>
          <button
            type="submit"
            disabled={busy !== null}
            className={busy === "login" ? "primary loading" : "primary"}
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={handleRegister}
            disabled={busy !== null}
            className={busy === "reg" ? "secondary loading" : "secondary"}
          >
            Criar conta
          </button>
        </div>

        <small className="muted">
          Dica: depois de criar conta, usa o mesmo email e password para iniciar sessão.
        </small>
      </form>
    </section>
  );
}
        