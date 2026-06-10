import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, FormSection, Field, EmptyState, StatusBadge, PreviewRow, inputCls, selectCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Calculator, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { n, brl, calcEmbarque } from "@/lib/calculos";

const defaultForm = {
  operacaoId: 0, dataEmbarque: "", placa: "", nfeEntrada: "", nfeSaida: "",
  pesoOrigem: 0, status: "Em trânsito" as const,
  umidade: 0, imp: 0, avar: 0, queim: 0,
};

type NfStatus = "idle" | "loading" | "success" | "error";

interface NfInfo {
  status: NfStatus;
  filename?: string;
  dados?: Record<string, any>;
  error?: string;
}

export default function Embarques() {
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nfEntradaInfo, setNfEntradaInfo] = useState<NfInfo>({ status: "idle" });
  const [nfSaidaInfo, setNfSaidaInfo] = useState<NfInfo>({ status: "idle" });
  const fileEntradaRef = useRef<HTMLInputElement>(null);
  const fileSaidaRef = useRef<HTMLInputElement>(null);

  const { data: embarques = [], refetch } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const save = trpc.embarques.save.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setForm({ ...defaultForm });
      setEditId(null);
      setNfEntradaInfo({ status: "idle" });
      setNfSaidaInfo({ status: "idle" });
      toast.success("Embarque salvo!");
    }
  });
  const del = trpc.embarques.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Embarque removido."); } });
  const extrairNf = trpc.nf.extrair.useMutation();

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const selectedOp = operacoes.find(o => o.id === Number(form.operacaoId));
  const selectedCompra = compras.find(c => c.id === selectedOp?.compraId);
  const selectedVenda = vendas.find(v => v.id === selectedOp?.vendaId);

  const preview = useMemo(() => {
    if (!selectedCompra || !form.pesoOrigem || !cfg) return null;
    return calcEmbarque({
      pesoOrigem: n(form.pesoOrigem),
      umidade: n(form.umidade), imp: n(form.imp), avar: n(form.avar), queim: n(form.queim),
      cc: {
        precoSc: n(selectedCompra.precoSc),
        umidTol: n(selectedCompra.umidTol), umidFat: n(selectedCompra.umidFat),
        impTol: n(selectedCompra.impTol), impFat: n(selectedCompra.impFat),
        avarTol: n(selectedCompra.avarTol), avarFat: n(selectedCompra.avarFat),
        queimTol: n(selectedCompra.queimTol), queimFat: n(selectedCompra.queimFat),
      },
      cfg: { fethabRsTon: n(cfg.fethabRsTon), iagroRsTon: n(cfg.iagroRsTon), senarPerc: n(cfg.senarPerc), funruralPerc: n(cfg.funruralPerc), fundoMes: n(cfg.fundoMes), dmais: n(cfg.dmais ?? 2) },
      flags: {
        reterFethab: (selectedCompra as any).reterFethab !== false,
        reterIagro: (selectedCompra as any).reterIagro !== false,
        reterSenar: (selectedCompra as any).reterSenar !== false,
        reterFunrural: (selectedCompra as any).reterFunrural !== false,
      },
    });
  }, [form.operacaoId, form.pesoOrigem, form.umidade, form.imp, form.avar, form.queim, selectedCompra, cfg]);

  async function handleNfUpload(file: File, tipo: "entrada" | "saida") {
    const MAX_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 16 MB.");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const mimeType = file.type || "application/pdf";
    if (!allowed.includes(mimeType) && !file.name.toLowerCase().match(/\.(pdf|jpg|jpeg|png|webp)$/)) {
      toast.error("Formato não suportado. Use PDF, JPG, PNG ou WEBP.");
      return;
    }

    const setInfo = tipo === "entrada" ? setNfEntradaInfo : setNfSaidaInfo;
    setInfo({ status: "loading", filename: file.name });

    try {
      // Converter para base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);

      const result = await extrairNf.mutateAsync({
        pdfBase64: fileBase64,
        filename: file.name,
        tipo,
      });

      const d = result.dados;
      setInfo({ status: "success", filename: file.name, dados: d });

      // Preencher campos automaticamente com os dados extraídos
      if (tipo === "saida") {
        // NF de saída: usamos como referência principal
        if (d.dataEmissao) set("dataEmbarque", d.dataEmissao);
        if (d.placa) set("placa", d.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase());
        if (d.numeroNF) set("nfeSaida", d.numeroNF);
        if (d.pesoLiquido) set("pesoOrigem", d.pesoLiquido);
        toast.success(`NF de saída lida com sucesso! ${d.numeroNF ? `NF ${d.numeroNF}` : ""} — ${d.pesoLiquido ? `${d.pesoLiquido.toLocaleString("pt-BR")} kg` : ""}`);
      } else {
        // NF de entrada: complementa dados que ainda não foram preenchidos
        // Usa callback funcional para evitar estado stale após await
        if (d.numeroNF) set("nfeEntrada", d.numeroNF);
        if (d.placa) setForm((f: any) => ({ ...f, placa: f.placa || d.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase() }));
        if (d.dataEmissao) setForm((f: any) => ({ ...f, dataEmbarque: f.dataEmbarque || d.dataEmissao }));
        toast.success(`NF de entrada lida com sucesso! ${d.numeroNF ? `NF ${d.numeroNF}` : ""}`);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Erro ao processar o PDF.";
      setInfo({ status: "error", filename: file.name, error: msg });
      toast.error(`Erro ao ler NF: ${msg}`);
    }
  }

  function handleEdit(em: any) {
    setForm({
      operacaoId: em.operacaoId, dataEmbarque: em.dataEmbarque ? new Date(em.dataEmbarque).toISOString().slice(0, 10) : "",
      placa: em.placa ?? "", nfeEntrada: em.nfeEntrada ?? "", nfeSaida: em.nfeSaida ?? "",
      pesoOrigem: n(em.pesoOrigem), status: em.status,
      umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
    });
    setEditId(em.id);
    setNfEntradaInfo({ status: "idle" });
    setNfSaidaInfo({ status: "idle" });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.operacaoId) { toast.error("Selecione a operação."); return; }
    if (!form.pesoOrigem) { toast.error("Informe o peso de origem."); return; }
    save.mutate({ ...form, operacaoId: Number(form.operacaoId), ...(editId ? { id: editId } : {}) });
  }

  const getOp = (id: number) => operacoes.find(o => o.id === id);
  const getCompra = (id: number) => compras.find(c => c.id === id);
  const getVenda = (id: number) => vendas.find(v => v.id === id);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lançar Embarque"
        description="Faça upload das notas fiscais para preenchimento automático ou insira os dados manualmente"
        action={
          <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setNfEntradaInfo({ status: "idle" }); setNfSaidaInfo({ status: "idle" }); setShowForm(true); }}>
            <Plus size={13} /> Novo Embarque
          </Button>
        }
      />

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground">{editId ? "Editar Embarque" : "Novo Embarque"}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Operação" required>
                <select className={selectCls} value={form.operacaoId || ""} onChange={e => set("operacaoId", Number(e.target.value))} required>
                  <option value="">Selecione a operação...</option>
                  {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
                </select>
              </Field>

              {selectedOp && (
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                  <div>Compra: <span className="text-foreground font-medium">{getCompra(selectedOp.compraId)?.sigla}</span> — {getCompra(selectedOp.compraId)?.fornecedor}</div>
                  <div>Venda: <span className="text-foreground font-medium">{getVenda(selectedOp.vendaId)?.sigla}</span> — {getVenda(selectedOp.vendaId)?.comprador}</div>
                </div>
              )}

              {/* Upload de Notas Fiscais */}
              <FormSection title="Notas Fiscais — Upload de PDF">
                <p className="text-xs text-muted-foreground mb-3">
                  Faça upload do PDF da nota fiscal para preenchimento automático dos campos. A <strong className="text-foreground">NF de saída</strong> é usada como referência principal (data, placa, peso e número). A <strong className="text-foreground">NF de entrada</strong> complementa os dados.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* NF de Entrada */}
                  <NfUploadCard
                    label="NF de Entrada"
                    sublabel="(do fornecedor)"
                    info={nfEntradaInfo}
                    inputRef={fileEntradaRef}
                    onFile={f => handleNfUpload(f, "entrada")}
                    onClear={() => { setNfEntradaInfo({ status: "idle" }); if (fileEntradaRef.current) fileEntradaRef.current.value = ""; }}
                  />
                  {/* NF de Saída */}
                  <NfUploadCard
                    label="NF de Saída"
                    sublabel="(nossa nota — referência principal)"
                    info={nfSaidaInfo}
                    inputRef={fileSaidaRef}
                    onFile={f => handleNfUpload(f, "saida")}
                    onClear={() => { setNfSaidaInfo({ status: "idle" }); if (fileSaidaRef.current) fileSaidaRef.current.value = ""; }}
                    highlight
                  />
                </div>
              </FormSection>

              {/* Campos principais */}
              <FormSection title="Dados do embarque">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Data do embarque">
                    <input className={inputCls} type="date" value={form.dataEmbarque} onChange={e => set("dataEmbarque", e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente pela data de emissão da NF de saída</p>
                  </Field>
                  <Field label="Placa do veículo">
                    <input className={inputCls} placeholder="Ex: ABC1234" value={form.placa} onChange={e => set("placa", e.target.value.toUpperCase())} maxLength={8} />
                    <p className="text-xs text-muted-foreground mt-1">Extraído automaticamente da NF</p>
                  </Field>
                  <Field label="Número NF de entrada">
                    <input className={inputCls} placeholder="Apenas dígitos" value={form.nfeEntrada} onChange={e => set("nfeEntrada", e.target.value)} />
                  </Field>
                  <Field label="Número NF de saída">
                    <input className={inputCls} placeholder="Apenas dígitos" value={form.nfeSaida} onChange={e => set("nfeSaida", e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Extraído da NF de saída</p>
                  </Field>
                  <Field label="Peso de origem (kg)" required>
                    <input className={inputCls} type="number" step="0.01" value={form.pesoOrigem || ""} onChange={e => set("pesoOrigem", Number(e.target.value))} required />
                    <p className="text-xs text-muted-foreground mt-1">Peso líquido da NF de saída</p>
                  </Field>
                  <Field label="Status">
                    <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
                      {["Em trânsito", "Descarga pendente"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">O status "Finalizada" é definido automaticamente ao registrar a descarga</p>
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Classificação na origem (manual)">
                <p className="text-xs text-muted-foreground mb-3">Informe os resultados da análise de classificação realizada na origem.</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "umidade", label: "Umidade %" },
                    { key: "imp", label: "Impureza %" },
                    { key: "avar", label: "Avariado %" },
                    { key: "queim", label: "Queimado %" },
                  ].map(f => (
                    <Field key={f.key} label={f.label}>
                      <input className={inputCls} type="number" step="0.01" value={form[f.key] || ""} onChange={e => set(f.key, Number(e.target.value))} />
                    </Field>
                  ))}
                </div>
              </FormSection>

              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-brand text-white text-xs" disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : "Salvar embarque"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setForm({ ...defaultForm }); setEditId(null); setNfEntradaInfo({ status: "idle" }); setNfSaidaInfo({ status: "idle" }); }}>
                  Limpar
                </Button>
              </div>
            </form>
          </div>

          {/* Preview em tempo real */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Preview de cálculo</h3>
            </div>
            {!preview ? (
              <p className="text-xs text-muted-foreground">Selecione a operação e informe o peso de origem para ver o preview financeiro em tempo real.</p>
            ) : (
              <div className="space-y-1">
                <PreviewRow label="Peso de origem" value={`${n(form.pesoOrigem).toLocaleString("pt-BR")} kg`} />
                <PreviewRow label="Desconto umidade" value={`${preview.cls.umid.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto impureza" value={`${preview.cls.imp.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto avariado" value={`${preview.cls.avar.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Desconto queimado" value={`${preview.cls.queim.kgDesc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Peso líquido compra" value={`${preview.kgCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`} />
                <PreviewRow label="Sacas compra" value={`${preview.scCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} sc`} />
                <PreviewRow label="Valor de compra" value={brl(preview.valorCompra)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="FETHAB" value={brl(preview.retFethab)} />
                <PreviewRow label="IAGRO" value={brl(preview.retIagro)} />
                <PreviewRow label="SENAR" value={brl(preview.retSenar)} />
                <PreviewRow label="FUNRURAL" value={brl(preview.retFun)} />
                <div className="h-px bg-border my-2" />
                <PreviewRow label="Valor a pagar" value={brl(preview.valorPagar)} highlight />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Embarques registrados</h3>
        </div>
        <div className="overflow-x-auto">
          {embarques.length === 0 ? (
            <EmptyState title="Nenhum embarque registrado" description="Cadastre operações primeiro, depois lance os embarques." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Operação", "Placa", "NF Entrada", "NF Saída", "Data", "Peso Orig. (kg)", "Umid.", "Imp.", "Avar.", "Queim.", "Status", "Ações"].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {embarques.map((em, i) => {
                  const op = getOp(em.operacaoId);
                  return (
                    <tr key={em.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-3 py-3 font-medium text-foreground">{op?.sigla ?? em.operacaoId}</td>
                      <td className="px-3 py-3 text-muted-foreground font-mono">{em.placa || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.nfeEntrada || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.nfeSaida || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-3 py-3 font-mono text-right text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.umidade)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.imp)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.avar)}%</td>
                      <td className="px-3 py-3 text-muted-foreground">{n(em.queim)}%</td>
                      <td className="px-3 py-3"><StatusBadge status={em.status} /></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(em)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                          <button onClick={() => del.mutate({ id: em.id })} className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
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

// ─── Componente de Upload de NF ──────────────────────────────────────────────
interface NfUploadCardProps {
  label: string;
  sublabel?: string;
  info: NfInfo;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onClear: () => void;
  highlight?: boolean;
}

function NfUploadCard({ label, sublabel, info, inputRef, onFile, onClear, highlight }: NfUploadCardProps) {
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/10"
      } ${info.status === "success" ? "border-emerald-500/40 bg-emerald-500/5" : ""}
      ${info.status === "error" ? "border-destructive/40 bg-destructive/5" : ""}`}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        {info.status !== "idle" && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
            <X size={12} />
          </button>
        )}
      </div>

      {info.status === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-1.5 py-3 rounded-md hover:bg-accent/30 transition-colors"
        >
          <Upload size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Clique ou arraste o PDF aqui</span>
        </button>
      )}

      {info.status === "loading" && (
        <div className="flex flex-col items-center gap-2 py-3">
          <Loader2 size={16} className="text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Lendo nota fiscal...</span>
          <span className="text-xs text-muted-foreground truncate max-w-full">{info.filename}</span>
        </div>
      )}

      {info.status === "success" && info.dados && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span className="text-xs font-medium text-emerald-400">Leitura concluída</span>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={11} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{info.filename}</span>
          </div>
          {[
            { key: "numeroNF", label: "NF" },
            { key: "dataEmissao", label: "Data" },
            { key: "placa", label: "Placa" },
            { key: "pesoLiquido", label: "Peso Líq." },
            { key: "fornecedor", label: "Emitente" },
          ].map(({ key, label: lbl }) => info.dados![key] != null && (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{lbl}</span>
              <span className="text-foreground font-mono truncate max-w-[60%] text-right">
                {key === "pesoLiquido"
                  ? `${Number(info.dados![key]).toLocaleString("pt-BR")} kg`
                  : String(info.dados![key])}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Trocar arquivo
          </button>
        </div>
      )}

      {info.status === "error" && (
        <div className="flex flex-col items-center gap-2 py-2">
          <AlertCircle size={16} className="text-destructive" />
          <span className="text-xs text-destructive text-center">{info.error ?? "Erro ao ler o PDF"}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
