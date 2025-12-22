import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

// API'den gelen veri tipi
export interface ShiftAPI {
    id: number;
    personnel_id: number;
    shift_definition_id: number | null;
    date: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    personnel_name: string;
    shift_name: string | null;
    short_name: string | null;
    color: string | null;
    bg_color: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateShiftData {
    personnel_id: number;
    shift_definition_id?: number | null;
    date: string;
    shift_type?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
}

export interface BulkShiftData {
    shifts: CreateShiftData[];
}

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get shifts for a specific month/year
export const getShiftsByMonth = async (month: number, year: number): Promise<ShiftAPI[]> => {
    const response = await axios.get(`${API_BASE_URL}/shifts.php`, {
        params: { month, year },
        headers: getAuthHeaders()
    });
    return response.data;
};

// Get shifts for a specific personnel
export const getShiftsByPersonnel = async (personnelId: number): Promise<ShiftAPI[]> => {
    const response = await axios.get(`${API_BASE_URL}/shifts.php`, {
        params: { personnelId },
        headers: getAuthHeaders()
    });
    return response.data;
};

// Create a single shift
export const createShift = async (data: CreateShiftData): Promise<ShiftAPI> => {
    const response = await axios.post(`${API_BASE_URL}/shifts.php`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Create multiple shifts (bulk)
export const createBulkShifts = async (shifts: CreateShiftData[]): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/shifts.php?action=bulk`, { shifts }, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Update a shift
export const updateShift = async (id: number, data: Partial<CreateShiftData>): Promise<ShiftAPI> => {
    const response = await axios.put(`${API_BASE_URL}/shifts.php?id=${id}`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Delete a shift
export const deleteShift = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/shifts.php?id=${id}`, {
        headers: getAuthHeaders()
    });
};

// Clear all shifts for a month
export const clearMonthShifts = async (month: number, year: number): Promise<{ message: string }> => {
    const response = await axios.delete(`${API_BASE_URL}/shifts.php?action=clear-month&month=${month}&year=${year}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};
