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
