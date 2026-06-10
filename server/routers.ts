import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
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
  listDespesas, upsertDespesa, deleteDespesa, darBaixaDespesa,
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
  jsonSchema: Record<string, any>,
  mimeType: string = "application/pdf"
) {
  // Salvar no storage para referência/auditoria
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const { key, url } = await storagePut(`docs/${Date.now()}-${filename}`, pdfBuffer, mimeType);

  // Determinar se é imagem ou PDF para escolher o tipo de conteúdo correto
  const isImage = mimeType.startsWith("image/");
  const dataUri = `data:${mimeType};base64,${pdfBase64}`;

  const contentItem = isImage
    ? { type: "image_url" as const, image_url: { url: dataUri } }
    : { type: "file_url" as const, file_url: { url: dataUri, mime_type: "application/pdf" as const } };

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um especialista em leitura de documentos fiscais e financeiros brasileiros.
Extraia os dados solicitados no formato JSON estrito.
Regras: campos não encontrados → null; datas → YYYY-MM-DD; valores monetários → número sem símbolo; pesos → número em kg.`,
      },
      {
        role: "user",
        content: [
          contentItem,
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
    /** Retorna operação com corretor e classificador para pré-preenchimento de despesas */
    getDetalhes: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const op = await getOperacao(input.id);
      if (!op) return null;
      const corretor = op.corretorId ? await getCorretor(op.corretorId) : null;
      const classificador = op.classificadorId ? await getClassificador(op.classificadorId) : null;
      return { ...op, corretor, classificador };
    }),
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
      mimeType: z.string().default("application/pdf"),
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
        },
        input.mimeType
      );
    }),

    /** Extrai dados de comprovante de pagamento (PIX, TED, boleto) via LLM */
    extrairComprovante: publicProcedure.input(z.object({
      fileBase64: z.string(),
      filename: z.string().default("comprovante.pdf"),
      mimeType: z.string().default("application/pdf"),
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
        },
        input.mimeType
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
    })).mutation(async ({ input }) => {
      // Impede definir status "Finalizada" manualmente sem descarga registrada
      if (input.status === "Finalizada") {
        const embarqueId = input.id;
        if (!embarqueId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Status \"Finalizada\" só pode ser definido após registrar a descarga." });
        }
        const descarga = await getDescargaByEmbarque(embarqueId);
        if (!descarga) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Status \"Finalizada\" só pode ser definido após registrar a descarga." });
        }
      }
      return upsertEmbarque(input);
    }),
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

  // ─── Despesas Operacionais ──────────────────────────────────────────────────────────────
  despesas: router({
  list: protectedProcedure
    .input(z.object({ operacaoId: z.number().optional() }))
    .query(async ({ input }) => {
      return listDespesas(input.operacaoId);
    }),

  save: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      operacaoId: z.number(),
      categoria: z.enum(["comissao","fethab","iagro","senar","funrural","classificador","frete","outro"]),
      favorecido: z.string().min(1, "Favorecido obrigatório"),
      descricao: z.string().optional(),
      valor: z.number().positive("Valor deve ser positivo"),
      dataPagamento: z.string().nullable().optional(),
      formaPagamento: z.enum(["pix","ted","doc","boleto","cheque","outro"]).default("pix"),
      comprovanteUrl: z.string().nullable().optional(),
      obs: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await upsertDespesa(input);
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDespesa(input.id);
      return { ok: true };
    }),

  uploadComprovante: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      const buf = Buffer.from(input.base64, "base64");
      const key = `despesas-comprovantes/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      return { comprovanteUrl: url };
    }),

  /**
   * Recebe um comprovante (base64) + lista de despesas em aberto da operação.
   * Usa LLM para extrair: favorecido, valor, data, forma de pagamento.
   * Cruza com as despesas em aberto e retorna sugestões de vinculação.
   */
  lerComprovante: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      operacaoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // 1. Fazer upload do comprovante
      const buf = Buffer.from(input.base64, "base64");
      const key = `despesas-comprovantes/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url: comprovanteUrl } = await storagePut(key, buf, input.mimeType);

      // 2. Buscar despesas em aberto da operação + dados da operação (corretor/classificador)
      const despesasAbertas = await listDespesas(input.operacaoId);
      const abertas = despesasAbertas.filter((d: any) => !d.pago);
      const op = await getOperacao(input.operacaoId);
      const corretorOp = op?.corretorId ? await getCorretor(op.corretorId) : null;
      const classificadorOp = op?.classificadorId ? await getClassificador(op.classificadorId) : null;

      // 3. Extrair dados do comprovante via LLM
      const isImage = input.mimeType.startsWith("image/");
      const content: any[] = [
        {
          type: "text",
          text: `Analise este comprovante de pagamento e extraia as informações. Responda APENAS com JSON no formato:\n{\n  "favorecido": "nome completo do favorecido/beneficiário",\n  "valor": 0.00,\n  "data": "YYYY-MM-DD",\n  "formaPagamento": "pix|ted|doc|boleto|cheque|outro",\n  "banco": "nome do banco",\n  "textoCompleto": "texto resumido do comprovante",\n  "palavrasChave": ["lista", "de", "palavras", "relevantes"]\n}`,
        },
        isImage
          ? { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}`, detail: "high" } }
          : { type: "file_url", file_url: { url: comprovanteUrl, mime_type: input.mimeType as any } },
      ];

      let leitura: { favorecido: string; valor: number; data: string; formaPagamento: string; banco: string; textoCompleto: string; palavrasChave: string[] } | null = null;
      try {
        const resp = await invokeLLM({ messages: [{ role: "user", content }] });
        const rawContent = resp.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) leitura = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[lerComprovante] LLM error:", e);
      }

      if (!leitura) {
        return { comprovanteUrl, leitura: null, sugestoes: [] };
      }

      // 4. Palavras-chave de transporte/logística para categoria frete
      const PALAVRAS_FRETE = ["transport", "logística", "log", "frete", "carga", "caminhao", "caminhão", "carreta", "express", "cargo"];

      // 5. Função de similaridade simples (normaliza e verifica inclusão)
      function normalizar(s: string) {
        return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
      }
      function score(a: string, b: string): number {
        const na = normalizar(a); const nb = normalizar(b);
        if (na === nb) return 1.0;
        if (na.includes(nb) || nb.includes(na)) return 0.9;
        const wordsA = na.split(" ").filter(Boolean);
        const wordsB = nb.split(" ").filter(Boolean);
        const common = wordsA.filter(w => wordsB.includes(w)).length;
        return common / Math.max(wordsA.length, wordsB.length, 1);
      }

      const favComp = leitura.favorecido;
      const palavrasComp = [...(leitura.palavrasChave ?? []), favComp].map(normalizar);

      // 6. Para cada despesa aberta, calcular score de match
      const sugestoes = abertas.map((d: any) => {
        let matchScore = score(favComp, d.favorecido);

        // Bonus extra: cruzar com nome do corretor/classificador cadastrado na operação
        if (d.categoria === "comissao" && corretorOp) {
          matchScore = Math.max(matchScore, score(favComp, corretorOp.nome));
        }
        if (d.categoria === "classificador" && classificadorOp) {
          matchScore = Math.max(matchScore, score(favComp, classificadorOp.nome));
        }

        // Bonus: se categoria é frete e palavras do comprovante têm palavras de transporte
        if (d.categoria === "frete" && PALAVRAS_FRETE.some(p => palavrasComp.some(pc => pc.includes(p)))) {
          matchScore = Math.max(matchScore, 0.7);
        }

        // Bonus: valor muito próximo (dentro de 1%)
        const valorComp = leitura!.valor;
        const valorDesp = parseFloat(d.valor);
        if (valorComp > 0 && valorDesp > 0) {
          const diff = Math.abs(valorComp - valorDesp) / valorDesp;
          if (diff < 0.01) matchScore = Math.min(1.0, matchScore + 0.2);
          else if (diff < 0.05) matchScore = Math.min(1.0, matchScore + 0.1);
        }

        return {
          despesaId: d.id,
          categoria: d.categoria,
          favorecido: d.favorecido,
          valor: d.valor,
          matchScore: Math.round(matchScore * 100),
          autoVincular: matchScore >= 0.7,
        };
      }).sort((a: any, b: any) => b.matchScore - a.matchScore);

      return { comprovanteUrl, leitura, sugestoes };
    }),

  /**
   * Confirma a baixa de uma ou mais despesas com o comprovante já processado.
   */
  darBaixa: protectedProcedure
    .input(z.object({
      despesaId: z.number(),
      dataBaixa: z.string(),
      comprovanteUrl: z.string().optional(),
      comprovanteTexto: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await darBaixaDespesa({
        id: input.despesaId,
        dataBaixa: input.dataBaixa,
        comprovanteUrl: input.comprovanteUrl,
        comprovanteTexto: input.comprovanteTexto,
      });
      return { ok: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
