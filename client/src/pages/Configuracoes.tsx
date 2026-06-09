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
    iagroRsTon: 0.00,
    senarPerc: 0.00,
    funruralPerc: 1.63,
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

      {/* Aviso sobre dupla contagem SENAR/FUNRURAL */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/80 leading-relaxed space-y-1">
          <p className="font-semibold text-amber-300">Atenção: evite dupla contagem SENAR + FUNRURAL</p>
          <p>Para <strong>produtor Pessoa Física</strong>: use FUNRURAL = 1,63% e SENAR = 0%. O SENAR (0,20%) já está incluso no FUNRURAL PF desde abr/2026 (LC 224/2025).</p>
          <p>Para <strong>produtor Pessoa Jurídica</strong>: use FUNRURAL = 2,23% e SENAR = 0%. O SENAR (0,25%) também já está incluso.</p>
          <p>Use SENAR separado (0,20%) apenas quando <strong>não</strong> houver FUNRURAL (ex: produtor isento).</p>
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
            <p><strong className="text-foreground">IAGRO Soja MT</strong>: 1,15% UPF/ton = R$ 2,80/ton. Para soja MT, já está incluso no FETHAB acima (use 0 para evitar dupla contagem).</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="FETHAB (R$/ton)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.fethabRsTon || ""} onChange={e => set("fethabRsTon", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Soja MT: R$ 48,70 | Milho MT: R$ 14,61</p>
            </Field>
            <Field label="IAGRO (R$/ton)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.iagroRsTon || ""} onChange={e => set("iagroRsTon", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Soja MT: usar 0 (já incluso no FETHAB)</p>
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
            <p><strong className="text-foreground">FUNRURAL PF</strong>: 1,63% (INSS Rural 1,32% + RAT 0,11% + SENAR 0,20%) — vigente a partir de abr/2026 (LC 224/2025)</p>
            <p><strong className="text-foreground">FUNRURAL PJ</strong>: 2,23% (Funrural+RAT 1,98% + SENAR 0,25%)</p>
            <p><strong className="text-foreground">SENAR isolado</strong>: 0,20% — usar apenas quando não houver FUNRURAL</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="FUNRURAL (% sobre valor bruto)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.funruralPerc || ""} onChange={e => set("funruralPerc", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">PF: 1,63% | PJ: 2,23% | Isento: 0%</p>
            </Field>
            <Field label="SENAR (% sobre valor bruto)" required>
              <input className={inputCls} type="number" step="0.0001" value={form.senarPerc || ""} onChange={e => set("senarPerc", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">0% quando FUNRURAL &gt; 0 (já incluso)</p>
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
