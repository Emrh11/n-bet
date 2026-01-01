<?php
// Hata raporlamayı açalım
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS desteği
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Config dosyasını dahil etmeye çalışalım
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    // Config yoksa veritabanı bağlantısı için fallback (Bu kısım sunucuda config.php olduğu için çalışmayabilir ama güvenlik için ekleyelim)
    // Aslında uzak sunucuda config.php kesin vardır.
}

// Global DB ve Auth fonksiyonlarını kullan
// Eğer setCorsHeaders fonksiyonu varsa çağıralım (yukarıda manuel yaptık ama config'dekini de çağıralım)
if (function_exists('setCorsHeaders')) {
    setCorsHeaders();
}

$method = $_SERVER['REQUEST_METHOD'];
$contentType = $_SERVER["CONTENT_TYPE"] ?? '';
$isJson = strpos($contentType, 'application/json') !== false;

// Body'yi al
if ($isJson) {
    $input = file_get_contents('php://input');
    $body = json_decode($input, true) ?? [];
} else {
    $body = $_POST;
}

// DB Bağlantısı
$db = null;
if (function_exists('getDB')) {
    $db = getDB();
} else {
    // Config.php yüklenemediyse veya fonksiyon yoksa hata
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed (config missing?)']);
    exit;
}

// Kullanıcı ID'sini alma fonksiyonu (JWT Secret olmadan payload okuma)
function getUserIdFromToken()
{
    global $userId;

    // 1. Config.php'den gelen
    if (!empty($userId)) {
        return $userId;
    }

    // 2. Header'dan oku
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            return $payload['user_id'] ?? $payload['id'] ?? null;
        }
    }

    return null;
}

// Auth Kontrolü
if (function_exists('requireAuth')) {
    requireAuth();
}
// requireAuth hata fırlatmazsa devam eder.

// User ID'yi al
$currentUserId = getUserIdFromToken();

if (!$currentUserId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - User ID not found']);
    exit;
}

switch ($method) {
    case 'GET':
        $stmt = $db->prepare("SELECT id, name, email, phone, username, role, avatar FROM nobet_personnel WHERE id = ?");
        $stmt->execute([$currentUserId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        // Avatar URL düzeltme
        if (!empty($user['avatar']) && !str_starts_with($user['avatar'], 'http')) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
            $host = $_SERVER['HTTP_HOST'];
            $user['avatar'] = "$protocol://$host/uploads/" . $user['avatar'];
        }

        header('Content-Type: application/json');
        echo json_encode($user);
        break;

    case 'POST':
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
        if (isset($body['avatar'])) {
            $fields[] = 'avatar = ?';
            $values[] = $body['avatar'];
        }

        // Dosya Yükleme
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            // Uploads klasörü api'nin bir üstünde varsayıyoruz
            $uploadDir = __DIR__ . '/../uploads/';

            // Klasör yoksa oluştur (izin hatası olabilir ama deneyelim)
            if (!file_exists($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }

            $fileInfo = pathinfo($_FILES['avatar']['name']);
            $ext = strtolower($fileInfo['extension']);
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

            if (in_array($ext, $allowed)) {
                $newFileName = 'avatar_' . $currentUserId . '_' . time() . '.' . $ext;
                $destPath = $uploadDir . $newFileName;

                if (move_uploaded_file($_FILES['avatar']['tmp_name'], $destPath)) {
                    $fields[] = 'avatar = ?';
                    $values[] = $newFileName;
                } else {
                    error_log("File upload failed: Destination $destPath not writable?");
                }
            }
        }

        if (empty($fields)) {
            header('Content-Type: application/json');
            echo json_encode(['message' => 'No changes made']);
            break;
        }

        $values[] = $currentUserId;
        $sql = "UPDATE nobet_personnel SET " . implode(', ', $fields) . " WHERE id = ?";

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute($values);

            // Güncel veriyi çek
            $stmt = $db->prepare("SELECT id, name, email, phone, username, role, avatar FROM nobet_personnel WHERE id = ?");
            $stmt->execute([$currentUserId]);
            $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!empty($updatedUser['avatar']) && !str_starts_with($updatedUser['avatar'], 'http')) {
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
                $host = $_SERVER['HTTP_HOST'];
                $updatedUser['avatar'] = "$protocol://$host/uploads/" . $updatedUser['avatar'];
            }

            header('Content-Type: application/json');
            echo json_encode($updatedUser);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database update failed: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
