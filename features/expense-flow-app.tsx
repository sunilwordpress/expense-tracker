"use client";

import { addDays, format, isAfter, isSameDay, isSameMonth, isSameWeek, parseISO, startOfMonth } from "date-fns";
import { Download, Mic, Moon, Plus, Search, Sun, Upload } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { backupJson, loadBills, loadBudget, loadTransactions, saveBudget, saveTransactions } from "@/lib/local-store";
import { parseVoiceTransaction } from "@/lib/voice-parser";
import { cn, formatMoney, uid } from "@/lib/utils";
import { categories, paymentMethods, type Transaction } from "@/types/expense";

const chartColors = ["#209689", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#64748b"];

export function ExpenseFlowApp() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("This Month");
  const [category, setCategory] = useState("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Transaction> | null>(null);
  const [dark, setDark] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(65000);
  const fileRef = useRef<HTMLInputElement>(null);
  const bills = loadBills();

  useEffect(() => {
    setTransactions(loadTransactions());
    setMonthlyBudget(loadBudget().monthly);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function persist(next: Transaction[]) {
    const sorted = [...next].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    setTransactions(sorted);
    saveTransactions(sorted);
  }

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const haystack = [transaction.merchant, transaction.category, transaction.notes, transaction.amount, transaction.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return (
        haystack.includes(query.toLowerCase()) &&
        matchesRange(transaction, range) &&
        (category === "All" || transaction.category === category)
      );
    });
  }, [transactions, query, range, category]);

  const totals = useMemo(() => summarize(transactions, monthlyBudget), [transactions, monthlyBudget]);
  const budgetAlerts = useMemo(() => getBudgetAlerts(totals), [totals]);
  const categoryData = useMemo(() => summarizeByCategory(filtered), [filtered]);
  const trendData = useMemo(() => trend(transactions), [transactions]);
  const nextBills = bills.filter((bill) => isAfter(parseISO(bill.dueDate), addDays(new Date(), -1))).slice(0, 3);
  const foodDelta = monthlyDelta(transactions, "Food");

  function saveTransaction(values: Partial<Transaction>) {
    const date = values.date ?? new Date().toISOString().slice(0, 10);
    const isEditing = Boolean(values.id);
    const transaction: Transaction = {
      id: values.id ?? uid("tx"),
      amount: Number(values.amount ?? 0),
      type: values.type ?? "EXPENSE",
      category: values.category ?? "Miscellaneous",
      subCategory: values.subCategory,
      paymentMethod: values.paymentMethod ?? "UPI",
      date,
      time: values.time ?? format(new Date(), "HH:mm"),
      merchant: values.merchant,
      location: values.location,
      notes: values.notes,
      receiptImage: values.receiptImage,
      recurring: values.recurring ?? false,
      tags: normalizeTags(values.tags),
      confidence: values.confidence,
      synced: navigator.onLine,
      createdAt: new Date().toISOString()
    };

    if (!transaction.amount) {
      toast.error("Enter an amount first.");
      return;
    }

    const nextTransactions = isEditing
      ? transactions.map((item) => (item.id === transaction.id ? transaction : item))
      : [transaction, ...transactions];

    persist(nextTransactions);
    setIsFormOpen(false);
    setDraft(null);
    toast.success(`${transaction.type === "INCOME" ? "Income" : "Expense"} ${isEditing ? "updated" : "added"}`);
  }

  function handleVoiceResult(text: string) {
    const parsed = parseVoiceTransaction(text);
    if (!parsed) {
      toast.error("I could not find an amount in that command.");
      return;
    }

    const nextDraft: Partial<Transaction> = {
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      merchant: parsed.merchant,
      notes: parsed.notes,
      date: parsed.date,
      confidence: parsed.confidence,
      paymentMethod: "UPI",
      tags: []
    };

    if (parsed.confidence < 0.74) {
      setDraft(nextDraft);
      setIsFormOpen(true);
      toast.message("Please confirm the details before saving.");
      return;
    }

    saveTransaction(nextDraft);
  }

  function editTransaction(transaction: Transaction) {
    setDraft(transaction);
    setIsFormOpen(true);
  }

  function exportCsv() {
    download("expenseflow-transactions.csv", Papa.unparse(transactions), "text/csv");
  }

  function exportJson() {
    download("expenseflow-backup.json", backupJson(transactions), "application/json");
  }

  async function importJson(file?: File) {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text) as { transactions?: Transaction[] };
    if (!Array.isArray(parsed.transactions)) {
      toast.error("That backup file does not contain transactions.");
      return;
    }
    persist(parsed.transactions);
    toast.success("Backup restored");
  }

  function resetAllData() {
    const confirmed = window.confirm("Reset all local transactions? Download a JSON backup first if you want to keep a copy.");
    if (!confirmed) return;

    persist([]);
    toast.success("All local transactions reset");
  }

  function startCurrentMonthFresh() {
    const confirmed = window.confirm("Remove transactions before this month? This keeps only current-month entries.");
    if (!confirmed) return;

    const currentMonthTransactions = transactions.filter((transaction) => isSameMonth(parseISO(transaction.date), new Date()));
    persist(currentMonthTransactions);
    toast.success("Older transactions removed. This month is ready.");
  }

  function updateMonthlyBudget() {
    if (monthlyBudget < 0) {
      toast.error("Budget cannot be negative.");
      return;
    }

    const existingBudget = loadBudget();
    saveBudget({ ...existingBudget, monthly: monthlyBudget });
    toast.success("Monthly budget updated");
  }

  return (
    <main className="min-h-screen pb-24 lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-6">
        <aside className="hidden rounded-lg border bg-card p-4 lg:block">
          <div className="mb-8">
            <p className="text-xl font-bold">ExpenseFlow</p>
            <p className="text-sm text-muted-foreground">Voice-first money tracking</p>
          </div>
          <nav className="grid gap-2 text-sm font-medium">
            {["Dashboard", "Transactions", "Budgets", "Bills", "Analytics", "Settings"].map((item) => (
              <a className="rounded-md px-3 py-2 hover:bg-muted" href={`#${item.toLowerCase()}`} key={item}>
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMM yyyy")}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">ExpenseFlow</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus size={18} /> Add
              </Button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric title="Current Balance" value={formatMoney(totals.balance)} tone="primary" />
            <Metric title="Today Expense" value={formatMoney(totals.todayExpense)} />
            <Metric title="This Month" value={formatMoney(totals.monthExpense)} />
            <Metric title="Budget Remaining" value={formatMoney(totals.budgetRemaining)} tone={totals.budgetRemaining < 0 ? "danger" : "primary"} />
            <Metric title="Income" value={formatMoney(totals.income)} />
            <Metric title="Savings" value={formatMoney(totals.savings)} />
            <Metric title="This Week" value={formatMoney(totals.weekExpense)} />
            <Metric title="Daily Limit Left" value={formatMoney(totals.dailyLimit)} />
          </section>

          {budgetAlerts.length ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <h2 className="mb-2 font-semibold text-destructive">Budget Alert</h2>
              <div className="space-y-1 text-sm">
                {budgetAlerts.map((alert) => (
                  <p key={alert}>{alert}</p>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                <Input className="pl-10" placeholder="Search merchant, amount, category, tag, notes" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={range} onChange={(event) => setRange(event.target.value)}>
                {["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month", "All"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
              <Button variant="secondary" onClick={exportCsv}>
                <Download size={16} /> CSV
              </Button>
            </div>
          </Card>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card id="transactions">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Recent Transactions</h2>
                <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
              </div>
              <div className="space-y-2">
                {filtered.slice(0, 9).map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} onEdit={editTransaction} />
                ))}
              </div>
            </Card>

            <Card id="bills">
              <h2 className="mb-3 font-semibold">Upcoming Bills</h2>
              <div className="space-y-3">
                {nextBills.map((bill) => (
                  <div className="flex items-center justify-between rounded-md bg-muted p-3" key={bill.id}>
                    <div>
                      <p className="font-medium">{bill.name}</p>
                      <p className="text-sm text-muted-foreground">Due {format(parseISO(bill.dueDate), "d MMM")}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(bill.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-2" id="analytics">
            <Card>
              <h2 className="mb-3 font-semibold">Category Wise Spending</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Monthly Trend</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Line dataKey="expense" stroke="#ef4444" strokeWidth={2} />
                    <Line dataKey="income" stroke="#209689" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <Card>
            <h2 className="mb-2 font-semibold">AI Monthly Coach</h2>
            <p className="text-sm text-muted-foreground">
              {foodDelta > 0
                ? `Food spending is up ${foodDelta}% versus last month. Your daily spend limit is ${formatMoney(totals.dailyLimit)} to stay inside budget.`
                : `You are on track. You saved ${formatMoney(Math.max(0, totals.savings))} this month, and recurring bills are visible before they hit.`}
            </p>
          </Card>

          <Card id="settings">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Monthly Budget">
                <Input
                  type="number"
                  min="0"
                  value={monthlyBudget}
                  onChange={(event) => setMonthlyBudget(Number(event.target.value))}
                />
              </Field>
              <Button className="self-end" onClick={updateMonthlyBudget}>
                Update Budget
              </Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Budget Remaining and Daily Limit Left update from this value and your current-month expenses.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportJson}>
                <Download size={16} /> Backup JSON
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Restore JSON
              </Button>
              <Button variant="secondary" onClick={startCurrentMonthFresh}>
                Start Month Fresh
              </Button>
              <Button variant="danger" onClick={resetAllData}>
                Reset All Data
              </Button>
              <input ref={fileRef} hidden type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
            </div>
          </Card>
        </section>
      </div>

      <VoiceButton onResult={handleVoiceResult} />
      {isFormOpen ? <TransactionForm initial={draft} onClose={() => setIsFormOpen(false)} onSubmit={saveTransaction} /> : null}
      <MobileNav onAdd={() => setIsFormOpen(true)} />
    </main>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone?: "primary" | "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={cn("mt-2 text-2xl font-bold", tone === "primary" && "text-primary", tone === "danger" && "text-destructive")}>{value}</p>
    </Card>
  );
}

function TransactionRow({ transaction, onEdit }: { transaction: Transaction; onEdit: (transaction: Transaction) => void }) {
  const isIncome = transaction.type === "INCOME";
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{transaction.merchant || transaction.category}</p>
        <p className="truncate text-sm text-muted-foreground">
          {transaction.category} · {format(parseISO(transaction.date), "d MMM")} · {transaction.paymentMethod}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className={cn("font-bold", isIncome ? "text-primary" : "text-destructive")}>
          {isIncome ? "+" : "-"}{formatMoney(transaction.amount)}
        </p>
        <Button className="min-h-8 px-3 py-1" variant="ghost" onClick={() => onEdit(transaction)}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);

  function start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => toast.error("Could not hear that clearly.");
    recognition.onresult = (event) => onResult(event.results[0][0].transcript);
    recognition.start();
  }

  return (
    <button
      className={cn("fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft lg:bottom-8", listening && "animate-pulse")}
      onClick={start}
      aria-label="Add expense by voice"
    >
      <Mic />
    </button>
  );
}

function TransactionForm({
  initial,
  onClose,
  onSubmit
}: {
  initial: Partial<Transaction> | null;
  onClose: () => void;
  onSubmit: (values: Partial<Transaction>) => void;
}) {
  const [values, setValues] = useState<Partial<Transaction>>({
    type: "EXPENSE",
    paymentMethod: "UPI",
    category: "Food",
    date: new Date().toISOString().slice(0, 10),
    time: format(new Date(), "HH:mm"),
    tags: [],
    ...initial
  });

  function update<K extends keyof Transaction>(key: K, value: Transaction[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-card p-4 shadow-soft sm:rounded-lg"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{values.id ? "Edit Transaction" : "Add Transaction"}</h2>
            {values.confidence ? <p className="text-sm text-muted-foreground">Voice confidence {Math.round(values.confidence * 100)}%</p> : null}
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={values.amount ?? ""} onChange={(event) => update("amount", Number(event.target.value))} required />
          </Field>
          <Field label="Type">
            <Select value={values.type} onChange={(event) => update("type", event.target.value as Transaction["type"])}>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={values.category} onChange={(event) => update("category", event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Sub Category">
            <Input value={values.subCategory ?? ""} onChange={(event) => update("subCategory", event.target.value)} />
          </Field>
          <Field label="Payment Method">
            <Select value={values.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value as Transaction["paymentMethod"])}>
              {paymentMethods.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Merchant">
            <Input value={values.merchant ?? ""} onChange={(event) => update("merchant", event.target.value)} />
          </Field>
          <Field label="Date">
            <Input type="date" value={values.date ?? ""} onChange={(event) => update("date", event.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={values.time ?? ""} onChange={(event) => update("time", event.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={values.location ?? ""} onChange={(event) => update("location", event.target.value)} />
          </Field>
          <Field label="Tags">
            <Input placeholder="tea, office" value={Array.isArray(values.tags) ? values.tags.join(", ") : ""} onChange={(event) => update("tags", event.target.value.split(",").map((tag) => tag.trim()))} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.recurring ?? false} onChange={(event) => update("recurring", event.target.checked)} />
            Recurring expense
          </label>
          <Field label="Receipt Image">
            <Input type="file" accept="image/*" onChange={(event) => update("receiptImage", event.target.files?.[0]?.name ?? "")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea value={values.notes ?? ""} onChange={(event) => update("notes", event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{values.id ? "Update Transaction" : "Save Transaction"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MobileNav({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card px-2 py-2 pb-safe text-xs font-medium lg:hidden">
      <a className="grid place-items-center gap-1" href="#">Home</a>
      <a className="grid place-items-center gap-1" href="#transactions">Search</a>
      <button className="grid place-items-center gap-1 text-primary" onClick={onAdd}>Add</button>
      <a className="grid place-items-center gap-1" href="#analytics">Charts</a>
    </nav>
  );
}

function summarize(transactions: Transaction[], monthlyBudget: number) {
  const now = new Date();
  const income = sum(transactions.filter((item) => item.type === "INCOME" && isSameMonth(parseISO(item.date), now)));
  const monthExpense = sum(transactions.filter((item) => item.type === "EXPENSE" && isSameMonth(parseISO(item.date), now)));
  const todayExpense = sum(transactions.filter((item) => item.type === "EXPENSE" && isSameDay(parseISO(item.date), now)));
  const weekExpense = sum(transactions.filter((item) => item.type === "EXPENSE" && isSameWeek(parseISO(item.date), now)));
  const daysInMonth = Number(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "d"));
  const daysLeft = Math.max(1, Number(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "d")) - Number(format(now, "d")) + 1);
  const budgetRemaining = monthlyBudget - monthExpense;

  return {
    income,
    monthExpense,
    todayExpense,
    weekExpense,
    balance: income - monthExpense,
    savings: income - monthExpense,
    budgetRemaining,
    dailyLimit: Math.max(0, budgetRemaining / daysLeft),
    dailyTarget: monthlyBudget / daysInMonth
  };
}

function getBudgetAlerts(totals: ReturnType<typeof summarize>) {
  const alerts: string[] = [];

  if (totals.budgetRemaining < 0) {
    alerts.push(`Monthly budget exceeded by ${formatMoney(Math.abs(totals.budgetRemaining))}.`);
  }

  if (totals.todayExpense > totals.dailyTarget) {
    alerts.push(`Today's spending is ${formatMoney(totals.todayExpense - totals.dailyTarget)} over your daily target of ${formatMoney(totals.dailyTarget)}.`);
  }

  return alerts;
}

function summarizeByCategory(transactions: Transaction[]) {
  const grouped = new Map<string, number>();
  transactions.filter((item) => item.type === "EXPENSE").forEach((item) => grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount));
  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

function trend(transactions: Transaction[]) {
  const points = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthly = transactions.filter((item) => {
      const parsed = parseISO(item.date);
      return parsed.getMonth() === month && parsed.getFullYear() === year;
    });
    return {
      label: format(date, "MMM"),
      expense: sum(monthly.filter((item) => item.type === "EXPENSE")),
      income: sum(monthly.filter((item) => item.type === "INCOME"))
    };
  });
  return points;
}

function matchesRange(transaction: Transaction, range: string) {
  const date = parseISO(transaction.date);
  const now = new Date();
  if (range === "Today") return isSameDay(date, now);
  if (range === "Yesterday") return isSameDay(date, addDays(now, -1));
  if (range === "This Week") return isSameWeek(date, now);
  if (range === "Last Week") return isSameWeek(date, addDays(now, -7));
  if (range === "This Month") return isSameMonth(date, now);
  if (range === "Last Month") return isSameMonth(date, addDays(startOfMonth(now), -1));
  return true;
}

function monthlyDelta(transactions: Transaction[], category: string) {
  const now = new Date();
  const lastMonth = addDays(startOfMonth(now), -1);
  const current = sum(transactions.filter((item) => item.type === "EXPENSE" && item.category === category && isSameMonth(parseISO(item.date), now)));
  const previous = sum(transactions.filter((item) => item.type === "EXPENSE" && item.category === category && isSameMonth(parseISO(item.date), lastMonth)));
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function sum(transactions: Transaction[]) {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
