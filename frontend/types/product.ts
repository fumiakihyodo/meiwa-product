// Product related types

import { Part } from './purchases'

export enum ProductStatus {
    ACTIVE = 'ACTIVE',
    DISCONTINUED = 'DISCONTINUED',
    DEVELOPMENT = 'DEVELOPMENT',
}

export interface Product {
    id: number;
    product_number: string;
    product_name: string;
    model_info?: string;
    description?: string;
    status: ProductStatus;
    is_assembly?: boolean;
    is_parts_processing?: boolean;
    parts_count?: number;
    manufacturing_items_count?: number;
    parts?: Part[];
    customer: string;
    customer_branch?: number;
    customer_branch_name?: string;
    branch_name?: string;
    branch_type?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface ProductCreateData {
    customerbranch: number;
    product_number: string;
    product_name: string;
    model_info?: string;
    description?: string;
    status?: ProductStatus;
    is_assembly?: boolean;
    is_parts_processing?: boolean;
    customer?: string;
    customer_branch?: number;
}

export type ProductUpdateData = Partial<ProductCreateData>;