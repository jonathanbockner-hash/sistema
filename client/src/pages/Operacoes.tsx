import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Wand2 } from "lucide-react";
import { n } from "@/lib/calculos";

const defaultForm = {
  sigla: "", compraId: 0, vendaId: 0,
  freteTon: 0, quebraTol: 0.25, diasDesagio: 15,
  comissaoValor: 0, comissaoTipo: "sc" as const,
  classificadorId: null as number | null, custoClassTon: 0.017,
  corretorId: null as number | null,
  obs: "",
};

export default function Operacoes() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: operacoes = [], refetch } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: classificadores = [] } = trpc.classificadores.list.useQuery();
  const { data: corretores = [] } = trpc.corretores.list.useQuery();

  const save = trpc.operacoes.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Operação salva!"); } });
  const del = trpc.operacoes.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Operação removida."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // Gerar sigla automática quando compra ou venda mudam
  useEffect(() => {
    if (!form.compraId || !form.vendaId || editId) return;
    const compra = compras.find(c => c.id === form.compraId);
    const venda = vendas.find(v => v.id === form.vendaId);
    if (!compra || !venda) return;
    // Formato: OP-[SIGLA_COMPRA]-[SIGLA_VENDA]-[SEQ]
    const seq = (operacoes.length + 1).toString().padStart(3, "0");
    const siglaCompra = compra.sigla.replace(/\s+/g, "").toUpperCase().slice(0, 6);
    const siglaVenda = venda.sigla.replace(/\s+/g, "").toUpperCase().slice(0, 6);
    const siglaAuto = `OP-${siglaCompra}-${siglaVenda}-${seq}`;
    set("sigla", siglaAuto);
  }, [form.compraId, form.vendaId]);

  function gerarSigla() {
    const compra = compras.find(c => c.id === form.compraId);
    const venda = vendas.find(v => v.id === form.vendaId);
    if (!compra || !venda) { toast.error("Selecione compra e venda primeiro."); return; }
    const seq = (operacoes.length + 1).toString().padStart(3, "0");
    const siglaCompra = compra.sigla.replace(/\s+/g, "").toUpperCase().slice(0, 6);
    const siglaVenda = venda.sigla.replace(/\s+/g, "").toUpperCase().slice(0, 6);
    set("sigla", `OP-${siglaCompra}-${siglaVenda}-${seq}`);
  }

  function handleEdit(op: any) {
    setForm({
      sigla: op.sigla, compraId: op.compraId, vendaId: op.vendaId,
      freteTon: n(op.freteTon), quebraTol: n(op.quebraTol), diasDesagio: op.diasDesagio,
      comissaoValor: n(op.comissaoValor), comissaoTipo: op.comissaoTipo,
      classificadorId: op.classificadorId ?? null, custoClassTon: n(op.custoClassTon),
      corretorId: op.corretorId ?? null,
      obs: op.obs ?? "",
    });
    setEditId(op.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.compraId || !form.vendaId) { toast.error("Selecione os contratos de compra e venda."); return; }
    save.mutate({ ...form, ...(editId ? { id: editId } : {}) });
  }

  const getCompra = (id: number) => compras.find(c => c.id === id);
  const getVenda = (id: number) => vendas.find(v => v.id === id);
  const getCl = (id: number | null) => id ? classificadores.find(c => c.id === id) : null;
  const getCor = (id: number | null) => id ? corretores.find(c => c.id === id) : null;

  const comissaoTipos = [
    { value: "sc", label: "R$/saca" },
    { value: "ton", label: "R$/tonelada" },
    { value: "fixo", label: "R$ fixo por operação" },
    { value: "percVenda", label: "% sobre venda" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Operações Vinculadas"
        description="Associe contratos de compra e venda para formar operações"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Nova Operação
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Operação" : "Nova Operação Vinculada"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Contrato de compra" required>
                <select className={selectCls} value={form.compraId || ""} onChange={e => set("compraId", Number(e.target.value))} required>
                  <option value="">Selecione...</option>
                  {compras.map(c => <option key={c.id} value={c.id}>{c.sigla} — {c.fornecedor}</option>)}
                </select>
              </Field>
              <Field label="Contrato de venda" required>
                <select className={selectCls} value={form.vendaId || ""} onChange={e => set("vendaId", Number(e.target.value))} required>
                  <option value="">Selecione...</option>
                  {vendas.map(v => <option key={v.id} value={v.id}>{v.sigla} — {v.comprador}</option>)}
                </select>
              </Field>
              <Field label="Nome / sigla da operação" required>
                <div className="flex gap-1.5">
                  <input className={`${inputCls} flex-1`} placeholder="Gerado automaticamente" value={form.sigla} onChange={e => set("sigla", e.target.value)} required />
                  <button type="button" onClick={gerarSigla}
                    className="flex items-center gap-1 px-2.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors text-xs"
                    title="Gerar sigla automaticamente">
                    <Wand2 size={12} />
                  </button>
                </div>
              </Field>
            </div>

            <FormSection title="Custos da operação">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Frete R$/ton">
                  <input className={inputCls} type="number" step="0.01" value={form.freteTon} onChange={e => set("freteTon", Number(e.target.value))} />
                </Field>
                <Field label="Quebra logística tolerada %">
                  <input className={inputCls} type="number" step="0.01" value={form.quebraTol} onChange={e => set("quebraTol", Number(e.target.value))} />
                </Field>
                <Field label="Dias de deságio">
                  <input className={inputCls} type="number" value={form.diasDesagio} onChange={e => set("diasDesagio", Number(e.target.value))} />
                </Field>
                <Field label="Comissão">
                  <input className={inputCls} type="number" step="0.01" value={form.comissaoValor} onChange={e => set("comissaoValor", Number(e.target.value))} />
                </Field>
                <Field label="Tipo de comissão">
                  <select className={selectCls} value={form.comissaoTipo} onChange={e => set("comissaoTipo", e.target.value)}>
                    {comissaoTipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
            </FormSection>

            <FormSection title="Classificador e Corretor">
              <div className="grid grid-cols-2 gap-4">
                {/* Classificador */}
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Classificador</p>
                  <Field label="Selecionar classificador">
                    <select className={selectCls} value={form.classificadorId ?? ""} onChange={e => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      set("classificadorId", id);
                      // Nota: custoClassTon é definido manualmente pelo usuário no campo abaixo
                      // O schema de classificadores não possui campo custoTon
                    }}>
                      <option value="">Não definido</option>
                      {classificadores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </Field>
                  {form.classificadorId && (() => {
                    const cl = getCl(form.classificadorId);
                    return cl ? (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>CPF: <span className="text-foreground">{cl.cpf}</span></p>
                        <p>PIX: <span className="text-foreground font-mono">{cl.pix}</span></p>
                      </div>
                    ) : null;
                  })()}
                  <Field label="Custo classificador R$/ton">
                    <input className={inputCls} type="number" step="0.0001" value={form.custoClassTon} onChange={e => set("custoClassTon", Number(e.target.value))} />
                  </Field>
                </div>

                {/* Corretor */}
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Corretor</p>
                  <Field label="Selecionar corretor">
                    <select className={selectCls} value={form.corretorId ?? ""} onChange={e => set("corretorId", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Não definido</option>
                      {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </Field>
                  {form.corretorId && (() => {
                    const cor = getCor(form.corretorId);
                    return cor ? (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>CPF/CNPJ: <span className="text-foreground">{cor.cpfCnpj}</span></p>
                        <p>PIX: <span className="text-foreground font-mono">{cor.pix}</span></p>
                        {cor.comissaoValor && <p>Comissão padrão: <span className="text-foreground">{n(cor.comissaoValor)} ({cor.comissaoTipo})</span></p>}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </FormSection>

            <Field label="Observações">
              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar operação"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); }}>
                Limpar
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Operações cadastradas</h3>
        </div>
        <div className="overflow-x-auto">
          {operacoes.length === 0 ? (
            <EmptyState title="Nenhuma operação vinculada" description="Cadastre contratos de compra e venda primeiro, depois crie operações." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Sigla","Compra","Venda","Frete R$/t","Quebra tol.","Dias deságio","Comissão","Classificador","Corretor","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operacoes.map((op, i) => (
                  <tr key={op.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{op.sigla}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getCompra(op.compraId)?.sigla ?? op.compraId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getVenda(op.vendaId)?.sigla ?? op.vendaId}</td>
                    <td className="px-4 py-3 font-mono text-right text-foreground">{n(op.freteTon).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{n(op.quebraTol)}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{op.diasDesagio} dias</td>
                    <td className="px-4 py-3 text-muted-foreground">{n(op.comissaoValor)} ({op.comissaoTipo})</td>
                    <td className="px-4 py-3 text-muted-foreground">{getCl(op.classificadorId)?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getCor(op.corretorId ?? null)?.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(op)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                        <button onClick={() => del.mutate({ id: op.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
