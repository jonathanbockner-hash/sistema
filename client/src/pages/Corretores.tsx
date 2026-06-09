import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { n } from "@/lib/calculos";

const defaultForm = {
  nome: "", cpfCnpj: "", pix: "",
  comissaoTipo: "sc" as const, comissaoValor: 0, obs: "",
};

export default function Corretores() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: corretores = [], refetch } = trpc.corretores.list.useQuery();
  const save = trpc.corretores.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Corretor salvo!"); } });
  const del = trpc.corretores.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Corretor removido."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function handleEdit(c: any) {
    setForm({
      nome: c.nome, cpfCnpj: c.cpfCnpj ?? "", pix: c.pix,
      comissaoTipo: c.comissaoTipo, comissaoValor: n(c.comissaoValor), obs: c.obs ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) { toast.error("Informe o nome do corretor."); return; }
    if (!form.pix) { toast.error("Informe a chave PIX do corretor."); return; }
    save.mutate({ ...form, ...(editId ? { id: editId } : {}), comissaoValor: n(form.comissaoValor) });
  }

  const comissaoTipos = [
    { value: "sc", label: "R$/saca" },
    { value: "ton", label: "R$/tonelada" },
    { value: "fixo", label: "R$ fixo" },
    { value: "perc", label: "% sobre venda" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Corretores"
        description="Cadastre os corretores com direito a comissão nas operações"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Novo Corretor
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 max-w-lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Corretor" : "Novo Corretor"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome completo" required>
              <input className={inputCls} value={form.nome} onChange={e => set("nome", e.target.value)} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF / CNPJ">
                <input className={inputCls} placeholder="000.000.000-00" value={form.cpfCnpj} onChange={e => set("cpfCnpj", e.target.value)} />
              </Field>
              <Field label="Chave PIX" required>
                <input className={inputCls} placeholder="CPF, e-mail, celular ou aleatória" value={form.pix} onChange={e => set("pix", e.target.value)} required />
              </Field>
              <Field label="Comissão padrão">
                <input className={inputCls} type="number" step="0.0001" value={form.comissaoValor} onChange={e => set("comissaoValor", Number(e.target.value))} />
              </Field>
              <Field label="Tipo de comissão">
                <select className={selectCls} value={form.comissaoTipo} onChange={e => set("comissaoTipo", e.target.value)}>
                  {comissaoTipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observações">
              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar corretor"}
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
          <h3 className="text-sm font-semibold text-foreground">Corretores cadastrados</h3>
        </div>
        <div className="overflow-x-auto">
          {corretores.length === 0 ? (
            <EmptyState title="Nenhum corretor cadastrado" description="Clique em 'Novo Corretor' para cadastrar o primeiro." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Nome","CPF/CNPJ","Chave PIX","Comissão padrão","Tipo","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corretores.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{c.cpfCnpj || "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{c.pix}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{n(c.comissaoValor).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-muted-foreground uppercase">{c.comissaoTipo}</td>
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
