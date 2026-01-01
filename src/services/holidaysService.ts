import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

export interface Holiday {
    id: number;
    tarih: string;
    adi: string;
    tip: 'tam_gun' | 'yarim_gun';
    aktif: number;
}

export interface HolidayMap {
    [date: string]: {
        adi: string;
        tip: 'tam_gun' | 'yarim_gun';
    };
}

// Cache mekanizması - her ay için tatilleri tekrar çekmemek için
let holidayCache: HolidayMap = {};
let cacheKey: string = '';

/**
 * Belirli bir tarih aralığındaki tatilleri getirir
 */
export const fetchHolidays = async (startDate: string, endDate: string): Promise<HolidayMap> => {
    const key = `${startDate}_${endDate}`;

    // Cache kontrolü
    if (cacheKey === key && Object.keys(holidayCache).length > 0) {
        return holidayCache;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/holidays.php`, {
            params: { start: startDate, end: endDate }
        });

        if (response.data.success) {
            holidayCache = response.data.holidays;
            cacheKey = key;
            return holidayCache;
        }

        return {};
    } catch (error) {
        console.error('Tatiller yüklenirken hata:', error);
        // API hatası durumunda fallback olarak hardcoded listeyi kullan
        return getFallbackHolidays();
    }
};

/**
 * Belirli bir tarihin tatil olup olmadığını kontrol eder
 */
export const checkHoliday = async (date: string): Promise<{ isHoliday: boolean; holiday: Holiday | null }> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/holidays.php`, {
            params: { date }
        });

        return {
            isHoliday: response.data.isHoliday,
            holiday: response.data.holiday
        };
    } catch (error) {
        console.error('Tatil kontrolünde hata:', error);
        // Fallback
        const fallback = getFallbackHolidays();
        if (fallback[date]) {
            return {
                isHoliday: true,
                holiday: {
                    id: 0,
                    tarih: date,
                    adi: fallback[date].adi,
                    tip: fallback[date].tip,
                    aktif: 1
                }
            };
        }
        return { isHoliday: false, holiday: null };
    }
};

/**
 * Yeni tatil ekler (admin)
 */
export const addHoliday = async (tarih: string, adi: string, tip: 'tam_gun' | 'yarim_gun' = 'tam_gun'): Promise<boolean> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/holidays.php`, {
            tarih,
            adi,
            tip
        });

        // Cache'i temizle
        holidayCache = {};
        cacheKey = '';

        return response.data.success;
    } catch (error) {
        console.error('Tatil eklenirken hata:', error);
        return false;
    }
};

/**
 * Tatil günceller (admin)
 */
export const updateHoliday = async (id: number, data: Partial<Holiday>): Promise<boolean> => {
    try {
        const response = await axios.put(`${API_BASE_URL}/holidays.php`, {
            id,
            ...data
        });

        // Cache'i temizle
        holidayCache = {};
        cacheKey = '';

        return response.data.success;
    } catch (error) {
        console.error('Tatil güncellenirken hata:', error);
        return false;
    }
};

/**
 * Tatil siler (admin)
 */
export const deleteHoliday = async (id: number): Promise<boolean> => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/holidays.php?id=${id}`);

        // Cache'i temizle
        holidayCache = {};
        cacheKey = '';

        return response.data.success;
    } catch (error) {
        console.error('Tatil silinirken hata:', error);
        return false;
    }
};

/**
 * API çalışmadığında kullanılacak fallback tatil listesi
 */
const getFallbackHolidays = (): HolidayMap => {
    return {
        // 2025
        '2025-01-01': { adi: 'Yılbaşı', tip: 'tam_gun' },
        '2025-03-30': { adi: 'Ramazan Bayramı Arifesi', tip: 'yarim_gun' },
        '2025-03-31': { adi: 'Ramazan Bayramı 1. Gün', tip: 'tam_gun' },
        '2025-04-01': { adi: 'Ramazan Bayramı 2. Gün', tip: 'tam_gun' },
        '2025-04-02': { adi: 'Ramazan Bayramı 3. Gün', tip: 'tam_gun' },
        '2025-04-23': { adi: 'Ulusal Egemenlik ve Çocuk Bayramı', tip: 'tam_gun' },
        '2025-05-01': { adi: 'Emek ve Dayanışma Günü', tip: 'tam_gun' },
        '2025-05-19': { adi: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', tip: 'tam_gun' },
        '2025-06-06': { adi: 'Kurban Bayramı Arifesi', tip: 'yarim_gun' },
        '2025-06-07': { adi: 'Kurban Bayramı 1. Gün', tip: 'tam_gun' },
        '2025-06-08': { adi: 'Kurban Bayramı 2. Gün', tip: 'tam_gun' },
        '2025-06-09': { adi: 'Kurban Bayramı 3. Gün', tip: 'tam_gun' },
        '2025-06-10': { adi: 'Kurban Bayramı 4. Gün', tip: 'tam_gun' },
        '2025-07-15': { adi: 'Demokrasi ve Millî Birlik Günü', tip: 'tam_gun' },
        '2025-08-30': { adi: 'Zafer Bayramı', tip: 'tam_gun' },
        '2025-10-29': { adi: 'Cumhuriyet Bayramı', tip: 'tam_gun' },
        '2025-12-31': { adi: 'Yılbaşı Arifesi', tip: 'yarim_gun' },

        // 2026
        '2026-01-01': { adi: 'Yılbaşı', tip: 'tam_gun' },
        '2026-03-19': { adi: 'Ramazan Bayramı Arifesi', tip: 'yarim_gun' },
        '2026-03-20': { adi: 'Ramazan Bayramı 1. Gün', tip: 'tam_gun' },
        '2026-03-21': { adi: 'Ramazan Bayramı 2. Gün', tip: 'tam_gun' },
        '2026-03-22': { adi: 'Ramazan Bayramı 3. Gün', tip: 'tam_gun' },
        '2026-04-23': { adi: 'Ulusal Egemenlik ve Çocuk Bayramı', tip: 'tam_gun' },
        '2026-05-01': { adi: 'Emek ve Dayanışma Günü', tip: 'tam_gun' },
        '2026-05-19': { adi: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', tip: 'tam_gun' },
        '2026-05-27': { adi: 'Kurban Bayramı Arifesi', tip: 'yarim_gun' },
        '2026-05-28': { adi: 'Kurban Bayramı 1. Gün', tip: 'tam_gun' },
        '2026-05-29': { adi: 'Kurban Bayramı 2. Gün', tip: 'tam_gun' },
        '2026-05-30': { adi: 'Kurban Bayramı 3. Gün', tip: 'tam_gun' },
        '2026-05-31': { adi: 'Kurban Bayramı 4. Gün', tip: 'tam_gun' },
        '2026-07-15': { adi: 'Demokrasi ve Millî Birlik Günü', tip: 'tam_gun' },
        '2026-08-30': { adi: 'Zafer Bayramı', tip: 'tam_gun' },
        '2026-10-29': { adi: 'Cumhuriyet Bayramı', tip: 'tam_gun' },
        '2026-12-31': { adi: 'Yılbaşı Arifesi', tip: 'yarim_gun' },

        // 2027
        '2027-01-01': { adi: 'Yılbaşı', tip: 'tam_gun' },
        '2027-03-08': { adi: 'Ramazan Bayramı Arifesi', tip: 'yarim_gun' },
        '2027-03-09': { adi: 'Ramazan Bayramı 1. Gün', tip: 'tam_gun' },
        '2027-03-10': { adi: 'Ramazan Bayramı 2. Gün', tip: 'tam_gun' },
        '2027-03-11': { adi: 'Ramazan Bayramı 3. Gün', tip: 'tam_gun' },
        '2027-04-23': { adi: 'Ulusal Egemenlik ve Çocuk Bayramı', tip: 'tam_gun' },
        '2027-05-01': { adi: 'Emek ve Dayanışma Günü', tip: 'tam_gun' },
        '2027-05-16': { adi: 'Kurban Bayramı Arifesi', tip: 'yarim_gun' },
        '2027-05-17': { adi: 'Kurban Bayramı 1. Gün', tip: 'tam_gun' },
        '2027-05-18': { adi: 'Kurban Bayramı 2. Gün', tip: 'tam_gun' },
        '2027-05-19': { adi: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı ve Kurban Bayramı 3. Gün', tip: 'tam_gun' },
        '2027-05-20': { adi: 'Kurban Bayramı 4. Gün', tip: 'tam_gun' },
        '2027-07-15': { adi: 'Demokrasi ve Millî Birlik Günü', tip: 'tam_gun' },
        '2027-08-30': { adi: 'Zafer Bayramı', tip: 'tam_gun' },
        '2027-10-29': { adi: 'Cumhuriyet Bayramı', tip: 'tam_gun' },
        '2027-12-31': { adi: 'Yılbaşı Arifesi', tip: 'yarim_gun' },
    };
};

/**
 * Cache'deki tatilleri döndürür (senkron erişim için)
 */
export const getCachedHolidays = (): HolidayMap => {
    return holidayCache;
};

/**
 * Cache'i temizler
 */
export const clearHolidayCache = (): void => {
    holidayCache = {};
    cacheKey = '';
};
