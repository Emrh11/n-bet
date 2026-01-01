import type { ShiftAssignment } from '../components/pages/ShiftSchedulerContent';
import type { ShiftDefinition } from '../services/shiftDefinitionsService';
import { getTatilAdi, isArifeGunu, isResmiTatil, isYilbasiArifesi } from './holidays';

export interface DailyHakedis {
    date: string;
    dayName: string;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName: string | null;
    entryTime: string;
    exitTime: string;
    shiftType: string;
    workHours: number;
    expectedHours: number;
    missingHours: number;
    excessHours: number;
}

export interface MonthlyHakedisSummary {
    totalWorkHours: number;
    totalExpectedHours: number;
    totalMissingHours: number;
    totalExcessHours: number;
    dailyDetails: DailyHakedis[];
}

// Beklenen çalışma saatleri
const EXPECTED_HOURS: { [key: string]: number } = {
    'pazartesi': 10,
    'salı': 10,
    'çarşamba': 10,
    'perşembe': 10,
    'cuma': 10,
    'cumartesi': 0,
    'pazar': 0
};

const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Saat hesaplama
const calculateHoursBetween = (login: string, logout: string): number => {
    if (!login || !logout || login === '-' || logout === '-') return 0;

    const loginParts = login.split(':').map(Number);
    const logoutParts = logout.split(':').map(Number);

    let loginMinutes = loginParts[0] * 60 + (loginParts[1] || 0);
    let logoutMinutes = logoutParts[0] * 60 + (logoutParts[1] || 0);

    if (logoutMinutes <= loginMinutes) {
        logoutMinutes += 24 * 60;
    }

    return Math.round((logoutMinutes - loginMinutes) / 60);
};

export const calculateStaffHakedis = (
    staffId: number,
    month: number,
    year: number,
    shifts: { [date: string]: ShiftAssignment[] },
    definitions: ShiftDefinition[]
): MonthlyHakedisSummary => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyDetails: DailyHakedis[] = [];

    let totalWorkHours = 0;
    let totalExpectedHours = 0;
    let totalMissingHours = 0;
    let totalExcessHours = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = currentDate.getDay();
        const dayName = dayNames[dayOfWeek];
        const dayNameLower = dayName.toLowerCase();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Resmi tatil kontrolü
        const isHoliday = isResmiTatil(dateStr);
        const holidayName = getTatilAdi(dateStr);
        const isArife = isArifeGunu(dateStr) || isYilbasiArifesi(dateStr);

        // Önceki gün
        const prevDate = new Date(year, month - 1, day - 1);
        const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
        const isPrevDayHoliday = isResmiTatil(prevDateStr);
        const isPrevDayArife = isArifeGunu(prevDateStr) || isYilbasiArifesi(prevDateStr);

        // Bu günün vardiyalarını bul (NE hariç)
        const dayShifts = (shifts[dateStr] || []).filter(s => {
            if (s.shiftCode === 'NE') return false;
            const def = definitions.find(d => d.id === s.shiftDefinitionId || d.code === s.shiftCode);
            if (def && (def.name.includes('Ertesi') || def.code === 'NE')) return false;
            return s.staffId === staffId;
        });

        // Önceki günün vardiyaları
        const prevDayShifts = (shifts[prevDateStr] || []).filter(s => {
            if (s.shiftCode === 'NE') return false;
            const def = definitions.find(d => d.id === s.shiftDefinitionId || d.code === s.shiftCode);
            if (def && (def.name.includes('Ertesi') || def.code === 'NE')) return false;
            return s.staffId === staffId;
        });

        // NE kaydı kontrolü
        const hasNobetErtesiRecord = (shifts[dateStr] || []).some(s =>
            s.staffId === staffId && (s.shiftCode === 'NE' ||
                definitions.find(d => d.id === s.shiftDefinitionId)?.code === 'NE')
        );

        let shiftType = '';
        let entryTime = '-';
        let exitTime = '-';
        let workHours = 0;
        let expectedHours = 0;

        // 1. NÖBET KONTROLÜ
        if (dayShifts.length > 0) {
            const shift = dayShifts[0];
            const def = definitions.find(d => d.id === shift.shiftDefinitionId || d.code === shift.shiftCode);

            if (def) {
                // Arife günü nöbeti (31 Aralık gibi)
                if (isArife) {
                    shiftType = `${def.name} (Arife)`;
                    entryTime = def.startTime || '08:00';
                    exitTime = '23:59';
                    workHours = calculateHoursBetween(entryTime, exitTime);
                    // Arife: 12:00'a kadar normal mesai beklenir (6 saat), sonrası tatil
                    expectedHours = 6; // Yarım gün mesai
                } else if (isHoliday) {
                    shiftType = `${def.name} (Resmi Tatil)`;
                    entryTime = def.startTime || '08:00';
                    exitTime = '23:59';
                    workHours = calculateHoursBetween(entryTime, exitTime);
                    expectedHours = 0; // Resmi tatil - tüm çalışma fazla mesai
                } else {
                    shiftType = def.name;
                    entryTime = def.startTime || '08:00';
                    exitTime = '23:59';
                    workHours = calculateHoursBetween(entryTime, exitTime);
                    expectedHours = EXPECTED_HOURS[dayNameLower] ?? 10;
                }
            }
        }
        // 2. NÖBET ERTESİ KONTROLÜ
        else if (prevDayShifts.length > 0 || hasNobetErtesiRecord) {
            const prevShift = prevDayShifts[0];
            const def = prevShift ? definitions.find(d => d.id === prevShift.shiftDefinitionId || d.code === prevShift.shiftCode) : null;

            entryTime = '00:00';
            exitTime = def?.endTime || '08:00';
            workHours = calculateHoursBetween(entryTime, exitTime);

            // Resmi tatile denk gelen nöbet ertesi
            if (isHoliday) {
                shiftType = `Nöbet Ertesi (${holidayName || 'Resmi Tatil'})`;
                expectedHours = 0; // Bugün de resmi tatil - kesinti yok
            }
            // Önceki gün arife veya resmi tatil ise
            else if (isPrevDayArife || isPrevDayHoliday) {
                // Bugün hafta içi VE resmi tatil değilse → kesinti var (pazar gibi)
                // Bugün hafta sonu VEYA resmi tatil ise → kesinti yok
                if (!isWeekend && !isHoliday) {
                    shiftType = 'Nöbet Ertesi (Kesintili)';
                    expectedHours = 10; // Hafta içi - 2 saat kesinti olacak
                } else {
                    shiftType = 'Nöbet Ertesi';
                    expectedHours = 0; // Hafta sonu veya tatil - kesinti yok
                }
            }
            // Normal nöbet ertesi
            else {
                shiftType = 'Nöbet Ertesi';
                expectedHours = isWeekend ? 0 : 10;
            }
        }

        // 3. RESMİ TATİL (vardiya yok)
        else if (isHoliday) {
            shiftType = holidayName || 'Resmi Tatil';
            entryTime = '-';
            exitTime = '-';
            workHours = 0;
            expectedHours = 0;
        }
        // 4. ARİFE GÜNÜ (vardiya yok)
        else if (isArife) {
            shiftType = 'Arife (Yarım Gün)';
            entryTime = '08:00';
            exitTime = '12:00';
            workHours = 4; // Yarım gün
            expectedHours = 4;
        }
        // 5. HAFTA SONU (vardiya yok)
        else if (isWeekend) {
            shiftType = 'Off';
            entryTime = '-';
            exitTime = '-';
            workHours = 0;
            expectedHours = 0;
        }
        // 6. HAFTA İÇİ MESAİ
        else {
            shiftType = 'Mesai';
            entryTime = '08:00';
            exitTime = '18:00';
            workHours = calculateHoursBetween(entryTime, exitTime);
            expectedHours = EXPECTED_HOURS[dayNameLower] ?? 10;
        }

        // FAZLA/EKSİK HESAPLAMA
        let missingHours = 0;
        let excessHours = 0;

        const difference = workHours - expectedHours;
        if (difference < 0) {
            missingHours = Math.abs(difference);
        } else if (difference > 0) {
            excessHours = difference;
        }

        dailyDetails.push({
            date: dateStr,
            dayName,
            isWeekend,
            isHoliday,
            holidayName,
            entryTime,
            exitTime,
            shiftType,
            workHours,
            expectedHours,
            missingHours,
            excessHours
        });

        totalWorkHours += workHours;
        totalExpectedHours += expectedHours;
        totalMissingHours += missingHours;
        totalExcessHours += excessHours;
    }

    return {
        totalWorkHours,
        totalExpectedHours,
        totalMissingHours,
        totalExcessHours,
        dailyDetails
    };
};
