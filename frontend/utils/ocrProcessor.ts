// utils/ocrProcessor.ts
// tesseract.jsを使用したOCR処理ユーティリティ

import Tesseract, { RecognizeResult, Worker } from 'tesseract.js';
import { OCRExtractedItem, OCRExtractionResult } from '@/types/import';
import { v4 as uuidv4 } from 'uuid';

// OCRワーカーのシングルトンインスタンス
let ocrWorker: Worker | null = null;

// ワーカーの初期化
const initializeWorker = async (): Promise<Worker> => {
    if (ocrWorker) {
        return ocrWorker;
    }

    ocrWorker = await Tesseract.createWorker('eng+jpn', 1, {
        logger: (m) => {
            if (process.env.NODE_ENV === 'development') {
                console.log('[OCR Progress]', m);
            }
        },
    });

    return ocrWorker;
};

// ワーカーの終了
export const terminateOCRWorker = async (): Promise<void> => {
    if (ocrWorker) {
        await ocrWorker.terminate();
        ocrWorker = null;
    }
};

// 品番パターンの正規表現
const PART_NUMBER_PATTERNS = [
    // 一般的な品番パターン（英数字とハイフン）
    /([A-Z0-9]{2,}[-_]?[A-Z0-9]{2,}[-_]?[A-Z0-9]*)/gi,
    // 日本語品番パターン
    /品番[:：\s]*([A-Z0-9\-_]+)/gi,
    /P\/N[:：\s]*([A-Z0-9\-_]+)/gi,
    /Part\s*(?:No\.?|Number)[:：\s]*([A-Z0-9\-_]+)/gi,
];

// 数量パターンの正規表現
const QUANTITY_PATTERNS = [
    /(\d{1,6})\s*(?:個|pcs?|units?|ea)/gi,
    /(?:数量|Qty|Quantity)[:：\s]*(\d{1,6})/gi,
    /(\d{1,6})\s*(?:箱|box|carton)/gi,
];

// 金額パターンの正規表現
const PRICE_PATTERNS = [
    /(?:\$|USD|¥|JPY|€|EUR)\s*([\d,]+\.?\d*)/gi,
    /(?:単価|Price|Unit\s*Price)[:：\s]*([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s*(?:\/\s*(?:個|pc|unit|ea))/gi,
];

// 日付パターンの正規表現
const DATE_PATTERNS = [
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/g,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gi,
];

// インボイス番号パターン
const INVOICE_NUMBER_PATTERNS = [
    /(?:Invoice|INV|請求書)[\s#:：No.]*([A-Z0-9\-]+)/gi,
];

// テキストから品目を抽出
const extractItems = (text: string): OCRExtractedItem[] => {
    const items: OCRExtractedItem[] = [];
    const lines = text.split('\n').filter(line => line.trim());

    // 表形式のデータを解析
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 品番を探す
        let partNumber = '';
        for (const pattern of PART_NUMBER_PATTERNS) {
            const match = pattern.exec(line);
            if (match && match[1]) {
                // 最低3文字以上の品番のみ対象
                if (match[1].length >= 3) {
                    partNumber = match[1].toUpperCase();
                    break;
                }
            }
            pattern.lastIndex = 0; // 正規表現のリセット
        }

        if (!partNumber) continue;

        // 数量を探す
        let quantity = 0;
        for (const pattern of QUANTITY_PATTERNS) {
            const match = pattern.exec(line);
            if (match && match[1]) {
                quantity = parseInt(match[1].replace(/,/g, ''), 10);
                break;
            }
            pattern.lastIndex = 0;
        }

        // 周辺の行も確認（テーブルの場合）
        if (quantity === 0 && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            for (const pattern of QUANTITY_PATTERNS) {
                const match = pattern.exec(nextLine);
                if (match && match[1]) {
                    quantity = parseInt(match[1].replace(/,/g, ''), 10);
                    break;
                }
                pattern.lastIndex = 0;
            }
        }

        // 金額を探す
        let unitPrice: number | undefined;
        for (const pattern of PRICE_PATTERNS) {
            const match = pattern.exec(line);
            if (match && match[1]) {
                unitPrice = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
            pattern.lastIndex = 0;
        }

        // 説明文を取得（品番を除いた部分）
        const description = line
            .replace(partNumber, '')
            .replace(/\d{1,6}\s*(?:個|pcs?|units?|ea|箱|box)/gi, '')
            .replace(/(?:\$|USD|¥|JPY|€|EUR)\s*[\d,]+\.?\d*/gi, '')
            .trim()
            .substring(0, 100) || partNumber;

        // 信頼度を計算（品番と数量が両方あれば高い）
        const confidence = calculateConfidence(partNumber, quantity, unitPrice);

        // 重複チェック
        if (!items.some(item => item.part_number === partNumber)) {
            items.push({
                id: uuidv4(),
                part_number: partNumber,
                description,
                quantity: quantity || 1,
                unit_price: unitPrice,
                confidence,
                raw_text: line,
                is_matched: false,
            });
        }
    }

    return items;
};

// 信頼度を計算
const calculateConfidence = (
    partNumber: string,
    quantity: number,
    unitPrice?: number
): number => {
    let confidence = 0.3; // ベース信頼度

    // 品番の品質チェック
    if (partNumber.length >= 5) confidence += 0.2;
    if (/^[A-Z0-9\-_]+$/.test(partNumber)) confidence += 0.1;

    // 数量があれば信頼度アップ
    if (quantity > 0 && quantity < 100000) confidence += 0.2;

    // 金額があれば信頼度アップ
    if (unitPrice && unitPrice > 0 && unitPrice < 1000000) confidence += 0.2;

    return Math.min(confidence, 1.0);
};

// インボイス番号を抽出
const extractInvoiceNumber = (text: string): string | undefined => {
    for (const pattern of INVOICE_NUMBER_PATTERNS) {
        const match = pattern.exec(text);
        if (match && match[1]) {
            return match[1];
        }
        pattern.lastIndex = 0;
    }
    return undefined;
};

// 日付を抽出
const extractDate = (text: string): string | undefined => {
    for (const pattern of DATE_PATTERNS) {
        const match = pattern.exec(text);
        if (match && match[1]) {
            // 日付形式を正規化
            try {
                const date = new Date(match[1]);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            } catch {
                // パース失敗時はそのまま返す
                return match[1];
            }
        }
        pattern.lastIndex = 0;
    }
    return undefined;
};

// メイン処理：画像/PDFからOCR抽出
export const processOCR = async (
    imageSource: File | Blob | string,
    onProgress?: (progress: number) => void
): Promise<OCRExtractionResult> => {
    const startTime = Date.now();

    try {
        const worker = await initializeWorker();

        // Tesseract.jsで認識
        const result: RecognizeResult = await worker.recognize(imageSource, {
            // rotateAuto: true は現在のtesseract.jsでは型定義に含まれていない場合があるため、
            // 基本的な設定のみ使用
        });

        const text = result.data.text;

        // テキストから情報を抽出
        const items = extractItems(text);
        const invoiceNumber = extractInvoiceNumber(text);
        const invoiceDate = extractDate(text);

        return {
            success: true,
            items,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            raw_text: text,
            processing_time_ms: Date.now() - startTime,
        };
    } catch (error) {
        console.error('[OCR Error]', error);
        return {
            success: false,
            items: [],
            raw_text: '',
            processing_time_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : 'OCR処理中にエラーが発生しました'],
        };
    }
};

// PDFからページごとに画像を抽出してOCR
export const processOCRFromPDF = async (
    pdfFile: File,
    onProgress?: (progress: number, page: number, totalPages: number) => void
): Promise<OCRExtractionResult> => {
    const startTime = Date.now();

    try {
        // PDFをBase64に変換してWorkerに送信する方法
        // （pdfjs-distを使う場合は別途インストールが必要）
        // ここではシンプルにファイル全体をOCR対象とする

        const result = await processOCR(pdfFile);
        return result;
    } catch (error) {
        console.error('[PDF OCR Error]', error);
        return {
            success: false,
            items: [],
            raw_text: '',
            processing_time_ms: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : 'PDF OCR処理中にエラーが発生しました'],
        };
    }
};

// 画像をcanvasに描画してOCR用に最適化
export const preprocessImage = async (
    imageFile: File
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // 画像サイズの調整（OCR精度向上のため）
            const maxDimension = 2000;
            let { width, height } = img;

            if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // グレースケール変換とコントラスト調整
            ctx.filter = 'grayscale(100%) contrast(150%)';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/png',
                1.0
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
};

// デフォルトエクスポート
export default {
    processOCR,
    processOCRFromPDF,
    preprocessImage,
    terminateOCRWorker,
};
