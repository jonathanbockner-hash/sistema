// ─── Utilitários de formatação ────────────────────────────────────────────────
export const n = (v: any): number => Number(String(v ?? "").replace(",", ".")) || 0;

export const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const kg = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " kg";

export const ton = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " t";

export const pct = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + "%";

export const sc = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " sc";

// ─── Regra de classificação ───────────────────────────────────────────────────
export function regra(peso: number, valor: number, tol: number, fator: number) {
  const exced = Math.max(0, n(valor) - n(tol));
  const perc = exced * n(fator);
  return { exced, perc, kgDesc: (peso * perc) / 100 };
}

export interface ClassifResult {
  umid: ReturnType<typeof regra>;
  imp: ReturnType<typeof regra>;
  avar: ReturnType<typeof regra>;
  queim: ReturnType<typeof regra>;
  totalKg: number;
}

export function classif(
  peso: number,
  vals: { umidade: number; imp: number; avar: number; queim: number },
  tols: { umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number }
): ClassifResult {
  const umid = regra(peso, vals.umidade, tols.umidTol, tols.umidFat);
  const imp = regra(peso, vals.imp, tols.impTol, tols.impFat);
  const avar = regra(peso, vals.avar, tols.avarTol, tols.avarFat);
  const queim = regra(peso, vals.queim, tols.queimTol, tols.queimFat);
  return { umid, imp, avar, queim, totalKg: umid.kgDesc + imp.kgDesc + avar.kgDesc + queim.kgDesc };
}

// ─── Configuração tributária ──────────────────────────────────────────────────
/**
 * Estrutura de configuração tributária usada nos cálculos.
 *
 * FETHAB (Mato Grosso — Lei 7.263/2000):
 *   Calculado em R$ por tonelada com base na UPF-MT vigente.
 *   Soja: FETHAB1 (10% UPF) + FETHAB2 (10% UPF) = 20% UPF/ton = R$ 48,70/ton
 *   IAGRO Soja (código 8090): 1,15% UPF/ton = R$ 2,80/ton (pode ser configurado separado ou embutido)
 *   Milho: FETHAB1 (6% UPF) — apenas interestaduais/exportação = R$ 14,61/ton
 *   UPF-MT 1º sem/2026 = R$ 243,49 → Soja FETHAB: R$ 48,70/ton | Milho: R$ 14,61/ton
 *
 * IAGRO (Mato Grosso — código 8090):
 *   1,15% da UPF-MT por tonelada de soja = R$ 2,80/ton (1º sem/2026).
 *   Pode ser configurado separado no campo iagroRsTon ou embutido no fethabRsTon.
 *   Padrão: iagroRsTon = 0 (embutido no FETHAB) para evitar dupla contagem.
 *   Para MS o IAGRO é uma taxa sanitária diferente (não monetária, por hectare).
 *
 * SENAR (federal — Lei 8.315/1991):
 *   0,20% sobre a receita bruta da comercialização (valor de compra bruto).
 *   Retido pelo adquirente (trading) na nota fiscal.
 *
 * FUNRURAL (federal — Lei 8.212/1991 + LC 224/2025):
 *   Produtor Pessoa Física: 1,63% (INSS 1,32% + RAT 0,11% + SENAR 0,20%) — vigente a partir de abr/2026
 *   Produtor Pessoa Jurídica: 2,23% (Funrural+RAT 1,98% + SENAR 0,25%)
 *   Base: receita bruta da comercialização (valor de compra bruto).
 *   Retido pelo adquirente (trading) quando compra de PF.
 *
 * NOTA: O SENAR está embutido no FUNRURAL para PF (0,20% dos 1,63%).
 *   Quando usar FUNRURAL PF, zerar SENAR separado para evitar dupla contagem.
 *   Quando o produtor for PJ, usar FUNRURAL = 2,23% e SENAR = 0.
 */
export interface TribConfig {
  /** FETHAB em R$ por tonelada (ex: 51.50 para soja MT com UPF 243,49) */
  fethabRsTon: number;
  /** IAGRO em R$ por tonelada (já incluso no fethabRsTon para soja MT; usar separado se necessário) */
  iagroRsTon: number;
  /** SENAR em % sobre o valor bruto de compra (ex: 0.20 para PF sem FUNRURAL) */
  senarPerc: number;
  /** FUNRURAL em % sobre o valor bruto de compra (ex: 1.63 para PF a partir abr/2026) */
  funruralPerc: number;
  /** Taxa de fundo ao mês para deságio (%) */
  fundoMes: number;
  /** Dias extras D+ */
  dmais: number;
}

/**
 * Calcula as retenções tributárias sobre uma operação de compra.
 * @param valorBruto - Valor bruto da compra (R$)
 * @param pesoKg - Peso líquido em kg (após descontos de classificação)
 * @param cfg - Configuração tributária
 */
export function calcRetencoes(valorBruto: number, pesoKg: number, cfg: TribConfig) {
  const toneladas = pesoKg / 1000;

  // FETHAB: R$ por tonelada (inclui IAGRO para soja MT)
  const retFethab = toneladas * n(cfg.fethabRsTon);

  // IAGRO: R$ por tonelada (separado, se configurado)
  const retIagro = toneladas * n(cfg.iagroRsTon);

  // SENAR: % sobre valor bruto
  const retSenar = valorBruto * n(cfg.senarPerc) / 100;

  // FUNRURAL: % sobre valor bruto
  const retFun = valorBruto * n(cfg.funruralPerc) / 100;

  const retencoes = retFethab + retIagro + retSenar + retFun;
  return { retFethab, retIagro, retSenar, retFun, retencoes };
}

// ─── Cálculo de embarque (origem) ─────────────────────────────────────────────
export interface CalcEmbarqueInput {
  pesoOrigem: number;
  umidade: number; imp: number; avar: number; queim: number;
  cc: { precoSc: number; umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number };
  cfg: TribConfig;
}

export function calcEmbarque(input: CalcEmbarqueInput) {
  const { pesoOrigem, cc, cfg } = input;
  const cls = classif(pesoOrigem, { umidade: input.umidade, imp: input.imp, avar: input.avar, queim: input.queim }, cc);
  const kgCompra = Math.max(0, pesoOrigem - cls.totalKg);
  const scCompra = kgCompra / 60;
  const valorCompra = scCompra * n(cc.precoSc);
  const { retFethab, retIagro, retSenar, retFun, retencoes } = calcRetencoes(valorCompra, kgCompra, cfg);
  return { cls, kgCompra, scCompra, valorCompra, retFethab, retIagro, retSenar, retFun, retencoes, valorPagar: valorCompra - retencoes };
}

// ─── Cálculo final (descarga) ─────────────────────────────────────────────────
export interface CalcFinalInput extends CalcEmbarqueInput {
  pesoDescarga: number;
  dcUmidade: number; dcImp: number; dcAvar: number; dcQueim: number;
  cv: { precoSc: number; umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number };
  op: { freteTon: number; quebraTol: number; diasDesagio: number; comissaoValor: number; comissaoTipo: string; custoClassTon: number };
  cfg: TribConfig;
}

export function calcFinal(input: CalcFinalInput) {
  const { pesoOrigem, pesoDescarga, cc, cv, op, cfg } = input;
  const temDesc = n(pesoDescarga) > 0;

  // Classificação na origem contra contrato de compra
  const clsOrig = classif(pesoOrigem, { umidade: input.umidade, imp: input.imp, avar: input.avar, queim: input.queim }, cc);

  // Classificação na descarga contra contrato de venda
  const clsDesc = temDesc
    ? classif(pesoDescarga, { umidade: input.dcUmidade, imp: input.dcImp, avar: input.dcAvar, queim: input.dcQueim }, cv)
    : { umid: { kgDesc: 0 }, imp: { kgDesc: 0 }, avar: { kgDesc: 0 }, queim: { kgDesc: 0 }, totalKg: 0 };

  // Classificação na descarga contra contrato de compra (para recálculo do valor a pagar)
  const clsCompraDesc = temDesc
    ? classif(pesoDescarga, { umidade: input.dcUmidade, imp: input.dcImp, avar: input.dcAvar, queim: input.dcQueim }, cc)
    : clsOrig;

  const basePesoCompra = temDesc ? pesoDescarga : pesoOrigem;
  const kgCompra = Math.max(0, basePesoCompra - clsCompraDesc.totalKg);
  const valorCompra = (kgCompra / 60) * n(cc.precoSc);
  const { retFethab, retIagro, retSenar, retFun, retencoes } = calcRetencoes(valorCompra, kgCompra, cfg);
  const valorPagar = valorCompra - retencoes;

  // Venda
  const kgVenda = Math.max(0, n(pesoDescarga) - clsDesc.totalKg);
  const valorVenda = (kgVenda / 60) * n(cv.precoSc);

  // Quebra logística
  const quebraKg = Math.max(0, n(pesoOrigem) - n(pesoDescarga));
  const quebraPerc = n(pesoOrigem) ? (quebraKg / n(pesoOrigem)) * 100 : 0;
  const quebraTolKg = n(pesoOrigem) * n(op.quebraTol) / 100;
  const quebraExcedKg = Math.max(0, quebraKg - quebraTolKg);
  const prejuQuebra = (quebraExcedKg / 60) * n(cv.precoSc);

  // Custos
  const frete = (n(pesoOrigem) / 1000) * n(op.freteTon);
  let comissao = 0;
  if (op.comissaoTipo === "sc") comissao = (n(pesoOrigem) / 60) * n(op.comissaoValor);
  else if (op.comissaoTipo === "ton") comissao = (n(pesoOrigem) / 1000) * n(op.comissaoValor);
  else if (op.comissaoTipo === "fixo") comissao = n(op.comissaoValor);
  else if (op.comissaoTipo === "percVenda") comissao = valorVenda * n(op.comissaoValor) / 100;
  const classCusto = (n(pesoOrigem) / 1000) * n(op.custoClassTon);

  // Deságio
  const dias = n(op.diasDesagio) + n(cfg.dmais);
  const desagio = valorVenda * (n(cfg.fundoMes) / 100 / 30 * dias);

  // Resultado
  const resultado = valorVenda - valorCompra - frete - comissao - classCusto - desagio - prejuQuebra;

  return {
    clsOrig, clsDesc, clsCompraDesc,
    kgCompra, valorCompra, retFethab, retIagro, retSenar, retFun, retencoes, valorPagar,
    kgVenda, valorVenda,
    quebraKg, quebraPerc, quebraTolKg, quebraExcedKg, prejuQuebra,
    frete, comissao, classCusto, dias, desagio, resultado, temDesc,
  };
}
