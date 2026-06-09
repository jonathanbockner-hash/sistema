import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, PreviewRow, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Calculator, Upload, Loader2, Truck } from "lucide-react";
import { n, brl, calcFinal } from "@/lib/calculos";

const defaultForm = {
  embarqueId: 0, dataDescarga: "", pesoDescarga: 0,
  placa: "", nfeSaida: "", ticketNumero: "", ticketUrl: "",
  dcUmidade: 0, dcImp: 0, dcAvar: 0, dcQueim: 1, obs: "",
};

export default function Descargas() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [showForm, setShowForm] = useState(false);
  const [filtroOp, setFiltroOp] = useState<number | "">("");
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const ticketRef = useRef<HTMLInputElement>(null);

  const { data: embarques = [], refetch: refetchEmbarques } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const embarqueId = Number(form.embarqueId);
  const { data: descargaExistente } = trpc.descargas.getByEmbarque.useQuery(
    { embarqueId },
    { enabled: embarqueId > 0 }
  );

  const save = trpc.descargas.save.useMutation({ onSuccess: () => { refetchEmbarques(); setShowForm(false); setForm({ ...defaultForm }); toast.success("Descarga salva!"); } });
  const extractTicket = trpc.descargas.extractTicket.useMutation();

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const selectedEmbarque = embarques.find(e => e.id === embarqueId);
  const selectedOp = operacoes.find(o => o.id === selectedEmbarque?.operacaoId);
  const selectedCompra = compras.find(c => c.id === selectedOp?.compraId);
  const selectedVenda = vendas.find(v => v.id === selectedOp?.vendaId);

  // Embarques em aberto (sem descarga finalizada)
  const embarquesAbertos = embarques.filter(e => e.status !== "Finalizada");
  const embarquesFiltrados = filtroOp
    ? embarquesAbertos.filter(e => e.operacaoId === filtroOp)
    : embarquesAbertos;

  function handleSelectEmbarque(id: number) {
    const em = embarques.find(e => e.id === id);
    setForm({
      ...defaultForm,
      embarqueId: id,
      placa: em?.placa ?? "",
      nfeSaida: em?.nfeSaida ?? "",
    });
    if (descargaExistente) {
      setForm((f: any) => ({
        ...f,
        dataDescarga: descargaExistente.dataDescarga ? new Date(descargaExistente.dataDescarga).toISOString().slice(0, 10) : "",
        pesoDescarga: n(descargaExistente.pesoDescarga),
        placa: descargaExistente.placa ?? em?.placa ?? "",
        nfeSaida: descargaExistente.nfeSaida ?? em?.nfeSaida ?? "",
        ticketNumero: descargaExistente.ticketNumero ?? "",
        ticketUrl: descargaExistente.ticketUrl ?? "",
        dcUmidade: n(descargaExistente.dcUmidade), dcImp: n(descargaExistente.dcImp),
        dcAvar: n(descargaExistente.dcAvar), dcQueim: n(descargaExistente.dcQueim) || 1,
        obs: descargaExistente.obs ?? "",
      }));
    }
  }

  // Preenche com descarga existente ao carregar
  useMemo(() => {
    if (descargaExistente && embarqueId > 0) {
      setForm((f: any) => ({
        ...f,
        dataDescarga: descargaExistente.dataDescarga ? new Date(descargaExistente.dataDescarga).toISOString().slice(0, 10) : "",
        pesoDescarga: n(descargaExistente.pesoDescarga),
        placa: descargaExistente.placa ?? f.placa,
        nfeSaida: descargaExistente.nfeSaida ?? f.nfeSaida,
        ticketNumero: descargaExistente.ticketNumero ?? f.ticketNumero,
        ticketUrl: descargaExistente.ticketUrl ?? f.ticketUrl,
        dcUmidade: n(descargaExistente.dcUmidade), dcImp: n(descargaExistente.dcImp),
        dcAvar: n(descargaExistente.dcAvar), dcQueim: n(descargaExistente.dcQueim) || 1,
        obs: descargaExistente.obs ?? "",
      }));
    }
  }, [descargaExistente]);

  async function handleUploadTicket(file: File) {
    setUploadingTicket(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await extractTicket.mutateAsync({ base64, mimeType: file.type });
        if (result) {
          if (result.pesoDescarga) set("pesoDescarga", result.pesoDescarga);
          if (result.placa) set("placa", result.placa);
          if (result.dataDescarga) set("dataDescarga", result.dataDescarga);
          if (result.nfeSaida) set("nfeSaida", result.nfeSaida);
          if (result.ticketNumero) set("ticketNumero", result.ticketNumero);
          if (result.ticketUrl) set("ticketUrl", result.ticketUrl);
          // Classificação — preenche apenas se veio do ticket
          if (result.dcUmidade !== undefined) set("dcUmidade", result.dcUmidade);
          if (result.dcImp !== undefined) set("dcImp", result.dcImp);
          if (result.dcAvar !== undefined) set("dcAvar", result.dcAvar);
          // Queimado: usa o do ticket se existir, senão mantém padrão 1%
          set("dcQueim", result.dcQueim !== undefined ? result.dcQueim : 1);
          toast.success("Ticket lido com sucesso! Verifique os dados e ajuste se necessário.");
        }
        setUploadingTicket(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao processar o ticket.");
      setUploadingTicket(false);
    }
  }

  const preview = useMemo(() => {
    if (!selectedEmbarque || !selectedCompra || !selectedVenda || !selectedOp || !cfg) return null;
    if (!form.pesoDescarga) return null;
    return calcFinal({
      pesoOrigem: n(selectedEmbarque.pesoOrigem),
      umidade: n(selectedEmbarque.umidade), imp: n(selectedEmbarque.imp),
      avar: n(selectedEmbarque.avar), queim: n(selectedEmbarque.queim),
      pesoDescarga: n(form.pesoDescarga),
      dcUmidade: n(form.dcUmidade), dcImp: n(form.dcImp), dcAvar: n(form.dcAvar), dcQueim: n(form.dcQueim),
      cc: {
        precoSc: n(selectedCompra.precoSc),
        umidTol: n(selectedCompra.umidTol), umidFat: n(selectedCompra.umidFat),
        impTol: n(selectedCompra.impTol), impFat: n(selectedCompra.impFat),
        avarTol: n(selectedCompra.avarTol), avarFat: n(selectedCompra.avarFat),
        queimTol: n(selectedCompra.queimTol), queimFat: n(selectedCompra.queimFat),
      },
      cv: {
        precoSc: n(selectedVenda.precoSc),
        umidTol: n(selectedVenda.umidTol), umidFat: n(selectedVenda.umidFat),
        impTol: n(selectedVenda.impTol), impFat: n(selectedVenda.impFat),
        avarTol: n(selectedVenda.avarTol), avarFat: n(selectedVenda.avarFat),
        queimTol: n(selectedVenda.queimTol), queimFat: n(selectedVenda.queimFat),
      },
      op: {
        freteTon: n(selectedOp.freteTon), quebraTol: n(selectedOp.quebraTol),
        diasDesagio: selectedOp.diasDesagio, comissaoValor: n(selectedOp.comissaoValor),
        comissaoTipo: selectedOp.comissaoTipo, custoClassTon: n(selectedOp.custoClassTon),
      },
      cfg: { fethabRsTon: n(cfg.fethabRsTon), iagroRsTon: n(cfg.iagroRsTon), senarPerc: n(cfg.senarPerc), funruralPerc: n(cfg.funruralPerc), fundoMes: n(cfg.fundoMes), dmais: n(cfg.dmais) },
    });
  }, [form.embarqueId, form.pesoDescarga, form.dcUmidade, form.dcImp, form.dcAvar, form.dcQueim, selectedEmbarque, selectedCompra, selectedVenda, selectedOp, cfg]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.embarqueId) { toast.error("Selecione o embarque."); return; }
    if (!form.pesoDescarga) { toast.error("Informe o peso de descarga."); return; }
    save.mutate({ ...form, embarqueId: Number(form.embarqueId), pesoDescarga: n(form.pesoDescarga) });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lançar Descarga"
        description="Selecione a operação para ver as cargas em trânsito e lance a descarga com ticket"
      />

      {/* Filtro por operação */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filtrar por operação:</span>
        </div>
        <select className="rounded-lg border border-border bg-input text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={filtroOp} onChange={e => setFiltroOp(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas as operações</option>
          {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{embarquesFiltrados.length} carga{embarquesFiltrados.length !== 1 ? "s" : ""} em aberto</span>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground">Lançamento de Descarga</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Embarque / Carga" required>
                <select className={selectCls} value={form.embarqueId || ""} onChange={e => handleSelectEmbarque(Number(e.target.value))} required>
                  <option value="">Selecione o embarque...</option>
                  {embarquesAbertos.map(em => {
                    const op = operacoes.find(o => o.id === em.operacaoId);
                    return (
                      <option key={em.id} value={em.id}>
                        {em.placa || "Sem placa"} — NF {em.nfeEntrada || "—"} — {op?.sigla || "—"} — {n(em.pesoOrigem).toLocaleString("pt-BR")} kg
                      </option>
                    );
                  })}
                </select>
              </Field>

              {selectedEmbarque && (
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground grid grid-cols-3 gap-2">
                  <div>Operação: <span className="text-foreground font-medium">{selectedOp?.sigla}</span></div>
                  <div>Peso origem: <span className="text-foreground font-medium">{n(selectedEmbarque.pesoOrigem).toLocaleString("pt-BR")} kg</span></div>
                  <div>Status: <span className="text-foreground font-medium">{selectedEmbarque.status}</span></div>
                  <div>Umidade orig.: <span className="text-foreground">{n(selectedEmbarque.umidade)}%</span></div>
                  <div>Impureza orig.: <span className="text-foreground">{n(selectedEmbarque.imp)}%</span></div>
                  <div>Avariado orig.: <span className="text-foreground">{n(selectedEmbarque.avar)}%</span></div>
                </div>
              )}

              {/* Upload ticket */}
              <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => ticketRef.current?.click()}>
                <input ref={ticketRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUploadTicket(e.target.files[0])} />
                {uploadingTicket ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Lendo ticket com IA...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Upload size={20} className="text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">Enviar ticket de descarga</p>
                    <p className="text-xs text-muted-foreground">PDF ou foto — a IA extrai peso, placa, data, NF e classificação automaticamente</p>
                    <p className="text-xs text-amber-400/80">Queimado não encontrado no ticket → padrão 1% (editável)</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data da descarga">
                  <input className={inputCls} type="date" value={form.dataDescarga} onChange={e => set("dataDescarga", e.target.value)} />
                </Field>
                <Field label="Peso de descarga (kg)" required>
                  <input className={inputCls} type="number" step="0.01" value={form.pesoDescarga || ""} onChange={e => set("pesoDescarga", Number(e.target.value))} required />
                </Field>
                <Field label="Placa">
                  <input className={inputCls} value={form.placa} onChange={e => set("placa", e.target.value)} />
                </Field>
                <Field label="NF de saída">
                  <input className={inputCls} value={form.nfeSaida} onChange={e => set("nfeSaida", e.target.value)} />
                </Field>
                <Field label="Número do ticket">
                  <input className={inputCls} value={form.ticketNumero} onChange={e => set("ticketNumero", e.target.value)} />
                </Field>
              </div>

              <FormSection title="Classificação na descarga">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "dcUmidade", label: "Umidade %" },
                    { key: "dcImp", label: "Impureza %" },
                    { key: "dcAvar", label: "Avariado %" },
                    { key: "dcQueim", label: "Queimado %" },
                  ].map(f => (
                    <Field key={f.key} label={f.label}>
                      <input className={inputCls} type="number" step="0.01" value={form[f.key] ?? ""} onChange={e => set(f.key, Number(e.target.value))} />
                    </Field>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Queimado padrão: 1% — altere se o ticket indicar valor diferente.</p>
              </FormSection>

              <Field label="Observações">
                <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} />
              </Field>

              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : "Salvar descarga"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setForm({ ...defaultForm })}>
                  Limpar
                </Button>
              </div>
            </form>
          </div>

          {/* Preview resultado */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Resultado da carga</h3>
            </div>
            {!preview ? (
              <p className="text-xs text-muted-foreground">Selecione o embarque e informe o peso de descarga para ver o resultado.</p>
            ) : (
              <div className="space-y-1">
                <PreviewRow label="Peso origem" value={`${n(selectedEmbarque?.pesoOrigem).toLocaleString("pt-BR")} kg`} />
                <PreviewRow label="Peso descarga" value={`${n(form.pesoDescarga).toLocaleString("pt-BR")} kg`} />
                <PreviewRow label="Quebra" value={`${preview.quebraKg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg (${preview.quebraPerc.toFixed(4)}%)`} negative={preview.quebraExcedKg > 0} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Kg líquido compra" value={`${preview.kgCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Valor de compra" value={brl(preview.valorCompra)} />
                <PreviewRow label="Retenções" value={brl(preview.retencoes)} />
                <PreviewRow label="Valor a pagar" value={brl(preview.valorPagar)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Kg líquido venda" value={`${preview.kgVenda.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Valor de venda" value={brl(preview.valorVenda)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Frete" value={brl(preview.frete)} />
                <PreviewRow label="Comissão" value={brl(preview.comissao)} />
                <PreviewRow label="Classificador" value={brl(preview.classCusto)} />
                <PreviewRow label={`Deságio (${preview.dias} dias)`} value={brl(preview.desagio)} />
                <PreviewRow label="Prej. quebra excedente" value={brl(preview.prejuQuebra)} negative={preview.prejuQuebra > 0} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Resultado" value={brl(preview.resultado)} highlight />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de embarques em aberto por operação */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Cargas em aberto — aguardando ticket de descarga</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{embarquesFiltrados.length} carga{embarquesFiltrados.length !== 1 ? "s" : ""} em trânsito ou pendente de lançamento</p>
        </div>
        <div className="overflow-x-auto">
          {embarquesFiltrados.length === 0 ? (
            <EmptyState title="Nenhuma carga em aberto" description={filtroOp ? "Todas as cargas desta operação foram finalizadas." : "Lance novos embarques para gerenciar as descargas."} />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Operação","Placa","NF Entrada","Data Embarque","Peso Orig. (kg)","Umid.","Imp.","Avar.","Status","Ação"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {embarquesFiltrados.map((em, i) => {
                  const op = operacoes.find(o => o.id === em.operacaoId);
                  return (
                    <tr key={em.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{op?.sigla ?? em.operacaoId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.placa || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.nfeEntrada || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n(em.umidade)}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{n(em.imp)}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{n(em.avar)}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${em.status === "Em trânsito" ? "status-transit" : "status-pending"}`}>
                          {em.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { handleSelectEmbarque(em.id); setShowForm(true); }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Lançar descarga
                        </button>
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
