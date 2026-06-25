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
    $stmt = $pdo->prepare("SELECT data FROM config WHERE id = ?");
    $stmt->execute(['homepage']);
    $row = $stmt->fetch();
    
    $needsUpdate = false;
    if (!$row) {
        $needsUpdate = true;
    } else {
        $existingData = json_decode($row['data'], true);
        if (!isset($existingData['gallery']) || count($existingData['gallery']) < 8) {
            $needsUpdate = true;
        }
    }

    if ($needsUpdate) {
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
                ],
                [
                    'id' => 3,
                    'program' => 'BOLSA VERDE',
                    'title' => 'Equipe técnica da GR Assessoria realiza a implantação de uma unidade demonstrativa de referência na comunidade Jaguarary, município de Belterra/PA',
                    'image' => 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=1200&auto=format&fit=crop',
                    'date' => '10/04/2026',
                    'content' => "A comunidade Jaguarary, em Belterra, agora conta com uma Unidade Demonstrativa (UD) de referência. Implantada pela equipe da GR Assessoria no âmbito do programa Bolsa Verde, a unidade visa servir como campo de aprendizado prático para agricultores da região. <br><br> Na UD, são aplicadas técnicas de agroecologia, manejo de solo e diversificação de culturas. O objetivo é mostrar que é possível produzir com eficiência mantendo a floresta em pé e os recursos naturais preservados para as futuras gerações."
                ],
                [
                    'id' => 4,
                    'program' => 'FLORESTAS PRODUTIVAS',
                    'title' => 'Agricultores familiares do PA Abril Vermelho são contemplados com o título dos seus lotes em evento promovido pelo INCRA e o município de Santa Bárbara do Pará',
                    'image' => 'https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?q=80&w=1200&auto=format&fit=crop',
                    'date' => '05/04/2026',
                    'content' => "A segurança jurídica chegou para as famílias do PA Abril Vermelho. Em um evento emocionante realizado em parceria com o INCRA e a prefeitura de Santa Bárbara do Pará, centenas de agricultores receberam os títulos definitivos de seus lotes. <br><br> A GR Assessoria atuou intensamente no georreferenciamento das áreas e na organização da documentação técnica necessária. 'O título da terra é o início de um novo ciclo de investimentos e tranquilidade para o agricultor', destacou a gerência da empresa durante a cerimônia."
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
                ],
                [
                    'program' => 'Bolsa Verde',
                    'coverImage' => 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2',
                        'https://images.unsplash.com/photo-1597433333333-31123d463d80',
                        'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc'
                    ]
                ],
                [
                    'program' => 'Produzir Brasil',
                    'coverImage' => 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9',
                        'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a',
                        'https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9'
                    ]
                ],
                [
                    'program' => 'Brasil Mais Cooperativo',
                    'coverImage' => 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1560493676-04071c5f467b',
                        'https://images.unsplash.com/photo-1454165833767-027eeed9b76a',
                        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f'
                    ]
                ],
                [
                    'program' => 'PDHC-Dom Hélder Câmara',
                    'coverImage' => 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1589923188900-85dae523342b',
                        'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
                        'https://images.unsplash.com/photo-1473448912268-2022ce9509d8'
                    ]
                ],
                [
                    'program' => 'PNCF-Crédito Fundiário',
                    'coverImage' => 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
                        'https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9',
                        'https://images.unsplash.com/photo-1542601032-348daefde07c'
                    ]
                ],
                [
                    'program' => 'Mais Gestão PA e MA',
                    'coverImage' => 'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=800&q=80',
                    'images' => [
                        'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5',
                        'https://images.unsplash.com/photo-1454166159281-175908ce80a1',
                        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4'
                    ]
                ]
            ]
        ];
        
        $stmt = $pdo->prepare("DELETE FROM config WHERE id = ?");
        $stmt->execute(['homepage']);
        
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
