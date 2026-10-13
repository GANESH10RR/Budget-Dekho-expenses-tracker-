import { useEffect, useState } from "react";
import api, { download, errorMessage } from "../api";
import { CategoryBadge, ErrorText, Loading, MonthPicker, PageHeader, inr, monthName, thisMonth } from "../components/ui";

export default function Reports() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api.get("/reports/summary", { params: { month } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [month]);

  const get = (url, params, name) => download(url, params, name).catch((e) => setError(errorMessage(e)));

  return (
    <>
      <PageHeader title="Reports" subtitle={`Financial summary for ${monthName(month)}`}>
        <MonthPicker value={month} onChange={(m) => m && setMonth(m)} />
      </PageHeader>
      <ErrorText>{error}</ErrorText>

      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn-accent" onClick={() => get("/reports/monthly.csv", { month }, `budgetdekho-report-${month}.csv`)}>Download monthly report</button>
        <button className="btn-ghost" onClick={() => get("/reports/expenses.csv", { month }, `budgetdekho-expenses-${month}.csv`)}>Download this month's expenses (CSV)</button>
        <button className="btn-ghost" onClick={() => get("/reports/expenses.csv", {}, "budgetdekho-expenses-all.csv")}>Download all expenses (CSV)</button>
      </div>

      {!data ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Summary</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              {[
                ["Total income", inr(data.total_income), "text-income"],
                ["Total expenses", inr(data.total_expense), "text-expense"],
                ["Savings", inr(data.savings), data.savings < 0 ? "text-expense" : ""],
                ["Savings rate", `${data.savings_percentage}%`, ""],
              ].map(([k, v, c]) => (
                <div key={k} className="flex justify-between py-2.5"><dt className="text-ink-mute">{k}</dt><dd className={`font-bold ${c}`}>{v}</dd></div>
              ))}
            </dl>
          </section>

          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Spending by category</h2>
            {data.categories.length === 0 ? <p className="text-sm text-ink-mute">No expenses recorded this month.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.categories.map((c) => (
                  <li key={c.category} className="flex items-center justify-between py-2.5">
                    <CategoryBadge category={c.category} />
                    <span><b>{inr(c.amount)}</b> <span className="text-ink-mute">· {c.percent.toFixed(0)}%</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card lg:col-span-2">
            <h2 className="mb-3 text-lg font-bold">Budget performance</h2>
            {data.budgets.length === 0 ? <p className="text-sm text-ink-mute">No budgets set for this month.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead><tr><th className="th">Category</th><th className="th text-right">Budget</th><th className="th text-right">Spent</th><th className="th text-right">Remaining</th><th className="th text-right">Used</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.budgets.map((b) => (
                      <tr key={b.id}>
                        <td className="td"><CategoryBadge category={b.category} /></td>
                        <td className="td text-right">{inr(b.amount)}</td>
                        <td className="td text-right">{inr(b.spent)}</td>
                        <td className={`td text-right font-semibold ${b.remaining < 0 ? "text-expense" : ""}`}>{inr(b.remaining)}</td>
                        <td className="td text-right">{b.percent.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
