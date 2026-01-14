// services/apiProductionPlanning.ts
/**
 * 生産計画管理API
 * 国内/海外生産計画のCRUD操作とフィルタリング機能を提供
 */

import api from './api';
import {
    ProductionType,
    ProductionPlanListItem,
    ProductionPlanDetail,
    ProductionPlanCreateData,
    ProductionPlanUpdateData,
    ProductionPlanStatistics,
    ProductionPlanOverview,
    ManufacturingItemForPlanning,
    ProductionScheduleCreateData,
    ProductionScheduleItem,
    DeliveryScheduleCreateData,
} from '@/types/production-planning';

// キャッシュバスト用のタイムスタンプを追加するユーティリティ
const addCacheBuster = (params?: Record<string, unknown>): Record<string, unknown> => {
    return { ...params, _t: Date.now() };
};

// =============================================================================
// 型定義
// =============================================================================

interface PlanSearchParams {
    search?: string;
    status?: string;
    priority?: number;
    product?: number;
    manufacturing_item?: number;
    product_number?: string;
    product_name?: string;
}

interface ItemSearchParams {
    search?: string;
    is_active?: boolean;
    product?: number;
}

// =============================================================================
// 国内生産計画API
// =============================================================================

export const domesticPlanApi = {
    /**
     * 国内生産計画一覧を取得
     */
    getPlans: async (params?: PlanSearchParams): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/domestic/plans/', {
            params: addCacheBuster(params as Record<string, unknown>)
        });
        return response.data;
    },

    /**
     * 国内生産計画詳細を取得
     */
    getPlan: async (id: number): Promise<ProductionPlanDetail> => {
        const response = await api.get(`/production-planning/domestic/plans/${id}/`);
        return response.data;
    },

    /**
     * 国内生産計画を作成
     */
    createPlan: async (data: ProductionPlanCreateData): Promise<ProductionPlanDetail> => {
        const response = await api.post('/production-planning/domestic/plans/', data);
        return response.data;
    },

    /**
     * 国内生産計画を更新
     */
    updatePlan: async (id: number, data: ProductionPlanUpdateData): Promise<ProductionPlanDetail> => {
        const response = await api.patch(`/production-planning/domestic/plans/${id}/`, data);
        return response.data;
    },

    /**
     * 国内生産計画を削除
     */
    deletePlan: async (id: number): Promise<void> => {
        await api.delete(`/production-planning/domestic/plans/${id}/`);
    },

    /**
     * 進行中の国内生産計画を取得
     */
    getActivePlans: async (): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/domestic/plans/active/');
        return response.data;
    },

    /**
     * 完了した国内生産計画を取得
     */
    getCompletedPlans: async (): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/domestic/plans/completed/');
        return response.data;
    },

    /**
     * 国内生産計画の統計情報を取得
     */
    getStatistics: async (): Promise<ProductionPlanStatistics> => {
        const response = await api.get('/production-planning/domestic/plans/statistics/');
        return response.data;
    },

    /**
     * 国内生産計画にスケジュールを追加
     */
    addSchedule: async (planId: number, data: ProductionScheduleCreateData | DeliveryScheduleCreateData): Promise<ProductionScheduleItem> => {
        const response = await api.post(`/production-planning/domestic/plans/${planId}/add_schedule/`, data);
        return response.data;
    },
};

// =============================================================================
// 海外生産計画API
// =============================================================================

export const overseasPlanApi = {
    /**
     * 海外生産計画一覧を取得
     */
    getPlans: async (params?: PlanSearchParams): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/overseas/plans/', {
            params: addCacheBuster(params as Record<string, unknown>)
        });
        return response.data;
    },

    /**
     * 海外生産計画詳細を取得
     */
    getPlan: async (id: number): Promise<ProductionPlanDetail> => {
        const response = await api.get(`/production-planning/overseas/plans/${id}/`);
        return response.data;
    },

    /**
     * 海外生産計画を作成
     */
    createPlan: async (data: ProductionPlanCreateData): Promise<ProductionPlanDetail> => {
        const response = await api.post('/production-planning/overseas/plans/', data);
        return response.data;
    },

    /**
     * 海外生産計画を更新
     */
    updatePlan: async (id: number, data: ProductionPlanUpdateData): Promise<ProductionPlanDetail> => {
        const response = await api.patch(`/production-planning/overseas/plans/${id}/`, data);
        return response.data;
    },

    /**
     * 海外生産計画を削除
     */
    deletePlan: async (id: number): Promise<void> => {
        await api.delete(`/production-planning/overseas/plans/${id}/`);
    },

    /**
     * 進行中の海外生産計画を取得
     */
    getActivePlans: async (): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/overseas/plans/active/');
        return response.data;
    },

    /**
     * 完了した海外生産計画を取得
     */
    getCompletedPlans: async (): Promise<ProductionPlanListItem[]> => {
        const response = await api.get('/production-planning/overseas/plans/completed/');
        return response.data;
    },

    /**
     * 海外生産計画の統計情報を取得
     */
    getStatistics: async (): Promise<ProductionPlanStatistics> => {
        const response = await api.get('/production-planning/overseas/plans/statistics/');
        return response.data;
    },

    /**
     * 海外生産計画にスケジュールを追加
     */
    addSchedule: async (planId: number, data: ProductionScheduleCreateData): Promise<ProductionScheduleItem> => {
        const response = await api.post(`/production-planning/overseas/plans/${planId}/add_schedule/`, data);
        return response.data;
    },
};

// =============================================================================
// 国内制作品API
// =============================================================================

export const domesticItemApi = {
    /**
     * 国内制作品一覧を取得
     */
    getItems: async (params?: ItemSearchParams): Promise<ManufacturingItemForPlanning[]> => {
        const response = await api.get('/production-planning/domestic/items/', { params });
        return response.data;
    },

    /**
     * 国内制作品詳細を取得
     */
    getItem: async (id: number): Promise<ManufacturingItemForPlanning> => {
        const response = await api.get(`/production-planning/domestic/items/${id}/`);
        return response.data;
    },

    /**
     * 有効な国内制作品のみ取得
     */
    getActiveItems: async (): Promise<ManufacturingItemForPlanning[]> => {
        const response = await api.get('/production-planning/domestic/items/active/');
        return response.data;
    },
};

// =============================================================================
// 海外制作品API
// =============================================================================

export const overseasItemApi = {
    /**
     * 海外制作品一覧を取得
     */
    getItems: async (params?: ItemSearchParams): Promise<ManufacturingItemForPlanning[]> => {
        const response = await api.get('/production-planning/overseas/items/', { params });
        return response.data;
    },

    /**
     * 海外制作品詳細を取得
     */
    getItem: async (id: number): Promise<ManufacturingItemForPlanning> => {
        const response = await api.get(`/production-planning/overseas/items/${id}/`);
        return response.data;
    },

    /**
     * 有効な海外制作品のみ取得
     */
    getActiveItems: async (): Promise<ManufacturingItemForPlanning[]> => {
        const response = await api.get('/production-planning/overseas/items/active/');
        return response.data;
    },
};

// =============================================================================
// 生産計画概要API
// =============================================================================

export const productionPlanningOverviewApi = {
    /**
     * 国内/海外統合の概要情報を取得
     */
    getOverview: async (): Promise<ProductionPlanOverview> => {
        const response = await api.get('/production-planning/overview/');
        return response.data;
    },
};

// =============================================================================
// 統合API（生産タイプに基づいて適切なAPIを呼び出す）
// =============================================================================

export const productionPlanApi = {
    /**
     * 生産タイプに応じた計画一覧を取得
     */
    getPlans: async (productionType: ProductionType, params?: PlanSearchParams): Promise<ProductionPlanListItem[]> => {
        if (productionType === 'domestic') {
            return domesticPlanApi.getPlans(params);
        }
        return overseasPlanApi.getPlans(params);
    },

    /**
     * 生産タイプに応じた計画詳細を取得
     */
    getPlan: async (productionType: ProductionType, id: number): Promise<ProductionPlanDetail> => {
        if (productionType === 'domestic') {
            return domesticPlanApi.getPlan(id);
        }
        return overseasPlanApi.getPlan(id);
    },

    /**
     * 生産タイプに応じた計画を作成
     */
    createPlan: async (productionType: ProductionType, data: ProductionPlanCreateData): Promise<ProductionPlanDetail> => {
        if (productionType === 'domestic') {
            return domesticPlanApi.createPlan(data);
        }
        return overseasPlanApi.createPlan(data);
    },

    /**
     * 生産タイプに応じた計画を更新
     */
    updatePlan: async (productionType: ProductionType, id: number, data: ProductionPlanUpdateData): Promise<ProductionPlanDetail> => {
        if (productionType === 'domestic') {
            return domesticPlanApi.updatePlan(id, data);
        }
        return overseasPlanApi.updatePlan(id, data);
    },

    /**
     * 生産タイプに応じた計画を削除
     */
    deletePlan: async (productionType: ProductionType, id: number): Promise<void> => {
        if (productionType === 'domestic') {
            return domesticPlanApi.deletePlan(id);
        }
        return overseasPlanApi.deletePlan(id);
    },

    /**
     * 生産タイプに応じた制作品一覧を取得
     */
    getItems: async (productionType: ProductionType, params?: ItemSearchParams): Promise<ManufacturingItemForPlanning[]> => {
        if (productionType === 'domestic') {
            return domesticItemApi.getItems(params);
        }
        return overseasItemApi.getItems(params);
    },

    /**
     * 生産タイプに応じた有効な制作品を取得
     */
    getActiveItems: async (productionType: ProductionType): Promise<ManufacturingItemForPlanning[]> => {
        if (productionType === 'domestic') {
            return domesticItemApi.getActiveItems();
        }
        return overseasItemApi.getActiveItems();
    },
};
