// services/apiPurchases.ts

import apiClient from './api';
import {
    Part,
    PriceHistory,
    PartCreateData,
    PartUpdateData,
    PriceHistoryCreateData,
    PriceHistoryUpdateData,
    SuppliedItem,
    SuppliedItemPriceHistory,
    SuppliedItemCreateData,
    SuppliedItemUpdateData,
    SuppliedItemPriceHistoryCreateData,
    SuppliedItemPriceHistoryUpdateData,
    // 在庫管理用
    SuppliedItemList,
    SuppliedItemListItem,
    SuppliedItemListCreateData,
    SuppliedItemListUpdateData,
    SuppliedItemListItemCreateData,
    SuppliedItemReceiving,
    SuppliedItemReceivingCreateData,
    SuppliedItemReceivingUpdateData,
    SuppliedItemInventory,
    SuppliedItemInventoryCreateData,
    SuppliedItemInventoryUpdateData,
    SuppliedItemListStatus,
    ReceivingStatus,
    CountConfirmData,
    ReceivingConfirmData,
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

    // ===== Supplied Items =====
    getSuppliedItems: async (params?: {
        product?: number;
        is_active?: string;
        search?: string;
    }): Promise<SuppliedItem[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItem>>('/purchases/supplied-items/', { params });
        return response.data.results;
    },

    getSuppliedItem: async (id: number): Promise<SuppliedItem> => {
        const response = await apiClient.get<SuppliedItem>(`/purchases/supplied-items/${id}/`);
        return response.data;
    },

    createSuppliedItem: async (data: SuppliedItemCreateData): Promise<SuppliedItem> => {
        const response = await apiClient.post<SuppliedItem>('/purchases/supplied-items/', data);
        return response.data;
    },

    updateSuppliedItem: async (id: number, data: SuppliedItemUpdateData): Promise<SuppliedItem> => {
        const response = await apiClient.patch<SuppliedItem>(`/purchases/supplied-items/${id}/`, data);
        return response.data;
    },

    deleteSuppliedItem: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-items/${id}/`);
    },

    // ===== Supplied Item Price Histories =====
    getSuppliedItemPriceHistories: async (params?: {
        supplied_item?: number;
        product?: number;
        is_active?: string;
        status?: 'current' | 'future' | 'expired';
    }): Promise<SuppliedItemPriceHistory[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItemPriceHistory>>('/purchases/supplied-item-price-histories/', { params });
        return response.data.results;
    },

    getSuppliedItemPriceHistory: async (id: number): Promise<SuppliedItemPriceHistory> => {
        const response = await apiClient.get<SuppliedItemPriceHistory>(`/purchases/supplied-item-price-histories/${id}/`);
        return response.data;
    },

    createSuppliedItemPriceHistory: async (data: SuppliedItemPriceHistoryCreateData): Promise<SuppliedItemPriceHistory> => {
        console.log('[apiPurchases] createSuppliedItemPriceHistory called with:', {
            ...data,
            quote_file: data.quote_file ? `File: ${data.quote_file.name}` : 'No file',
        });

        const formData = new FormData();

        // 必須フィールド
        formData.append('supplied_item', String(data.supplied_item));
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

        const response = await apiClient.post<SuppliedItemPriceHistory>('/purchases/supplied-item-price-histories/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('[apiPurchases] createSuppliedItemPriceHistory response:', response.data);
        return response.data;
    },

    updateSuppliedItemPriceHistory: async (id: number, data: SuppliedItemPriceHistoryUpdateData): Promise<SuppliedItemPriceHistory> => {
        console.log('[apiPurchases] updateSuppliedItemPriceHistory called with:', {
            id,
            ...data,
            quote_file: data.quote_file ? `File: ${data.quote_file.name}` : 'No file',
        });

        const formData = new FormData();

        // 更新時は送信されたフィールドのみ追加
        if (data.supplied_item !== undefined) {
            formData.append('supplied_item', String(data.supplied_item));
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

        const response = await apiClient.patch<SuppliedItemPriceHistory>(`/purchases/supplied-item-price-histories/${id}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('[apiPurchases] updateSuppliedItemPriceHistory response:', response.data);
        return response.data;
    },

    deleteSuppliedItemPriceHistory: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-item-price-histories/${id}/`);
    },

    // 支給品見積書ファイルをダウンロード
    downloadSuppliedItemQuoteFile: async (priceHistoryId: number): Promise<Blob> => {
        const response = await apiClient.get(
            `/purchases/supplied-item-price-histories/${priceHistoryId}/quote-file/`,
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },

    // ===== 在庫管理 - 支給品リスト =====
    getSuppliedItemLists: async (params?: {
        customer?: number;
        status?: SuppliedItemListStatus;
        search?: string;
    }): Promise<SuppliedItemList[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItemList>>('/purchases/supplied-item-lists/', { params });
        return response.data.results;
    },

    getSuppliedItemList: async (id: number): Promise<SuppliedItemList> => {
        const response = await apiClient.get<SuppliedItemList>(`/purchases/supplied-item-lists/${id}/`);
        return response.data;
    },

    createSuppliedItemList: async (data: SuppliedItemListCreateData): Promise<SuppliedItemList> => {
        const response = await apiClient.post<SuppliedItemList>('/purchases/supplied-item-lists/', data);
        return response.data;
    },

    updateSuppliedItemList: async (id: number, data: SuppliedItemListUpdateData): Promise<SuppliedItemList> => {
        const response = await apiClient.patch<SuppliedItemList>(`/purchases/supplied-item-lists/${id}/`, data);
        return response.data;
    },

    deleteSuppliedItemList: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-item-lists/${id}/`);
    },

    // CSVインポート
    importSuppliedItemListCsv: async (listId: number, csvFile: File): Promise<{
        message: string;
        created_count: number;
        items: SuppliedItemListItem[];
        errors?: string[];
    }> => {
        const formData = new FormData();
        formData.append('csv_file', csvFile);
        const response = await apiClient.post(
            `/purchases/supplied-item-lists/${listId}/import-csv/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    // 在庫一括登録
    registerInventoryFromList: async (listId: number): Promise<{
        message: string;
        inventories: SuppliedItemInventory[];
    }> => {
        const response = await apiClient.post(`/purchases/supplied-item-lists/${listId}/register-inventory/`);
        return response.data;
    },

    // ===== 支給品リスト項目 =====
    getSuppliedItemListItems: async (params?: {
        list?: number;
        receiving_confirmed?: string;
        count_confirmed?: string;
    }): Promise<SuppliedItemListItem[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItemListItem>>('/purchases/supplied-item-list-items/', { params });
        return response.data.results;
    },

    getSuppliedItemListItem: async (id: number): Promise<SuppliedItemListItem> => {
        const response = await apiClient.get<SuppliedItemListItem>(`/purchases/supplied-item-list-items/${id}/`);
        return response.data;
    },

    createSuppliedItemListItem: async (data: SuppliedItemListItemCreateData): Promise<SuppliedItemListItem> => {
        const response = await apiClient.post<SuppliedItemListItem>('/purchases/supplied-item-list-items/', data);
        return response.data;
    },

    updateSuppliedItemListItem: async (id: number, data: Partial<SuppliedItemListItemCreateData>): Promise<SuppliedItemListItem> => {
        const response = await apiClient.patch<SuppliedItemListItem>(`/purchases/supplied-item-list-items/${id}/`, data);
        return response.data;
    },

    deleteSuppliedItemListItem: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-item-list-items/${id}/`);
    },

    // 受入確認
    confirmReceivingListItem: async (id: number, data: ReceivingConfirmData): Promise<SuppliedItemListItem> => {
        const response = await apiClient.patch<SuppliedItemListItem>(
            `/purchases/supplied-item-list-items/${id}/receiving-confirm/`,
            data
        );
        return response.data;
    },

    // 員数確認
    confirmCountListItem: async (id: number, data: CountConfirmData): Promise<SuppliedItemListItem> => {
        const response = await apiClient.patch<SuppliedItemListItem>(
            `/purchases/supplied-item-list-items/${id}/count-confirm/`,
            data
        );
        return response.data;
    },

    // ===== 受入確認 =====
    getSuppliedItemReceivings: async (params?: {
        list?: number;
        status?: ReceivingStatus;
    }): Promise<SuppliedItemReceiving[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItemReceiving>>('/purchases/supplied-item-receivings/', { params });
        return response.data.results;
    },

    getSuppliedItemReceiving: async (id: number): Promise<SuppliedItemReceiving> => {
        const response = await apiClient.get<SuppliedItemReceiving>(`/purchases/supplied-item-receivings/${id}/`);
        return response.data;
    },

    createSuppliedItemReceiving: async (data: SuppliedItemReceivingCreateData): Promise<SuppliedItemReceiving> => {
        const response = await apiClient.post<SuppliedItemReceiving>('/purchases/supplied-item-receivings/', data);
        return response.data;
    },

    updateSuppliedItemReceiving: async (id: number, data: SuppliedItemReceivingUpdateData): Promise<SuppliedItemReceiving> => {
        const response = await apiClient.patch<SuppliedItemReceiving>(`/purchases/supplied-item-receivings/${id}/`, data);
        return response.data;
    },

    deleteSuppliedItemReceiving: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-item-receivings/${id}/`);
    },

    // 受入確認完了
    completeReceiving: async (id: number): Promise<SuppliedItemReceiving> => {
        const response = await apiClient.post<SuppliedItemReceiving>(`/purchases/supplied-item-receivings/${id}/complete/`);
        return response.data;
    },

    // ===== 在庫 =====
    getSuppliedItemInventories: async (params?: {
        supplied_item?: number;
        product?: number;
        customer?: number;
        search?: string;
    }): Promise<SuppliedItemInventory[]> => {
        const response = await apiClient.get<PaginatedResponse<SuppliedItemInventory>>('/purchases/supplied-item-inventories/', { params });
        return response.data.results;
    },

    getSuppliedItemInventory: async (id: number): Promise<SuppliedItemInventory> => {
        const response = await apiClient.get<SuppliedItemInventory>(`/purchases/supplied-item-inventories/${id}/`);
        return response.data;
    },

    createSuppliedItemInventory: async (data: SuppliedItemInventoryCreateData): Promise<SuppliedItemInventory> => {
        const response = await apiClient.post<SuppliedItemInventory>('/purchases/supplied-item-inventories/', data);
        return response.data;
    },

    updateSuppliedItemInventory: async (id: number, data: SuppliedItemInventoryUpdateData): Promise<SuppliedItemInventory> => {
        const response = await apiClient.patch<SuppliedItemInventory>(`/purchases/supplied-item-inventories/${id}/`, data);
        return response.data;
    },

    deleteSuppliedItemInventory: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/supplied-item-inventories/${id}/`);
    },
};