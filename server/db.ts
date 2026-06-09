import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, config, classificadores, contratosCompra, contratosVenda, operacoes, embarques, descargas, pagamentos } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Config ──────────────────────────────────────────────────────────────────
export async function getConfig() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(config).limit(1);
  return rows[0] ?? null;
}

export async function upsertConfig(data: { fundoMes: number; dmais: number; fethabRsTon: number; iagroRsTon: number; senarPerc: number; funruralPerc: number }) {
  const db = await getDb();
  if (!db) return;
  const existing = await getConfig();
  const vals = {
    fundoMes: String(data.fundoMes),
    dmais: data.dmais,
    fethabRsTon: String(data.fethabRsTon),
    iagroRsTon: String(data.iagroRsTon),
    senarPerc: String(data.senarPerc),
    funruralPerc: String(data.funruralPerc),
  };
  if (existing) {
    await db.update(config).set(vals).where(eq(config.id, existing.id));
  } else {
    await db.insert(config).values(vals);
  }
}

// ─── Classificadores ─────────────────────────────────────────────────────────
export async function listClassificadores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classificadores).where(eq(classificadores.ativo, true)).orderBy(desc(classificadores.createdAt));
}

export async function getClassificador(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(classificadores).where(eq(classificadores.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertClassificador(data: { id?: number; nome: string; cpf?: string; pix: string; obs?: string }) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(classificadores).set({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null }).where(eq(classificadores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(classificadores).values({ nome: data.nome, cpf: data.cpf ?? null, pix: data.pix, obs: data.obs ?? null });
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteClassificador(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(classificadores).set({ ativo: false }).where(eq(classificadores.id, id));
}

// ─── Contratos de Compra ─────────────────────────────────────────────────────
export async function listContratosCompra() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosCompra).where(eq(contratosCompra.ativo, true)).orderBy(desc(contratosCompra.createdAt));
}

export async function getContratoCompra(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosCompra).where(eq(contratosCompra.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertContratoCompra(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla, fornecedor: data.fornecedor, produto: data.produto, qualidade: data.qualidade,
    volumeKg: String(data.volumeKg), precoSc: String(data.precoSc),
    banco: data.banco, agencia: data.agencia, conta: data.conta, favorecido: data.favorecido, docFavorecido: data.docFavorecido, pix: data.pix,
    umidTol: String(data.umidTol), umidFat: String(data.umidFat),
    impTol: String(data.impTol), impFat: String(data.impFat),
    avarTol: String(data.avarTol), avarFat: String(data.avarFat),
    queimTol: String(data.queimTol), queimFat: String(data.queimFat),
    obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(contratosCompra).set(payload).where(eq(contratosCompra.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosCompra).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteContratoCompra(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosCompra).set({ ativo: false }).where(eq(contratosCompra.id, id));
}

// ─── Contratos de Venda ──────────────────────────────────────────────────────
export async function listContratosVenda() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratosVenda).where(eq(contratosVenda.ativo, true)).orderBy(desc(contratosVenda.createdAt));
}

export async function getContratoVenda(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratosVenda).where(eq(contratosVenda.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertContratoVenda(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla, comprador: data.comprador, produto: data.produto, qualidade: data.qualidade,
    volumeKg: String(data.volumeKg), precoSc: String(data.precoSc),
    umidTol: String(data.umidTol), umidFat: String(data.umidFat),
    impTol: String(data.impTol), impFat: String(data.impFat),
    avarTol: String(data.avarTol), avarFat: String(data.avarFat),
    queimTol: String(data.queimTol), queimFat: String(data.queimFat),
    obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(contratosVenda).set(payload).where(eq(contratosVenda.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(contratosVenda).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteContratoVenda(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contratosVenda).set({ ativo: false }).where(eq(contratosVenda.id, id));
}

// ─── Operações ───────────────────────────────────────────────────────────────
export async function listOperacoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operacoes).where(eq(operacoes.ativo, true)).orderBy(desc(operacoes.createdAt));
}

export async function getOperacao(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(operacoes).where(eq(operacoes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertOperacao(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    sigla: data.sigla, compraId: data.compraId, vendaId: data.vendaId,
    freteTon: String(data.freteTon), quebraTol: String(data.quebraTol),
    diasDesagio: data.diasDesagio, comissaoValor: String(data.comissaoValor),
    comissaoTipo: data.comissaoTipo, classificadorId: data.classificadorId ?? null,
    custoClassTon: String(data.custoClassTon), obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(operacoes).set(payload).where(eq(operacoes.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(operacoes).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteOperacao(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(operacoes).set({ ativo: false }).where(eq(operacoes.id, id));
}

// ─── Embarques ───────────────────────────────────────────────────────────────
export async function listEmbarques(filters?: { operacaoId?: number; dataIni?: Date; dataFim?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.operacaoId) conditions.push(eq(embarques.operacaoId, filters.operacaoId));
  if (filters?.dataIni) conditions.push(gte(embarques.dataEmbarque, filters.dataIni));
  if (filters?.dataFim) conditions.push(lte(embarques.dataEmbarque, filters.dataFim));
  return conditions.length > 0
    ? db.select().from(embarques).where(and(...conditions)).orderBy(desc(embarques.createdAt))
    : db.select().from(embarques).orderBy(desc(embarques.createdAt));
}

export async function getEmbarque(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(embarques).where(eq(embarques.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertEmbarque(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    operacaoId: data.operacaoId,
    dataEmbarque: data.dataEmbarque ? new Date(data.dataEmbarque) : null,
    placa: data.placa ?? null, nfeEntrada: data.nfeEntrada ?? null, nfeSaida: data.nfeSaida ?? null,
    pesoOrigem: String(data.pesoOrigem), status: data.status,
    umidade: String(data.umidade ?? 0), imp: String(data.imp ?? 0),
    avar: String(data.avar ?? 0), queim: String(data.queim ?? 0),
  };
  if (data.id) {
    await db.update(embarques).set(payload).where(eq(embarques.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(embarques).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteEmbarque(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(embarques).where(eq(embarques.id, id));
}

// ─── Descargas ───────────────────────────────────────────────────────────────
export async function listDescargas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(descargas).orderBy(desc(descargas.createdAt));
}

export async function getDescargaByEmbarque(embarqueId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(descargas).where(eq(descargas.embarqueId, embarqueId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertDescarga(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    embarqueId: data.embarqueId,
    dataDescarga: data.dataDescarga ? new Date(data.dataDescarga) : null,
    pesoDescarga: String(data.pesoDescarga),
    placa: data.placa ?? null, nfeSaida: data.nfeSaida ?? null,
    dcUmidade: String(data.dcUmidade ?? 0), dcImp: String(data.dcImp ?? 0),
    dcAvar: String(data.dcAvar ?? 0), dcQueim: String(data.dcQueim ?? 0),
    obs: data.obs ?? null,
  };
  const existing = await getDescargaByEmbarque(data.embarqueId);
  if (existing) {
    await db.update(descargas).set(payload).where(eq(descargas.id, existing.id));
    // Update embarque status
    await db.update(embarques).set({ status: 'Finalizada', nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where(eq(embarques.id, data.embarqueId));
    return existing.id;
  } else {
    const result = await db.insert(descargas).values(payload);
    await db.update(embarques).set({ status: 'Finalizada', nfeSaida: data.nfeSaida ?? null, placa: data.placa ?? null }).where(eq(embarques.id, data.embarqueId));
    return (result as any)[0]?.insertId ?? null;
  }
}

// ─── Pagamentos ──────────────────────────────────────────────────────────────
export async function listPagamentos(compraId?: number) {
  const db = await getDb();
  if (!db) return [];
  return compraId
    ? db.select().from(pagamentos).where(eq(pagamentos.compraId, compraId)).orderBy(desc(pagamentos.createdAt))
    : db.select().from(pagamentos).orderBy(desc(pagamentos.createdAt));
}

export async function upsertPagamento(data: any) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    compraId: data.compraId,
    dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
    valor: String(data.valor), banco: data.banco ?? null,
    comprovante: data.comprovante ?? null, obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(pagamentos).set(payload).where(eq(pagamentos.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(pagamentos).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deletePagamento(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pagamentos).where(eq(pagamentos.id, id));
}
