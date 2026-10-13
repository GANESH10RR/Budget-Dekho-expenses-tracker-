import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { Empty, ErrorText, Field, Loading, MonthPicker, Modal, PageHeader, fmtDate, inr, thisMonth, today } from "../components/ui";
import { IS_DEMO } from "../config";

const blank = () => ({ source: "", amount: "", date: today(), note: "" });

export default function Income() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [form, setForm] = useState(blank());
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/income", { params: { ...(month ? { month } : {}), page, page_size: 50 } }).then((r) => {
      setRows(r.data.items);
      setTotal(r.data.total);
    }).catch((e) => setError(errorMessage(e)));
  }, [month, page]);
  useEffect(load, [load]);

  const open = (row) => {
    setError("");
    setEditing(row || {});
    setForm(row ? { source: row.source, amount: row.amount, date: row.date, note: row.note || "" } : blank());
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = { ...form, amount: parseFloat(form.amount), note: form.note || null };
    try {
      if (editing.id) await api.put(`/income/${editing.id}`, body);
      else await api.post("/income", body);
      setEditing(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.source}" (${inr(row.amount)})?`)) return;
    await api.delete(`/income/${row.id}`);
    load();
  };

  const sum = (rows || []).reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader title="Income" subtitle={rows ? `Showing ${rows.length} of ${total} entries · ${inr(sum)} on this page` : ""}>
        <MonthPicker value={month} onChange={(value) => { setMonth(value); setPage(1); }} allowAll />
        {!IS_DEMO && <button className="btn-accent" onClick={() => open()}>Add income</button>}
      </PageHeader>
      {!editing && <ErrorText>{error}</ErrorText>}

      <div className="card overflow-x-auto !p-0">
        {!rows ? <Loading /> : rows.length === 0 ? (
          <Empty title="No income recorded" hint="Add your salary, stipend or any other money coming in." />
        ) : (
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-100"><tr><th className="th">Date</th><th className="th">Source</th><th className="th">Note</th><th className="th text-right">Amount</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="td font-semibold">{r.source}</td>
                  <td className="td text-ink-mute">{r.note}</td>
                  <td className="td text-right font-bold text-income">{inr(r.amount)}</td>
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
        <nav className="mt-4 flex items-center justify-between" aria-label="Income pages">
          <button className="btn-ghost" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span className="text-sm text-ink-mute">Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn-ghost" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((value) => value + 1)}>Next</button>
        </nav>
      )}

      {editing && (
        <Modal title={editing.id ? "Edit income" : "Add income"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorText>{error}</ErrorText>
            <Field label="Source"><input className="input" required maxLength={80} placeholder="Salary, freelance, pocket money…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><input className="input" type="number" required min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Date"><input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            </div>
            <Field label="Note (optional)"><input className="input" maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary">Save income</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
