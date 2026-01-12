// types/production-planning.ts
// 生産計画機能で使用する型定義

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

/** 検索パラメータの型 */
export interface PlanSearchParams {
    search?: string;
    status?: ProductionPlanStatus;
}

export interface ItemSearchParams {
    search?: string;
}

export interface MaterialSearchParams {
    search?: string;
    category?: MaterialCategory;
}
