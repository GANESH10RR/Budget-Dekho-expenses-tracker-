import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import { CAT_COLORS, Empty, ErrorText, InsightList, Loading, MonthPicker, PageHeader, fmtDate, inr, monthName, thisMonth } from "../components/ui";

const Stat = ({ label, value, tone, note }) => (
  <div className="card">
    <p className="text-sm text-ink-mute">{label}</p>
    <p className={`mt-1 font-display text-2xl font-bold ${tone || ""}`}>{value}</p>
    {note && <p className="mt-1 text-xs text-ink-mute">{note}</p>}
  </div>
);

export default function Dashboard() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([
      api.get("/dashboard", { params: { month } }),
      api.get("/budgets", { params: { month } }),
      api.get("/insights", { params: { month } }),
    ])
      .then(([d, b, i]) => { setData(d.data); setBudgets(b.data.budgets); setInsights(i.data.insights); })
      .catch((e) => setError(errorMessage(e)));
  }, [month]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const spentPct = data.total_income > 0 ? Math.min(100, (data.total_expense / data.total_income) * 100) : data.total_expense > 0 ? 100 : 0;
  const alerts = budgets.filter((b) => b.status !== "ok");

  return (
    <>
      <PageHeader title="Dashboard" subtitle={monthName(month)}>
        <MonthPicker value={month} onChange={(m) => m && setMonth(m)} />
      </PageHeader>

      <section className="rounded-2xl bg-ink p-6 text-white">
        <p className="text-sm text-white/70">Current balance (all time)</p>
        <p className="mt-1 font-display text-4xl font-bold sm:text-5xl">{inr(data.balance)}</p>
        <div className="mt-6">
          <div className="flex h-3 overflow-hidden rounded-full bg-income" title="Spent vs. kept">
            <div className="bg-saffron" style={{ width: `${spentPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-white/70">
            <span>Spent {spentPct.toFixed(0)}% of this month's income</span>
            <span>Kept {(100 - spentPct).toFixed(0)}%</span>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Income this month" value={inr(data.total_income)} tone="text-income" />
        <Stat label="Expenses this month" value={inr(data.total_expense)} tone="text-expense" />
        <Stat label="Savings percentage" value={`${data.savings_percentage}%`} note={`${inr(data.savings)} saved`} tone={data.savings < 0 ? "text-expense" : ""} />
      </section>

      {alerts.length > 0 && (
        <section className="mt-4 space-y-2" aria-label="Budget alerts">
          {alerts.map((b) => (
            <div key={b.id} className={`rounded-lg border px-4 py-2 text-sm font-medium ${b.status === "exceeded" ? "border-expense/40 bg-red-50 text-expense" : "border-saffron/60 bg-saffron/10"}`}>
              {b.alert}
            </div>
          ))}
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent transactions</h2>
            <Link to="/expenses" className="text-sm font-semibold underline">View expenses</Link>
          </div>
          {data.recent.length === 0 ? (
            <Empty title="Nothing here yet" hint="Add your first income or expense to get started.">
              <Link to="/expenses" className="btn-primary">Add an expense</Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent.map((t) => (
                <li key={t.key} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: CAT_COLORS[t.category] }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-ink-mute">{t.category} · {fmtDate(t.date)}</p>
                    </div>
                  </div>
                  <p className={`shrink-0 text-sm font-bold ${t.type === "income" ? "text-income" : "text-expense"}`}>
                    {t.type === "income" ? "+" : "−"}{inr(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Insights</h2>
            <Link to="/analytics" className="text-sm font-semibold underline">More</Link>
          </div>
          <InsightList items={insights.slice(0, 4)} />
        </section>
      </div>
    </>
  );
}
