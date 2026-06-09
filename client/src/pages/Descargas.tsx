import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, PreviewRow, inputCls, selectCls, textareaCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { X, Calculator, Upload, Loader2, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { n, brl, calcFinal } from "@/lib/calculos";

const defaultForm = {
  embarqueId: 0,
  dataDescarga: "",
  pesoDescarga: "",
  placa: "",
  nfeSaida: "",
  ticketNumero: "",
  ticketUrl: "",
  dcUmidade: "",
  dcImp: "",
  dcAvar: "",
  dcQueim: "1",
  obs: "",
};

type TicketStatus = "idle" | "loading" | "success" | "error";

export default function Descargas() {
  const [form, setForm] = useState<typeof defaultForm>({ ...defaultForm });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEmbarqueId, setSelectedEmbarqueId] = useState<number | null>(null);
  const [filtroOp, setFiltroOp] = useState<number | "">("");
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>("idle");
  const [ticketFilename, setTicketFilename] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ticketRef = useRef<HTMLInputElement>(null);

  const { data: embarques = [], refetch: refetchEmbarques } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const { data: descargaExistente } = trpc.descargas.getByEmbarque.useQuery(
    { embarqueId: selectedEmbarqueId ?? 0 },
    { enabled: (selectedEmbarqueId ?? 0) > 0 }
  );

  const save = trpc.descargas.save.useMutation({
    onSuccess: () => {
      refetchEmbarques();
      setSheetOpen(false);
      setSelectedEmbarqueId(null);
      setForm({ ...defaultForm });
      setErrors({});
      setTicketStatus("idle");
      setTicketFilename("");
      toast.success("Descarga salva com sucesso!");
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const extractTicket = trpc.nf.extrairTicket.useMutation();

  const set = (k: keyof typeof defaultForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const nx = { ...prev }; delete nx[k]; return nx; });
  };

  // Embarques em aberto (sem descarga finalizada)
  const embarquesAbertos = embarques.filter(e => e.status !== "Finalizada");
  const embarquesFiltrados = filtroOp
    ? embarquesAbertos.filter(e => e.operacaoId === filtroOp)
    : embarquesAbertos;

  const selectedEmbarque = embarques.find(e => e.id === selectedEmbarqueId);
  const selectedOp = operacoes.find(o => o.id === selectedEmbarque?.operacaoId);
  const selectedCompra = compras.find(c => c.id === selectedOp?.compraId);
  const selectedVenda = vendas.find(v => v.id === selectedOp?.vendaId);

  function handleOpenSheet(em: typeof embarques[0]) {
    setSelectedEmbarqueId(em.id);
    // Pré-preenche com dados do embarque
    setForm({
      ...defaultForm,
      embarqueId: em.id,
      placa: em.placa ?? "",
      nfeSaida: em.nfeSaida ?? "",
      // Se já existe descarga, preenche com os dados existentes
      ...(descargaExistente ? {
        dataDescarga: descargaExistente.dataDescarga ? new Date(descargaExistente.dataDescarga).toISOString().slice(0, 10) : "",
        pesoDescarga: String(n(descargaExistente.pesoDescarga) || ""),
        placa: descargaExistente.placa ?? em.placa ?? "",
        nfeSaida: descargaExistente.nfeSaida ?? em.nfeSaida ?? "",
        ticketNumero: descargaExistente.ticketNumero ?? "",
        ticketUrl: descargaExistente.ticketUrl ?? "",
        dcUmidade: String(n(descargaExistente.dcUmidade) || ""),
        dcImp: String(n(descargaExistente.dcImp) || ""),
        dcAvar: String(n(descargaExistente.dcAvar) || ""),
        dcQueim: String(n(descargaExistente.dcQueim) || "1"),
        obs: descargaExistente.obs ?? "",
      } : {}),
    });
    setErrors({});
    setTicketStatus("idle");
    setTicketFilename("");
    setSheetOpen(true);
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
      const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const result = await extractTicket.mutateAsync({ fileBase64, filename: file.name, mimeType });
      const d = result.dados;

      setForm(f => ({
        ...f,
        ...(d.pesoDescarga ? { pesoDescarga: String(d.pesoDescarga) } : {}),
        ...(d.placa ? { placa: String(d.placa).replace(/[^A-Z0-9]/gi, "").toUpperCase() } : {}),
        ...(d.dataDescarga ? { dataDescarga: String(d.dataDescarga) } : {}),
        ...(d.nfeSaida ? { nfeSaida: String(d.nfeSaida) } : {}),
        ...(d.numeroTicket ? { ticketNumero: String(d.numeroTicket) } : {}),
        ...(result.storageUrl ? { ticketUrl: result.storageUrl } : {}),
        dcUmidade: d.umidade != null ? String(d.umidade) : f.dcUmidade,
        dcImp: d.impureza != null ? String(d.impureza) : f.dcImp,
        dcAvar: d.avariado != null ? String(d.avariado) : f.dcAvar,
        dcQueim: d.queimado != null ? String(d.queimado) : "1",
      }));
      setTicketStatus("success");
      toast.success(`Ticket lido! ${d.pesoDescarga ? `${Number(d.pesoDescarga).toLocaleString("pt-BR")} kg` : ""} — Verifique os dados.`);
    } catch (err: any) {
      setTicketStatus("error");
      toast.error(`Erro ao ler ticket: ${err?.message ?? "tente novamente"}`);
    }
  }

  const preview = useMemo(() => {
    if (!selectedEmbarque || !selectedCompra || !selectedVenda || !selectedOp || !cfg) return null;
    if (!form.pesoDescarga || n(form.pesoDescarga) <= 0) return null;
    try {
      return calcFinal({
        pesoOrigem: n(selectedEmbarque.pesoOrigem),
        umidade: n(selectedEmbarque.umidade), imp: n(selectedEmbarque.imp),
        avar: n(selectedEmbarque.avar), queim: n(selectedEmbarque.queim),
        pesoDescarga: n(form.pesoDescarga),
        dcUmidade: n(form.dcUmidade), dcImp: n(form.dcImp),
        dcAvar: n(form.dcAvar), dcQueim: n(form.dcQueim) || 1,
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
          diasDesagio: selectedOp.diasDesagio ?? 0,
          comissaoValor: n(selectedOp.comissaoValor),
          comissaoTipo: selectedOp.comissaoTipo ?? "sc",
          custoClassTon: n(selectedOp.custoClassTon),
        },
        cfg: {
          fethabRsTon: n(cfg.fethabRsTon), iagroRsTon: n(cfg.iagroRsTon),
          senarPerc: n(cfg.senarPerc), funruralPerc: n(cfg.funruralPerc),
          fundoMes: n(cfg.fundoMes), dmais: n(cfg.dmais),
        },
      });
    } catch { return null; }
  }, [selectedEmbarqueId, form.pesoDescarga, form.dcUmidade, form.dcImp, form.dcAvar, form.dcQueim,
      selectedEmbarque, selectedCompra, selectedVenda, selectedOp, cfg]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.pesoDescarga || n(form.pesoDescarga) <= 0) errs.pesoDescarga = "Peso de descarga é obrigatório";
    if (!form.dataDescarga) errs.dataDescarga = "Data da descarga é obrigatória";
    if (!form.ticketNumero) errs.ticketNumero = "Número do ticket é obrigatório";
    if (!form.dcUmidade && form.dcUmidade !== "0") errs.dcUmidade = "Informe a umidade na descarga";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmbarqueId) { toast.error("Nenhuma carga selecionada."); return; }
    if (!validate()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    save.mutate({
      embarqueId: selectedEmbarqueId,
      dataDescarga: form.dataDescarga || undefined,
      pesoDescarga: n(form.pesoDescarga),
      placa: form.placa || undefined,
      nfeSaida: form.nfeSaida || undefined,
      ticketNumero: form.ticketNumero || undefined,
      ticketUrl: form.ticketUrl || undefined,
      dcUmidade: n(form.dcUmidade),
      dcImp: n(form.dcImp),
      dcAvar: n(form.dcAvar),
      dcQueim: n(form.dcQueim) || 1,
      obs: form.obs || undefined,
    });
  }

  const fieldCls = (key: string) =>
    `${inputCls} ${errors[key] ? "border-red-500 focus:ring-red-500/30" : ""}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lançar Descarga"
        description="Selecione uma carga em aberto para registrar o ticket de descarga"
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
          <p className="text-xs text-muted-foreground mt-0.5">Clique em "Lançar descarga" para abrir o formulário</p>
        </div>

        {embarquesFiltrados.length === 0 ? (
          <EmptyState
            title="Nenhuma carga em aberto"
            description={filtroOp ? "Todas as cargas desta operação foram finalizadas." : "Lance novos embarques para gerenciar as descargas."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Operação</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Placa</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">NF Entrada</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Data embarque</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Peso orig. (kg)</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Umid.</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Imp.</th>
                  <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {embarquesFiltrados.map((em, i) => {
                  const op = operacoes.find(o => o.id === em.operacaoId);
                  return (
                    <tr key={em.id} className={`border-b border-border/20 last:border-0 hover:bg-accent/10 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="px-4 py-3 font-semibold text-foreground">{op?.sigla ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">{em.placa || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{em.nfeEntrada || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right text-foreground">{n(em.umidade)}%</td>
                      <td className="px-4 py-3 text-right text-foreground">{n(em.imp)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${em.status === "Em trânsito" ? "status-transit" : "status-pending"}`}>
                          {em.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          className="gradient-brand text-white text-xs h-7 px-3"
                          onClick={() => handleOpenSheet(em)}
                        >
                          Lançar descarga
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sheet (painel lateral) de lançamento */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!open) { setSheetOpen(false); setSelectedEmbarqueId(null); setForm({ ...defaultForm }); setErrors({}); setTicketStatus("idle"); } }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-background border-border p-0">
          <SheetHeader className="px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
            <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              Lançar Descarga
              {selectedEmbarque && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {selectedEmbarque.placa || "Carga"} | {selectedOp?.sigla}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Dados do embarque (referência) */}
            {selectedEmbarque && (
              <div className="rounded-lg bg-muted/20 border border-border/50 p-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">Operação</p>
                  <p className="font-semibold text-foreground">{selectedOp?.sigla ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">Placa</p>
                  <p className="text-foreground">{selectedEmbarque.placa || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">Peso origem</p>
                  <p className="font-mono text-foreground">{n(selectedEmbarque.pesoOrigem).toLocaleString("pt-BR")} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">Umid. origem</p>
                  <p className="text-foreground">{n(selectedEmbarque.umidade)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">Imp. origem</p>
                  <p className="text-foreground">{n(selectedEmbarque.imp)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-0.5">NF Saída</p>
                  <p className="text-foreground">{selectedEmbarque.nfeSaida || "—"}</p>
                </div>
              </div>
            )}

            {/* Upload ticket */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Ticket de descarga <span className="text-muted-foreground">(PDF ou foto — opcional)</span>
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
                    <p className="text-xs font-medium text-emerald-400">Ticket lido! Dados preenchidos automaticamente.</p>
                    <p className="text-xs text-muted-foreground">{ticketFilename} — clique para enviar outro</p>
                  </div>
                ) : ticketStatus === "error" ? (
                  <div className="flex flex-col items-center gap-1 py-2">
                    <AlertCircle size={18} className="text-red-400" />
                    <p className="text-xs font-medium text-red-400">Erro na leitura — clique para tentar novamente</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Upload size={20} className="text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">Enviar ticket de descarga</p>
                    <p className="text-xs text-muted-foreground">A IA extrai peso, placa, data, NF e classificação automaticamente</p>
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
                  />
                </Field>
                <Field label="Peso de descarga (kg)" required error={errors.pesoDescarga}>
                  <input
                    className={fieldCls("pesoDescarga")}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 28500"
                    value={form.pesoDescarga}
                    onChange={e => set("pesoDescarga", e.target.value)}
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
                  <input
                    className={inputCls}
                    placeholder="Número da NF"
                    value={form.nfeSaida}
                    onChange={e => set("nfeSaida", e.target.value)}
                  />
                </Field>
                <Field label="Placa">
                  <input
                    className={inputCls}
                    placeholder="Ex: ABC1234"
                    value={form.placa}
                    onChange={e => set("placa", e.target.value.toUpperCase())}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Classificação na descarga */}
            <FormSection title="Classificação na descarga">
              <p className="text-xs text-muted-foreground mb-3">
                Preenchido automaticamente pelo ticket. Ajuste manualmente se necessário.
                <span className="text-amber-400 ml-1">Queimado padrão: 1% — altere se necessário.</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Umidade %" required error={errors.dcUmidade}>
                  <input
                    className={fieldCls("dcUmidade")}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 13.5"
                    value={form.dcUmidade}
                    onChange={e => set("dcUmidade", e.target.value)}
                  />
                </Field>
                <Field label="Impureza %">
                  <input
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 1.0"
                    value={form.dcImp}
                    onChange={e => set("dcImp", e.target.value)}
                  />
                </Field>
                <Field label="Avariado %">
                  <input
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 3.0"
                    value={form.dcAvar}
                    onChange={e => set("dcAvar", e.target.value)}
                  />
                </Field>
                <Field label="Queimado %">
                  <input
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Padrão: 1"
                    value={form.dcQueim}
                    onChange={e => set("dcQueim", e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Preview resultado */}
            {preview && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Resultado da carga</h3>
                </div>
                <div className="space-y-1">
                  <PreviewRow label="Peso origem" value={`${n(selectedEmbarque?.pesoOrigem).toLocaleString("pt-BR")} kg`} />
                  <PreviewRow label="Peso descarga" value={`${n(form.pesoDescarga).toLocaleString("pt-BR")} kg`} />
                  <PreviewRow label="Quebra" value={`${preview.quebraKg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg (${preview.quebraPerc.toFixed(4)}%)`} negative={preview.quebraExcedKg > 0} />
                  <div className="h-px bg-border my-1.5" />
                  <PreviewRow label="Kg líquido compra" value={`${preview.kgCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                  <PreviewRow label="Valor de compra" value={brl(preview.valorCompra)} />
                  <PreviewRow label="Retenções" value={brl(preview.retencoes)} />
                  <PreviewRow label="Valor a pagar" value={brl(preview.valorPagar)} />
                  <div className="h-px bg-border my-1.5" />
                  <PreviewRow label="Kg líquido venda" value={`${preview.kgVenda.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                  <PreviewRow label="Valor de venda" value={brl(preview.valorVenda)} />
                  <div className="h-px bg-border my-1.5" />
                  <PreviewRow label="Frete" value={brl(preview.frete)} />
                  <PreviewRow label="Comissão" value={brl(preview.comissao)} />
                  <PreviewRow label="Classificador" value={brl(preview.classCusto)} />
                  <PreviewRow label={`Deságio (${preview.dias} dias)`} value={brl(preview.desagio)} />
                  <PreviewRow label="Prej. quebra excedente" value={brl(preview.prejuQuebra)} negative={preview.prejuQuebra > 0} />
                  <div className="h-px bg-border my-1.5" />
                  <PreviewRow label="Resultado" value={brl(preview.resultado)} highlight />
                </div>
              </div>
            )}

            <Field label="Observações">
              <textarea
                className={textareaCls}
                value={form.obs}
                onChange={e => set("obs", e.target.value)}
                rows={2}
                placeholder="Observações adicionais..."
              />
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

            {/* Botões */}
            <div className="flex gap-2 pt-2 border-t border-border sticky bottom-0 bg-background pb-2">
              <Button
                type="submit"
                className="gradient-brand text-white text-sm flex-1"
                disabled={save.isPending}
              >
                {save.isPending ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> Salvando...</>
                ) : (
                  "Salvar descarga"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() => { setSheetOpen(false); setSelectedEmbarqueId(null); setForm({ ...defaultForm }); setErrors({}); setTicketStatus("idle"); }}
              >
                <X size={14} className="mr-1" /> Cancelar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
