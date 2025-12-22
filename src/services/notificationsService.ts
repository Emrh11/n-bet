import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

export interface Notification {
    id: number;
    user_id: number;
    title: string;
    message: string | null;
    type: 'exchange_request' | 'exchange_approved' | 'exchange_rejected' | 'schedule_published' | 'shift_assigned' | 'shift_changed' | 'reminder' | 'system';
    reference_id: number | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unread_count: number;
}

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get all notifications
export const getNotifications = async (unreadOnly: boolean = false): Promise<NotificationsResponse> => {
    const response = await axios.get(`${API_BASE_URL}/notifications.php${unreadOnly ? '?unread=1' : ''}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// Mark notification as read
export const markAsRead = async (id?: number): Promise<void> => {
    const url = id
        ? `${API_BASE_URL}/notifications.php?id=${id}&action=mark-read`
        : `${API_BASE_URL}/notifications.php?action=mark-read`;
    await axios.put(url, {}, {
        headers: getAuthHeaders()
    });
};

// Delete notification
export const deleteNotification = async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/notifications.php?id=${id}`, {
        headers: getAuthHeaders()
    });
};

// Clear all notifications
export const clearAllNotifications = async (): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/notifications.php?action=clear-all`, {
        headers: getAuthHeaders()
    });
};

// Send notification (admin only)
export const sendNotification = async (data: {
    userId: number | 'all';
    title: string;
    message?: string;
    type?: string;
    referenceId?: number;
}): Promise<void> => {
    await axios.post(`${API_BASE_URL}/notifications.php`, data, {
        headers: getAuthHeaders()
    });
};

// Get notification icon based on type
export const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
        exchange_request: '🔄',
        exchange_approved: '✅',
        exchange_rejected: '❌',
        schedule_published: '📅',
        shift_assigned: '📋',
        shift_changed: '🔀',
        reminder: '⏰',
        system: '📢'
    };
    return icons[type] || '🔔';
};

// Get notification color based on type
export const getNotificationColor = (type: string): string => {
    const colors: Record<string, string> = {
        exchange_request: '#f59e0b',
        exchange_approved: '#22c55e',
        exchange_rejected: '#ef4444',
        schedule_published: '#3b82f6',
        shift_assigned: '#8b5cf6',
        shift_changed: '#f97316',
        reminder: '#06b6d4',
        system: '#6b7280'
    };
    return colors[type] || '#6b7280';
};
