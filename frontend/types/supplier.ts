import { Part } from './purchases'

// Supplier related types
export interface Supplier {
    id: number;
    supplier_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active: boolean;
    active_branches_count?: number;
    branches?: SupplierBranch[];
    created_at: string;
    updated_at: string;
}

export enum BranchType {
    HEAD_OFFICE = 'HEAD_OFFICE',
    BRANCH = 'BRANCH',
    SALES_OFFICE = 'SALES_OFFICE',
    FACTORY = 'FACTORY',
    WAREHOUSE = 'WAREHOUSE',
    OTHER = 'OTHER',
}

export interface SupplierBranch {
    id: number;
    supplier: number;
    supplier_name?: string;
    branch_code: string;
    branch_name: string;
    branch_type: BranchType;
    display_name?: string;
    postal_code?: string;
    address?: string;
    full_address?: string;
    phone_number?: string;
    fax_number?: string;
    email?: string;
    notes?: string;
    is_active: boolean;
    default_currency?: string;
    primary_contact?: {
        id: number;
        name: string;
        email?: string;
        phone_number?: string;
    };
    contacts?: SupplierContact[];
    parts?: Part[];
    created_at: string;
    updated_at: string;
}

export enum ContactResponsibility {
    QUOTATION = 'QUOTATION',
    ORDER = 'ORDER',
    DELIVERY = 'DELIVERY',
    TECHNICAL = 'TECHNICAL',
    QUALITY = 'QUALITY',
    ACCOUNTING = 'ACCOUNTING',
    GENERAL = 'GENERAL',
    OTHER = 'OTHER',
}

export interface SupplierContact {
    id: number;
    branch: number;
    branch_name?: string;
    supplier_name?: string;
    name: string;
    name_kana?: string;
    department?: string;
    position?: string;
    email?: string;
    phone_number?: string;
    mobile_number?: string;
    extension_number?: string;
    responsibility: ContactResponsibility;
    responsibility_detail?: string;
    is_primary: boolean;
    is_active: boolean;
    notes?: string;
    display_name_with_company?: string;
    created_at: string;
    updated_at: string;
}

// Create/Update data types
export interface SupplierCreateData {
    supplier_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active?: boolean;
}

export type SupplierUpdateData = Partial<SupplierCreateData>;

export interface SupplierBranchCreateData {
    supplier: number;
    branch_code: string;
    branch_name: string;
    branch_type: BranchType;
    postal_code?: string;
    address?: string;
    phone_number?: string;
    fax_number?: string;
    email?: string;
    notes?: string;
    is_active?: boolean;
}

export type SupplierBranchUpdateData = Partial<SupplierBranchCreateData>;

export interface SupplierContactCreateData {
    branch: number;
    name: string;
    name_kana?: string;
    department?: string;
    position?: string;
    email?: string;
    phone_number?: string;
    mobile_number?: string;
    extension_number?: string;
    responsibility: ContactResponsibility;
    responsibility_detail?: string;
    is_primary?: boolean;
    is_active?: boolean;
    notes?: string;
}

export type SupplierContactUpdateData = Partial<SupplierContactCreateData>;

// Overseas supplier types
export interface OverseasSupplierCreateData {
    // サプライヤー情報
    supplier_code: string;
    company_name: string;
    website?: string;

    // 拠点情報（海外は1拠点のみ "Main Office"）
    address: string;
    postal_code?: string;
    phone_number?: string;
    email?: string;

    // 担当者情報
    contact_name: string;
    contact_email?: string;
    contact_phone?: string;
    contact_department?: string;
    contact_position?: string;

    // その他
    notes?: string;
    is_active?: boolean;
}