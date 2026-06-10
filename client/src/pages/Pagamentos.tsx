import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, Field, EmptyState, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, X, Upload, Loader2, FileText, ExternalLink } from "lucide-react";
import { n, brl } from "@/lib/calculos";

const defaultForm = {
  compraId: 0, valor: 0, banco: "", formaPagamento: "pix" as const,
  numeroBoleto: "", chavePix: "", obs: "", dataPagamento: "",
  comprovanteUrl: "",
};

export default function Pagamentos() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [showForm, setShowForm] = useState(false);
  const [filtroCompra, setFiltroCompra] = useState<number | "">("");
  const [uploadingComp, setUploadingComp] = useState(false);
  const compInputRef = useRef<HTMLInputElement>(null);

  const { data: pagamentos = [], refetch } = trpc.pagamentos.list.useQuery({});
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: embarques = [] } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: descargas = [] } = trpc.descargas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const save = trpc.pagamentos.save.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ ...defaultForm }); toast.success("Pagamento registrado!"); } });
  const del = trpc.pagamentos.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Pagamento removido."); } });
  const extractComp = trpc.pagamentos.extractComprovante.useMutation();

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.compraId) { toast.error("Selecione o contrato de compra."); return; }
    if (!form.valor) { toast.error("Informe o valor pago."); return; }
    save.mutate({ ...form, compraId: Number(form.compraId), valor: n(form.valor) });
  }

  async function handleUploadComprovante(file: File) {
    if (!file) return;
    setUploadingComp(true);
    try {
      // Usar arrayBuffer + btoa para garantir tratamento correto de erros assíncronos
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const result = await extractComp.mutateAsync({ base64, mimeType });
      if (result) {
        if (result.valor) set("valor", result.valor);
        if (result.dataPagamento) set("dataPagamento", result.dataPagamento);
        if (result.formaPagamento) set("formaPagamento", result.formaPagamento);
        if (result.numeroBoleto) set("numeroBoleto", result.numeroBoleto);
        if (result.chavePix) set("chavePix", result.chavePix);
        if (result.banco) set("banco", result.banco);
        if (result.obs) set("obs", result.obs);
        if (result.comprovanteUrl) set("comprovanteUrl", result.comprovanteUrl);
        toast.success("Comprovante lido com sucesso!");
      }
    } catch (err: any) {
      toast.error(`Erro ao processar o comprovante: ${err?.message ?? "tente novamente"}`);
    } finally {
      setUploadingComp(false);
    }
  }

  function calcValorTotalCompra(compraId: number): number {
    const ops = operacoes.filter(o => o.compraId === compraId);
    const ems = embarques.filter(e => ops.some(o => o.id === e.operacaoId));
    const cc = compras.find(c => c.id === compraId);
    if (!cc) return 0;
    const cfgN = {
      fethabRsTon: n(cfg?.fethabRsTon), iagroRsTon: n(cfg?.iagroRsTon),
      senarPerc: n(cfg?.senarPerc), funruralPerc: n(cfg?.funruralPerc),
      fundoMes: n(cfg?.fundoMes), dmais: n(cfg?.dmais ?? 2),
    };
    const flags = {
      reterFethab: (cc as any).reterFethab !== false,
      reterIagro: (cc as any).reterIagro !== false,
      reterSenar: (cc as any).reterSenar !== false,
      reterFunrural: (cc as any).reterFunrural !== false,
    };
    return ems.reduce((acc, em) => {
      const desc = (descargas as any[]).find((d: any) => d.embarqueId === em.id);
      if (em.status === "Finalizada" && desc) {
        // Embarque finalizado: usa peso real da descarga
        // valorPagar = valorCompra - retencoes (retenções não são pagas ao produtor)
        const kgCompra = Math.max(0, n(desc.pesoDescarga));
        const valorCompra = (kgCompra / 60) * n(cc.precoSc);
        const toneladas = kgCompra / 1000;
        const retFethab = flags.reterFethab ? toneladas * cfgN.fethabRsTon : 0;
        const retIagro = flags.reterIagro ? toneladas * cfgN.iagroRsTon : 0;
        const retSenar = flags.reterSenar ? valorCompra * cfgN.senarPerc / 100 : 0;
        const retFun = flags.reterFunrural ? valorCompra * cfgN.funruralPerc / 100 : 0;
        return acc + valorCompra - retFethab - retIagro - retSenar - retFun;
      } else {
        // Embarque não finalizado: estimativa pelo peso de origem sem retenções
        const kgEst = Math.max(0, n(em.pesoOrigem));
        const valorEst = (kgEst / 60) * n(cc.precoSc);
        const toneladas = kgEst / 1000;
        const retFethab = flags.reterFethab ? toneladas * cfgN.fethabRsTon : 0;
        const retIagro = flags.reterIagro ? toneladas * cfgN.iagroRsTon : 0;
        const retSenar = flags.reterSenar ? valorEst * cfgN.senarPerc / 100 : 0;
        const retFun = flags.reterFunrural ? valorEst * cfgN.funruralPerc / 100 : 0;
        return acc + valorEst - retFethab - retIagro - retSenar - retFun;
      }
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
          const saldoRaw = total - pago;
          const saldo = Math.max(0, saldoRaw);
          const temCredito = saldoRaw < -0.01;
          const perc = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.sigla}</p>
                  <p className="text-xs text-muted-foreground">{c.fornecedor}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${temCredito ? "bg-emerald-500/15 text-emerald-400" : saldo > 0 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                  {temCredito ? "Crédito" : saldo > 0 ? "Pendente" : "Quitado"}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/40 mb-3">
                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${perc}%` }} />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Líquido ao produtor</span>
                  <span className="font-mono text-foreground">{brl(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total pago</span>
                  <span className="font-mono text-emerald-400">{brl(pago)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                  {temCredito ? (
                    <>
                      <span className="text-emerald-400 font-medium">Crédito c/ Fornecedor</span>
                      <span className="font-mono font-bold text-emerald-400">{brl(Math.abs(saldoRaw))}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground font-medium">Saldo a pagar</span>
                      <span className={`font-mono font-bold ${saldo > 0 ? "text-red-400" : "text-emerald-400"}`}>{brl(saldo)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Registrar Pagamento</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Upload comprovante */}
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => compInputRef.current?.click()}>
              <input ref={compInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => e.target.files?.[0] && handleUploadComprovante(e.target.files[0])} />
              {uploadingComp ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Lendo comprovante com IA...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Upload size={20} className="text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">Enviar comprovante de pagamento</p>
                  <p className="text-xs text-muted-foreground">PDF ou imagem — a IA preenche os campos automaticamente</p>
                </div>
              )}
            </div>

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
                  const saldoRaw = total - pago;
                  const saldo = Math.max(0, saldoRaw);
                  const temCredito = saldoRaw < -0.01;
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Banco:</span><span className="text-foreground">{cc.banco} | Ag: {cc.agencia} | Cc: {cc.conta}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Favorecido:</span><span className="text-foreground">{cc.favorecido}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">PIX:</span><span className="text-foreground font-mono">{cc.pix}</span></div>
                      <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                        {temCredito ? (
                          <><span className="text-emerald-400">Crédito c/ Fornecedor:</span><span className="font-bold text-emerald-400">{brl(Math.abs(saldoRaw))}</span></>
                        ) : (
                          <><span className="text-muted-foreground">Saldo a pagar:</span><span className={`font-bold ${saldo > 0 ? "text-red-400" : "text-emerald-400"}`}>{brl(saldo)}</span></>
                        )}
                      </div>
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
              <Field label="Forma de pagamento">
                <select className={selectCls} value={form.formaPagamento} onChange={e => set("formaPagamento", e.target.value)}>
                  {[["pix","PIX"],["ted","TED"],["doc","DOC"],["boleto","Boleto"],["cheque","Cheque"],["outro","Outro"]].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Banco">
                <input className={inputCls} placeholder="Ex: Sicredi, Bradesco..." value={form.banco} onChange={e => set("banco", e.target.value)} />
              </Field>
              <Field label="Número do comprovante / boleto">
                <input className={inputCls} value={form.numeroBoleto} onChange={e => set("numeroBoleto", e.target.value)} />
              </Field>
              <Field label="Chave PIX paga">
                <input className={inputCls} value={form.chavePix} onChange={e => set("chavePix", e.target.value)} />
              </Field>
            </div>

            {form.comprovanteUrl && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <FileText size={13} />
                <a href={form.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                  Comprovante anexado <ExternalLink size={11} />
                </a>
              </div>
            )}

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
                  {["Contrato","Fornecedor","Data","Valor","Forma","Banco","Comprovante","Obs","Ação"].map(h => (
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
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-400">{brl(n(p.valor))}</td>
                      <td className="px-4 py-3 text-muted-foreground uppercase">{p.formaPagamento || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.banco || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.comprovanteUrl
                          ? <a href={p.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1"><FileText size={11} /> Ver</a>
                          : "—"}
                      </td>
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
