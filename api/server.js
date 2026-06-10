"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_express2 = require("@trpc/server/adapters/express");

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
var import_drizzle_orm = require("drizzle-orm");
var import_mysql2 = require("drizzle-orm/mysql2");

// drizzle/schema.ts
var import_mysql_core = require("drizzle-orm/mysql-core");
var users = (0, import_mysql_core.mysqlTable)("users", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  openId: (0, import_mysql_core.varchar)("openId", { length: 64 }).notNull().unique(),
  name: (0, import_mysql_core.text)("name"),
  email: (0, import_mysql_core.varchar)("email", { length: 320 }),
  loginMethod: (0, import_mysql_core.varchar)("loginMethod", { length: 64 }),
  role: (0, import_mysql_core.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: (0, import_mysql_core.timestamp)("lastSignedIn").defaultNow().notNull()
});
var config = (0, import_mysql_core.mysqlTable)("config", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  fundoMes: (0, import_mysql_core.decimal)("fundoMes", { precision: 10, scale: 4 }).default("2.5").notNull(),
  dmais: (0, import_mysql_core.int)("dmais").default(2).notNull(),
  fethabRsTon: (0, import_mysql_core.decimal)("fethabRsTon", { precision: 10, scale: 4 }).default("48.7000").notNull(),
  iagroRsTon: (0, import_mysql_core.decimal)("iagroRsTon", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  senarPerc: (0, import_mysql_core.decimal)("senarPerc", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  funruralPerc: (0, import_mysql_core.decimal)("funruralPerc", { precision: 10, scale: 4 }).default("1.6300").notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var classificadores = (0, import_mysql_core.mysqlTable)("classificadores", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  nome: (0, import_mysql_core.varchar)("nome", { length: 255 }).notNull(),
  cpf: (0, import_mysql_core.varchar)("cpf", { length: 20 }),
  pix: (0, import_mysql_core.varchar)("pix", { length: 255 }).notNull(),
  obs: (0, import_mysql_core.text)("obs"),
  ativo: (0, import_mysql_core.boolean)("ativo").default(true).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var corretores = (0, import_mysql_core.mysqlTable)("corretores", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  nome: (0, import_mysql_core.varchar)("nome", { length: 255 }).notNull(),
  cpfCnpj: (0, import_mysql_core.varchar)("cpfCnpj", { length: 20 }),
  pix: (0, import_mysql_core.varchar)("pix", { length: 255 }).notNull(),
  /** Tipo de comissão: sc = por saca, ton = por tonelada, fixo = valor fixo, perc = % sobre venda */
  comissaoTipo: (0, import_mysql_core.mysqlEnum)("comissaoTipo", ["sc", "ton", "fixo", "perc"]).default("sc").notNull(),
  comissaoValor: (0, import_mysql_core.decimal)("comissaoValor", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  obs: (0, import_mysql_core.text)("obs"),
  ativo: (0, import_mysql_core.boolean)("ativo").default(true).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contratosCompra = (0, import_mysql_core.mysqlTable)("contratos_compra", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  sigla: (0, import_mysql_core.varchar)("sigla", { length: 100 }).notNull(),
  fornecedor: (0, import_mysql_core.varchar)("fornecedor", { length: 255 }).notNull(),
  produto: (0, import_mysql_core.varchar)("produto", { length: 100 }).notNull(),
  qualidade: (0, import_mysql_core.varchar)("qualidade", { length: 100 }).notNull(),
  volumeKg: (0, import_mysql_core.decimal)("volumeKg", { precision: 15, scale: 2 }).notNull(),
  precoSc: (0, import_mysql_core.decimal)("precoSc", { precision: 10, scale: 4 }).notNull(),
  // Dados bancários
  banco: (0, import_mysql_core.varchar)("banco", { length: 100 }).notNull(),
  agencia: (0, import_mysql_core.varchar)("agencia", { length: 20 }).notNull(),
  conta: (0, import_mysql_core.varchar)("conta", { length: 30 }).notNull(),
  favorecido: (0, import_mysql_core.varchar)("favorecido", { length: 255 }).notNull(),
  docFavorecido: (0, import_mysql_core.varchar)("docFavorecido", { length: 20 }).notNull(),
  pix: (0, import_mysql_core.varchar)("pix", { length: 255 }).notNull(),
  // Retenção tributária — quais tributos a trading retém na fonte
  // false = obrigação é do vendedor (ex: PJ que recolhe por conta própria)
  reterFunrural: (0, import_mysql_core.boolean)("reterFunrural").default(true).notNull(),
  reterFethab: (0, import_mysql_core.boolean)("reterFethab").default(true).notNull(),
  reterIagro: (0, import_mysql_core.boolean)("reterIagro").default(false).notNull(),
  reterSenar: (0, import_mysql_core.boolean)("reterSenar").default(false).notNull(),
  // Classificação origem
  umidTol: (0, import_mysql_core.decimal)("umidTol", { precision: 8, scale: 4 }).default("14.0000").notNull(),
  umidFat: (0, import_mysql_core.decimal)("umidFat", { precision: 8, scale: 4 }).default("1.8000").notNull(),
  impTol: (0, import_mysql_core.decimal)("impTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  impFat: (0, import_mysql_core.decimal)("impFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  avarTol: (0, import_mysql_core.decimal)("avarTol", { precision: 8, scale: 4 }).default("20.0000").notNull(),
  avarFat: (0, import_mysql_core.decimal)("avarFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimTol: (0, import_mysql_core.decimal)("queimTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimFat: (0, import_mysql_core.decimal)("queimFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  obs: (0, import_mysql_core.text)("obs"),
  ativo: (0, import_mysql_core.boolean)("ativo").default(true).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contratosVenda = (0, import_mysql_core.mysqlTable)("contratos_venda", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  sigla: (0, import_mysql_core.varchar)("sigla", { length: 100 }).notNull(),
  comprador: (0, import_mysql_core.varchar)("comprador", { length: 255 }).notNull(),
  produto: (0, import_mysql_core.varchar)("produto", { length: 100 }).notNull(),
  qualidade: (0, import_mysql_core.varchar)("qualidade", { length: 100 }).notNull(),
  volumeKg: (0, import_mysql_core.decimal)("volumeKg", { precision: 15, scale: 2 }).notNull(),
  precoSc: (0, import_mysql_core.decimal)("precoSc", { precision: 10, scale: 4 }).notNull(),
  // Tributação de venda
  /** Destino: "intraestadual" = dentro do MT, "interestadual" = fora do MT */
  destinoVenda: (0, import_mysql_core.mysqlEnum)("destinoVenda", ["intraestadual", "interestadual"]).default("interestadual").notNull(),
  /**
   * Finalidade do comprador:
   * industria = indústria de processamento (esmagamento, farelo, óleo)
   * racao = fábrica de ração
   * confinamento = confinamento/engorda
   * exportacao = comercialização com fim específico de exportação (RECOF/drawback)
   * trading = outra trading (mercado interno)
   * outro = outros usos
   */
  finalidadeVenda: (0, import_mysql_core.mysqlEnum)("finalidadeVenda", ["industria", "racao", "confinamento", "exportacao", "trading", "outro"]).default("industria").notNull(),
  /**
   * Regime tributário da compradora:
   * lucro_real | lucro_presumido | simples | isento
   */
  regimeCompradora: (0, import_mysql_core.mysqlEnum)("regimeCompradora", ["lucro_real", "lucro_presumido", "simples", "isento"]).default("lucro_real").notNull(),
  /** ICMS: diferimento, isencao, normal */
  icmsRegime: (0, import_mysql_core.mysqlEnum)("icmsRegime", ["diferimento", "isencao", "normal"]).default("diferimento").notNull(),
  icmsAliq: (0, import_mysql_core.decimal)("icmsAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  icmsRedBase: (0, import_mysql_core.decimal)("icmsRedBase", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  /** PIS/COFINS: isento, monofasico, normal */
  pisCofinsRegime: (0, import_mysql_core.mysqlEnum)("pisCofinsRegime", ["isento", "monofasico", "normal"]).default("isento").notNull(),
  pisAliq: (0, import_mysql_core.decimal)("pisAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  cofinsAliq: (0, import_mysql_core.decimal)("cofinsAliq", { precision: 8, scale: 4 }).default("0.0000").notNull(),
  // Classificação descarga
  umidTol: (0, import_mysql_core.decimal)("umidTol", { precision: 8, scale: 4 }).default("14.0000").notNull(),
  umidFat: (0, import_mysql_core.decimal)("umidFat", { precision: 8, scale: 4 }).default("1.8000").notNull(),
  impTol: (0, import_mysql_core.decimal)("impTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  impFat: (0, import_mysql_core.decimal)("impFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  avarTol: (0, import_mysql_core.decimal)("avarTol", { precision: 8, scale: 4 }).default("40.0000").notNull(),
  avarFat: (0, import_mysql_core.decimal)("avarFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimTol: (0, import_mysql_core.decimal)("queimTol", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  queimFat: (0, import_mysql_core.decimal)("queimFat", { precision: 8, scale: 4 }).default("1.0000").notNull(),
  obs: (0, import_mysql_core.text)("obs"),
  ativo: (0, import_mysql_core.boolean)("ativo").default(true).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var operacoes = (0, import_mysql_core.mysqlTable)("operacoes", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  sigla: (0, import_mysql_core.varchar)("sigla", { length: 100 }).notNull(),
  compraId: (0, import_mysql_core.int)("compraId").notNull(),
  vendaId: (0, import_mysql_core.int)("vendaId").notNull(),
  freteTon: (0, import_mysql_core.decimal)("freteTon", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  quebraTol: (0, import_mysql_core.decimal)("quebraTol", { precision: 8, scale: 4 }).default("0.2500").notNull(),
  diasDesagio: (0, import_mysql_core.int)("diasDesagio").default(15).notNull(),
  comissaoValor: (0, import_mysql_core.decimal)("comissaoValor", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  comissaoTipo: (0, import_mysql_core.mysqlEnum)("comissaoTipo", ["sc", "ton", "fixo", "percVenda"]).default("sc").notNull(),
  classificadorId: (0, import_mysql_core.int)("classificadorId"),
  custoClassTon: (0, import_mysql_core.decimal)("custoClassTon", { precision: 10, scale: 6 }).default("0.017000").notNull(),
  corretorId: (0, import_mysql_core.int)("corretorId"),
  obs: (0, import_mysql_core.text)("obs"),
  ativo: (0, import_mysql_core.boolean)("ativo").default(true).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var embarques = (0, import_mysql_core.mysqlTable)("embarques", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  operacaoId: (0, import_mysql_core.int)("operacaoId").notNull(),
  dataEmbarque: (0, import_mysql_core.timestamp)("dataEmbarque"),
  placa: (0, import_mysql_core.varchar)("placa", { length: 20 }),
  nfeEntrada: (0, import_mysql_core.varchar)("nfeEntrada", { length: 100 }),
  nfeSaida: (0, import_mysql_core.varchar)("nfeSaida", { length: 100 }),
  pesoOrigem: (0, import_mysql_core.decimal)("pesoOrigem", { precision: 15, scale: 2 }).notNull(),
  status: (0, import_mysql_core.mysqlEnum)("status", ["Em tr\xE2nsito", "Descarga pendente", "Finalizada"]).default("Em tr\xE2nsito").notNull(),
  umidade: (0, import_mysql_core.decimal)("umidade", { precision: 8, scale: 4 }).default("0.0000"),
  imp: (0, import_mysql_core.decimal)("imp", { precision: 8, scale: 4 }).default("0.0000"),
  avar: (0, import_mysql_core.decimal)("avar", { precision: 8, scale: 4 }).default("0.0000"),
  queim: (0, import_mysql_core.decimal)("queim", { precision: 8, scale: 4 }).default("0.0000"),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var descargas = (0, import_mysql_core.mysqlTable)("descargas", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  embarqueId: (0, import_mysql_core.int)("embarqueId").notNull().unique(),
  dataDescarga: (0, import_mysql_core.timestamp)("dataDescarga"),
  pesoDescarga: (0, import_mysql_core.decimal)("pesoDescarga", { precision: 15, scale: 2 }).notNull(),
  placa: (0, import_mysql_core.varchar)("placa", { length: 20 }),
  nfeSaida: (0, import_mysql_core.varchar)("nfeSaida", { length: 100 }),
  ticketNumero: (0, import_mysql_core.varchar)("ticketNumero", { length: 100 }),
  ticketUrl: (0, import_mysql_core.varchar)("ticketUrl", { length: 1e3 }),
  dcUmidade: (0, import_mysql_core.decimal)("dcUmidade", { precision: 8, scale: 4 }).default("0.0000"),
  dcImp: (0, import_mysql_core.decimal)("dcImp", { precision: 8, scale: 4 }).default("0.0000"),
  dcAvar: (0, import_mysql_core.decimal)("dcAvar", { precision: 8, scale: 4 }).default("0.0000"),
  dcQueim: (0, import_mysql_core.decimal)("dcQueim", { precision: 8, scale: 4 }).default("1.0000"),
  obs: (0, import_mysql_core.text)("obs"),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var pagamentos = (0, import_mysql_core.mysqlTable)("pagamentos", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  compraId: (0, import_mysql_core.int)("compraId").notNull(),
  dataPagamento: (0, import_mysql_core.timestamp)("dataPagamento"),
  valor: (0, import_mysql_core.decimal)("valor", { precision: 15, scale: 2 }).notNull(),
  banco: (0, import_mysql_core.varchar)("banco", { length: 100 }),
  formaPagamento: (0, import_mysql_core.mysqlEnum)("formaPagamento", ["pix", "ted", "doc", "boleto", "cheque", "outro"]).default("pix").notNull(),
  numeroBoleto: (0, import_mysql_core.varchar)("numeroBoleto", { length: 255 }),
  chavePix: (0, import_mysql_core.varchar)("chavePix", { length: 255 }),
  comprovanteUrl: (0, import_mysql_core.varchar)("comprovanteUrl", { length: 1e3 }),
  obs: (0, import_mysql_core.text)("obs"),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
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
      _db = (0, import_mysql2.drizzle)(process.env.DATABASE_URL);
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
  const result = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.openId, openId)).limit(1);
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
    await db.update(config).set(vals).where((0, import_drizzle_orm.eq)(config.id, existing.id));
  } else {
    await db.insert(config).values(vals);
  }
}
async function listClassificadores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classificadores).where((0, import_drizzle_orm.eq)(classificadores.ativo, true)).orderBy((0, import_drizzle_orm.desc)(classificadores.createdAt));
}
async function getClassificador(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(classificadores).where((0, import_drizzle_orm.eq)(classificadores.id, id)).limit(1);
  return rows[0] ?? null;
}
async function upsertClassificador(data) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(classificadores).set({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null }).where((0, import_drizzle_orm.eq)(classificadores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(classificadores).values({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null });
    return result[0]?.insertId ?? null;
  }
}
async function deleteClassificador(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(classificadores).set({ ativo: false }).where((0, import_drizzle_orm.eq)(classificadores.id, id));
}
async function listCorretores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(corretores).where((0, import_drizzle_orm.eq)(corretores.ativo, true)).orderBy((0, import_drizzle_orm.desc)(corretores.createdAt));
}
async function getCorretor(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(corretores).where((0, import_drizzle_orm.eq)(corretores.id, id)).limit(1);
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
    await db.update(corretores).set(payload).where((0, import_drizzle_orm.eq)(corretores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(corretores).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteCorretor(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(corretores).set({ ativo: false }).where((0, import_drizzle_orm.eq)(corretores.id, id));
}
async function listContratosCompra() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosCompra).where((0, import_drizzle_orm.eq)(contratosCompra.ativo, true)).orderBy((0, import_drizzle_orm.desc)(contratosCompra.createdAt));
}
async function getContratoCompra(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosCompra).where((0, import_drizzle_orm.eq)(contratosCompra.id, id)).limit(1);
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
    await db.update(contratosCompra).set(payload).where((0, import_drizzle_orm.eq)(contratosCompra.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosCompra).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteContratoCompra(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosCompra).set({ ativo: false }).where((0, import_drizzle_orm.eq)(contratosCompra.id, id));
}
async function listContratosVenda() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosVenda).where((0, import_drizzle_orm.eq)(contratosVenda.ativo, true)).orderBy((0, import_drizzle_orm.desc)(contratosVenda.createdAt));
}
async function getContratoVenda(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosVenda).where((0, import_drizzle_orm.eq)(contratosVenda.id, id)).limit(1);
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
    await db.update(contratosVenda).set(payload).where((0, import_drizzle_orm.eq)(contratosVenda.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosVenda).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteContratoVenda(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosVenda).set({ ativo: false }).where((0, import_drizzle_orm.eq)(contratosVenda.id, id));
}
async function listOperacoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operacoes).where((0, import_drizzle_orm.eq)(operacoes.ativo, true)).orderBy((0, import_drizzle_orm.desc)(operacoes.createdAt));
}
async function getOperacao(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(operacoes).where((0, import_drizzle_orm.eq)(operacoes.id, id)).limit(1);
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
    await db.update(operacoes).set(payload).where((0, import_drizzle_orm.eq)(operacoes.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(operacoes).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteOperacao(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(operacoes).set({ ativo: false }).where((0, import_drizzle_orm.eq)(operacoes.id, id));
}
async function listEmbarques(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.operacaoId) conditions.push((0, import_drizzle_orm.eq)(embarques.operacaoId, filters.operacaoId));
  if (filters?.dataIni) conditions.push((0, import_drizzle_orm.gte)(embarques.dataEmbarque, filters.dataIni));
  if (filters?.dataFim) conditions.push((0, import_drizzle_orm.lte)(embarques.dataEmbarque, filters.dataFim));
  return conditions.length > 0 ? db.select().from(embarques).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.desc)(embarques.createdAt)) : db.select().from(embarques).orderBy((0, import_drizzle_orm.desc)(embarques.createdAt));
}
async function listEmbarquesSemDescarga(operacaoId) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [(0, import_drizzle_orm.ne)(embarques.status, "Finalizada")];
  if (operacaoId) conditions.push((0, import_drizzle_orm.eq)(embarques.operacaoId, operacaoId));
  return db.select().from(embarques).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.desc)(embarques.dataEmbarque));
}
async function getEmbarque(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(embarques).where((0, import_drizzle_orm.eq)(embarques.id, id)).limit(1);
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
    await db.update(embarques).set(payload).where((0, import_drizzle_orm.eq)(embarques.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(embarques).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deleteEmbarque(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(embarques).where((0, import_drizzle_orm.eq)(embarques.id, id));
}
async function listDescargas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(descargas).orderBy((0, import_drizzle_orm.desc)(descargas.createdAt));
}
async function getDescargaByEmbarque(embarqueId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(descargas).where((0, import_drizzle_orm.eq)(descargas.embarqueId, embarqueId)).limit(1);
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
    await db.update(descargas).set(payload).where((0, import_drizzle_orm.eq)(descargas.id, existing.id));
    await db.update(embarques).set({ status: "Finalizada", nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where((0, import_drizzle_orm.eq)(embarques.id, data.embarqueId));
    return existing.id;
  } else {
    const result = await db.insert(descargas).values(payload);
    await db.update(embarques).set({ status: "Finalizada", nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where((0, import_drizzle_orm.eq)(embarques.id, data.embarqueId));
    return result[0]?.insertId ?? null;
  }
}
async function listPagamentos(compraId) {
  const db = await getDb();
  if (!db) return [];
  return compraId ? db.select().from(pagamentos).where((0, import_drizzle_orm.eq)(pagamentos.compraId, compraId)).orderBy((0, import_drizzle_orm.desc)(pagamentos.createdAt)) : db.select().from(pagamentos).orderBy((0, import_drizzle_orm.desc)(pagamentos.createdAt));
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
    await db.update(pagamentos).set(payload).where((0, import_drizzle_orm.eq)(pagamentos.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(pagamentos).values(payload);
    return result[0]?.insertId ?? null;
  }
}
async function deletePagamento(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pagamentos).where((0, import_drizzle_orm.eq)(pagamentos.id, id));
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
var import_axios = __toESM(require("axios"), 1);
var import_cookie = require("cookie");
var import_jose = require("jose");
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
var createOAuthHttpClient = () => import_axios.default.create({
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
    const parsed = (0, import_cookie.parse)(cookieHeader);
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
    return new import_jose.SignJWT({
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
      const { payload } = await (0, import_jose.jwtVerify)(cookieValue, secretKey, {
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
var import_zod2 = require("zod");

// server/_core/systemRouter.ts
var import_zod = require("zod");

// server/_core/notification.ts
var import_server = require("@trpc/server");
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
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new import_server.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new import_server.TRPCError({
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
var import_server2 = require("@trpc/server");
var import_superjson = __toESM(require("superjson"), 1);
var t = import_server2.initTRPC.context().create({
  transformer: import_superjson.default
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new import_server2.TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
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
      throw new import_server2.TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
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
    import_zod.z.object({
      timestamp: import_zod.z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    import_zod.z.object({
      title: import_zod.z.string().min(1, "title is required"),
      content: import_zod.z.string().min(1, "content is required")
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
var classifSchema = import_zod2.z.object({
  umidTol: import_zod2.z.number().default(14),
  umidFat: import_zod2.z.number().default(1.8),
  impTol: import_zod2.z.number().default(1),
  impFat: import_zod2.z.number().default(1),
  avarTol: import_zod2.z.number().default(20),
  avarFat: import_zod2.z.number().default(1),
  queimTol: import_zod2.z.number().default(1),
  queimFat: import_zod2.z.number().default(1)
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
    save: publicProcedure.input(import_zod2.z.object({
      fundoMes: import_zod2.z.number(),
      dmais: import_zod2.z.number(),
      fethabRsTon: import_zod2.z.number(),
      iagroRsTon: import_zod2.z.number(),
      senarPerc: import_zod2.z.number(),
      funruralPerc: import_zod2.z.number()
    })).mutation(({ input }) => upsertConfig(input))
  }),
  // ─── Classificadores ───────────────────────────────────────────────────────
  classificadores: router({
    list: publicProcedure.query(() => listClassificadores()),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getClassificador(input.id)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      nome: import_zod2.z.string().min(1),
      cpf: import_zod2.z.string().optional(),
      pix: import_zod2.z.string().min(1),
      obs: import_zod2.z.string().optional()
    })).mutation(({ input }) => upsertClassificador(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteClassificador(input.id))
  }),
  // ─── Corretores ────────────────────────────────────────────────────────────
  corretores: router({
    list: publicProcedure.query(() => listCorretores()),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getCorretor(input.id)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      nome: import_zod2.z.string().min(1),
      cpfCnpj: import_zod2.z.string().optional(),
      pix: import_zod2.z.string().min(1),
      comissaoTipo: import_zod2.z.enum(["sc", "ton", "fixo", "perc"]).default("sc"),
      comissaoValor: import_zod2.z.number().default(0),
      obs: import_zod2.z.string().optional()
    })).mutation(({ input }) => upsertCorretor(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteCorretor(input.id))
  }),
  // ─── Contratos de Compra ───────────────────────────────────────────────────
  compras: router({
    list: publicProcedure.query(() => listContratosCompra()),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getContratoCompra(input.id)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      sigla: import_zod2.z.string().min(1),
      fornecedor: import_zod2.z.string().min(1),
      produto: import_zod2.z.string(),
      qualidade: import_zod2.z.string(),
      volumeKg: import_zod2.z.number(),
      precoSc: import_zod2.z.number(),
      banco: import_zod2.z.string().min(1),
      agencia: import_zod2.z.string().min(1),
      conta: import_zod2.z.string().min(1),
      favorecido: import_zod2.z.string().min(1),
      docFavorecido: import_zod2.z.string().min(1),
      pix: import_zod2.z.string().min(1),
      reterFunrural: import_zod2.z.boolean().default(true),
      reterFethab: import_zod2.z.boolean().default(true),
      reterIagro: import_zod2.z.boolean().default(false),
      reterSenar: import_zod2.z.boolean().default(false),
      obs: import_zod2.z.string().optional()
    }).merge(classifSchema)).mutation(({ input }) => upsertContratoCompra(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteContratoCompra(input.id))
  }),
  // ─── Contratos de Venda ────────────────────────────────────────────────────
  vendas: router({
    list: publicProcedure.query(() => listContratosVenda()),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getContratoVenda(input.id)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      sigla: import_zod2.z.string().min(1),
      comprador: import_zod2.z.string().min(1),
      produto: import_zod2.z.string(),
      qualidade: import_zod2.z.string(),
      volumeKg: import_zod2.z.number(),
      precoSc: import_zod2.z.number(),
      destinoVenda: import_zod2.z.enum(["intraestadual", "interestadual"]).default("interestadual"),
      finalidadeVenda: import_zod2.z.enum(["industria", "racao", "confinamento", "exportacao", "trading", "outro"]).default("industria"),
      regimeCompradora: import_zod2.z.enum(["lucro_real", "lucro_presumido", "simples", "isento"]).default("lucro_real"),
      icmsRegime: import_zod2.z.enum(["diferimento", "isencao", "normal"]).default("diferimento"),
      icmsAliq: import_zod2.z.number().default(0),
      icmsRedBase: import_zod2.z.number().default(0),
      pisCofinsRegime: import_zod2.z.enum(["isento", "monofasico", "normal"]).default("isento"),
      pisAliq: import_zod2.z.number().default(0),
      cofinsAliq: import_zod2.z.number().default(0),
      obs: import_zod2.z.string().optional()
    }).merge(classifSchema.extend({ avarTol: import_zod2.z.number().default(40) }))).mutation(({ input }) => upsertContratoVenda(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteContratoVenda(input.id))
  }),
  // ─── Operações ─────────────────────────────────────────────────────────────
  operacoes: router({
    list: publicProcedure.query(() => listOperacoes()),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getOperacao(input.id)),
    gerarSigla: publicProcedure.input(import_zod2.z.object({ compraId: import_zod2.z.number(), vendaId: import_zod2.z.number() })).query(({ input }) => gerarSiglaOperacao(input.compraId, input.vendaId)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      sigla: import_zod2.z.string().min(1),
      compraId: import_zod2.z.number(),
      vendaId: import_zod2.z.number(),
      freteTon: import_zod2.z.number().default(0),
      quebraTol: import_zod2.z.number().default(0.25),
      diasDesagio: import_zod2.z.number().default(15),
      comissaoValor: import_zod2.z.number().default(0),
      comissaoTipo: import_zod2.z.enum(["sc", "ton", "fixo", "percVenda"]).default("sc"),
      classificadorId: import_zod2.z.number().nullable().optional(),
      custoClassTon: import_zod2.z.number().default(0.017),
      corretorId: import_zod2.z.number().nullable().optional(),
      obs: import_zod2.z.string().optional()
    })).mutation(({ input }) => upsertOperacao(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteOperacao(input.id))
  }),
  // ─── Notas Fiscais (extração via LLM) ─────────────────────────────────────
  nf: router({
    extrair: publicProcedure.input(import_zod2.z.object({
      pdfBase64: import_zod2.z.string(),
      filename: import_zod2.z.string().default("nota_fiscal.pdf"),
      tipo: import_zod2.z.enum(["entrada", "saida"]).default("saida")
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
    extrairTicket: publicProcedure.input(import_zod2.z.object({
      fileBase64: import_zod2.z.string(),
      filename: import_zod2.z.string().default("ticket_descarga.pdf"),
      mimeType: import_zod2.z.string().default("application/pdf")
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
    extrairComprovante: publicProcedure.input(import_zod2.z.object({
      fileBase64: import_zod2.z.string(),
      filename: import_zod2.z.string().default("comprovante.pdf"),
      mimeType: import_zod2.z.string().default("application/pdf")
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
    list: publicProcedure.input(import_zod2.z.object({
      operacaoId: import_zod2.z.number().optional(),
      dataIni: import_zod2.z.string().optional(),
      dataFim: import_zod2.z.string().optional()
    }).optional()).query(({ input }) => listEmbarques({
      operacaoId: input?.operacaoId,
      dataIni: input?.dataIni ? new Date(input.dataIni) : void 0,
      dataFim: input?.dataFim ? new Date(input.dataFim) : void 0
    })),
    listSemDescarga: publicProcedure.input(import_zod2.z.object({ operacaoId: import_zod2.z.number().optional() }).optional()).query(({ input }) => listEmbarquesSemDescarga(input?.operacaoId)),
    get: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).query(({ input }) => getEmbarque(input.id)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      operacaoId: import_zod2.z.number(),
      dataEmbarque: import_zod2.z.string().optional(),
      placa: import_zod2.z.string().optional(),
      nfeEntrada: import_zod2.z.string().optional(),
      nfeSaida: import_zod2.z.string().optional(),
      pesoOrigem: import_zod2.z.number(),
      status: import_zod2.z.enum(["Em tr\xE2nsito", "Descarga pendente", "Finalizada"]).default("Em tr\xE2nsito"),
      umidade: import_zod2.z.number().default(0),
      imp: import_zod2.z.number().default(0),
      avar: import_zod2.z.number().default(0),
      queim: import_zod2.z.number().default(0)
    })).mutation(({ input }) => upsertEmbarque(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deleteEmbarque(input.id))
  }),
  // ─── Descargas ─────────────────────────────────────────────────────────────
  descargas: router({
    list: publicProcedure.query(() => listDescargas()),
    getByEmbarque: publicProcedure.input(import_zod2.z.object({ embarqueId: import_zod2.z.number() })).query(({ input }) => getDescargaByEmbarque(input.embarqueId)),
    extractTicket: publicProcedure.input(import_zod2.z.object({
      base64: import_zod2.z.string(),
      mimeType: import_zod2.z.string().default("image/jpeg")
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
    save: publicProcedure.input(import_zod2.z.object({
      embarqueId: import_zod2.z.number(),
      dataDescarga: import_zod2.z.string().optional(),
      pesoDescarga: import_zod2.z.number(),
      placa: import_zod2.z.string().optional(),
      nfeSaida: import_zod2.z.string().optional(),
      ticketNumero: import_zod2.z.string().optional(),
      ticketUrl: import_zod2.z.string().optional(),
      dcUmidade: import_zod2.z.number().default(0),
      dcImp: import_zod2.z.number().default(0),
      dcAvar: import_zod2.z.number().default(0),
      dcQueim: import_zod2.z.number().default(1),
      obs: import_zod2.z.string().optional()
    })).mutation(({ input }) => upsertDescarga(input))
  }),
  // ─── Pagamentos ────────────────────────────────────────────────────────────
  pagamentos: router({
    list: publicProcedure.input(import_zod2.z.object({ compraId: import_zod2.z.number().optional() }).optional()).query(({ input }) => listPagamentos(input?.compraId)),
    save: publicProcedure.input(import_zod2.z.object({
      id: import_zod2.z.number().optional(),
      compraId: import_zod2.z.number(),
      dataPagamento: import_zod2.z.string().optional(),
      valor: import_zod2.z.number(),
      banco: import_zod2.z.string().optional(),
      formaPagamento: import_zod2.z.enum(["pix", "ted", "doc", "boleto", "cheque", "outro"]).default("pix"),
      numeroBoleto: import_zod2.z.string().optional(),
      chavePix: import_zod2.z.string().optional(),
      comprovanteUrl: import_zod2.z.string().optional(),
      obs: import_zod2.z.string().optional()
    })).mutation(({ input }) => upsertPagamento(input)),
    delete: publicProcedure.input(import_zod2.z.object({ id: import_zod2.z.number() })).mutation(({ input }) => deletePagamento(input.id)),
    extractComprovante: publicProcedure.input(import_zod2.z.object({
      base64: import_zod2.z.string(),
      mimeType: import_zod2.z.string().default("image/jpeg")
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

// server.ts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  (0, import_express2.createExpressMiddleware)({
    router: appRouter,
    createContext
  })
);
var server_default = app;
