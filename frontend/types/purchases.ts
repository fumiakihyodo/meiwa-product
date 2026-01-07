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


// ===== 購入品管理関連の型定義 =====

// 発注ステータス
export type PurchaseOrderStatus =
    | 'draft'
    | 'ordered'
    | 'partially_received'
    | 'received'
    | 'pending_count'
    | 'counting'
    | 'completed'
    | 'cancelled';

// 発注
export interface PurchaseOrder {
    id: number;
    order_number: string;
    product: number;
    product_name?: string;
    product_number?: string;
    customer_name?: string;
    supplier_branch: number;
    supplier_name?: string;
    supplier_branch_name?: string;
    order_date: string;
    requested_delivery_date?: string;
    confirmed_delivery_date?: string;
    status: PurchaseOrderStatus;
    status_display?: string;
    items?: PurchaseOrderItem[];
    total_items?: number;
    total_quantity?: number;
    total_amount?: number;
    received_items_count?: number;
    count_confirmed_items_count?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 発注明細
export interface PurchaseOrderItem {
    id: number;
    purchase_order: number;
    part: number;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
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
    supplier_name?: string;
    supplier_branch_name?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 発注作成データ
export interface PurchaseOrderCreateData {
    product: number;
    supplier_branch: number;
    order_date?: string;
    requested_delivery_date?: string;
    confirmed_delivery_date?: string;
    status?: PurchaseOrderStatus;
    notes?: string;
    items?: PurchaseOrderItemCreateData[];
}

export type PurchaseOrderUpdateData = Partial<PurchaseOrderCreateData>;

// 発注明細作成データ
export interface PurchaseOrderItemCreateData {
    part: number;
    part_number: string;
    part_name: string;
    quantity: number;
    unit_price?: number;
    unit?: string;
    notes?: string;
}

// 購入品受入確認
export interface PurchaseReceiving {
    id: number;
    purchase_orders?: number[];
    order_numbers?: string[];
    order_ids?: number[];
    product?: number;
    product_number?: string;
    product_name?: string;
    supplier_branch?: number;
    supplier_name?: string;
    supplier_branch_name?: string;
    status: ReceivingStatus;
    status_display?: string;
    receiving_date: string;
    items?: PurchaseReceivingItem[];
    items_count?: number;
    total_quantity?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 購入品受入確認項目
export interface PurchaseReceivingItem {
    id: number;
    receiving: number;
    order_item?: number;
    part?: number;
    part_number: string;
    part_name?: string;
    quantity_per_box: number;
    box_count: number;
    calculated_quantity: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 購入品受入確認作成データ
export interface PurchaseReceivingCreateData {
    order_ids?: number[];
    product?: number;
    supplier_branch?: number;
    status?: ReceivingStatus;
    receiving_date?: string;
    notes?: string;
    items?: PurchaseReceivingItemCreateData[];
}

export type PurchaseReceivingUpdateData = Partial<PurchaseReceivingCreateData>;

// 購入品受入確認項目作成データ
export interface PurchaseReceivingItemCreateData {
    order_item?: number;
    part?: number;
    part_number: string;
    part_name?: string;
    quantity_per_box: number;
    box_count: number;
    notes?: string;
}

// 購入品在庫
export interface PurchasedItemInventory {
    id: number;
    part: number;
    part_number?: string;
    part_name?: string;
    unit?: string;
    product?: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    supplier_name?: string;
    supplier_branch_name?: string;
    order_item?: number;
    order_number?: string;
    quantity: number;
    lot_number?: string;
    received_date: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 購入品在庫作成データ
export interface PurchasedItemInventoryCreateData {
    part: number;
    order_item?: number;
    quantity: number;
    lot_number?: string;
    received_date?: string;
    notes?: string;
}

export type PurchasedItemInventoryUpdateData = Partial<PurchasedItemInventoryCreateData>;

// 購入品在庫（部品マスター付き）- 在庫0含む
export interface PartWithInventory {
    part_id: number;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    unit: string;
    product_id: number;
    product_number?: string;
    product_name?: string;
    supplier_name?: string;
    supplier_branch_name?: string;
    customer_name?: string;
    total_quantity: number;
    inventory_records?: InventoryRecord[];
}

// 支給品在庫（支給品マスター付き）- 在庫0含む
export interface SuppliedItemWithInventory {
    supplied_item_id: number;
    item_number: string;
    item_name: string;
    unit: string;
    product_id: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    total_quantity: number;
    inventory_records?: SuppliedItemInventoryRecord[];
}

// 支給品在庫レコード
export interface SuppliedItemInventoryRecord {
    id: number;
    quantity: number;
    lot_number?: string;
    received_date?: string;
    list_number?: string;
    notes?: string;
    created_at?: string;
    created_by_name?: string;
}

// 在庫レコード
export interface InventoryRecord {
    id: number;
    quantity: number;
    lot_number?: string;
    received_date?: string;
    order_number?: string;
    notes?: string;
    created_at?: string;
    created_by_name?: string;
}

// 発注作成用：サプライヤー別部品グループ
export interface SupplierPartsGroup {
    supplier_branch_id: number;
    supplier_name: string;
    branch_name: string;
    parts: PartForOrder[];
}

// 発注作成用：部品情報
export interface PartForOrder {
    id: number;
    part_number: string;
    part_name: string;
    supplier_part_name?: string;
    specification?: string;
    unit: string;
    order_type: 'MOQ' | 'SPQ' | 'SNP' | 'OTHER';
    minimum_order_quantity: number;
    current_price?: number;
    is_active: boolean;
}

// 発注作成リクエスト
export interface CreateOrdersFromPartsRequest {
    product: number;
    items: {
        part: number;
        quantity: number;
    }[];
    order_date?: string;
    requested_delivery_date?: string;
    notes?: string;
}

// 発注作成レスポンス
export interface CreateOrdersFromPartsResponse {
    message: string;
    orders: PurchaseOrder[];
}

// 一括受入確認レスポンス
export interface BulkConfirmPurchaseReceivingResult {
    message: string;
    order: PurchaseOrder;
}

// 一括員数確認レスポンス
export interface BulkConfirmPurchaseCountResult {
    message: string;
    order: PurchaseOrder;
}

// ===== 在庫管理ダッシュボード関連の型定義 =====

// 支給品リストサマリー（ダッシュボード用）
export interface PendingSuppliedItemList {
    id: number;
    list_number: string;
    product_id: number | null;
    product_name: string | null;
    product_number: string | null;
    issue_date: string;
    delivery_date: string | null;
    status: SuppliedItemListStatus;
    status_display: string;
    total_items: number;
    received_items_count: number;
    count_confirmed_items_count: number;
}

// 購入発注サマリー（ダッシュボード用）
export interface PendingPurchaseOrder {
    id: number;
    order_number: string;
    product_id: number | null;
    product_name: string | null;
    product_number: string | null;
    supplier_name: string | null;
    supplier_branch_name: string | null;
    order_date: string;
    requested_delivery_date: string | null;
    confirmed_delivery_date: string | null;
    status: PurchaseOrderStatus;
    status_display: string;
    total_items: number;
    total_quantity: number;
    received_quantity: number;
    unreceived_quantity: number;
    received_items_count: number;
    count_confirmed_items_count: number;
}

// 未受領品目（ダッシュボード用）
export interface UnreceivedPurchaseItem {
    order_id: number;
    order_number: string;
    order_item_id: number;
    part_id: number;
    part_number: string;
    part_name: string;
    product_id?: number;
    product_name: string | null;
    product_number?: string | null;
    supplier_branch_id?: number;
    supplier_name: string | null;
    supplier_branch_name?: string | null;
    ordered_quantity: number;
    received_quantity: number;
    unreceived_quantity: number;
    unit: string;
    unit_price?: number | null;
    order_date: string;
    requested_delivery_date: string | null;
    confirmed_delivery_date?: string | null;
    order_status?: PurchaseOrderStatus;
    order_status_display?: string;
}

// 在庫管理ダッシュボードデータ
export interface InventoryDashboardData {
    supplied_item_lists: {
        pending_count: number;
        pending_lists: PendingSuppliedItemList[];
    };
    purchase_orders: {
        pending_count: number;
        pending_orders: PendingPurchaseOrder[];
        unreceived_items: UnreceivedPurchaseItem[];
    };
    inventory_summary: {
        supplied_items_total: number;
        purchased_items_total: number;
    };
}

// ===== 購入品受領処理関連の型定義 =====

// 受領リクエスト（個別）
export interface ReceivePurchaseItemRequest {
    received_quantity: number;
    lot_number?: string;
    notes?: string;
}

// 受領レスポンス（個別）
export interface ReceivePurchaseItemResponse {
    message: string;
    order_item: {
        id: number;
        part_number: string;
        part_name: string;
        quantity: number;
        received_quantity: number;
        unreceived_quantity: number;
        receiving_confirmed: boolean;
    };
    order: {
        id: number;
        order_number: string;
        status: PurchaseOrderStatus;
        status_display: string;
    };
}

// 一括受領リクエスト
export interface BulkReceivePurchaseOrderRequest {
    items: {
        order_item_id: number;
        received_quantity: number;
        lot_number?: string;
    }[];
    notes?: string;
}

// 一括受領レスポンス
export interface BulkReceivePurchaseOrderResponse {
    message: string;
    order: PurchaseOrder;
}

// 未受領購入品リストレスポンス
export interface UnreceivedPurchaseItemsResponse {
    count: number;
    items: UnreceivedPurchaseItem[];
}

// ===== 在庫調整関連の型定義 =====

// 在庫調整理由
export type InventoryAdjustmentReason =
    | 'stocktaking'      // 棚卸
    | 'non_conformance'  // 不適合
    | 'damage'           // 破損
    | 'correction'       // 訂正
    | 'other';           // その他

// 在庫調整理由の表示名
export const InventoryAdjustmentReasonLabels: Record<InventoryAdjustmentReason, string> = {
    stocktaking: '棚卸',
    non_conformance: '不適合',
    damage: '破損',
    correction: '訂正',
    other: 'その他',
};

// 在庫調整データ（従来の形式、互換性のため残す）
export interface InventoryAdjustmentData {
    quantity_change: number;          // 増減数（正: 増加、負: 減少）
    reason: InventoryAdjustmentReason;
    notes?: string;
}

// 在庫タイプ
export type InventoryItemType = 'supplied' | 'purchased';

// 在庫タイプの表示名
export const InventoryItemTypeLabels: Record<InventoryItemType, string> = {
    supplied: '支給品',
    purchased: '購入品',
};

// 調整タイプ
export type AdjustmentType = 'increase' | 'decrease';

// 調整タイプの表示名
export const AdjustmentTypeLabels: Record<AdjustmentType, string> = {
    increase: '増加',
    decrease: '減少',
};

// 在庫調整レコード（APIレスポンス）
export interface InventoryAdjustment {
    id: number;
    item_type: InventoryItemType;
    item_type_display: string;
    supplied_item_inventory: number | null;
    purchased_item_inventory: number | null;
    item_number: string;
    item_name: string;
    unit?: string;
    product_number?: string;
    product_name?: string;
    adjustment_type: AdjustmentType;
    adjustment_type_display: string;
    quantity: number;
    quantity_before: number;
    quantity_after: number;
    reason: InventoryAdjustmentReason;
    reason_display: string;
    notes: string;
    created_at: string;
    updated_at: string;
    created_by: number;
    created_by_name: string;
}

// 在庫調整作成リクエスト
export interface InventoryAdjustmentCreateRequest {
    item_type: InventoryItemType;
    supplied_item_inventory?: number;
    purchased_item_inventory?: number;
    adjustment_type: AdjustmentType;
    quantity: number;
    reason: InventoryAdjustmentReason;
    notes?: string;
}

// 在庫調整用の在庫アイテム（APIレスポンス）
export interface InventoryForAdjustment {
    id: number;
    item_type: InventoryItemType;
    item_type_display: string;
    inventory_id: number;
    item_number: string;
    item_name: string;
    unit?: string;
    quantity: number;
    product_id?: number;
    product_number?: string;
    product_name?: string;
    customer_name?: string;
    supplier_name?: string;
    supplier_branch_name?: string;
    lot_number?: string;
    received_date?: string;
}
