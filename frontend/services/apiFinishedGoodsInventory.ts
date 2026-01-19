// services/apiFinishedGoodsInventory.ts
/**
 * 製作品在庫管理API
 * 生産計画で完成した製作品の在庫管理機能を提供
 */

import apiClient from './api';
import {
    FinishedGoodsInventory,
    FinishedGoodsInventoryCreateData,
    FinishedGoodsInventoryUpdateData,
    FinishedGoodsWithInventory,
    FinishedGoodsAdjustmentRequest,
    FinishedGoodsAdjustmentResponse,
    FinishedGoodsAdjustmentHistory,
    RegisterFromProductionPlanRequest,
    RegisterFromProductionPlanResponse,
    FinishedGoodsInventorySearchParams,
    FinishedGoodsInventoryDashboard,
} from '@/types/manufacturing-inventory';
import { PaginatedResponse } from '@/types/business';
import { ProductionPlan, ManufacturingItem } from './apiManufacturing';

/**
 * 製作品在庫API
 */
export const finishedGoodsInventoryApi = {
    /**
     * 製作品在庫一覧を取得
     */
    getInventoryList: async (
        params?: FinishedGoodsInventorySearchParams
    ): Promise<FinishedGoodsWithInventory[]> => {
        const response = await apiClient.get<PaginatedResponse<FinishedGoodsWithInventory> | FinishedGoodsWithInventory[]>(
            '/manufacturing/finished-goods-inventory/',
            { params }
        );
        // 配列またはページネーションレスポンスを処理
        const data = response.data;
        if (Array.isArray(data)) {
            return data;
        }
        if (data && 'results' in data) {
            return data.results;
        }
        return [];
    },

    /**
     * 製作品在庫詳細を取得
     */
    getInventory: async (id: number): Promise<FinishedGoodsInventory> => {
        const response = await apiClient.get<FinishedGoodsInventory>(
            `/manufacturing/finished-goods-inventory/${id}/`
        );
        return response.data;
    },

    /**
     * 製作品在庫を作成
     */
    createInventory: async (
        data: FinishedGoodsInventoryCreateData
    ): Promise<FinishedGoodsInventory> => {
        const response = await apiClient.post<FinishedGoodsInventory>(
            '/manufacturing/finished-goods-inventory/',
            data
        );
        return response.data;
    },

    /**
     * 製作品在庫を更新
     */
    updateInventory: async (
        id: number,
        data: FinishedGoodsInventoryUpdateData
    ): Promise<FinishedGoodsInventory> => {
        const response = await apiClient.patch<FinishedGoodsInventory>(
            `/manufacturing/finished-goods-inventory/${id}/`,
            data
        );
        return response.data;
    },

    /**
     * 製作品在庫を削除
     */
    deleteInventory: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/finished-goods-inventory/${id}/`);
    },

    /**
     * 製作品在庫を調整
     */
    adjustInventory: async (
        data: FinishedGoodsAdjustmentRequest
    ): Promise<FinishedGoodsAdjustmentResponse> => {
        const response = await apiClient.post<FinishedGoodsAdjustmentResponse>(
            '/manufacturing/finished-goods-inventory/adjust/',
            data
        );
        return response.data;
    },

    /**
     * 生産計画から在庫を登録
     */
    registerFromProductionPlan: async (
        data: RegisterFromProductionPlanRequest
    ): Promise<RegisterFromProductionPlanResponse> => {
        const response = await apiClient.post<RegisterFromProductionPlanResponse>(
            '/manufacturing/finished-goods-inventory/register-from-plan/',
            data
        );
        return response.data;
    },

    /**
     * 在庫調整履歴を取得
     */
    getAdjustmentHistory: async (params?: {
        manufacturing_item?: number;
        inventory_id?: number;
        limit?: number;
    }): Promise<FinishedGoodsAdjustmentHistory[]> => {
        const response = await apiClient.get<PaginatedResponse<FinishedGoodsAdjustmentHistory> | FinishedGoodsAdjustmentHistory[]>(
            '/manufacturing/finished-goods-inventory/adjustment-history/',
            { params }
        );
        const data = response.data;
        if (Array.isArray(data)) {
            return data;
        }
        if (data && 'results' in data) {
            return data.results;
        }
        return [];
    },

    /**
     * ダッシュボードデータを取得
     */
    getDashboard: async (): Promise<FinishedGoodsInventoryDashboard> => {
        const response = await apiClient.get<FinishedGoodsInventoryDashboard>(
            '/manufacturing/finished-goods-inventory/dashboard/'
        );
        return response.data;
    },
};

/**
 * 生産計画から在庫データを構築するヘルパー関数
 * （バックエンドに専用エンドポイントがない場合のフォールバック）
 */
export const buildInventoryFromPlans = async (
    plans: ProductionPlan[],
    manufacturingItems: ManufacturingItem[]
): Promise<FinishedGoodsWithInventory[]> => {
    // 制作品IDでグループ化
    const itemMap = new Map<number, FinishedGoodsWithInventory>();

    // 制作品マスターから初期化
    manufacturingItems.forEach((item) => {
        itemMap.set(item.id, {
            manufacturing_item_id: item.id,
            manufacturing_number: item.manufacturing_number,
            manufacturing_name: item.manufacturing_name,
            product_id: item.product,
            product_number: item.product_number,
            product_name: item.product_name,
            unit: item.unit,
            total_quantity: 0,
            available_quantity: 0,
            reserved_quantity: 0,
            quarantine_quantity: 0,
            defective_quantity: 0,
            inventory_records: [],
        });
    });

    // 完了した生産計画から在庫を集計
    plans.forEach((plan) => {
        if (plan.completed_quantity > 0) {
            const existing = itemMap.get(plan.manufacturing_item);
            if (existing) {
                existing.total_quantity += plan.completed_quantity;
                existing.available_quantity += plan.completed_quantity;
                existing.inventory_records?.push({
                    id: plan.id,
                    quantity: plan.completed_quantity,
                    lot_number: plan.plan_number,
                    storage_location: undefined,
                    status: 'available',
                    status_display: '出荷可能',
                    plan_number: plan.plan_number,
                    completed_at: plan.actual_end_date,
                    notes: plan.notes,
                    created_at: plan.created_at,
                    created_by_name: plan.created_by_name,
                });
            }
        }
    });

    return Array.from(itemMap.values());
};

/**
 * 製作品在庫のフィルタリングヘルパー
 */
export const filterFinishedGoodsInventory = (
    items: FinishedGoodsWithInventory[],
    filters: {
        search?: string;
        productId?: number;
        showZeroStock?: boolean;
    }
): FinishedGoodsWithInventory[] => {
    let filtered = [...items];

    // 検索フィルタ
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
            (item) =>
                item.manufacturing_number.toLowerCase().includes(searchLower) ||
                item.manufacturing_name.toLowerCase().includes(searchLower) ||
                item.product_number?.toLowerCase().includes(searchLower) ||
                item.product_name?.toLowerCase().includes(searchLower)
        );
    }

    // 製品フィルタ
    if (filters.productId) {
        filtered = filtered.filter(
            (item) => item.product_id === filters.productId
        );
    }

    // 在庫ゼロを除外
    if (!filters.showZeroStock) {
        filtered = filtered.filter((item) => item.total_quantity > 0);
    }

    return filtered;
};

export default finishedGoodsInventoryApi;
