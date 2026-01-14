// types/production-planning.ts
// 生産計画機能で使用する型定義

/** 生産タイプ（国内/海外） */
export type ProductionType = 'domestic' | 'overseas';

/** 生産計画のステータス */
export type ProductionPlanStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

/** 製造スケジュールのステータス */
export type ProductionScheduleStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

/** 材料カテゴリ */
export type MaterialCategory = 'raw' | 'semi_finished' | 'component' | 'consumable' | 'other';

/** モーダルのモード */
export type ModalMode = 'create' | 'edit' | 'view';

/** ステータスの表示ラベル */
export const PLAN_STATUS_LABELS: Record<ProductionPlanStatus, string> = {
    draft: '下書き',
    planned: '計画済み',
    in_progress: '製造中',
    completed: '完了',
    cancelled: 'キャンセル',
    on_hold: '保留',
};

/** ステータスの色設定 */
export const PLAN_STATUS_COLORS: Record<ProductionPlanStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    draft: 'default',
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'error',
    on_hold: 'secondary',
};

/** スケジュールステータスの表示ラベル */
export const SCHEDULE_STATUS_LABELS: Record<ProductionScheduleStatus, string> = {
    planned: '計画済み',
    in_progress: '製造中',
    completed: '完了',
    cancelled: 'キャンセル',
};

/** スケジュールステータスの色設定 */
export const SCHEDULE_STATUS_COLORS: Record<ProductionScheduleStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'error',
};

/** 材料カテゴリの表示ラベル */
export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
    raw: '原材料',
    semi_finished: '半製品',
    component: '部品',
    consumable: '消耗品',
    other: 'その他',
};

/** ステータス選択オプション */
export const STATUS_OPTIONS: { value: ProductionPlanStatus; label: string }[] = [
    { value: 'draft', label: '下書き' },
    { value: 'planned', label: '計画済み' },
    { value: 'in_progress', label: '製造中' },
    { value: 'completed', label: '完了' },
    { value: 'cancelled', label: 'キャンセル' },
    { value: 'on_hold', label: '保留' },
];

/** カテゴリ選択オプション */
export const CATEGORY_OPTIONS: { value: MaterialCategory; label: string }[] = [
    { value: 'raw', label: '原材料' },
    { value: 'semi_finished', label: '半製品' },
    { value: 'component', label: '部品' },
    { value: 'consumable', label: '消耗品' },
    { value: 'other', label: 'その他' },
];

/** 生産タイプの表示ラベル */
export const PRODUCTION_TYPE_LABELS: Record<ProductionType, string> = {
    domestic: '国内生産',
    overseas: '海外生産',
};

/** 生産タイプの色設定 */
export const PRODUCTION_TYPE_COLORS: Record<ProductionType, 'primary' | 'secondary' | 'info' | 'success'> = {
    domestic: 'primary',
    overseas: 'secondary',
};

/** 生産タイプ選択オプション */
export const PRODUCTION_TYPE_OPTIONS: { value: ProductionType; label: string }[] = [
    { value: 'domestic', label: '国内生産' },
    { value: 'overseas', label: '海外生産' },
];

/** 検索パラメータの型 */
export interface PlanSearchParams {
    search?: string;
    status?: ProductionPlanStatus;
    production_type?: ProductionType;
    product_number?: string;
    product_name?: string;
}

export interface ItemSearchParams {
    search?: string;
    production_type?: ProductionType;
}

export interface MaterialSearchParams {
    search?: string;
    category?: MaterialCategory;
}

/** 生産計画統計情報 */
export interface ProductionPlanStatistics {
    production_type: ProductionType;
    production_type_display: string;
    total_plans: number;
    active_plans: number;
    completed_plans: number;
    total_planned_quantity: number;
    total_completed_quantity: number;
    overall_completion_rate: number;
}

/** 生産計画概要レスポンス */
export interface ProductionPlanOverview {
    domestic: {
        statistics: ProductionPlanStatistics;
        recent_plans: ProductionPlanListItem[];
    };
    overseas: {
        statistics: ProductionPlanStatistics;
        recent_plans: ProductionPlanListItem[];
    };
}

/** 生産計画一覧アイテム */
export interface ProductionPlanListItem {
    id: number;
    plan_number: string;
    manufacturing_item: number;
    manufacturing_item_number: string;
    manufacturing_item_name: string;
    production_type: ProductionType;
    production_type_display: string;
    product: number | null;
    product_number: string | null;
    product_name: string | null;
    total_planned_quantity: number;
    completed_quantity: number;
    remaining_quantity: number;
    completion_rate: number;
    schedule_count: number;
    planned_start_date: string | null;
    planned_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    status: ProductionPlanStatus;
    status_display: string;
    priority: number;
    notes: string;
    created_at: string;
    updated_at: string;
}

/** 生産計画詳細 */
export interface ProductionPlanDetail extends ProductionPlanListItem {
    total_scheduled_quantity: number;
    schedules: ProductionScheduleItem[];
    created_by: number | null;
    created_by_name: string | null;
}

/** 生産スケジュールアイテム */
export interface ProductionScheduleItem {
    id: number;
    schedule_number: string;
    quantity: number;
    completed_quantity: number;
    completion_rate: number;
    started_at: string | null;
    finished_at: string | null;
    actual_started_at: string | null;
    actual_finished_at: string | null;
    status: ProductionScheduleStatus;
    assigned_to: number | null;
    assigned_to_name: string | null;
    production_line: string;
    notes: string;
    created_at: string;
    updated_at: string;
}

/** 制作品一覧アイテム（生産計画用） */
export interface ManufacturingItemForPlanning {
    id: number;
    manufacturing_number: string;
    manufacturing_name: string;
    production_type: ProductionType;
    production_type_display: string;
    product: number | null;
    product_number: string | null;
    product_name: string | null;
    unit: string;
    standard_production_time: string | null;
    is_active: boolean;
    active_plan_count: number;
    total_planned_quantity: number | null;
    created_at: string;
    updated_at: string;
}

/** 生産計画作成データ */
export interface ProductionPlanCreateData {
    manufacturing_item: number;
    product?: number | null;
    total_planned_quantity: number;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    status?: ProductionPlanStatus;
    priority?: number;
    notes?: string;
    schedules?: ProductionScheduleCreateData[];
}

/** 生産計画更新データ */
export interface ProductionPlanUpdateData {
    manufacturing_item?: number;
    product?: number | null;
    total_planned_quantity?: number;
    completed_quantity?: number;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    actual_start_date?: string | null;
    actual_end_date?: string | null;
    status?: ProductionPlanStatus;
    priority?: number;
    notes?: string;
}

/** 生産スケジュール作成データ */
export interface ProductionScheduleCreateData {
    quantity: number;
    started_at?: string | null;
    finished_at?: string | null;
    assigned_to?: number | null;
    production_line?: string;
    notes?: string;
}

/** 分納スケジュール（フロントエンド表示用） */
export interface DeliveryScheduleItem {
    id?: number;
    delivery_date: string;  // 分納日
    quantity: number;       // 分納数量
    auto_stock_enabled: boolean;  // 自動在庫登録有効フラグ
}

/** 分納スケジュール作成データ（API送信用） */
export interface DeliveryScheduleCreateData {
    quantity: number;
    finished_at: string;  // 分納日をfinished_atとして送信
    notes: string;        // JSON形式で追加設定を保存
}

/** 分納バリデーションエラー */
export interface DeliveryValidationErrors {
    delivery_date?: string;
    quantity?: string;
    total?: string;
}

/** 生産計画作成データ（分納対応版） */
export interface ProductionPlanCreateDataWithDeliveries extends Omit<ProductionPlanCreateData, 'schedules'> {
    auto_stock_enabled: boolean;  // 自動在庫登録フラグ
    deliveries?: DeliveryScheduleItem[];  // 分納スケジュール
}
