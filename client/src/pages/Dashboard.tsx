import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { KpiCard, SectionHeader, StatusBadge, EmptyState } from "@/components/TimeOpsComponents";
import { brl, kg, n, calcFinal } from "@/lib/calculos";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, TrendingUp, TrendingDown, DollarSign, Truck } from "lucide-react";

export default function Dashboard() {
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("");
  const [filtroComprador, setFiltroComprador] = useState("");
  const [filtroOperacao, setFiltroOperacao] = useState("");

  const { data: embarquesRaw = [], refetch } = trpc.embarques.list.useQuery({});
  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();
  const { data: pagamentos = [] } = trpc.pagamentos.list.useQuery({});
  const { data: descargas = [] } = trpc.descargas.list.useQuery();
  const { data: despesas = [] } = trpc.despesas.list.useQuery({});

  const cfgN = {
    fethabRsTon: n(cfg?.fethabRsTon),
    iagroRsTon: n(cfg?.iagroRsTon),
    senarPerc: n(cfg?.senarPerc),
    funruralPerc: n(cfg?.funruralPerc),
    fundoMes: n(cfg?.fundoMes),
    dmais: n(cfg?.dmais ?? 2),
  };

  const fornecedores = Array.from(new Set(compras.map(c => c.fornecedor).filter(Boolean)));
  const compradores = Array.from(new Set(vendas.map(v => v.comprador).filter(Boolean)));

  const embarquesEnriquecidos = useMemo(() => {
    return embarquesRaw.map(em => {
      const op = operacoes.find(o => o.id === em.operacaoId);
      const cc = compras.find(c => c.id === op?.compraId);
      const cv = vendas.find(v => v.id === op?.vendaId);
      const desc = descargas.find((d: any) => d.embarqueId === em.id);
      return { ...em, op, cc, cv, desc };
    });
  }, [embarquesRaw, operacoes, compras, vendas, descargas]);

  const filtered = useMemo(() => {
    return embarquesEnriquecidos.filter(em => {
      if (filtroFornecedor && em.cc?.fornecedor !== filtroFornecedor) return false;
      if (filtroComprador && em.cv?.comprador !== filtroComprador) return false;
      if (filtroOperacao && String(em.operacaoId) !== filtroOperacao) return false;
      if (dataIni && em.dataEmbarque && new Date(em.dataEmbarque) < new Date(dataIni)) return false;
      if (dataFim && em.dataEmbarque && new Date(em.dataEmbarque) > new Date(dataFim)) return false;
      return true;
    });
  }, [embarquesEnriquecidos, filtroFornecedor, filtroComprador, filtroOperacao, dataIni, dataFim]);

  // KPIs calculados
  const kpis = useMemo(() => {
    let totalPesoOrigem = 0;
    let totalValorCompra = 0;
    let totalValorPagar = 0; // valorCompra - retencoes = o que realmente será pago ao produtor
    let totalValorVenda = 0;
    let totalFrete = 0;
    let totalComissao = 0;
    let totalClassCusto = 0;
    let totalDesagio = 0;
    let totalRetencoes = 0;
    let totalPrejuQuebra = 0;
    let emAberto = 0;
    let finalizadas = 0;

    for (const em of filtered) {
      if (!em.cc || !em.op || !em.cv) continue;
      totalPesoOrigem += n(em.pesoOrigem);
      if (em.status !== "Finalizada") { emAberto++; continue; }
      finalizadas++;

      const desc = em.desc as any;
      const calc = calcFinal({
        pesoOrigem: n(em.pesoOrigem),
        umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
        pesoDescarga: desc ? n(desc.pesoDescarga) : 0,
        dcUmidade: desc ? n(desc.dcUmidade) : 0,
        dcImp: desc ? n(desc.dcImp) : 0,
        dcAvar: desc ? n(desc.dcAvar) : 0,
        dcQueim: desc ? n(desc.dcQueim) : 1,
        cc: { precoSc: n(em.cc.precoSc), umidTol: n(em.cc.umidTol), umidFat: n(em.cc.umidFat), impTol: n(em.cc.impTol), impFat: n(em.cc.impFat), avarTol: n(em.cc.avarTol), avarFat: n(em.cc.avarFat), queimTol: n(em.cc.queimTol), queimFat: n(em.cc.queimFat) },
        cv: { precoSc: n(em.cv.precoSc), umidTol: n(em.cv.umidTol), umidFat: n(em.cv.umidFat), impTol: n(em.cv.impTol), impFat: n(em.cv.impFat), avarTol: n(em.cv.avarTol), avarFat: n(em.cv.avarFat), queimTol: n(em.cv.queimTol), queimFat: n(em.cv.queimFat) },
        op: { freteTon: n(em.op.freteTon), quebraTol: n(em.op.quebraTol), diasDesagio: n(em.op.diasDesagio), comissaoValor: n(em.op.comissaoValor), comissaoTipo: em.op.comissaoTipo, custoClassTon: n(em.op.custoClassTon) },
        cfg: cfgN,
        flags: {
          reterFethab: (em.cc as any).reterFethab !== false,
          reterIagro: (em.cc as any).reterIagro !== false,
          reterSenar: (em.cc as any).reterSenar !== false,
          reterFunrural: (em.cc as any).reterFunrural !== false,
        },
      });

      totalValorCompra += calc.valorCompra;
      totalValorPagar += calc.valorPagar; // já descontadas as retenções
      totalValorVenda += calc.valorVenda;
      totalFrete += calc.frete;
      totalComissao += calc.comissao;
      totalClassCusto += calc.classCusto;
      totalDesagio += calc.desagio;
      totalRetencoes += calc.retencoes;
      totalPrejuQuebra += calc.prejuQuebra;
    }

    const lucroBruto = totalValorVenda - totalValorCompra;
    const custoOperacional = totalFrete + totalClassCusto + totalDesagio + totalPrejuQuebra;
    const lucroLiquido = lucroBruto - custoOperacional - totalComissao;
    const totalDespesasLancadas = despesas.reduce((a: number, d: any) => a + n(d.valor), 0);
    const totalPago = pagamentos.reduce((a: number, p: any) => a + n(p.valor), 0);
    // Saldo a pagar = valor líquido ao produtor (já descontadas retenções) menos o que já foi pago
    // As retenções (FETHAB, IAGRO, SENAR, FUNRURAL) são retidas pela TIME e recolhidas ao fisco,
    // portanto NÃO entram no saldo a pagar ao produtor.
    const saldoLiquido = totalValorPagar - totalPago; // negativo = crédito com fornecedor
    const saldoPendente = Math.max(0, saldoLiquido);
    const creditoFornecedor = Math.max(0, -saldoLiquido);

    return {
      totalPesoOrigem,
      totalValorCompra,
      totalValorPagar,
      totalValorVenda,
      lucroBruto,
      custoOperacional,
      totalComissao,
      lucroLiquido,
      totalRetencoes,
      totalFrete,
      totalPago,
      saldoPendente,
      creditoFornecedor,
      emAberto,
      finalizadas,
      totalDespesasLancadas,
    };
  }, [filtered, pagamentos, despesas, cfgN]);

  function exportCSV() {
    const rows = [
      ["Operação", "Fornecedor", "Comprador", "Placa", "NF Entrada", "Data Embarque", "Peso Origem (kg)", "Status"],
      ...filtered.map(e => [
        e.op?.sigla ?? "", e.cc?.fornecedor ?? "", e.cv?.comprador ?? "",
        e.placa ?? "", e.nfeEntrada ?? "",
        e.dataEmbarque ? new Date(e.dataEmbarque).toLocaleDateString("pt-BR") : "",
        n(e.pesoOrigem).toFixed(2), e.status,
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "dashboard_timeops.csv";
    a.click();
  }

  const margemPerc = kpis.totalValorVenda > 0 ? (kpis.lucroLiquido / kpis.totalValorVenda * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        description="Visão geral das operações de trading"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw size={13} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download size={13} /> CSV
            </Button>
          </div>
        }
      />

      {/* KPIs — Linha 1: Volumes e Receitas */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">Volumes &amp; Receitas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Volume embarcado" value={kg(kpis.totalPesoOrigem)} trend="neutral" />
          <KpiCard label="Receita de venda" value={brl(kpis.totalValorVenda)} trend="up" />
          <KpiCard label="Custo de compra" value={brl(kpis.totalValorCompra)} trend="neutral" />
          <KpiCard label="Retenções tributárias" value={brl(kpis.totalRetencoes)} trend="down" />
        </div>
      </div>

      {/* KPIs — Linha 2: Resultado */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">Resultado Financeiro</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Lucro Bruto</p>
            <p className={`text-xl font-bold font-mono ${kpis.lucroBruto >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {brl(kpis.lucroBruto)}
            </p>
            <p className="text-xs text-muted-foreground">Venda − Compra</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Custo Operacional</p>
            <p className="text-xl font-bold font-mono text-amber-400">{brl(kpis.custoOperacional)}</p>
            <p className="text-xs text-muted-foreground">Frete + Classif. + Deságio + Quebra</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Comissão</p>
            <p className="text-xl font-bold font-mono text-amber-400">{brl(kpis.totalComissao)}</p>
            <p className="text-xs text-muted-foreground">Corretores e intermediários</p>
          </div>
          <div className={`rounded-xl border-2 p-4 space-y-1 ${kpis.lucroLiquido >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              {kpis.lucroLiquido >= 0
                ? <TrendingUp size={14} className="text-emerald-400" />
                : <TrendingDown size={14} className="text-red-400" />}
            </div>
            <p className={`text-xl font-bold font-mono ${kpis.lucroLiquido >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {brl(kpis.lucroLiquido)}
            </p>
            <p className="text-xs text-muted-foreground">
              Margem: {margemPerc.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
            </p>
          </div>
        </div>
      </div>

      {/* KPIs — Linha 3: Pagamentos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">Pagamentos &amp; Cargas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Total pago" value={brl(kpis.totalPago)} trend="up" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Despesas operacionais</p>
            <p className="text-xl font-bold font-mono text-amber-400">{brl(kpis.totalDespesasLancadas)}</p>
            <p className="text-xs text-muted-foreground">Comissões, retenções e outros</p>
          </div>
          {kpis.creditoFornecedor > 0.01 ? (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-xs text-emerald-400 font-semibold">Crédito c/ Fornecedor</p>
              <p className="text-xl font-bold font-mono text-emerald-400">{brl(kpis.creditoFornecedor)}</p>
              <p className="text-xs text-muted-foreground">Pago acima do líquido ao produtor</p>
            </div>
          ) : (
            <div className={`rounded-xl border-2 p-4 space-y-1 ${
              kpis.saldoPendente > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"
            }`}>
              <p className="text-xs text-muted-foreground">Saldo a pagar ao produtor</p>
              <p className={`text-xl font-bold font-mono ${
                kpis.saldoPendente > 0 ? "text-amber-400" : "text-emerald-400"
              }`}>{brl(kpis.saldoPendente)}</p>
              <p className="text-xs text-muted-foreground">
                Líq. {brl(kpis.totalValorPagar)} − pago {brl(kpis.totalPago)}
              </p>
            </div>
          )}
          <KpiCard label="Cargas em trânsito" value={String(kpis.emAberto)} trend={kpis.emAberto > 0 ? "neutral" : "up"} />
          <KpiCard label="Cargas finalizadas" value={String(kpis.finalizadas)} trend="up" />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data inicial</label>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data final</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fornecedor</label>
            <select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todos</option>
              {fornecedores.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Comprador</label>
            <select value={filtroComprador} onChange={e => setFiltroComprador(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todos</option>
              {compradores.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Operação</label>
            <select value={filtroOperacao} onChange={e => setFiltroOperacao(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todas</option>
              {operacoes.map(o => <option key={o.id} value={String(o.id)}>{o.sigla}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gradient-brand text-white text-xs" onClick={() => refetch()}>Aplicar</Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => { setDataIni(""); setDataFim(""); setFiltroFornecedor(""); setFiltroComprador(""); setFiltroOperacao(""); }}>Limpar</Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Embarques e Descargas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} registro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum embarque encontrado" description="Cadastre operações e lance embarques para visualizar os dados aqui." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Operação</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Fornecedor</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Comprador</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Placa</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">NF Entrada</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Data</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Peso Orig.</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Resultado</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((em, i) => {
                  let resultado: number | null = null;
                  if (em.status === "Finalizada" && em.cc && em.cv && em.op && em.desc) {
                    const d = em.desc as any;
                    const calc = calcFinal({
                      pesoOrigem: n(em.pesoOrigem), umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
                      pesoDescarga: n(d.pesoDescarga), dcUmidade: n(d.dcUmidade), dcImp: n(d.dcImp), dcAvar: n(d.dcAvar), dcQueim: n(d.dcQueim),
                      cc: { precoSc: n(em.cc.precoSc), umidTol: n(em.cc.umidTol), umidFat: n(em.cc.umidFat), impTol: n(em.cc.impTol), impFat: n(em.cc.impFat), avarTol: n(em.cc.avarTol), avarFat: n(em.cc.avarFat), queimTol: n(em.cc.queimTol), queimFat: n(em.cc.queimFat) },
                      cv: { precoSc: n(em.cv.precoSc), umidTol: n(em.cv.umidTol), umidFat: n(em.cv.umidFat), impTol: n(em.cv.impTol), impFat: n(em.cv.impFat), avarTol: n(em.cv.avarTol), avarFat: n(em.cv.avarFat), queimTol: n(em.cv.queimTol), queimFat: n(em.cv.queimFat) },
                      op: { freteTon: n(em.op.freteTon), quebraTol: n(em.op.quebraTol), diasDesagio: n(em.op.diasDesagio), comissaoValor: n(em.op.comissaoValor), comissaoTipo: em.op.comissaoTipo, custoClassTon: n(em.op.custoClassTon) },
                      cfg: cfgN,
                    });
                    resultado = calc.resultado;
                  }
                  return (
                    <tr key={em.id} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{em.op?.sigla ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.cc?.fornecedor ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.cv?.comprador ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.placa ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{em.nfeEntrada ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {em.dataEmbarque ? new Date(em.dataEmbarque).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">{n(em.pesoOrigem).toLocaleString("pt-BR")} kg</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {resultado !== null
                          ? <span className={resultado >= 0 ? "text-emerald-400" : "text-red-400"}>{brl(resultado)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={em.status} /></td>
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
