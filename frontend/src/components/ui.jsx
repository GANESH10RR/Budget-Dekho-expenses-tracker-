import { useEffect } from "react";

export const CATEGORIES = ["Food", "Travel", "Rent", "Shopping", "Recharge", "Healthcare", "Education", "Entertainment", "Others"];
export const CAT_COLORS = {
  Food: "#F5A524", Travel: "#3B82F6", Rent: "#6366F1", Shopping: "#EC4899", Recharge: "#14B8A6",
  Healthcare: "#EF4444", Education: "#8B5CF6", Entertainment: "#F97316", Others: "#94A3B8", Income: "#138A72",
};

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const pad = (n) => String(n).padStart(2, "0");
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const thisMonth = () => today().slice(0, 7);
export const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const monthName = (m) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-mute">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function MonthPicker({ value, onChange, allowAll = false }) {
  return (
    <div className="flex items-center gap-2">
      <input type="month" aria-label="Month" className="input !w-auto" value={value} onChange={(e) => onChange(e.target.value)} />
      {allowAll && value && <button className="btn-ghost" onClick={() => onChange("")}>All time</button>}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-2xl leading-none text-ink-mute hover:text-ink">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, hint, children }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mute">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export const ErrorText = ({ children }) =>
  children ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-expense">{children}</p> : null;

export const Loading = () => <p className="py-10 text-center text-sm text-ink-mute">Loading…</p>;

export function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[category] }} />
      {category}
    </span>
  );
}

export function ProgressBar({ percent, status }) {
  const color = status === "exceeded" ? "bg-expense" : status === "warning" ? "bg-saffron" : "bg-income";
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

const TONES = { good: "border-income/30 bg-income/5", warn: "border-saffron/50 bg-saffron/10", info: "border-slate-200 bg-white" };
export const InsightList = ({ items }) => (
  <ul className="space-y-2">
    {items.map((i, idx) => (
      <li key={idx} className={`rounded-lg border px-3 py-2 text-sm ${TONES[i.type] || TONES.info}`}>{i.message}</li>
    ))}
  </ul>
);
