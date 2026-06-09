import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, Field, EmptyState, inputCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X } from "lucide-react";

const defaultForm = { nome: "", cpf: "", pix: "", obs: "" };

export default function Classificadores() {
  const [form, setForm] = useState({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: classificadores = [], refetch } = trpc.classificadores.list.useQuery();
  const save = trpc.classificadores.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Classificador salvo!"); } });
  const del = trpc.classificadores.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Classificador removido."); } });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function handleEdit(c: any) {
    setForm({ nome: c.nome, cpf: c.cpf ?? "", pix: c.pix, obs: c.obs ?? "" });
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
        title="Classificadores"
        description="Cadastre os classificadores vinculados às operações"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Novo Classificador
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 max-w-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Classificador" : "Novo Classificador"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome" required>
              <input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} required />
            </Field>
            <Field label="CPF">
              <input className={inputCls} placeholder="000.000.000-00" value={form.cpf} onChange={e => set("cpf", e.target.value)} />
            </Field>
            <Field label="Chave PIX" required>
              <input className={inputCls} value={form.pix} onChange={e => set("pix", e.target.value)} required />
            </Field>
            <Field label="Telefone / Observação">
              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); }}>
                Limpar
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            O classificador é vinculado à operação. O custo por tonelada entra automaticamente no relatório final.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Classificadores cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          {classificadores.length === 0 ? (
            <EmptyState title="Nenhum classificador" description="Cadastre classificadores para vinculá-los às operações." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Nome","CPF","Chave PIX","Observação","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classificadores.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.cpf || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{c.pix}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.obs || "—"}</td>
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
