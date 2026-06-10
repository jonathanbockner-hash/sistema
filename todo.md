# TIME OPS — TODO

## Schema & Backend
- [x] Schema do banco: contratos_compra, contratos_venda, operacoes, classificadores, embarques, descargas, pagamentos, config
- [x] Migrations SQL aplicadas via webdev_execute_sql
- [x] Helpers de DB em server/db.ts
- [x] Routers tRPC: compras, vendas, operacoes, classificadores, embarques, descargas, pagamentos, config

## Frontend — Design System
- [x] Tema dark elegante com CSS variables (index.css)
- [x] Fonte Inter via Google Fonts
- [x] DashboardLayout com sidebar de navegação
- [x] Componentes reutilizáveis (KpiCard, DataTable, FormSection)

## Páginas
- [x] Dashboard com KPIs e tabela de embarques/descargas com filtros
- [x] Contratos de Compra (cadastro + listagem)
- [x] Contratos de Venda (cadastro + listagem)
- [x] Operações Vinculadas (cadastro + listagem)
- [x] Classificadores (cadastro + listagem)
- [x] Lançar Embarque (formulário + preview em tempo real)
- [x] Lançar Descarga (formulário + cálculo automático)
- [x] Pagamentos de Compra (registro + saldo a pagar)
- [x] Relatórios (compra, venda, consolidado, PDF, CSV)
- [x] Configurações Gerais (taxas FETHAB, IAGRO, SENAR, FUNRURAL, fundo, D+)

## Funcionalidades
- [x] Preview de cálculo em tempo real no embarque
- [x] Cálculo automático de quebra logística na descarga
- [x] Exportação PDF A4 paisagem
- [x] Exportação CSV
- [x] Dados bancários obrigatórios no contrato de compra
- [x] Chave PIX obrigatória no classificador
- [x] Filtros no dashboard (data, fornecedor, comprador, operação)

## Testes
- [x] Testes vitest: auth.logout, calcFinal, utilitários n() e brl()

## Melhorias v2
- [x] Análise tributária: corrigir cálculo FETHAB (R$/ton via UPF-MT), IAGRO (R$/ton via UPF-MT), SENAR (% sobre valor bruto), FUNRURAL (% sobre valor bruto)
- [x] Atualizar lib/calculos.ts com lógica tributária correta
- [x] Atualizar Configurações: separar campos UPF-MT, alíquotas FETHAB/IAGRO por produto, SENAR e FUNRURAL por tipo de produtor
- [x] Atualizar preview de embarque com tributos corretos
- [x] Upload de PDF de NF de entrada e NF de saída no embarque
- [x] Extração automática via LLM: data, placa, número NF, peso da NF de saída
- [x] Preencher campos automaticamente após leitura do PDF
- [x] Campos restantes (classificação) permanecem para preenchimento manual

## Melhorias v3
- [x] Schema: tabela corretores (nome, cpf, pix, custo por sc/ton/fixo)
- [x] Schema: campo retencaoTributos (boolean) em contratos_compra
- [x] Schema: campos tributação de venda (destinoVenda, finalidadeVenda, regimeTributario, icmsIsento, pisCofinsIsento) em contratos_venda
- [x] Schema: campo corretorId em operacoes
- [x] Schema: campo ticketUrl e ticketDados em descargas
- [x] Schema: campo comprovanteUrl e comprovanteDados em pagamentos
- [x] Migration SQL aplicada
- [x] Router tRPC: corretores (CRUD)
- [x] Router tRPC: nf.extrairTicket (leitura de ticket de descarga via LLM)
- [x] Router tRPC: nf.extrairComprovante (leitura de comprovante de pagamento via LLM)
- [x] Dashboard: KPIs expandidos (lucro bruto, custo operacional, comissão, lucro líquido)
- [x] Contrato de Compra: campo "Reter tributos?" com toggle e seleção individual (FUNRURAL, FETHAB, IAGRO, SENAR)
- [x] Contrato de Venda: campos de tributação por destino/finalidade com cálculo automático de PIS/COFINS e ICMS
- [x] Operações: geração automática de sigla e seleção de corretor
- [x] Módulo Corretor: página de cadastro igual ao Classificador
- [x] Lançamento Descarga: filtro por operação mostrando embarques em aberto, upload de ticket PDF/foto com leitura automática
- [x] Pagamentos: upload de comprovante com leitura automática de valor, data, forma, número e chave PIX
- [x] Relatório fiscal no modelo da imagem (tabela por NF, resumo financeiro, dados bancários, ajuste fiscal)
- [x] Testes atualizados

## Bugs v4
- [x] Bug: Lançamento de Descarga sem validação obrigatória dos campos (peso, classificação)
- [x] Bug: Leitura automática de PDF no Embarque não está funcionando
- [x] Bug: ICMS sendo calculado mesmo com diferimento selecionado no Contrato de Compra

## Bugs v5
- [x] Bug: Lançamento de Descarga — formulário inline não funciona corretamente, reescrever com modal/drawer

## Bugs críticos v6
- [x] Bug: Pagamento superior ao saldo não gera crédito com fornecedor no dashboard
- [x] Bug: Desconto de classificação aplicado mesmo dentro da tolerância do contrato
- [x] Bug: Relatório com peso balança errado, valor pago não exibido, descontos indevidos de classificação

## Auditoria completa v7
- [x] Bug: calcRetencoes ignora flags reterFunrural/reterFethab/reterIagro/reterSenar do contrato de compra
- [x] Bug: Operacoes.tsx tenta ler cl.custoTon que não existe no schema (campo fantasma) — deve usar valor manual
- [x] Bug: handleUploadComprovante em Pagamentos.tsx tem try/catch externo mas o async está no reader.onload (erros assíncronos não são capturados, uploadingComp pode ficar preso)
- [x] Bug: handleOpenSheet em Descargas.tsx usa descargaExistente stale (assíncrono) — dados existentes não preenchem o formulário ao abrir
- [x] Bug: Embarques.tsx permite salvar status "Finalizada" manualmente sem descarga, escondendo carga da tela de Descargas
- [x] Bug: Relatórios.tsx tem nome de empresa hardcoded "JD COMERCIO DE IMPORTACAO E EXPORTACAO LTDA" — deve ser "TIME Agri Business"
- [x] Bug: Saldo a pagar em Pagamentos.tsx usa Math.max(0, ...) escondendo crédito com fornecedor (inconsistente com Dashboard/Relatórios)
- [x] Bug: ContratosVenda.tsx não tem campo "outro" na finalidadeVenda mas o schema aceita — opção faltando no select
