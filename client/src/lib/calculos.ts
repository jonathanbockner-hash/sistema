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

// ─── Cálculo de embarque (origem) ─────────────────────────────────────────────
export interface CalcEmbarqueInput {
  pesoOrigem: number;
  umidade: number; imp: number; avar: number; queim: number;
  cc: { precoSc: number; umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number };
  cfg: { fethab: number; iagro: number; senar: number; funrural: number };
}

export function calcEmbarque(input: CalcEmbarqueInput) {
  const { pesoOrigem, cc, cfg } = input;
  const cls = classif(pesoOrigem, { umidade: input.umidade, imp: input.imp, avar: input.avar, queim: input.queim }, cc);
  const kgCompra = Math.max(0, pesoOrigem - cls.totalKg);
  const scCompra = kgCompra / 60;
  const valorCompra = scCompra * n(cc.precoSc);
  const retFethab = valorCompra * n(cfg.fethab) / 100;
  const retIagro = valorCompra * n(cfg.iagro) / 100;
  const retSenar = valorCompra * n(cfg.senar) / 100;
  const retFun = valorCompra * n(cfg.funrural) / 100;
  const retencoes = retFethab + retIagro + retSenar + retFun;
  return { cls, kgCompra, scCompra, valorCompra, retFethab, retIagro, retSenar, retFun, retencoes, valorPagar: valorCompra - retencoes };
}

// ─── Cálculo final (descarga) ─────────────────────────────────────────────────
export interface CalcFinalInput extends CalcEmbarqueInput {
  pesoDescarga: number;
  dcUmidade: number; dcImp: number; dcAvar: number; dcQueim: number;
  cv: { precoSc: number; umidTol: number; umidFat: number; impTol: number; impFat: number; avarTol: number; avarFat: number; queimTol: number; queimFat: number };
  op: { freteTon: number; quebraTol: number; diasDesagio: number; comissaoValor: number; comissaoTipo: string; custoClassTon: number };
  cfg: { fethab: number; iagro: number; senar: number; funrural: number; fundoMes: number; dmais: number };
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
  const retFethab = valorCompra * n(cfg.fethab) / 100;
  const retIagro = valorCompra * n(cfg.iagro) / 100;
  const retSenar = valorCompra * n(cfg.senar) / 100;
  const retFun = valorCompra * n(cfg.funrural) / 100;
  const retencoes = retFethab + retIagro + retSenar + retFun;
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
