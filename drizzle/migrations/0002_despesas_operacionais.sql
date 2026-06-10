-- Migration: 0002_despesas_operacionais
-- Tabela criada manualmente via webdev_execute_sql; este arquivo sincroniza o drizzle/migrations com o estado real do banco.

CREATE TABLE IF NOT EXISTS `despesas_operacionais` (
  `id` int AUTO_INCREMENT NOT NULL,
  `operacao_id` int NOT NULL,
  `categoria` enum('comissao','fethab','iagro','senar','funrural','classificador','frete','outro') NOT NULL,
  `favorecido` varchar(255) NOT NULL,
  `descricao` varchar(500),
  `valor` decimal(14,2) NOT NULL,
  `data_pagamento` date,
  `forma_pagamento` enum('pix','ted','doc','boleto','cheque','outro'),
  `comprovante_url` varchar(1000),
  `obs` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `despesas_operacionais_id` PRIMARY KEY (`id`)
);
