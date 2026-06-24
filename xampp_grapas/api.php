<?php
// ==============================================================================
// API REST DE CONEXÃO E OPERAÇÕES DO BANCO DE DADOS (MYSQL / XAMPP)
// ==============================================================================

require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';
$table = $_GET['table'] ?? '';
$id = $_GET['id'] ?? '';

// Função para semear dados padrão caso o banco esteja vazio
function seedDefaultData($pdo) {
    // 1. Usuário Administrador Padrão
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM usuarios");
    $row = $stmt->fetch();
    if ($row['count'] == 0) {
        $admin = [
            'id' => 'admin-default',
            'name' => 'Administrador Geral',
            'login' => '00587945303',
            'password' => 'admin123',
            'role' => 'admin',
            'passwordChanged' => true,
            'passwordResetDone' => true
        ];
        $stmt = $pdo->prepare("INSERT INTO usuarios (id, data) VALUES (?, ?)");
        $stmt->execute(['admin-default', json_encode($admin, JSON_UNESCAPED_UNICODE)]);
    }

    // 2. Configurações da Homepage
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM config WHERE id = ?");
    $stmt->execute(['homepage']);
    $row = $stmt->fetch();
    if ($row['count'] == 0) {
        $homepage = [
            'header' => [
                'logoText' => 'GRAPAS',
                'fullName' => 'GR Assessoria e Planejamento de Projetos Agropecuários'
            ],
            'banner' => [
                'title' => 'Assistência técnica e extensão rural para a agricultura familiar.',
                'subtitle' => 'Apoiamos produtores rurais com soluções técnicas inovadoras, planejamento estratégico e gestão de projetos para fortalecer o campo.',
                'buttonProjectsText' => 'Nossos Projetos',
                'buttonContactText' => 'Fale com a gente',
                'backgroundImage' => 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'
            ],
            'empresa' => [
                'name' => 'GR ASSESSORIA E PLANEJAMENTO DE PROJETOS AGROPECUARIOS LTDA',
                'cnpj' => '24.230.134/0001-50',
                'address' => 'Rodovia Mário Covas, Coqueiro, Ananindeua - PA'
            ],
            'footer' => [
                'slogan' => 'Compromisso com o desenvolvimento rural e sustentável da região.',
                'email' => 'rosaligrapas@yahoo.com.br',
                'phone' => '(91) 99270-7555',
                'address' => 'Rua Rio Solimões, S/N, Quadra16, Casa 01, Parque Marajó - CEP: 68.473-000 – Novo Repartimento-PA'
            ],
            'news' => [
                [
                    'id' => 1,
                    'program' => 'BOLSA VERDE',
                    'title' => 'Equipe técnica da GR Assessoria e ICMBio realizam mutirão com agricultores familiares da comunidade São Domingos',
                    'image' => 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200&auto=format&fit=crop',
                    'date' => '22/04/2026',
                    'content' => "Em uma ação conjunta focada na sustentabilidade e no apoio ao produtor rural, a equipe técnica da GR Assessoria se uniu ao ICMBio para realizar um grande mutirão na comunidade de São Domingos. O evento reuniu dezenas de famílias e focou na regularização documental e orientação técnica para o programa Bolsa Verde. <br><br> Durante o mutirão, foram realizados atendimentos personalizados, esclarecimento de dúvidas sobre o manejo sustentável das áreas e a importância da preservação ambiental como fonte de renda. 'Essa parceria é fundamental para levar dignidade e conhecimento ao campo', afirmou um dos coordenadores técnicos presentes."
                ],
                [
                    'id' => 2,
                    'program' => 'FLORESTAS PRODUTIVAS',
                    'title' => 'Agricultores familiares da comunidade Resex Marinha de Soure são contemplados com o fomento mulher nesta última sexta-feira (17/04)',
                    'image' => 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=1200&auto=format&fit=crop',
                    'date' => '17/04/2026',
                    'content' => "A última sexta-feira foi de celebração para as mulheres agricultoras da Resex Marinha de Soure. Através do programa Florestas Produtivas, diversas produtoras receberam o Fomento Mulher, um recurso destinado a impulsionar pequenos empreendimentos rurais liderados por mulheres. <br><br> A GR Assessoria prestou todo o suporte técnico na elaboração dos projetos e continuará acompanhando a aplicação dos recursos para garantir que as metas produtivas sejam alcançadas, fortalecendo a economia local e o protagonismo feminino na região."
                ]
            ],
            'gallery' => [
                [
                    'program' => 'União Com Municípios',
                    'coverImage' => 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1464226184884-fa280b87c399',
                        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09',
                        'https://images.unsplash.com/photo-1434144893279-2a9fc14e9337'
                    ]
                ],
                [
                    'program' => 'Florestas Produtivas',
                    'coverImage' => 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1595841696662-5083d30b3565',
                        'https://images.unsplash.com/photo-1501183638710-841dd1904471',
                        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e'
                    ]
                ]
            ]
        ];
        $stmt = $pdo->prepare("INSERT INTO config (id, data) VALUES (?, ?)");
        $stmt->execute(['homepage', json_encode($homepage, JSON_UNESCAPED_UNICODE)]);
    }

    // 3. Informações de Identidade da Empresa
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM config WHERE id = ?");
    $stmt->execute(['empresa']);
    $row = $stmt->fetch();
    if ($row['count'] == 0) {
        $empresa = [
            'name' => 'GR ASSESSORIA E PLANEJAMENTO DE PROJETOS AGROPECUARIOS LTDA',
            'cnpj' => '24.230.134/0001-50',
            'address' => 'Rodovia Mário Covas, Coqueiro, Ananindeua - PA'
        ];
        $stmt = $pdo->prepare("INSERT INTO config (id, data) VALUES (?, ?)");
        $stmt->execute(['empresa', json_encode($empresa, JSON_UNESCAPED_UNICODE)]);
    }
}

seedDefaultData($pdo);

$valid_tables = [
    'config', 'usuarios', 'contratos', 'tecnicos', 'atividades', 
    'comunidades', 'producao', 'municipios', 'controle_datas', 'ufpas', 'rtas'
];

try {
    // 1. Obter todos os dados de uma única vez (Alta Performance para Polling)
    if ($action === 'get_all') {
        $response = [];
        foreach ($valid_tables as $vt) {
            $stmt = $pdo->query("SELECT id, data FROM `$vt`");
            $rows = $stmt->fetchAll();
            $response[$vt] = array_map(function($r) {
                $item = json_decode($r['data'], true);
                if (!isset($item['id'])) {
                    $item['id'] = $r['id'];
                }
                return $item;
            }, $rows);
        }
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!in_array($table, $valid_tables)) {
        throw new Exception('Tabela / Coleção inválida ou não suportada.');
    }

    // 2. Leitura (GET)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'get') {
            if ($id) {
                $stmt = $pdo->prepare("SELECT data FROM `$table` WHERE id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if ($row) {
                    echo $row['data'];
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Documento não encontrado.']);
                }
            } else {
                $stmt = $pdo->query("SELECT id, data FROM `$table`");
                $rows = $stmt->fetchAll();
                $items = array_map(function($r) {
                    $item = json_decode($r['data'], true);
                    if (!isset($item['id'])) {
                        $item['id'] = $r['id'];
                    }
                    return $item;
                }, $rows);
                echo json_encode($items, JSON_UNESCAPED_UNICODE);
            }
            exit;
        }
    }

    // 3. Escrita e Exclusão (POST)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = file_get_contents('php://input');
        $data = json_decode($body, true);

        if ($action !== 'delete' && !$data) {
            throw new Exception('Corpo da requisição inválido (JSON esperado).');
        }

        // SET (Inserir com ID específico ou substituir)
        if ($action === 'set') {
            if (!$id) {
                throw new Exception('ID do documento ausente para operação de SET.');
            }
            $data['id'] = $id;
            $stmt = $pdo->prepare("INSERT INTO `$table` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?");
            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            $stmt->execute([$id, $json, $json]);
            echo json_encode(['success' => true, 'id' => $id]);
            exit;
        }

        // ADD (Criar id aleatório e inserir)
        if ($action === 'add') {
            $generated_id = 'mysql_' . uniqid() . '_' . rand(100, 999);
            $data['id'] = $generated_id;
            $stmt = $pdo->prepare("INSERT INTO `$table` (id, data) VALUES (?, ?)");
            $stmt->execute([$generated_id, json_encode($data, JSON_UNESCAPED_UNICODE)]);
            echo json_encode(['success' => true, 'id' => $generated_id]);
            exit;
        }

        // UPDATE (Mesclar dados existentes com os novos)
        if ($action === 'update') {
            if (!$id) {
                throw new Exception('ID do documento ausente para operação de UPDATE.');
            }
            $stmt = $pdo->prepare("SELECT data FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            $existing = $row ? json_decode($row['data'], true) : [];
            $merged = array_merge($existing, $data);
            $merged['id'] = $id;

            $stmt = $pdo->prepare("INSERT INTO `$table` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?");
            $json = json_encode($merged, JSON_UNESCAPED_UNICODE);
            $stmt->execute([$id, $json, $json]);
            echo json_encode(['success' => true, 'id' => $id]);
            exit;
        }

        // DELETE (Remover documento)
        if ($action === 'delete') {
            if (!$id) {
                throw new Exception('ID do documento ausente para operação de DELETE.');
            }
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    throw new Exception('Ação não suportada.');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
