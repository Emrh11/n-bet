<?php
/**
 * Resmi Tatiller API
 * 
 * GET /holidays.php - Tüm tatilleri listele
 * GET /holidays.php?year=2025 - Belirli yılın tatillerini listele
 * GET /holidays.php?date=2025-01-01 - Belirli tarihin tatil olup olmadığını kontrol et
 * POST /holidays.php - Yeni tatil ekle (admin)
 * PUT /holidays.php - Tatil güncelle (admin)
 * DELETE /holidays.php?id=1 - Tatil sil (admin)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../api/db.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Belirli bir tarihi kontrol et
            if (isset($_GET['date'])) {
                $date = $_GET['date'];
                $stmt = $pdo->prepare("SELECT * FROM resmi_tatiller WHERE tarih = ? AND aktif = 1");
                $stmt->execute([$date]);
                $holiday = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'isHoliday' => $holiday !== false,
                    'holiday' => $holiday ?: null
                ]);
            }
            // Belirli bir yılın tatillerini getir
            elseif (isset($_GET['year'])) {
                $year = intval($_GET['year']);
                $stmt = $pdo->prepare("SELECT * FROM resmi_tatiller WHERE YEAR(tarih) = ? AND aktif = 1 ORDER BY tarih");
                $stmt->execute([$year]);
                $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'year' => $year,
                    'holidays' => $holidays
                ]);
            }
            // Tarih aralığı
            elseif (isset($_GET['start']) && isset($_GET['end'])) {
                $start = $_GET['start'];
                $end = $_GET['end'];
                $stmt = $pdo->prepare("SELECT * FROM resmi_tatiller WHERE tarih BETWEEN ? AND ? AND aktif = 1 ORDER BY tarih");
                $stmt->execute([$start, $end]);
                $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Map olarak döndür (frontend için kolay kullanım)
                $holidayMap = [];
                foreach ($holidays as $h) {
                    $holidayMap[$h['tarih']] = [
                        'adi' => $h['adi'],
                        'tip' => $h['tip']
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'holidays' => $holidayMap
                ]);
            }
            // Tüm tatilleri getir
            else {
                $stmt = $pdo->query("SELECT * FROM resmi_tatiller WHERE aktif = 1 ORDER BY tarih");
                $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'holidays' => $holidays
                ]);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['tarih']) || !isset($data['adi'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Tarih ve ad zorunludur']);
                exit;
            }

            $tip = $data['tip'] ?? 'tam_gun';

            $stmt = $pdo->prepare("INSERT INTO resmi_tatiller (tarih, adi, tip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE adi = VALUES(adi), tip = VALUES(tip)");
            $stmt->execute([$data['tarih'], $data['adi'], $tip]);

            echo json_encode([
                'success' => true,
                'message' => 'Tatil eklendi',
                'id' => $pdo->lastInsertId()
            ]);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID zorunludur']);
                exit;
            }

            $updates = [];
            $params = [];

            if (isset($data['tarih'])) {
                $updates[] = 'tarih = ?';
                $params[] = $data['tarih'];
            }
            if (isset($data['adi'])) {
                $updates[] = 'adi = ?';
                $params[] = $data['adi'];
            }
            if (isset($data['tip'])) {
                $updates[] = 'tip = ?';
                $params[] = $data['tip'];
            }
            if (isset($data['aktif'])) {
                $updates[] = 'aktif = ?';
                $params[] = $data['aktif'] ? 1 : 0;
            }

            $params[] = $data['id'];

            $stmt = $pdo->prepare("UPDATE resmi_tatiller SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message' => 'Tatil güncellendi'
            ]);
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID zorunludur']);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE resmi_tatiller SET aktif = 0 WHERE id = ?");
            $stmt->execute([$_GET['id']]);

            echo json_encode([
                'success' => true,
                'message' => 'Tatil silindi'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Geçersiz method']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Veritabanı hatası: ' . $e->getMessage()
    ]);
}
