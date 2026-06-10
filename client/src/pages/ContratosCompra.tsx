import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, ShieldCheck, ShieldOff } from "lucide-react";
import { n } from "@/lib/calculos";

const defaultForm = {
  sigla: "", fornecedor: "", produto: "Soja", qualidade: "Padrão",
  volumeKg: 0, precoSc: 0,
  banco: "", agencia: "", conta: "", favorecido: "", docFavorecido: "", pix: "",
  reterFunrural: true, reterFethab: true, reterIagro: false, reterSenar: false,
  umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 20, avarFat: 1, queimTol: 1, queimFat: 1,
  obs: "",
};

function ToggleSwitch({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left w-full ${checked ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-muted/20"}`}
    >
      <div className={`mt-0.5 flex-shrink-0 w-8 h-4 rounded-full transition-colors relative ${checked ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <div>
        <p className={`text-xs font-semibold ${checked ? "text-emerald-400" : "text-muted-foreground"}`}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </button>
  );
}

export default function ContratosCompra() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: compras = [], refetch } = trpc.compras.list.useQuery();
  const save = trpc.compras.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); setEditId(null); toast.success("Contrato salvo com sucesso!"); } });
  const del = trpc.compras.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Contrato removido."); } });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function handleEdit(c: any) {
    setForm({
      sigla: c.sigla, fornecedor: c.fornecedor, produto: c.produto, qualidade: c.qualidade,
      volumeKg: n(c.volumeKg), precoSc: n(c.precoSc),
      banco: c.banco, agencia: c.agencia, conta: c.conta, favorecido: c.favorecido, docFavorecido: c.docFavorecido, pix: c.pix,
      reterFunrural: c.reterFunrural ?? true,
      reterFethab: c.reterFethab ?? true,
      reterIagro: c.reterIagro ?? false,
      reterSenar: c.reterSenar ?? false,
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

  const retencaoAtiva = form.reterFunrural || form.reterFethab || form.reterIagro || form.reterSenar;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contratos de Compra"
        description="Gerencie os contratos de compra com fornecedores"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); }}>
            <Plus size={13} /> Novo Contrato
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Contrato" : "Novo Contrato de Compra"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sigla do contrato" required>
                <input className={inputCls} placeholder="COMP-GAB-239" value={form.sigla} onChange={e => set("sigla", e.target.value)} required />
              </Field>
              <Field label="Fornecedor" required>
                <input className={inputCls} value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} required />
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

            <FormSection title="Dados bancários do fornecedor">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Banco" required>
                  <input className={inputCls} value={form.banco} onChange={e => set("banco", e.target.value)} required />
                </Field>
                <Field label="Agência" required>
                  <input className={inputCls} value={form.agencia} onChange={e => set("agencia", e.target.value)} required />
                </Field>
                <Field label="Conta" required>
                  <input className={inputCls} value={form.conta} onChange={e => set("conta", e.target.value)} required />
                </Field>
                <Field label="Favorecido" required>
                  <input className={inputCls} value={form.favorecido} onChange={e => set("favorecido", e.target.value)} required />
                </Field>
                <Field label="CPF/CNPJ do favorecido" required>
                  <input className={inputCls} value={form.docFavorecido} onChange={e => set("docFavorecido", e.target.value)} required />
                </Field>
                <Field label="Chave PIX" required>
                  <input className={inputCls} value={form.pix} onChange={e => set("pix", e.target.value)} required />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Retenção tributária">
              <div className="mb-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  {retencaoAtiva
                    ? <ShieldCheck size={14} className="text-emerald-400" />
                    : <ShieldOff size={14} className="text-amber-400" />}
                  <p className="text-xs font-semibold text-foreground">
                    {retencaoAtiva ? "A trading reterá os tributos marcados na fonte" : "Nenhuma retenção — obrigação é do vendedor"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para fornecedores PJ que recolhem por conta própria, desative os tributos correspondentes.
                  Os valores das alíquotas são configurados em <strong>Configurações</strong>.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ToggleSwitch
                  checked={form.reterFunrural}
                  onChange={v => set("reterFunrural", v)}
                  label="FUNRURAL"
                  desc="PF: 1,63% | PJ: 2,23% sobre valor bruto"
                />
                <ToggleSwitch
                  checked={form.reterFethab}
                  onChange={v => set("reterFethab", v)}
                  label="FETHAB"
                  desc="R$/ton — soja MT: R$ 48,70/t"
                />
                <ToggleSwitch
                  checked={form.reterIagro}
                  onChange={v => set("reterIagro", v)}
                  label="IAGRO"
                  desc="R$/ton — retenção independente do FETHAB"
                />
                <ToggleSwitch
                  checked={form.reterSenar}
                  onChange={v => set("reterSenar", v)}
                  label="SENAR"
                  desc="0,20% sobre valor bruto — retenção independente do FUNRURAL"
                />
              </div>
            </FormSection>

            <FormSection title="Classificação na origem">
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
          {compras.length === 0 ? (
            <EmptyState title="Nenhum contrato de compra" description="Clique em 'Novo Contrato' para cadastrar o primeiro." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Sigla","Fornecedor","Produto","Volume (kg)","Preço R$/sc","Retenções","Favorecido","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.map((c, i) => {
                  const retencoes = [
                    c.reterFunrural && "FUNRURAL",
                    c.reterFethab && "FETHAB",
                    c.reterIagro && "IAGRO",
                    c.reterSenar && "SENAR",
                  ].filter(Boolean);
                  return (
                    <tr key={c.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{c.sigla}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.fornecedor}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.produto}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.volumeKg).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.precoSc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      <td className="px-4 py-3">
                        {retencoes.length > 0
                          ? <div className="flex flex-wrap gap-1">{retencoes.map((r, idx) => <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 font-medium">{r}</span>)}</div>
                          : <span className="text-xs text-amber-400">Sem retenção</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.favorecido}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(c)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                          <button onClick={() => del.mutate({ id: c.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
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
