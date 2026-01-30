// utils/invoiceCompletion.ts
// インボイス完了状態の自動判定ロジック

import { ImportInvoice, ImportPO } from '@/types/import';
import { validateInvoiceAgainstPOs } from './poValidation';

/**
 * インボイスの完了状態情報
 */
export interface InvoiceCompletionStatus {
    isComplete: boolean;
    hasPOConsistency: boolean;
    hasWaybill: boolean;
    hasBillFile: boolean;
    missingItems: string[];
}

/**
 * インボイスが完了状態かを判定する
 *
 * 完了条件（3つすべて満たす必要あり）:
 * 1. POの整合性: インボイスの全数量が紐付けられたPOの残数以内であること
 * 2. Waybill: Waybillファイルが登録されていること
 * 3. 請求書: 請求書ファイルが登録されていること
 *
 * @param invoice インボイス
 * @param linkedPOs 紐付けられたPO（詳細情報必須）
 * @returns 完了状態情報
 */
export function checkInvoiceCompletion(
    invoice: ImportInvoice,
    linkedPOs?: ImportPO[]
): InvoiceCompletionStatus {
    const missingItems: string[] = [];

    // 1. POの整合性チェック
    let hasPOConsistency = false;
    if (linkedPOs && linkedPOs.length > 0 && invoice.items && invoice.items.length > 0) {
        const validationResult = validateInvoiceAgainstPOs(invoice, linkedPOs);
        hasPOConsistency = validationResult.is_all_valid;
        if (!hasPOConsistency) {
            missingItems.push('PO整合性');
        }
    } else if (!linkedPOs || linkedPOs.length === 0) {
        missingItems.push('PO紐付け');
    } else if (!invoice.items || invoice.items.length === 0) {
        missingItems.push('インボイス明細');
    }

    // 2. Waybillファイルチェック
    const hasWaybill = invoice.has_waybill || false;
    if (!hasWaybill) {
        missingItems.push('Waybillファイル');
    }

    // 3. 請求書ファイルチェック
    const hasBillFile = invoice.has_bill_file || false;
    if (!hasBillFile) {
        missingItems.push('請求書ファイル');
    }

    // すべての条件を満たしているかチェック
    const isComplete = hasPOConsistency && hasWaybill && hasBillFile;

    return {
        isComplete,
        hasPOConsistency,
        hasWaybill,
        hasBillFile,
        missingItems,
    };
}

/**
 * 完了状態に応じた表示用のラベルとカラーを取得
 *
 * @param status 完了状態情報
 * @returns ラベル、カラー、バリアント
 */
export function getCompletionStatusDisplay(status: InvoiceCompletionStatus): {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    variant: 'filled' | 'outlined';
} {
    if (status.isComplete) {
        return {
            label: '完了',
            color: 'success',
            variant: 'filled',
        };
    }

    if (status.missingItems.length === 1) {
        return {
            label: `${status.missingItems[0]}未登録`,
            color: 'warning',
            variant: 'outlined',
        };
    }

    if (status.missingItems.length === 2) {
        return {
            label: `${status.missingItems.length}件未完了`,
            color: 'warning',
            variant: 'outlined',
        };
    }

    return {
        label: '未完了',
        color: 'default',
        variant: 'outlined',
    };
}

/**
 * 完了状態に応じた行の背景色を取得
 *
 * @param status 完了状態情報
 * @returns 背景色（MUIのsx prop用）
 */
export function getCompletionRowStyle(status: InvoiceCompletionStatus): Record<string, unknown> {
    if (status.isComplete) {
        return {
            backgroundColor: 'success.50',
            '&:hover': {
                backgroundColor: 'success.100',
            },
        };
    }

    return {};
}
