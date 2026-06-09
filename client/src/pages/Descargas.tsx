import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, PreviewRow, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Calculator, Upload, Loader2, Truck, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { n, brl, calcFinal } from "@/lib/calculos";

const defaultForm = {
  embarqueId: 0, dataDescarga: "", pesoDescarga: 0,
  placa: "", nfeSaida: "", ticketNumero: "", ticketUrl: "",
  dcUmidade: 0, dcImp: 0, dcAvar: 0, dcQueim: 1, obs: "",
};

type TicketStatus = "idle" | "loading" | "success" | "error";

export default function Descargas() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [activeEmbarqueId, setActiveEmbarqueId] = useState<number | null>(null);
  const [filtroOp, setFiltroOp] = useState<number | "">("");
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>("idle");
  const [ticketFilename, setTicketFilename] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ticketRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: embarques = [], refetch: refetchEmbarques } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const { data: descargaExistente, refetch: refetchDescarga } = trpc.descargas.getByEmbarque.useQuery(
    { embarqueId: activeEmbarqueId ?? 0 },
    { enabled: (activeEmbarqueId ?? 0) > 0 }
  );

  const save = trpc.descargas.save.useMutation({
    onSuccess: () => {
      refetchEmbarques();
      setActiveEmbarqueId(null);
      setForm({ ...defaultForm });
      setErrors({});
      setTicketStatus("idle");
      setTicketFilename("");
      toast.success("Descarga salva com sucesso!");
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });
  const extractTicket = trpc.nf.extrairTicket.useMutation();

  const set = (k: string, v: any) => {
    setForm((f: any) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  // Embarques em aberto (sem descarga finalizada)
  const embarquesAbertos = embarques.filter(e => e.status !== "Finalizada");
  const embarquesFiltrados = filtroOp
    ? embarquesAbertos.filter(e => e.operacaoId === filtroOp)
    : embarquesAbertos;

  const selectedEmbarque = embarques.find(e => e.id === activeEmbarqueId);
  const selectedOp = operacoes.find(o => o.id === selectedEmbarque?.operacaoId);
  const selectedCompra = compras.find(c => c.id === selectedOp?.compraId);
  const selectedVenda = vendas.find(v => v.id === selectedOp?.vendaId);

  // Preenche form com descarga existente quando carrega
  useEffect(() => {
    if (descargaExistente && activeEmbarqueId) {
      setForm((f: any) => ({
        ...f,
        dataDescarga: descargaExistente.dataDescarga ? new Date(descargaExistente.dataDescarga).toISOString().slice(0, 10) : "",
        pesoDescarga: n(descargaExistente.pesoDescarga),
        placa: descargaExistente.placa ?? f.placa,
        nfeSaida: descargaExistente.nfeSaida ?? f.nfeSaida,
        ticketNumero: descargaExistente.ticketNumero ?? "",
        ticketUrl: descargaExistente.ticketUrl ?? "",
        dcUmidade: n(descargaExistente.dcUmidade),
        dcImp: n(descargaExistente.dcImp),
        dcAvar: n(descargaExistente.dcAvar),
        dcQueim: n(descargaExistente.dcQueim) || 1,
        obs: descargaExistente.obs ?? "",
      }));
    }
  }, [descargaExistente]);

  // Scroll automático para o formulário quando abre
  useEffect(() => {
    if (activeEmbarqueId && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [activeEmbarqueId]);

  function handleSelectEmbarque(em: any) {
    if (activeEmbarqueId === em.id) {
      // Fechar se clicar no mesmo
      setActiveEmbarqueId(null);
      setForm({ ...defaultForm });
      setErrors({});
      setTicketStatus("idle");
      return;
    }
    setActiveEmbarqueId(em.id);
    setForm({
      ...defaultForm,
      embarqueId: em.id,
      placa: em.placa ?? "",
      nfeSaida: em.nfeSaida ?? "",
    });
    setErrors({});
    setTicketStatus("idle");
    setTicketFilename("");
    refetchDescarga();
  }

  async function handleUploadTicket(file: File) {
    const MAX_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_SIZE) { toast.error("Arquivo muito grande. Máximo: 16 MB."); return; }
    setTicketStatus("loading");
    setTicketFilename(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);
      const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const result = await extractTicket.mutateAsync({ fileBase64, filename: file.name, mimeType });
      const d = result.dados;

      setForm((f: any) => ({
        ...f,
        ...(d.pesoDescarga ? { pesoDescarga: d.pesoDescarga } : {}),
        ...(d.placa ? { placa: d.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase() } : {}),
        ...(d.dataDescarga ? { dataDescarga: d.dataDescarga } : {}),
        ...(d.nfeSaida ? { nfeSaida: d.nfeSaida } : {}),
        ...(d.numeroTicket ? { ticketNumero: d.numeroTicket } : {}),
        dcUmidade: d.umidade ?? f.dcUmidade,
        dcImp: d.impureza ?? f.dcImp,
        dcAvar: d.avariado ?? f.dcAvar,
        dcQueim: d.queimado ?? 1,
      }));
      setTicketStatus("success");
      toast.success(`Ticket lido! ${d.pesoDescarga ? `${d.pesoDescarga.toLocaleString("pt-BR")} kg` : ""} — Verifique e ajuste os dados se necessário.`);
    } catch (err: any) {
      setTicketStatus("error");
      toast.error(`Erro ao ler ticket: ${err?.message ?? "tente novamente"}`);
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
  }, [activeEmbarqueId, form.pesoDescarga, form.dcUmidade, form.dcImp, form.dcAvar, form.dcQueim, selectedEmbarque, selectedCompra, selectedVenda, selectedOp, cfg]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.pesoDescarga || n(form.pesoDescarga) <= 0) errs.pesoDescarga = "Peso de descarga é obrigatório";
    if (!form.dataDescarga) errs.dataDescarga = "Data da descarga é obrigatória";
    if (!form.ticketNumero) errs.ticketNumero = "Número do ticket é obrigatório";
    if (n(form.dcUmidade) <= 0) errs.dcUmidade = "Informe a umidade na descarga";
    if (n(form.dcImp) < 0) errs.dcImp = "Informe a impureza na descarga";
    if (n(form.dcAvar) < 0) errs.dcAvar = "Informe o avariado na descarga";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeEmbarqueId) { toast.error("Selecione uma carga para lançar a descarga."); return; }
    if (!validate()) {
      toast.error("Preencha todos os campos obrigatórios antes de salvar.");
      return;
    }
    save.mutate({ ...form, embarqueId: activeEmbarqueId, pesoDescarga: n(form.pesoDescarga) });
  }

  const fieldCls = (key: string) =>
    `${inputCls} ${errors[key] ? "border-red-500 focus:ring-red-500/30" : ""}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lançar Descarga"
        description="Selecione uma carga em aberto para lançar o ticket de descarga"
      />

      {/* Filtro por operação */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filtrar por operação:</span>
        </div>
        <select
          className="rounded-lg border border-border bg-input text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={filtroOp}
          onChange={e => setFiltroOp(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Todas as operações</option>
          {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">
          {embarquesFiltrados.length} carga{embarquesFiltrados.length !== 1 ? "s" : ""} em aberto
        </span>
      </div>

      {/* Lista de cargas em aberto */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Cargas aguardando descarga</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Clique em "Lançar descarga" para abrir o formulário de lançamento inline</p>
        </div>

        {embarquesFiltrados.length === 0 ? (
          <EmptyState
            title="Nenhuma carga em aberto"
            description={filtroOp ? "Todas as cargas desta operação foram finalizadas." : "Lance novos embarques para gerenciar as descargas."}
          />
        ) : (
          <div>
            {embarquesFiltrados.map((em, i) => {
              const op = operacoes.find(o => o.id === em.operacaoId);
              const isActive = activeEmbarqueId === em.id;
              return (
                <div key={em.id} className={`border-b border-border/30 last:border-0 ${isActive ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  {/* Linha da carga */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Operação</p>
                        <p className="font-semibold text-foreground">{op?.sigla ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Placa</p>
                        <p className="text-foreground">{em.placa || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">NF Entrada</p>
                        <p className="text-foreground">{em.nfeEntrada || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Data embarque</p>
                        <p className="text-foreground">{em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Peso orig. (kg)</p>
                        <p className="font-mono text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Umid.</p>
                        <p className="text-foreground">{n(em.umidade)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Imp.</p>
                        <p className="text-foreground">{n(em.imp)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${em.status === "Em trânsito" ? "status-transit" : "status-pending"}`}>
                          {em.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectEmbarque(em)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {isActive ? (
                        <><X size={12} /> Fechar</>
                      ) : (
                        <><ChevronDown size={12} /> Lançar descarga</>
                      )}
                    </button>
                  </div>

                  {/* Formulário inline expandido */}
                  {isActive && (
                    <div ref={formRef} className="border-t border-primary/20 bg-card/50 p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Formulário */}
                        <div className="lg:col-span-2 space-y-5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <h3 className="text-sm font-semibold text-foreground">
                              Lançamento — {em.placa || "Carga"} | {op?.sigla}
                            </h3>
                            {descargaExistente && (
                              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                Editando descarga existente
                              </span>
                            )}
                          </div>

                          <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Upload ticket */}
                            <div>
                              <p className="text-xs font-medium text-foreground mb-2">
                                Ticket de descarga <span className="text-muted-foreground">(PDF ou foto)</span>
                              </p>
                              <div
                                className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                                  ticketStatus === "success"
                                    ? "border-emerald-500/50 bg-emerald-500/5"
                                    : ticketStatus === "error"
                                    ? "border-red-500/50 bg-red-500/5"
                                    : "border-border/60 bg-muted/10 hover:border-primary/50 hover:bg-primary/5"
                                }`}
                                onClick={() => ticketRef.current?.click()}
                              >
                                <input
                                  ref={ticketRef}
                                  type="file"
                                  accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                                  className="hidden"
                                  onChange={e => e.target.files?.[0] && handleUploadTicket(e.target.files[0])}
                                />
                                {ticketStatus === "loading" ? (
                                  <div className="flex flex-col items-center gap-2 py-2">
                                    <Loader2 size={20} className="animate-spin text-primary" />
                                    <p className="text-xs text-muted-foreground">Lendo ticket com IA...</p>
                                    <p className="text-xs text-muted-foreground">{ticketFilename}</p>
                                  </div>
                                ) : ticketStatus === "success" ? (
                                  <div className="flex flex-col items-center gap-1 py-2">
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <p className="text-xs font-medium text-emerald-400">Ticket lido com sucesso!</p>
                                    <p className="text-xs text-muted-foreground">{ticketFilename}</p>
                                    <p className="text-xs text-muted-foreground">Clique para enviar outro arquivo</p>
                                  </div>
                                ) : ticketStatus === "error" ? (
                                  <div className="flex flex-col items-center gap-1 py-2">
                                    <AlertCircle size={18} className="text-red-400" />
                                    <p className="text-xs font-medium text-red-400">Erro na leitura</p>
                                    <p className="text-xs text-muted-foreground">Clique para tentar novamente</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 py-2">
                                    <Upload size={20} className="text-muted-foreground" />
                                    <p className="text-xs font-medium text-foreground">Enviar ticket de descarga</p>
                                    <p className="text-xs text-muted-foreground">PDF ou foto — a IA extrai peso, placa, data, NF e classificação</p>
                                    <p className="text-xs text-amber-400/80">Queimado ausente no ticket → padrão 1% (editável)</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dados da descarga */}
                            <FormSection title="Dados da descarga">
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Data da descarga" required error={errors.dataDescarga}>
                                  <input
                                    className={fieldCls("dataDescarga")}
                                    type="date"
                                    value={form.dataDescarga}
                                    onChange={e => set("dataDescarga", e.target.value)}
                                    required
                                  />
                                </Field>
                                <Field label="Peso de descarga (kg)" required error={errors.pesoDescarga}>
                                  <input
                                    className={fieldCls("pesoDescarga")}
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 28.500"
                                    value={form.pesoDescarga || ""}
                                    onChange={e => set("pesoDescarga", Number(e.target.value))}
                                    required
                                  />
                                </Field>
                                <Field label="Número do ticket" required error={errors.ticketNumero}>
                                  <input
                                    className={fieldCls("ticketNumero")}
                                    placeholder="Ex: 12345"
                                    value={form.ticketNumero}
                                    onChange={e => set("ticketNumero", e.target.value)}
                                  />
                                </Field>
                                <Field label="NF de saída">
                                  <input className={inputCls} value={form.nfeSaida} onChange={e => set("nfeSaida", e.target.value)} />
                                </Field>
                                <Field label="Placa">
                                  <input className={inputCls} value={form.placa} onChange={e => set("placa", e.target.value.toUpperCase())} />
                                </Field>
                              </div>
                            </FormSection>

                            {/* Classificação na descarga */}
                            <FormSection title="Classificação na descarga">
                              <p className="text-xs text-muted-foreground mb-3">
                                Preenchido automaticamente pelo ticket. Ajuste manualmente se necessário.
                                <span className="text-amber-400 ml-1">Queimado padrão: 1% — altere se o ticket indicar valor diferente.</span>
                              </p>
                              <div className="grid grid-cols-4 gap-3">
                                {[
                                  { key: "dcUmidade", label: "Umidade %", required: true },
                                  { key: "dcImp", label: "Impureza %", required: true },
                                  { key: "dcAvar", label: "Avariado %", required: true },
                                  { key: "dcQueim", label: "Queimado %", required: false },
                                ].map(f => (
                                  <Field key={f.key} label={f.label} required={f.required} error={errors[f.key]}>
                                    <input
                                      className={fieldCls(f.key)}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={form[f.key] ?? ""}
                                      onChange={e => set(f.key, Number(e.target.value))}
                                    />
                                  </Field>
                                ))}
                              </div>
                            </FormSection>

                            <Field label="Observações">
                              <textarea className={textareaCls} value={form.obs} onChange={e => set("obs", e.target.value)} rows={2} />
                            </Field>

                            {/* Erros de validação */}
                            {Object.keys(errors).length > 0 && (
                              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
                                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-red-400 mb-1">Campos obrigatórios não preenchidos:</p>
                                  <ul className="text-xs text-red-300 space-y-0.5">
                                    {Object.values(errors).map((msg, i) => <li key={i}>• {msg}</li>)}
                                  </ul>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                className="gradient-brand text-white text-xs"
                                disabled={save.isPending}
                              >
                                {save.isPending ? (
                                  <><Loader2 size={12} className="animate-spin mr-1" /> Salvando...</>
                                ) : (
                                  "Salvar descarga"
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => { setActiveEmbarqueId(null); setForm({ ...defaultForm }); setErrors({}); setTicketStatus("idle"); }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </div>

                        {/* Preview resultado */}
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Calculator size={14} className="text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">Resultado da carga</h3>
                          </div>
                          {!preview ? (
                            <p className="text-xs text-muted-foreground">Informe o peso de descarga e a classificação para ver o resultado financeiro.</p>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
