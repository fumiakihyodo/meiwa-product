// types/customer.ts

export enum BranchType {
    HEAD_OFFICE = 'HEAD_OFFICE',
    BRANCH = 'BRANCH',
    SALES_OFFICE = 'SALES_OFFICE',
    FACTORY = 'FACTORY',
    WAREHOUSE = 'WAREHOUSE',
    OTHER = 'OTHER',
}

export interface Customer {
    id: number;
    customer_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active: boolean;
    active_branches_count?: number;
    branches?: CustomerBranch[];
    created_at: string;
    updated_at: string;
}

export interface CustomerBranch {
    id: number;
    customer: number;
    customer_name?: string;
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
    contacts_count?: number;
    contacts?: CustomerContact[];
    created_at: string;
    updated_at: string;
}

export interface CustomerContact {
    id: number;
    branch: number;
    branch_name?: string;
    customer_name?: string;
    name: string;
    name_kana?: string;
    department?: string;
    position?: string;
    email?: string;
    phone_number?: string;
    mobile_number?: string;
    extension_number?: string;
    display_name_with_company?: string;
    created_at: string;
    updated_at: string;
}

// Create/Update data types
export interface CustomerCreateData {
    customer_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active?: boolean;
}

export type CustomerUpdateData = Partial<CustomerCreateData>;

export interface CustomerBranchCreateData {
    customer: number;
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

export type CustomerBranchUpdateData = Partial<CustomerBranchCreateData>;

export interface CustomerContactCreateData {
    branch: number;
    name: string;
    name_kana?: string;
    department?: string;
    position?: string;
    email?: string;
    phone_number?: string;
    mobile_number?: string;
    extension_number?: string;
}

export type CustomerContactUpdateData = Partial<CustomerContactCreateData>;

