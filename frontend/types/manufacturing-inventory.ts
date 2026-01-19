// types/manufacturing-inventory.ts
// 製作品在庫管理用の型定義

/**
 * 製作品在庫のステータス
 */
export type FinishedGoodsInventoryStatus =
    | 'available'      // 出荷可能
    | 'reserved'       // 予約済み
    | 'quarantine'     // 検査中
    | 'defective';     // 不良品

/**
 * 製作品在庫調整の理由
 */
export type FinishedGoodsAdjustmentReason =
    | 'production_complete'  // 製造完了
    | 'shipment'            // 出荷
    | 'stocktaking'         // 棚卸
    | 'damage'              // 破損
    | 'quality_issue'       // 品質問題
    | 'correction'          // 訂正
    | 'other';              // その他

/**
 * 調整理由のラベル
 */
export const FinishedGoodsAdjustmentReasonLabels: Record<FinishedGoodsAdjustmentReason, string> = {
    production_complete: '製造完了',
    shipment: '出荷',
    stocktaking: '棚卸',
    damage: '破損',
    quality_issue: '品質問題',
    correction: '訂正',
    other: 'その他',
};

/**
 * 在庫ステータスのラベル
 */
export const FinishedGoodsInventoryStatusLabels: Record<FinishedGoodsInventoryStatus, string> = {
    available: '出荷可能',
    reserved: '予約済み',
    quarantine: '検査中',
    defective: '不良品',
};

/**
 * 製作品在庫レコード
 */
export interface FinishedGoodsInventory {
    id: number;
    manufacturing_item: number;
    manufacturing_number: string;
    manufacturing_name: string;
    product_id?: number;
    product_number?: string;
    product_name?: string;
    production_plan_id?: number;
    plan_number?: string;
    quantity: number;
    lot_number?: string;
    storage_location?: string;
    status: FinishedGoodsInventoryStatus;
    status_display?: string;
    unit: string;
    notes?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

/**
 * 製作品在庫作成データ
 */
export interface FinishedGoodsInventoryCreateData {
    manufacturing_item: number;
    production_plan_id?: number;
    quantity: number;
    lot_number?: string;
    storage_location?: string;
    status?: FinishedGoodsInventoryStatus;
    notes?: string;
}

/**
 * 製作品在庫更新データ
 */
export type FinishedGoodsInventoryUpdateData = Partial<FinishedGoodsInventoryCreateData>;

/**
 * 製作品別在庫サマリー（一覧表示用）
 */
export interface FinishedGoodsWithInventory {
    manufacturing_item_id: number;
    manufacturing_number: string;
    manufacturing_name: string;
    product_id?: number;
    product_number?: string;
    product_name?: string;
    unit: string;
    total_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    quarantine_quantity: number;
    defective_quantity: number;
    inventory_records?: FinishedGoodsInventoryRecord[];
}

/**
 * 製作品在庫レコード詳細
 */
export interface FinishedGoodsInventoryRecord {
    id: number;
    quantity: number;
    lot_number?: string;
    storage_location?: string;
    status: FinishedGoodsInventoryStatus;
    status_display?: string;
    plan_number?: string;
    completed_at?: string;
    notes?: string;
    created_at: string;
    created_by_name?: string;
}

/**
 * 製作品在庫調整リクエスト
 */
export interface FinishedGoodsAdjustmentRequest {
    inventory_id?: number;
    manufacturing_item_id?: number;
    adjustment_type: 'increase' | 'decrease';
    quantity: number;
    reason: FinishedGoodsAdjustmentReason;
    lot_number?: string;
    storage_location?: string;
    notes?: string;
}

/**
 * 製作品在庫調整レスポンス
 */
export interface FinishedGoodsAdjustmentResponse {
    message: string;
    inventory: FinishedGoodsInventory;
    quantity_before: number;
    quantity_after: number;
}

/**
 * 製作品在庫調整履歴
 */
export interface FinishedGoodsAdjustmentHistory {
    id: number;
    inventory_id: number;
    manufacturing_number: string;
    manufacturing_name: string;
    adjustment_type: 'increase' | 'decrease';
    adjustment_type_display: string;
    quantity: number;
    quantity_before: number;
    quantity_after: number;
    reason: FinishedGoodsAdjustmentReason;
    reason_display: string;
    lot_number?: string;
    notes?: string;
    created_at: string;
    created_by?: number;
    created_by_name?: string;
}

/**
 * 生産計画から在庫を登録するリクエスト
 */
export interface RegisterFromProductionPlanRequest {
    production_plan_id: number;
    quantity: number;
    lot_number?: string;
    storage_location?: string;
    notes?: string;
}

/**
 * 生産計画から在庫を登録するレスポンス
 */
export interface RegisterFromProductionPlanResponse {
    message: string;
    inventory: FinishedGoodsInventory;
    production_plan: {
        id: number;
        plan_number: string;
        completed_quantity: number;
        total_planned_quantity: number;
    };
}

/**
 * 製作品在庫検索パラメータ
 */
export interface FinishedGoodsInventorySearchParams {
    search?: string;
    manufacturing_item?: number;
    product?: number;
    status?: FinishedGoodsInventoryStatus;
    include_records?: boolean;
}

/**
 * 製作品在庫ダッシュボードデータ
 */
export interface FinishedGoodsInventoryDashboard {
    total_items: number;
    total_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    low_stock_items: FinishedGoodsWithInventory[];
    recent_adjustments: FinishedGoodsAdjustmentHistory[];
}

/**
 * 製作品在庫フィルタオプション
 */
export interface FinishedGoodsFilterOptions {
    products: Array<{ id: number; product_number: string; product_name: string }>;
    manufacturing_items: Array<{ id: number; manufacturing_number: string; manufacturing_name: string }>;
    statuses: Array<{ value: FinishedGoodsInventoryStatus; label: string }>;
}
