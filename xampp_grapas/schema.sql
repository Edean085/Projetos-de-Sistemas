-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS - SISTEMA GRAPAS (MYSQL)
-- ==============================================================================
-- Caso queira criar e importar manualmente através do phpMyAdmin:
-- 1. Abra o phpMyAdmin (http://localhost/phpmyadmin)
-- 2. Clique em "Importar" (Import) e selecione este arquivo.
-- 3. Ou execute os comandos abaixo na aba "SQL".
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `grapas_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `grapas_db`;

-- Coleção de Configurações
CREATE TABLE IF NOT EXISTS `config` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Usuários
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Contratos
CREATE TABLE IF NOT EXISTS `contratos` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Técnicos
CREATE TABLE IF NOT EXISTS `tecnicos` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Atividades
CREATE TABLE IF NOT EXISTS `atividades` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Comunidades
CREATE TABLE IF NOT EXISTS `comunidades` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Produção Rural
CREATE TABLE IF NOT EXISTS `producao` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Municípios
CREATE TABLE IF NOT EXISTS `municipios` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de Controle de Datas de Atendimento
CREATE TABLE IF NOT EXISTS `controle_datas` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de UFPAs (Unidades Familiares de Produção Agrária)
CREATE TABLE IF NOT EXISTS `ufpas` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coleção de RTAs (Relatórios Técnicos de Atendimento)
CREATE TABLE IF NOT EXISTS `rtas` (
  `id` VARCHAR(100) NOT NULL,
  `data` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
