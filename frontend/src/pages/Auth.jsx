import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api";
import { ErrorText, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { IS_DEMO } from "../config";

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (IS_DEMO && !isLogin) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <p className="font-display text-3xl font-bold">Budget<span className="text-saffron">Dekho</span></p>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Know where every rupee goes.</h2>
          <p className="mt-4 max-w-sm text-white/70">Track income and expenses, set monthly budgets, and get plain-language tips to save more.</p>
        </div>
        <p className="text-sm text-white/50">Built for students and working professionals.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="text-3xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-ink-mute">{IS_DEMO ? "Read-only public demo using sample data. Do not enter personal financial information." : isLogin ? "Log in to see your dashboard." : "It takes less than a minute."}</p>
          {IS_DEMO && <p className="rounded-lg bg-saffron/15 p-3 text-sm">Demo login: <strong>demo@budgetdekho.in</strong> / <strong>demo1234</strong></p>}
          <ErrorText>{error}</ErrorText>
          {!isLogin && <Field label="Name"><input className="input" required minLength={2} value={form.name} onChange={set("name")} autoComplete="name" /></Field>}
          <Field label="Email"><input className="input" type="email" required value={form.email} onChange={set("email")} autoComplete="email" /></Field>
          <Field label="Password"><input className="input" type="password" required minLength={isLogin ? 1 : 8} maxLength={64} value={form.password} onChange={set("password")} autoComplete={isLogin ? "current-password" : "new-password"} /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}</button>
          <p className="text-center text-sm text-ink-mute">
            {IS_DEMO ? null : <>{isLogin ? "New here? " : "Already have an account? "}
              <Link className="font-semibold text-ink underline" to={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Log in"}</Link>
            </>}
          </p>
        </form>
      </section>
    </div>
  );
}
