import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

// API'den gelen veri tipi
export interface ShiftDefinitionAPI {
    id: number;
    name: string;
    short_name: string;
    start_time: string;
    end_time: string;
    color: string;
    bg_color: string;
    monday_hours: number;
    tuesday_hours: number;
    wednesday_hours: number;
    thursday_hours: number;
    friday_hours: number;
    saturday_hours: number;
    sunday_hours: number;
    holiday_hours: number;
    eve_of_holiday_hours: number;
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
    overtime: {
        pzt: number;
        sal: number;
        car: number;
        per: number;
        cum: number;
        cmt: number;
        paz: number;
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
    mondayHours?: number;
    tuesdayHours?: number;
    wednesdayHours?: number;
    thursdayHours?: number;
    fridayHours?: number;
    saturdayHours?: number;
    sundayHours?: number;
    holidayHours?: number;
    eveOfHolidayHours?: number;
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
const transformToFrontend = (api: ShiftDefinitionAPI): ShiftDefinition => ({
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
    overtime: {
        pzt: Number(api.monday_hours) || 0,
        sal: Number(api.tuesday_hours) || 0,
        car: Number(api.wednesday_hours) || 0,
        per: Number(api.thursday_hours) || 0,
        cum: Number(api.friday_hours) || 0,
        cmt: Number(api.saturday_hours) || 0,
        paz: Number(api.sunday_hours) || 0
    },
    holidayHours: Number(api.holiday_hours) || 0,
    eveOfHolidayHours: Number(api.eve_of_holiday_hours) || 0,
    isActive: api.is_active
});

// Transform frontend data to API format
const transformToAPI = (data: ShiftDefinition | CreateShiftDefinitionData): CreateShiftDefinitionData => ({
    name: data.name,
    shortName: 'shortName' in data ? data.shortName : (data as ShiftDefinition).code,
    startTime: data.startTime,
    endTime: data.endTime,
    color: 'color' in data ? data.color : '#ef4444',
    bgColor: 'bgColor' in data ? data.bgColor : '#fee2e2',
    mondayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.pzt : (data.mondayHours || 0),
    tuesdayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.sal : (data.tuesdayHours || 0),
    wednesdayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.car : (data.wednesdayHours || 0),
    thursdayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.per : (data.thursdayHours || 0),
    fridayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.cum : (data.fridayHours || 0),
    saturdayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.cmt : (data.saturdayHours || 0),
    sundayHours: 'overtime' in data ? (data as ShiftDefinition).overtime.paz : (data.sundayHours || 0),
    holidayHours: 'holidayHours' in data ? data.holidayHours : 0,
    eveOfHolidayHours: 'eveOfHolidayHours' in data ? data.eveOfHolidayHours : 0
});

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
