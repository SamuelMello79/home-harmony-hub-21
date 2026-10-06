import { useState } from "react";
import type { Bill, BillType } from "@/lib/bills";

interface Props {
  initial?: Bill | null;
  categories: string[];
  month: string;
  automationOnly?: boolean;
  onClose: () => void;
  onSave: (b: Bill) => void;
  onDelete?: (id: string) => void;
}

const field = "w-full h-10 rounded-lg bg-surface ring-1 ring-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const label = "text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground";

export function BillDialog({ initial, categories, month, automationOnly, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "");
  const [newCat, setNewCat] = useState("");
  const [type, setType] = useState<BillType>(initial?.type ?? (automationOnly ? "fixa" : "fixa"));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [dueDay, setDueDay] = useState(initial ? String(initial.dueDay) : "10");
  const [installments, setInstallments] = useState(String(initial?.installments ?? 1));
  const [auto, setAuto] = useState(initial?.automation?.active ?? !!automationOnly);
  const [reminder, setReminder] = useState(String(initial?.automation?.reminderDays ?? 3));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = category === "__new" ? newCat.trim() : category;
    const value = parseFloat(amount.replace(",", "."));
    if (!name.trim() || !cat || !(value > 0)) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category: cat,
      type,
      amount: value,
      dueDay: Math.min(31, Math.max(1, parseInt(dueDay) || 1)),
      startMonth: initial?.startMonth ?? month,
      installments: type === "variavel" ? Math.max(1, parseInt(installments) || 1) : undefined,
      automation: type === "fixa" ? (auto ? { active: true, reminderDays: parseInt(reminder) || 0 } : null) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="frost-strong w-full max-w-md rounded-2xl p-6 ring-1 ring-border shadow-2xl animate-in zoom-in-95 space-y-4"
      >
        <h2 className="font-display text-xl font-semibold">
          {initial ? "Editar conta" : automationOnly ? "Nova automação" : "Nova conta"}
        </h2>

        <div className="space-y-1.5">
          <p className={label}>Nome</p>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Conta de água" autoFocus />
        </div>

        {!automationOnly && (
          <div className="space-y-1.5">
            <p className={label}>Tipo de conta</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 ring-1 ring-border">
              {(["fixa", "variavel"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`h-8 rounded-lg text-sm font-medium transition ${type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "fixa" ? "Fixa (mensal)" : "Variável / parcelada"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className={label}>Categoria</p>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c}>{c}</option>)}
              <option value="__new">+ Nova categoria</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <p className={label}>{type === "variavel" ? "Valor da parcela" : "Valor"}</p>
            <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        {category === "__new" && (
          <input className={field} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nome da nova categoria" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className={label}>Dia de vencimento</p>
            <input className={field} type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </div>
          {type === "variavel" && (
            <div className="space-y-1.5">
              <p className={label}>Nº de parcelas</p>
              <input className={field} type="number" min={1} value={installments} onChange={(e) => setInstallments(e.target.value)} />
            </div>
          )}
        </div>

        {type === "fixa" && (
          <div className="rounded-xl bg-surface p-4 ring-1 ring-border space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-sm font-medium">Gerar automaticamente todo mês</span>
                <span className="block text-[12px] text-muted-foreground">A conta aparece sozinha no dia {dueDay || "—"} de cada mês</span>
              </span>
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-5 accent-primary" />
            </label>
            {auto && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Lembrete</span>
                <input className={`${field} w-20 h-8`} type="number" min={0} value={reminder} onChange={(e) => setReminder(e.target.value)} />
                <span className="text-muted-foreground">dias antes</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {initial && onDelete && (
            <button type="button" onClick={() => onDelete(initial.id)} className="h-9 px-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10">
              Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
          <button type="submit" className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium ring-1 ring-primary/40 hover:brightness-110">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
