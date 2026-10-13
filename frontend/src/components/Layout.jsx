import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IS_DEMO } from "../config";

const NAV = [
  ["/", "Dashboard"], ["/income", "Income"], ["/expenses", "Expenses"],
  ["/budgets", "Budgets"], ["/analytics", "Analytics"], ["/reports", "Reports"],
];

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-saffron text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink p-5 md:flex">
        <p className="font-display text-2xl font-bold text-white">Budget<span className="text-saffron">Dekho</span></p>
        <nav className="mt-8 flex-1 space-y-1">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={linkClass}>{label}</NavLink>)}
        </nav>
        <div className="border-t border-white/15 pt-4">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
          <button onClick={signOut} className="mt-3 text-sm font-semibold text-saffron hover:underline">Log out</button>
        </div>
      </aside>

      <header className="bg-ink md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-xl font-bold text-white">Budget<span className="text-saffron">Dekho</span></p>
          <button onClick={signOut} className="text-sm font-semibold text-saffron">Log out</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={(s) => linkClass(s) + " whitespace-nowrap"}>{label}</NavLink>)}
        </nav>
      </header>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {IS_DEMO && <p className="mb-4 rounded-lg border border-saffron/50 bg-saffron/10 p-3 text-sm font-medium">Public demo with sample data only. Changes are disabled; do not enter personal financial information.</p>}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
