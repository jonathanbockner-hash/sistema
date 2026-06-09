import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, StatusBadge, PreviewRow, inputCls, selectCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Calculator } from "lucide-react";
import { n, brl, calcEmbarque } from "@/lib/calculos";

const defaultForm = {
  operacaoId: 0, dataEmbarque: "", placa: "", nfeEntrada: "", nfeSaida: "",
  pesoOrigem: 0, status: "Em trânsito" as const,
  umidade: 0, imp: 0, avar: 0, queim: 0,
};

export default function Embarques() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: embarques = [], refetch } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const save = trpc.embarques.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Embarque salvo!"); } });
  const del = trpc.embarques.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Embarque removido."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const selectedOp = operacoes.find(o => o.id === Number(form.operacaoId));
  const selectedCompra = compras.find(c => c.id === selectedOp?.compraId);
  const selectedVenda = vendas.find(v => v.id === selectedOp?.vendaId);

  const preview = useMemo(() => {
    if (!selectedCompra || !form.pesoOrigem || !cfg) return null;
    return calcEmbarque({
      pesoOrigem: n(form.pesoOrigem),
      umidade: n(form.umidade), imp: n(form.imp), avar: n(form.avar), queim: n(form.queim),
      cc: {
        precoSc: n(selectedCompra.precoSc),
        umidTol: n(selectedCompra.umidTol), umidFat: n(selectedCompra.umidFat),
        impTol: n(selectedCompra.impTol), impFat: n(selectedCompra.impFat),
        avarTol: n(selectedCompra.avarTol), avarFat: n(selectedCompra.avarFat),
        queimTol: n(selectedCompra.queimTol), queimFat: n(selectedCompra.queimFat),
      },
      cfg: { fethab: n(cfg.fethab), iagro: n(cfg.iagro), senar: n(cfg.senar), funrural: n(cfg.funrural) },
    });
  }, [form.operacaoId, form.pesoOrigem, form.umidade, form.imp, form.avar, form.queim, selectedCompra, cfg]);

  function handleEdit(em: any) {
    setForm({
      operacaoId: em.operacaoId, dataEmbarque: em.dataEmbarque ? new Date(em.dataEmbarque).toISOString().slice(0, 10) : "",
      placa: em.placa ?? "", nfeEntrada: em.nfeEntrada ?? "", nfeSaida: em.nfeSaida ?? "",
      pesoOrigem: n(em.pesoOrigem), status: em.status,
      umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
    });
    setEditId(em.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.operacaoId) { toast.error("Selecione a operação."); return; }
    if (!form.pesoOrigem) { toast.error("Informe o peso de origem."); return; }
    save.mutate({ ...form, operacaoId: Number(form.operacaoId), ...(editId ? { id: editId } : {}) });
  }

  const getOp = (id: number) => operacoes.find(o => o.id === id);
  const getCompra = (id: number) => compras.find(c => c.id === id);
  const getVenda = (id: number) => vendas.find(v => v.id === id);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lançar Embarque"
        description="Registre embarques com classificação na origem e preview financeiro em tempo real"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Novo Embarque
          </Button>
        }
      />

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Embarque" : "Novo Embarque"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Operação" required>
                <select className={selectCls} value={form.operacaoId || ""} onChange={e => set("operacaoId", Number(e.target.value))} required>
                  <option value="">Selecione a operação...</option>
                  {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
                </select>
              </Field>

              {selectedOp && (
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                  <div>Compra: <span className="text-foreground font-medium">{getCompra(selectedOp.compraId)?.sigla}</span> — {getCompra(selectedOp.compraId)?.fornecedor}</div>
                  <div>Venda: <span className="text-foreground font-medium">{getVenda(selectedOp.vendaId)?.sigla}</span> — {getVenda(selectedOp.vendaId)?.comprador}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data do embarque">
                  <input className={inputCls} type="date" value={form.dataEmbarque} onChange={e => set("dataEmbarque", e.target.value)} />
                </Field>
                <Field label="Placa">
                  <input className={inputCls} placeholder="Pode ficar em aberto" value={form.placa} onChange={e => set("placa", e.target.value)} />
                </Field>
                <Field label="NF de entrada">
                  <input className={inputCls} value={form.nfeEntrada} onChange={e => set("nfeEntrada", e.target.value)} />
                </Field>
                <Field label="NF de saída">
                  <input className={inputCls} placeholder="Pode ficar em aberto" value={form.nfeSaida} onChange={e => set("nfeSaida", e.target.value)} />
                </Field>
                <Field label="Peso de origem (kg)" required>
                  <input className={inputCls} type="number" step="0.01" value={form.pesoOrigem || ""} onChange={e => set("pesoOrigem", Number(e.target.value))} required />
                </Field>
                <Field label="Status">
                  <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                    {["Em trânsito","Descarga pendente","Finalizada"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <FormSection title="Classificação na origem">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "umidade", label: "Umidade %" },
                    { key: "imp", label: "Impureza %" },
                    { key: "avar", label: "Avariado %" },
                    { key: "queim", label: "Queimado %" },
                  ].map(f => (
                    <Field key={f.key} label={f.label}>
                      <input className={inputCls} type="number" step="0.01" value={form[f.key] || ""} onChange={e => set(f.key, Number(e.target.value))} />
                    </Field>
                  ))}
                </div>
              </FormSection>

              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : "Salvar embarque"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); }}>
                  Limpar
                </Button>
              </div>
            </form>
          </div>

          {/* Preview em tempo real */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Preview de cálculo</h3>
            </div>
            {!preview ? (
              <p className="text-xs text-muted-foreground">Selecione a operação e informe o peso de origem para ver o preview.</p>
            ) : (
              <div className="space-y-1">
                <PreviewRow label="Peso de origem" value={`${n(form.pesoOrigem).toLocaleString("pt-BR")} kg`} />
                <PreviewRow label="Desconto umidade" value={`${preview.cls.umid.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto impureza" value={`${preview.cls.imp.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto avariado" value={`${preview.cls.avar.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto queimado" value={`${preview.cls.queim.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Peso líquido compra" value={`${preview.kgCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Sacas compra" value={`${preview.scCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} sc`} />
                <PreviewRow label="Valor de compra" value={brl(preview.valorCompra)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="FETHAB" value={brl(preview.retFethab)} />
                <PreviewRow label="IAGRO" value={brl(preview.retIagro)} />
                <PreviewRow label="SENAR" value={brl(preview.retSenar)} />
                <PreviewRow label="FUNRURAL" value={brl(preview.retFun)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Valor a pagar" value={brl(preview.valorPagar)} highlight />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Embarques registrados</h3>
        </div>
        <div className="overflow-x-auto">
          {embarques.length === 0 ? (
            <EmptyState title="Nenhum embarque registrado" description="Cadastre operações primeiro, depois lance os embarques." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Operação","Placa","NF Entrada","Data","Peso Orig. (kg)","Umid.","Imp.","Avar.","Queim.","Status","Ações"].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {embarques.map((em, i) => {
                  const op = getOp(em.operacaoId);
                  return (
                    <tr key={em.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-3 py-3 font-medium text-foreground">{op?.sigla ?? em.operacaoId}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.placa || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.nfeEntrada || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-3 py-3 font-mono text-right text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.umidade)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.imp)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.avar)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.queim)}%</td>
                      <td className="px-3 py-3"><StatusBadge status={em.status} /></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(em)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                          <button onClick={() => del.mutate({ id: em.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                        </div>
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
