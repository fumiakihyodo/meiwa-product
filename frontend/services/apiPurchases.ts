// services/apiPurchases.ts

import apiClient from './api';
import {
    Part,
    PriceHistory,
    PartCreateData,
    PartUpdateData,
    PriceHistoryCreateData,
    PriceHistoryUpdateData,
} from '@/types/purchases';

import {
    PaginatedResponse,
} from '@/types/business'

// Purchases API (Parts and PriceHistory)
export const purchasesApi = {
    // Parts
    getParts: async (params?: { 
        product?: number;
        supplier?: number;
        branch?: number;
        is_active?: string;
        search?: string;
    }): Promise<Part[]> => {
        const response = await apiClient.get<PaginatedResponse<Part>>('/purchases/parts/', { params });
        return response.data.results;
    },

    getPart: async (id: number): Promise<Part> => {
        const response = await apiClient.get<Part>(`/purchases/parts/${id}/`);
        return response.data;
    },

    createPart: async (data: PartCreateData): Promise<Part> => {
        const response = await apiClient.post<Part>('/purchases/parts/', data);
        return response.data;
    },

    updatePart: async (id: number, data: PartUpdateData): Promise<Part> => {
        const response = await apiClient.patch<Part>(`/purchases/parts/${id}/`, data);
        return response.data;
    },

    deletePart: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/parts/${id}/`);
    },

    // Price Histories
    getPriceHistories: async (params?: { 
        part?: number;
        product?: number;
        is_active?: string;
        status?: 'current' | 'future' | 'expired';
    }): Promise<PriceHistory[]> => {
        const response = await apiClient.get<PaginatedResponse<PriceHistory>>('/purchases/price-histories/', { params });
        return response.data.results;
    },

    getPriceHistory: async (id: number): Promise<PriceHistory> => {
        const response = await apiClient.get<PriceHistory>(`/purchases/price-histories/${id}/`);
        return response.data;
    },

    createPriceHistory: async (data: PriceHistoryCreateData): Promise<PriceHistory> => {
        console.log('[apiPurchases] createPriceHistory called with:', {
            ...data,
            quote_file: data.quote_file ? `File: ${data.quote_file.name}` : 'No file',
        });

        const formData = new FormData();
        
        // 必須フィールド
        formData.append('part', String(data.part));
        formData.append('price', String(data.price));
        formData.append('start_date', data.start_date);
        
        // オプショナルフィールド
        if (data.end_date) {
            formData.append('end_date', data.end_date);
        }
        
        // booleanは文字列として送信
        formData.append('is_active', data.is_active !== undefined ? String(data.is_active) : 'true');
        
        if (data.change_reason) {
            formData.append('change_reason', data.change_reason);
        }
        
        if (data.notes) {
            formData.append('notes', data.notes);
        }
        
        // ファイルの添付
        if (data.quote_file instanceof File) {
            console.log('[apiPurchases] Appending file to FormData:', {
                name: data.quote_file.name,
                size: data.quote_file.size,
                type: data.quote_file.type,
            });
            formData.append('quote_file', data.quote_file, data.quote_file.name);
        }
        
        // FormDataの内容をログ出力
        console.log('[apiPurchases] FormData entries:');
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}:`, `File(${value.name}, ${value.size} bytes)`);
            } else {
                console.log(`  ${key}:`, value);
            }
        }
        
        const response = await apiClient.post<PriceHistory>('/purchases/price-histories/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('[apiPurchases] createPriceHistory response:', response.data);
        return response.data;
    },

    updatePriceHistory: async (id: number, data: PriceHistoryUpdateData): Promise<PriceHistory> => {
        console.log('[apiPurchases] updatePriceHistory called with:', {
            id,
            ...data,
            quote_file: data.quote_file ? `File: ${data.quote_file.name}` : 'No file',
        });

        const formData = new FormData();
        
        // 更新時は送信されたフィールドのみ追加
        if (data.part !== undefined) {
            formData.append('part', String(data.part));
        }
        
        if (data.price !== undefined && data.price !== null) {
            formData.append('price', String(data.price));
        }
        
        if (data.start_date) {
            formData.append('start_date', data.start_date);
        }
        
        if (data.end_date) {
            formData.append('end_date', data.end_date);
        }
        
        if (data.is_active !== undefined && data.is_active !== null) {
            formData.append('is_active', String(data.is_active));
        }
        
        if (data.change_reason) {
            formData.append('change_reason', data.change_reason);
        }
        
        if (data.notes) {
            formData.append('notes', data.notes);
        }
        
        if (data.quote_file instanceof File) {
            console.log('[apiPurchases] Appending file to FormData:', {
                name: data.quote_file.name,
                size: data.quote_file.size,
                type: data.quote_file.type,
            });
            formData.append('quote_file', data.quote_file, data.quote_file.name);
        }

        // FormDataの内容をログ出力
        console.log('[apiPurchases] FormData entries:');
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}:`, `File(${value.name}, ${value.size} bytes)`);
            } else {
                console.log(`  ${key}:`, value);
            }
        }

        const response = await apiClient.patch<PriceHistory>(`/purchases/price-histories/${id}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        console.log('[apiPurchases] updatePriceHistory response:', response.data);
        return response.data;
    },

    deletePriceHistory: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/price-histories/${id}/`);
    },

    // 見積書ファイルをダウンロード
    downloadQuoteFile: async (priceHistoryId: number): Promise<Blob> => {
        const response = await apiClient.get(
            `/purchases/price-histories/${priceHistoryId}/quote-file/`,
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },
};