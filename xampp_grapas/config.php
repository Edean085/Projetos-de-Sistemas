<?php
// ==============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS - SISTEMA GRAPAS (XAMPP / MYSQL)
// ==============================================================================

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'grapas_db');

try {
    // Conecta ao MySQL
    $pdo = new PDO("mysql:host=" . DB_HOST . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Cria o banco de dados se não existir automaticamente
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Conecta à base de dados específica
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Criação dinâmica das tabelas necessárias para simular as coleções do Firestore
    $tables = [
        'config', 'usuarios', 'contratos', 'tecnicos', 'atividades', 
        'comunidades', 'producao', 'municipios', 'controle_datas', 'ufpas', 'rtas'
    ];

    foreach ($tables as $table) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `$table` (
            `id` VARCHAR(100) NOT NULL,
            `data` LONGTEXT NOT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    }

} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Erro na conexão ou inicialização do banco de dados MySQL: ' . $e->getMessage()
    ]);
    exit;
}
