<?php
/**
 * Login API
 * POST /api/login.php
 */

require_once __DIR__ . '/config.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $body = getJsonBody();
    $db = getDB();

    $loginUsername = $body['username'] ?? '';
    $loginPassword = $body['password'] ?? '';

    // Validate input
    if (empty($loginUsername) || empty($loginPassword)) {
        jsonResponse(['error' => 'Kullanıcı adı ve şifre gerekli'], 400);
    }

    // Find user by username
    $stmt = $db->prepare("SELECT * FROM nobet_personnel WHERE username = :username AND is_active = 1 LIMIT 1");
    $stmt->execute(['username' => $loginUsername]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Geçersiz kullanıcı adı veya şifre'], 401);
    }

    // Verify password
    if (!password_verify($loginPassword, $user['password_hash'])) {
        jsonResponse(['error' => 'Geçersiz kullanıcı adı veya şifre'], 401);
    }

    // Generate token using config.php's createJWT function
    $token = createJWT([
        'user_id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role']
    ]);

    // Remove password_hash from response
    unset($user['password_hash']);

    // Return success response
    jsonResponse([
        'success' => true,
        'token' => $token,
        'user' => $user
    ]);

} catch (Exception $e) {
    jsonResponse(['error' => 'Sunucu hatası: ' . $e->getMessage()], 500);
}
