import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

// API'den gelen veri tipi
export interface ShiftExchangeAPI {
    id: number;
    requester_id: number;
    requested_shift_id: number;
    target_id: number | null;
    target_shift_id: number | null;
    exchange_type: 'mutual' | 'transfer';
    status: 'pending' | 'target_approved' | 'approved' | 'rejected';
    approved_by: number | null;
    approved_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    requester_name?: string;
    target_name?: string;
    requester_shift_date?: string;
    target_shift_date?: string;
    requester_shift_name?: string;
    target_shift_name?: string;
}

export interface CreateExchangeData {
    requestedShiftId: number;
    targetId?: number | null;
    targetShiftId?: number | null;
    exchangeType: 'mutual' | 'transfer';
}

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get all exchanges
export const getAllExchanges = async (): Promise<ShiftExchangeAPI[]> => {
    const response = await axios.get(`${API_BASE_URL}/exchanges.php`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Create new exchange request
export const createExchange = async (data: CreateExchangeData): Promise<ShiftExchangeAPI> => {
    const response = await axios.post(`${API_BASE_URL}/exchanges.php`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Approve exchange
export const approveExchange = async (id: number): Promise<void> => {
    await axios.put(`${API_BASE_URL}/exchanges.php?id=${id}&action=approve`, {}, {
        headers: getAuthHeaders()
    });
};

// Reject exchange
export const rejectExchange = async (id: number, reason?: string): Promise<void> => {
    await axios.put(`${API_BASE_URL}/exchanges.php?id=${id}&action=reject`, { rejectionReason: reason }, {
        headers: getAuthHeaders()
    });
};

// Delete exchange
export const deleteExchange = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/exchanges.php?id=${id}`, {
        headers: getAuthHeaders()
    });
};
