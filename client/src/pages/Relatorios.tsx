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

function fmt(v: number, dec = 2) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(d: any) {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getFullYear()).slice(2)}`;
}

export default function Relatorios() {
  const [tipo, setTipo] = useState<"compra" | "venda" | "consolidado">("compra");
  const [contratoCompraId, setContratoCompraId] = useState<number>(0);
  const [contratoVendaId, setContratoVendaId] = useState<number>(0);
  const [operacaoId, setOperacaoId] = useState<number>(0);

  const { data: operacoes = [] } = trpc.operacoes.list.useQuery();
  const { data: compras = [] } = trpc.compras.list.useQuery();
  const { data: vendas = [] } = trpc.vendas.list.useQuery();
  const { data: embarques = [] } = trpc.embarques.list.useQuery({});
  const { data: descargas = [] } = trpc.descargas.list.useQuery();
  const { data: pagamentos = [] } = trpc.pagamentos.list.useQuery();
  const { data: cfg } = trpc.config.get.useQuery();

  const cfgN = {
    fethabRsTon: n(cfg?.fethabRsTon), iagroRsTon: n(cfg?.iagroRsTon),
    senarPerc: n(cfg?.senarPerc), funruralPerc: n(cfg?.funruralPerc),
    fundoMes: n(cfg?.fundoMes), dmais: n(cfg?.dmais ?? 2),
  };

  // Filtrar embarques conforme seleção
  const embarquesFiltrados = useMemo(() => {
    let list = [...embarques];
    if (operacaoId) list = list.filter(e => e.operacaoId === operacaoId);
    if (contratoCompraId) {
      const opsCompra = operacoes.filter(o => o.compraId === contratoCompraId).map(o => o.id);
      list = list.filter(e => opsCompra.includes(e.operacaoId));
    }
    if (contratoVendaId) {
      const opsVenda = operacoes.filter(o => o.vendaId === contratoVendaId).map(o => o.id);
      list = list.filter(e => opsVenda.includes(e.operacaoId));
    }
    return list;
  }, [embarques, operacaoId, contratoCompraId, contratoVendaId, operacoes]);

  const linhas: LinhaRelatorio[] = useMemo(() => {
    const result: LinhaRelatorio[] = [];
    for (const em of embarquesFiltrados) {
      const op = operacoes.find(o => o.id === em.operacaoId);
      const cc = compras.find(c => c.id === op?.compraId);
      const cv = vendas.find(v => v.id === op?.vendaId);
      if (!cc || !cv || !op) continue;
      const desc = descargas.find((d: any) => d.embarqueId === em.id);
      // Para o relatório de compra: comissão e classificador são custos da operação (compra+venda)
      // e só aparecem no relatório consolidado. No fechamento de compra, zeramos esses campos.
      const isCompra = tipo === "compra";
      const calc = calcFinal({
        pesoOrigem: n(em.pesoOrigem),
        umidade: n(em.umidade), imp: n(em.imp), avar: n(em.avar), queim: n(em.queim),
        pesoDescarga: n(desc?.pesoDescarga ?? 0),
        dcUmidade: n(desc?.dcUmidade ?? 0), dcImp: n(desc?.dcImp ?? 0),
        dcAvar: n(desc?.dcAvar ?? 0), dcQueim: n(desc?.dcQueim ?? 0),
        cc: { precoSc: n(cc.precoSc), umidTol: n(cc.umidTol), umidFat: n(cc.umidFat), impTol: n(cc.impTol), impFat: n(cc.impFat), avarTol: n(cc.avarTol), avarFat: n(cc.avarFat), queimTol: n(cc.queimTol), queimFat: n(cc.queimFat) },
        cv: { precoSc: n(cv.precoSc), umidTol: n(cv.umidTol), umidFat: n(cv.umidFat), impTol: n(cv.impTol), impFat: n(cv.impFat), avarTol: n(cv.avarTol), avarFat: n(cv.avarFat), queimTol: n(cv.queimTol), queimFat: n(cv.queimFat) },
        op: {
          freteTon: n(op.freteTon),
          quebraTol: n(op.quebraTol),
          diasDesagio: op.diasDesagio,
          // Comissão e classificador: zero no relatório de compra, valor real no consolidado
          comissaoValor: isCompra ? 0 : n(op.comissaoValor),
          comissaoTipo: op.comissaoTipo,
          custoClassTon: isCompra ? 0 : n(op.custoClassTon),
        },
        cfg: cfgN,
        flags: {
          reterFethab: (cc as any).reterFethab !== false,
          reterIagro: (cc as any).reterIagro !== false,
          reterSenar: (cc as any).reterSenar !== false,
          reterFunrural: (cc as any).reterFunrural !== false,
        },
      });
      result.push({ em, op, cc, cv, desc, calc });
    }
    return result;
  }, [embarquesFiltrados, operacoes, compras, vendas, descargas, cfg, tipo]);

  const totais = useMemo(() => linhas.reduce((acc, l) => ({
    pesoBal: acc.pesoBal + (l.desc ? n(l.desc.pesoDescarga) : n(l.em.pesoOrigem)),
    pesoOrigem: acc.pesoOrigem + n(l.em.pesoOrigem),
    pesoDescarga: acc.pesoDescarga + n(l.desc?.pesoDescarga ?? 0),
    kgCompra: acc.kgCompra + l.calc.kgCompra,
    valorCompra: acc.valorCompra + l.calc.valorCompra,
    retencoes: acc.retencoes + l.calc.retencoes,
    valorPagar: acc.valorPagar + l.calc.valorPagar,
    kgVenda: acc.kgVenda + l.calc.kgVenda,
    valorVenda: acc.valorVenda + l.calc.valorVenda,
    frete: acc.frete + l.calc.frete,
    comissao: acc.comissao + l.calc.comissao,
    classCusto: acc.classCusto + l.calc.classCusto,
    desagio: acc.desagio + l.calc.desagio,
    resultado: acc.resultado + l.calc.resultado,
    quebraKg: acc.quebraKg + l.calc.quebraKg,
    // Desconto real de avariado (já aplica tolerância via calcFinal)
    // Peso físico de avariado (informativo) — não é desconto
    avarFisico: acc.avarFisico + (l.desc ? n(l.desc.dcAvar) / 100 * n(l.desc.pesoDescarga) : n(l.em.avar) / 100 * n(l.em.pesoOrigem)),
    // Desconto real de avariado (só o excedente acima da tolerância)
    avar: acc.avar + (l.desc ? l.calc.clsCompraDesc.avar.kgDesc : l.calc.clsOrig.avar.kgDesc),
  }), { pesoBal: 0, pesoOrigem: 0, pesoDescarga: 0, kgCompra: 0, valorCompra: 0, retencoes: 0, valorPagar: 0, kgVenda: 0, valorVenda: 0, frete: 0, comissao: 0, classCusto: 0, desagio: 0, resultado: 0, quebraKg: 0, avar: 0, avarFisico: 0 }), [linhas]);

  // Dados do contrato selecionado para o cabeçalho
  const ccSel = contratoCompraId ? compras.find(c => c.id === contratoCompraId) : (linhas[0]?.cc ?? null);
  const cvSel = contratoVendaId ? vendas.find(v => v.id === contratoVendaId) : (linhas[0]?.cv ?? null);
  const opSel = operacaoId ? operacoes.find(o => o.id === operacaoId) : (linhas[0]?.op ?? null);

  // Pagamentos do contrato de compra selecionado
  // Pagamentos: se contrato selecionado, filtra por ele; senão soma todos os contratos das linhas
  const contratoIdsNasLinhas = useMemo(() => {
    const ids: number[] = [];
    // cc.id pode ser number ou string dependendo do banco
    linhas.forEach(l => { const id = Number(l.cc?.id); if (id && !ids.includes(id)) ids.push(id); });
    return ids;
  }, [linhas]);
  // ATENÇÃO: o campo no banco é 'compraId', não 'contratoCompraId'
  const pgtos = useMemo(() => {
    if (contratoCompraId) return pagamentos.filter((p: any) => Number(p.compraId) === contratoCompraId);
    return pagamentos.filter((p: any) => contratoIdsNasLinhas.includes(Number(p.compraId)));
  }, [pagamentos, contratoCompraId, contratoIdsNasLinhas]);
  const totalPago = pgtos.reduce((s: number, p: any) => s + n(p.valor), 0);
  const saldoPagar = totais.valorPagar - totalPago;
  const temCredito = saldoPagar < -0.01;

  // Datas de entrega
  const datasEmbarque = linhas.map(l => l.em.dataEmbarque).filter(Boolean).sort();
  const dataInicial = datasEmbarque[0] ? fmtDate(datasEmbarque[0]) : "—";
  const dataFinal = datasEmbarque[datasEmbarque.length - 1] ? fmtDate(datasEmbarque[datasEmbarque.length - 1]) : "—";

  function exportCSV() {
    const headers = ["NF Compra","NF Venda","Data NFe","Placa","Peso Nota","Peso Difer.","Peso Balanço","% Imp.","Desc. Imp.","% Umid.","Desc. Umid.","% Avar.","Desc. Avar.","Peso Líquido","Valor Total","SENAR/FUNRURAL","Valor Líquido"];
    const rows = linhas.map(l => {
      // Descontos reais com tolerância aplicada
      const clsRef = l.desc ? l.calc.clsCompraDesc : l.calc.clsOrig;
      const descImp = clsRef.imp.kgDesc;
      const descUmid = clsRef.umid.kgDesc;
      const descAvar = clsRef.avar.kgDesc;
      const pesoBal = l.desc ? n(l.desc.pesoDescarga) : n(l.em.pesoOrigem);
      const pesoDifer = n(l.em.pesoOrigem) - pesoBal;
      return [
        l.em.nfeEntrada ?? "", l.em.nfeSaida ?? "",
        fmtDate(l.em.dataEmbarque), l.em.placa ?? "",
        fmt(n(l.em.pesoOrigem)), pesoDifer > 0 ? fmt(-pesoDifer) : "0", fmt(pesoBal),
        fmt(n(l.em.imp)), descImp > 0 ? fmt(descImp) : "0,00",
        fmt(n(l.em.umidade)), descUmid > 0 ? fmt(descUmid) : "0,00",
        fmt(n(l.em.avar)), descAvar > 0 ? fmt(descAvar) : "0,00",
        fmt(l.calc.kgCompra), fmt(l.calc.valorCompra), fmt(l.calc.retencoes), fmt(l.calc.valorPagar),
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `relatorio_timeops_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const nomeEmpresa = "TIME AGRI BUSINESS";
  const emissaoStr = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Emitir Relatório"
        description="Relatório Fechamento Financeiro Fiscal — modelo operacional"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Tipo de relatório">
            <select className={selectCls} value={tipo} onChange={e => setTipo(e.target.value as any)}>
              <option value="compra">Relatório de Compra</option>
              <option value="venda">Relatório de Venda</option>
              <option value="consolidado">Consolidado</option>
            </select>
          </Field>
          <Field label="Contrato de compra">
            <select className={selectCls} value={contratoCompraId || ""} onChange={e => { setContratoCompraId(Number(e.target.value)); setOperacaoId(0); }}>
              <option value="">Todos</option>
              {compras.map(c => <option key={c.id} value={c.id}>{c.sigla} — {c.fornecedor}</option>)}
            </select>
          </Field>
          <Field label="Contrato de venda">
            <select className={selectCls} value={contratoVendaId || ""} onChange={e => { setContratoVendaId(Number(e.target.value)); setOperacaoId(0); }}>
              <option value="">Todos</option>
              {vendas.map(v => <option key={v.id} value={v.id}>{v.sigla} — {v.comprador}</option>)}
            </select>
          </Field>
          <Field label="Operação">
            <select className={selectCls} value={operacaoId || ""} onChange={e => setOperacaoId(Number(e.target.value))}>
              <option value="">Todas</option>
              {operacoes.map(o => <option key={o.id} value={o.id}>{o.sigla}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* ═══════════════ RELATÓRIO NO MODELO DA IMAGEM ═══════════════ */}
      <div id="relatorio-print" className="bg-white text-black rounded-xl border border-gray-300 overflow-hidden print-full text-[10px] font-sans">

        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-400 p-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/manus-storage/logo-time-agri_6188c408.webp"
              alt="TIME Agri Business"
              style={{ height: 100, width: "auto", objectFit: "contain" }}
            />
          </div>
          <div className="text-center flex-1 px-4">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-800">
              Relatório Fechamento Financeiro Fiscal —{" "}
              {tipo === "compra" ? "Compra" : tipo === "venda" ? "Venda" : "Consolidado"}
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">{nomeEmpresa}</p>
          </div>
          <div className="text-right text-[9px] text-gray-500 shrink-0">
            <p>Emissão: {emissaoStr}</p>
          </div>
        </div>

        {/* Dados do contrato */}
        {linhas.length > 0 && (
          <div className="border-b border-gray-300 p-2 grid grid-cols-3 gap-2 bg-gray-50">
            {/* Coluna 1 */}
            <div className="border border-gray-300 p-2 bg-white">
              <div className="space-y-0.5">
                <p><span className="font-bold">CONTRATO:</span> {ccSel ? `${ccSel.sigla} — ${ccSel.favorecido || ccSel.fornecedor}` : opSel?.sigla ?? "—"}</p>
                <p><span className="font-bold">PRODUTO:</span> {ccSel?.produto ?? linhas[0]?.cc?.produto ?? "—"}</p>
                <p><span className="font-bold">FRETE:</span> {opSel ? `R$ ${fmt(n(opSel.freteTon))}/t` : "—"}</p>
              </div>
            </div>
            {/* Coluna 2 — quantidades */}
            <div className="border border-gray-300 p-2 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-bold pb-0.5"></th>
                    <th className="text-right font-bold pb-0.5">CONTRATO</th>
                    <th className="text-right font-bold pb-0.5">ENTREGUE</th>
                    <th className="text-right font-bold pb-0.5">ENTREGAR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">SC</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.volumeKg/60), 2) : "—"}</td>
                    <td className="text-right">{fmt(totais.kgCompra / 60, 2)}</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.volumeKg/60) - totais.kgCompra / 60, 2) : "—"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">KG</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.volumeKg/60) * 60, 0) : "—"}</td>
                    <td className="text-right">{fmt(totais.kgCompra, 0)}</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.volumeKg/60) * 60 - totais.kgCompra, 0) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Coluna 3 — preço e entrega */}
            <div className="border border-gray-300 p-2 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-bold pb-0.5"></th>
                    <th className="text-right font-bold pb-0.5">VLR UNITÁRIO</th>
                    <th className="text-right font-bold pb-0.5">VLR TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">SC</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.precoSc), 2) : "—"}</td>
                    <td className="text-right">{brl(totais.valorCompra)}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">KG</td>
                    <td className="text-right">{ccSel ? fmt(n(ccSel.precoSc) / 60, 4) : "—"}</td>
                    <td className="text-right text-[9px] text-gray-500">
                      ENTREGA: {dataInicial} a {dataFinal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabela principal de NFes */}
        {linhas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum dado para o filtro selecionado. Selecione um contrato de compra ou operação.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-400">
                    {[
                      "NFE COMPRA","NFE VENDA","DATA NFE","PLACA",
                      "PESO NOTA","PESO DIFER.","PESO BALANÇO",
                      "% IMP.","DESC. IMP.","% UMID.","DESC. UMID.",
                      "% AVAR.","DESC. AVAR.",
                      "PESO LÍQUIDO","VALOR TOTAL","SENAR/FUNRURAL","VALOR LÍQUIDO"
                    ].map(h => (
                      <th key={h} className="border border-gray-300 px-1 py-1 text-center font-bold text-gray-700 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => {
                    // Descontos reais de classificação (já aplicam tolerância via calcFinal)
                    const clsRef = l.desc ? l.calc.clsCompraDesc : l.calc.clsOrig;
                    const descImp = clsRef.imp.kgDesc;
                    const descUmid = clsRef.umid.kgDesc;
                    const descAvar = clsRef.avar.kgDesc;
                    // Peso balança = peso de descarga (se houver), senão peso origem
                    const pesoBal = l.desc ? n(l.desc.pesoDescarga) : n(l.em.pesoOrigem);
                    // Diferença entre peso nota e peso balança
                    const pesoDifer = n(l.em.pesoOrigem) - pesoBal;
                    return (
                      <tr key={l.em.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{l.em.nfeEntrada || "—"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{l.em.nfeSaida || "—"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center whitespace-nowrap">{fmtDate(l.em.dataEmbarque)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{l.em.placa || "—"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmt(n(l.em.pesoOrigem), 0)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right text-red-700">{pesoDifer > 0 ? `-${fmt(pesoDifer, 0)}` : "0"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right font-semibold">{fmt(pesoBal, 0)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmt(n(l.em.imp), 2)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{descImp > 0 ? fmt(descImp, 2) : "0,00"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmt(n(l.em.umidade), 2)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{descUmid > 0 ? fmt(descUmid, 2) : "0,00"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmt(n(l.em.avar), 2)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{descAvar > 0 ? fmt(descAvar, 2) : "0,00"}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right font-semibold">{fmt(l.calc.kgCompra, 3)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right font-semibold">{fmt(l.calc.valorCompra, 2)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right text-red-700">{fmt(l.calc.retencoes, 2)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right font-bold text-green-800">{fmt(l.calc.valorPagar, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold">
                    <td className="border border-gray-300 px-1 py-1 text-center" colSpan={4}>TOTAL: {linhas.length}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">{fmt(totais.pesoOrigem, 0)}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right text-red-700">{(totais.pesoOrigem - totais.pesoBal) > 0 ? `-${fmt(totais.pesoOrigem - totais.pesoBal, 0)}` : "0"}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right font-bold">{fmt(totais.pesoBal, 0)}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right">—</td>
                    <td className="border border-gray-300 px-1 py-1 text-right font-bold">{fmt(totais.kgCompra, 3)}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right font-bold">{fmt(totais.valorCompra, 2)}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right text-red-700">{fmt(totais.retencoes, 2)}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right font-bold text-green-800">{fmt(totais.valorPagar, 2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rodapé com 3 colunas: Resumo Financeiro | Resumo Fiscal | Dados Bancários */}
            <div className="border-t-2 border-gray-400 grid grid-cols-3 gap-0 bg-white">

              {/* Resumo Financeiro */}
              <div className="border-r border-gray-300 p-3">
                <p className="font-bold text-center border-b border-gray-300 pb-1 mb-2 text-[10px] uppercase tracking-wide">Resumo Financeiro</p>
                <table className="w-full">
                  <tbody className="space-y-1">
                    <tr><td className="font-semibold py-0.5">Valor a Pagar:</td><td className="text-right font-bold">{brl(totais.valorPagar)}</td></tr>
                    <tr><td className="font-semibold py-0.5">Valor Pago:</td><td className="text-right">{brl(totalPago)}</td></tr>
                    {temCredito ? (
                      <tr className="border-t border-gray-200"><td className="font-bold py-0.5 text-green-700">Crédito c/ Fornecedor:</td><td className="text-right font-bold text-green-700">{brl(Math.abs(saldoPagar))}</td></tr>
                    ) : (
                      <tr className="border-t border-gray-200"><td className="font-bold py-0.5 text-red-700">Saldo a Pagar:</td><td className="text-right font-bold text-red-700">{brl(saldoPagar)}</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-3 border-t border-gray-200 pt-2">
                  <p className="font-bold text-[9px] uppercase tracking-wide mb-1">Ajuste Financeiro</p>
                  <table className="w-full text-[9px]">
                    <tbody>
                      <tr><td>Valor Complementar:</td><td className="text-right">R$ 0,00</td></tr>
                      <tr><td>Valor Complementado:</td><td className="text-right">0</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumo para Ajuste Fiscal/Financeiro */}
              <div className="border-r border-gray-300 p-3">
                <p className="font-bold text-center border-b border-gray-300 pb-1 mb-2 text-[10px] uppercase tracking-wide">Resumo para Ajuste Fiscal / Financeiro</p>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left font-bold pb-1">Tipo</th>
                      <th className="text-right font-bold pb-1">Peso</th>
                      <th className="text-right font-bold pb-1">Valor</th>
                      <th className="text-left font-bold pb-1 pl-2">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Origem:</td>
                      <td className="text-right">{fmt(totais.pesoOrigem, 0)}</td>
                      <td className="text-right">{brl(totais.valorCompra)}</td>
                      <td className="pl-2 text-gray-600">NF-e Compra</td>
                    </tr>
                    <tr>
                      <td>Total Impostos:</td>
                      <td className="text-right">0</td>
                      <td className="text-right">{brl(totais.retencoes)}</td>
                      <td className="pl-2 text-gray-600">Ret. Tributos</td>
                    </tr>
                    <tr>
                      <td>Total Ajust. Qtd.:</td>
                      <td className="text-right text-red-700">{totais.quebraKg > 0 ? `-${fmt(totais.quebraKg, 0)}` : "0"}</td>
                      <td className="text-right">0,00</td>
                      <td className="pl-2 text-gray-600">NFe Compl.</td>
                    </tr>
                    {totais.avar > 0 && (
                      <tr>
                        <td>Total Avariado:</td>
                        <td className="text-right">
                          <span className="text-red-700">{fmt(totais.avar, 3)}</span>
                        </td>
                        <td className="text-right text-red-700">
                          {/* valor monetário do desconto de avariado = kg desconto × preço/kg */}
                          {brl(linhas.reduce((s, l) => {
                            const clsRef = l.desc ? l.calc.clsCompraDesc : l.calc.clsOrig;
                            const kgAvar = clsRef.avar.kgDesc;
                            const precoKg = l.calc.valorCompra / (l.calc.kgCompra || 1);
                            return s + kgAvar * precoKg;
                          }, 0))}
                        </td>
                        <td className="pl-2 text-gray-600">Desc. Avariado</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-300 font-bold">
                      <td>Total Líquido:</td>
                      <td className="text-right">{fmt(totais.kgCompra, 3)}</td>
                      <td className="text-right">{brl(totais.valorPagar)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dados Bancários */}
              <div className="p-3">
                <p className="font-bold text-center border-b border-gray-300 pb-1 mb-2 text-[10px] uppercase tracking-wide">Dados Bancários</p>
                {ccSel ? (
                  <div className="space-y-1">
                    <p><span className="font-semibold">Banco:</span> {ccSel.banco || "—"}</p>
                    <p><span className="font-semibold">Agência:</span> {ccSel.agencia || "—"}</p>
                    <p><span className="font-semibold">Conta:</span> {ccSel.conta || "—"}</p>
                    <p className="mt-2"><span className="font-semibold">CNPJ/CPF:</span> {ccSel.docFavorecido || "—"}</p>
                    <p><span className="font-semibold">Favorecido:</span> {ccSel.favorecido || ccSel.fornecedor}</p>
                    {ccSel.pix && <p><span className="font-semibold">PIX:</span> {ccSel.pix}</p>}
                  </div>
                ) : (
                  <p className="text-gray-500 text-[9px]">Selecione um contrato de compra para exibir os dados bancários.</p>
                )}
              </div>
            </div>

            {/* Rodapé de impressão */}
            <div className="border-t border-gray-300 p-2 flex justify-between text-[8px] text-gray-500 bg-gray-50">
              <span>Emitido em: {emissaoStr} por TIME OPS</span>
              <span>{nomeEmpresa}</span>
              <span>Página: 1/1</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
