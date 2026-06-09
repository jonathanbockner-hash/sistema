import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createCtx(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-user", email: "test@example.com",
      name: "Test User", loginMethod: "manus", role,
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const cleared: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      ...createCtx(),
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          cleared.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.name).toBe(COOKIE_NAME);
    expect(cleared[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });
});

// ─── Cálculos financeiros ─────────────────────────────────────────────────────

import { calcFinal, n, brl } from "../client/src/lib/calculos";

/**
 * Nova estrutura tributária:
 * - fethabRsTon: R$ por tonelada (ex: 48,70 para soja MT = 20% UPF-MT 1º sem/2026)
 * - iagroRsTon: R$ por tonelada (0 para soja MT, já incluso no FETHAB)
 * - senarPerc: % sobre valor bruto (0 quando FUNRURAL > 0, pois já incluso)
 * - funruralPerc: % sobre valor bruto (1,63% PF desde abr/2026, 2,23% PJ)
 */
const cfgNovo = {
  fethabRsTon: 48.70,  // Soja MT: 20% UPF-MT (R$ 243,49 → R$ 48,70/ton)
  iagroRsTon: 0,       // Soja MT: já incluso no FETHAB
  senarPerc: 0,        // Incluso no FUNRURAL PF (LC 224/2025)
  funruralPerc: 1.63,  // FUNRURAL PF: INSS Rural 1,32% + RAT 0,11% + SENAR 0,20%
  fundoMes: 2.5,
  dmais: 2,
};

describe("calcFinal — cálculos agrícolas com nova estrutura tributária", () => {
  const baseInput = {
    pesoOrigem: 30000,
    umidade: 14, imp: 1, avar: 0, queim: 0,
    pesoDescarga: 29700,
    dcUmidade: 14, dcImp: 1, dcAvar: 0, dcQueim: 0,
    cc: { precoSc: 100, umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 20, avarFat: 1, queimTol: 1, queimFat: 1 },
    cv: { precoSc: 110, umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 20, avarFat: 1, queimTol: 1, queimFat: 1 },
    op: { freteTon: 30, quebraTol: 0.5, diasDesagio: 15, comissaoValor: 0.5, comissaoTipo: "percentual", custoClassTon: 2 },
    cfg: cfgNovo,
  };

  it("calcula quebra corretamente", () => {
    const r = calcFinal(baseInput);
    expect(r.quebraKg).toBeCloseTo(300, 0);
    expect(r.quebraPerc).toBeCloseTo(1, 1);
  });

  it("calcula valor de compra baseado em 60 kg/sc", () => {
    const r = calcFinal(baseInput);
    expect(r.valorCompra).toBeGreaterThan(0);
    expect(r.valorCompra).toBeLessThanOrEqual(60000);
    expect(r.valorCompra).toBeCloseTo((r.kgCompra / 60) * baseInput.cc.precoSc, 1);
  });

  it("calcula valor de venda baseado em 60 kg/sc", () => {
    const r = calcFinal(baseInput);
    // pesoDescarga 29700 kg / 60 = 495 sc * R$110 = R$54.450
    expect(r.valorVenda).toBeCloseTo(54450, 0);
  });

  it("calcula frete corretamente", () => {
    const r = calcFinal(baseInput);
    // pesoOrigem 30000 kg = 30 ton * R$30/ton = R$900
    expect(r.frete).toBeCloseTo(900, 0);
  });

  it("FETHAB calculado em R$/ton sobre peso líquido (kgCompra)", () => {
    const r = calcFinal(baseInput);
    // FETHAB = kgCompra / 1000 × R$ 48,70/ton
    const esperado = (r.kgCompra / 1000) * cfgNovo.fethabRsTon;
    expect(r.retFethab).toBeCloseTo(esperado, 4);
    expect(r.retFethab).toBeGreaterThan(0);
  });

  it("IAGRO zero para soja MT (já incluso no FETHAB)", () => {
    const r = calcFinal(baseInput);
    expect(r.retIagro).toBe(0);
  });

  it("FUNRURAL PF: 1,63% sobre valor bruto", () => {
    const r = calcFinal(baseInput);
    const esperado = r.valorCompra * 1.63 / 100;
    expect(r.retFun).toBeCloseTo(esperado, 2);
  });

  it("SENAR zero quando FUNRURAL > 0 (evita dupla contagem)", () => {
    const r = calcFinal(baseInput);
    expect(r.retSenar).toBe(0);
  });

  it("resultado deve ser positivo com venda maior que compra", () => {
    const r = calcFinal(baseInput);
    expect(r.resultado).toBeGreaterThan(0);
  });

  it("classifica corretamente com umidade acima da tolerância", () => {
    const r = calcFinal({ ...baseInput, umidade: 16, cc: { ...baseInput.cc, umidTol: 14, umidFat: 1.8 } });
    // 2% acima da tolerância * 1.8 = 3.6% de desconto
    expect(r.clsOrig.umid.kgDesc).toBeGreaterThan(0);
  });

  it("sem desconto quando dentro da tolerância", () => {
    const r = calcFinal({ ...baseInput, umidade: 13 });
    expect(r.clsOrig.umid.kgDesc).toBe(0);
  });

  it("FETHAB milho MT: R$ 14,61/ton (6% UPF-MT)", () => {
    const cfgMilho = { ...cfgNovo, fethabRsTon: 14.61 };
    const r = calcFinal({ ...baseInput, cfg: cfgMilho });
    // FETHAB = kgCompra / 1000 × R$ 14,61/ton
    const esperado = (r.kgCompra / 1000) * 14.61;
    expect(r.retFethab).toBeCloseTo(esperado, 4);
    expect(r.retFethab).toBeGreaterThan(0);
  });

  it("FUNRURAL PJ: 2,23% sobre valor bruto", () => {
    const cfgPJ = { ...cfgNovo, funruralPerc: 2.23 };
    const r = calcFinal({ ...baseInput, cfg: cfgPJ });
    const esperado = r.valorCompra * 2.23 / 100;
    expect(r.retFun).toBeCloseTo(esperado, 2);
  });
});

// ─── Utilitários ─────────────────────────────────────────────────────────────

describe("utilitários n() e brl()", () => {
  it("n() converte string para número", () => {
    expect(n("100.50")).toBe(100.5);
    expect(n(null)).toBe(0);
    expect(n(undefined)).toBe(0);
    expect(n(42)).toBe(42);
  });

  it("brl() formata em reais", () => {
    const result = brl(1234.56);
    expect(result).toContain("1.234");
    expect(result).toContain("56");
  });
});

// ─── Tributação por destino (Contrato de Venda) ───────────────────────────────

/**
 * A lógica de ICMS/PIS/COFINS está no painel informativo do Contrato de Venda.
 * Testa a função que calcula os custos tributários da venda por destino e finalidade.
 */

function calcTribVenda(params: {
  valorVenda: number;
  destinoVenda: "intraestadual" | "interestadual";
  finalidadeVenda: "industria" | "exportacao" | "mercado_interno" | "trading";
  regimeTributario: "lucro_real" | "lucro_presumido" | "simples";
}) {
  const { valorVenda, destinoVenda, finalidadeVenda, regimeTributario } = params;

  // ICMS: diferimento em segunda operação (intraestadual) = 0%
  // Interestadual: alíquota varia por destino (12% geral, 7% para estados menos desenvolvidos)
  let icmsPerc = 0;
  if (destinoVenda === "interestadual") {
    icmsPerc = 12; // alíquota padrão interestadual
  }
  // intraestadual = diferimento = ICMS = 0

  // PIS/COFINS: isenção para exportação e indústria (imunidade constitucional)
  // Para trading/mercado interno com Lucro Real: PIS 1,65% + COFINS 7,60% = 9,25%
  let pisCofinsPerc = 0;
  if (finalidadeVenda === "exportacao") {
    pisCofinsPerc = 0; // imunidade constitucional
  } else if (finalidadeVenda === "industria") {
    pisCofinsPerc = 0; // suspensão/isenção para agroindústria
  } else if (regimeTributario === "lucro_real") {
    pisCofinsPerc = 9.25; // PIS 1,65% + COFINS 7,60%
  } else if (regimeTributario === "lucro_presumido") {
    pisCofinsPerc = 3.65; // PIS 0,65% + COFINS 3,00%
  }

  const custoIcms = valorVenda * icmsPerc / 100;
  const custoPisCofins = valorVenda * pisCofinsPerc / 100;
  const custoTotalTrib = custoIcms + custoPisCofins;

  return { icmsPerc, pisCofinsPerc, custoIcms, custoPisCofins, custoTotalTrib };
}

describe("tributação por destino — Contrato de Venda", () => {
  const valorVenda = 100_000;

  it("intraestadual com diferimento → ICMS = 0", () => {
    const r = calcTribVenda({
      valorVenda,
      destinoVenda: "intraestadual",
      finalidadeVenda: "mercado_interno",
      regimeTributario: "lucro_real",
    });
    expect(r.icmsPerc).toBe(0);
    expect(r.custoIcms).toBe(0);
  });

  it("interestadual → ICMS = 12%", () => {
    const r = calcTribVenda({
      valorVenda,
      destinoVenda: "interestadual",
      finalidadeVenda: "mercado_interno",
      regimeTributario: "lucro_real",
    });
    expect(r.icmsPerc).toBe(12);
    expect(r.custoIcms).toBeCloseTo(12_000, 2);
  });

  it("exportação → PIS/COFINS = 0 (imunidade constitucional)", () => {
    const r = calcTribVenda({
      valorVenda,
      destinoVenda: "interestadual",
      finalidadeVenda: "exportacao",
      regimeTributario: "lucro_real",
    });
    expect(r.pisCofinsPerc).toBe(0);
    expect(r.custoPisCofins).toBe(0);
  });

  it("trading lucro real → PIS/COFINS = 9,25%", () => {
    const r = calcTribVenda({
      valorVenda,
      destinoVenda: "intraestadual",
      finalidadeVenda: "trading",
      regimeTributario: "lucro_real",
    });
    expect(r.pisCofinsPerc).toBe(9.25);
    expect(r.custoPisCofins).toBeCloseTo(9_250, 2);
  });

  it("indústria → PIS/COFINS = 0 (suspensão)", () => {
    const r = calcTribVenda({
      valorVenda,
      destinoVenda: "intraestadual",
      finalidadeVenda: "industria",
      regimeTributario: "lucro_real",
    });
    expect(r.pisCofinsPerc).toBe(0);
    expect(r.custoPisCofins).toBe(0);
  });
});
