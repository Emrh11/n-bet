<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$body = getJsonBody();
$id = $_GET['id'] ?? null;

$db = getDB();
$user = requireAuth();

// JWT'den gelen user bilgisinde user_id veya id olabilir
$userId = $user['user_id'] ?? $user['id'] ?? null;

// Helper function: Bildirim oluştur
function createNotification($db, $targetUserId, $title, $message, $type = 'system', $referenceId = null)
{
    $stmt = $db->prepare("INSERT INTO nobet_notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$targetUserId, $title, $message, $type, $referenceId]);
    return $db->lastInsertId();
}

// Helper function: Tüm adminlere bildirim gönder
function notifyAdmins($db, $title, $message, $type = 'system', $referenceId = null)
{
    $stmt = $db->query("SELECT id FROM nobet_personnel WHERE role = 'admin' AND is_active = 1");
    $admins = $stmt->fetchAll();

    foreach ($admins as $admin) {
        createNotification($db, $admin['id'], $title, $message, $type, $referenceId);
    }
}

switch ($method) {
    case 'GET':
        $sql = "SELECT e.*, 
                       r.name as requester_name,
                       t.name as target_name,
                       rs.date as requester_shift_date,
                       ts.date as target_shift_date,
                       rsd.name as requester_shift_name,
                       tsd.name as target_shift_name
                FROM nobet_shift_exchanges e
                LEFT JOIN nobet_personnel r ON e.requester_id = r.id
                LEFT JOIN nobet_personnel t ON e.target_id = t.id
                LEFT JOIN nobet_shifts rs ON e.requested_shift_id = rs.id
                LEFT JOIN nobet_shifts ts ON e.target_shift_id = ts.id
                LEFT JOIN nobet_shift_definitions rsd ON rs.shift_definition_id = rsd.id
                LEFT JOIN nobet_shift_definitions tsd ON ts.shift_definition_id = tsd.id";

        // Admin tüm talepleri görür, user sadece kendiyle ilgili olanları
        if ($user['role'] !== 'admin') {
            $sql .= " WHERE e.requester_id = ? OR e.target_id = ?";
            $params = [$userId, $userId];
        } else {
            $params = [];
        }

        $sql .= " ORDER BY e.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $exchanges = $stmt->fetchAll();

        jsonResponse($exchanges);
        break;

    case 'POST':
        $requestedShiftId = $body['requestedShiftId'] ?? 0;
        $targetId = $body['targetId'] ?? null;
        $targetShiftId = $body['targetShiftId'] ?? null;
        $exchangeType = $body['exchangeType'] ?? 'mutual';

        if (empty($requestedShiftId)) {
            jsonResponse(['error' => 'Talep edilen nöbet ID gerekli'], 400);
        }

        // Nöbetin bu kullanıcıya ait olduğunu kontrol et
        $stmt = $db->prepare("SELECT s.*, p.name as personnel_name FROM nobet_shifts s JOIN nobet_personnel p ON s.personnel_id = p.id WHERE s.id = ?");
        $stmt->execute([$requestedShiftId]);
        $requestedShift = $stmt->fetch();

        if (!$requestedShift) {
            jsonResponse(['error' => 'Nöbet bulunamadı'], 404);
        }

        // Herkes sadece kendi nöbetini değiştirme talebi oluşturabilir (admin dahil)
        if ($requestedShift['personnel_id'] != $userId) {
            jsonResponse([
                'error' => 'Bu nöbet size ait değil',
                'debug' => [
                    'shift_personnel_id' => $requestedShift['personnel_id'],
                    'user_id' => $userId,
                    'shift_id' => $requestedShiftId
                ]
            ], 403);
        }

        $stmt = $db->prepare("INSERT INTO nobet_shift_exchanges (requester_id, requested_shift_id, target_id, target_shift_id, exchange_type) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $requestedShiftId, $targetId, $targetShiftId, $exchangeType]);

        $newId = $db->lastInsertId();

        // Kullanıcı adlarını al
        $requesterName = $user['name'] ?? $user['username'] ?? 'Bir kullanıcı';
        $shiftDate = date('d.m.Y', strtotime($requestedShift['date']));

        // Hedef kişinin adını al
        $targetName = 'bilinmiyor';
        if ($targetId) {
            $stmt = $db->prepare("SELECT name FROM nobet_personnel WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetPerson = $stmt->fetch();
            $targetName = $targetPerson['name'] ?? 'bilinmiyor';
        }

        $notificationError = null;

        // Bildirimleri try-catch içinde çalıştır (tablo yoksa hata vermemesi için)
        try {
            // Hedef kişiye bildirim gönder
            if ($targetId) {
                createNotification(
                    $db,
                    $targetId,
                    'Yeni Nöbet Değişim Talebi',
                    "$requesterName size $shiftDate tarihli nöbeti için değişim talebi gönderdi.",
                    'exchange_request',
                    $newId
                );
            }

            // Adminlere bildirim gönder
            notifyAdmins(
                $db,
                'Yeni Nöbet Değişim Talebi',
                "$requesterName, $targetName ile $shiftDate tarihli nöbet değişimi talebi oluşturdu.",
                'exchange_request',
                $newId
            );
        } catch (Exception $e) {
            $notificationError = $e->getMessage();
            error_log("Notification error: " . $e->getMessage());
        } catch (PDOException $e) {
            $notificationError = $e->getMessage();
            error_log("Notification PDO error: " . $e->getMessage());
        }

        $stmt = $db->prepare("SELECT * FROM nobet_shift_exchanges WHERE id = ?");
        $stmt->execute([$newId]);

        $exchange = $stmt->fetch();
        $exchange['notification_error'] = $notificationError;

        jsonResponse($exchange, 201);
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID gerekli'], 400);
        }

        $action = $_GET['action'] ?? '';

        if ($action === 'approve' || $action === 'reject') {
            $stmt = $db->prepare("SELECT e.*, r.name as requester_name, t.name as target_name, rs.date as shift_date 
                                  FROM nobet_shift_exchanges e 
                                  LEFT JOIN nobet_personnel r ON e.requester_id = r.id 
                                  LEFT JOIN nobet_personnel t ON e.target_id = t.id
                                  LEFT JOIN nobet_shifts rs ON e.requested_shift_id = rs.id
                                  WHERE e.id = ?");
            $stmt->execute([$id]);
            $exchange = $stmt->fetch();

            if (!$exchange) {
                jsonResponse(['error' => 'Talep bulunamadı'], 404);
            }

            $shiftDate = $exchange['shift_date'] ? date('d.m.Y', strtotime($exchange['shift_date'])) : '';
            $rejectionReason = $body['rejectionReason'] ?? null;
            $currentStatus = $exchange['status'];

            // 3 Aşamalı Onay Sistemi:
            // pending -> target_approved (hedef onayı) -> approved (admin onayı)

            if ($action === 'reject') {
                // Her aşamada reddedilebilir (hedef kişi veya admin)
                if ($user['role'] !== 'admin' && $exchange['target_id'] != $userId) {
                    jsonResponse(['error' => 'Bu talebi reddetme yetkiniz yok'], 403);
                }

                $stmt = $db->prepare("UPDATE nobet_shift_exchanges SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?");
                $stmt->execute([$userId, $rejectionReason, $id]);

                $rejecterName = $user['name'] ?? $user['username'] ?? 'Bir kullanıcı';
                $reasonText = $rejectionReason ? " Sebep: $rejectionReason" : "";

                // Talep edene bildir
                createNotification(
                    $db,
                    $exchange['requester_id'],
                    'Değişim Talebiniz Reddedildi',
                    "$rejecterName, $shiftDate tarihli nöbet değişim talebinizi reddetti.$reasonText",
                    'exchange_rejected',
                    $id
                );

                jsonResponse(['message' => 'Talep reddedildi']);

            } else {
                // Onay işlemi

                if ($currentStatus === 'pending') {
                    // AŞAMA 1: Hedef kişi onaylamalı
                    if ($exchange['target_id'] != $userId) {
                        jsonResponse(['error' => 'Bu talep önce hedef kişi tarafından onaylanmalı'], 403);
                    }

                    $stmt = $db->prepare("UPDATE nobet_shift_exchanges SET status = 'target_approved' WHERE id = ?");
                    $stmt->execute([$id]);

                    $targetName = $user['name'] ?? $user['username'] ?? 'Hedef kişi';

                    // Talep edene bildir
                    createNotification(
                        $db,
                        $exchange['requester_id'],
                        'Değişim Talebiniz Onaylandı',
                        "$targetName, $shiftDate tarihli nöbet değişim talebinizi onayladı. Admin onayı bekleniyor.",
                        'exchange_approved',
                        $id
                    );

                    // Adminlere bildir
                    notifyAdmins(
                        $db,
                        'Nöbet Değişimi Onay Bekliyor',
                        "{$exchange['requester_name']} ile {$exchange['target_name']} arasındaki $shiftDate tarihli nöbet değişimi onayınızı bekliyor.",
                        'exchange_request',
                        $id
                    );

                    jsonResponse(['message' => 'Talep onaylandı, admin onayı bekleniyor', 'status' => 'target_approved']);

                } else if ($currentStatus === 'target_approved') {
                    // AŞAMA 2: Admin son onayı vermeli
                    if ($user['role'] !== 'admin') {
                        jsonResponse(['error' => 'Son onay sadece admin tarafından verilebilir'], 403);
                    }

                    $stmt = $db->prepare("UPDATE nobet_shift_exchanges SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?");
                    $stmt->execute([$userId, $id]);

                    // Her iki kişiye bildir
                    createNotification(
                        $db,
                        $exchange['requester_id'],
                        'Nöbet Değişimi Tamamlandı',
                        "$shiftDate tarihli nöbet değişimi admin tarafından onaylandı ve uygulandı.",
                        'exchange_approved',
                        $id
                    );

                    createNotification(
                        $db,
                        $exchange['target_id'],
                        'Nöbet Değişimi Tamamlandı',
                        "$shiftDate tarihli nöbet değişimi admin tarafından onaylandı ve uygulandı.",
                        'exchange_approved',
                        $id
                    );

                    // Nöbetleri değiştir
                    if ($exchange['target_shift_id']) {
                        $stmt = $db->prepare("SELECT * FROM nobet_shifts WHERE id = ?");
                        $stmt->execute([$exchange['requested_shift_id']]);
                        $requesterShift = $stmt->fetch();

                        $stmt->execute([$exchange['target_shift_id']]);
                        $targetShift = $stmt->fetch();

                        if ($requesterShift && $targetShift) {
                            $stmt = $db->prepare("SELECT id FROM nobet_shift_definitions WHERE short_name = 'NE' LIMIT 1");
                            $stmt->execute();
                            $postShiftDef = $stmt->fetch();
                            $postShiftDefId = $postShiftDef ? $postShiftDef['id'] : null;

                            $requesterNextDay = date('Y-m-d', strtotime($requesterShift['date'] . ' +1 day'));
                            $targetNextDay = date('Y-m-d', strtotime($targetShift['date'] . ' +1 day'));

                            $stmt = $db->prepare("DELETE FROM nobet_shifts WHERE personnel_id = ? AND date = ? AND shift_type = 'post-shift'");
                            $stmt->execute([$requesterShift['personnel_id'], $requesterNextDay]);
                            $stmt->execute([$targetShift['personnel_id'], $targetNextDay]);

                            $stmt = $db->prepare("UPDATE nobet_shifts SET personnel_id = ?, is_exchanged = 1 WHERE id = ?");
                            $stmt->execute([$exchange['target_id'], $exchange['requested_shift_id']]);
                            $stmt->execute([$exchange['requester_id'], $exchange['target_shift_id']]);

                            if ($postShiftDefId) {
                                $stmt = $db->prepare("DELETE FROM nobet_shifts WHERE personnel_id = ? AND date = ?");
                                $stmt->execute([$exchange['target_id'], $requesterNextDay]);
                                $stmt->execute([$exchange['requester_id'], $targetNextDay]);

                                $stmt = $db->prepare("INSERT INTO nobet_shifts (personnel_id, date, shift_type, shift_definition_id, status) VALUES (?, ?, 'post-shift', ?, 'scheduled')");
                                $stmt->execute([$exchange['target_id'], $requesterNextDay, $postShiftDefId]);
                                $stmt->execute([$exchange['requester_id'], $targetNextDay, $postShiftDefId]);
                            }
                        }
                    }

                    jsonResponse(['message' => 'Talep onaylandı ve nöbetler değiştirildi', 'status' => 'approved']);

                } else {
                    jsonResponse(['error' => 'Bu talep zaten işlenmiş'], 400);
                }
            }
        } else {
            jsonResponse(['error' => 'Geçersiz action'], 400);
        }
        break;


    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'ID gerekli'], 400);
        }

        // Sadece kendi talebini silebilir veya admin
        $stmt = $db->prepare("SELECT * FROM nobet_shift_exchanges WHERE id = ?");
        $stmt->execute([$id]);
        $exchange = $stmt->fetch();

        if (!$exchange) {
            jsonResponse(['error' => 'Talep bulunamadı'], 404);
        }

        if ($user['role'] !== 'admin' && $exchange['requester_id'] != $userId) {
            jsonResponse(['error' => 'Bu talebi silme yetkiniz yok'], 403);
        }

        $stmt = $db->prepare("DELETE FROM nobet_shift_exchanges WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['message' => 'Talep silindi']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
