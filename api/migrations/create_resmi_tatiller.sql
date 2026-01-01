-- Resmi Tatiller Tablosu
-- Bu tablo Türkiye resmi tatillerini saklar ve hakediş hesaplamalarında kullanılır

CREATE TABLE IF NOT EXISTS resmi_tatiller (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarih DATE NOT NULL UNIQUE,
    adi VARCHAR(100) NOT NULL,
    tip ENUM('tam_gun', 'yarim_gun') DEFAULT 'tam_gun',
    aktif TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tarih (tarih),
    INDEX idx_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2025 Resmi Tatilleri
INSERT INTO resmi_tatiller (tarih, adi, tip) VALUES
('2025-01-01', 'Yılbaşı', 'tam_gun'),
('2025-03-30', 'Ramazan Bayramı Arifesi', 'yarim_gun'),
('2025-03-31', 'Ramazan Bayramı 1. Gün', 'tam_gun'),
('2025-04-01', 'Ramazan Bayramı 2. Gün', 'tam_gun'),
('2025-04-02', 'Ramazan Bayramı 3. Gün', 'tam_gun'),
('2025-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', 'tam_gun'),
('2025-05-01', 'Emek ve Dayanışma Günü', 'tam_gun'),
('2025-05-19', 'Atatürk''ü Anma, Gençlik ve Spor Bayramı', 'tam_gun'),
('2025-06-06', 'Kurban Bayramı Arifesi', 'yarim_gun'),
('2025-06-07', 'Kurban Bayramı 1. Gün', 'tam_gun'),
('2025-06-08', 'Kurban Bayramı 2. Gün', 'tam_gun'),
('2025-06-09', 'Kurban Bayramı 3. Gün', 'tam_gun'),
('2025-06-10', 'Kurban Bayramı 4. Gün', 'tam_gun'),
('2025-07-15', 'Demokrasi ve Millî Birlik Günü', 'tam_gun'),
('2025-08-30', 'Zafer Bayramı', 'tam_gun'),
('2025-10-29', 'Cumhuriyet Bayramı', 'tam_gun'),
('2025-12-31', 'Yılbaşı Arifesi', 'yarim_gun')
ON DUPLICATE KEY UPDATE adi = VALUES(adi), tip = VALUES(tip);

-- 2026 Resmi Tatilleri
INSERT INTO resmi_tatiller (tarih, adi, tip) VALUES
('2026-01-01', 'Yılbaşı', 'tam_gun'),
('2026-03-19', 'Ramazan Bayramı Arifesi', 'yarim_gun'),
('2026-03-20', 'Ramazan Bayramı 1. Gün', 'tam_gun'),
('2026-03-21', 'Ramazan Bayramı 2. Gün', 'tam_gun'),
('2026-03-22', 'Ramazan Bayramı 3. Gün', 'tam_gun'),
('2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', 'tam_gun'),
('2026-05-01', 'Emek ve Dayanışma Günü', 'tam_gun'),
('2026-05-19', 'Atatürk''ü Anma, Gençlik ve Spor Bayramı', 'tam_gun'),
('2026-05-27', 'Kurban Bayramı Arifesi', 'yarim_gun'),
('2026-05-28', 'Kurban Bayramı 1. Gün', 'tam_gun'),
('2026-05-29', 'Kurban Bayramı 2. Gün', 'tam_gun'),
('2026-05-30', 'Kurban Bayramı 3. Gün', 'tam_gun'),
('2026-05-31', 'Kurban Bayramı 4. Gün', 'tam_gun'),
('2026-07-15', 'Demokrasi ve Millî Birlik Günü', 'tam_gun'),
('2026-08-30', 'Zafer Bayramı', 'tam_gun'),
('2026-10-29', 'Cumhuriyet Bayramı', 'tam_gun'),
('2026-12-31', 'Yılbaşı Arifesi', 'yarim_gun')
ON DUPLICATE KEY UPDATE adi = VALUES(adi), tip = VALUES(tip);

-- 2027 Resmi Tatilleri
INSERT INTO resmi_tatiller (tarih, adi, tip) VALUES
('2027-01-01', 'Yılbaşı', 'tam_gun'),
('2027-03-08', 'Ramazan Bayramı Arifesi', 'yarim_gun'),
('2027-03-09', 'Ramazan Bayramı 1. Gün', 'tam_gun'),
('2027-03-10', 'Ramazan Bayramı 2. Gün', 'tam_gun'),
('2027-03-11', 'Ramazan Bayramı 3. Gün', 'tam_gun'),
('2027-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', 'tam_gun'),
('2027-05-01', 'Emek ve Dayanışma Günü', 'tam_gun'),
('2027-05-16', 'Kurban Bayramı Arifesi', 'yarim_gun'),
('2027-05-17', 'Kurban Bayramı 1. Gün', 'tam_gun'),
('2027-05-18', 'Kurban Bayramı 2. Gün', 'tam_gun'),
('2027-05-19', 'Atatürk''ü Anma, Gençlik ve Spor Bayramı ve Kurban Bayramı 3. Gün', 'tam_gun'),
('2027-05-20', 'Kurban Bayramı 4. Gün', 'tam_gun'),
('2027-07-15', 'Demokrasi ve Millî Birlik Günü', 'tam_gun'),
('2027-08-30', 'Zafer Bayramı', 'tam_gun'),
('2027-10-29', 'Cumhuriyet Bayramı', 'tam_gun'),
('2027-12-31', 'Yılbaşı Arifesi', 'yarim_gun')
ON DUPLICATE KEY UPDATE adi = VALUES(adi), tip = VALUES(tip);
