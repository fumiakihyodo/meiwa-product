// types/import.ts
// 輸入管理・OCR登録機能の型定義

// ===== 輸入PO (Purchase Order) 関連 =====

// 輸入POステータス
export type ImportPOStatus =
    | 'draft'           // 下書き
    | 'confirmed'       // 確定
    | 'shipped'         // 出荷済み
    | 'arrived'         // 到着済み
    | 'completed'       // 完了
    | 'cancelled';      // キャンセル

export const ImportPOStatusLabels: Record<ImportPOStatus, string> = {
    draft: '下書き',
    confirmed: '確定',
    shipped: '出荷済み',
    arrived: '到着済み',
    completed: '完了',
    cancelled: 'キャンセル',
};

// 輸入PO
export interface ImportPO {
    id: number;
    po_number: string;
    supplier_branch: number;
    supplier_name?: string;
    supplier_branch_name?: string;
    order_date: string;
    expected_ship_date?: string;
    expected_arrival_date?: string;
    status: ImportPOStatus;
    status_display?: string;
    items?: ImportPOItem[];
    total_items?: number;
    total_quantity?: number;
    total_amount?: number;
    currency?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// 輸入PO明細
export interface ImportPOItem {
    id: number;
    import_po: number;
    material?: number;
    material_code?: string;
    material_name?: string;
    part_number: string;
    description: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
    unit: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// 輸入PO作成データ
export interface ImportPOCreateData {
    supplier_branch: number;
    order_date?: string;
    expected_ship_date?: string;
    expected_arrival_date?: string;
    status?: ImportPOStatus;
    currency?: string;
    notes?: string;
    items?: ImportPOItemCreateData[];
}

export type ImportPOUpdateData = Partial<ImportPOCreateData>;

// 輸入PO明細作成データ
export interface ImportPOItemCreateData {
    material?: number;
    part_number: string;
    description: string;
    quantity: number;
    unit_price?: number;
    unit?: string;
    notes?: string;
}

// ===== インボイス関連 =====

// インボイスステータス
export type ImportInvoiceStatus =
    | 'draft'           // 下書き
    | 'pending'         // 処理待ち
    | 'processing'      // 処理中
    | 'completed'       // 完了
    | 'cancelled';      // キャンセル

export const ImportInvoiceStatusLabels: Record<ImportInvoiceStatus, string> = {
    draft: '下書き',
    pending: '処理待ち',
    processing: '処理中',
    completed: '完了',
    cancelled: 'キャンセル',
};

// ファイルタイプ
export type ImportFileType = 'waybill' | 'invoice' | 'bill';

export const ImportFileTypeLabels: Record<ImportFileType, string> = {
    waybill: 'Waybill',
    invoice: 'Invoice',
    bill: '請求書',
};

// 添付ファイル
export interface ImportFile {
    id: number;
    file_type: ImportFileType;
    file_type_display?: string;
    file: string;
    file_name: string;
    file_size?: number;
    uploaded_at: string;
    uploaded_by?: number;
    uploaded_by_name?: string;
}

// インボイス
export interface ImportInvoice {
    id: number;
    invoice_number: string;
    supplier_branch: number;
    supplier_name?: string;
    supplier_branch_name?: string;
    invoice_date: string;
    received_date?: string;
    status: ImportInvoiceStatus;
    status_display?: string;
    linked_pos?: ImportPO[];
    linked_po_ids?: number[];
    files?: ImportFile[];
    items?: ImportInvoiceItem[];
    total_items?: number;
    total_quantity?: number;
    total_amount?: number;
    currency?: string;
    transportation_fee?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

// インボイス明細
export interface ImportInvoiceItem {
    id: number;
    import_invoice: number;
    import_po_item?: number;
    material?: number;
    material_code?: string;
    material_name?: string;
    part_number: string;
    description: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
    unit: string;
    // 半製品在庫登録用
    registered_as_semi_finished?: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// インボイス作成データ
export interface ImportInvoiceCreateData {
    invoice_number?: string;
    supplier_branch: number;
    invoice_date: string;
    received_date?: string;
    status?: ImportInvoiceStatus;
    linked_po_ids?: number[];
    currency?: string;
    transportation_fee?: number;
    notes?: string;
    items?: ImportInvoiceItemCreateData[];
}

export type ImportInvoiceUpdateData = Partial<ImportInvoiceCreateData>;

// インボイス明細作成データ
export interface ImportInvoiceItemCreateData {
    import_po_item?: number;
    material?: number;
    part_number: string;
    description: string;
    quantity: number;
    unit_price?: number;
    unit?: string;
    notes?: string;
}

// ファイルアップロードデータ
export interface ImportFileUploadData {
    invoice_id: number;
    file_type: ImportFileType;
    file: File;
}

// ===== OCR関連 =====

// OCR抽出結果アイテム
export interface OCRExtractedItem {
    id: string;  // 一時ID（UUID）
    part_number: string;
    description: string;
    quantity: number;
    unit_price?: number;
    confidence: number;  // OCR信頼度 0-1
    raw_text?: string;   // 元のOCRテキスト
    is_matched?: boolean; // マスターとマッチしたか
    matched_material_id?: number;
    matched_material_code?: string;
    matched_material_name?: string;
}

// OCR抽出結果
export interface OCRExtractionResult {
    success: boolean;
    items: OCRExtractedItem[];
    invoice_number?: string;
    invoice_date?: string;
    supplier_name?: string;
    total_amount?: number;
    currency?: string;
    raw_text: string;
    processing_time_ms: number;
    errors?: string[];
}

// OCR設定（サプライヤーごとのOCRパターン）
export interface OCRSupplierConfig {
    supplier_branch_id: number;
    part_number_pattern?: string;
    quantity_pattern?: string;
    price_pattern?: string;
    date_format?: string;
    notes?: string;
}

// ===== 海外サプライヤー関連 =====

// サプライヤーが海外かどうかを判定する拡張フラグ
export interface OverseasSupplierInfo {
    supplier_branch_id: number;
    is_overseas: boolean;
    country?: string;
    currency?: string;
    language?: string;
    timezone?: string;
}

// ===== 半製品在庫関連 =====

// 半製品在庫作成データ（インボイスから登録）
export interface SemiFinishedInventoryCreateData {
    material_id: number;
    quantity: number;
    invoice_item_id?: number;
    lot_number?: string;
    received_date?: string;
    notes?: string;
}

// ===== フォーム関連 =====

// OCR入力フォーム用の行データ
export interface OCRFormRow {
    id: string;
    part_number: string;
    description: string;
    quantity: number | '';
    unit_price: number | '';
    unit: string;
    confidence?: number;
    is_matched?: boolean;
    matched_material_id?: number;
    notes?: string;
}

// インボイス登録フォームデータ
export interface ImportInvoiceFormData {
    invoice_number: string;
    supplier_branch_id: number | null;
    invoice_date: string;
    received_date: string;
    linked_po_ids: number[];
    items: OCRFormRow[];
    notes: string;
}

// ===== API レスポンス =====

// インボイス登録レスポンス
export interface ImportInvoiceRegisterResponse {
    message: string;
    invoice: ImportInvoice;
    registered_inventory_count: number;
    errors?: string[];
}

// OCR処理レスポンス
export interface OCRProcessResponse {
    success: boolean;
    result: OCRExtractionResult;
    message: string;
}

// ファイルダウンロード用
export interface FileDownloadParams {
    invoice_id: number;
    file_id: number;
}

// ===== PO Matching & Validation =====

// PO明細の残数情報
export interface POItemRemaining {
    po_item_id: number;
    part_number: string;
    description: string;
    ordered_quantity: number;
    received_quantity: number;
    remaining_quantity: number;
    unit_price?: number;
    unit: string;
}

// インボイス明細とPO明細のマッチング結果
export interface InvoiceItemPOMatch {
    invoice_item: ImportInvoiceItem | ImportInvoiceItemCreateData;
    matched_po_item?: POItemRemaining;
    is_valid: boolean;
    validation_errors: string[];
}

// インボイス全体のPO整合性チェック結果
export interface InvoicePOValidationResult {
    is_all_valid: boolean;
    matched_items: InvoiceItemPOMatch[];
    summary: {
        total_items: number;
        valid_items: number;
        invalid_items: number;
        unmatched_items: number;
    };
}
