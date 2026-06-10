import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Upload, ExternalLink, Receipt, CheckCircle, Clock, Sparkles } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Categoria = "comissao" | "fethab" | "iagro" | "senar" | "funrural" | "classificador" | "frete" | "outro";
type FormaPagamento = "pix" | "ted" | "doc" | "boleto" | "cheque" | "outro";

const CATEGORIAS: { value: Categoria; label: string; cor: string }[] = [
  { value: "comissao",      label: "Comissão de Corretor",   cor: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "fethab",        label: "FETHAB",                 cor: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "iagro",         label: "IAGRO",                  cor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { value: "senar",         label: "SENAR",                  cor: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "funrural",      label: "FUNRURAL",               cor: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "classificador", label: "Classificador",          cor: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  { value: "frete",         label: "Frete / Transportadora", cor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { value: "outro",         label: "Outro Prestador",        cor: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
];

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "pix",    label: "PIX" },
  { value: "ted",    label: "TED" },
  { value: "doc",    label: "DOC" },
  { value: "boleto", label: "Boleto" },
  { value: "cheque", label: "Cheque" },
  { value: "outro",  label: "Outro" },
];

function categoriaInfo(cat: string) {
  return CATEGORIAS.find(c => c.value === cat) ?? { label: cat, cor: "bg-gray-500/20 text-gray-300 border-gray-500/30" };
}

function fmtBRL(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(ts: Date | string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

// ─── Formulário padrão ────────────────────────────────────────────────────────
const FORM_DEFAULT = {
  id: undefined as number | undefined,
  operacaoId: 0,
  categoria: "comissao" as Categoria,
  favorecido: "",
  descricao: "",
  valor: "",
  dataPagamento: "",
  formaPagamento: "pix" as FormaPagamento,
  comprovanteUrl: "",
  obs: "",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DespesasOperacionais() {
  const [filtroOp, setFiltroOp] = useState<number | undefined>(undefined);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroPago, setFiltroPago] = useState<string>("todas");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ ...FORM_DEFAULT });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [autoPreenchido, setAutoPreenchido] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: despesas = [], refetch } = trpc.despesas.list.useQuery(
    { operacaoId: filtroOp },
    { refetchOnWindowFocus: false }
  );
  // Detalhes da operação selecionada no formulário (para pré-preenchimento)
  const { data: opDetalhes } = trpc.operacoes.getDetalhes.useQuery(
    { id: form.operacaoId },
    { enabled: form.operacaoId > 0 && sheetOpen }
  );

  // Mutations
  const saveMut = trpc.despesas.save.useMutation({
    onSuccess: () => { toast.success("Despesa salva com sucesso!"); setSheetOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.despesas.delete.useMutation({
    onSuccess: () => { toast.success("Despesa removida."); setDeleteId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadMut = trpc.despesas.uploadComprovante.useMutation({
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });

  // ─── Pré-preenchimento automático ao mudar categoria ─────────────────────────
  useEffect(() => {
    if (!opDetalhes || !sheetOpen || form.id) return; // só para novos lançamentos
    const cat = form.categoria;
    const op = opDetalhes as any;

    if (cat === "comissao" && op.corretor) {
      const corretor = op.corretor;
      // valorEstComissao já calculado no backend com o peso real descarregado
      const valorEst: number = op.valorEstComissao ?? 0;
      const tipoLabel = op.comissaoTipo === "fixo" ? "valor fixo"
        : op.comissaoTipo === "sc" ? "por saca"
        : op.comissaoTipo === "ton" ? "por tonelada"
        : "% sobre venda";
      const pesoInfo = (op.pesoTotalDescargaTon ?? 0) > 0
        ? ` — ${Number(op.pesoTotalDescargaTon).toFixed(3)} ton descarregadas`
        : (op.pesoTotalOrigTon ?? 0) > 0
        ? ` — ${Number(op.pesoTotalOrigTon).toFixed(3)} ton estimadas`
        : "";
      setForm(f => ({
        ...f,
        favorecido: f.favorecido || corretor.nome,
        valor: f.valor || (valorEst > 0 ? String(valorEst.toFixed(2)) : ""),
        formaPagamento: corretor.pix ? "pix" : f.formaPagamento,
        descricao: f.descricao || `Comissão ${tipoLabel} — ${op.sigla}${pesoInfo}`,
      }));
      setAutoPreenchido(true);

    } else if (cat === "classificador" && op.classificador) {
      const cl = op.classificador;
      // valorEstClassificador já calculado no backend com o peso real descarregado
      const valorEst: number = op.valorEstClassificador ?? 0;
      const pesoInfo = (op.pesoTotalDescargaTon ?? 0) > 0
        ? ` (${Number(op.pesoTotalDescargaTon).toFixed(3)} ton × R$ ${parseFloat(String(op.custoClassTon ?? 0)).toFixed(3)}/ton)`
        : "";
      setForm(f => ({
        ...f,
        favorecido: f.favorecido || cl.nome,
        valor: f.valor || (valorEst > 0 ? String(valorEst.toFixed(2)) : ""),
        formaPagamento: cl.pix ? "pix" : f.formaPagamento,
        descricao: f.descricao || `Classificação — ${op.sigla}${pesoInfo}`,
      }));
      setAutoPreenchido(true);

    } else {
      setAutoPreenchido(false);
    }
  }, [form.categoria, opDetalhes, sheetOpen, form.id]);

  // Filtros locais
  const despesasFiltradas = despesas.filter(d => {
    if (filtroCategoria !== "todas" && d.categoria !== filtroCategoria) return false;
    if (filtroPago === "aberto" && (d as any).pago) return false;
    if (filtroPago === "pago" && !(d as any).pago) return false;
    return true;
  });

  // Totais por categoria
  const totaisPorCategoria = despesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] ?? 0) + Number(d.valor);
    return acc;
  }, {} as Record<string, number>);
  const totalGeral = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const totalPago = despesas.filter(d => (d as any).pago).reduce((s, d) => s + Number(d.valor), 0);
  const totalAberto = totalGeral - totalPago;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleNovo() {
    setAutoPreenchido(false);
    setForm({ ...FORM_DEFAULT, operacaoId: filtroOp ?? (operacoes[0]?.id ?? 0) });
    setSheetOpen(true);
  }

  function handleEdit(d: typeof despesas[0]) {
    setAutoPreenchido(false);
    setForm({
      id: d.id,
      operacaoId: d.operacaoId,
      categoria: d.categoria as Categoria,
      favorecido: d.favorecido,
      descricao: d.descricao ?? "",
      valor: String(d.valor),
      dataPagamento: d.dataPagamento ? new Date(d.dataPagamento).toISOString().split("T")[0] : "",
      formaPagamento: (d.formaPagamento ?? "pix") as FormaPagamento,
      comprovanteUrl: d.comprovanteUrl ?? "",
      obs: d.obs ?? "",
    });
    setSheetOpen(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10 MB)"); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { comprovanteUrl } = await uploadMut.mutateAsync({ base64, mimeType: file.type });
      setForm(f => ({ ...f, comprovanteUrl }));
      toast.success("Comprovante enviado!");
    } catch {
      toast.error("Falha no upload do comprovante.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.operacaoId) { toast.error("Selecione uma operação"); return; }
    if (!form.favorecido.trim()) { toast.error("Informe o favorecido"); return; }
    const valor = parseFloat(form.valor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) { toast.error("Informe um valor válido"); return; }
    saveMut.mutate({
      id: form.id,
      operacaoId: form.operacaoId,
      categoria: form.categoria,
      favorecido: form.favorecido.trim(),
      descricao: form.descricao || undefined,
      valor,
      dataPagamento: form.dataPagamento || null,
      formaPagamento: form.formaPagamento,
      comprovanteUrl: form.comprovanteUrl || null,
      obs: form.obs || undefined,
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Despesas Operacionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comissões, retenções recolhidas e custos de prestadores de serviço
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Operação</Label>
          <Select
            value={filtroOp ? String(filtroOp) : "todas"}
            onValueChange={v => setFiltroOp(v === "todas" ? undefined : Number(v))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todas as operações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as operações</SelectItem>
              {operacoes.map(op => (
                <SelectItem key={op.id} value={String(op.id)}>{op.sigla}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroPago} onValueChange={setFiltroPago}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              <SelectItem value="aberto">Em aberto</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CATEGORIAS.filter(c => (totaisPorCategoria[c.value] ?? 0) > 0).map(c => (
          <div key={c.value} className="rounded-lg border bg-card p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-base font-semibold text-foreground">{fmtBRL(totaisPorCategoria[c.value] ?? 0)}</p>
          </div>
        ))}
        {totalGeral > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Total Lançado</p>
            <p className="text-base font-bold text-primary">{fmtBRL(totalGeral)}</p>
            <div className="flex gap-2 pt-1">
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {fmtBRL(totalPago)}
              </span>
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {fmtBRL(totalAberto)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      {despesasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Receipt className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhuma despesa{filtroOp ? " para esta operação" : ""}{filtroPago !== "todas" ? ` (${filtroPago === "aberto" ? "em aberto" : "paga"})` : ""}.</p>
          <Button variant="outline" size="sm" onClick={handleNovo} className="gap-2">
            <Plus className="h-4 w-4" /> Lançar primeira despesa
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Operação</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Favorecido</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Pagamento</th>
                <th className="text-left px-4 py-3 font-medium">Forma</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Comp.</th>
                <th className="text-center px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {despesasFiltradas.map(d => {
                const op = operacoes.find(o => o.id === d.operacaoId);
                const cat = categoriaInfo(d.categoria);
                const pago = !!(d as any).pago;
                return (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{op?.sigla ?? d.operacaoId}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${cat.cor}`}>{cat.label}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{d.favorecido}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.descricao ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{fmtBRL(d.valor)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(d.dataPagamento)}</td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{d.formaPagamento ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {pago ? (
                        <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30 gap-1">
                          <CheckCircle className="h-3 w-3" /> Pago
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-red-500/20 text-red-300 border-red-500/30 gap-1">
                          <Clock className="h-3 w-3" /> Aberto
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.comprovanteUrl ? (
                        <a href={d.comprovanteUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80">
                          <ExternalLink className="h-4 w-4 inline" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(d)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(d.id)} disabled={pago}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet de formulário */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar Despesa" : "Nova Despesa Operacional"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {/* Operação */}
            <div className="space-y-1.5">
              <Label>Operação <span className="text-destructive">*</span></Label>
              <Select value={String(form.operacaoId)} onValueChange={v => setForm(f => ({ ...f, operacaoId: Number(v), favorecido: "", valor: "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação..." />
                </SelectTrigger>
                <SelectContent>
                  {operacoes.map(op => (
                    <SelectItem key={op.id} value={String(op.id)}>{op.sigla}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria <span className="text-destructive">*</span></Label>
              <Select value={form.categoria} onValueChange={v => {
                setAutoPreenchido(false);
                setForm(f => ({ ...f, categoria: v as Categoria, favorecido: "", valor: "" }));
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Favorecido com indicador de auto-preenchimento */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Favorecido / Beneficiário <span className="text-destructive">*</span>
                {autoPreenchido && (
                  <span className="text-xs text-primary flex items-center gap-1 font-normal">
                    <Sparkles className="h-3 w-3" /> Preenchido automaticamente
                  </span>
                )}
              </Label>
              <Input
                placeholder="Nome do favorecido"
                value={form.favorecido}
                onChange={e => { setAutoPreenchido(false); setForm(f => ({ ...f, favorecido: e.target.value })); }}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Comissão referente à operação OP-07C/06-04V/06-001"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            {/* Valor com indicador de auto-preenchimento */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Valor (R$) <span className="text-destructive">*</span>
                {autoPreenchido && form.valor && (
                  <span className="text-xs text-primary flex items-center gap-1 font-normal">
                    <Sparkles className="h-3 w-3" /> Estimado
                  </span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Data de pagamento */}
              <div className="space-y-1.5">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={form.dataPagamento}
                  onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))}
                />
              </div>

              {/* Forma de pagamento */}
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v as FormaPagamento }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(fp => (
                      <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comprovante */}
            <div className="space-y-1.5">
              <Label>Comprovante</Label>
              {form.comprovanteUrl ? (
                <div className="flex items-center gap-2">
                  <a href={form.comprovanteUrl} target="_blank" rel="noreferrer"
                    className="text-sm text-primary underline underline-offset-2 flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver comprovante
                  </a>
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground"
                    onClick={() => setForm(f => ({ ...f, comprovanteUrl: "" }))}>
                    Remover
                  </Button>
                </div>
              ) : (
                <div>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
                  <Button type="button" variant="outline" size="sm" className="gap-2"
                    disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Anexar comprovante"}
                  </Button>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input
                placeholder="Observações adicionais..."
                value={form.obs}
                onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Salvando..." : form.id ? "Salvar alterações" : "Lançar despesa"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirm delete */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
