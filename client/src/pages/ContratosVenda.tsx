import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { n } from "@/lib/calculos";

const defaultForm = {
  sigla: "", comprador: "", produto: "Soja", qualidade: "Padrão",
  volumeKg: 0, precoSc: 0,
  umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 40, avarFat: 1, queimTol: 1, queimFat: 1,
  obs: "",
};

export default function ContratosVenda() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: vendas = [], refetch } = trpc.vendas.list.useQuery();
  const save = trpc.vendas.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Contrato salvo com sucesso!"); } });
  const del = trpc.vendas.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Contrato removido."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function handleEdit(c: any) {
    setForm({
      sigla: c.sigla, comprador: c.comprador, produto: c.produto, qualidade: c.qualidade,
      volumeKg: n(c.volumeKg), precoSc: n(c.precoSc),
      umidTol: n(c.umidTol), umidFat: n(c.umidFat), impTol: n(c.impTol), impFat: n(c.impFat),
      avarTol: n(c.avarTol), avarFat: n(c.avarFat), queimTol: n(c.queimTol), queimFat: n(c.queimFat),
      obs: c.obs ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({ ...form, ...(editId ? { id: editId } : {}) });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contratos de Venda"
        description="Gerencie os contratos de venda com compradores"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Novo Contrato
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Contrato" : "Novo Contrato de Venda"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sigla do contrato" required>
                <input className={inputCls} placeholder="VEN-QUE-239" value={form.sigla} onChange={e => set("sigla", e.target.value)} required />
              </Field>
              <Field label="Comprador" required>
                <input className={inputCls} value={form.comprador} onChange={e => set("comprador", e.target.value)} required />
              </Field>
              <Field label="Produto">
                <select className={selectCls} value={form.produto} onChange={e => set("produto", e.target.value)}>
                  {["Soja","Milho","DDG","Sorgo","Farelo de Soja","Outro"].map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Qualidade">
                <select className={selectCls} value={form.qualidade} onChange={e => set("qualidade", e.target.value)}>
                  {["Padrão","Avariado","Especial"].map(q => <option key={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Volume (kg)" required>
                <input className={inputCls} type="number" step="0.01" value={form.volumeKg || ""} onChange={e => set("volumeKg", Number(e.target.value))} required />
              </Field>
              <Field label="Preço R$/sc" required>
                <input className={inputCls} type="number" step="0.01" value={form.precoSc || ""} onChange={e => set("precoSc", Number(e.target.value))} required />
              </Field>
            </div>

            <FormSection title="Classificação na descarga">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { tol: "umidTol", fat: "umidFat", label: "Umidade" },
                  { tol: "impTol", fat: "impFat", label: "Impureza" },
                  { tol: "avarTol", fat: "avarFat", label: "Avariado" },
                  { tol: "queimTol", fat: "queimFat", label: "Queimado" },
                ].map(f => (
                  <div key={f.tol} className="space-y-2">
                    <Field label={`${f.label} tol. %`}>
                      <input className={inputCls} type="number" step="0.01" value={form[f.tol]} onChange={e => set(f.tol, Number(e.target.value))} />
                    </Field>
                    <Field label={`Fator ${f.label.toLowerCase()}`}>
                      <input className={inputCls} type="number" step="0.01" value={form[f.fat]} onChange={e => set(f.fat, Number(e.target.value))} />
                    </Field>
                  </div>
                ))}
              </div>
            </FormSection>

            <Field label="Observações">
              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar contrato"}
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
          <h3 className="text-sm font-semibold text-foreground">Contratos cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          {vendas.length === 0 ? (
            <EmptyState title="Nenhum contrato de venda" description="Clique em 'Novo Contrato' para cadastrar o primeiro." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Sigla","Comprador","Produto","Qualidade","Volume (kg)","Preço R$/sc","Umid. tol.","Avar. tol.","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{c.sigla}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.comprador}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.produto}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.qualidade}</td>
                    <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.volumeKg).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.precoSc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{n(c.umidTol)}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{n(c.avarTol)}%</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                        <button onClick={() => del.mutate({ id: c.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
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
