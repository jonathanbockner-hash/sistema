CREATE TABLE `classificadores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(20),
	`pix` varchar(255) NOT NULL,
	`obs` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classificadores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundoMes` decimal(10,4) NOT NULL DEFAULT '2.5',
	`dmais` int NOT NULL DEFAULT 2,
	`fethab` decimal(10,4) NOT NULL DEFAULT '2.0500',
	`iagro` decimal(10,4) NOT NULL DEFAULT '0.1415',
	`senar` decimal(10,4) NOT NULL DEFAULT '0.1765',
	`funrural` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contratos_compra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sigla` varchar(100) NOT NULL,
	`fornecedor` varchar(255) NOT NULL,
	`produto` varchar(100) NOT NULL,
	`qualidade` varchar(100) NOT NULL,
	`volumeKg` decimal(15,2) NOT NULL,
	`precoSc` decimal(10,4) NOT NULL,
	`banco` varchar(100) NOT NULL,
	`agencia` varchar(20) NOT NULL,
	`conta` varchar(30) NOT NULL,
	`favorecido` varchar(255) NOT NULL,
	`docFavorecido` varchar(20) NOT NULL,
	`pix` varchar(255) NOT NULL,
	`umidTol` decimal(8,4) NOT NULL DEFAULT '14.0000',
	`umidFat` decimal(8,4) NOT NULL DEFAULT '1.8000',
	`impTol` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`impFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`avarTol` decimal(8,4) NOT NULL DEFAULT '20.0000',
	`avarFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`queimTol` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`queimFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`obs` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contratos_compra_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contratos_venda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sigla` varchar(100) NOT NULL,
	`comprador` varchar(255) NOT NULL,
	`produto` varchar(100) NOT NULL,
	`qualidade` varchar(100) NOT NULL,
	`volumeKg` decimal(15,2) NOT NULL,
	`precoSc` decimal(10,4) NOT NULL,
	`umidTol` decimal(8,4) NOT NULL DEFAULT '14.0000',
	`umidFat` decimal(8,4) NOT NULL DEFAULT '1.8000',
	`impTol` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`impFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`avarTol` decimal(8,4) NOT NULL DEFAULT '40.0000',
	`avarFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`queimTol` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`queimFat` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`obs` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contratos_venda_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `descargas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`embarqueId` int NOT NULL,
	`dataDescarga` timestamp,
	`pesoDescarga` decimal(15,2) NOT NULL,
	`placa` varchar(20),
	`nfeSaida` varchar(100),
	`dcUmidade` decimal(8,4) DEFAULT '0.0000',
	`dcImp` decimal(8,4) DEFAULT '0.0000',
	`dcAvar` decimal(8,4) DEFAULT '0.0000',
	`dcQueim` decimal(8,4) DEFAULT '0.0000',
	`obs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `descargas_id` PRIMARY KEY(`id`),
	CONSTRAINT `descargas_embarqueId_unique` UNIQUE(`embarqueId`)
);
--> statement-breakpoint
CREATE TABLE `embarques` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operacaoId` int NOT NULL,
	`dataEmbarque` timestamp,
	`placa` varchar(20),
	`nfeEntrada` varchar(100),
	`nfeSaida` varchar(100),
	`pesoOrigem` decimal(15,2) NOT NULL,
	`status` enum('Em trânsito','Descarga pendente','Finalizada') NOT NULL DEFAULT 'Em trânsito',
	`umidade` decimal(8,4) DEFAULT '0.0000',
	`imp` decimal(8,4) DEFAULT '0.0000',
	`avar` decimal(8,4) DEFAULT '0.0000',
	`queim` decimal(8,4) DEFAULT '0.0000',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `embarques_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sigla` varchar(100) NOT NULL,
	`compraId` int NOT NULL,
	`vendaId` int NOT NULL,
	`freteTon` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`quebraTol` decimal(8,4) NOT NULL DEFAULT '0.2500',
	`diasDesagio` int NOT NULL DEFAULT 15,
	`comissaoValor` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`comissaoTipo` enum('sc','ton','fixo','percVenda') NOT NULL DEFAULT 'sc',
	`classificadorId` int,
	`custoClassTon` decimal(10,6) NOT NULL DEFAULT '0.017000',
	`obs` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`compraId` int NOT NULL,
	`dataPagamento` timestamp,
	`valor` decimal(15,2) NOT NULL,
	`banco` varchar(100),
	`comprovante` varchar(500),
	`obs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
