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
    supplied_item_list: number;
    list_number?: string;
    customer_name?: string;
    status: ReceivingStatus;
    status_display?: string;
    receiving_date: string;
    items?: SuppliedItemReceivingItem[];
    items_count?: number;
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
    list_item?: number;
    item_number: string;
    quantity_per_box: number;
    box_count: number;
    calculated_quantity: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 支給品受入確認作成データ
export interface SuppliedItemReceivingCreateData {
    supplied_item_list: number;
    status?: ReceivingStatus;
    receiving_date?: string;
    notes?: string;
    items?: SuppliedItemReceivingItemCreateData[];
}

export type SuppliedItemReceivingUpdateData = Partial<SuppliedItemReceivingCreateData>;

// 支給品受入確認項目作成データ
export interface SuppliedItemReceivingItemCreateData {
    list_item?: number;
    item_number: string;
    quantity_per_box: number;
    box_count: number;
    notes?: string;
}

// 支給品在庫
export interface SuppliedItemInventory {
    id: number;
    supplied_item: number;
    item_number?: string;
    item_name?: string;
    unit?: string;
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

// CSV解析結果
export interface CSVParseResult {
    items: CSVParsedItem[];
    total_items: number;
    unregistered_part_numbers: UnregisteredPartNumber[];
    product_info: string[];
    suggested_products: SuggestedProduct[];
    issue_date?: string;
    errors?: string[];
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

// 推奨製品
export interface SuggestedProduct {
    id: number;
    product_number: string;
    product_name: string;
    matched_keyword: string;
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
