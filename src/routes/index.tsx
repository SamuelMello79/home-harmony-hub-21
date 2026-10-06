import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BillDialog } from "@/components/BillDialog";
import { CostBreakdown } from "@/components/CostBreakdown";
import { addMonths, brl, monthKey, monthLabel, occurrencesFor, useBills, type Bill, type BillType } from "@/lib/bills";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caução — Controle de contas da casa" },
      { name: "description", content: "Organize contas fixas e parceladas da casa por categoria, marque o que foi pago e automatize vencimentos mensais." },
      { property: "og:title", content: "Caução — Controle de contas da casa" },
      { property: "og:description", content: "Contas fixas, parcelas, categorias e automações mensais em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const statusStyle = {
  pago: "text-primary",
  pendente: "text-accent",
  vencida: "text-destructive",
} as const;
const statusLabel = { pago: "Pago", pendente: "Pendente", vencida: "Vencida" } as const;

function Index() {
  const { state, togglePaid, saveBill, deleteBill, setAutomation } = useBills();
  const [month, setMonth] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todas" | BillType>("todas");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pago" | "aberto">("todos");
  const [dialog, setDialog] = useState<{ bill?: Bill | null; automation?: boolean } | null>(null);

  useEffect(() => setMonth(monthKey(new Date())), []);

  const occ = useMemo(() => (state && month ? occurrencesFor(state, month) : []), [state, month]);
  const filtered = occ.filter(
    (o) =>
      (typeFilter === "todas" || o.bill.type === typeFilter) &&
      (catFilter === "todas" || o.bill.category === catFilter) &&
      (statusFilter === "todos" || (statusFilter === "pago" ? o.paid : !o.paid)),
  );

  const sum = (f: (o: (typeof occ)[number]) => boolean) => occ.filter(f).reduce((a, o) => a + o.bill.amount, 0);
  const count = (f: (o: (typeof occ)[number]) => boolean) => occ.filter(f).length;
  const total = sum(() => true);
  const paidTotal = sum((o) => o.paid);
  const progress = total ? Math.round((paidTotal / total) * 100) : 0;

  const fixed = state?.bills.filter((b) => b.type === "fixa") ?? [];
  const automations = fixed.filter((b) => b.automation);

  if (!state || !month) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 -left-24 size-[440px] rounded-full bg-blob-1 blur-[100px]" />
        <div className="absolute top-24 -right-16 size-[380px] rounded-full bg-blob-2 blur-[100px]" />
        <div className="absolute -bottom-10 left-1/3 size-[360px] rounded-full bg-blob-3 blur-[110px]" />
        <div className="absolute top-1/2 left-16 size-[220px] rounded-full bg-primary/25 blur-[90px]" />
      </div>

      <header className="frost-strong sticky top-0 z-40 border-b border-border">
        <div className="mx-auto max-w-[1080px] px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-[10px] bg-primary/12 ring-1 ring-primary/25 grid place-items-center">
              <span className="font-display text-primary text-[17px] font-semibold leading-none">C</span>
            </div>
            <span className="font-display text-[19px] font-semibold leading-none tracking-tight">Caução</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle ml-1 hidden sm:inline">controle doméstico</span>
          </div>
          <button onClick={() => setDialog({ bill: null })} className="text-sm font-medium px-4 h-9 rounded-lg bg-primary text-primary-foreground ring-1 ring-primary/40 hover:brightness-110 transition">
            Nova conta
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary mb-2">Painel do mês</p>
            <div className="flex items-center gap-3">
              <button aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))} className="size-8 rounded-lg frost ring-1 ring-border hover:text-primary">‹</button>
              <h1 className="font-display text-3xl font-semibold leading-tight min-w-[220px] text-center">{monthLabel(month)}</h1>
              <button aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))} className="size-8 rounded-lg frost ring-1 ring-border hover:text-primary">›</button>
            </div>
          </div>
          <div className="flex items-center gap-1 frost rounded-xl p-1 ring-1 ring-border text-sm">
            {([["fixa", "Fixas"], ["variavel", "Variáveis"], ["todas", "Todas"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)} className={`px-3 h-8 rounded-lg font-medium transition ${typeFilter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Stat label="Total do mês" value={brl(total)} hint={`${occ.length} contas lançadas`} />
          <Stat label="Pago" tone="text-primary" value={brl(paidTotal)} hint={`${count((o) => o.paid)} contas quitadas`} />
          <Stat label="Pendentes" tone="text-accent" value={brl(sum((o) => o.status === "pendente"))} hint={`${count((o) => o.status === "pendente")} contas a vencer`} />
          <Stat label="Vencidas" tone="text-destructive" value={brl(sum((o) => o.status === "vencida"))} hint={`${count((o) => o.status === "vencida")} em atraso`} />
        </div>
        <div className="mb-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface ring-1 ring-border">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">{progress}% do mês já pago</p>
        </div>

        <div className="mb-6">
          <CostBreakdown occ={occ} total={total} />
        </div>


        <div className="frost rounded-2xl ring-1 ring-border overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <h2 className="font-display text-lg font-semibold leading-none">Contas do mês</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="text-sm font-medium bg-surface ring-1 ring-border rounded-lg px-3 h-8 text-secondary-foreground">
                <option value="todas">Todas as categorias</option>
                {state.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-sm font-medium bg-surface ring-1 ring-border rounded-lg px-3 h-8 text-secondary-foreground">
                <option value="todos">Pagas + em aberto</option>
                <option value="pago">Só pagas</option>
                <option value="aberto">Só em aberto</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma conta para este filtro.</p>
            )}
            {filtered.map((o) => {
              const tone = o.bill.type === "fixa" ? "bg-primary/12 ring-primary/20 text-primary" : "bg-accent/12 ring-accent/20 text-accent";
              const day = String(o.dueDate.getDate()).padStart(2, "0");
              return (
                <div key={o.bill.id} className={`flex items-center gap-4 px-5 py-4 transition ${o.paid ? "opacity-75" : ""}`}>
                  <div className={`size-9 rounded-lg ring-1 grid place-items-center shrink-0 ${tone}`}>
                    <span className="text-[12px] font-semibold">{o.bill.category.charAt(0)}</span>
                  </div>
                  <button className="flex-1 min-w-0 text-left" onClick={() => setDialog({ bill: o.bill })}>
                    <p className={`font-medium text-[15px] leading-tight truncate ${o.paid ? "line-through decoration-subtle" : ""}`}>
                      {o.bill.name}
                      {o.bill.automation?.active && <span className="ml-2 text-[11px] text-primary no-underline">⟳ auto</span>}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {o.bill.category} · {o.bill.type === "fixa" ? "fixa" : "variável"} ·{" "}
                      {o.installment && (o.bill.installments ?? 1) > 1 ? `parcela ${o.installment} de ${o.bill.installments} · ` : ""}
                      {o.status === "vencida" ? "venceu" : "vence"} dia {day}
                    </p>
                  </button>
                  <div className="text-right shrink-0">
                    <p className="font-display text-[17px] font-semibold leading-none">{brl(o.bill.amount)}</p>
                    <p className={`text-[12px] font-medium mt-1 ${statusStyle[o.status]}`}>
                      {o.installment && (o.bill.installments ?? 1) > 1 && !o.paid ? `${o.installment}/${o.bill.installments} · ` : ""}
                      {statusLabel[o.status]}
                    </p>
                  </div>
                  <button
                    aria-label={o.paid ? "Marcar como não pago" : "Marcar como pago"}
                    onClick={() => togglePaid(o.bill.id, month)}
                    className={`shrink-0 size-9 rounded-lg ring-1 grid place-items-center transition active:scale-95 ${o.paid ? "bg-primary ring-primary/40 text-primary-foreground" : "bg-surface ring-border hover:ring-primary/40"}`}
                  >
                    {o.paid ? <span className="text-[13px] font-bold">✓</span> : <span className="size-4 rounded-full border-2 border-subtle" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="frost rounded-2xl ring-1 ring-border p-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold leading-none">Automações de contas fixas</h2>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-[56ch]">
                Gere a cobrança todo mês na data de vencimento e receba um lembrete antes.
              </p>
            </div>
            <button onClick={() => setDialog({ bill: null, automation: true })} className="shrink-0 text-sm font-medium px-4 h-9 rounded-lg bg-primary text-primary-foreground ring-1 ring-primary/40 hover:brightness-110">
              Criar automação
            </button>
          </div>

          {automations.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma automação ainda.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((b) => {
              const a = b.automation!;
              return (
                <div key={b.id} className="rounded-xl bg-surface ring-1 ring-border p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[15px] truncate">{b.name}</p>
                    <button
                      onClick={() => setAutomation(b.id, { ...a, active: !a.active })}
                      className={`text-[11px] font-medium uppercase tracking-[0.12em] px-2 py-1 rounded-md transition ${a.active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {a.active ? "Ativa" : "Pausada"}
                    </button>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-2">
                    {brl(b.amount)} · vence dia {b.dueDay} · gera todo mês · lembrete {a.reminderDays} dias antes
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-[12px] font-medium text-subtle">Recorrente</span>
                    <span className="text-[12px] font-medium text-primary">mensal</span>
                    <button onClick={() => setDialog({ bill: b })} className="ml-auto text-[12px] font-medium text-muted-foreground hover:text-foreground">Editar</button>
                    <button onClick={() => setAutomation(b.id, null)} className="text-[12px] font-medium text-destructive/80 hover:text-destructive">Remover</button>
                  </div>
                </div>
              );
            })}
          </div>

          {fixed.some((b) => !b.automation) && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Automatizar:</span>
              {fixed.filter((b) => !b.automation).map((b) => (
                <button key={b.id} onClick={() => setAutomation(b.id, { active: true, reminderDays: 3 })} className="px-3 h-7 rounded-full bg-surface ring-1 ring-border hover:ring-primary/40 hover:text-primary transition">
                  + {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {dialog && (
        <BillDialog
          initial={dialog.bill}
          automationOnly={dialog.automation}
          categories={state.categories}
          month={month}
          onClose={() => setDialog(null)}
          onSave={(b) => { saveBill(b); setDialog(null); }}
          onDelete={(id) => { deleteBill(id); setDialog(null); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone = "text-foreground" }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="frost rounded-[14px] p-5 ring-1 ring-border">
      <p className={`text-[12px] font-medium uppercase tracking-[0.14em] ${tone === "text-foreground" ? "text-muted-foreground" : tone}`}>{label}</p>
      <p className={`font-display text-[26px] font-semibold leading-none mt-3 ${tone}`}>{value}</p>
      <p className="text-[12px] text-subtle mt-2">{hint}</p>
    </div>
  );
}
