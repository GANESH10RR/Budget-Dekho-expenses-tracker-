import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { errorMessage } from "../api";
import { CAT_COLORS, CategoryBadge, Empty, ErrorText, InsightList, Loading, MonthPicker, PageHeader, inr, monthName, thisMonth } from "../components/ui";

const short = (n) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k` : n);
const tip = (v) => inr(v);

const Chart = ({ title, children, height = 260 }) => (
  <section className="card">
    <h2 className="mb-3 text-lg font-bold">{title}</h2>
    <div style={{ height }}>{children}</div>
  </section>
);

export default function Analytics() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [ins, setIns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([api.get("/analytics", { params: { month } }), api.get("/insights", { params: { month } })])
      .then(([a, i]) => { setData(a.data); setIns(i.data); })
      .catch((e) => setError(errorMessage(e)));
  }, [month]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data || !ins) return <Loading />;

  return (
    <>
      <PageHeader title="Analytics" subtitle={`Spending patterns for ${monthName(month)}`}>
        <MonthPicker value={month} onChange={(m) => m && setMonth(m)} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Spending by category">
          {data.breakdown.length === 0 ? <Empty title="No expenses this month" /> : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.breakdown} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {data.breakdown.map((d) => <Cell key={d.category} fill={CAT_COLORS[d.category]} />)}
                </Pie>
                <Tooltip formatter={tip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Chart>

        <Chart title="Monthly expense trend">
          <ResponsiveContainer>
            <BarChart data={data.trend}>
              <CartesianGrid vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tickLine={false} fontSize={12} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} fontSize={12} width={40} />
              <Tooltip formatter={tip} />
              <Bar dataKey="expense" name="Expenses" fill="#D6455D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Monthly savings trend">
          <ResponsiveContainer>
            <BarChart data={data.trend}>
              <CartesianGrid vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tickLine={false} fontSize={12} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} fontSize={12} width={40} />
              <Tooltip formatter={tip} />
              <Bar dataKey="savings" name="Savings" radius={[4, 4, 0, 0]}>
                {data.trend.map((d) => <Cell key={d.month} fill={d.savings >= 0 ? "#138A72" : "#D6455D"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Top spending categories</h2>
          {data.top_categories.length === 0 ? <Empty title="No expenses this month" /> : (
            <ul className="space-y-4">
              {data.top_categories.map((c) => (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-sm">
                    <CategoryBadge category={c.category} />
                    <span className="font-semibold">{inr(c.amount)} · {c.percent.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${c.percent}%`, background: CAT_COLORS[c.category] }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Financial insights</h2>
          <InsightList items={ins.insights} />
        </section>
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Ways to spend less</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">{ins.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          {ins.category_share.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-bold">Share of spending</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {ins.category_share.map((c) => (
                  <li key={c.category} className="flex justify-between"><CategoryBadge category={c.category} /><span className="text-ink-mute">{c.percent.toFixed(0)}%</span></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
