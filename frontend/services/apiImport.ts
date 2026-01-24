// services/apiImport.ts
// 輸入管理・OCR登録機能のAPIサービス

import apiClient from './api';
import {
    ImportPO,
    ImportPOCreateData,
    ImportPOUpdateData,
    ImportInvoice,
    ImportInvoiceCreateData,
    ImportInvoiceUpdateData,
    ImportFile,
    ImportFileType,
    OCRExtractionResult,
    ImportInvoiceRegisterResponse,
    SemiFinishedInventoryCreateData,
} from '@/types/import';
import { PaginatedResponse } from '@/types/business';

// ===== 輸入PO API =====
export const importPOApi = {
    // 輸入PO一覧取得
    getImportPOs: async (params?: {
        supplier_branch?: number;
        status?: string;
        search?: string;
    }): Promise<ImportPO[]> => {
        const response = await apiClient.get<PaginatedResponse<ImportPO>>(
            '/imports/purchase-orders/',
            { params }
        );
        return response.data.results;
    },

    // 輸入PO詳細取得
    getImportPO: async (id: number): Promise<ImportPO> => {
        const response = await apiClient.get<ImportPO>(
            `/imports/purchase-orders/${id}/`
        );
        return response.data;
    },

    // 輸入PO作成
    createImportPO: async (data: ImportPOCreateData): Promise<ImportPO> => {
        const response = await apiClient.post<ImportPO>(
            '/imports/purchase-orders/',
            data
        );
        return response.data;
    },

    // 輸入PO更新
    updateImportPO: async (id: number, data: ImportPOUpdateData): Promise<ImportPO> => {
        const response = await apiClient.patch<ImportPO>(
            `/imports/purchase-orders/${id}/`,
            data
        );
        return response.data;
    },

    // 輸入PO削除
    deleteImportPO: async (id: number): Promise<void> => {
        await apiClient.delete(`/imports/purchase-orders/${id}/`);
    },

    // 輸入POステータス更新
    updateImportPOStatus: async (id: number, status: string): Promise<ImportPO> => {
        const response = await apiClient.post<ImportPO>(
            `/imports/purchase-orders/${id}/update-status/`,
            { status }
        );
        return response.data;
    },
};

// ===== インボイス API =====
export const importInvoiceApi = {
    // インボイス一覧取得
    getImportInvoices: async (params?: {
        supplier_branch?: number;
        status?: string;
        search?: string;
    }): Promise<ImportInvoice[]> => {
        const response = await apiClient.get<PaginatedResponse<ImportInvoice>>(
            '/imports/invoices/',
            { params }
        );
        return response.data.results;
    },

    // インボイス詳細取得
    getImportInvoice: async (id: number): Promise<ImportInvoice> => {
        const response = await apiClient.get<ImportInvoice>(
            `/imports/invoices/${id}/`
        );
        return response.data;
    },

    // インボイス作成
    createImportInvoice: async (data: ImportInvoiceCreateData): Promise<ImportInvoice> => {
        const response = await apiClient.post<ImportInvoice>(
            '/imports/invoices/',
            data
        );
        return response.data;
    },

    // インボイス更新
    updateImportInvoice: async (id: number, data: ImportInvoiceUpdateData): Promise<ImportInvoice> => {
        const response = await apiClient.patch<ImportInvoice>(
            `/imports/invoices/${id}/`,
            data
        );
        return response.data;
    },

    // インボイス削除
    deleteImportInvoice: async (id: number): Promise<void> => {
        await apiClient.delete(`/imports/invoices/${id}/`);
    },

    // インボイスにPOを紐付け
    linkPOs: async (invoiceId: number, poIds: number[]): Promise<ImportInvoice> => {
        const response = await apiClient.post<ImportInvoice>(
            `/imports/invoices/${invoiceId}/link-pos/`,
            { po_ids: poIds }
        );
        return response.data;
    },

    // ファイルアップロード
    uploadFile: async (
        invoiceId: number,
        fileType: ImportFileType,
        file: File
    ): Promise<ImportFile> => {
        const formData = new FormData();
        formData.append('file_type', fileType);
        formData.append('file', file, file.name);

        const response = await apiClient.post<ImportFile>(
            `/imports/invoices/${invoiceId}/upload-file/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    // ファイルダウンロード
    downloadFile: async (invoiceId: number, fileId: number): Promise<Blob> => {
        const response = await apiClient.get(
            `/imports/invoices/${invoiceId}/files/${fileId}/download/`,
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },

    // ファイル削除
    deleteFile: async (invoiceId: number, fileId: number): Promise<void> => {
        await apiClient.delete(
            `/imports/invoices/${invoiceId}/files/${fileId}/`
        );
    },

    // インボイスから半製品在庫を登録
    registerSemiFinishedInventory: async (
        invoiceId: number
    ): Promise<ImportInvoiceRegisterResponse> => {
        const response = await apiClient.post<ImportInvoiceRegisterResponse>(
            `/imports/invoices/${invoiceId}/register-inventory/`
        );
        return response.data;
    },
};

// ===== OCR API =====
export const ocrApi = {
    // ファイルからOCR抽出
    extractFromFile: async (
        file: File,
        supplierBranchId?: number
    ): Promise<OCRExtractionResult> => {
        const formData = new FormData();
        formData.append('file', file, file.name);
        if (supplierBranchId) {
            formData.append('supplier_branch_id', String(supplierBranchId));
        }

        const response = await apiClient.post<OCRExtractionResult>(
            '/imports/ocr/extract/',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    // URLからOCR抽出（Blob URL対応）
    extractFromUrl: async (
        url: string,
        supplierBranchId?: number
    ): Promise<OCRExtractionResult> => {
        const response = await apiClient.post<OCRExtractionResult>(
            '/imports/ocr/extract-url/',
            {
                url,
                supplier_branch_id: supplierBranchId,
            }
        );
        return response.data;
    },

    // 品番マッチング
    matchPartNumbers: async (
        partNumbers: string[],
        supplierBranchId?: number
    ): Promise<Array<{
        part_number: string;
        matched: boolean;
        material_id?: number;
        material_code?: string;
        material_name?: string;
    }>> => {
        const response = await apiClient.post(
            '/imports/ocr/match-parts/',
            {
                part_numbers: partNumbers,
                supplier_branch_id: supplierBranchId,
            }
        );
        return response.data;
    },
};

// ===== 半製品在庫 API =====
export const semiFinishedInventoryApi = {
    // 半製品在庫作成（材料テーブルを使用）
    create: async (data: SemiFinishedInventoryCreateData): Promise<{
        id: number;
        material_id: number;
        quantity: number;
    }> => {
        const response = await apiClient.post(
            '/manufacturing/materials/add-stock/',
            data
        );
        return response.data;
    },

    // 一括登録
    bulkCreate: async (items: SemiFinishedInventoryCreateData[]): Promise<{
        success_count: number;
        error_count: number;
        errors?: string[];
    }> => {
        const response = await apiClient.post(
            '/manufacturing/materials/bulk-add-stock/',
            { items }
        );
        return response.data;
    },
};

// 統合エクスポート
export const importApi = {
    po: importPOApi,
    invoice: importInvoiceApi,
    ocr: ocrApi,
    semiFinished: semiFinishedInventoryApi,
};

export default importApi;
