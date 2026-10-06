import { useMemo, useState } from "react";
import { brl, type Occurrence, type BillType } from "@/lib/bills";

const TYPE_LABEL: Record<BillType, string> = { fixa: "Fixas", variavel: "Variáveis" };

interface Slice {
  key: string;
  label: string;
  value: number;
  count: number;
  color: string;
}

export function CostBreakdown({ occ, total }: { occ: Occurrence[]; total: number }) {
  const [mode, setMode] = useState<"categoria" | "tipo">("categoria");

  const slices = useMemo<Slice[]>(() => {
    const map = new Map<string, { value: number; count: number }>();
    for (const o of occ) {
      const key = mode === "categoria" ? o.bill.category : o.bill.type;
      const cur = map.get(key) ?? { value: 0, count: 0 };
      map.set(key, { value: cur.value + o.bill.amount, count: cur.count + 1 });
    }
    const palette = Array.from({ length: 8 }, (_, i) => `var(--color-chart-${(i % 8) + 1})`);
    return [...map.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([key, v], i) => ({
        key,
        label: mode === "categoria" ? key : TYPE_LABEL[key as BillType] ?? key,
        value: v.value,
        count: v.count,
        color: palette[i % palette.length]!,
      }));
  }, [occ, mode]);

  const size = 220;
  const r = 82;
  const stroke = 30;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="frost rounded-2xl ring-1 ring-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-lg font-semibold leading-none">Distribuição dos gastos</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Quanto cada grupo pesa no total do mês.</p>
        </div>
        <div className="flex items-center gap-1 frost-strong rounded-xl p-1 ring-1 ring-border text-sm">
          {([["categoria", "Por categoria"], ["tipo", "Por tipo"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={`px-3 h-8 rounded-lg font-medium transition ${mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma conta lançada neste mês.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface)" strokeWidth={stroke} />
              {slices.map((s) => {
                const frac = s.value / total;
                const dash = frac * c;
                const offset = -acc * c;
                acc += frac;
                return (
                  <circle
                    key={s.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${Math.max(dash - 2, 0.01)} ${c - dash + 2}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-[stroke-width] duration-200 hover:stroke-[34]"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Total do mês</p>
                <p className="font-display text-[22px] font-semibold leading-none mt-1.5">{brl(total)}</p>
                <p className="text-[12px] text-subtle mt-1">{occ.length} contas</p>
              </div>
            </div>
          </div>

          <ul className="w-full space-y-1.5">
            {slices.map((s) => {
              const pct = Math.round((s.value / total) * 100);
              return (
                <li key={s.key} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface transition">
                  <span className="size-3 rounded-[4px] shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">
                      {s.label}
                      <span className="ml-2 text-[12px] font-normal text-subtle">{s.count} conta{s.count === 1 ? "" : "s"}</span>
                    </p>
                    <div className="h-1 mt-1 rounded-full bg-surface overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-[15px] font-semibold leading-none">{brl(s.value)}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{pct}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
