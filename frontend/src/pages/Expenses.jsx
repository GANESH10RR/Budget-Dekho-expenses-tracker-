import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { CATEGORIES, CategoryBadge, Empty, ErrorText, Field, Loading, Modal, MonthPicker, PageHeader, fmtDate, inr, thisMonth, today } from "../components/ui";
import { IS_DEMO } from "../config";

const blank = () => ({ title: "", amount: "", category: "Food", date: today(), note: "" });

export default function Expenses() {
  const [month, setMonth] = useState(thisMonth());
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState(""); // debounced search
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q]);

  const load = useCallback(() => {
    const params = {};
    if (month) params.month = month;
    if (category) params.category = category;
    if (q) params.q = q;
    params.page = page;
    params.page_size = 50;
    api.get("/expenses", { params }).then((r) => {
      setRows(r.data.items);
      setTotal(r.data.total);
    }).catch((e) => setError(errorMessage(e)));
  }, [month, category, q, page]);
  useEffect(load, [load]);

  const open = (row) => {
    setError("");
    setEditing(row || {});
    setForm(row ? { title: row.title, amount: row.amount, category: row.category, date: row.date, note: row.note || "" } : blank());
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = { ...form, amount: parseFloat(form.amount), note: form.note || null };
    try {
      if (editing.id) await api.put(`/expenses/${editing.id}`, body);
      else await api.post("/expenses", body);
      setEditing(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}" (${inr(row.amount)})?`)) return;
    await api.delete(`/expenses/${row.id}`);
    load();
  };

  const sum = (rows || []).reduce((s, r) => s + r.amount, 0);
  const filtered = !!(category || q);

  return (
    <>
      <PageHeader title="Expenses" subtitle={rows ? `Showing ${rows.length} of ${total} entries · ${inr(sum)} on this page` : ""}>
        {!IS_DEMO && <button className="btn-accent" onClick={() => open()}>Add expense</button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input !w-full sm:!w-64" type="search" placeholder="Search title or note" aria-label="Search expenses" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input !w-auto" aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <MonthPicker value={month} onChange={(value) => { setMonth(value); setPage(1); }} allowAll />
      </div>
      {!editing && <ErrorText>{error}</ErrorText>}

      <div className="card overflow-x-auto !p-0">
        {!rows ? <Loading /> : rows.length === 0 ? (
          <Empty title={filtered ? "No expenses match these filters" : "No expenses yet"} hint={filtered ? "Try a different search, category or month." : "Add what you spend to see where your money goes."} />
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-slate-100"><tr><th className="th">Date</th><th className="th">Title</th><th className="th">Category</th><th className="th text-right">Amount</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="td"><p className="font-semibold">{r.title}</p>{r.note && <p className="text-xs text-ink-mute">{r.note}</p>}</td>
                  <td className="td"><CategoryBadge category={r.category} /></td>
                  <td className="td text-right font-bold text-expense">{inr(r.amount)}</td>
                  {!IS_DEMO && <td className="td whitespace-nowrap text-right">
                    <button className="btn-ghost !px-3 !py-1" onClick={() => open(r)}>Edit</button>
                    <button className="btn-danger !px-3 !py-1" onClick={() => remove(r)}>Delete</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Expense pages">
          <button className="btn-ghost" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span className="text-sm text-ink-mute">Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn-ghost" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((value) => value + 1)}>Next</button>
        </nav>
      )}

      {editing && (
        <Modal title={editing.id ? "Edit expense" : "Add expense"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorText>{error}</ErrorText>
            <Field label="Title"><input className="input" required maxLength={80} placeholder="Lunch, metro card, textbook…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><input className="input" type="number" required min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Date"><input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            </div>
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Note (optional)"><input className="input" maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary">Save expense</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
