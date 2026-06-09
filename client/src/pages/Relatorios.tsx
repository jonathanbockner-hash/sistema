import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader, Field, selectCls } from "@/components/TimeOpsComponents";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer } from "lucide-react";
import { n, brl, calcFinal } from "@/lib/calculos";

interface LinhaRelatorio {
  em: any; op: any; cc: any; cv: any; desc: any;
  calc: ReturnType<typeof calcFinal>;
}

export default function Relatorios() {
  const [tipo, setTipo] = useState<"compra" | "venda" | "consolidado">("consolidado");
  const [operacaoId, setOperacaoId] = useState<number>(0);
  const [embarqueId, setEmbarqueId] = useState<number>(0);

  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: embarques = [] } = trpc.embarques.list.useQuery({});
  const { data: descargas = [] } = trpc.descargas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const embarquesFiltrados = operacaoId ? embarques.filter(e => e.operacaoId === operacaoId) : embarques;
  const embarquesSelecionados = embarqueId ? embarquesFiltrados.filter(e => e.id === embarqueId) : embarquesFiltrados;

  const cfgN = {
    fethab: n(cfg?.fethab), iagro: n(cfg?.iagro), senar: n(cfg?.senar),
    funrural: n(cfg?.funrural), fundoMes: n(cfg?.fundoMes), dmais: n(cfg?.dmais ?? 2),
  };

  const linhas: LinhaRelatorio[] = useMemo(() => {
    const result: LinhaRelatorio[] = [];
    for (const em of embarquesSelecionados) {
      const op = operacoes.find(o => o.id === em.operacaoId);
      const cc = compras.find(c => c.id === op?.compraId);
      const cv = vendas.find(v => v.id === op?.vendaId);
      if (!cc || !cv || !op) continue;
      const desc = descargas.find((d: any) => d.embarqueId === em.id);
      const calc = calcFinal({
        pesoOrigem: n(em.pesoOrigem),
        umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
        pesoDescarga: n(desc?.pesoDescarga ?? 0),
        dcUmidade: n(desc?.dcUmidade ?? 0), dcImp: n(desc?.dcImp ?? 0),
        dcAvar: n(desc?.dcAvar ?? 0), dcQueim: n(desc?.dcQueim ?? 0),
        cc: { precoSc: n(cc.precoSc), umidTol: n(cc.umidTol), umidFat: n(cc.umidFat), impTol: n(cc.impTol), impFat: n(cc.impFat), avarTol: n(cc.avarTol), avarFat: n(cc.avarFat), queimTol: n(cc.queimTol), queimFat: n(cc.queimFat) },
        cv: { precoSc: n(cv.precoSc), umidTol: n(cv.umidTol), umidFat: n(cv.umidFat), impTol: n(cv.impTol), impFat: n(cv.impFat), avarTol: n(cv.avarTol), avarFat: n(cv.avarFat), queimTol: n(cv.queimTol), queimFat: n(cv.queimFat) },
        op: { freteTon: n(op.freteTon), quebraTol: n(op.quebraTol), diasDesagio: op.diasDesagio, comissaoValor: n(op.comissaoValor), comissaoTipo: op.comissaoTipo, custoClassTon: n(op.custoClassTon) },
        cfg: cfgN,
      });
      result.push({ em, op, cc, cv, desc, calc });
    }
    return result;
  }, [embarquesSelecionados, operacoes, compras, vendas, descargas, cfg]);

  const totais = useMemo(() => {
    return linhas.reduce((acc, l) => ({
      pesoOrigem: acc.pesoOrigem + n(l.em.pesoOrigem),
      pesoDescarga: acc.pesoDescarga + n(l.desc?.pesoDescarga ?? 0),
      valorCompra: acc.valorCompra + l.calc.valorCompra,
      valorVenda: acc.valorVenda + l.calc.valorVenda,
      frete: acc.frete + l.calc.frete,
      comissao: acc.comissao + l.calc.comissao,
      classCusto: acc.classCusto + l.calc.classCusto,
      desagio: acc.desagio + l.calc.desagio,
      retencoes: acc.retencoes + l.calc.retencoes,
      resultado: acc.resultado + l.calc.resultado,
    }), { pesoOrigem: 0, pesoDescarga: 0, valorCompra: 0, valorVenda: 0, frete: 0, comissao: 0, classCusto: 0, desagio: 0, retencoes: 0, resultado: 0 });
  }, [linhas]);

  function exportCSV() {
    const headers = ["Operação","Placa","NF Entrada","Data Embarque","Peso Orig (kg)","Peso Desc (kg)","Quebra (kg)","Quebra %","Kg Compra","Valor Compra","Retenções","Valor Pagar","Kg Venda","Valor Venda","Frete","Comissão","Classificador","Deságio","Resultado"];
    const rows = linhas.map(l => [
      l.op.sigla, l.em.placa ?? "", l.em.nfeEntrada ?? "",
      l.em.dataEmbarque ? new Date(l.em.dataEmbarque).toLocaleDateString("pt-BR") : "",
      n(l.em.pesoOrigem).toFixed(2), n(l.desc?.pesoDescarga ?? 0).toFixed(2),
      l.calc.quebraKg.toFixed(2), l.calc.quebraPerc.toFixed(4),
      l.calc.kgCompra.toFixed(2), l.calc.valorCompra.toFixed(2),
      l.calc.retencoes.toFixed(2), l.calc.valorPagar.toFixed(2),
      l.calc.kgVenda.toFixed(2), l.calc.valorVenda.toFixed(2),
      l.calc.frete.toFixed(2), l.calc.comissao.toFixed(2),
      l.calc.classCusto.toFixed(2), l.calc.desagio.toFixed(2), l.calc.resultado.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `relatorio_timeops_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Emitir Relatório"
        description="Gere relatórios fiscais e financeiros por operação"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs no-print" onClick={exportCSV}>
              <Download size={13} /> CSV
            </Button>
            <Button size="sm" className="gradient-brand text-white gap-1.5 text-xs no-print" onClick={() => window.print()}>
              <Printer size={13} /> Imprimir PDF
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 no-print">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo de relatório">
            <select className={selectCls} value={tipo} onChange={e => setTipo(e.target.value as any)}>
              <option value="consolidado">Consolidado (Compra + Venda)</option>
              <option value="compra">Relatório de Compra</option>
              <option value="venda">Relatório de Venda</option>
            </select>
          </Field>
          <Field label="Operação">
            <select className={selectCls} value={operacaoId || ""} onChange={e => { setOperacaoId(Number(e.target.value)); setEmbarqueId(0); }}>
              <option value="">Todas as operações</option>
              {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
            </select>
          </Field>
          <Field label="Embarque específico">
            <select className={selectCls} value={embarqueId || ""} onChange={e => setEmbarqueId(Number(e.target.value))}>
              <option value="">Todos os embarques</option>
              {embarquesFiltrados.map(e => <option key={e.id} value={e.id}>{e.placa || "Sem placa"} — {e.nfeEntrada || "Sem NF"}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Relatório */}
      <div className="rounded-xl border border-border bg-card overflow-hidden print-full">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                TIME OPS — {tipo === "consolidado" ? "Relatório Consolidado" : tipo === "compra" ? "Relatório de Compra" : "Relatório de Venda"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Emitido em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                {operacaoId ? ` · Operação: ${operacoes.find(o => o.id === operacaoId)?.sigla}` : " · Todas as operações"}
              </p>
            </div>
            <FileText className="text-primary" size={20} />
          </div>
        </div>

        {linhas.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Nenhum dado para o filtro selecionado.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {tipo !== "venda" && <>
                      <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">Operação</th>
                      <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Placa</th>
                      <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">NF Entrada</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Peso Orig.</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Kg Compra</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Valor Compra</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Retenções</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">A Pagar</th>
                    </>}
                    {tipo !== "compra" && <>
                      {tipo === "venda" && <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Operação</th>}
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Peso Desc.</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Kg Venda</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Valor Venda</th>
                    </>}
                    {tipo === "consolidado" && <>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Frete</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Deságio</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Resultado</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={l.em.id} className={`border-b border-border/30 hover:bg-accent/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      {tipo !== "venda" && <>
                        <td className="px-3 py-2.5 font-medium text-foreground">{l.op.sigla}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{l.em.placa || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{l.em.nfeEntrada || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-right text-foreground">{n(l.em.pesoOrigem).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2.5 font-mono text-right text-foreground">{l.calc.kgCompra.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 font-mono text-right text-foreground">{brl(l.calc.valorCompra)}</td>
                        <td className="px-3 py-2.5 font-mono text-right kpi-negative">{brl(l.calc.retencoes)}</td>
                        <td className="px-3 py-2.5 font-mono text-right font-semibold text-foreground">{brl(l.calc.valorPagar)}</td>
                      </>}
                      {tipo !== "compra" && <>
                        {tipo === "venda" && <td className="px-3 py-2.5 font-medium text-foreground">{l.op.sigla}</td>}
                        <td className="px-3 py-2.5 font-mono text-right text-foreground">{n(l.desc?.pesoDescarga ?? 0).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2.5 font-mono text-right text-foreground">{l.calc.kgVenda.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 font-mono text-right font-semibold text-foreground">{brl(l.calc.valorVenda)}</td>
                      </>}
                      {tipo === "consolidado" && <>
                        <td className="px-3 py-2.5 font-mono text-right text-muted-foreground">{brl(l.calc.frete)}</td>
                        <td className="px-3 py-2.5 font-mono text-right text-muted-foreground">{brl(l.calc.desagio)}</td>
                        <td className={`px-3 py-2.5 font-mono text-right font-bold ${l.calc.resultado >= 0 ? "kpi-positive" : "kpi-negative"}`}>{brl(l.calc.resultado)}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    {tipo !== "venda" && <>
                      <td className="px-3 py-3 font-bold text-foreground text-xs" colSpan={3}>TOTAIS</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{totais.pesoOrigem.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">—</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{brl(totais.valorCompra)}</td>
                      <td className="px-3 py-3 font-mono text-right font-bold kpi-negative text-xs">{brl(totais.retencoes)}</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{brl(totais.valorCompra - totais.retencoes)}</td>
                    </>}
                    {tipo !== "compra" && <>
                      {tipo === "venda" && <td className="px-3 py-3 font-bold text-foreground text-xs">TOTAIS</td>}
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{totais.pesoDescarga.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">—</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{brl(totais.valorVenda)}</td>
                    </>}
                    {tipo === "consolidado" && <>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{brl(totais.frete)}</td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-foreground text-xs">{brl(totais.desagio)}</td>
                      <td className={`px-3 py-3 font-mono text-right font-bold text-xs ${totais.resultado >= 0 ? "kpi-positive" : "kpi-negative"}`}>{brl(totais.resultado)}</td>
                    </>}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-5 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground">Total cargas</p><p className="text-sm font-bold text-foreground">{linhas.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Volume total</p><p className="text-sm font-bold text-foreground">{totais.pesoOrigem.toLocaleString("pt-BR")} kg</p></div>
              {tipo !== "compra" && <div><p className="text-xs text-muted-foreground">Receita de venda</p><p className="text-sm font-bold kpi-positive">{brl(totais.valorVenda)}</p></div>}
              {tipo === "consolidado" && <div><p className="text-xs text-muted-foreground">Resultado total</p><p className={`text-sm font-bold ${totais.resultado >= 0 ? "kpi-positive" : "kpi-negative"}`}>{brl(totais.resultado)}</p></div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
