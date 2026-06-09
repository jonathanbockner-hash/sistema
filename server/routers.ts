import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut, storageGetSignedUrl } from "./storage";
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
      fethabRsTon: z.number(), iagroRsTon: z.number(),
      senarPerc: z.number(), funruralPerc: z.number(),
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

  // ─── Notas Fiscais (extração via LLM) ─────────────────────────────────────
  nf: router({
    /**
     * Recebe o PDF da nota fiscal em base64, faz upload para o storage e
     * extrai os dados estruturados via LLM (data, placa, número NF, peso).
     */
    extrair: publicProcedure.input(z.object({
      pdfBase64: z.string(),
      filename: z.string().default("nota_fiscal.pdf"),
      tipo: z.enum(["entrada", "saida"]).default("saida"),
    })).mutation(async ({ input }) => {
      // 1. Upload do PDF para o storage
      const pdfBuffer = Buffer.from(input.pdfBase64, "base64");
      const { key, url } = await storagePut(
        `nf-pdfs/${input.filename}`,
        pdfBuffer,
        "application/pdf"
      );

      // 2. URL assinada para o LLM acessar o arquivo
      const signedUrl = await storageGetSignedUrl(key);

      const instrucaoTipo = input.tipo === "saida"
        ? "Esta é uma NOTA FISCAL DE SAÍDA (emitida por nós para o comprador). Extraia os campos solicitados."
        : "Esta é uma NOTA FISCAL DE ENTRADA (emitida pelo fornecedor/produtor rural para nós). Extraia os campos solicitados.";

      // 3. Extração estruturada via LLM
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: `Você é um especialista em leitura de notas fiscais brasileiras de transporte de grãos (soja, milho, etc.).
Extraia os dados solicitados da nota fiscal em formato JSON estrito.
Regras:
- Para campos não encontrados, use null (nunca string vazia)
- Datas no formato YYYY-MM-DD
- Pesos em kg como número (ex: 28450.5)
- Número da NF: apenas dígitos, sem formatação (ex: "123456")
- Placa: formato ABC1234 ou ABC1D23 (Mercosul), sem traços ou espaços`,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "file_url",
                file_url: { url: signedUrl, mime_type: "application/pdf" },
              },
              {
                type: "text",
                text: `${instrucaoTipo}

Extraia os seguintes campos:
- dataEmissao: data de emissão da nota (formato YYYY-MM-DD)
- numeroNF: número da nota fiscal (apenas dígitos)
- placa: placa do veículo transportador (campo "Placa Veículo", "Veículo" ou similar)
- pesoLiquido: peso líquido em kg (campo "Peso Líquido" ou "Peso Neto")
- pesoBruto: peso bruto em kg (campo "Peso Bruto")
- fornecedor: nome completo do emitente/remetente
- produto: descrição do produto/mercadoria (ex: "Soja em grãos", "Milho em grãos")`,
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "nota_fiscal",
            strict: true,
            schema: {
              type: "object",
              properties: {
                dataEmissao: { type: ["string", "null"], description: "Data de emissão no formato YYYY-MM-DD" },
                numeroNF: { type: ["string", "null"], description: "Número da nota fiscal (apenas dígitos)" },
                placa: { type: ["string", "null"], description: "Placa do veículo transportador" },
                pesoLiquido: { type: ["number", "null"], description: "Peso líquido em kg" },
                pesoBruto: { type: ["number", "null"], description: "Peso bruto em kg" },
                fornecedor: { type: ["string", "null"], description: "Nome do emitente/remetente" },
                produto: { type: ["string", "null"], description: "Descrição do produto/mercadoria" },
              },
              required: ["dataEmissao", "numeroNF", "placa", "pesoLiquido", "pesoBruto", "fornecedor", "produto"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content;
      let dados: Record<string, any> = {};
      try {
        dados = typeof content === "string" ? JSON.parse(content) : (content as any) ?? {};
      } catch {
        dados = {};
      }

      return { storageKey: key, storageUrl: url, dados };
    }),
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
