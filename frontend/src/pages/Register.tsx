import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { User } from "../types";

const ROLE_OPTIONS: User["role"][] = ["student", "resident", "employee", "visitor"];

export default function Register() {
  const navigate = useNavigate();
  const { register, signIn } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({ full_name: fullName, email, password, role });
      await signIn(email, password);
      navigate("/dashboard");
    } catch {
      setError("We could not create your account. Please review your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Create Account</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Start your day with a calmer parking plan.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          HuskyPark brings prediction, permits, and live campus context into one polished
          dashboard for students, residents, employees, and visitors.
        </p>
        <div className="mt-8 flex max-w-lg items-start gap-4 rounded-[28px] border border-white/70 bg-white/65 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="rounded-2xl bg-white/80 p-3">
            <ShieldCheck className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Designed for clarity</h2>
            <p className="mt-1 text-sm text-slate-600">
              Minimal friction, readable states, and reliable access to your permits and lot
              recommendations.
            </p>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="mb-8">
          <p className="eyebrow">HuskyPark</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your campus email to unlock recommendations and permit management.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="input-label">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="Jordan Avery"
              required
            />
          </div>

          <div>
            <label htmlFor="registerEmail" className="input-label">
              Campus email
            </label>
            <input
              id="registerEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@stcloudstate.edu"
              required
            />
          </div>

          <div>
            <label htmlFor="registerPassword" className="input-label">
              Password
            </label>
            <input
              id="registerPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="input-label">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
              className="input-field"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !fullName || !email || !password}
            className="button-primary w-full justify-center"
          >
            {loading ? "Creating account…" : "Create account"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--accent-strong)] hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
