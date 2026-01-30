// services/apiManufacturing.ts

import apiClient from './api';
import { PaginatedResponse } from '@/types/business';

// Types
export type ProductionType = 'domestic' | 'overseas' | 'both';

export interface ManufacturingItem {
    id: number;
    manufacturing_number: string;
    manufacturing_name: string;
    production_type: ProductionType;
    production_type_display?: string;
    product?: number;
    product_number?: string;
    product_name?: string;
    specification?: string;
    unit: string;
    standard_production_time?: number;
    purchase_price?: number;
    is_active: boolean;
    notes?: string;
    // 拠点別在庫情報
    domestic_stock: number;
    overseas_stock: number;
    total_stock: number;
    text_notes?: string;
    production_plan_count?: number;
    // 海外サプライヤー情報
    overseas_supplier_branch?: number;
    overseas_supplier_branch_name?: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string;
}

export interface ManufacturingItemCreate {
    manufacturing_number: string;
    manufacturing_name: string;
    production_type?: ProductionType;
    product?: number;
    specification?: string;
    unit?: string;
    standard_production_time?: number;
    purchase_price?: number;
    is_active?: boolean;
    // 拠点別在庫情報
    domestic_stock?: number;
    overseas_stock?: number;
    text_notes?: string;
    // 海外サプライヤー情報
    overseas_supplier_branch?: number;
}

export interface ProductionSchedule {
    id: number;
    schedule_number: string;
    plan: number;
    plan_number?: string;
    quantity: number;
    completed_quantity: number;
    completion_rate?: number;
    started_at?: string;
    finished_at?: string;
    actual_started_at?: string;
    actual_finished_at?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    assigned_to?: number;
    assigned_to_name?: string;
    production_line?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductionScheduleCreate {
    plan: number;
    quantity: number;
    started_at?: string;
    finished_at?: string;
    status?: string;
    assigned_to?: number;
    production_line?: string;
    notes?: string;
}

export interface ProductionPlan {
    id: number;
    plan_number: string;
    manufacturing_item: number;
    manufacturing_item_number?: string;
    manufacturing_item_name?: string;
    product?: number;
    product_number?: string;
    product_name?: string;
    total_planned_quantity: number;
    completed_quantity: number;
    remaining_quantity?: number;
    total_scheduled_quantity?: number;
    completion_rate?: number;
    schedule_count?: number;
    planned_start_date?: string;
    planned_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
    priority: number;
    notes?: string;
    schedules?: ProductionSchedule[];
    created_at: string;
    updated_at: string;
    created_by_name?: string;
}

export interface ProductionPlanCreate {
    manufacturing_item: number;
    product?: number;
    total_planned_quantity: number;
    planned_start_date?: string;
    planned_end_date?: string;
    status?: string;
    priority?: number;
    notes?: string;
    schedules?: ProductionScheduleCreate[];
}

export interface Material {
    id: number;
    material_code: string;
    material_name: string;
    material_type?: string;
    category: 'raw' | 'semi_finished' | 'component' | 'consumable' | 'other';
    category_display?: string;
    specification?: string;
    unit: string;
    stock_quantity: number;
    minimum_stock: number;
    maximum_stock?: number;
    is_low_stock?: boolean;
    supplier_branch?: number;
    supplier_branch_name?: string;
    supplier_name?: string;
    unit_price?: number;
    lead_time_days?: number;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string;
}

export interface MaterialCreate {
    material_code: string;
    material_name: string;
    material_type?: string;
    category?: string;
    specification?: string;
    unit?: string;
    stock_quantity?: number;
    minimum_stock?: number;
    maximum_stock?: number;
    supplier_branch?: number;
    unit_price?: number;
    lead_time_days?: number;
    is_active?: boolean;
    notes?: string;
}

// Manufacturing Item API
export const manufacturingItemApi = {
    getItems: async (params?: {
        search?: string;
        product?: number;
        is_active?: boolean;
        production_type?: ProductionType;
    }): Promise<ManufacturingItem[]> => {
        const response = await apiClient.get<PaginatedResponse<ManufacturingItem>>('/manufacturing/items/', { params });
        return response.data.results;
    },

    getItem: async (id: number): Promise<ManufacturingItem> => {
        const response = await apiClient.get<ManufacturingItem>(`/manufacturing/items/${id}/`);
        return response.data;
    },

    createItem: async (data: ManufacturingItemCreate): Promise<ManufacturingItem> => {
        const response = await apiClient.post<ManufacturingItem>('/manufacturing/items/', data);
        return response.data;
    },

    updateItem: async (id: number, data: Partial<ManufacturingItemCreate>): Promise<ManufacturingItem> => {
        const response = await apiClient.patch<ManufacturingItem>(`/manufacturing/items/${id}/`, data);
        return response.data;
    },

    deleteItem: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/items/${id}/`);
    },

    getActiveItems: async (): Promise<ManufacturingItem[]> => {
        const response = await apiClient.get<ManufacturingItem[]>('/manufacturing/items/active/');
        return response.data;
    },
};

// Production Plan API
export const productionPlanApi = {
    getPlans: async (params?: {
        search?: string;
        manufacturing_item?: number;
        product?: number;
        status?: string;
        priority?: number;
    }): Promise<ProductionPlan[]> => {
        const response = await apiClient.get<PaginatedResponse<ProductionPlan>>('/manufacturing/plans/', { params });
        return response.data.results;
    },

    getPlan: async (id: number): Promise<ProductionPlan> => {
        const response = await apiClient.get<ProductionPlan>(`/manufacturing/plans/${id}/`);
        return response.data;
    },

    createPlan: async (data: ProductionPlanCreate): Promise<ProductionPlan> => {
        const response = await apiClient.post<ProductionPlan>('/manufacturing/plans/', data);
        return response.data;
    },

    updatePlan: async (id: number, data: Partial<ProductionPlanCreate>): Promise<ProductionPlan> => {
        const response = await apiClient.patch<ProductionPlan>(`/manufacturing/plans/${id}/`, data);
        return response.data;
    },

    deletePlan: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/plans/${id}/`);
    },

    getActivePlans: async (): Promise<ProductionPlan[]> => {
        const response = await apiClient.get<ProductionPlan[]>('/manufacturing/plans/active/');
        return response.data;
    },

    getCompletedPlans: async (): Promise<ProductionPlan[]> => {
        const response = await apiClient.get<ProductionPlan[]>('/manufacturing/plans/completed/');
        return response.data;
    },

    addSchedule: async (planId: number, data: ProductionScheduleCreate): Promise<ProductionSchedule> => {
        const response = await apiClient.post<ProductionSchedule>(
            `/manufacturing/plans/${planId}/add_schedule/`,
            data
        );
        return response.data;
    },
};

// Production Schedule API
export const productionScheduleApi = {
    getSchedules: async (params?: {
        plan?: number;
        status?: string;
        assigned_to?: number
    }): Promise<ProductionSchedule[]> => {
        const response = await apiClient.get<PaginatedResponse<ProductionSchedule>>('/manufacturing/schedules/', { params });
        return response.data.results;
    },

    getSchedule: async (id: number): Promise<ProductionSchedule> => {
        const response = await apiClient.get<ProductionSchedule>(`/manufacturing/schedules/${id}/`);
        return response.data;
    },

    createSchedule: async (data: ProductionScheduleCreate): Promise<ProductionSchedule> => {
        const response = await apiClient.post<ProductionSchedule>('/manufacturing/schedules/', data);
        return response.data;
    },

    updateSchedule: async (id: number, data: Partial<ProductionScheduleCreate>): Promise<ProductionSchedule> => {
        const response = await apiClient.patch<ProductionSchedule>(`/manufacturing/schedules/${id}/`, data);
        return response.data;
    },

    deleteSchedule: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/schedules/${id}/`);
    },

    startSchedule: async (id: number): Promise<ProductionSchedule> => {
        const response = await apiClient.post<ProductionSchedule>(`/manufacturing/schedules/${id}/start/`);
        return response.data;
    },

    completeSchedule: async (id: number, completedQuantity?: number): Promise<ProductionSchedule> => {
        const response = await apiClient.post<ProductionSchedule>(
            `/manufacturing/schedules/${id}/complete/`,
            { completed_quantity: completedQuantity }
        );
        return response.data;
    },
};

// Manufacturing Material (BOM) Types
export interface ManufacturingMaterial {
    id: number;
    manufacturing_item: number;
    manufacturing_item_number?: string;
    manufacturing_item_name?: string;
    material: number;
    material_code?: string;
    material_name?: string;
    material_unit?: string;
    material_stock_quantity?: number;
    quantity_required: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ManufacturingMaterialCreate {
    manufacturing_item: number;
    material: number;
    quantity_required: number;
    notes?: string;
}

// Manufacturing Material (BOM) API
export const manufacturingMaterialApi = {
    getBomItems: async (params?: {
        manufacturing_item?: number;
        material?: number;
    }): Promise<ManufacturingMaterial[]> => {
        const response = await apiClient.get<PaginatedResponse<ManufacturingMaterial>>('/manufacturing/bom/', { params });
        return response.data.results;
    },

    getBomItem: async (id: number): Promise<ManufacturingMaterial> => {
        const response = await apiClient.get<ManufacturingMaterial>(`/manufacturing/bom/${id}/`);
        return response.data;
    },

    createBomItem: async (data: ManufacturingMaterialCreate): Promise<ManufacturingMaterial> => {
        const response = await apiClient.post<ManufacturingMaterial>('/manufacturing/bom/', data);
        return response.data;
    },

    updateBomItem: async (id: number, data: Partial<ManufacturingMaterialCreate>): Promise<ManufacturingMaterial> => {
        const response = await apiClient.patch<ManufacturingMaterial>(`/manufacturing/bom/${id}/`, data);
        return response.data;
    },

    deleteBomItem: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/bom/${id}/`);
    },

    // 制作品に紐づく材料を一括更新
    updateBomForItem: async (
        manufacturingItemId: number,
        materials: { material: number; quantity_required: number; notes?: string }[]
    ): Promise<ManufacturingMaterial[]> => {
        // 既存のBOMを取得
        const existingBom = await manufacturingMaterialApi.getBomItems({ manufacturing_item: manufacturingItemId });
        const existingMaterialIds = existingBom.map(bom => bom.material);
        const newMaterialIds = materials.map(m => m.material);

        // 削除すべきBOM（新しいリストにないもの）
        const toDelete = existingBom.filter(bom => !newMaterialIds.includes(bom.material));

        // 追加すべきBOM（既存リストにないもの）
        const toAdd = materials.filter(m => !existingMaterialIds.includes(m.material));

        // 更新すべきBOM（両方にあるもの）
        const toUpdate = materials.filter(m => existingMaterialIds.includes(m.material));

        // 削除実行
        await Promise.all(toDelete.map(bom => manufacturingMaterialApi.deleteBomItem(bom.id)));

        // 追加実行
        await Promise.all(toAdd.map(m =>
            manufacturingMaterialApi.createBomItem({
                manufacturing_item: manufacturingItemId,
                ...m
            })
        ));

        // 更新実行
        await Promise.all(toUpdate.map(m => {
            const existing = existingBom.find(bom => bom.material === m.material);
            if (existing) {
                return manufacturingMaterialApi.updateBomItem(existing.id, {
                    quantity_required: m.quantity_required,
                    notes: m.notes
                });
            }
            return Promise.resolve();
        }));

        // 更新後のBOMを取得して返す
        return manufacturingMaterialApi.getBomItems({ manufacturing_item: manufacturingItemId });
    },
};

// Material API
export const materialApi = {
    getMaterials: async (params?: {
        search?: string;
        category?: string;
        supplier_branch?: number;
        is_active?: boolean;
        low_stock?: boolean;
    }): Promise<Material[]> => {
        const response = await apiClient.get<PaginatedResponse<Material>>('/manufacturing/materials/', { params });
        return response.data.results;
    },

    getMaterial: async (id: number): Promise<Material> => {
        const response = await apiClient.get<Material>(`/manufacturing/materials/${id}/`);
        return response.data;
    },

    createMaterial: async (data: MaterialCreate): Promise<Material> => {
        const response = await apiClient.post<Material>('/manufacturing/materials/', data);
        return response.data;
    },

    updateMaterial: async (id: number, data: Partial<MaterialCreate>): Promise<Material> => {
        const response = await apiClient.patch<Material>(`/manufacturing/materials/${id}/`, data);
        return response.data;
    },

    deleteMaterial: async (id: number): Promise<void> => {
        await apiClient.delete(`/manufacturing/materials/${id}/`);
    },

    getActiveMaterials: async (): Promise<Material[]> => {
        const response = await apiClient.get<Material[]>('/manufacturing/materials/active/');
        return response.data;
    },

    getLowStockMaterials: async (): Promise<Material[]> => {
        const response = await apiClient.get<Material[]>('/manufacturing/materials/low_stock/');
        return response.data;
    },

    adjustStock: async (id: number, adjustment: number, reason?: string): Promise<Material> => {
        const response = await apiClient.post<Material>(
            `/manufacturing/materials/${id}/adjust_stock/`,
            { adjustment, reason }
        );
        return response.data;
    },
};
