import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

// Her gün için detaylı saat bilgisi
export interface DayHoursDetail {
    before12: number;  // 12:00 öncesi mesai saati
    after12: number;   // 12:00 sonrası mesai saati
    expected: number;  // Beklenen çalışma saati
    mealDeduction: number; // Yemek kesintisi (saat)
}


// API'den gelen veri tipi
export interface ShiftDefinitionAPI {
    id: number;
    name: string;
    short_name: string;
    start_time: string;
    end_time: string;
    color: string;
    bg_color: string;
    // Eski format (geriye uyumluluk için)
    monday_hours?: number;
    tuesday_hours?: number;
    wednesday_hours?: number;
    thursday_hours?: number;
    friday_hours?: number;
    saturday_hours?: number;
    sunday_hours?: number;
    // Yeni detaylı format
    monday_before_12?: number;
    monday_after_12?: number;
    monday_expected?: number;
    tuesday_before_12?: number;
    tuesday_after_12?: number;
    tuesday_expected?: number;
    wednesday_before_12?: number;
    wednesday_after_12?: number;
    wednesday_expected?: number;
    thursday_before_12?: number;
    thursday_after_12?: number;
    thursday_expected?: number;
    friday_before_12?: number;
    friday_after_12?: number;
    friday_expected?: number;
    saturday_before_12?: number;
    saturday_after_12?: number;
    saturday_expected?: number;
    sunday_before_12?: number;
    sunday_after_12?: number;
    sunday_expected?: number;
    // Tatil günleri
    holiday_before_12?: number;
    holiday_after_12?: number;
    holiday_expected?: number;
    eve_of_holiday_before_12?: number;
    eve_of_holiday_after_12?: number;
    eve_of_holiday_expected?: number;
    // Eski tatil format (geriye uyumluluk)
    holiday_hours?: number;
    eve_of_holiday_hours?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Frontend'de kullanılan tip
export interface ShiftDefinition {
    id: number;
    code: string;
    name: string;
    shortName: string;
    startTime: string;
    endTime: string;
    color: string;
    bgColor: string;
    duration: string;
    breakTime: string;
    description: string;
    // Eski format (geriye uyumluluk)
    overtime: {
        pzt: number;
        sal: number;
        car: number;
        per: number;
        cum: number;
        cmt: number;
        paz: number;
    };
    // Yeni detaylı format
    dailyHours: {
        pzt: DayHoursDetail;
        sal: DayHoursDetail;
        car: DayHoursDetail;
        per: DayHoursDetail;
        cum: DayHoursDetail;
        cmt: DayHoursDetail;
        paz: DayHoursDetail;
        tatil: DayHoursDetail;
        arifesi: DayHoursDetail;
    };
    holidayHours: number;
    eveOfHolidayHours: number;
    isActive: boolean;
}

export interface CreateShiftDefinitionData {
    name: string;
    shortName: string;
    startTime: string;
    endTime: string;
    color?: string;
    bgColor?: string;
    // Eski format
    mondayHours?: number;
    tuesdayHours?: number;
    wednesdayHours?: number;
    thursdayHours?: number;
    fridayHours?: number;
    saturdayHours?: number;
    sundayHours?: number;
    holidayHours?: number;
    eveOfHolidayHours?: number;
    // Yeni detaylı format
    dailyHours?: {
        pzt: DayHoursDetail;
        sal: DayHoursDetail;
        car: DayHoursDetail;
        per: DayHoursDetail;
        cum: DayHoursDetail;
        cmt: DayHoursDetail;
        paz: DayHoursDetail;
        tatil: DayHoursDetail;
        arifesi: DayHoursDetail;
    };
}

export interface UpdateShiftDefinitionData extends Partial<CreateShiftDefinitionData> {
    isActive?: boolean;
}

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper: Calculate duration from start and end time
const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let hours = endH - startH;
    let mins = endM - startM;
    if (mins < 0) { hours--; mins += 60; }
    if (hours < 0) hours += 24; // Next day
    return `${hours} Saat${mins > 0 ? ` ${mins} Dk` : ''}`;
};

// Transform API data to frontend format
const transformToFrontend = (api: ShiftDefinitionAPI): ShiftDefinition => {
    // Yeni kolonların var olup olmadığını kontrol et
    const hasNewColumns = api.monday_before_12 !== undefined || api.monday_after_12 !== undefined;

    // Eski overtime formatını oluştur (geriye uyumluluk)
    const overtime = {
        pzt: Number(api.monday_hours) || 0,
        sal: Number(api.tuesday_hours) || 0,
        car: Number(api.wednesday_hours) || 0,
        per: Number(api.thursday_hours) || 0,
        cum: Number(api.friday_hours) || 0,
        cmt: Number(api.saturday_hours) || 0,
        paz: Number(api.sunday_hours) || 0
    };

    // Yeni detaylı format - eğer yeni kolonlar varsa onları kullan, yoksa eski formattan al
    const dailyHours = {
        pzt: {
            before12: hasNewColumns ? Number(api.monday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.monday_after_12) || 0 : Number(api.monday_hours) || 0,
            expected: hasNewColumns ? Number(api.monday_expected) ?? 8 : 8,
            mealDeduction: 2 // Pazartesi - hafta içi, kesinti var
        },
        sal: {
            before12: hasNewColumns ? Number(api.tuesday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.tuesday_after_12) || 0 : Number(api.tuesday_hours) || 0,
            expected: hasNewColumns ? Number(api.tuesday_expected) ?? 8 : 8,
            mealDeduction: 2 // Salı - hafta içi, kesinti var
        },
        car: {
            before12: hasNewColumns ? Number(api.wednesday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.wednesday_after_12) || 0 : Number(api.wednesday_hours) || 0,
            expected: hasNewColumns ? Number(api.wednesday_expected) ?? 8 : 8,
            mealDeduction: 2 // Çarşamba - hafta içi, kesinti var
        },
        per: {
            before12: hasNewColumns ? Number(api.thursday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.thursday_after_12) || 0 : Number(api.thursday_hours) || 0,
            expected: hasNewColumns ? Number(api.thursday_expected) ?? 8 : 8,
            mealDeduction: 2 // Perşembe - hafta içi, kesinti var
        },
        cum: {
            before12: hasNewColumns ? Number(api.friday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.friday_after_12) || 0 : Number(api.friday_hours) || 0,
            expected: hasNewColumns ? Number(api.friday_expected) ?? 8 : 8,
            mealDeduction: 0 // Cuma - ertesi tatil, kesinti yok
        },
        cmt: {
            before12: hasNewColumns ? Number(api.saturday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.saturday_after_12) || 0 : Number(api.saturday_hours) || 0,
            expected: hasNewColumns ? Number(api.saturday_expected) ?? 0 : 0,
            mealDeduction: 0 // Cumartesi - tatil, kesinti yok
        },
        paz: {
            before12: hasNewColumns ? Number(api.sunday_before_12) || 0 : 0,
            after12: hasNewColumns ? Number(api.sunday_after_12) || 0 : Number(api.sunday_hours) || 0,
            expected: hasNewColumns ? Number(api.sunday_expected) ?? 0 : 0,
            mealDeduction: 2 // Pazar - ertesi iş günü, kesinti var
        },
        tatil: {
            before12: Number(api.holiday_before_12) || 0,
            after12: Number(api.holiday_after_12) || Number(api.holiday_hours) || 0,
            expected: Number(api.holiday_expected) || 0,
            mealDeduction: 0 // Tatil - kesinti yok
        },
        arifesi: {
            before12: Number(api.eve_of_holiday_before_12) || 0,
            after12: Number(api.eve_of_holiday_after_12) || Number(api.eve_of_holiday_hours) || 0,
            expected: Number(api.eve_of_holiday_expected) || 4,
            mealDeduction: 0 // Arife - kesinti yok
        }
    };


    return {
        id: api.id,
        code: api.short_name,
        name: api.name,
        shortName: api.short_name,
        startTime: api.start_time,
        endTime: api.end_time,
        color: api.color,
        bgColor: api.bg_color,
        duration: calculateDuration(api.start_time, api.end_time),
        breakTime: '',
        description: '',
        overtime,
        dailyHours,
        holidayHours: Number(api.holiday_hours) || (Number(api.holiday_before_12) || 0) + (Number(api.holiday_after_12) || 0),
        eveOfHolidayHours: Number(api.eve_of_holiday_hours) || (Number(api.eve_of_holiday_before_12) || 0) + (Number(api.eve_of_holiday_after_12) || 0),
        isActive: api.is_active
    };
};

// Transform frontend data to API format
const transformToAPI = (data: ShiftDefinition | CreateShiftDefinitionData): Record<string, unknown> => {
    const baseData: Record<string, unknown> = {
        name: data.name,
        shortName: 'shortName' in data ? data.shortName : (data as ShiftDefinition).code,
        startTime: data.startTime,
        endTime: data.endTime,
        color: 'color' in data ? data.color : '#ef4444',
        bgColor: 'bgColor' in data ? data.bgColor : '#fee2e2'
    };

    // Eğer yeni detaylı format varsa
    if ('dailyHours' in data && data.dailyHours) {
        const dh = data.dailyHours;
        return {
            ...baseData,
            // Eski format (geriye uyumluluk)
            mondayHours: dh.pzt.before12 + dh.pzt.after12,
            tuesdayHours: dh.sal.before12 + dh.sal.after12,
            wednesdayHours: dh.car.before12 + dh.car.after12,
            thursdayHours: dh.per.before12 + dh.per.after12,
            fridayHours: dh.cum.before12 + dh.cum.after12,
            saturdayHours: dh.cmt.before12 + dh.cmt.after12,
            sundayHours: dh.paz.before12 + dh.paz.after12,
            holidayHours: dh.tatil.before12 + dh.tatil.after12,
            eveOfHolidayHours: dh.arifesi.before12 + dh.arifesi.after12,
            // Yeni detaylı format
            mondayBefore12: dh.pzt.before12,
            mondayAfter12: dh.pzt.after12,
            mondayExpected: dh.pzt.expected,
            tuesdayBefore12: dh.sal.before12,
            tuesdayAfter12: dh.sal.after12,
            tuesdayExpected: dh.sal.expected,
            wednesdayBefore12: dh.car.before12,
            wednesdayAfter12: dh.car.after12,
            wednesdayExpected: dh.car.expected,
            thursdayBefore12: dh.per.before12,
            thursdayAfter12: dh.per.after12,
            thursdayExpected: dh.per.expected,
            fridayBefore12: dh.cum.before12,
            fridayAfter12: dh.cum.after12,
            fridayExpected: dh.cum.expected,
            saturdayBefore12: dh.cmt.before12,
            saturdayAfter12: dh.cmt.after12,
            saturdayExpected: dh.cmt.expected,
            sundayBefore12: dh.paz.before12,
            sundayAfter12: dh.paz.after12,
            sundayExpected: dh.paz.expected,
            holidayBefore12: dh.tatil.before12,
            holidayAfter12: dh.tatil.after12,
            holidayExpected: dh.tatil.expected,
            eveOfHolidayBefore12: dh.arifesi.before12,
            eveOfHolidayAfter12: dh.arifesi.after12,
            eveOfHolidayExpected: dh.arifesi.expected
        };
    }

    // Eski format
    if ('overtime' in data) {
        const sd = data as ShiftDefinition;
        return {
            ...baseData,
            mondayHours: sd.overtime.pzt,
            tuesdayHours: sd.overtime.sal,
            wednesdayHours: sd.overtime.car,
            thursdayHours: sd.overtime.per,
            fridayHours: sd.overtime.cum,
            saturdayHours: sd.overtime.cmt,
            sundayHours: sd.overtime.paz,
            holidayHours: sd.holidayHours,
            eveOfHolidayHours: sd.eveOfHolidayHours
        };
    }

    return {
        ...baseData,
        mondayHours: data.mondayHours || 0,
        tuesdayHours: data.tuesdayHours || 0,
        wednesdayHours: data.wednesdayHours || 0,
        thursdayHours: data.thursdayHours || 0,
        fridayHours: data.fridayHours || 0,
        saturdayHours: data.saturdayHours || 0,
        sundayHours: data.sundayHours || 0,
        holidayHours: data.holidayHours || 0,
        eveOfHolidayHours: data.eveOfHolidayHours || 0
    };
};

// Get all shift definitions
export const getAllShiftDefinitions = async (): Promise<ShiftDefinition[]> => {
    const response = await axios.get(`${API_BASE_URL}/shift-definitions.php`, {
        headers: getAuthHeaders()
    });
    return response.data.map(transformToFrontend);
};

// Get single shift definition by ID
export const getShiftDefinitionById = async (id: number): Promise<ShiftDefinition> => {
    const response = await axios.get(`${API_BASE_URL}/shift-definitions.php?id=${id}`, {
        headers: getAuthHeaders()
    });
    return transformToFrontend(response.data);
};

// Create new shift definition
export const createShiftDefinition = async (data: ShiftDefinition): Promise<ShiftDefinition> => {
    const apiData = transformToAPI(data);
    const response = await axios.post(`${API_BASE_URL}/shift-definitions.php`, apiData, {
        headers: getAuthHeaders()
    });
    return transformToFrontend(response.data);
};

// Update shift definition
export const updateShiftDefinition = async (id: number, data: ShiftDefinition): Promise<ShiftDefinition> => {
    const apiData = transformToAPI(data);
    const response = await axios.put(`${API_BASE_URL}/shift-definitions.php?id=${id}`, apiData, {
        headers: getAuthHeaders()
    });
    return transformToFrontend(response.data);
};

// Delete shift definition
export const deleteShiftDefinition = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/shift-definitions.php?id=${id}`, {
        headers: getAuthHeaders()
    });
};

// Helper function to get day hours for a specific day key
export const getDayHoursForKey = (
    shiftDef: ShiftDefinition,
    dayKey: 'pzt' | 'sal' | 'car' | 'per' | 'cum' | 'cmt' | 'paz' | 'tatil' | 'arifesi'
): DayHoursDetail => {
    return shiftDef.dailyHours[dayKey];
};

// Helper to calculate total overtime for a day
export const calculateDayTotal = (dayHours: DayHoursDetail): number => {
    return dayHours.before12 + dayHours.after12;
};

// Helper to calculate excess hours (fazla mesai)
export const calculateExcess = (dayHours: DayHoursDetail): number => {
    const total = calculateDayTotal(dayHours);
    return Math.max(0, total - dayHours.expected);
};

// Helper to calculate missing hours (eksik mesai)
export const calculateMissing = (dayHours: DayHoursDetail): number => {
    const total = calculateDayTotal(dayHours);
    return Math.max(0, dayHours.expected - total);
};
