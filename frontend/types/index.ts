// types/index.ts
// User related types

export interface User {
    id: number;
    userid: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone_number?: string;
    department: Department;
    is_active: boolean;
    is_staff: boolean;
    is_admin: boolean;
    is_administrator: boolean;
    ip_restriction_enabled?: boolean;
    created_at: string;
    updated_at: string;
    last_login_at?: string;
}

export enum Department {
    SALES = "SALES",
    ENGINEERING = "ENGINEERING",
    MANUFACTURING = "MANUFACTURING",
    MANAGEMENT = "MANAGEMENT",
    NONE = "",
}

export interface LoginCredentials {
    userid: string;
    password: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}
export interface AuthResponse {
    access: string;
    refresh: string;
    user: User;
}

export interface UserCreateData {
    userid: string;
    email: string;
    password: string;
    password2: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone_number?: string;
    department?: Department;
    is_admin?: boolean;
    is_staff?: boolean;
}

export interface UserUpdateData {
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone_number?: string;
    department?: Department;
    is_active?: boolean;
    is_admin?: boolean;
    is_staff?: boolean;
}

export interface ChangePasswordData{
    old_password: string;
    new_password: string;
    new_password2: string;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
    detail?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Client用の型定義
export interface QueueItem {
    resolve: (value?: string | null) => void;
    reject: (reason?: Error | ApiError) => void;
}

