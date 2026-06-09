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

describe("calcFinal — cálculos agrícolas", () => {
  const baseInput = {
    pesoOrigem: 30000,
    umidade: 14, imp: 1, avar: 0, queim: 0,
    pesoDescarga: 29700,
    dcUmidade: 14, dcImp: 1, dcAvar: 0, dcQueim: 0,
    cc: { precoSc: 100, umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 20, avarFat: 1, queimTol: 1, queimFat: 1 },
    cv: { precoSc: 110, umidTol: 14, umidFat: 1.8, impTol: 1, impFat: 1, avarTol: 20, avarFat: 1, queimTol: 1, queimFat: 1 },
    op: { freteTon: 30, quebraTol: 0.5, diasDesagio: 15, comissaoValor: 0.5, comissaoTipo: "percentual", custoClassTon: 2 },
    cfg: { fethab: 0.2, iagro: 0, senar: 0.2, funrural: 2.5, fundoMes: 1.5, dmais: 2 },
  };

  it("calcula quebra corretamente", () => {
    const r = calcFinal(baseInput);
    expect(r.quebraKg).toBeCloseTo(300, 0);
    expect(r.quebraPerc).toBeCloseTo(1, 1);
  });

  it("calcula valor de compra baseado em 60 kg/sc", () => {
    const r = calcFinal(baseInput);
    // kgCompra = pesoOrigem - descontos de classificação
    // valorCompra = kgCompra / 60 * precoSc
    expect(r.valorCompra).toBeGreaterThan(0);
    expect(r.valorCompra).toBeLessThanOrEqual(50000);
    // Verifica que o cálculo usa kgCompra corretamente
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
