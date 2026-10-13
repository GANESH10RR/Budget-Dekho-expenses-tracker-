import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { CATEGORIES, CategoryBadge, Empty, ErrorText, Field, Loading, MonthPicker, PageHeader, ProgressBar, inr, monthName, thisMonth } from "../components/ui";
import { IS_DEMO } from "../config";

export default function Budgets() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ category: "Food", amount: "" });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/budgets", { params: { month } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [month]);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.put("/budgets", { category: form.category, amount: parseFloat(form.amount), month });
      setForm({ ...form, amount: "" });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Remove the ${b.category} budget?`)) return;
    await api.delete(`/budgets/${b.id}`);
    load();
  };

  const alerts = (data?.budgets || []).filter((b) => b.status !== "ok");

  return (
    <>
      <PageHeader title="Budgets" subtitle={`Monthly limits for ${monthName(month)}`}>
        <MonthPicker value={month} onChange={(m) => m && setMonth(m)} />
      </PageHeader>

      {!IS_DEMO && <form onSubmit={save} className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48"><Field label="Category">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field></div>
        <div className="w-full sm:w-48"><Field label="Monthly budget (₹)">
          <input className="input" type="number" required min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field></div>
        <button className="btn-primary">Set budget</button>
        <p className="text-xs text-ink-mute">Setting a budget for a category that already has one updates it.</p>
      </form>}
      <ErrorText>{error}</ErrorText>

      {alerts.length > 0 && (
        <div className="mb-4 space-y-2" aria-label="Budget alerts">
          {alerts.map((b) => (
            <div key={b.id} className={`rounded-lg border px-4 py-2 text-sm font-medium ${b.status === "exceeded" ? "border-expense/40 bg-red-50 text-expense" : "border-saffron/60 bg-saffron/10"}`}>{b.alert}</div>
          ))}
        </div>
      )}

      {!data ? <Loading /> : data.budgets.length === 0 ? (
        <div className="card"><Empty title="No budgets for this month" hint={IS_DEMO ? "Sample budgets appear for months with demo data." : "Pick a category above and set a limit. You'll get alerts at 80% and 100%."} /></div>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-mute">Spent {inr(data.total_spent)} of {inr(data.total_budget)} budgeted</p>
          <div className="grid gap-4 md:grid-cols-2">
            {data.budgets.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between">
                  <CategoryBadge category={b.category} />
                  {!IS_DEMO && <button className="text-xs font-semibold text-ink-mute hover:text-expense" onClick={() => remove(b)}>Remove</button>}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-display text-2xl font-bold">{inr(b.spent)}</p>
                  <p className="text-sm text-ink-mute">of {inr(b.amount)}</p>
                </div>
                <div className="mt-2"><ProgressBar percent={b.percent} status={b.status} /></div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-ink-mute">{b.percent.toFixed(0)}% used</span>
                  <span className={b.remaining < 0 ? "font-semibold text-expense" : "font-semibold text-income"}>
                    {b.remaining < 0 ? `${inr(-b.remaining)} over` : `${inr(b.remaining)} left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
