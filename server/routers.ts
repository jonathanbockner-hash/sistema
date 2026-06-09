import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getConfig, upsertConfig,
  listClassificadores, getClassificador, upsertClassificador, deleteClassificador,
  listContratosCompra, getContratoCompra, upsertContratoCompra, deleteContratoCompra,
  listContratosVenda, getContratoVenda, upsertContratoVenda, deleteContratoVenda,
  listOperacoes, getOperacao, upsertOperacao, deleteOperacao,
  listEmbarques, getEmbarque, upsertEmbarque, deleteEmbarque,
  getDescargaByEmbarque, upsertDescarga,
  listPagamentos, upsertPagamento, deletePagamento,
  listDescargas,
} from "./db";

const classifSchema = z.object({
  umidTol: z.number().default(14), umidFat: z.number().default(1.8),
  impTol: z.number().default(1), impFat: z.number().default(1),
  avarTol: z.number().default(20), avarFat: z.number().default(1),
  queimTol: z.number().default(1), queimFat: z.number().default(1),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Config ────────────────────────────────────────────────────────────────
  config: router({
    get: publicProcedure.query(() => getConfig()),
    save: publicProcedure.input(z.object({
      fundoMes: z.number(), dmais: z.number(),
      fethab: z.number(), iagro: z.number(), senar: z.number(), funrural: z.number(),
    })).mutation(({ input }) => upsertConfig(input)),
  }),

  // ─── Classificadores ───────────────────────────────────────────────────────
  classificadores: router({
    list: publicProcedure.query(() => listClassificadores()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getClassificador(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      nome: z.string().min(1),
      cpf: z.string().optional(),
      pix: z.string().min(1),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertClassificador(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteClassificador(input.id)),
  }),

  // ─── Contratos de Compra ───────────────────────────────────────────────────
  compras: router({
    list: publicProcedure.query(() => listContratosCompra()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getContratoCompra(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      sigla: z.string().min(1), fornecedor: z.string().min(1),
      produto: z.string(), qualidade: z.string(),
      volumeKg: z.number(), precoSc: z.number(),
      banco: z.string().min(1), agencia: z.string().min(1),
      conta: z.string().min(1), favorecido: z.string().min(1),
      docFavorecido: z.string().min(1), pix: z.string().min(1),
      obs: z.string().optional(),
    }).merge(classifSchema)).mutation(({ input }) => upsertContratoCompra(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteContratoCompra(input.id)),
  }),

  // ─── Contratos de Venda ────────────────────────────────────────────────────
  vendas: router({
    list: publicProcedure.query(() => listContratosVenda()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getContratoVenda(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      sigla: z.string().min(1), comprador: z.string().min(1),
      produto: z.string(), qualidade: z.string(),
      volumeKg: z.number(), precoSc: z.number(),
      obs: z.string().optional(),
    }).merge(classifSchema.extend({ avarTol: z.number().default(40) }))).mutation(({ input }) => upsertContratoVenda(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteContratoVenda(input.id)),
  }),

  // ─── Operações ─────────────────────────────────────────────────────────────
  operacoes: router({
    list: publicProcedure.query(() => listOperacoes()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getOperacao(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      sigla: z.string().min(1),
      compraId: z.number(), vendaId: z.number(),
      freteTon: z.number().default(0), quebraTol: z.number().default(0.25),
      diasDesagio: z.number().default(15),
      comissaoValor: z.number().default(0),
      comissaoTipo: z.enum(["sc", "ton", "fixo", "percVenda"]).default("sc"),
      classificadorId: z.number().nullable().optional(),
      custoClassTon: z.number().default(0.017),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertOperacao(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteOperacao(input.id)),
  }),

  // ─── Embarques ─────────────────────────────────────────────────────────────
  embarques: router({
    list: publicProcedure.input(z.object({
      operacaoId: z.number().optional(),
      dataIni: z.string().optional(),
      dataFim: z.string().optional(),
    }).optional()).query(({ input }) => listEmbarques({
      operacaoId: input?.operacaoId,
      dataIni: input?.dataIni ? new Date(input.dataIni) : undefined,
      dataFim: input?.dataFim ? new Date(input.dataFim) : undefined,
    })),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getEmbarque(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      operacaoId: z.number(),
      dataEmbarque: z.string().optional(),
      placa: z.string().optional(),
      nfeEntrada: z.string().optional(),
      nfeSaida: z.string().optional(),
      pesoOrigem: z.number(),
      status: z.enum(["Em trânsito", "Descarga pendente", "Finalizada"]).default("Em trânsito"),
      umidade: z.number().default(0), imp: z.number().default(0),
      avar: z.number().default(0), queim: z.number().default(0),
    })).mutation(({ input }) => upsertEmbarque(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteEmbarque(input.id)),
  }),

  // ─── Descargas ─────────────────────────────────────────────────────────────
  descargas: router({
    list: publicProcedure.query(() => listDescargas()),
    getByEmbarque: publicProcedure.input(z.object({ embarqueId: z.number() })).query(({ input }) => getDescargaByEmbarque(input.embarqueId)),
    save: publicProcedure.input(z.object({
      embarqueId: z.number(),
      dataDescarga: z.string().optional(),
      pesoDescarga: z.number(),
      placa: z.string().optional(),
      nfeSaida: z.string().optional(),
      dcUmidade: z.number().default(0), dcImp: z.number().default(0),
      dcAvar: z.number().default(0), dcQueim: z.number().default(0),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertDescarga(input)),
  }),

  // ─── Pagamentos ────────────────────────────────────────────────────────────
  pagamentos: router({
    list: publicProcedure.input(z.object({ compraId: z.number().optional() }).optional()).query(({ input }) => listPagamentos(input?.compraId)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      compraId: z.number(),
      dataPagamento: z.string().optional(),
      valor: z.number(),
      banco: z.string().optional(),
      comprovante: z.string().optional(),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertPagamento(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deletePagamento(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
