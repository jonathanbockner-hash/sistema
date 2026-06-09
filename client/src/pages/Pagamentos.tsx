import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, Field, EmptyState, KpiCard, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";
import { n, brl } from "@/lib/calculos";

const defaultForm = { compraId: 0, valor: 0, banco: "", comprovante: "", obs: "", dataPagamento: "" };

export default function Pagamentos() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [showForm, setShowForm] = useState(false);
  const [filtroCompra, setFiltroCompra] = useState<number | "">("");

  const { data: pagamentos = [], refetch } = trpc.pagamentos.list.useQuery({});
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: embarques = [] } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const save = trpc.pagamentos.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); toast.success("Pagamento registrado!"); } });
  const del = trpc.pagamentos.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Pagamento removido."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.compraId) { toast.error("Selecione o contrato de compra."); return; }
    if (!form.valor) { toast.error("Informe o valor pago."); return; }
    save.mutate({ ...form, compraId: Number(form.compraId), valor: n(form.valor) });
  }

  // Calcular valor total por contrato de compra
  function calcValorTotalCompra(compraId: number): number {
    const ops = operacoes.filter(o => o.compraId === compraId);
    const ems = embarques.filter(e => ops.some(o => o.id === e.operacaoId));
    const cc = compras.find(c => c.id === compraId);
    if (!cc) return 0;
    return ems.reduce((acc, em) => {
      const kgLiq = Math.max(0, n(em.pesoOrigem));
      return acc + (kgLiq / 60) * n(cc.precoSc);
    }, 0);
  }

  function calcTotalPago(compraId: number): number {
    return pagamentos.filter(p => p.compraId === compraId).reduce((a, p) => a + n(p.valor), 0);
  }

  const filtered = filtroCompra ? pagamentos.filter(p => p.compraId === filtroCompra) : pagamentos;
  const totalPago = filtered.reduce((a, p) => a + n(p.valor), 0);

  const getCompra = (id: number) => compras.find(c => c.id === id);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pagamentos — Contratos de Compra"
        description="Registre e acompanhe os pagamentos realizados aos fornecedores"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setShowForm(true); }}>
            <Plus size={13} /> Registrar Pagamento
          </Button>
        }
      />

      {/* Saldo por contrato */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {compras.map(c => {
          const total = calcValorTotalCompra(c.id);
          const pago = calcTotalPago(c.id);
          const saldo = Math.max(0, total - pago);
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.sigla}</p>
                  <p className="text-xs text-muted-foreground">{c.fornecedor}</p>
                </div>
                <span className={`text-xs font-bold ${saldo > 0 ? "kpi-negative" : "kpi-positive"}`}>
                  {saldo > 0 ? "Pendente" : "Quitado"}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total estimado</span>
                  <span className="font-mono text-foreground">{brl(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total pago</span>
                  <span className="font-mono kpi-positive">{brl(pago)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                  <span className="text-muted-foreground font-medium">Saldo a pagar</span>
                  <span className={`font-mono font-bold ${saldo > 0 ? "kpi-negative" : "kpi-positive"}`}>{brl(saldo)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 max-w-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Registrar Pagamento</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Contrato de compra" required>
              <select className={selectCls} value={form.compraId || ""} onChange={e => set("compraId", Number(e.target.value))} required>
                <option value="">Selecione...</option>
                {compras.map(c => <option key={c.id} value={c.id}>{c.sigla} — {c.fornecedor}</option>)}
              </select>
            </Field>
            {form.compraId > 0 && (
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs space-y-1">
                {(() => {
                  const cc = getCompra(Number(form.compraId));
                  if (!cc) return null;
                  const total = calcValorTotalCompra(cc.id);
                  const pago = calcTotalPago(cc.id);
                  const saldo = Math.max(0, total - pago);
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Banco:</span><span className="text-foreground">{cc.banco} | Ag: {cc.agencia} | Cc: {cc.conta}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Favorecido:</span><span className="text-foreground">{cc.favorecido}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">PIX:</span><span className="text-foreground font-mono">{cc.pix}</span></div>
                      <div className="flex justify-between border-t border-border/50 pt-1 mt-1"><span className="text-muted-foreground">Saldo a pagar:</span><span className={`font-bold ${saldo > 0 ? "kpi-negative" : "kpi-positive"}`}>{brl(saldo)}</span></div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor pago (R$)" required>
                <input className={inputCls} type="number" step="0.01" value={form.valor || ""} onChange={e => set("valor", Number(e.target.value))} required />
              </Field>
              <Field label="Data do pagamento">
                <input className={inputCls} type="date" value={form.dataPagamento} onChange={e => set("dataPagamento", e.target.value)} />
              </Field>
            </div>
            <Field label="Banco / Forma de pagamento">
              <input className={inputCls} placeholder="Ex: Bradesco / PIX" value={form.banco} onChange={e => set("banco", e.target.value)} />
            </Field>
            <Field label="Número do comprovante">
              <input className={inputCls} value={form.comprovante} onChange={e => set("comprovante", e.target.value)} />
            </Field>
            <Field label="Observações">
              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Registrar pagamento"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setForm({ ...defaultForm })}>
                Limpar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro e tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Histórico de pagamentos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Total filtrado: <span className="font-semibold text-foreground">{brl(totalPago)}</span></p>
          </div>
          <select className="rounded-lg border border-border bg-input text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={filtroCompra} onChange={e => setFiltroCompra(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Todos os contratos</option>
            {compras.map(c => <option key={c.id} value={c.id}>{c.sigla} — {c.fornecedor}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum pagamento registrado" description="Registre pagamentos para acompanhar o saldo dos contratos." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Contrato","Fornecedor","Data","Valor","Banco","Comprovante","Obs","Ação"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cc = getCompra(p.compraId);
                  return (
                    <tr key={p.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{cc?.sigla ?? p.compraId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cc?.fornecedor ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 font-mono font-semibold kpi-positive">{brl(n(p.valor))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.banco || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.comprovante || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{p.obs || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => del.mutate({ id: p.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
