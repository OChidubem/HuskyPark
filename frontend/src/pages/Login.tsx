import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Campus Intelligence</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Find the best lot before the search becomes the commute.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          HuskyPark gives St. Cloud State drivers a more composed parking experience with live lot
          scoring, permit context, and campus event awareness in one refined interface.
        </p>
        <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
          {[
            ["24+", "Tracked lots"],
            ["60s", "Live refresh cycle"],
            ["AI", "Recommendation support"],
          ].map(([value, label]) => (
            <div key={label} className="surface-card">
              <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
              <p className="mt-2 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-card">
        <div className="mb-8">
          <p className="eyebrow">Welcome Back</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Sign in to HuskyPark
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Continue to your live dashboard and parking recommendations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="input-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@stcloudstate.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="button-primary w-full justify-center"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-[var(--accent-strong)] hover:underline">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
