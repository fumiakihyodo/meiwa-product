// utils/poValidation.ts
// PO（発注）とインボイスの整合性チェックロジック

import {
    ImportPO,
    ImportPOItem,
    ImportInvoiceItem,
    ImportInvoiceItemCreateData,
    POItemRemaining,
    InvoiceItemPOMatch,
    InvoicePOValidationResult,
} from '@/types/import';

/**
 * POアイテムから残数情報を計算
 */
export function calculatePOItemRemaining(poItem: ImportPOItem): POItemRemaining {
    const receivedQty = poItem.received_quantity || 0;
    const orderedQty = poItem.quantity;
    const remainingQty = Math.max(0, orderedQty - receivedQty);

    return {
        po_item_id: poItem.id,
        part_number: poItem.part_number,
        description: poItem.description,
        ordered_quantity: orderedQty,
        received_quantity: receivedQty,
        remaining_quantity: remainingQty,
        unit_price: poItem.unit_price,
        unit: poItem.unit,
    };
}

/**
 * 複数のPOから全ての明細の残数情報を取得
 */
export function getAllPOItemsRemaining(linkedPOs: ImportPO[]): POItemRemaining[] {
    const allItems: POItemRemaining[] = [];

    for (const po of linkedPOs) {
        if (po.items && po.items.length > 0) {
            for (const item of po.items) {
                allItems.push(calculatePOItemRemaining(item));
            }
        }
    }

    return allItems;
}

/**
 * インボイスアイテムとPO明細をマッチング（品番ベース）
 */
export function matchInvoiceItemWithPO(
    invoiceItem: ImportInvoiceItem | ImportInvoiceItemCreateData,
    poItemsRemaining: POItemRemaining[]
): POItemRemaining | undefined {
    // 品番が一致するPO明細を検索
    const partNumber = invoiceItem.part_number.trim();

    // 完全一致を優先
    let matched = poItemsRemaining.find(
        (po) => po.part_number.trim().toLowerCase() === partNumber.toLowerCase()
    );

    // 完全一致がなければ部分一致
    if (!matched) {
        matched = poItemsRemaining.find((po) =>
            po.part_number.trim().toLowerCase().includes(partNumber.toLowerCase()) ||
            partNumber.toLowerCase().includes(po.part_number.trim().toLowerCase())
        );
    }

    return matched;
}

/**
 * インボイスアイテムの数量バリデーション
 * - 分納許容: インボイス数量 <= PO残数 → OK
 * - 過剰納品禁止: インボイス数量 > PO残数 → NG
 */
export function validateInvoiceItemQuantity(
    invoiceItem: ImportInvoiceItem | ImportInvoiceItemCreateData,
    matchedPOItem?: POItemRemaining
): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // PO明細が見つからない場合
    if (!matchedPOItem) {
        errors.push(`品番 "${invoiceItem.part_number}" に対応するPOが見つかりません`);
        return { is_valid: false, errors };
    }

    const invoiceQty = invoiceItem.quantity;
    const remainingQty = matchedPOItem.remaining_quantity;

    // 過剰納品チェック
    if (invoiceQty > remainingQty) {
        errors.push(
            `数量超過: インボイス数量(${invoiceQty}) > PO残数(${remainingQty})`
        );
        return { is_valid: false, errors };
    }

    // 分納OK（インボイス数量 <= PO残数）
    if (invoiceQty <= remainingQty) {
        return { is_valid: true, errors: [] };
    }

    // その他のエラー
    errors.push('数量検証エラー');
    return { is_valid: false, errors };
}

/**
 * インボイス明細とPO明細の単価チェック（オプション）
 */
export function validateInvoiceItemPrice(
    invoiceItem: ImportInvoiceItem | ImportInvoiceItemCreateData,
    matchedPOItem?: POItemRemaining
): { is_valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!matchedPOItem || !matchedPOItem.unit_price || !invoiceItem.unit_price) {
        // 単価情報がない場合はスキップ
        return { is_valid: true, warnings: [] };
    }

    const invoicePrice = invoiceItem.unit_price;
    const poPrice = matchedPOItem.unit_price;

    // 単価が一致しない場合は警告（エラーではない）
    if (Math.abs(invoicePrice - poPrice) > 0.01) {
        warnings.push(
            `単価が異なります: インボイス(${invoicePrice}) ≠ PO(${poPrice})`
        );
    }

    return { is_valid: true, warnings };
}

/**
 * インボイス全体のPO整合性チェック
 */
export function validateInvoiceAgainstPOs(
    invoiceItems: (ImportInvoiceItem | ImportInvoiceItemCreateData)[],
    linkedPOs: ImportPO[]
): InvoicePOValidationResult {
    // POが指定されていない場合
    if (linkedPOs.length === 0) {
        return {
            is_all_valid: false,
            matched_items: [],
            summary: {
                total_items: invoiceItems.length,
                valid_items: 0,
                invalid_items: invoiceItems.length,
                unmatched_items: invoiceItems.length,
            },
        };
    }

    // 全てのPO明細の残数情報を取得
    const poItemsRemaining = getAllPOItemsRemaining(linkedPOs);

    const matchedItems: InvoiceItemPOMatch[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let unmatchedCount = 0;

    // 各インボイス明細をチェック
    for (const invoiceItem of invoiceItems) {
        const matchedPOItem = matchInvoiceItemWithPO(invoiceItem, poItemsRemaining);
        const quantityValidation = validateInvoiceItemQuantity(invoiceItem, matchedPOItem);
        const priceValidation = validateInvoiceItemPrice(invoiceItem, matchedPOItem);

        const allErrors = [...quantityValidation.errors, ...priceValidation.warnings];
        const isValid = quantityValidation.is_valid && matchedPOItem !== undefined;

        matchedItems.push({
            invoice_item: invoiceItem,
            matched_po_item: matchedPOItem,
            is_valid: isValid,
            validation_errors: allErrors,
        });

        if (isValid) {
            validCount++;
        } else {
            invalidCount++;
        }

        if (!matchedPOItem) {
            unmatchedCount++;
        }
    }

    return {
        is_all_valid: validCount === invoiceItems.length && unmatchedCount === 0,
        matched_items: matchedItems,
        summary: {
            total_items: invoiceItems.length,
            valid_items: validCount,
            invalid_items: invalidCount,
            unmatched_items: unmatchedCount,
        },
    };
}

/**
 * インボイスとPOの整合性ステータスを取得
 * - すべて有効 → 'success' (Green)
 * - 一部無効 → 'warning' (Yellow)
 * - すべて無効/PO未指定 → 'default' (Gray)
 */
export function getInvoicePOValidationStatus(
    validationResult: InvoicePOValidationResult
): 'success' | 'warning' | 'default' {
    if (validationResult.is_all_valid) {
        return 'success';
    }

    if (validationResult.summary.valid_items > 0) {
        return 'warning';
    }

    return 'default';
}
