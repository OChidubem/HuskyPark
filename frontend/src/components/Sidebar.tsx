import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/recommend", label: "AI Recommend", icon: <Sparkles className="h-5 w-5" /> },
  { to: "/permits", label: "My Permits", icon: <CreditCard className="h-5 w-5" /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart2 className="h-5 w-5" /> },
  { to: "/admin", label: "Admin Panel", icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

export default function Sidebar() {
  const { role, signOut } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav
      className="border-b border-[#10284f] bg-[radial-gradient(circle_at_top,_rgba(91,134,190,0.22),_transparent_22%),linear-gradient(180deg,_#0c264e_0%,_#12325f_45%,_#173c70_100%)] px-4 py-4 text-white shadow-[8px_0_40px_rgba(12,38,78,0.22)] lg:flex lg:h-full lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6"
      aria-label="Main navigation"
    >
      <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
        <div>
          <span className="text-2xl font-semibold tracking-tight text-white">
            Husky<span className="text-[var(--accent-strong)]">Park</span>
          </span>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Parking Predictor
          </p>
        </div>

        <button onClick={signOut} className="button-secondary px-3 py-2 lg:hidden">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:overflow-visible">
        {items.map((item) => (
          <li key={item.to} className="flex-shrink-0">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[linear-gradient(180deg,_#ffffff_0%,_#eef6ff_100%)] text-[var(--accent-deep)] font-bold shadow-[0_18px_30px_-20px_rgba(255,255,255,0.6)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden border-t border-white/15 pt-4 lg:block">
        <button
          onClick={signOut}
          className="inline-flex w-full justify-center rounded-full border border-white/20 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/16"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
