import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Modal from "../components/Modal";
const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export function Transactions() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    type: "expense",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "UPI",
  });
  const load = () => api.get("/transactions").then((x) => setItems(x.data));
  useEffect(() => {
    load();
  }, []);
  const save = async (e: any) => {
    e.preventDefault();
    await api.post("/transactions", {
      ...form,
      amount: Number(form.amount),
      date: new Date(form.date),
    });
    setOpen(false);
    setForm({ ...form, amount: "", description: "" });
    load();
  };
  return (
    <Page
      title="Transactions"
      action={() => setOpen(true)}
      actionText="+ Add transaction"
    >
      <div className="card overflow-hidden">
        {items.map((t) => (
          <div
            className="p-4 border-b border-[#242733] flex justify-between"
            key={t._id}
          >
            <div>
              <b>{t.description}</b>
              <div className="muted text-xs mt-1">
                {t.type} · {new Date(t.date).toLocaleDateString("en-IN")} ·{" "}
                {t.paymentMethod}
              </div>
            </div>
            <span
              className={
                t.type === "income" ? "text-emerald-400" : "text-rose-400"
              }
            >
              {t.type === "income" ? "+" : "-"}
              {money(t.amount)}
            </span>
          </div>
        ))}
        {!items.length && (
          <div className="p-8 text-center muted">No transactions found.</div>
        )}
      </div>
      <Modal open={open} title="Add transaction" onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          {[
            ["description", "Description"],
            ["amount", "Amount"],
          ].map(([k, p]) => (
            <input
              key={k}
              className="input"
              placeholder={p}
              type={k === "amount" ? "number" : "text"}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required
            />
          ))}
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <select
            className="input"
            value={form.paymentMethod}
            onChange={(e) =>
              setForm({ ...form, paymentMethod: e.target.value })
            }
          >
            <option>UPI</option>
            <option>Cash</option>
            <option>Debit Card</option>
            <option>Credit Card</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
          <button className="btn btn-primary w-full">Save transaction</button>
        </form>
      </Modal>
    </Page>
  );
}
function Generic({
  type,
  title,
  fields,
}: {
  type: string;
  title: string;
  fields: string[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const load = () => api.get("/" + type).then((x) => setItems(x.data));
  useEffect(() => {
    load();
  }, []);
  const save = async (e: any) => {
    e.preventDefault();
    await api.post("/" + type, {
      ...form,
      amount: form.amount ? Number(form.amount) : undefined,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
      savedAmount: form.savedAmount ? Number(form.savedAmount) : 0,
    });
    setOpen(false);
    setForm({});
    load();
  };
  return (
    <Page
      title={title}
      action={() => setOpen(true)}
      actionText={`+ Add ${title.slice(0, -1)}`}
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((x) => (
          <div className="card p-5" key={x._id}>
            <div className="font-semibold text-lg">
              {x.name || x.cardName || x.bank || "Item"}
            </div>
            {x.targetAmount != null ? (
              <>
                <div className="text-2xl font-bold mt-3">
                  {money(x.savedAmount)}
                </div>
                <div className="muted">of {money(x.targetAmount)} saved</div>
                <div className="h-2 bg-[#242733] rounded mt-4">
                  <div
                    className="h-full bg-violet-500 rounded"
                    style={{
                      width: `${Math.min(100, (x.savedAmount / x.targetAmount) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs muted mt-2">
                  {Math.min(
                    100,
                    (x.savedAmount / x.targetAmount) * 100,
                  ).toFixed(1)}
                  % complete
                </div>
              </>
            ) : x.outstandingBalance != null ? (
              <>
                <div className="text-2xl font-bold mt-3">
                  {money(x.outstandingBalance)}
                </div>
                <div className="muted">
                  Limit {money(x.creditLimit)} ·{" "}
                  {x.last4 ? "•••• " + x.last4 : ""}
                </div>
              </>
            ) : x.amount != null ? (
              <div className="text-xl font-bold mt-3">{money(x.amount)}</div>
            ) : null}
          </div>
        ))}
        {!items.length && (
          <div className="card p-8 muted">
            Nothing here yet. Create your first item.
          </div>
        )}
      </div>
      <Modal open={open} title={`Add ${title}`} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          {fields.map((k) => (
            <input
              key={k}
              className="input"
              placeholder={k.replace(/([A-Z])/g, " $1")}
              type={
                k.toLowerCase().includes("amount") ||
                k.includes("Limit") ||
                k.includes("Balance")
                  ? "number"
                  : "text"
              }
              value={form[k] || ""}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required={[
                "name",
                "targetAmount",
                "creditLimit",
                "last4",
                "amount",
              ].includes(k)}
            />
          ))}
          <button className="btn btn-primary w-full">Save</button>
        </form>
      </Modal>
    </Page>
  );
}
const Page = ({
  title,
  action,
  actionText,
  children,
}: {
  title: string;
  action?: () => void;
  actionText?: string;
  children: any;
}) => (
  <>
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="muted text-sm mt-1">Manage your financial data.</p>
      </div>
      {action && (
        <button className="btn btn-primary" onClick={action}>
          {actionText}
        </button>
      )}
    </div>
    {children}
  </>
);
export const Budgets = () => (
  <Generic
    type="budgets"
    title="Budgets"
    fields={["amount", "startDate", "endDate"]}
  />
);
export const Milestones = () => (
  <Generic
    type="milestones"
    title="Milestones"
    fields={[
      "name",
      "targetAmount",
      "savedAmount",
      "targetDate",
      "monthlyTarget",
      "description",
    ]}
  />
);
export const Cards = () => (
  <Generic
    type="credit-cards"
    title="Credit Cards"
    fields={[
      "bank",
      "cardName",
      "last4",
      "creditLimit",
      "outstandingBalance",
      "billingDate",
      "dueDate",
      "interestRate",
    ]}
  />
);
export const Categories = () => (
  <Generic
    type="categories"
    title="Categories"
    fields={["name", "type", "icon", "color"]}
  />
);
