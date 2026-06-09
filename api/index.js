// api/index.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, desc, and, gte, lte, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var config = mysqlTable("config", {
  id: int("id").autoincrement().primaryKey(),
  fundoMes: decimal("fundoMes", { precision: 10, scale: 4 }).default("2.5").notNull(),
  dmais: int("dmais").default(2).notNull(),
  fethabRsTon: decimal("fethabRsTon", { precision: 10, scale: 4 }).default("48.7000").notNull(),
  iagroRsTon: decimal("iagroRsTon", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  senarPerc: decimal("senarPerc", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  funruralPerc: decimal("funruralPerc", { precision: 10, scale: 4 }).default("1.6300").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var classificadores = mysqlTable("classificadores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 20 }),
  pix: varchar("pix", { length: 255 }).notNull(),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var corretores = mysqlTable("corretores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  pix: varchar("pix", { length: 255 }).notNull(),
  /** Tipo de comissão: sc = por saca, ton = por tonelada, fixo = valor fixo, perc = % sobre venda */
  comissaoTipo: mysqlEnum("comissaoTipo", ["sc", "ton", "fixo", "perc"]).default("sc").notNull(),
  comissaoValor: decimal("comissaoValor", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contratosCompra = mysqlTable("contratos_compra", {
  id: int("id").autoincrement().primaryKey(),
  sigla: varchar("sigla", { length: 100 }).notNull(),
  fornecedor: varchar("fornecedor", { length: 255 }).notNull(),
  produto: varchar("produto", { length: 100 }).notNull(),
  qualidade: varchar("qualidade", { length: 100 }).notNull(),
  volumeKg: decimal("volumeKg", { precision: 15, scale: 2 }).notNull(),
  precoSc: decimal("precoSc", { precision: 10, scale: 4 }).notNull(),
  // Dados bancários
  banco: varchar("banco", { length: 100 }).notNull(),
  agencia: varchar("agencia", { length: 20 }).notNull(),
  conta: varchar("conta", { length: 30 }).notNull(),
  favorecido: varchar("favorecido", { length: 255 }).notNull(),
  docFavorecido: varchar("docFavorecido", { length: 20 }).notNull(),
  pix: varchar("pix", { length: 255 }).notNull(),
  // Retenção tributária — quais tributos a trading retém na fonte
  // false = obrigação é do vendedor (ex: PJ que recolhe por conta própria)
  reterFunrural: boolean("reterFunrural").default(true).notNull(),
  reterFethab: boolean("reterFethab").default(true).notNull(),
  reterIagro: boolean("reterIagro").default(false).notNull(),
  reterSenar: boolean("reterSenar").default(false).notNull(),
  // Classificação origem
  umidTol: decimal("umidTol", { precision: 8, scale: 4 }).default("14.0000").notNull(),
  umidFat: decimal("umidFat", { precision: 8, scale: 4 }).default("1.8000").notNull(),
  impTol: decimal("impTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  impFat: decimal("impFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  avarTol: decimal("avarTol", { precision: 8, scale: 4 }).default("20.0000").notNull(),
  avarFat: decimal("avarFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimTol: decimal("queimTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimFat: decimal("queimFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contratosVenda = mysqlTable("contratos_venda", {
  id: int("id").autoincrement().primaryKey(),
  sigla: varchar("sigla", { length: 100 }).notNull(),
  comprador: varchar("comprador", { length: 255 }).notNull(),
  produto: varchar("produto", { length: 100 }).notNull(),
  qualidade: varchar("qualidade", { length: 100 }).notNull(),
  volumeKg: decimal("volumeKg", { precision: 15, scale: 2 }).notNull(),
  precoSc: decimal("precoSc", { precision: 10, scale: 4 }).notNull(),
  // Tributação de venda
  /** Destino: "intraestadual" = dentro do MT, "interestadual" = fora do MT */
  destinoVenda: mysqlEnum("destinoVenda", ["intraestadual", "interestadual"]).default("interestadual").notNull(),
  /**
   * Finalidade do comprador:
   * industria = indústria de processamento (esmagamento, farelo, óleo)
   * racao = fábrica de ração
   * confinamento = confinamento/engorda
   * exportacao = comercialização com fim específico de exportação (RECOF/drawback)
   * trading = outra trading (mercado interno)
   * outro = outros usos
   */
  finalidadeVenda: mysqlEnum("finalidadeVenda", ["industria", "racao", "confinamento", "exportacao", "trading", "outro"]).default("industria").notNull(),
  /**
   * Regime tributário da compradora:
   * lucro_real | lucro_presumido | simples | isento
   */
  regimeCompradora: mysqlEnum("regimeCompradora", ["lucro_real", "lucro_presumido", "simples", "isento"]).default("lucro_real").notNull(),
  /** ICMS: diferimento, isencao, normal */
  icmsRegime: mysqlEnum("icmsRegime", ["diferimento", "isencao", "normal"]).default("diferimento").notNull(),
  icmsAliq: decimal("icmsAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  icmsRedBase: decimal("icmsRedBase", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  /** PIS/COFINS: isento, monofasico, normal */
  pisCofinsRegime: mysqlEnum("pisCofinsRegime", ["isento", "monofasico", "normal"]).default("isento").notNull(),
  pisAliq: decimal("pisAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  cofinsAliq: decimal("cofinsAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  // Classificação descarga
  umidTol: decimal("umidTol", { precision: 8, scale: 4 }).default("14.0000").notNull(),
  umidFat: decimal("umidFat", { precision: 8, scale: 4 }).default("1.8000").notNull(),
  impTol: decimal("impTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  impFat: decimal("impFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  avarTol: decimal("avarTol", { precision: 8, scale: 4 }).default("40.0000").notNull(),
  avarFat: decimal("avarFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimTol: decimal("queimTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimFat: decimal("queimFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var operacoes = mysqlTable("operacoes", {
  id: int("id").autoincrement().primaryKey(),
  sigla: varchar("sigla", { length: 100 }).notNull(),
  compraId: int("compraId").notNull(),
  vendaId: int("vendaId").notNull(),
  freteTon: decimal("freteTon", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  quebraTol: decimal("quebraTol", { precision: 8, scale: 4 }).default("0.2500").notNull(),
  diasDesagio: int("diasDesagio").default(15).notNull(),
  comissaoValor: decimal("comissaoValor", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  comissaoTipo: mysqlEnum("comissaoTipo", ["sc", "ton", "fixo", "percVenda"]).default("sc").notNull(),
  classificadorId: int("classificadorId"),
  custoClassTon: decimal("custoClassTon", { precision: 10, scale: 6 }).default("0.017000").notNull(),
  corretorId: int("corretorId"),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var embarques = mysqlTable("embarques", {
  id: int("id").autoincrement().primaryKey(),
  operacaoId: int("operacaoId").notNull(),
  dataEmbarque: timestamp("dataEmbarque"),
  placa: varchar("placa", { length: 20 }),
  nfeEntrada: varchar("nfeEntrada", { length: 100 }),
  nfeSaida: varchar("nfeSaida", { length: 100 }),
  pesoOrigem: decimal("pesoOrigem", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["Em tr\xE2nsito", "Descarga pendente", "Finalizada"]).default("Em tr\xE2nsito").notNull(),
  umidade: decimal("umidade", { precision: 8, scale: 4 }).default("0.0000"),
  imp: decimal("imp", { precision: 8, scale: 4 }).default("0.0000"),
  avar: decimal("avar", { precision: 8, scale: 4 }).default("0.0000"),
  queim: decimal("queim", { precision: 8, scale: 4 }).default("0.0000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var descargas = mysqlTable("descargas", {
  id: int("id").autoincrement().primaryKey(),
  embarqueId: int("embarqueId").notNull().unique(),
  dataDescarga: timestamp("dataDescarga"),
  pesoDescarga: decimal("pesoDescarga", { precision: 15, scale: 2 }).notNull(),
  placa: varchar("placa", { length: 20 }),
  nfeSaida: varchar("nfeSaida", { length: 100 }),
  ticketNumero: varchar("ticketNumero", { length: 100 }),
  ticketUrl: varchar("ticketUrl", { length: 1e3 }),
  dcUmidade: decimal("dcUmidade", { precision: 8, scale: 4 }).default("0.0000"),
  dcImp: decimal("dcImp", { precision: 8, scale: 4 }).default("0.0000"),
  dcAvar: decimal("dcAvar", { precision: 8, scale: 4 }).default("0.0000"),
  dcQueim: decimal("dcQueim", { precision: 8, scale: 4 }).default("1.0000"),
  obs: text("obs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  compraId: int("compraId").notNull(),
  dataPagamento: timestamp("dataPagamento"),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  banco: varchar("banco", { length: 100 }),
  formaPagamento: mysqlEnum("formaPagamento", ["pix", "ted", "doc", "boleto", "cheque", "outro"]).default("pix").notNull(),
  numeroBoleto: varchar("numeroBoleto", { length: 255 }),
  chavePix: varchar("chavePix", { length: 255 }),
  comprovanteUrl: varchar("comprovanteUrl", { length: 1e3 }),
  obs: text("obs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getConfig() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(config).limit(1);
  return rows[0] ?? null;
}
async function upsertConfig(data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getConfig();
  const vals = {
    fundoMes: String(data.fundoMes),
    dmais: data.dmais,
    fethabRsTon: String(data.fethabRsTon),
    iagroRsTon: String(data.iagroRsTon),
    senarPerc: String(data.senarPerc),
    funruralPerc: String(data.funruralPerc)
  };
  if (existing) {
    await db.update(config).set(vals).where(eq(config.id, existing.id));
  } else {
    await db.insert(config).values(vals);
  }
}
async function listClassificadores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classificadores).where(eq(classificadores.ativo, true)).orderBy(desc(classificadores.createdAt));
}
async function getClassificador(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(classificadores).where(eq(classificadores.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertClassificador(data) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(classificadores).set({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null }).where(eq(classificadores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(classificadores).values({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null });
    return result[0]?.insertId ?? null;
  }
}
async function deleteClassificador(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(classificadores).set({ ativo: false }).where(eq(classificadores.id, id));
}
async function listCorretores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(corretores).where(eq(corretores.ativo, true)).orderBy(desc(corretores.createdAt));
}
async function getCorretor(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(corretores).where(eq(corretores.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertCorretor(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    nome: data.nome,
    cpfCnpj: data.cpfCnpj ?? null,
    pix: data.pix,
    comissaoTipo: data.comissaoTipo,
    comissaoValor: String(data.comissaoValor),
    obs: data.obs ?? null
  };
  if (data.id) {
    await db.update(corretores).set(payload).where(eq(corretores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(corretores).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteCorretor(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(corretores).set({ ativo: false }).where(eq(corretores.id, id));
}
async function listContratosCompra() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosCompra).where(eq(contratosCompra.ativo, true)).orderBy(desc(contratosCompra.createdAt));
}
async function getContratoCompra(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosCompra).where(eq(contratosCompra.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertContratoCompra(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla,
    fornecedor: data.fornecedor,
    produto: data.produto,
    qualidade: data.qualidade,
    volumeKg: String(data.volumeKg),
    precoSc: String(data.precoSc),
    banco: data.banco,
    agencia: data.agencia,
    conta: data.conta,
    favorecido: data.favorecido,
    docFavorecido: data.docFavorecido,
    pix: data.pix,
    reterFunrural: data.reterFunrural ?? true,
    reterFethab: data.reterFethab ?? true,
    reterIagro: data.reterIagro ?? false,
    reterSenar: data.reterSenar ?? false,
    umidTol: String(data.umidTol),
    umidFat: String(data.umidFat),
    impTol: String(data.impTol),
    impFat: String(data.impFat),
    avarTol: String(data.avarTol),
    avarFat: String(data.avarFat),
    queimTol: String(data.queimTol),
    queimFat: String(data.queimFat),
    obs: data.obs ?? null
  };
  if (data.id) {
    await db.update(contratosCompra).set(payload).where(eq(contratosCompra.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosCompra).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteContratoCompra(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosCompra).set({ ativo: false }).where(eq(contratosCompra.id, id));
}
async function listContratosVenda() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosVenda).where(eq(contratosVenda.ativo, true)).orderBy(desc(contratosVenda.createdAt));
}
async function getContratoVenda(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosVenda).where(eq(contratosVenda.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertContratoVenda(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla,
    comprador: data.comprador,
    produto: data.produto,
    qualidade: data.qualidade,
    volumeKg: String(data.volumeKg),
    precoSc: String(data.precoSc),
    destinoVenda: data.destinoVenda ?? "interestadual",
    finalidadeVenda: data.finalidadeVenda ?? "industria",
    regimeCompradora: data.regimeCompradora ?? "lucro_real",
    icmsRegime: data.icmsRegime ?? "diferimento",
    icmsAliq: String(data.icmsAliq ?? 0),
    icmsRedBase: String(data.icmsRedBase ?? 0),
    pisCofinsRegime: data.pisCofinsRegime ?? "isento",
    pisAliq: String(data.pisAliq ?? 0),
    cofinsAliq: String(data.cofinsAliq ?? 0),
    umidTol: String(data.umidTol),
    umidFat: String(data.umidFat),
    impTol: String(data.impTol),
    impFat: String(data.impFat),
    avarTol: String(data.avarTol),
    avarFat: String(data.avarFat),
    queimTol: String(data.queimTol),
    queimFat: String(data.queimFat),
    obs: data.obs ?? null
  };
  if (data.id) {
    await db.update(contratosVenda).set(payload).where(eq(contratosVenda.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosVenda).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteContratoVenda(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosVenda).set({ ativo: false }).where(eq(contratosVenda.id, id));
}
async function listOperacoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operacoes).where(eq(operacoes.ativo, true)).orderBy(desc(operacoes.createdAt));
}
async function getOperacao(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(operacoes).where(eq(operacoes.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertOperacao(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla,
    compraId: data.compraId,
    vendaId: data.vendaId,
    freteTon: String(data.freteTon),
    quebraTol: String(data.quebraTol),
    diasDesagio: data.diasDesagio,
    comissaoValor: String(data.comissaoValor),
    comissaoTipo: data.comissaoTipo,
    classificadorId: data.classificadorId ?? null,
    custoClassTon: String(data.custoClassTon),
    corretorId: data.corretorId ?? null,
    obs: data.obs ?? null
  };
  if (data.id) {
    await db.update(operacoes).set(payload).where(eq(operacoes.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(operacoes).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteOperacao(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(operacoes).set({ ativo: false }).where(eq(operacoes.id, id));
}
async function listEmbarques(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.operacaoId) conditions.push(eq(embarques.operacaoId, filters.operacaoId));
  if (filters?.dataIni) conditions.push(gte(embarques.dataEmbarque, filters.dataIni));
  if (filters?.dataFim) conditions.push(lte(embarques.dataEmbarque, filters.dataFim));
  return conditions.length > 0 ? db.select().from(embarques).where(and(...conditions)).orderBy(desc(embarques.createdAt)) : db.select().from(embarques).orderBy(desc(embarques.createdAt));
}
async function listEmbarquesSemDescarga(operacaoId) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [ne(embarques.status, "Finalizada")];
  if (operacaoId) conditions.push(eq(embarques.operacaoId, operacaoId));
  return db.select().from(embarques).where(and(...conditions)).orderBy(desc(embarques.dataEmbarque));
}
async function getEmbarque(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(embarques).where(eq(embarques.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertEmbarque(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    operacaoId: data.operacaoId,
    dataEmbarque: data.dataEmbarque ? new Date(data.dataEmbarque) : null,
    placa: data.placa ?? null,
    nfeEntrada: data.nfeEntrada ?? null,
    nfeSaida: data.nfeSaida ?? null,
    pesoOrigem: String(data.pesoOrigem),
    status: data.status,
    umidade: String(data.umidade ?? 0),
    imp: String(data.imp ?? 0),
    avar: String(data.avar ?? 0),
    queim: String(data.queim ?? 0)
  };
  if (data.id) {
    await db.update(embarques).set(payload).where(eq(embarques.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(embarques).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteEmbarque(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(embarques).where(eq(embarques.id, id));
}
async function listDescargas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(descargas).orderBy(desc(descargas.createdAt));
}
async function getDescargaByEmbarque(embarqueId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(descargas).where(eq(descargas.embarqueId, embarqueId)).limit(1);
  return rows[0] ?? null;
}
async function upsertDescarga(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    embarqueId: data.embarqueId,
    dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : null,
    pesoDescarga: String(data.pesoDescarga),
    placa: data.placa ?? null,
    nfeSaida: data.nfeSaida ?? null,
    ticketNumero: data.ticketNumero ?? null,
    ticketUrl: data.ticketUrl ?? null,
    dcUmidade: String(data.dcUmidade ?? 0),
    dcImp: String(data.dcImp ?? 0),
    dcAvar: String(data.dcAvar ?? 0),
    dcQueim: String(data.dcQueim ?? 1),
    obs: data.obs ?? null
  };
  const existing = await getDescargaByEmbarque(data.embarqueId);
  if (existing) {
    await db.update(descargas).set(payload).where(eq(descargas.id, existing.id));
    await db.update(embarques).set({ status: "Finalizada", nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where(eq(embarques.id, data.embarqueId));
    return existing.id;
  } else {
    const result = await db.insert(descargas).values(payload);
    await db.update(embarques).set({ status: "Finalizada", nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where(eq(embarques.id, data.embarqueId));
    return result[0]?.insertId ?? null;
  }
}
async function listPagamentos(compraId) {
  const db = await getDb();
  if (!db) return [];
  return compraId ? db.select().from(pagamentos).where(eq(pagamentos.compraId, compraId)).orderBy(desc(pagamentos.createdAt)) : db.select().from(pagamentos).orderBy(desc(pagamentos.createdAt));
}
async function upsertPagamento(data) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    compraId: data.compraId,
    dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
    valor: String(data.valor),
    banco: data.banco ?? null,
    formaPagamento: data.formaPagamento ?? "pix",
    numeroBoleto: data.numeroBoleto ?? null,
    chavePix: data.chavePix ?? null,
    comprovanteUrl: data.comprovanteUrl ?? null,
    obs: data.obs ?? null
  };
  if (data.id) {
    await db.update(pagamentos).set(payload).where(eq(pagamentos.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(pagamentos).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deletePagamento(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pagamentos).where(eq(pagamentos.id, id));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/routers.ts
var classifSchema = z2.object({
  umidTol: z2.number().default(14),
  umidFat: z2.number().default(1.8),
  impTol: z2.number().default(1),
  impFat: z2.number().default(1),
  avarTol: z2.number().default(20),
  avarFat: z2.number().default(1),
  queimTol: z2.number().default(1),
  queimFat: z2.number().default(1)
});
async function gerarSiglaOperacao(compraId, vendaId) {
  const [compra, venda, ops] = await Promise.all([
    getContratoCompra(compraId),
    getContratoVenda(vendaId),
    listOperacoes()
  ]);
  const prefixo = `${compra?.sigla ?? compraId}-${venda?.sigla ?? vendaId}`;
  const existentes = ops.filter((o) => o.sigla.startsWith(prefixo));
  const seq = existentes.length + 1;
  return `${prefixo}-OP${String(seq).padStart(2, "0")}`;
}
async function extrairDocumentoViaLLM(pdfBase64, filename, instrucao, campos, jsonSchema, mimeType = "application/pdf") {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const { key, url } = await storagePut(`docs/${Date.now()}-${filename}`, pdfBuffer, mimeType);
  const isImage = mimeType.startsWith("image/");
  const dataUri = `data:${mimeType};base64,${pdfBase64}`;
  const contentItem = isImage ? { type: "image_url", image_url: { url: dataUri } } : { type: "file_url", file_url: { url: dataUri, mime_type: "application/pdf" } };
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Voc\xEA \xE9 um especialista em leitura de documentos fiscais e financeiros brasileiros.
Extraia os dados solicitados no formato JSON estrito.
Regras: campos n\xE3o encontrados \u2192 null; datas \u2192 YYYY-MM-DD; valores monet\xE1rios \u2192 n\xFAmero sem s\xEDmbolo; pesos \u2192 n\xFAmero em kg.`
      },
      {
        role: "user",
        content: [
          contentItem,
          { type: "text", text: `${instrucao}

Extraia os seguintes campos:
${campos}` }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "extracao", strict: true, schema: jsonSchema }
    }
  });
  const content = response?.choices?.[0]?.message?.content;
  let dados = {};
  try {
    dados = typeof content === "string" ? JSON.parse(content) : content ?? {};
  } catch {
    dados = {};
  }
  return { storageKey: key, storageUrl: url, dados };
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── Config ────────────────────────────────────────────────────────────────
  config: router({
    get: publicProcedure.query(() => getConfig()),
    save: publicProcedure.input(z2.object({
      fundoMes: z2.number(),
      dmais: z2.number(),
      fethabRsTon: z2.number(),
      iagroRsTon: z2.number(),
      senarPerc: z2.number(),
      funruralPerc: z2.number()
    })).mutation(({ input }) => upsertConfig(input))
  }),
  // ─── Classificadores ───────────────────────────────────────────────────────
  classificadores: router({
    list: publicProcedure.query(() => listClassificadores()),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getClassificador(input.id)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      nome: z2.string().min(1),
      cpf: z2.string().optional(),
      pix: z2.string().min(1),
      obs: z2.string().optional()
    })).mutation(({ input }) => upsertClassificador(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteClassificador(input.id))
  }),
  // ─── Corretores ────────────────────────────────────────────────────────────
  corretores: router({
    list: publicProcedure.query(() => listCorretores()),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getCorretor(input.id)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      nome: z2.string().min(1),
      cpfCnpj: z2.string().optional(),
      pix: z2.string().min(1),
      comissaoTipo: z2.enum(["sc", "ton", "fixo", "perc"]).default("sc"),
      comissaoValor: z2.number().default(0),
      obs: z2.string().optional()
    })).mutation(({ input }) => upsertCorretor(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteCorretor(input.id))
  }),
  // ─── Contratos de Compra ───────────────────────────────────────────────────
  compras: router({
    list: publicProcedure.query(() => listContratosCompra()),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getContratoCompra(input.id)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      sigla: z2.string().min(1),
      fornecedor: z2.string().min(1),
      produto: z2.string(),
      qualidade: z2.string(),
      volumeKg: z2.number(),
      precoSc: z2.number(),
      banco: z2.string().min(1),
      agencia: z2.string().min(1),
      conta: z2.string().min(1),
      favorecido: z2.string().min(1),
      docFavorecido: z2.string().min(1),
      pix: z2.string().min(1),
      reterFunrural: z2.boolean().default(true),
      reterFethab: z2.boolean().default(true),
      reterIagro: z2.boolean().default(false),
      reterSenar: z2.boolean().default(false),
      obs: z2.string().optional()
    }).merge(classifSchema)).mutation(({ input }) => upsertContratoCompra(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteContratoCompra(input.id))
  }),
  // ─── Contratos de Venda ────────────────────────────────────────────────────
  vendas: router({
    list: publicProcedure.query(() => listContratosVenda()),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getContratoVenda(input.id)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      sigla: z2.string().min(1),
      comprador: z2.string().min(1),
      produto: z2.string(),
      qualidade: z2.string(),
      volumeKg: z2.number(),
      precoSc: z2.number(),
      destinoVenda: z2.enum(["intraestadual", "interestadual"]).default("interestadual"),
      finalidadeVenda: z2.enum(["industria", "racao", "confinamento", "exportacao", "trading", "outro"]).default("industria"),
      regimeCompradora: z2.enum(["lucro_real", "lucro_presumido", "simples", "isento"]).default("lucro_real"),
      icmsRegime: z2.enum(["diferimento", "isencao", "normal"]).default("diferimento"),
      icmsAliq: z2.number().default(0),
      icmsRedBase: z2.number().default(0),
      pisCofinsRegime: z2.enum(["isento", "monofasico", "normal"]).default("isento"),
      pisAliq: z2.number().default(0),
      cofinsAliq: z2.number().default(0),
      obs: z2.string().optional()
    }).merge(classifSchema.extend({ avarTol: z2.number().default(40) }))).mutation(({ input }) => upsertContratoVenda(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteContratoVenda(input.id))
  }),
  // ─── Operações ─────────────────────────────────────────────────────────────
  operacoes: router({
    list: publicProcedure.query(() => listOperacoes()),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getOperacao(input.id)),
    gerarSigla: publicProcedure.input(z2.object({ compraId: z2.number(), vendaId: z2.number() })).query(({ input }) => gerarSiglaOperacao(input.compraId, input.vendaId)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      sigla: z2.string().min(1),
      compraId: z2.number(),
      vendaId: z2.number(),
      freteTon: z2.number().default(0),
      quebraTol: z2.number().default(0.25),
      diasDesagio: z2.number().default(15),
      comissaoValor: z2.number().default(0),
      comissaoTipo: z2.enum(["sc", "ton", "fixo", "percVenda"]).default("sc"),
      classificadorId: z2.number().nullable().optional(),
      custoClassTon: z2.number().default(0.017),
      corretorId: z2.number().nullable().optional(),
      obs: z2.string().optional()
    })).mutation(({ input }) => upsertOperacao(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteOperacao(input.id))
  }),
  // ─── Notas Fiscais (extração via LLM) ─────────────────────────────────────
  nf: router({
    extrair: publicProcedure.input(z2.object({
      pdfBase64: z2.string(),
      filename: z2.string().default("nota_fiscal.pdf"),
      tipo: z2.enum(["entrada", "saida"]).default("saida")
    })).mutation(async ({ input }) => {
      const instrucao = input.tipo === "saida" ? "Esta \xE9 uma NOTA FISCAL DE SA\xCDDA (emitida por n\xF3s). Extraia os campos solicitados." : "Esta \xE9 uma NOTA FISCAL DE ENTRADA (emitida pelo fornecedor/produtor rural). Extraia os campos solicitados.";
      return extrairDocumentoViaLLM(
        input.pdfBase64,
        input.filename,
        instrucao,
        `- dataEmissao: data de emiss\xE3o (YYYY-MM-DD)
- numeroNF: n\xFAmero da nota (apenas d\xEDgitos)
- placa: placa do ve\xEDculo transportador (formato ABC1234 ou Mercosul)
- pesoLiquido: peso l\xEDquido em kg (n\xFAmero)
- pesoBruto: peso bruto em kg (n\xFAmero)
- fornecedor: nome do emitente/remetente
- produto: descri\xE7\xE3o do produto (ex: Soja em gr\xE3os)`,
        {
          type: "object",
          properties: {
            dataEmissao: { type: ["string", "null"] },
            numeroNF: { type: ["string", "null"] },
            placa: { type: ["string", "null"] },
            pesoLiquido: { type: ["number", "null"] },
            pesoBruto: { type: ["number", "null"] },
            fornecedor: { type: ["string", "null"] },
            produto: { type: ["string", "null"] }
          },
          required: ["dataEmissao", "numeroNF", "placa", "pesoLiquido", "pesoBruto", "fornecedor", "produto"],
          additionalProperties: false
        }
      );
    }),
    /** Extrai dados de ticket de descarga (balança) via LLM */
    extrairTicket: publicProcedure.input(z2.object({
      fileBase64: z2.string(),
      filename: z2.string().default("ticket_descarga.pdf"),
      mimeType: z2.string().default("application/pdf")
    })).mutation(async ({ input }) => {
      return extrairDocumentoViaLLM(
        input.fileBase64,
        input.filename,
        "Este \xE9 um TICKET DE DESCARGA (comprovante de pesagem na balan\xE7a do destino). Extraia os campos solicitados.",
        `- dataDescarga: data da descarga/pesagem (YYYY-MM-DD)
- numeroTicket: n\xFAmero do ticket ou romaneio
- placa: placa do ve\xEDculo (formato ABC1234 ou Mercosul)
- pesoDescarga: peso l\xEDquido descarregado em kg (n\xFAmero)
- nfeSaida: n\xFAmero da NF de sa\xEDda mencionada no ticket (apenas d\xEDgitos, ou null)
- umidade: teor de umidade em % (n\xFAmero, ex: 13.5)
- impureza: teor de impureza em % (n\xFAmero)
- avariado: gr\xE3os avariados em % (n\xFAmero)
- queimado: gr\xE3os queimados/carbonizados em % (n\xFAmero, se n\xE3o encontrado retorne null)`,
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
            queimado: { type: ["number", "null"] }
          },
          required: ["dataDescarga", "numeroTicket", "placa", "pesoDescarga", "nfeSaida", "umidade", "impureza", "avariado", "queimado"],
          additionalProperties: false
        },
        input.mimeType
      );
    }),
    /** Extrai dados de comprovante de pagamento (PIX, TED, boleto) via LLM */
    extrairComprovante: publicProcedure.input(z2.object({
      fileBase64: z2.string(),
      filename: z2.string().default("comprovante.pdf"),
      mimeType: z2.string().default("application/pdf")
    })).mutation(async ({ input }) => {
      return extrairDocumentoViaLLM(
        input.fileBase64,
        input.filename,
        "Este \xE9 um COMPROVANTE DE PAGAMENTO (PIX, TED, DOC, boleto ou cheque). Extraia os campos solicitados.",
        `- dataPagamento: data do pagamento (YYYY-MM-DD)
- valor: valor pago em reais (n\xFAmero, sem s\xEDmbolo R$)
- formaPagamento: tipo de pagamento: "pix", "ted", "doc", "boleto", "cheque" ou "outro"
- numeroBoleto: n\xFAmero do documento/autentica\xE7\xE3o/c\xF3digo de barras (ou null)
- chavePix: chave PIX utilizada (CPF, CNPJ, e-mail, telefone ou chave aleat\xF3ria \u2014 ou null)
- banco: nome do banco pagador
- observacao: qualquer observa\xE7\xE3o ou descri\xE7\xE3o presente no comprovante`,
        {
          type: "object",
          properties: {
            dataPagamento: { type: ["string", "null"] },
            valor: { type: ["number", "null"] },
            formaPagamento: { type: ["string", "null"] },
            numeroBoleto: { type: ["string", "null"] },
            chavePix: { type: ["string", "null"] },
            banco: { type: ["string", "null"] },
            observacao: { type: ["string", "null"] }
          },
          required: ["dataPagamento", "valor", "formaPagamento", "numeroBoleto", "chavePix", "banco", "observacao"],
          additionalProperties: false
        },
        input.mimeType
      );
    })
  }),
  // ─── Embarques ─────────────────────────────────────────────────────────────
  embarques: router({
    list: publicProcedure.input(z2.object({
      operacaoId: z2.number().optional(),
      dataIni: z2.string().optional(),
      dataFim: z2.string().optional()
    }).optional()).query(({ input }) => listEmbarques({
      operacaoId: input?.operacaoId,
      dataIni: input?.dataIni ? new Date(input.dataIni) : void 0,
      dataFim: input?.dataFim ? new Date(input.dataFim) : void 0
    })),
    listSemDescarga: publicProcedure.input(z2.object({ operacaoId: z2.number().optional() }).optional()).query(({ input }) => listEmbarquesSemDescarga(input?.operacaoId)),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getEmbarque(input.id)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      operacaoId: z2.number(),
      dataEmbarque: z2.string().optional(),
      placa: z2.string().optional(),
      nfeEntrada: z2.string().optional(),
      nfeSaida: z2.string().optional(),
      pesoOrigem: z2.number(),
      status: z2.enum(["Em tr\xE2nsito", "Descarga pendente", "Finalizada"]).default("Em tr\xE2nsito"),
      umidade: z2.number().default(0),
      imp: z2.number().default(0),
      avar: z2.number().default(0),
      queim: z2.number().default(0)
    })).mutation(({ input }) => upsertEmbarque(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteEmbarque(input.id))
  }),
  // ─── Descargas ─────────────────────────────────────────────────────────────
  descargas: router({
    list: publicProcedure.query(() => listDescargas()),
    getByEmbarque: publicProcedure.input(z2.object({ embarqueId: z2.number() })).query(({ input }) => getDescargaByEmbarque(input.embarqueId)),
    extractTicket: publicProcedure.input(z2.object({
      base64: z2.string(),
      mimeType: z2.string().default("image/jpeg")
    })).mutation(async ({ input }) => {
      const buf = Buffer.from(input.base64, "base64");
      const key = `tickets/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      const isImg = !input.mimeType.includes("pdf");
      const messages = [
        { role: "system", content: "Voc\xEA \xE9 um especialista em leitura de tickets de descarga de gr\xE3os. Extraia os dados e retorne APENAS JSON v\xE1lido sem markdown." },
        { role: "user", content: [
          { type: "text", text: "Extraia do ticket: pesoDescarga (n\xFAmero em kg), placa (string), dataDescarga (YYYY-MM-DD), nfeSaida (n\xFAmero da NF), ticketNumero (n\xFAmero do ticket), dcUmidade (%), dcImp (impureza %), dcAvar (avariado %), dcQueim (queimado % \u2014 se n\xE3o houver, omita o campo). Retorne JSON com essas chaves." },
          isImg ? { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}` } } : { type: "file_url", file_url: { url: `data:${input.mimeType};base64,${input.base64}`, mime_type: "application/pdf" } }
        ] }
      ];
      const resp = await invokeLLM({ messages });
      const rawContent = resp.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "{}";
      let parsed = {};
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
      }
      return { ...parsed, ticketUrl: url };
    }),
    save: publicProcedure.input(z2.object({
      embarqueId: z2.number(),
      dataDescarga: z2.string().optional(),
      pesoDescarga: z2.number(),
      placa: z2.string().optional(),
      nfeSaida: z2.string().optional(),
      ticketNumero: z2.string().optional(),
      ticketUrl: z2.string().optional(),
      dcUmidade: z2.number().default(0),
      dcImp: z2.number().default(0),
      dcAvar: z2.number().default(0),
      dcQueim: z2.number().default(1),
      obs: z2.string().optional()
    })).mutation(({ input }) => upsertDescarga(input))
  }),
  // ─── Pagamentos ────────────────────────────────────────────────────────────
  pagamentos: router({
    list: publicProcedure.input(z2.object({ compraId: z2.number().optional() }).optional()).query(({ input }) => listPagamentos(input?.compraId)),
    save: publicProcedure.input(z2.object({
      id: z2.number().optional(),
      compraId: z2.number(),
      dataPagamento: z2.string().optional(),
      valor: z2.number(),
      banco: z2.string().optional(),
      formaPagamento: z2.enum(["pix", "ted", "doc", "boleto", "cheque", "outro"]).default("pix"),
      numeroBoleto: z2.string().optional(),
      chavePix: z2.string().optional(),
      comprovanteUrl: z2.string().optional(),
      obs: z2.string().optional()
    })).mutation(({ input }) => upsertPagamento(input)),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deletePagamento(input.id)),
    extractComprovante: publicProcedure.input(z2.object({
      base64: z2.string(),
      mimeType: z2.string().default("image/jpeg")
    })).mutation(async ({ input }) => {
      const buf = Buffer.from(input.base64, "base64");
      const key = `comprovantes/${Date.now()}.${input.mimeType.includes("pdf") ? "pdf" : "jpg"}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      const isImg = !input.mimeType.includes("pdf");
      const messages = [
        { role: "system", content: "Voc\xEA \xE9 um assistente especializado em leitura de comprovantes de pagamento banc\xE1rio. Extraia os dados do comprovante e retorne APENAS um JSON v\xE1lido sem markdown." },
        { role: "user", content: [
          { type: "text", text: "Extraia do comprovante: valor (n\xFAmero), dataPagamento (YYYY-MM-DD), formaPagamento (pix/ted/doc/boleto/cheque/outro), numeroBoleto (string), chavePix (string), banco (string), obs (texto do campo observa\xE7\xE3o se houver). Retorne JSON com essas chaves." },
          isImg ? { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}` } } : { type: "file_url", file_url: { url: `data:${input.mimeType};base64,${input.base64}`, mime_type: "application/pdf" } }
        ] }
      ];
      const resp = await invokeLLM({ messages });
      const rawContent = resp.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent : "{}";
      let parsed = {};
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
      }
      return { ...parsed, comprovanteUrl: url };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var index_default = app;
export {
  index_default as default
};
