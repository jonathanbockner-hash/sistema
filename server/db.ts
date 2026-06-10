import { eq, desc, and, gte, lte, isNull, ne, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, config, classificadores, corretores,
  contratosCompra, contratosVenda, operacoes, embarques, descargas, pagamentos,
  despesasOperacionais,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
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
    fundoMes: String(data.fundoMes), dmais: data.dmais,
    fethabRsTon: String(data.fethabRsTon), iagroRsTon: String(data.iagroRsTon),
    senarPerc: String(data.senarPerc), funruralPerc: String(data.funruralPerc),
  };
  if (existing) { await db.update(config).set(vals).where(eq(config.id, existing.id)); }
  else { await db.insert(config).values(vals); }
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

// ─── Corretores ───────────────────────────────────────────────────────────────
export async function listCorretores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(corretores).where(eq(corretores.ativo, true)).orderBy(desc(corretores.createdAt));
}

export async function getCorretor(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(corretores).where(eq(corretores.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertCorretor(data: { id?: number; nome: string; cpfCnpj?: string; pix: string; comissaoTipo: string; comissaoValor: number; obs?: string }) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    nome: data.nome, cpfCnpj: data.cpfCnpj ?? null, pix: data.pix,
    comissaoTipo: data.comissaoTipo as any, comissaoValor: String(data.comissaoValor),
    obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(corretores).set(payload).where(eq(corretores.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(corretores).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteCorretor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(corretores).set({ ativo: false }).where(eq(corretores.id, id));
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
    banco: data.banco, agencia: data.agencia, conta: data.conta,
    favorecido: data.favorecido, docFavorecido: data.docFavorecido, pix: data.pix,
    reterFunrural: data.reterFunrural ?? true,
    reterFethab: data.reterFethab ?? true,
    reterIagro: data.reterIagro ?? false,
    reterSenar: data.reterSenar ?? false,
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
    destinoVenda: data.destinoVenda ?? 'interestadual',
    finalidadeVenda: data.finalidadeVenda ?? 'industria',
    regimeCompradora: data.regimeCompradora ?? 'lucro_real',
    icmsRegime: data.icmsRegime ?? 'diferimento',
    icmsAliq: String(data.icmsAliq ?? 0),
    icmsRedBase: String(data.icmsRedBase ?? 0),
    pisCofinsRegime: data.pisCofinsRegime ?? 'isento',
    pisAliq: String(data.pisAliq ?? 0),
    cofinsAliq: String(data.cofinsAliq ?? 0),
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
    custoClassTon: String(data.custoClassTon), corretorId: data.corretorId ?? null,
    obs: data.obs ?? null,
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

/** Embarques sem descarga lançada — filtra por ausência real de registro na tabela descargas
 *  (dupla garantia: status != Finalizada E não existe descarga vinculada)
 */
export async function listEmbarquesSemDescarga(operacaoId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Subquery: embarques que já têm descarga registrada
  const semDescarga = notExists(
    db.select({ id: descargas.embarqueId })
      .from(descargas)
      .where(eq(descargas.embarqueId, embarques.id))
  );
  const conditions: any[] = [semDescarga];
  if (operacaoId) conditions.push(eq(embarques.operacaoId, operacaoId));
  return db.select().from(embarques).where(and(...conditions)).orderBy(desc(embarques.dataEmbarque));
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
    ticketNumero: data.ticketNumero ?? null,
    ticketUrl: data.ticketUrl ?? null,
    dcUmidade: String(data.dcUmidade ?? 0), dcImp: String(data.dcImp ?? 0),
    dcAvar: String(data.dcAvar ?? 0), dcQueim: String(data.dcQueim ?? 1),
    obs: data.obs ?? null,
  };
  const existing = await getDescargaByEmbarque(data.embarqueId);
  if (existing) {
    await db.update(descargas).set(payload).where(eq(descargas.id, existing.id));
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
    formaPagamento: data.formaPagamento ?? 'pix',
    numeroBoleto: data.numeroBoleto ?? null,
    chavePix: data.chavePix ?? null,
    comprovanteUrl: data.comprovanteUrl ?? null,
    obs: data.obs ?? null,
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

// ─── Despesas Operacionais ──────────────────────────────────────────────────────────────
export async function listDespesas(operacaoId?: number) {
  const db = await getDb();
  if (!db) return [];
  return operacaoId
    ? db.select().from(despesasOperacionais).where(eq(despesasOperacionais.operacaoId, operacaoId)).orderBy(desc(despesasOperacionais.createdAt))
    : db.select().from(despesasOperacionais).orderBy(desc(despesasOperacionais.createdAt));
}

export async function upsertDespesa(data: {
  id?: number;
  operacaoId: number;
  categoria: string;
  favorecido: string;
  descricao?: string;
  valor: number;
  dataPagamento?: string | null;
  formaPagamento?: string;
  comprovanteUrl?: string | null;
  obs?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const payload = {
    operacaoId: data.operacaoId,
    categoria: data.categoria as any,
    favorecido: data.favorecido,
    descricao: data.descricao ?? null,
    valor: String(data.valor),
    dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
    formaPagamento: (data.formaPagamento ?? 'pix') as any,
    comprovanteUrl: data.comprovanteUrl ?? null,
    obs: data.obs ?? null,
  };
  if (data.id) {
    await db.update(despesasOperacionais).set(payload).where(eq(despesasOperacionais.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(despesasOperacionais).values(payload);
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteDespesa(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(despesasOperacionais).where(eq(despesasOperacionais.id, id));
}

export async function darBaixaDespesa(data: {
  id: number;
  dataBaixa: string;
  comprovanteUrl?: string | null;
  comprovanteTexto?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(despesasOperacionais).set({
    pago: true,
    dataBaixa: new Date(data.dataBaixa),
    comprovanteUrl: data.comprovanteUrl ?? null,
    comprovanteTexto: data.comprovanteTexto ?? null,
    updatedAt: new Date(),
  }).where(eq(despesasOperacionais.id, data.id));
}

/** Retorna saldo consolidado de despesas em aberto por favorecido+categoria para uma operação */
export async function saldoConsolidadoDespesas(operacaoId: number) {
  const db = await getDb();
  if (!db) return [];
  const todas = await db.select().from(despesasOperacionais)
    .where(eq(despesasOperacionais.operacaoId, operacaoId))
    .orderBy(despesasOperacionais.categoria, despesasOperacionais.favorecido);

  // Agrupa por favorecido+categoria
  const mapa = new Map<string, {
    chave: string;
    categoria: string;
    favorecido: string;
    totalLancado: number;
    totalPago: number;
    saldoAberto: number;
    ids: number[];
    idsAbertos: number[];
    ultimaData: string | null;
  }>();

  for (const d of todas) {
    const chave = `${d.categoria}::${d.favorecido.toLowerCase().trim()}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        categoria: d.categoria,
        favorecido: d.favorecido,
        totalLancado: 0,
        totalPago: 0,
        saldoAberto: 0,
        ids: [],
        idsAbertos: [],
        ultimaData: null,
      });
    }
    const grupo = mapa.get(chave)!;
    const valor = parseFloat(String(d.valor));
    grupo.totalLancado += valor;
    grupo.ids.push(d.id);
    if (d.pago) {
      grupo.totalPago += valor;
    } else {
      grupo.saldoAberto += valor;
      grupo.idsAbertos.push(d.id);
    }
    const dataBaixaStr = d.dataBaixa ? String(d.dataBaixa).slice(0, 10) : null;
    if (dataBaixaStr && (!grupo.ultimaData || dataBaixaStr > grupo.ultimaData)) {
      grupo.ultimaData = dataBaixaStr;
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.saldoAberto - a.saldoAberto);
}

/** Dá baixa consolidada em despesas em aberto de um grupo (favorecido+categoria).
 * Se valorComprovante for informado, aplica baixa parcial (marca despesas até cobrir o valor).
 * Se não informado, quita todas as despesas em aberto do grupo.
 */
export async function darBaixaConsolidada(data: {
  operacaoId: number;
  categoria: string;
  favorecido: string;
  dataBaixa: string;
  valorComprovante?: number;
  comprovanteUrl?: string | null;
  comprovanteTexto?: string | null;
}) {
  const db = await getDb();
  if (!db) return { baixadas: 0, totalBaixado: 0, saldoRemanescente: 0 };

  // Busca todas as despesas em aberto do grupo ordenadas por data de criação (FIFO)
  const abertas = await db.select().from(despesasOperacionais).where(
    and(
      eq(despesasOperacionais.operacaoId, data.operacaoId),
      eq(despesasOperacionais.categoria, data.categoria as any),
      eq(despesasOperacionais.pago, false),
    )
  );

  // Filtra pelo favorecido (normalizado)
  const normFav = data.favorecido.toLowerCase().trim();
  const doGrupo = abertas
    .filter(d => d.favorecido.toLowerCase().trim() === normFav)
    .sort((a, b) => Number(a.id) - Number(b.id)); // FIFO

  if (doGrupo.length === 0) return { baixadas: 0, totalBaixado: 0, saldoRemanescente: 0 };

  const saldoTotal = doGrupo.reduce((acc, d) => acc + parseFloat(String(d.valor)), 0);

  // Se valorComprovante não informado ou cobre tudo: quita todas
  if (!data.valorComprovante || data.valorComprovante >= saldoTotal * 0.999) {
    for (const d of doGrupo) {
      await db.update(despesasOperacionais).set({
        pago: true,
        dataBaixa: new Date(data.dataBaixa),
        comprovanteUrl: data.comprovanteUrl ?? null,
        comprovanteTexto: data.comprovanteTexto ?? null,
        updatedAt: new Date(),
      }).where(eq(despesasOperacionais.id, d.id));
    }
    return { baixadas: doGrupo.length, totalBaixado: saldoTotal, saldoRemanescente: 0 };
  }

  // Baixa parcial: marca despesas FIFO até cobrir valorComprovante
  let restante = data.valorComprovante;
  let baixadas = 0;
  let totalBaixado = 0;
  for (const d of doGrupo) {
    if (restante <= 0) break;
    const valor = parseFloat(String(d.valor));
    if (valor <= restante + 0.01) {
      // Quita esta despesa inteiramente
      await db.update(despesasOperacionais).set({
        pago: true,
        dataBaixa: new Date(data.dataBaixa),
        comprovanteUrl: data.comprovanteUrl ?? null,
        comprovanteTexto: data.comprovanteTexto ?? null,
        updatedAt: new Date(),
      }).where(eq(despesasOperacionais.id, d.id));
      restante -= valor;
      totalBaixado += valor;
      baixadas++;
    }
    // Despesa maior que o restante: não quita parcialmente (mantém em aberto)
  }

  return { baixadas, totalBaixado, saldoRemanescente: saldoTotal - totalBaixado };
}
