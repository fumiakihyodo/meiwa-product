// Purchase related types
export interface Part {
    id: number;
    product: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string; 
    customer_branch_name?: string;
    supplier_branch: number;
    supplier_name?: string;
    branch_name?: string;
    branch_display_name?: string;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    specification?: string;
    unit: string;
    order_type: string;
    standard_quantity: number;
    usage_quantity: number;
    minimum_order_quantity: number;
    lead_time_days?: number;
    quantity_per_product?: number;
    current_price?: number;
    has_multiple_active_prices?: boolean;
    price_history_count?: number;
    price_histories?: PriceHistory[];
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface PriceHistory {
    id: number;
    part: number;
    part_number?: string;
    part_name?: string;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    is_current?: boolean;
    is_future?: boolean;
    is_expired?: boolean;
    change_reason?: string;
    quote_file?: string;
    quote_file_name?: string;
    quote_file_size?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface PartCreateData {
    product: number;
    supplier_branch: number;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    specification?: string;
    unit?: string;
    order_type: string;
    standard_quantity?: number;
    usage_quantity?: number;
    minimum_order_quantity?: number;
    lead_time_days?: number;
    quantity_per_product?: number;
    is_active?: boolean;
    notes?: string;
}

export type PartUpdateData = Partial<PartCreateData>;

export interface PartFormData {
    product: number;
    supplier_branch: number;
    part_number: string;
    part_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    usage_quantity: number;
    minimum_order_quantity: number;
    lead_time_days?: number;
    is_active: boolean;
    notes?: string;
}

export interface PriceHistoryCreateData {
    part: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active?: boolean;
    change_reason?: string;
    quote_file?: File;
    notes?: string;
}

export type PriceHistoryUpdateData = Partial<PriceHistoryCreateData>;

// Supplied Item types
export interface SuppliedItem {
    id: number;
    product: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    customer_branch_name?: string;
    item_number: string;
    item_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    current_price?: number;
    has_multiple_active_prices?: boolean;
    price_history_count?: number;
    supplied_item_price_histories?: SuppliedItemPriceHistory[];
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface SuppliedItemPriceHistory {
    id: number;
    supplied_item: number;
    item_number?: string;
    item_name?: string;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    is_current?: boolean;
    is_future?: boolean;
    is_expired?: boolean;
    change_reason?: string;
    quote_file?: string;
    quote_file_name?: string;
    quote_file_size?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

export interface SuppliedItemCreateData {
    product: number;
    item_number: string;
    item_name: string;
    specification?: string;
    unit?: string;
    standard_quantity?: number;
    is_active?: boolean;
    notes?: string;
}

export type SuppliedItemUpdateData = Partial<SuppliedItemCreateData>;

export interface SuppliedItemFormData {
    product: number;
    item_number: string;
    item_name: string;
    specification?: string;
    unit: string;
    standard_quantity: number;
    is_active: boolean;
    notes?: string;
}

export interface SuppliedItemPriceHistoryCreateData {
    supplied_item: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active?: boolean;
    change_reason?: string;
    quote_file?: File;
    notes?: string;
}

export type SuppliedItemPriceHistoryUpdateData = Partial<SuppliedItemPriceHistoryCreateData>;


// ===== 在庫管理関連の型定義 =====

// 支給品リストのステータス
export type SuppliedItemListStatus =
    | 'draft'
    | 'pending_receiving'
    | 'receiving'
    | 'pending_count'
    | 'counting'
    | 'completed'
    | 'cancelled';

// 支給品リスト
export interface SuppliedItemList {
    id: number;
    list_number: string;
    product: number;
    product_name?: string;
    product_number?: string;
    customer_name?: string;
    issue_date: string;
    delivery_date?: string;
    csv_file?: string;
    status: SuppliedItemListStatus;
    status_display?: string;
    items?: SuppliedItemListItem[];
    total_items?: number;
    total_quantity?: number;
    received_items_count?: number;
    count_confirmed_items_count?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 支給品リスト項目
export interface SuppliedItemListItem {
    id: number;
    supplied_item_list: number;
    supplied_item?: number;
    item_number: string;
    item_name: string;
    quantity: number;
    quantity_per_box?: number;
    box_count?: number;
    unit: string;
    receiving_confirmed: boolean;
    receiving_confirmed_at?: string;
    receiving_confirmed_by?: number;
    receiving_confirmed_by_name?: string;
    received_quantity?: number;
    is_quantity_matched?: boolean | null;
    count_confirmed: boolean;
    count_confirmed_at?: string;
    count_confirmed_by?: number;
    count_confirmed_by_name?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 支給品リスト作成データ
export interface SuppliedItemListCreateData {
    product: number;
    issue_date: string;
    delivery_date?: string;
    csv_file?: File;
    status?: SuppliedItemListStatus;
    notes?: string;
    items?: SuppliedItemListItemCreateData[];
}

// 取引先情報（製品より取得）
export interface CustomerInfo {
    customer_name?: string;
}

export type SuppliedItemListUpdateData = Partial<SuppliedItemListCreateData>;

// 支給品リスト項目作成データ
export interface SuppliedItemListItemCreateData {
    supplied_item_list?: number;
    supplied_item?: number;
    item_number: string;
    item_name: string;
    quantity: number;
    quantity_per_box?: number;
    box_count?: number;
    unit?: string;
    notes?: string;
}

// 受入確認のステータス
export type ReceivingStatus = 'draft' | 'completed';

// 支給品受入確認
export interface SuppliedItemReceiving {
    id: number;
    supplied_item_list?: number | null;
    supplied_item_lists?: number[];  // 多対多紐づけ
    product?: number | null;
    list_number?: string;
    list_numbers?: string[];  // 多対多紐づけの全リスト番号
    list_ids?: number[];  // 多対多紐づけの全リストID
    product_number?: string;
    product_name?: string;
    status: ReceivingStatus;
    status_display?: string;
    receiving_date: string;
    items?: SuppliedItemReceivingItem[];
    items_count?: number;
    total_quantity?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 支給品受入確認項目
export interface SuppliedItemReceivingItem {
    id: number;
    receiving: number;
    supplied_item?: number;
    list_item?: number;
    item_number: string;
    item_name?: string;
    quantity_per_box: number;
    box_count: number;
    calculated_quantity: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 支給品受入確認作成データ
export interface SuppliedItemReceivingCreateData {
    supplied_item_list?: number | null;
    list_ids?: number[];  // 多対多紐づけ用
    product?: number | null;
    status?: ReceivingStatus;
    receiving_date?: string;
    notes?: string;
    items?: SuppliedItemReceivingItemCreateData[];
}

export type SuppliedItemReceivingUpdateData = Partial<SuppliedItemReceivingCreateData>;

// 支給品受入確認項目作成データ
export interface SuppliedItemReceivingItemCreateData {
    supplied_item?: number;
    list_item?: number;
    item_number: string;
    item_name?: string;
    quantity_per_box: number;
    box_count: number;
    notes?: string;
}

// 部品別受入一覧項目
export interface ReceivingItemListItem {
    id: number;
    item_number: string;
    item_name: string;
    quantity_per_box: number;
    box_count: number;
    calculated_quantity: number;
    notes: string;
    receiving_id: number;
    receiving_date: string;
    receiving_status: ReceivingStatus;
    receiving_status_display: string;
    list_number: string | null;
    list_id: number | null;
    product_id: number | null;
    product_number: string | null;
    product_name: string | null;
    confirmed_quantity_for_item_number?: number; // 員数確認済み数量（品番・製品ごと）
}

// 支給品在庫
export interface SuppliedItemInventory {
    id: number;
    supplied_item: number;
    item_number?: string;
    item_name?: string;
    unit?: string;
    product?: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    list_item?: number;
    list_number?: string;
    quantity: number;
    lot_number?: string;
    received_date: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 支給品在庫作成データ
export interface SuppliedItemInventoryCreateData {
    supplied_item: number;
    list_item?: number;
    quantity: number;
    lot_number?: string;
    received_date?: string;
    notes?: string;
}

export type SuppliedItemInventoryUpdateData = Partial<SuppliedItemInventoryCreateData>;

// 受入確認フォーム入力行
export interface ReceivingInputRow {
    id: string;  // 一時的なID（UUID等）
    item_number: string;
    quantity_per_box: number | '';
    box_count: number | '';
    calculated_quantity: number;
    list_item_id?: number;
    notes?: string;
}

// 員数確認データ
export interface CountConfirmData {
    count_confirmed: boolean;
    notes?: string;
}

// 受入確認データ
export interface ReceivingConfirmData {
    receiving_confirmed: boolean;
    received_quantity?: number;
    notes?: string;
}

// CSV解析された品目
export interface CSVParsedItem {
    item_number: string;
    item_name: string;
    quantity: number;
    unit: string;
}

// 未登録品番
export interface UnregisteredPartNumber {
    item_number: string;
    item_name: string;
    quantity: number;
    unit: string;
}

// 推奨製品（model_infoベース）
export interface SuggestedProduct {
    id: number;
    product_number: string;
    product_name: string;
    model_info: string;
    match_type: 'exact' | 'partial';
}

// model_info グループ
export interface ModelInfoGroup {
    model_info: string;
    items: CSVParsedItem[];
    total_items: number;
    unregistered_items: UnregisteredPartNumber[];
    suggested_product: SuggestedProduct | null;
}

// model_info なしグループ
export interface ItemsWithoutModelInfoGroup {
    items: CSVParsedItem[];
    total_items: number;
    unregistered_items: UnregisteredPartNumber[];
}

// CSV解析結果
export interface CSVParseResult {
    model_info_groups: ModelInfoGroup[];
    items_without_model_info: ItemsWithoutModelInfoGroup | null;
    issue_date?: string;
    errors?: string[] | null;
}

// CSV インポート作成データ
export interface CSVImportCreateData {
    product_id: number;
    issue_date: string;
    items: CSVParsedItem[];
    csv_file: File;
    register_unregistered: boolean;
    unregistered_items?: UnregisteredPartNumber[];
    product_info?: string[];
}

// ===== リストと受入れ数量の比較関連 =====

// 比較結果の項目
export interface ReceivingComparisonItem {
    list_item_id: number;
    item_number: string;
    item_name: string;
    list_quantity: number;
    total_received: number;
    is_sufficient: boolean;
    difference: number;
    receiving_confirmed: boolean;
    count_confirmed: boolean;
}

// リスト未登録品番
export interface UnregisteredReceivingItem {
    item_number: string;
    item_name: string;
    total_received: number;
    receivings?: {
        receiving_id: number;
        receiving_date: string | null;
        quantity: number;
    }[];
}

// 比較結果のサマリー
export interface ReceivingComparisonSummary {
    total_items: number;
    sufficient_items: number;
    confirmed_items: number;
    unregistered_count: number;
}

// 比較API結果
export interface ReceivingComparisonResult {
    list_id: number;
    list_number: string;
    product_id: number;
    comparison: ReceivingComparisonItem[];
    unregistered_items: UnregisteredReceivingItem[];
    summary: ReceivingComparisonSummary;
}

// 一括確認API結果
export interface BulkConfirmReceivingResult {
    message: string;
    confirmed_count: number;
    skipped_count: number;
    list_status: SuppliedItemListStatus;
}

// リスト未登録品番取得API結果
export interface UnregisteredItemsResult {
    list_id: number;
    list_number: string;
    unregistered_items: UnregisteredReceivingItem[];
    total_count: number;
}

// 受入状況サマリー
export interface ReceivingSummary {
    list_id: number;
    list_number: string;
    total_list_quantity: number;
    total_received_quantity: number;
    difference: number;
    is_sufficient: boolean;
    has_shortage: boolean;
    has_excess: boolean;
    // SKUベースのカウント
    total_sku_count: number;
    completed_sku_count: number;
    incomplete_sku_count: number;
}
