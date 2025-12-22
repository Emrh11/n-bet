<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

$db = getDB();
$user = requireAuth();

// JWT'den gelen user bilgisinde user_id veya id olabilir
$userId = $user['user_id'] ?? $user['id'] ?? null;

switch ($method) {
    case 'GET':
        // Kullanıcının bildirimlerini getir
        $unreadOnly = $_GET['unread'] ?? false;

        $sql = "SELECT * FROM nobet_notifications WHERE user_id = ?";
        $params = [$userId];

        if ($unreadOnly) {
            $sql .= " AND is_read = 0";
        }

        $sql .= " ORDER BY created_at DESC LIMIT 50";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $notifications = $stmt->fetchAll();

        // Okunmamış sayısını da döndür
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM nobet_notifications WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$userId]);
        $unreadCount = $stmt->fetch()['count'];

        jsonResponse([
            'notifications' => $notifications,
            'unread_count' => (int) $unreadCount
        ]);
        break;

    case 'POST':
        // Admin veya sistem bildirimi oluşturabilir
        if ($user['role'] !== 'admin' && !isset($body['_internal'])) {
            jsonResponse(['error' => 'Yetkiniz yok'], 403);
        }

        $userId = $body['userId'] ?? null;
        $title = $body['title'] ?? '';
        $message = $body['message'] ?? '';
        $type = $body['type'] ?? 'system';
        $referenceId = $body['referenceId'] ?? null;

        // Tek kullanıcıya veya tüm kullanıcılara gönder
        if ($userId === 'all') {
            // Tüm aktif personele gönder
            $stmt = $db->query("SELECT id FROM nobet_personnel WHERE is_active = 1");
            $users = $stmt->fetchAll();

            $insertStmt = $db->prepare("INSERT INTO nobet_notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)");

            foreach ($users as $u) {
                $insertStmt->execute([$u['id'], $title, $message, $type, $referenceId]);
            }

            jsonResponse(['message' => count($users) . ' kullanıcıya bildirim gönderildi'], 201);
        } else if ($userId) {
            $stmt = $db->prepare("INSERT INTO nobet_notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $title, $message, $type, $referenceId]);

            jsonResponse(['message' => 'Bildirim gönderildi', 'id' => $db->lastInsertId()], 201);
        } else {
            jsonResponse(['error' => 'userId gerekli'], 400);
        }
        break;

    case 'PUT':
        if ($action === 'mark-read') {
            if ($id) {
                // Tek bildirimi okundu işaretle
                $stmt = $db->prepare("UPDATE nobet_notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
                $stmt->execute([$id, $userId]);
            } else {
                // Tüm bildirimleri okundu işaretle
                $stmt = $db->prepare("UPDATE nobet_notifications SET is_read = 1 WHERE user_id = ?");
                $stmt->execute([$userId]);
            }
            jsonResponse(['message' => 'Bildirimler okundu işaretlendi']);
        } else {
            jsonResponse(['error' => 'Geçersiz action'], 400);
        }
        break;

    case 'DELETE':
        if ($id) {
            // Tek bildirimi sil
            $stmt = $db->prepare("DELETE FROM nobet_notifications WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            jsonResponse(['message' => 'Bildirim silindi']);
        } else if ($action === 'clear-all') {
            // Tüm bildirimleri sil
            $stmt = $db->prepare("DELETE FROM nobet_notifications WHERE user_id = ?");
            $stmt->execute([$userId]);
            jsonResponse(['message' => 'Tüm bildirimler silindi']);
        } else {
            jsonResponse(['error' => 'ID veya action gerekli'], 400);
        }
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

// Helper function: Bildirim oluştur (diğer API'lerden çağrılabilir)
function createNotification($db, $userId, $title, $message, $type = 'system', $referenceId = null)
{
    $stmt = $db->prepare("INSERT INTO nobet_notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $title, $message, $type, $referenceId]);
    return $db->lastInsertId();
}

// Helper function: Tüm kullanıcılara bildirim gönder
function notifyAllUsers($db, $title, $message, $type = 'system', $referenceId = null)
{
    $stmt = $db->query("SELECT id FROM nobet_personnel WHERE is_active = 1");
    $users = $stmt->fetchAll();

    $insertStmt = $db->prepare("INSERT INTO nobet_notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)");

    foreach ($users as $u) {
        $insertStmt->execute([$u['id'], $title, $message, $type, $referenceId]);
    }

    return count($users);
}
