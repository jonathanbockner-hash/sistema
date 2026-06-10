import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, inputCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Info, AlertTriangle } from "lucide-react";
import { n } from "@/lib/calculos";

export default function Configuracoes() {
  const [form, setForm] = useState({
    fundoMes: 2.5,
    dmais: 2,
    fethabRsTon: 48.70,
    iagroRsTon: 2.80,   // IAGRO Soja MT — independente do FETHAB
    senarPerc: 0.20,    // SENAR — independente do FUNRURAL
    funruralPerc: 1.43, // FUNRURAL PF (INSS 1,32% + RAT 0,11%) — SENAR é separado
  });

  const { data: cfg, refetch } = trpc.config.get.useQuery();
  const save = trpc.config.save.useMutation({
    onSuccess: () => { refetch(); toast.success("Configurações salvas com sucesso!"); }
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        fundoMes: n(cfg.fundoMes),
        dmais: n(cfg.dmais),
        fethabRsTon: n(cfg.fethabRsTon),
        iagroRsTon: n(cfg.iagroRsTon),
        senarPerc: n(cfg.senarPerc),
        funruralPerc: n(cfg.funruralPerc),
      });
    }
  }, [cfg]);

  const set = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  // Cálculo de exemplo para 1.000 kg de soja a R$ 120/sc
  const exPeso = 1000;
  const exPrecoSc = 120;
  const exValorBruto = (exPeso / 60) * exPrecoSc;
  const exFethab = (exPeso / 1000) * form.fethabRsTon;
  const exIagro = (exPeso / 1000) * form.iagroRsTon;
  const exSenar = exValorBruto * form.senarPerc / 100;
  const exFunrural = exValorBruto * form.funruralPerc / 100;
  const exTotal = exFethab + exIagro + exSenar + exFunrural;
  const exLiquido = exValorBruto - exTotal;

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Configurações Gerais"
        description="Parâmetros fiscais e financeiros aplicados automaticamente em todos os cálculos"
      />

      {/* Aviso sobre retenções independentes */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <p className="font-semibold text-foreground">Cada retenção é calculada e retida de forma independente</p>
          <p><strong className="text-foreground">IAGRO é separado do FETHAB</strong>: configure ambos individualmente. Para soja MT, FETHAB = R$ 48,70/ton e IAGRO = R$ 2,80/ton.</p>
          <p><strong className="text-foreground">SENAR é separado do FUNRURAL</strong>: configure e retenha ambos. SENAR = 0,20% e FUNRURAL PF = 1,43% (INSS 1,32% + RAT 0,11%).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* FETHAB / IAGRO */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">FETHAB e IAGRO — Mato Grosso</h3>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">R$ por tonelada</span>
          </div>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">FETHAB Soja MT</strong>: 20% da UPF-MT por tonelada. UPF-MT 1º sem/2026 = R$ 243,49 → <strong className="text-primary">R$ 48,70/ton</strong></p>
            <p><strong className="text-foreground">FETHAB Milho MT</strong>: 6% da UPF-MT por tonelada (interestaduais/exportação) → <strong className="text-primary">R$ 14,61/ton</strong></p>
            <p><strong className="text-foreground">IAGRO Soja MT</strong>: retenção <strong className="text-primary">independente</strong> do FETHAB. 1,15% UPF/ton = <strong className="text-primary">R$ 2,80/ton</strong> (1º sem/2026). Configure sempre separado.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="FETHAB (R$/ton)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.fethabRsTon || ""} onChange={e => set("fethabRsTon", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Soja MT: R$ 48,70 | Milho MT: R$ 14,61</p>
            </Field>
            <Field label="IAGRO (R$/ton)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.iagroRsTon || ""} onChange={e => set("iagroRsTon", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Soja MT: R$ 2,80/ton | Independente do FETHAB</p>
            </Field>
          </div>
        </div>

        {/* SENAR / FUNRURAL */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">SENAR e FUNRURAL — Federal</h3>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">% sobre valor bruto</span>
          </div>
          <div className="rounded-lg bg-muted/20 border border-border/40 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">FUNRURAL PF</strong>: 1,43% (INSS Rural 1,32% + RAT 0,11%) — vigente a partir de abr/2026 (LC 224/2025)</p>
            <p><strong className="text-foreground">FUNRURAL PJ</strong>: 1,98% (Funrural+RAT)</p>
            <p><strong className="text-foreground">SENAR</strong>: 0,20% — retenção <strong className="text-primary">independente</strong> do FUNRURAL. Configure sempre separado.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="FUNRURAL (% sobre valor bruto)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.funruralPerc || ""} onChange={e => set("funruralPerc", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">PF: 1,43% | PJ: 1,98% | Isento: 0%</p>
            </Field>
            <Field label="SENAR (% sobre valor bruto)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.senarPerc || ""} onChange={e => set("senarPerc", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">0,20% — sempre separado do FUNRURAL</p>
            </Field>
          </div>
        </div>

        {/* Financeiro */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Parâmetros Financeiros</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Taxa de fundo ao mês (%)" required>
              <input className={inputCls} type="number" step="0.01" value={form.fundoMes || ""} onChange={e => set("fundoMes", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Taxa de deságio mensal sobre o valor de venda</p>
            </Field>
            <Field label="Dias extras D+" required>
              <input className={inputCls} type="number" step="1" value={form.dmais || ""} onChange={e => set("dmais", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Dias adicionais somados ao prazo da operação</p>
            </Field>
          </div>
        </div>

        {/* Preview de cálculo */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Preview de retenções — exemplo</h3>
            <span className="text-xs text-muted-foreground">(1.000 kg de soja a R$ {exPrecoSc}/sc)</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Valor bruto (16,67 sc × R$ {exPrecoSc})</span><span className="text-foreground font-mono">{exValorBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">FETHAB ({form.fethabRsTon} R$/ton)</span><span className="text-amber-400 font-mono">- {exFethab.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IAGRO ({form.iagroRsTon} R$/ton)</span><span className="text-amber-400 font-mono">- {exIagro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SENAR ({form.senarPerc}%)</span><span className="text-amber-400 font-mono">- {exSenar.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">FUNRURAL ({form.funruralPerc}%)</span><span className="text-amber-400 font-mono">- {exFunrural.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="h-px bg-border col-span-2 my-1" />
            <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Total retenções</span><span className="text-destructive font-mono">- {exTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
            <div className="flex justify-between font-semibold"><span className="text-foreground">Valor líquido a pagar</span><span className="text-primary font-mono">{exLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
          </div>
        </div>

        <Button type="submit" size="sm" className="gradient-brand text-white gap-2 text-xs" disabled={save.isPending}>
          <Save size={13} /> {save.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>
    </div>
  );
}
