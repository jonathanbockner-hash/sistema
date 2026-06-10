import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Loader2, Sparkles, CheckCircle, AlertTriangle,
  FileText, Link2, DollarSign, Clock,
} from "lucide-react";

const CAT_LABELS: Record<string, string> = {
  comissao: "Comissão", fethab: "FETHAB", iagro: "IAGRO",
  senar: "SENAR", funrural: "FUNRURAL", classificador: "Classificador",
  frete: "Frete", outro: "Outro",
};

function fmtMoeda(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BaixaDespesas() {
  const [operacaoId, setOperacaoId] = useState<number | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileMime, setFileMime] = useState("image/jpeg");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<any>(null);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set()); // chave = "categoria::favorecido"
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: saldos = [], refetch: refetchSaldos } = trpc.despesas.saldoConsolidado.useQuery(
    { operacaoId: operacaoId! },
    { enabled: !!operacaoId }
  );

  const lerComprovanteMut = trpc.despesas.lerComprovante.useMutation();
  const darBaixaMut = trpc.despesas.darBaixaConsolidada.useMutation();

  const saldosAbertos = (saldos as any[]).filter((s: any) => s.saldoAberto > 0);
  const saldosPagos = (saldos as any[]).filter((s: any) => s.saldoAberto === 0 && s.totalPago > 0);
  const totalAberto = saldosAbertos.reduce((acc: number, s: any) => acc + s.saldoAberto, 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setFileBase64(base64);
      if (file.type.startsWith("image/")) setFilePreview(result);
      else setFilePreview(null);
    };
    reader.readAsDataURL(file);
    // Limpar resultado anterior
    setLeitura(null);
    setSugestoes([]);
    setSelecionados(new Set());
    setComprovanteUrl(null);
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
      const autoChaves = new Set(
        (res.sugestoes as any[]).filter((s) => s.autoVincular).map((s) => s.chave)
      );
      setSelecionados(autoChaves);
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

  function toggleSelecionado(chave: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }

  async function handleConfirmarBaixa() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos um saldo para dar baixa.");
      return;
    }
    const dataBaixa = leitura?.data ?? new Date().toISOString().slice(0, 10);
    const textoCompleto = leitura?.textoCompleto ?? null;
    let ok = 0;

    // Calcular distribuição proporcional do valor do comprovante entre os grupos selecionados
    // Evita que um único comprovante pague múltiplos grupos pelo valor total
    const gruposSelecionados = Array.from(selecionados)
      .map(chave => sugestoes.find((s: any) => s.chave === chave))
      .filter(Boolean) as any[];

    const totalSaldoSelecionado = gruposSelecionados.reduce((acc, s) => acc + (s.saldoAberto ?? 0), 0);
    const valorComprovante = leitura?.valor ?? undefined;

    // Segurança: se há múltiplos grupos e o valor do comprovante não foi extraído,
    // não permitir baixa automática (evitar quitar integralmente cada grupo)
    if (valorComprovante === undefined && gruposSelecionados.length > 1) {
      toast.error(
        "O valor do comprovante não foi extraído pela IA. " +
        "Para baixa de múltiplos grupos, o valor é obrigatório para distribuição proporcional. " +
        "Selecione apenas um grupo por vez ou re-envie um comprovante com valor legível."
      );
      return;
    }

    for (const saldo of gruposSelecionados) {
      // Distribuir o valor do comprovante proporcionalmente ao saldo de cada grupo
      let valorProporcional: number | undefined = undefined;
      if (valorComprovante !== undefined && totalSaldoSelecionado > 0) {
        const proporcao = (saldo.saldoAberto ?? 0) / totalSaldoSelecionado;
        valorProporcional = valorComprovante * proporcao;
      }

      try {
        const result = await darBaixaMut.mutateAsync({
          operacaoId: operacaoId!,
          categoria: saldo.categoria,
          favorecido: saldo.favorecido,
          dataBaixa,
          valorComprovante: valorProporcional,
          comprovanteUrl: comprovanteUrl ?? undefined,
          comprovanteTexto: textoCompleto ?? undefined,
        }) as any;
        ok += result.baixadas ?? 1;
        // Aviso de baixa parcial
        if (result.saldoRemanescente > 0.01) {
          toast.warning(
            `Baixa parcial: ${CAT_LABELS[saldo.categoria] ?? saldo.categoria} — ${saldo.favorecido}. ` +
            `Quitado R$ ${result.totalBaixado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | ` +
            `Saldo remanescente: R$ ${result.saldoRemanescente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          );
        }
      } catch (err: any) {
        toast.error(`Erro ao dar baixa em ${CAT_LABELS[saldo.categoria] ?? saldo.categoria} — ${saldo.favorecido}: ${err?.message}`);
      }
    }

    if (ok > 0) {
      toast.success(`Baixa confirmada! ${ok} lançamento(s) quitado(s).`);
      refetchSaldos();
      setLeitura(null);
      setSugestoes([]);
      setSelecionados(new Set());
      setFileBase64("");
      setFileMime("image/jpeg");
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

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Baixa de Despesas por Comprovante</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione a operação, faça upload do comprovante e o sistema reconhece o favorecido e quita o saldo em aberto automaticamente.
        </p>
      </div>

      {/* 1. Seleção de operação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Selecione a Operação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={operacaoId ? String(operacaoId) : ""}
            onValueChange={(v) => {
              setOperacaoId(Number(v));
              setLeitura(null);
              setSugestoes([]);
              setSelecionados(new Set());
              setFileBase64("");
              setFilePreview(null);
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

          {/* Painel de saldos em aberto */}
          {operacaoId && saldosAbertos.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                Saldos em aberto — {fmtMoeda(totalAberto)} total
              </p>
              <div className="grid gap-2">
                {saldosAbertos.map((s: any) => (
                  <div key={s.chave} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-red-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{s.favorecido}</p>
                        <p className="text-xs text-muted-foreground">{CAT_LABELS[s.categoria] ?? s.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">{fmtMoeda(s.saldoAberto)}</p>
                      {s.totalPago > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Pago: {fmtMoeda(s.totalPago)} / Total: {fmtMoeda(s.totalLancado)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {operacaoId && saldosAbertos.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">Todas as despesas desta operação estão quitadas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Upload do comprovante */}
      {operacaoId && saldosAbertos.length > 0 && (
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

      {/* 3. Resultado da leitura e vinculação consolidada */}
      {leitura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              3. Dados Extraídos — Confirme a Vinculação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Layout de duas colunas: preview à esquerda, dados à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Coluna esquerda: pré-visualização do comprovante */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comprovante</p>
                <div className="border rounded-lg overflow-hidden bg-muted/20 min-h-[200px] flex items-center justify-center">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Comprovante"
                      className="w-full h-auto max-h-[420px] object-contain rounded"
                    />
                  ) : comprovanteUrl ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <FileText className="h-14 w-14 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Comprovante PDF salvo</p>
                      <a
                        href={comprovanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline hover:no-underline"
                      >
                        Abrir PDF
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
                      <FileText className="h-12 w-12" />
                      <p className="text-xs">Arquivo carregado</p>
                    </div>
                  )}
                </div>

                {/* Texto extraído colapsável abaixo do preview */}
                {leitura.textoCompleto && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground select-none">Ver texto completo extraído</summary>
                    <p className="mt-2 p-3 bg-muted/20 rounded text-xs leading-relaxed whitespace-pre-wrap">{leitura.textoCompleto}</p>
                  </details>
                )}
              </div>

              {/* Coluna direita: dados extraídos e vinculação */}
              <div className="space-y-4">
                {/* Dados do comprovante */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dados Extraídos pela IA</p>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Favorecido</p>
                      <p className="font-semibold text-sm">{leitura.favorecido}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-semibold text-sm text-emerald-400">{fmtMoeda(leitura.valor)}</p>
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
                </div>

                <Separator />

                {/* Saldos sugeridos para baixa */}
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Saldos em aberto — selecione os que este comprovante quita
                  </p>

                  {sugestoes.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                      <p className="text-sm text-orange-300">
                        Nenhum saldo em aberto encontrado. Cadastre as despesas em "Despesas Operacionais" primeiro.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sugestoes.map((s: any) => {
                        const sel = selecionados.has(s.chave);
                        return (
                          <div
                            key={s.chave}
                            onClick={() => toggleSelecionado(s.chave)}
                            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
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
                                  {CAT_LABELS[s.categoria] ?? s.categoria}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-400">{fmtMoeda(s.saldoAberto)}</p>
                                <p className="text-xs text-muted-foreground">saldo em aberto</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {s.autoVincular && (
                                  <Badge variant="default" className="text-xs bg-emerald-600">Auto</Badge>
                                )}
                                <span className={`text-xs font-semibold ${scoreColor(s.matchScore)}`}>
                                  {s.matchScore}% match
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {sugestoes.length > 0 && (
                  <>
                    {selecionados.size > 0 && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                          <p className="text-sm font-medium">
                            Total a quitar:{" "}
                            <span className="text-emerald-400 font-bold">
                              {fmtMoeda(
                                sugestoes
                                  .filter((s: any) => selecionados.has(s.chave))
                                  .reduce((acc: number, s: any) => acc + s.saldoAberto, 0)
                              )}
                            </span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{selecionados.size} grupo(s) selecionado(s)</p>
                      </div>
                    )}

                    <Button
                      onClick={handleConfirmarBaixa}
                      disabled={selecionados.size === 0 || darBaixaMut.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {darBaixaMut.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirmando baixa...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" />Confirmar Baixa — {selecionados.size} Grupo(s)</>
                      )}
                    </Button>
                  </>
                )}

              </div>{/* fim coluna direita */}
            </div>{/* fim grid 2 colunas */}
          </CardContent>
        </Card>
      )}

      {/* Histórico de saldos já quitados */}
      {operacaoId && saldosPagos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Despesas Quitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {saldosPagos.map((s: any) => (
                <div key={s.chave} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div>
                    <p className="text-sm font-medium">{s.favorecido}</p>
                    <p className="text-xs text-muted-foreground">{CAT_LABELS[s.categoria] ?? s.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{fmtMoeda(s.totalPago)}</p>
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Quitado</Badge>
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
