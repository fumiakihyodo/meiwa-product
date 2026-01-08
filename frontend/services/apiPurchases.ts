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
    // CSVインポート用
    CSVParseResult,
    CSVImportCreateData,
    // 比較関連
    ReceivingComparisonResult,
    BulkConfirmReceivingResult,
    UnregisteredItemsResult,
    ReceivingSummary,
    ReceivingItemListItem,
    // 購入品管理用
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    PurchaseOrderCreateData,
    PurchaseOrderUpdateData,
    PurchaseReceiving,
    PurchaseReceivingCreateData,
    PurchaseReceivingUpdateData,
    PurchasedItemInventory,
    PurchasedItemInventoryCreateData,
    PurchasedItemInventoryUpdateData,
    PartWithInventory,
    SuppliedItemWithInventory,
    SupplierPartsGroup,
    CreateOrdersFromPartsRequest,
    CreateOrdersFromPartsResponse,
    BulkConfirmPurchaseReceivingResult,
    BulkConfirmPurchaseCountResult,
    // ダッシュボード・受領処理用
    InventoryDashboardData,
    ReceivePurchaseItemRequest,
    ReceivePurchaseItemResponse,
    BulkReceivePurchaseOrderRequest,
    BulkReceivePurchaseOrderResponse,
    UnreceivedPurchaseItemsResponse,
    // 在庫調整用
    InventoryAdjustment,
    InventoryAdjustmentCreateRequest,
    InventoryForAdjustment,
    InventoryItemType,
    AdjustmentType,
    InventoryAdjustmentReason,
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

    // 部品一括削除
    bulkDeleteParts: async (ids: number[]): Promise<{
        success: boolean;
        message: string;
        deleted_count: number;
    }> => {
        const response = await apiClient.post('/purchases/parts/bulk-delete/', { ids });
        return response.data;
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
        product?: number;
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

    // CSVインポート（旧バージョン）
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

    // CSVファイル解析（新バージョン）
    parseSuppliedItemCsv: async (csvFile: File): Promise<CSVParseResult> => {
        const formData = new FormData();
        formData.append('csv_file', csvFile);
        const response = await apiClient.post<CSVParseResult>(
            '/purchases/supplied-item-lists/parse-csv/',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    // CSVから支給品リスト作成（新バージョン）
    createSuppliedItemListFromCsv: async (data: CSVImportCreateData): Promise<SuppliedItemList> => {
        const formData = new FormData();
        formData.append('product_id', data.product_id.toString());
        formData.append('issue_date', data.issue_date);
        formData.append('items', JSON.stringify(data.items));
        formData.append('register_unregistered', data.register_unregistered.toString());
        if (data.unregistered_items) {
            formData.append('unregistered_items', JSON.stringify(data.unregistered_items));
        }
        if (data.product_info) {
            formData.append('product_info', JSON.stringify(data.product_info));
        }
        formData.append('csv_file', data.csv_file);

        const response = await apiClient.post<SuppliedItemList>(
            '/purchases/supplied-item-lists/create-from-csv/',
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
        product?: number;
        status?: ReceivingStatus;
        unlinked?: string;
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

    // 支給品在庫（支給品マスターごと）取得 - 在庫0も含む
    getSuppliedItemInventoryWithItems: async (params: {
        product: number;
        search?: string;
        include_records?: boolean;
    }): Promise<SuppliedItemWithInventory[]> => {
        const response = await apiClient.get<SuppliedItemWithInventory[]>('/purchases/supplied-item-inventory-with-items/', {
            params: {
                product: params.product,
                search: params.search,
                include_records: params.include_records ? 'true' : 'false',
            }
        });
        return response.data;
    },

    // ===== リストと受入れ数量の比較 =====

    // リスト項目と受入れ数量を比較
    compareReceivingWithList: async (listId: number): Promise<ReceivingComparisonResult> => {
        const response = await apiClient.get<ReceivingComparisonResult>(
            `/purchases/supplied-item-lists/${listId}/compare-receiving/`
        );
        return response.data;
    },

    // 一括受入確認
    bulkConfirmReceiving: async (listId: number, excludeItemIds?: number[]): Promise<BulkConfirmReceivingResult> => {
        const response = await apiClient.post<BulkConfirmReceivingResult>(
            `/purchases/supplied-item-lists/${listId}/bulk-confirm-receiving/`,
            { exclude_item_ids: excludeItemIds || [] }
        );
        return response.data;
    },

    // リスト未登録の受入れ品番を取得
    getUnregisteredReceivingItems: async (listId: number): Promise<UnregisteredItemsResult> => {
        const response = await apiClient.get<UnregisteredItemsResult>(
            `/purchases/supplied-item-lists/${listId}/unregistered-items/`
        );
        return response.data;
    },

    // 受入状況サマリーを取得（単一リスト）
    getReceivingSummary: async (listId: number): Promise<ReceivingSummary> => {
        const response = await apiClient.get<ReceivingSummary>(
            `/purchases/supplied-item-lists/${listId}/receiving-summary/`
        );
        return response.data;
    },

    // 受入状況サマリーを一括取得（複数リスト）
    getReceivingSummariesBulk: async (listIds: number[]): Promise<{ summaries: ReceivingSummary[] }> => {
        const response = await apiClient.get<{ summaries: ReceivingSummary[] }>(
            '/purchases/supplied-item-lists/receiving-summaries/',
            { params: { list_ids: listIds.join(',') } }
        );
        return response.data;
    },

    // 品番から支給品情報を検索
    lookupItemByNumber: async (itemNumber: string, productId?: number): Promise<{
        found: boolean;
        item_number: string;
        item_name: string | null;
        supplied_item_id: number | null;
        product_id: number | null;
    }> => {
        const params: { item_number: string; product_id?: number } = { item_number: itemNumber };
        if (productId) {
            params.product_id = productId;
        }
        const response = await apiClient.get('/purchases/lookup-item/', { params });
        return response.data;
    },

    // 部品別受入一覧を取得
    getReceivingItemsList: async (params?: {
        product?: number;
        status?: ReceivingStatus;
        count_confirmed?: string;
        exclude_count_confirmed?: string; // 員数確認済み数量を除外するかどうか
    }): Promise<ReceivingItemListItem[]> => {
        const response = await apiClient.get<{ count: number; results: ReceivingItemListItem[] }>(
            '/purchases/supplied-item-receiving-items/',
            { params }
        );
        return response.data.results;
    },

    // ===== 購入品管理 - 発注 =====

    // 発注一覧取得
    getPurchaseOrders: async (params?: {
        customer?: number;
        product?: number;
        supplier_branch?: number;
        supplier?: number;
        status?: PurchaseOrderStatus;
        search?: string;
    }): Promise<PurchaseOrder[]> => {
        const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchases/purchase-orders/', { params });
        return response.data.results;
    },

    // 発注詳細取得
    getPurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
        const response = await apiClient.get<PurchaseOrder>(`/purchases/purchase-orders/${id}/`);
        return response.data;
    },

    // 発注作成
    createPurchaseOrder: async (data: PurchaseOrderCreateData): Promise<PurchaseOrder> => {
        const response = await apiClient.post<PurchaseOrder>('/purchases/purchase-orders/', data);
        return response.data;
    },

    // 発注更新
    updatePurchaseOrder: async (id: number, data: PurchaseOrderUpdateData): Promise<PurchaseOrder> => {
        const response = await apiClient.patch<PurchaseOrder>(`/purchases/purchase-orders/${id}/`, data);
        return response.data;
    },

    // 発注削除
    deletePurchaseOrder: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/purchase-orders/${id}/`);
    },

    // 発注ステータス更新
    updatePurchaseOrderStatus: async (id: number, status: PurchaseOrderStatus): Promise<PurchaseOrder> => {
        const response = await apiClient.post<PurchaseOrder>(
            `/purchases/purchase-orders/${id}/update-status/`,
            { status }
        );
        return response.data;
    },

    // 発注の一括受入確認
    bulkConfirmPurchaseOrderReceiving: async (id: number): Promise<BulkConfirmPurchaseReceivingResult> => {
        const response = await apiClient.post<BulkConfirmPurchaseReceivingResult>(
            `/purchases/purchase-orders/${id}/bulk-confirm-receiving/`
        );
        return response.data;
    },

    // 発注の一括員数確認（在庫移動）
    bulkConfirmPurchaseOrderCount: async (id: number): Promise<BulkConfirmPurchaseCountResult> => {
        const response = await apiClient.post<BulkConfirmPurchaseCountResult>(
            `/purchases/purchase-orders/${id}/bulk-confirm-count/`
        );
        return response.data;
    },

    // ===== 発注明細 =====

    // 発注明細一覧取得
    getPurchaseOrderItems: async (params?: {
        order?: number;
        receiving_confirmed?: string;
        count_confirmed?: string;
    }): Promise<PurchaseOrderItem[]> => {
        const response = await apiClient.get<PaginatedResponse<PurchaseOrderItem>>('/purchases/purchase-order-items/', { params });
        return response.data.results;
    },

    // 発注明細詳細取得
    getPurchaseOrderItem: async (id: number): Promise<PurchaseOrderItem> => {
        const response = await apiClient.get<PurchaseOrderItem>(`/purchases/purchase-order-items/${id}/`);
        return response.data;
    },

    // 発注明細受入確認
    confirmPurchaseOrderItemReceiving: async (id: number, data: ReceivingConfirmData): Promise<PurchaseOrderItem> => {
        const response = await apiClient.patch<PurchaseOrderItem>(
            `/purchases/purchase-order-items/${id}/receiving-confirm/`,
            data
        );
        return response.data;
    },

    // 発注明細員数確認
    confirmPurchaseOrderItemCount: async (id: number, data: CountConfirmData): Promise<PurchaseOrderItem> => {
        const response = await apiClient.patch<PurchaseOrderItem>(
            `/purchases/purchase-order-items/${id}/count-confirm/`,
            data
        );
        return response.data;
    },

    // ===== 購入品受入確認 =====

    // 購入品受入確認一覧取得
    getPurchaseReceivings: async (params?: {
        order?: number;
        product?: number;
        supplier_branch?: number;
        status?: ReceivingStatus;
    }): Promise<PurchaseReceiving[]> => {
        const response = await apiClient.get<PaginatedResponse<PurchaseReceiving>>('/purchases/purchase-receivings/', { params });
        return response.data.results;
    },

    // 購入品受入確認詳細取得
    getPurchaseReceiving: async (id: number): Promise<PurchaseReceiving> => {
        const response = await apiClient.get<PurchaseReceiving>(`/purchases/purchase-receivings/${id}/`);
        return response.data;
    },

    // 購入品受入確認作成
    createPurchaseReceiving: async (data: PurchaseReceivingCreateData): Promise<PurchaseReceiving> => {
        const response = await apiClient.post<PurchaseReceiving>('/purchases/purchase-receivings/', data);
        return response.data;
    },

    // 購入品受入確認更新
    updatePurchaseReceiving: async (id: number, data: PurchaseReceivingUpdateData): Promise<PurchaseReceiving> => {
        const response = await apiClient.patch<PurchaseReceiving>(`/purchases/purchase-receivings/${id}/`, data);
        return response.data;
    },

    // 購入品受入確認削除
    deletePurchaseReceiving: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/purchase-receivings/${id}/`);
    },

    // ===== 購入品在庫 =====

    // 購入品在庫一覧取得
    getPurchasedItemInventories: async (params?: {
        part?: number;
        product?: number;
        customer?: number;
        supplier_branch?: number;
        search?: string;
    }): Promise<PurchasedItemInventory[]> => {
        const response = await apiClient.get<PaginatedResponse<PurchasedItemInventory>>('/purchases/purchased-item-inventories/', { params });
        return response.data.results;
    },

    // 購入品在庫詳細取得
    getPurchasedItemInventory: async (id: number): Promise<PurchasedItemInventory> => {
        const response = await apiClient.get<PurchasedItemInventory>(`/purchases/purchased-item-inventories/${id}/`);
        return response.data;
    },

    // 購入品在庫作成
    createPurchasedItemInventory: async (data: PurchasedItemInventoryCreateData): Promise<PurchasedItemInventory> => {
        const response = await apiClient.post<PurchasedItemInventory>('/purchases/purchased-item-inventories/', data);
        return response.data;
    },

    // 購入品在庫更新
    updatePurchasedItemInventory: async (id: number, data: PurchasedItemInventoryUpdateData): Promise<PurchasedItemInventory> => {
        const response = await apiClient.patch<PurchasedItemInventory>(`/purchases/purchased-item-inventories/${id}/`, data);
        return response.data;
    },

    // 購入品在庫削除
    deletePurchasedItemInventory: async (id: number): Promise<void> => {
        await apiClient.delete(`/purchases/purchased-item-inventories/${id}/`);
    },

    // 購入品在庫（部品マスターごと）取得 - 在庫0も含む
    getPurchasedItemInventoryWithParts: async (params: {
        product: number;
        search?: string;
        include_records?: boolean;
    }): Promise<PartWithInventory[]> => {
        const response = await apiClient.get<PartWithInventory[]>('/purchases/purchased-item-inventory-with-parts/', {
            params: {
                product: params.product,
                search: params.search,
                include_records: params.include_records ? 'true' : 'false',
            }
        });
        return response.data;
    },

    // ===== 発注作成サポート =====

    // サプライヤー別にグループ化された部品を取得
    getPartsGroupedBySupplier: async (productId: number): Promise<SupplierPartsGroup[]> => {
        const response = await apiClient.get<SupplierPartsGroup[]>('/purchases/parts-by-supplier/', {
            params: { product: productId }
        });
        return response.data;
    },

    // 部品と数量から発注を一括作成
    createOrdersFromParts: async (data: CreateOrdersFromPartsRequest): Promise<CreateOrdersFromPartsResponse> => {
        const response = await apiClient.post<CreateOrdersFromPartsResponse>(
            '/purchases/create-orders-from-parts/',
            data
        );
        return response.data;
    },

    // ===== 在庫管理ダッシュボード =====

    // ダッシュボードデータ取得
    getInventoryDashboard: async (): Promise<InventoryDashboardData> => {
        const response = await apiClient.get<InventoryDashboardData>('/purchases/inventory-dashboard/');
        return response.data;
    },

    // ===== 購入品受領処理 =====

    // 発注明細の受領処理（個別）
    receivePurchaseOrderItem: async (
        itemId: number,
        data: ReceivePurchaseItemRequest
    ): Promise<ReceivePurchaseItemResponse> => {
        const response = await apiClient.post<ReceivePurchaseItemResponse>(
            `/purchases/purchase-order-items/${itemId}/receive/`,
            data
        );
        return response.data;
    },

    // 発注の一括受領処理
    bulkReceivePurchaseOrder: async (
        orderId: number,
        data: BulkReceivePurchaseOrderRequest
    ): Promise<BulkReceivePurchaseOrderResponse> => {
        const response = await apiClient.post<BulkReceivePurchaseOrderResponse>(
            `/purchases/purchase-orders/${orderId}/bulk-receive/`,
            data
        );
        return response.data;
    },

    // 発注明細の受入キャンセル処理
    cancelPurchaseOrderItemReceiving: async (
        itemId: number
    ): Promise<ReceivePurchaseItemResponse> => {
        const response = await apiClient.post<ReceivePurchaseItemResponse>(
            `/purchases/purchase-order-items/${itemId}/cancel-receiving/`
        );
        return response.data;
    },

    // 未受領購入品リスト取得
    getUnreceivedPurchaseItems: async (params?: {
        product?: number;
        supplier_branch?: number;
    }): Promise<UnreceivedPurchaseItemsResponse> => {
        const response = await apiClient.get<UnreceivedPurchaseItemsResponse>(
            '/purchases/unreceived-purchase-items/',
            { params }
        );
        return response.data;
    },

    // ===== 在庫調整 =====

    // 在庫調整一覧取得
    getInventoryAdjustments: async (params?: {
        item_type?: InventoryItemType;
        adjustment_type?: AdjustmentType;
        reason?: InventoryAdjustmentReason;
        product?: number;
        search?: string;
    }): Promise<InventoryAdjustment[]> => {
        const response = await apiClient.get<PaginatedResponse<InventoryAdjustment>>(
            '/purchases/inventory-adjustments/',
            { params }
        );
        return response.data.results;
    },

    // 在庫調整詳細取得
    getInventoryAdjustment: async (id: number): Promise<InventoryAdjustment> => {
        const response = await apiClient.get<InventoryAdjustment>(
            `/purchases/inventory-adjustments/${id}/`
        );
        return response.data;
    },

    // 在庫調整作成
    createInventoryAdjustment: async (
        data: InventoryAdjustmentCreateRequest
    ): Promise<InventoryAdjustment> => {
        const response = await apiClient.post<InventoryAdjustment>(
            '/purchases/inventory-adjustments/',
            data
        );
        return response.data;
    },

    // 在庫調整用の在庫一覧取得
    getInventoryForAdjustment: async (params?: {
        item_type?: InventoryItemType;
        product?: number;
        search?: string;
    }): Promise<InventoryForAdjustment[]> => {
        const response = await apiClient.get<InventoryForAdjustment[]>(
            '/purchases/inventory-for-adjustment/',
            { params }
        );
        return response.data;
    },
};