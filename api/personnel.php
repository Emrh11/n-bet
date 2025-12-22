<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();
$id = $_GET['id'] ?? null;

$db = getDB();

switch ($method) {
    case 'GET':
        requireAuth();

        if ($id) {
            // Tek personel
            $stmt = $db->prepare("SELECT * FROM nobet_personnel WHERE id = ?");
            $stmt->execute([$id]);
            $personnel = $stmt->fetch();

            if (!$personnel) {
                jsonResponse(['error' => 'Personel bulunamadı'], 404);
            }

            unset($personnel['password_hash']);
            jsonResponse($personnel);
        } else {
            // Tüm personel - is_on_duty eklendi
            $stmt = $db->query("SELECT id, name, email, phone, username, role, shift_order, avatar, is_active, is_on_duty, created_at, updated_at FROM nobet_personnel ORDER BY shift_order ASC, name ASC");
            $personnel = $stmt->fetchAll();
            jsonResponse($personnel);
        }
        break;

    case 'POST':
        requireAdmin();

        $name = $body['name'] ?? '';
        $email = $body['email'] ?? '';
        $phone = $body['phone'] ?? '';
        $username = $body['username'] ?? '';
        $password = $body['password'] ?? '';
        $role = $body['role'] ?? 'user';
        $shiftOrder = $body['shiftOrder'] ?? 0;
        $isOnDuty = isset($body['isOnDuty']) ? ($body['isOnDuty'] ? 1 : 0) : 1;

        if (empty($name) || empty($email) || empty($username) || empty($password)) {
            jsonResponse(['error' => 'Ad, email, kullanıcı adı ve şifre gerekli'], 400);
        }

        // Kullanıcı adı veya email kontrolü
        $stmt = $db->prepare("SELECT id FROM nobet_personnel WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Bu kullanıcı adı veya email zaten kullanılıyor'], 400);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $db->prepare("INSERT INTO nobet_personnel (name, email, phone, username, password_hash, role, shift_order, is_on_duty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $phone, $username, $passwordHash, $role, $shiftOrder, $isOnDuty]);

        $newId = $db->lastInsertId();

        $stmt = $db->prepare("SELECT id, name, email, phone, username, role, shift_order, avatar, is_active, is_on_duty, created_at FROM nobet_personnel WHERE id = ?");
        $stmt->execute([$newId]);
        $personnel = $stmt->fetch();

        jsonResponse($personnel, 201);
        break;

    case 'PUT':
        requireAdmin();

        if (!$id) {
            jsonResponse(['error' => 'ID gerekli'], 400);
        }

        $fields = [];
        $values = [];

        if (isset($body['name'])) {
            $fields[] = 'name = ?';
            $values[] = $body['name'];
        }
        if (isset($body['email'])) {
            $fields[] = 'email = ?';
            $values[] = $body['email'];
        }
        if (isset($body['phone'])) {
            $fields[] = 'phone = ?';
            $values[] = $body['phone'];
        }
        if (isset($body['username'])) {
            $fields[] = 'username = ?';
            $values[] = $body['username'];
        }
        if (isset($body['password']) && !empty($body['password'])) {
            $fields[] = 'password_hash = ?';
            $values[] = password_hash($body['password'], PASSWORD_DEFAULT);
        }
        if (isset($body['role'])) {
            $fields[] = 'role = ?';
            $values[] = $body['role'];
        }
        if (isset($body['shiftOrder'])) {
            $fields[] = 'shift_order = ?';
            $values[] = $body['shiftOrder'];
        }
        if (isset($body['isActive'])) {
            $fields[] = 'is_active = ?';
            $values[] = $body['isActive'] ? 1 : 0;
        }
        if (isset($body['isOnDuty'])) {
            $fields[] = 'is_on_duty = ?';
            $values[] = $body['isOnDuty'] ? 1 : 0;
        }

        if (empty($fields)) {
            jsonResponse(['error' => 'Güncellenecek alan yok'], 400);
        }

        $values[] = $id;
        $sql = "UPDATE nobet_personnel SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        $stmt = $db->prepare("SELECT id, name, email, phone, username, role, shift_order, avatar, is_active, is_on_duty, created_at, updated_at FROM nobet_personnel WHERE id = ?");
        $stmt->execute([$id]);
        $personnel = $stmt->fetch();

        jsonResponse($personnel);
        break;

    case 'DELETE':
        requireAdmin();

        if (!$id) {
            jsonResponse(['error' => 'ID gerekli'], 400);
        }

        $stmt = $db->prepare("DELETE FROM nobet_personnel WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Personel silindi']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
