import { useEffect, useState, useCallback } from "react";

export type BillType = "fixa" | "variavel";

export interface Bill {
  id: string;
  name: string;
  category: string;
  type: BillType;
  amount: number; // valor por mês / por parcela
  dueDay: number;
  startMonth: string; // YYYY-MM
  installments?: number; // variável parcelada
  automation?: { active: boolean; reminderDays: number } | null; // fixa
}

export interface State {
  bills: Bill[];
  categories: string[];
  paid: Record<string, string[]>; // billId -> meses pagos
}

const KEY = "caucao-state-v1";

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const addMonths = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  return monthKey(new Date(y, mo - 1 + n, 1));
};

export const diffMonths = (a: string, b: string) => {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
};

export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const s = new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function seed(): State {
  const m = monthKey(new Date());
  const id = () => crypto.randomUUID();
  const b: Bill[] = [
    { id: id(), name: "Aluguel do apartamento", category: "Moradia", type: "fixa", amount: 1850, dueDay: 10, startMonth: addMonths(m, -2), automation: { active: true, reminderDays: 5 } },
    { id: id(), name: "Energia elétrica", category: "Moradia", type: "fixa", amount: 289, dueDay: 15, startMonth: addMonths(m, -2), automation: { active: true, reminderDays: 3 } },
    { id: id(), name: "Internet fibra", category: "Serviços", type: "fixa", amount: 119.9, dueDay: 12, startMonth: m, automation: null },
    { id: id(), name: "Notebook novo", category: "Educação", type: "variavel", amount: 460, dueDay: 20, startMonth: addMonths(m, -2), installments: 10 },
    { id: id(), name: "Farmácia e suplementos", category: "Saúde", type: "variavel", amount: 230, dueDay: 2, startMonth: m, installments: 1 },
  ];
  return {
    bills: b,
    categories: ["Moradia", "Serviços", "Saúde", "Educação", "Transporte", "Lazer"],
    paid: { [b[0].id]: [addMonths(m, -2), addMonths(m, -1), m] },
  };
}

export interface Occurrence {
  bill: Bill;
  month: string;
  installment?: number;
  paid: boolean;
  status: "pago" | "pendente" | "vencida";
  dueDate: Date;
}

export function occurrencesFor(state: State, month: string): Occurrence[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Occurrence[] = [];
  for (const bill of state.bills) {
    const d = diffMonths(bill.startMonth, month);
    if (d < 0) continue;
    let installment: number | undefined;
    if (bill.type === "fixa") {
      if (d > 0 && !bill.automation?.active) continue;
    } else {
      const n = bill.installments ?? 1;
      if (d >= n) continue;
      installment = d + 1;
    }
    const [y, mo] = month.split("-").map(Number);
    const last = new Date(y, mo, 0).getDate();
    const dueDate = new Date(y, mo - 1, Math.min(bill.dueDay, last));
    const paid = (state.paid[bill.id] ?? []).includes(month);
    out.push({
      bill,
      month,
      installment,
      paid,
      dueDate,
      status: paid ? "pago" : dueDate < today ? "vencida" : "pendente",
    });
  }
  return out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function useBills() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setState(raw ? JSON.parse(raw) : seed());
    } catch {
      setState(seed());
    }
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (s: State) => State) => setState((s) => (s ? fn(s) : s)), []);

  return {
    state,
    togglePaid: (billId: string, month: string) =>
      update((s) => {
        const cur = s.paid[billId] ?? [];
        const next = cur.includes(month) ? cur.filter((x) => x !== month) : [...cur, month];
        return { ...s, paid: { ...s.paid, [billId]: next } };
      }),
    saveBill: (bill: Bill) =>
      update((s) => {
        const exists = s.bills.some((b) => b.id === bill.id);
        const cats = s.categories.includes(bill.category) ? s.categories : [...s.categories, bill.category];
        return { ...s, categories: cats, bills: exists ? s.bills.map((b) => (b.id === bill.id ? bill : b)) : [...s.bills, bill] };
      }),
    deleteBill: (id: string) =>
      update((s) => {
        const paid = { ...s.paid };
        delete paid[id];
        return { ...s, paid, bills: s.bills.filter((b) => b.id !== id) };
      }),
    setAutomation: (id: string, automation: Bill["automation"]) =>
      update((s) => ({ ...s, bills: s.bills.map((b) => (b.id === id ? { ...b, automation } : b)) })),
    addCategory: (c: string) =>
      update((s) => (s.categories.includes(c) ? s : { ...s, categories: [...s.categories, c] })),
  };
}
