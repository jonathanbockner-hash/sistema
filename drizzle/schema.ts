import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Configurações Gerais ────────────────────────────────────────────────────
export const config = mysqlTable("config", {
  id: int("id").autoincrement().primaryKey(),
  fundoMes: decimal("fundoMes", { precision: 10, scale: 4 }).default("2.5").notNull(),
  dmais: int("dmais").default(2).notNull(),
  fethab: decimal("fethab", { precision: 10, scale: 4 }).default("2.0500").notNull(),
  iagro: decimal("iagro", { precision: 10, scale: 4 }).default("0.1415").notNull(),
  senar: decimal("senar", { precision: 10, scale: 4 }).default("0.1765").notNull(),
  funrural: decimal("funrural", { precision: 10, scale: 4 }).default("0.0000").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Classificadores ─────────────────────────────────────────────────────────
export const classificadores = mysqlTable("classificadores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 20 }),
  pix: varchar("pix", { length: 255 }).notNull(),
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Contratos de Compra ─────────────────────────────────────────────────────
export const contratosCompra = mysqlTable("contratos_compra", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Contratos de Venda ──────────────────────────────────────────────────────
export const contratosVenda = mysqlTable("contratos_venda", {
  id: int("id").autoincrement().primaryKey(),
  sigla: varchar("sigla", { length: 100 }).notNull(),
  comprador: varchar("comprador", { length: 255 }).notNull(),
  produto: varchar("produto", { length: 100 }).notNull(),
  qualidade: varchar("qualidade", { length: 100 }).notNull(),
  volumeKg: decimal("volumeKg", { precision: 15, scale: 2 }).notNull(),
  precoSc: decimal("precoSc", { precision: 10, scale: 4 }).notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Operações Vinculadas ────────────────────────────────────────────────────
export const operacoes = mysqlTable("operacoes", {
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
  obs: text("obs"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Embarques ───────────────────────────────────────────────────────────────
export const embarques = mysqlTable("embarques", {
  id: int("id").autoincrement().primaryKey(),
  operacaoId: int("operacaoId").notNull(),
  dataEmbarque: timestamp("dataEmbarque"),
  placa: varchar("placa", { length: 20 }),
  nfeEntrada: varchar("nfeEntrada", { length: 100 }),
  nfeSaida: varchar("nfeSaida", { length: 100 }),
  pesoOrigem: decimal("pesoOrigem", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["Em trânsito", "Descarga pendente", "Finalizada"]).default("Em trânsito").notNull(),
  // Classificação origem
  umidade: decimal("umidade", { precision: 8, scale: 4 }).default("0.0000"),
  imp: decimal("imp", { precision: 8, scale: 4 }).default("0.0000"),
  avar: decimal("avar", { precision: 8, scale: 4 }).default("0.0000"),
  queim: decimal("queim", { precision: 8, scale: 4 }).default("0.0000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Descargas ───────────────────────────────────────────────────────────────
export const descargas = mysqlTable("descargas", {
  id: int("id").autoincrement().primaryKey(),
  embarqueId: int("embarqueId").notNull().unique(),
  dataDescarga: timestamp("dataDescarga"),
  pesoDescarga: decimal("pesoDescarga", { precision: 15, scale: 2 }).notNull(),
  placa: varchar("placa", { length: 20 }),
  nfeSaida: varchar("nfeSaida", { length: 100 }),
  // Classificação descarga
  dcUmidade: decimal("dcUmidade", { precision: 8, scale: 4 }).default("0.0000"),
  dcImp: decimal("dcImp", { precision: 8, scale: 4 }).default("0.0000"),
  dcAvar: decimal("dcAvar", { precision: 8, scale: 4 }).default("0.0000"),
  dcQueim: decimal("dcQueim", { precision: 8, scale: 4 }).default("0.0000"),
  obs: text("obs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Pagamentos ──────────────────────────────────────────────────────────────
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  compraId: int("compraId").notNull(),
  dataPagamento: timestamp("dataPagamento"),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  banco: varchar("banco", { length: 100 }),
  comprovante: varchar("comprovante", { length: 500 }),
  obs: text("obs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
