import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { KpiCard, SectionHeader, StatusBadge, EmptyState } from "@/components/TimeOpsComponents";
import { brl, kg, n, calcFinal } from "@/lib/calculos";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

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

  // Enrich embarques with descarga data
  const { data: descargas = [] } = trpc.embarques.list.useQuery({});

  const cfgN = {
    fethab: n(cfg?.fethab), iagro: n(cfg?.iagro), senar: n(cfg?.senar),
    funrural: n(cfg?.funrural), fundoMes: n(cfg?.fundoMes), dmais: n(cfg?.dmais ?? 2),
  };

  const fornecedores = Array.from(new Set(compras.map(c => c.fornecedor).filter(Boolean)));
  const compradores = Array.from(new Set(vendas.map(v => v.comprador).filter(Boolean)));

  const embarquesEnriquecidos = useMemo(() => {
    return embarquesRaw.map(em => {
      const op = operacoes.find(o => o.id === em.operacaoId);
      const cc = compras.find(c => c.id === op?.compraId);
      const cv = vendas.find(v => v.id === op?.vendaId);
      return { ...em, op, cc, cv };
    });
  }, [embarquesRaw, operacoes, compras, vendas]);

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

  // KPIs
  const totalPesoOrigem = filtered.reduce((a, e) => a + n(e.pesoOrigem), 0);
  const totalValorCompra = filtered.reduce((a, e) => {
    if (!e.cc || !e.op) return a;
    const calc = calcFinal({
      pesoOrigem: n(e.pesoOrigem), umidade: n(e.umidade), imp: n(e.imp), avar: n(e.avar), queim: n(e.queim),
      pesoDescarga: 0, dcUmidade: 0, dcImp: 0, dcAvar: 0, dcQueim: 0,
      cc: { precoSc: n(e.cc.precoSc), umidTol: n(e.cc.umidTol), umidFat: n(e.cc.umidFat), impTol: n(e.cc.impTol), impFat: n(e.cc.impFat), avarTol: n(e.cc.avarTol), avarFat: n(e.cc.avarFat), queimTol: n(e.cc.queimTol), queimFat: n(e.cc.queimFat) },
      cv: { precoSc: 0, umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 40, avarFat: 1, queimTol: 1, queimFat: 1 },
      op: { freteTon: n(e.op.freteTon), quebraTol: n(e.op.quebraTol), diasDesagio: n(e.op.diasDesagio), comissaoValor: n(e.op.comissaoValor), comissaoTipo: e.op.comissaoTipo, custoClassTon: n(e.op.custoClassTon) },
      cfg: cfgN,
    });
    return a + calc.valorCompra;
  }, 0);

  const totalPago = pagamentos.reduce((a, p) => a + n(p.valor), 0);
  const saldoPendente = Math.max(0, totalValorCompra - totalPago);
  const emAberto = filtered.filter(e => e.status !== "Finalizada").length;

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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Volume embarcado" value={kg(totalPesoOrigem)} trend="neutral" />
        <KpiCard label="Valor de compra" value={brl(totalValorCompra)} trend="neutral" />
        <KpiCard label="Total pago" value={brl(totalPago)} trend="up" />
        <KpiCard label="Saldo a pagar" value={brl(saldoPendente)} trend={saldoPendente > 0 ? "down" : "up"} />
        <KpiCard label="Cargas em aberto" value={String(emAberto)} trend={emAberto > 0 ? "neutral" : "up"} />
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
                  <th className="text-left px-4 py-3 text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((em, i) => (
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
                    <td className="px-4 py-3"><StatusBadge status={em.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
