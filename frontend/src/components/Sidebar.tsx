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
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard",  label: "Dashboard",      icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: "/recommend",  label: "AI Recommend",   icon: <Sparkles className="h-5 w-5" /> },
  { to: "/permits",    label: "My Permits",     icon: <CreditCard className="h-5 w-5" /> },
  { to: "/analytics",  label: "Analytics",      icon: <BarChart2 className="h-5 w-5" /> },
  { to: "/admin",      label: "Admin Panel",    icon: <Settings className="h-5 w-5" />, adminOnly: true },
];

export default function Sidebar() {
  const { role, signOut } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav
      className="flex h-full flex-col bg-[#1a2744] text-white"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="px-5 py-5">
        <span className="text-xl font-bold tracking-tight text-white">
          Husky<span className="text-yellow-400">Park</span>
        </span>
        <p className="mt-0.5 text-xs text-blue-300">SCSU Parking Predictor</p>
      </div>

      {/* Navigation links */}
      <ul className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
                ${
                  isActive
                    ? "border-l-4 border-yellow-400 bg-white/10 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Sign out */}
      <div className="border-t border-white/10 px-3 py-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
            text-blue-200 transition hover:bg-white/10 hover:text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
