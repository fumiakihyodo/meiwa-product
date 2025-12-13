// types/business.ts


// Pagination
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// OrderType
export type OrderTypeValue = 'MOQ' | 'SPQ' | 'SNP' | 'OTHER';

export interface OrderTypeOption {
    value: OrderTypeValue;
    label: string;
}

// PartModalType
export type PartModalType = 'detail' | 'edit' | 'priceList' | null;