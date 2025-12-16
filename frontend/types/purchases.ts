// Purchase related types
export interface Part {
    id: number;
    product: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string; 
    customer_branch_name?: string;
    supplier_branch: number;
    supplier_name?: string;
    branch_name?: string;
    branch_display_name?: string;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    specification?: string;
    unit: string;
    order_type: string;
    standard_quantity: number;
    usage_quantity: number;
    minimum_order_quantity: number;
    lead_time_days?: number;
    current_price?: number;
    has_multiple_active_prices?: boolean;
    price_history_count?: number;
    price_histories?: PriceHistory[];
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface PriceHistory {
    id: number;
    part: number;
    part_number?: string;
    part_name?: string;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    is_current?: boolean;
    is_future?: boolean;
    is_expired?: boolean;
    change_reason?: string;
    quote_file?: string;
    quote_file_name?: string;
    quote_file_size?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface PartCreateData {
    product: number;
    supplier_branch: number;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    specification?: string;
    unit?: string;
    order_type: string;
    standard_quantity?: number;
    usage_quantity?: number;
    minimum_order_quantity?: number;
    lead_time_days?: number;
    is_active?: boolean;
    notes?: string;
}

export type PartUpdateData = Partial<PartCreateData>;

export interface PartFormData {
    product: number;
    supplier_branch: number;
    part_number: string;
    part_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    usage_quantity: number;
    minimum_order_quantity: number;
    lead_time_days?: number;
    is_active: boolean;
    notes?: string;
}

export interface PriceHistoryCreateData {
    part: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active?: boolean;
    change_reason?: string;
    quote_file?: File;
    notes?: string;
}

export type PriceHistoryUpdateData = Partial<PriceHistoryCreateData>;

// Supplied Item types
export interface SuppliedItem {
    id: number;
    product: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    customer_branch_name?: string;
    item_number: string;
    item_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    current_price?: number;
    has_multiple_active_prices?: boolean;
    price_history_count?: number;
    supplied_item_price_histories?: SuppliedItemPriceHistory[];
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface SuppliedItemPriceHistory {
    id: number;
    supplied_item: number;
    item_number?: string;
    item_name?: string;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    is_current?: boolean;
    is_future?: boolean;
    is_expired?: boolean;
    change_reason?: string;
    quote_file?: string;
    quote_file_name?: string;
    quote_file_size?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface SuppliedItemCreateData {
    product: number;
    item_number: string;
    item_name: string;
    specification?: string;
    unit?: string;
    standard_quantity?: number;
    is_active?: boolean;
    notes?: string;
}

export type SuppliedItemUpdateData = Partial<SuppliedItemCreateData>;

export interface SuppliedItemFormData {
    product: number;
    item_number: string;
    item_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    is_active: boolean;
    notes?: string;
}

export interface SuppliedItemPriceHistoryCreateData {
    supplied_item: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active?: boolean;
    change_reason?: string;
    quote_file?: File;
    notes?: string;
}

export type SuppliedItemPriceHistoryUpdateData = Partial<SuppliedItemPriceHistoryCreateData>;

