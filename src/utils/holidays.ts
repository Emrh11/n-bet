// Türkiye Resmi Tatilleri (2025-2027)
// Bu liste PHP'deki resmi_tatiller dizisiyle aynı

export const RESMI_TATILLER: { [date: string]: string } = {
    // 2025
    '2025-01-01': 'Yılbaşı',
    '2025-03-30': 'Ramazan Bayramı Arifesi',
    '2025-03-31': 'Ramazan Bayramı 1. Gün',
    '2025-04-01': 'Ramazan Bayramı 2. Gün',
    '2025-04-02': 'Ramazan Bayramı 3. Gün',
    '2025-04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
    '2025-05-01': 'Emek ve Dayanışma Günü',
    '2025-05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
    '2025-06-06': 'Kurban Bayramı Arifesi',
    '2025-06-07': 'Kurban Bayramı 1. Gün',
    '2025-06-08': 'Kurban Bayramı 2. Gün',
    '2025-06-09': 'Kurban Bayramı 3. Gün',
    '2025-06-10': 'Kurban Bayramı 4. Gün',
    '2025-07-15': 'Demokrasi ve Millî Birlik Günü',
    '2025-08-30': 'Zafer Bayramı',
    '2025-10-29': 'Cumhuriyet Bayramı',

    // 2026
    '2026-01-01': 'Yılbaşı',
    '2026-03-19': 'Ramazan Bayramı Arifesi',
    '2026-03-20': 'Ramazan Bayramı 1. Gün',
    '2026-03-21': 'Ramazan Bayramı 2. Gün',
    '2026-03-22': 'Ramazan Bayramı 3. Gün',
    '2026-04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
    '2026-05-01': 'Emek ve Dayanışma Günü',
    '2026-05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
    '2026-05-27': 'Kurban Bayramı Arifesi',
    '2026-05-28': 'Kurban Bayramı 1. Gün',
    '2026-05-29': 'Kurban Bayramı 2. Gün',
    '2026-05-30': 'Kurban Bayramı 3. Gün',
    '2026-05-31': 'Kurban Bayramı 4. Gün',
    '2026-07-15': 'Demokrasi ve Millî Birlik Günü',
    '2026-08-30': 'Zafer Bayramı',
    '2026-10-29': 'Cumhuriyet Bayramı',

    // 2027
    '2027-01-01': 'Yılbaşı',
    '2027-03-08': 'Ramazan Bayramı Arifesi',
    '2027-03-09': 'Ramazan Bayramı 1. Gün',
    '2027-03-10': 'Ramazan Bayramı 2. Gün',
    '2027-03-11': 'Ramazan Bayramı 3. Gün',
    '2027-04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
    '2027-05-01': 'Emek ve Dayanışma Günü',
    '2027-05-16': 'Kurban Bayramı Arifesi',
    '2027-05-17': 'Kurban Bayramı 1. Gün',
    '2027-05-18': 'Kurban Bayramı 2. Gün',
    '2027-05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı ve Kurban Bayramı 3. Gün',
    '2027-05-20': 'Kurban Bayramı 4. Gün',
    '2027-07-15': 'Demokrasi ve Millî Birlik Günü',
    '2027-08-30': 'Zafer Bayramı',
    '2027-10-29': 'Cumhuriyet Bayramı',
};

// Arife günleri (yarım gün tatil - 12:00'dan sonra tatil)
export const ARIFE_GUNLERI: string[] = [
    '2025-03-30', '2025-06-06',
    '2026-03-19', '2026-05-27',
    '2027-03-08', '2027-05-16',
];

/**
 * Belirtilen tarihin resmi tatil olup olmadığını kontrol eder
 */
export const isResmiTatil = (dateStr: string): boolean => {
    return dateStr in RESMI_TATILLER;
};

/**
 * Belirtilen tarihin arife günü olup olmadığını kontrol eder
 */
export const isArifeGunu = (dateStr: string): boolean => {
    return ARIFE_GUNLERI.includes(dateStr);
};

/**
 * Belirtilen tarihin tatil adını döndürür
 */
export const getTatilAdi = (dateStr: string): string | null => {
    return RESMI_TATILLER[dateStr] || null;
};

/**
 * Yılbaşı arifesi kontrolü (31 Aralık)
 * NOT: PHP kodunda 31 Aralık normal gün olarak hesaplanıyor, arife olarak değil.
 * Bayram arifeleri (Ramazan/Kurban) yarım gün, ama Yılbaşı arifesi değil.
 */
export const isYilbasiArifesi = (_dateStr: string): boolean => {
    // PHP ile uyumlu olması için 31 Aralık'ı arife olarak saymıyoruz
    return false;
};
