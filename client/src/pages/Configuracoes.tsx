import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, inputCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";
import { n } from "@/lib/calculos";

export default function Configuracoes() {
  const [form, setForm] = useState({
    fundoMes: 1.5, fethab: 0.2, iagro: 0.2, senar: 0.2, funrural: 2.5, dmais: 2,
  });

  const { data: cfg, refetch } = trpc.config.get.useQuery();
  const save = trpc.config.save.useMutation({ onSuccess: () => { refetch(); toast.success("Configurações salvas com sucesso!"); } });

  useEffect(() => {
    if (cfg) {
      setForm({
        fundoMes: n(cfg.fundoMes), fethab: n(cfg.fethab), iagro: n(cfg.iagro),
        senar: n(cfg.senar), funrural: n(cfg.funrural), dmais: n(cfg.dmais),
      });
    }
  }, [cfg]);

  const set = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  const campos = [
    {
      key: "fundoMes", label: "Taxa de Fundo ao Mês (%)",
      desc: "Taxa de deságio mensal aplicada ao valor de venda. Usada para calcular o deságio financeiro com base nos dias de prazo.",
    },
    {
      key: "fethab", label: "FETHAB (%)",
      desc: "Fundo Estadual de Transporte e Habitação — retenção sobre o valor de compra (MT).",
    },
    {
      key: "iagro", label: "IAGRO (%)",
      desc: "Instituto de Defesa Agropecuária — retenção sobre o valor de compra (MS).",
    },
    {
      key: "senar", label: "SENAR (%)",
      desc: "Serviço Nacional de Aprendizagem Rural — retenção sobre o valor de compra.",
    },
    {
      key: "funrural", label: "FUNRURAL (%)",
      desc: "Fundo de Assistência ao Trabalhador Rural — retenção sobre o valor de compra.",
    },
    {
      key: "dmais", label: "Dias extras D+ (prazo adicional)",
      desc: "Dias adicionais somados ao prazo de deságio da operação. Representa o D+ do contrato de venda.",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader
        title="Configurações Gerais"
        description="Parâmetros fiscais e financeiros aplicados automaticamente em todos os cálculos"
      />

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Estas configurações são aplicadas globalmente em todos os cálculos de embarque, descarga e relatórios. Alterações afetam os previews em tempo real imediatamente após salvar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <FormSection title="Taxas e retenções">
          <div className="space-y-4">
            {campos.map(c => (
              <div key={c.key} className="flex items-start gap-4">
                <div className="flex-1">
                  <Field label={c.label}>
                    <input
                      className={inputCls + " max-w-[200px]"}
                      type="number"
                      step="0.0001"
                      value={form[c.key as keyof typeof form]}
                      onChange={e => set(c.key, Number(e.target.value))}
                    />
                  </Field>
                </div>
                <div className="flex-1 pt-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        {/* Preview de impacto */}
        <FormSection title="Exemplo de impacto (saca de 60 kg a R$ 100,00)">
          <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-1.5">
            {(() => {
              const valorSc = 100;
              const fethab = valorSc * form.fethab / 100;
              const iagro = valorSc * form.iagro / 100;
              const senar = valorSc * form.senar / 100;
              const funrural = valorSc * form.funrural / 100;
              const total = fethab + iagro + senar + funrural;
              const liquido = valorSc - total;
              const desagio = valorSc * (form.fundoMes / 100 / 30 * (15 + form.dmais));
              return (
                <>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Valor bruto (1 sc)</span><span className="text-foreground font-mono">R$ {valorSc.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">FETHAB</span><span className="kpi-negative font-mono">- R$ {fethab.toFixed(4)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">IAGRO</span><span className="kpi-negative font-mono">- R$ {iagro.toFixed(4)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">SENAR</span><span className="kpi-negative font-mono">- R$ {senar.toFixed(4)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">FUNRURAL</span><span className="kpi-negative font-mono">- R$ {funrural.toFixed(4)}</span></div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between text-xs font-semibold"><span className="text-muted-foreground">Valor líquido (compra)</span><span className="text-foreground font-mono">R$ {liquido.toFixed(4)}</span></div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Deságio (15 + {form.dmais} dias)</span><span className="kpi-negative font-mono">- R$ {desagio.toFixed(4)}</span></div>
                </>
              );
            })()}
          </div>
        </FormSection>

        <Button type="submit" size="sm" className="gradient-brand text-white gap-1.5 text-xs" disabled={save.isPending}>
          <Save size={13} /> {save.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>
    </div>
  );
}
