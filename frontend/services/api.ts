// services/api.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

import {
    User,
    LoginCredentials,
    AuthResponse,
    UserCreateData,
    UserUpdateData,
    ChangePasswordData,
    PaginatedResponse,
    QueueItem,
    ApiError,
} from '@/types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL:  'http://localhost:8000/api', // デフォルト値を追加
    headers: {
        'Content-Type': 'application/json',
    },
});


//Token management
const getAccessToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    return null;
}

const getRefreshToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('refresh_token');
    }
    return null;
}

const setTokens = (access: string, refresh: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    }
};

const clearTokens = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// リフレッシュ中のフラグ
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | ApiError | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // リフレッシュエンドポイント自体が401を返した場合は、即座にログアウト
        if (
            error.config?.url?.includes('/token/refresh/') && 
            error.response?.status === 401
        ) {
            clearTokens();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // 401エラーで、まだリトライしていない場合
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // 既にリフレッシュ中の場合はキューに追加
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();

            if (!refreshToken) {
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // 重要: axiosの新しいインスタンスを使用してインターセプターをバイパス
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/accounts/auth/token/refresh/`,
                    {
                        refresh: refreshToken,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const { access } = response.data;
                localStorage.setItem('access_token', access);

                // キューに溜まっているリクエストを処理
                processQueue(null, access);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                }

                return apiClient(originalRequest);
            } catch (refreshError) {
                // リフレッシュ失敗時
                const error = refreshError instanceof Error ? refreshError : new Error('Token refresh failed');
                processQueue(error, null);
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: async (credentials: LoginCredentials):
        Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/accounts/auth/login/', credentials);
        setTokens(response.data.access, response.data.refresh);
        return response.data;
    },

    logout: async (): Promise<void> => {
        const refreshToken = getRefreshToken();

        // refreshTokenが存在しない場合でもログアウト処理を続行
        if (!refreshToken) {
            console.warn('No refresh token found, clearing local auth data');
            clearTokens();
            return;
        }

        try {
            await apiClient.post('api/accounts/auth/logout/', {
                refresh: refreshToken  // または refresh_token: refreshToken
            });
        } catch (error) {
            // ログアウトAPIが失敗してもローカルのトークンは削除
            console.error('Logout API error:', error);
            if (axios.isAxiosError(error)) {
                console.error('Response:', error.response?.data);
            }
        } finally {
            // 成功・失敗に関わらずローカルのトークンを削除
            clearTokens();
        }
    },

    checkAuth: async (): Promise<{ is_authenticated: boolean; is_admin: boolean; user: User }> => {
        const response = await apiClient.get('accounts/auth/check/');
        return response.data
    },

    refreshToken: async (): Promise<{ access: string }> => {
        const refreshToken = getRefreshToken();
        const response = await apiClient.post('accounts/auth/token/refresh/', {
            refresh: refreshToken,
        });
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        return response.data;
    },
};

// User API
export const userApi = {
    // Get all users (admin only)
    getUsers: async (): Promise<User[]> => {
        const response = await apiClient.get<PaginatedResponse<User>>('accounts/users/');
        return response.data.results; // resultsプロパティを返す
    },

    // Create user (admin only)
    createUser: async (userData: UserCreateData):
        Promise<User> => {
        const response = await apiClient.post<User>('accounts/users/', userData);
        return response.data;
    },

    // Get current user
    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get<User>('accounts/users/me/');
        return response.data;
    },

    // Get user by ID
    getUser: async (id: string): Promise<User> => {
        const response = await apiClient.get<User>(`accounts/users/${id}/`);
        return response.data;
    },

    // Update user
    updateUser: async (id: string, userData: UserUpdateData): Promise<User> => {
        const response = await apiClient.patch<User>(`accounts/users/${id}/`, userData);
        return response.data;
    },

    // Delete user (admin only)
    deleteUser: async (id: string): Promise<void> => {
        await apiClient.delete(`accounts/users/${id}/`);
    },

    // Change password
    changePassword: async (passwordData: ChangePasswordData): Promise<{ message: string }> => {
        const response = await apiClient.put('accounts/users/me/change-password/', passwordData);
        return response.data;
    },
};

export default apiClient;