import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Info } from "lucide-react";
import { n, brl } from "@/lib/calculos";

// ─── Regras tributárias de venda ─────────────────────────────────────────────
// Empresa: Lucro Real | Diferimento 2ª operação (MT)
// Referência: RICMS-MT, Lei 7.098/98, IN RFB 2.121/2022

type TribVenda = {
  icmsPerc: number;
  icmsBase: number; // % da base de cálculo (redução)
  icmsDesc: string;
  pisPerc: number;
  cofinsPerc: number;
  pisDesc: string;
};

function calcTribVenda(params: {
  destino: string; finalidade: string; produto: string;
}): TribVenda {
  const { destino, finalidade, produto } = params;
  const milho = produto === "Milho";

  // PIS/COFINS — Lucro Real
  // Soja: isenção (Lei 10.925/04 art. 1º)
  // Milho para indústria/ração/confinamento: alíquota zero (IN RFB 2.121/22 art. 29)
  // Milho para trading/comercialização interna: 1,65% + 7,6% = 9,25%
  // Exportação: alíquota zero
  let pisPerc = 0, cofinsPerc = 0, pisDesc = "";
  if (finalidade === "exportacao") {
    pisPerc = 0; cofinsPerc = 0;
    pisDesc = "Alíquota zero — exportação (Lei 10.637/02 art. 5º)";
  } else if (!milho) {
    // Soja — isenção total
    pisPerc = 0; cofinsPerc = 0;
    pisDesc = "Isento — soja (Lei 10.925/04 art. 1º)";
  } else if (finalidade === "industria" || finalidade === "racao" || finalidade === "confinamento") {
    pisPerc = 0; cofinsPerc = 0;
    pisDesc = "Alíquota zero — milho p/ indústria/ração/confinamento (IN RFB 2.121/22 art. 29)";
  } else {
    // Milho para trading/mercado interno
    pisPerc = 1.65; cofinsPerc = 7.6;
    pisDesc = "PIS 1,65% + COFINS 7,6% — milho p/ comercialização (Lucro Real)";
  }

  // ICMS — MT (diferimento 2ª operação para soja e milho)
  let icmsPerc = 0, icmsBase = 100, icmsDesc = "";
  if (destino === "intraestadual") {
    // MT → MT: diferimento total na 2ª operação (RICMS-MT art. 333)
    icmsPerc = 0; icmsBase = 0;
    icmsDesc = "Diferimento total — operação intraestadual MT (RICMS-MT art. 333)";
  } else if (destino === "interestadual") {
    if (finalidade === "exportacao") {
      icmsPerc = 0; icmsBase = 0;
      icmsDesc = "Imunidade — exportação (CF/88 art. 155 §2º X 'a')";
    } else if (finalidade === "industria" || finalidade === "racao" || finalidade === "confinamento") {
      // Soja/milho p/ indústria interestadual: redução de base (RICMS-MT Anexo V)
      // Soja: base reduzida a 30,61% → carga efetiva ~3,67% (alíquota 12%)
      // Milho: base reduzida a 41,67% → carga efetiva ~5% (alíquota 12%)
      icmsPerc = 12; icmsBase = milho ? 41.67 : 30.61;
      icmsDesc = milho
        ? "ICMS 12% s/ base reduzida 41,67% → carga efetiva ~5% (milho interestadual p/ indústria)"
        : "ICMS 12% s/ base reduzida 30,61% → carga efetiva ~3,67% (soja interestadual p/ indústria)";
    } else {
      // Trading interestadual: alíquota cheia 12%
      icmsPerc = 12; icmsBase = 100;
      icmsDesc = "ICMS 12% base cheia — venda interestadual p/ trading/comercialização";
    }
  }

  return { icmsPerc, icmsBase, icmsDesc, pisPerc, cofinsPerc, pisDesc };
}

const defaultForm = {
  sigla: "", comprador: "", produto: "Soja", qualidade: "Padrão",
  volumeKg: 0, precoSc: 0,
  destino: "interestadual", finalidade: "industria",
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

  const trib = useMemo(() => calcTribVenda({
    destino: form.destino, finalidade: form.finalidade, produto: form.produto,
  }), [form.destino, form.finalidade, form.produto]);

  const cargaEfetiva = trib.icmsPerc * trib.icmsBase / 100;
  const custoTribSc = form.precoSc > 0
    ? (form.precoSc * cargaEfetiva / 100) + (form.precoSc * (trib.pisPerc + trib.cofinsPerc) / 100)
    : 0;

  function handleEdit(c: any) {
    setForm({
      sigla: c.sigla, comprador: c.comprador, produto: c.produto, qualidade: c.qualidade,
      volumeKg: n(c.volumeKg), precoSc: n(c.precoSc),
      destino: c.destinoVenda ?? "interestadual",
      finalidade: c.finalidadeVenda ?? "industria",
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

            <FormSection title="Tributação da operação de venda">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="Destino da operação">
                  <select className={selectCls} value={form.destino} onChange={e => set("destino", e.target.value)}>
                    <option value="intraestadual">Intraestadual (dentro do MT)</option>
                    <option value="interestadual">Interestadual (fora do MT)</option>
                  </select>
                </Field>
                <Field label="Finalidade / tipo de comprador">
                  <select className={selectCls} value={form.finalidade} onChange={e => set("finalidade", e.target.value)}>
                    <option value="industria">Indústria (esmagamento/processamento)</option>
                    <option value="racao">Fábrica de ração</option>
                    <option value="confinamento">Confinamento / pecuária</option>
                    <option value="trading">Trading / comercialização</option>
                    <option value="exportacao">Exportação (fim específico)</option>
                  </select>
                </Field>
              </div>

              {/* Painel tributário calculado */}
              <div className="rounded-lg bg-muted/20 border border-border/50 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Info size={13} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground">Análise tributária — Lucro Real | Diferimento MT (2ª op.)</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ICMS */}
                  <div className="rounded-lg bg-card border border-border/50 p-3 space-y-1">
                    <p className="text-xs font-semibold text-foreground">ICMS</p>
                    <p className="text-xs text-muted-foreground">{trib.icmsDesc}</p>
                    <div className="flex gap-3 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Alíquota</p>
                        <p className="text-sm font-bold font-mono text-foreground">{trib.icmsPerc}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Base de cálculo</p>
                        <p className="text-sm font-bold font-mono text-foreground">{trib.icmsBase}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Carga efetiva</p>
                        <p className={`text-sm font-bold font-mono ${cargaEfetiva > 0 ? "text-amber-400" : "text-emerald-400"}`}>{cargaEfetiva.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                  {/* PIS/COFINS */}
                  <div className="rounded-lg bg-card border border-border/50 p-3 space-y-1">
                    <p className="text-xs font-semibold text-foreground">PIS / COFINS</p>
                    <p className="text-xs text-muted-foreground">{trib.pisDesc}</p>
                    <div className="flex gap-3 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">PIS</p>
                        <p className={`text-sm font-bold font-mono ${trib.pisPerc > 0 ? "text-amber-400" : "text-emerald-400"}`}>{trib.pisPerc}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">COFINS</p>
                        <p className={`text-sm font-bold font-mono ${trib.cofinsPerc > 0 ? "text-amber-400" : "text-emerald-400"}`}>{trib.cofinsPerc}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className={`text-sm font-bold font-mono ${(trib.pisPerc + trib.cofinsPerc) > 0 ? "text-amber-400" : "text-emerald-400"}`}>{(trib.pisPerc + trib.cofinsPerc).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                {form.precoSc > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                    <p className="text-xs text-amber-300">Custo tributário estimado por saca</p>
                    <p className="text-sm font-bold font-mono text-amber-400">{brl(custoTribSc)}/sc</p>
                  </div>
                )}
              </div>
            </FormSection>

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
                  {["Sigla","Comprador","Produto","Volume (kg)","Preço R$/sc","Destino","Finalidade","ICMS ef.","PIS+COFINS","Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((c, i) => {
                  const t = calcTribVenda({ destino: c.destinoVenda ?? "interestadual", finalidade: c.finalidadeVenda ?? "industria", produto: c.produto });
                  const ef = t.icmsPerc * t.icmsBase / 100;
                  return (
                    <tr key={c.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{c.sigla}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.comprador}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.produto}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.volumeKg).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{n(c.precoSc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{c.destinoVenda === "intraestadual" ? "Intraest." : "Interest."}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{c.finalidadeVenda ?? "—"}</td>
                      <td className={`px-4 py-3 font-mono ${ef > 0 ? "text-amber-400" : "text-emerald-400"}`}>{ef.toFixed(2)}%</td>
                      <td className={`px-4 py-3 font-mono ${(t.pisPerc + t.cofinsPerc) > 0 ? "text-amber-400" : "text-emerald-400"}`}>{(t.pisPerc + t.cofinsPerc).toFixed(2)}%</td>
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
