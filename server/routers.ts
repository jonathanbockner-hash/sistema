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
  listCorretores, getCorretor, upsertCorretor, deleteCorretor,
  listContratosCompra, getContratoCompra, upsertContratoCompra, deleteContratoCompra,
  listContratosVenda, getContratoVenda, upsertContratoVenda, deleteContratoVenda,
  listOperacoes, getOperacao, upsertOperacao, deleteOperacao,
  listEmbarques, listEmbarquesSemDescarga, getEmbarque, upsertEmbarque, deleteEmbarque,
  getDescargaByEmbarque, upsertDescarga, listDescargas,
  listPagamentos, upsertPagamento, deletePagamento,
} from "./db";

const classifSchema = z.object({
  umidTol: z.number().default(14), umidFat: z.number().default(1.8),
  impTol: z.number().default(1), impFat: z.number().default(1),
  avarTol: z.number().default(20), avarFat: z.number().default(1),
  queimTol: z.number().default(1), queimFat: z.number().default(1),
});

/** Gera sigla automática para operação: COMPRA-VENDA-SEQ */
async function gerarSiglaOperacao(compraId: number, vendaId: number): Promise<string> {
  const [compra, venda, ops] = await Promise.all([
    getContratoCompra(compraId),
    getContratoVenda(vendaId),
    listOperacoes(),
  ]);
  const prefixo = `${compra?.sigla ?? compraId}-${venda?.sigla ?? vendaId}`;
  const existentes = ops.filter(o => o.sigla.startsWith(prefixo));
  const seq = existentes.length + 1;
  return `${prefixo}-OP${String(seq).padStart(2, "0")}`;
}

/** Helper para extração de documentos via LLM */
async function extrairDocumentoViaLLM(
  pdfBase64: string,
  filename: string,
  instrucao: string,
  campos: string,
  jsonSchema: Record<string, any>
) {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const { key, url } = await storagePut(`docs/${Date.now()}-${filename}`, pdfBuffer, "application/pdf");
  const signedUrl = await storageGetSignedUrl(key);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: [{
          type: "text",
          text: `Você é um especialista em leitura de documentos fiscais e financeiros brasileiros.
Extraia os dados solicitados no formato JSON estrito.
Regras: campos não encontrados → null; datas → YYYY-MM-DD; valores monetários → número sem símbolo; pesos → número em kg.`,
        }],
      },
      {
        role: "user",
        content: [
          { type: "file_url", file_url: { url: signedUrl, mime_type: "application/pdf" } },
          { type: "text", text: `${instrucao}\n\nExtraia os seguintes campos:\n${campos}` },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "extracao", strict: true, schema: jsonSchema },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  let dados: Record<string, any> = {};
  try { dados = typeof content === "string" ? JSON.parse(content) : (content as any) ?? {}; }
  catch { dados = {}; }
  return { storageKey: key, storageUrl: url, dados };
}

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
      nome: z.string().min(1), cpf: z.string().optional(),
      pix: z.string().min(1), obs: z.string().optional(),
    })).mutation(({ input }) => upsertClassificador(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteClassificador(input.id)),
  }),

  // ─── Corretores ────────────────────────────────────────────────────────────
  corretores: router({
    list: publicProcedure.query(() => listCorretores()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getCorretor(input.id)),
    save: publicProcedure.input(z.object({
      id: z.number().optional(),
      nome: z.string().min(1), cpfCnpj: z.string().optional(),
      pix: z.string().min(1),
      comissaoTipo: z.enum(["sc", "ton", "fixo", "perc"]).default("sc"),
      comissaoValor: z.number().default(0),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertCorretor(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteCorretor(input.id)),
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
      reterFunrural: z.boolean().default(true),
      reterFethab: z.boolean().default(true),
      reterIagro: z.boolean().default(false),
      reterSenar: z.boolean().default(false),
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
      destinoVenda: z.enum(["intraestadual", "interestadual"]).default("interestadual"),
      finalidadeVenda: z.enum(["industria", "racao", "confinamento", "exportacao", "trading", "outro"]).default("industria"),
      regimeCompradora: z.enum(["lucro_real", "lucro_presumido", "simples", "isento"]).default("lucro_real"),
      icmsRegime: z.enum(["diferimento", "isencao", "normal"]).default("diferimento"),
      icmsAliq: z.number().default(0), icmsRedBase: z.number().default(0),
      pisCofinsRegime: z.enum(["isento", "monofasico", "normal"]).default("isento"),
      pisAliq: z.number().default(0), cofinsAliq: z.number().default(0),
      obs: z.string().optional(),
    }).merge(classifSchema.extend({ avarTol: z.number().default(40) }))).mutation(({ input }) => upsertContratoVenda(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteContratoVenda(input.id)),
  }),

  // ─── Operações ─────────────────────────────────────────────────────────────
  operacoes: router({
    list: publicProcedure.query(() => listOperacoes()),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getOperacao(input.id)),
    gerarSigla: publicProcedure.input(z.object({ compraId: z.number(), vendaId: z.number() }))
      .query(({ input }) => gerarSiglaOperacao(input.compraId, input.vendaId)),
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
      corretorId: z.number().nullable().optional(),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertOperacao(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteOperacao(input.id)),
  }),

  // ─── Notas Fiscais (extração via LLM) ─────────────────────────────────────
  nf: router({
    extrair: publicProcedure.input(z.object({
      pdfBase64: z.string(),
      filename: z.string().default("nota_fiscal.pdf"),
      tipo: z.enum(["entrada", "saida"]).default("saida"),
    })).mutation(async ({ input }) => {
      const instrucao = input.tipo === "saida"
        ? "Esta é uma NOTA FISCAL DE SAÍDA (emitida por nós). Extraia os campos solicitados."
        : "Esta é uma NOTA FISCAL DE ENTRADA (emitida pelo fornecedor/produtor rural). Extraia os campos solicitados.";
      return extrairDocumentoViaLLM(
        input.pdfBase64, input.filename, instrucao,
        `- dataEmissao: data de emissão (YYYY-MM-DD)
- numeroNF: número da nota (apenas dígitos)
- placa: placa do veículo transportador (formato ABC1234 ou Mercosul)
- pesoLiquido: peso líquido em kg (número)
- pesoBruto: peso bruto em kg (número)
- fornecedor: nome do emitente/remetente
- produto: descrição do produto (ex: Soja em grãos)`,
        {
          type: "object",
          properties: {
            dataEmissao: { type: ["string", "null"] },
            numeroNF: { type: ["string", "null"] },
            placa: { type: ["string", "null"] },
            pesoLiquido: { type: ["number", "null"] },
            pesoBruto: { type: ["number", "null"] },
            fornecedor: { type: ["string", "null"] },
            produto: { type: ["string", "null"] },
          },
          required: ["dataEmissao", "numeroNF", "placa", "pesoLiquido", "pesoBruto", "fornecedor", "produto"],
          additionalProperties: false,
        }
      );
    }),

    /** Extrai dados de ticket de descarga (balança) via LLM */
    extrairTicket: publicProcedure.input(z.object({
      fileBase64: z.string(),
      filename: z.string().default("ticket_descarga.pdf"),
    })).mutation(async ({ input }) => {
      return extrairDocumentoViaLLM(
        input.fileBase64, input.filename,
        "Este é um TICKET DE DESCARGA (comprovante de pesagem na balança do destino). Extraia os campos solicitados.",
        `- dataDescarga: data da descarga/pesagem (YYYY-MM-DD)
- numeroTicket: número do ticket ou romaneio
- placa: placa do veículo (formato ABC1234 ou Mercosul)
- pesoDescarga: peso líquido descarregado em kg (número)
- nfeSaida: número da NF de saída mencionada no ticket (apenas dígitos, ou null)
- umidade: teor de umidade em % (número, ex: 13.5)
- impureza: teor de impureza em % (número)
- avariado: grãos avariados em % (número)
- queimado: grãos queimados/carbonizados em % (número, se não encontrado retorne null)`,
        {
          type: "object",
          properties: {
            dataDescarga: { type: ["string", "null"] },
            numeroTicket: { type: ["string", "null"] },
            placa: { type: ["string", "null"] },
            pesoDescarga: { type: ["number", "null"] },
            nfeSaida: { type: ["string", "null"] },
            umidade: { type: ["number", "null"] },
            impureza: { type: ["number", "null"] },
            avariado: { type: ["number", "null"] },
            queimado: { type: ["number", "null"] },
          },
          required: ["dataDescarga", "numeroTicket", "placa", "pesoDescarga", "nfeSaida", "umidade", "impureza", "avariado", "queimado"],
          additionalProperties: false,
        }
      );
    }),

    /** Extrai dados de comprovante de pagamento (PIX, TED, boleto) via LLM */
    extrairComprovante: publicProcedure.input(z.object({
      fileBase64: z.string(),
      filename: z.string().default("comprovante.pdf"),
    })).mutation(async ({ input }) => {
      return extrairDocumentoViaLLM(
        input.fileBase64, input.filename,
        "Este é um COMPROVANTE DE PAGAMENTO (PIX, TED, DOC, boleto ou cheque). Extraia os campos solicitados.",
        `- dataPagamento: data do pagamento (YYYY-MM-DD)
- valor: valor pago em reais (número, sem símbolo R$)
- formaPagamento: tipo de pagamento: "pix", "ted", "doc", "boleto", "cheque" ou "outro"
- numeroBoleto: número do documento/autenticação/código de barras (ou null)
- chavePix: chave PIX utilizada (CPF, CNPJ, e-mail, telefone ou chave aleatória — ou null)
- banco: nome do banco pagador
- observacao: qualquer observação ou descrição presente no comprovante`,
        {
          type: "object",
          properties: {
            dataPagamento: { type: ["string", "null"] },
            valor: { type: ["number", "null"] },
            formaPagamento: { type: ["string", "null"] },
            numeroBoleto: { type: ["string", "null"] },
            chavePix: { type: ["string", "null"] },
            banco: { type: ["string", "null"] },
            observacao: { type: ["string", "null"] },
          },
          required: ["dataPagamento", "valor", "formaPagamento", "numeroBoleto", "chavePix", "banco", "observacao"],
          additionalProperties: false,
        }
      );
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
    listSemDescarga: publicProcedure.input(z.object({ operacaoId: z.number().optional() }).optional())
      .query(({ input }) => listEmbarquesSemDescarga(input?.operacaoId)),
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
    extractTicket: publicProcedure.input(z.object({
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    })).mutation(async ({ input }) => {
      const buf = Buffer.from(input.base64, "base64");
      const key = `tickets/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      const isImg = !input.mimeType.includes("pdf");
      const messages: any[] = [
        { role: "system", content: "Você é um especialista em leitura de tickets de descarga de grãos. Extraia os dados e retorne APENAS JSON válido sem markdown." },
        { role: "user", content: [
          { type: "text", text: "Extraia do ticket: pesoDescarga (número em kg), placa (string), dataDescarga (YYYY-MM-DD), nfeSaida (número da NF), ticketNumero (número do ticket), dcUmidade (%), dcImp (impureza %), dcAvar (avariado %), dcQueim (queimado % — se não houver, omita o campo). Retorne JSON com essas chaves." },
          isImg
            ? { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}` } }
            : { type: "file_url", file_url: { url: `data:${input.mimeType};base64,${input.base64}`, mime_type: "application/pdf" } },
        ]},
      ];
      const resp = await invokeLLM({ messages });
      const rawContent = resp.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}
      return { ...parsed, ticketUrl: url };
    }),
    save: publicProcedure.input(z.object({
      embarqueId: z.number(),
      dataDescarga: z.string().optional(),
      pesoDescarga: z.number(),
      placa: z.string().optional(),
      nfeSaida: z.string().optional(),
      ticketNumero: z.string().optional(),
      ticketUrl: z.string().optional(),
      dcUmidade: z.number().default(0), dcImp: z.number().default(0),
      dcAvar: z.number().default(0), dcQueim: z.number().default(1),
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
      formaPagamento: z.enum(["pix", "ted", "doc", "boleto", "cheque", "outro"]).default("pix"),
      numeroBoleto: z.string().optional(),
      chavePix: z.string().optional(),
      comprovanteUrl: z.string().optional(),
      obs: z.string().optional(),
    })).mutation(({ input }) => upsertPagamento(input)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deletePagamento(input.id)),
    extractComprovante: publicProcedure.input(z.object({
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    })).mutation(async ({ input }) => {
      // Upload to storage first
      const buf = Buffer.from(input.base64, "base64");
      const key = `comprovantes/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      // Extract data via LLM
      const isImg = !input.mimeType.includes("pdf");
      const messages: any[] = [
        { role: "system", content: "Você é um assistente especializado em leitura de comprovantes de pagamento bancário. Extraia os dados do comprovante e retorne APENAS um JSON válido sem markdown." },
        { role: "user", content: [
          { type: "text", text: "Extraia do comprovante: valor (número), dataPagamento (YYYY-MM-DD), formaPagamento (pix/ted/doc/boleto/cheque/outro), numeroBoleto (string), chavePix (string), banco (string), obs (texto do campo observação se houver). Retorne JSON com essas chaves." },
          isImg
            ? { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}` } }
            : { type: "file_url", file_url: { url: `data:${input.mimeType};base64,${input.base64}`, mime_type: "application/pdf" } },
        ]},
      ];
      const resp = await invokeLLM({ messages });
      const rawContent = resp.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}
      return { ...parsed, comprovanteUrl: url };
    }),
  }),
});

export type AppRouter = typeof appRouter;
