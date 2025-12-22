import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

export interface Personnel {
    id: number;
    name: string;
    email: string;
    phone: string;
    username: string;
    role: 'admin' | 'user';
    shift_order: number;
    avatar: string | null;
    is_active: boolean;
    is_on_duty: boolean; // Nöbete tabi mi?
    created_at: string;
    updated_at: string;
}

export interface CreatePersonnelData {
    name: string;
    email: string;
    phone?: string;
    username: string;
    password: string;
    role?: 'admin' | 'user';
    shiftOrder?: number;
    isOnDuty?: boolean;
}

export interface UpdatePersonnelData {
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    role?: 'admin' | 'user';
    shiftOrder?: number;
    isActive?: boolean;
    isOnDuty?: boolean;
}

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get all personnel
export const getAllPersonnel = async (): Promise<Personnel[]> => {
    const response = await axios.get(`${API_BASE_URL}/personnel.php`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Get single personnel by ID
export const getPersonnelById = async (id: number): Promise<Personnel> => {
    const response = await axios.get(`${API_BASE_URL}/personnel.php?id=${id}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Create new personnel
export const createPersonnel = async (data: CreatePersonnelData): Promise<Personnel> => {
    const response = await axios.post(`${API_BASE_URL}/personnel.php`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Update personnel
export const updatePersonnel = async (id: number, data: UpdatePersonnelData): Promise<Personnel> => {
    const response = await axios.put(`${API_BASE_URL}/personnel.php?id=${id}`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Delete personnel
export const deletePersonnel = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/personnel.php?id=${id}`, {
        headers: getAuthHeaders()
    });
};
