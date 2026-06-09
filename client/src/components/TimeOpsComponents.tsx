import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export function KpiCard({ label, value, sub, trend, icon, className }: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 flex flex-col gap-2 transition-all hover:border-primary/30",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {trend && !icon && (
          <span className={cn("text-xs", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground")}>
            {trend === "up" ? <TrendingUp size={14} /> : trend === "down" ? <TrendingDown size={14} /> : <Minus size={14} />}
          </span>
        )}
      </div>
      <div className={cn(
        "text-xl font-bold tracking-tight",
        trend === "up" ? "kpi-positive" : trend === "down" ? "kpi-negative" : "kpi-neutral"
      )}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Form Section ─────────────────────────────────────────────────────────────
interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">{title}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === "Finalizada" ? "status-done" :
    status === "Descarga pendente" ? "status-pending" :
    "status-transit";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", cls)}>
      {status}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Minus className="text-muted-foreground" size={20} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Classificação Grid ───────────────────────────────────────────────────────
interface ClassifGridProps {
  prefix?: string;
  values: { umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number };
  onChange: (field: string, val: number) => void;
}

export function ClassifGrid({ values, onChange }: ClassifGridProps) {
  const fields = [
    { key: "umidTol", label: "Umidade tol. %", fat: "umidFat" },
    { key: "impTol", label: "Impureza tol. %", fat: "impFat" },
    { key: "avarTol", label: "Avariado tol. %", fat: "avarFat" },
    { key: "queimTol", label: "Queimado tol. %", fat: "queimFat" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(f => (
        <div key={f.key} className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <input
              type="number" step="0.01"
              value={values[f.key as keyof typeof values]}
              onChange={e => onChange(f.key, Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fator {f.label.split(" ")[0].toLowerCase()}</label>
            <input
              type="number" step="0.01"
              value={values[f.fat as keyof typeof values]}
              onChange={e => onChange(f.fat, Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Preview Box ──────────────────────────────────────────────────────────────
interface PreviewRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}

export function PreviewRow({ label, value, highlight, negative }: PreviewRowProps) {
  return (
    <div className={cn("flex justify-between items-center py-1.5 px-2 rounded", highlight ? "bg-primary/10" : "")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums", highlight ? "text-primary" : negative ? "kpi-negative" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  error?: string;
}

export function Field({ label, required, children, className, error }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────
export const inputCls = "w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors";
export const selectCls = "w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors";
export const textareaCls = "w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors min-h-[72px] resize-none";
