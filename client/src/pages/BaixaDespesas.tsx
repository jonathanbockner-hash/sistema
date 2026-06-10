import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertTriangle, Sparkles, Link2 } from "lucide-react";

const CAT_LABELS: Record<string, string> = {
  comissao: "Comissão",
  fethab: "FETHAB",
  iagro: "IAGRO",
  senar: "SENAR",
  funrural: "FUNRURAL",
  classificador: "Classificador",
  frete: "Frete",
  outro: "Outro",
};

function fmtMoeda(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BaixaDespesas() {
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const [operacaoId, setOperacaoId] = useState<number | null>(null);
  const { data: despesas = [], refetch: refetchDespesas } = trpc.despesas.list.useQuery(
    { operacaoId: operacaoId ?? undefined },
    { enabled: !!operacaoId }
  );

  const despesasAbertas = (despesas as any[]).filter((d) => !d.pago);
  const despesasPagas = (despesas as any[]).filter((d) => d.pago);

  // Upload e leitura
  const fileRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>("");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [lendo, setLendo] = useState(false);

  // Resultado da leitura LLM
  const [leitura, setLeitura] = useState<{
    favorecido: string; valor: number; data: string;
    formaPagamento: string; banco: string; textoCompleto: string;
  } | null>(null);
  const [sugestoes, setSugestoes] = useState<{
    despesaId: number; categoria: string; favorecido: string;
    valor: string; matchScore: number; autoVincular: boolean;
  }[]>([]);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);

  // Seleção de vínculos
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  const lerComprovanteMut = trpc.despesas.lerComprovante.useMutation();
  const darBaixaMut = trpc.despesas.darBaixa.useMutation();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLeitura(null);
    setSugestoes([]);
    setSelecionados(new Set());
    setComprovanteUrl(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // result = "data:image/png;base64,XXXX"
      const base64 = result.split(",")[1];
      setFileBase64(base64);
      setFileMime(file.type);
      if (file.type.startsWith("image/")) {
        setFilePreview(result);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLer() {
    if (!fileBase64 || !operacaoId) {
      toast.error("Selecione uma operação e um comprovante.");
      return;
    }
    setLendo(true);
    try {
      const res = await lerComprovanteMut.mutateAsync({
        base64: fileBase64,
        mimeType: fileMime,
        operacaoId,
      });
      setComprovanteUrl(res.comprovanteUrl);
      setLeitura(res.leitura as any);
      setSugestoes(res.sugestoes as any);
      // Pré-selecionar os que têm autoVincular
      const autoIds = new Set((res.sugestoes as any[]).filter((s) => s.autoVincular).map((s) => s.despesaId));
      setSelecionados(autoIds);
      if (!res.leitura) {
        toast.warning("Não foi possível extrair dados do comprovante. Verifique o arquivo.");
      } else {
        toast.success("Comprovante lido com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao ler comprovante: " + (err?.message ?? "Tente novamente."));
    } finally {
      setLendo(false);
    }
  }

  function toggleSelecionado(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmarBaixa() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos uma despesa para dar baixa.");
      return;
    }
    const dataBaixa = leitura?.data ?? new Date().toISOString().slice(0, 10);
    const textoCompleto = leitura?.textoCompleto ?? null;
    let ok = 0;
    for (const id of Array.from(selecionados)) {
      try {
        await darBaixaMut.mutateAsync({
          despesaId: id,
          dataBaixa,
          comprovanteUrl: comprovanteUrl ?? undefined,
          comprovanteTexto: textoCompleto ?? undefined,
        });
        ok++;
      } catch (err: any) {
        toast.error(`Erro ao dar baixa na despesa #${id}: ${err?.message}`);
      }
    }
    if (ok > 0) {
      toast.success(`${ok} despesa(s) baixada(s) com sucesso!`);
      refetchDespesas();
      // Limpar estado
      setLeitura(null);
      setSugestoes([]);
      setSelecionados(new Set());
      setFileBase64("");
      setFileMime("");
      setFilePreview(null);
      setComprovanteUrl(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Baixa de Despesas por Comprovante</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Faça upload do comprovante de pagamento. O sistema lê os dados automaticamente e sugere a vinculação com as despesas em aberto.
        </p>
      </div>

      {/* Seleção de operação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Selecione a Operação</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={operacaoId ? String(operacaoId) : ""}
            onValueChange={(v) => {
              setOperacaoId(Number(v));
              setLeitura(null);
              setSugestoes([]);
              setSelecionados(new Set());
            }}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione uma operação..." />
            </SelectTrigger>
            <SelectContent>
              {(operacoes as any[]).map((op: any) => (
                <SelectItem key={op.id} value={String(op.id)}>
                  {op.sigla}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {operacaoId && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Despesas em aberto</p>
                <p className="text-2xl font-bold text-orange-400">{despesasAbertas.length}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtMoeda(despesasAbertas.reduce((s: number, d: any) => s + Number(d.valor), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Despesas pagas</p>
                <p className="text-2xl font-bold text-emerald-400">{despesasPagas.length}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtMoeda(despesasPagas.reduce((s: number, d: any) => s + Number(d.valor), 0))}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload do comprovante */}
      {operacaoId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Upload do Comprovante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {filePreview ? (
                <img src={filePreview} alt="Comprovante" className="max-h-48 mx-auto rounded object-contain" />
              ) : fileBase64 ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-12 w-12" />
                  <p className="text-sm">Arquivo carregado (PDF)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-12 w-12" />
                  <p className="text-sm font-medium">Clique para selecionar o comprovante</p>
                  <p className="text-xs">Imagem (JPG, PNG) ou PDF</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {fileBase64 && (
              <Button onClick={handleLer} disabled={lendo} className="w-full">
                {lendo ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Lendo comprovante com IA...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Ler e Analisar Comprovante</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado da leitura */}
      {leitura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              3. Dados Extraídos pelo Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Favorecido</p>
                <p className="font-semibold text-sm">{leitura.favorecido}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-semibold text-sm">{fmtMoeda(leitura.valor)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-semibold text-sm">
                  {leitura.data ? new Date(leitura.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forma</p>
                <p className="font-semibold text-sm uppercase">{leitura.formaPagamento}</p>
              </div>
            </div>

            {leitura.textoCompleto && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Ver texto completo extraído</summary>
                <p className="mt-2 p-3 bg-muted/20 rounded text-xs leading-relaxed">{leitura.textoCompleto}</p>
              </details>
            )}

            <Separator />

            {/* Sugestões de vinculação */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Despesas sugeridas para vinculação
                <span className="text-xs text-muted-foreground font-normal">
                  (marque as que deseja dar baixa)
                </span>
              </p>

              {sugestoes.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                  <p className="text-sm text-orange-300">
                    Nenhuma despesa em aberto encontrada para esta operação. Cadastre as despesas primeiro em "Despesas Operacionais".
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sugestoes.map((s) => {
                    const sel = selecionados.has(s.despesaId);
                    return (
                      <div
                        key={s.despesaId}
                        onClick={() => toggleSelecionado(s.despesaId)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          sel
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-border hover:border-border/80 bg-muted/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            sel ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground"
                          }`}>
                            {sel && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.favorecido}</p>
                            <p className="text-xs text-muted-foreground">
                              {CAT_LABELS[s.categoria] ?? s.categoria} · {fmtMoeda(s.valor)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.autoVincular && (
                            <Badge variant="default" className="text-xs bg-emerald-600">
                              Auto
                            </Badge>
                          )}
                          <Badge variant={scoreBadge(s.matchScore) as any} className="text-xs">
                            <span className={scoreColor(s.matchScore)}>{s.matchScore}%</span>
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {sugestoes.length > 0 && (
              <Button
                onClick={handleConfirmarBaixa}
                disabled={selecionados.size === 0 || darBaixaMut.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {darBaixaMut.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirmando baixa...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Confirmar Baixa de {selecionados.size} Despesa(s)</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de despesas em aberto */}
      {operacaoId && despesasAbertas.length > 0 && !leitura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Despesas em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {despesasAbertas.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <p className="text-sm font-medium">{d.favorecido}</p>
                    <p className="text-xs text-muted-foreground">{CAT_LABELS[d.categoria] ?? d.categoria}</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-400">{fmtMoeda(d.valor)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de despesas já pagas */}
      {operacaoId && despesasPagas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Despesas Já Baixadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {despesasPagas.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div>
                    <p className="text-sm font-medium">{d.favorecido}</p>
                    <p className="text-xs text-muted-foreground">
                      {CAT_LABELS[d.categoria] ?? d.categoria}
                      {d.dataBaixa && ` · Baixado em ${new Date(d.dataBaixa).toLocaleDateString("pt-BR")}`}
                    </p>
                    {d.comprovanteUrl && (
                      <a
                        href={d.comprovanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Ver comprovante
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{fmtMoeda(d.valor)}</p>
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Pago</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
