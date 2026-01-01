import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nobettakip.site/api';

export interface AccountData {
    id: number;
    name: string;
    email: string;
    phone: string;
    username: string;
    role: string;
    avatar?: string;
}

export interface UpdateAccountData {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAccount = async (): Promise<AccountData> => {
    const response = await axios.get(`${API_BASE_URL}/account.php`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const updateAccount = async (data: UpdateAccountData | FormData): Promise<AccountData> => {
    // Content-Type header'ı otomatik olarak multipart/form-data olacaktır eğer data FormData ise
    const headers = getAuthHeaders();

    // PUT yerine POST kullanıyoruz dosya yükleme desteği için
    const response = await axios.post(`${API_BASE_URL}/account.php`, data, {
        headers: headers
    });
    return response.data;
};
