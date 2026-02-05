// components/import/ImportModal.tsx
// インボイス登録モーダル（手動入力版・OCR削除済み）

'use client';

import React, { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Button,
    TextField,
    Typography,
    IconButton,
    Grid,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Tooltip,
    FormControlLabel,
    Checkbox,
    Divider,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    CloudUpload as CloudUploadIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { SupplierBranch } from '@/types/supplier';
import {
    ImportInvoice,
    ImportInvoiceCreateData,
    ImportInvoiceItemCreateData,
    ImportInvoiceStatusLabels,
    ImportPO,
    ImportFileType,
    ImportFileTypeLabels,
    ImportFile,
} from '@/types/import';
import { Material, materialApi } from '@/services/apiManufacturing';
import { supplierApi } from '@/services/apiSupplier';
import { importApi } from '@/services/apiImport';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface ImportModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: ImportInvoiceCreateData, files: { type: ImportFileType; file: File }[]) => Promise<void>;
    existingInvoice?: ImportInvoice | null;
    availablePOs?: ImportPO[];
    onRefresh?: () => void;
}

// フォーム行の型定義（any禁止）
interface InvoiceItemFormRow {
    id: string;
    part_number: string;
    description: string;
    quantity: number | '';
    unit_price: number | '';
    unit: string;
    matched_material_id?: number;
    matched_material?: Material;
}

// 空のフォーム行を生成
const createEmptyRow = (): InvoiceItemFormRow => ({
    id: uuidv4(),
    part_number: '',
    description: '',
    quantity: '',
    unit_price: '',
    unit: '個',
});

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
        {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
);

export const ImportModal: React.FC<ImportModalProps> = ({
    open,
    onClose,
    onSave,
    existingInvoice,
    availablePOs = [],
    onRefresh,
}) => {
    // ファイル管理
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileType, setSelectedFileType] = useState<ImportFileType>('invoice');
    const [uploadedFiles, setUploadedFiles] = useState<{ type: ImportFileType; file: File }[]>([]);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
    const [existingFiles, setExistingFiles] = useState<ImportFile[]>([]);
    const [selectedExistingFile, setSelectedExistingFile] = useState<ImportFile | null>(null);
    const [existingFilePreviewUrl, setExistingFilePreviewUrl] = useState<string | null>(null);
    const [loadingExistingFilePreview, setLoadingExistingFilePreview] = useState(false);

    // フォームデータ
    const [invoiceNumber, setInvoiceNumber] = useState<string>('');
    const [supplierBranchId, setSupplierBranchId] = useState<number | null>(null);
    const [invoiceDate, setInvoiceDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [receivedDate, setReceivedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [linkedPOIds, setLinkedPOIds] = useState<number[]>([]);
    const [currency, setCurrency] = useState<string>('USD');
    const [transportationFee, setTransportationFee] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<InvoiceItemFormRow[]>([createEmptyRow()]);
    const [registerAsSemiFinished, setRegisterAsSemiFinished] = useState<boolean>(true);

    // UI状態
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [supplierBranches, setSupplierBranches] = useState<SupplierBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [displayedFile, setDisplayedFile] = useState<{ type: 'new' | 'existing'; file: File | ImportFile } | null>(null);

    // サプライヤー連動：マスター製品リスト
    const [supplierMaterials, setSupplierMaterials] = useState<Material[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // フォーカス管理用ref
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // サプライヤー支店の読み込み
    useEffect(() => {
        const loadSupplierBranches = async () => {
            try {
                setLoading(true);
                // 海外サプライヤーのみをフィルタリング
                const branches = await supplierApi.getSupplierBranches({ is_overseas: 'true' });
                setSupplierBranches(branches);
            } catch (error) {
                console.error('Failed to load supplier branches:', error);
                toast.error('サプライヤー情報の読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            loadSupplierBranches();
        }
    }, [open]);

    // サプライヤー選択時に紐付いた材料を読み込み
    useEffect(() => {
        const loadSupplierMaterials = async () => {
            if (!supplierBranchId) {
                setSupplierMaterials([]);
                return;
            }

            try {
                setLoadingMaterials(true);
                // 選択したサプライヤー支店が海外の場合、すべての海外製品を表示
                // それ以外の場合は、特定のサプライヤー支店の製品のみ表示
                const params: Parameters<typeof materialApi.getMaterials>[0] = {
                    is_active: true,
                };

                if (selectedBranch?.is_overseas) {
                    // 海外サプライヤーの場合、すべての海外製品を表示
                    params.is_overseas = true;
                } else {
                    // 国内サプライヤーの場合、特定の支店の製品のみ表示
                    params.supplier_branch = supplierBranchId;
                }

                const materials = await materialApi.getMaterials(params);
                setSupplierMaterials(materials);
            } catch (error) {
                console.error('Failed to load supplier materials:', error);
                toast.error('製品マスターの読み込みに失敗しました');
            } finally {
                setLoadingMaterials(false);
            }
        };

        loadSupplierMaterials();
    }, [supplierBranchId, selectedBranch]);

    // 既存インボイスの読み込み
    useEffect(() => {
        if (existingInvoice && open) {
            setInvoiceNumber(existingInvoice.invoice_number);
            setSupplierBranchId(existingInvoice.supplier_branch);
            setInvoiceDate(existingInvoice.invoice_date);
            setReceivedDate(existingInvoice.received_date || '');
            setCurrency(existingInvoice.currency || 'USD');
            setTransportationFee(existingInvoice.transportation_fee?.toString() || '');
            setNotes(existingInvoice.notes || '');
            setLinkedPOIds(existingInvoice.linked_po_ids || []);

            // 既存ファイルを設定
            setExistingFiles(existingInvoice.files || []);

            // デフォルトでinvoiceファイルを表示（選択のみ、プレビューは別のuseEffectでロード）
            const invoiceFiles = (existingInvoice.files || []).filter(f => f.file_type === 'invoice');
            if (invoiceFiles.length > 0) {
                setSelectedExistingFile(invoiceFiles[0]);
            }

            // 明細情報を読み込み
            if (existingInvoice.items && existingInvoice.items.length > 0) {
                setItems(
                    existingInvoice.items.map((item) => ({
                        id: uuidv4(),
                        part_number: item.part_number,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price || '',
                        unit: item.unit,
                        matched_material_id: item.material,
                    }))
                );
            } else {
                // 明細がない場合は空の行を1つ作成
                setItems([createEmptyRow()]);
            }

            const branch = supplierBranches.find(b => b.id === existingInvoice.supplier_branch);
            if (branch) {
                setSelectedBranch(branch);
            }
        } else if (!existingInvoice && open) {
            // 新規作成時は初期状態にリセット
            setItems([createEmptyRow()]);
            setExistingFiles([]);
        }
    }, [existingInvoice, open, supplierBranches]);

    // ファイルプレビューURLの生成と管理
    useEffect(() => {
        // 既存のURLをクリーンアップ
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
        }

        // 新しいファイルが選択された場合、プレビューURLを生成
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setFilePreviewUrl(url);
        } else {
            setFilePreviewUrl(null);
        }

        // クリーンアップ関数
        return () => {
            if (filePreviewUrl) {
                URL.revokeObjectURL(filePreviewUrl);
            }
        };
    }, [selectedFile]);

    // モーダルが閉じた時のリセット
    useEffect(() => {
        if (!open) {
            // ファイルプレビューURLをクリーンアップ
            if (filePreviewUrl) {
                URL.revokeObjectURL(filePreviewUrl);
            }
            if (existingFilePreviewUrl) {
                URL.revokeObjectURL(existingFilePreviewUrl);
            }

            setSelectedFile(null);
            setSelectedFileType('invoice');
            setUploadedFiles([]);
            setFilePreviewUrl(null);
            setInvoiceNumber('');
            setSupplierBranchId(null);
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setReceivedDate(new Date().toISOString().split('T')[0]);
            setLinkedPOIds([]);
            setCurrency('USD');
            setTransportationFee('');
            setNotes('');
            setItems([createEmptyRow()]);
            setSelectedBranch(null);
            setActiveTab(0);
            setRegisterAsSemiFinished(true);
            setSupplierMaterials([]);
            setExistingFiles([]);
            setSelectedExistingFile(null);
            setExistingFilePreviewUrl(null);
        }
    }, [open, filePreviewUrl, existingFilePreviewUrl]);

    // selectedExistingFileが変更された時にプレビューをロード
    useEffect(() => {
        if (selectedExistingFile && existingInvoice && !existingFilePreviewUrl) {
            const loadPreview = async () => {
                setLoadingExistingFilePreview(true);
                try {
                    const blob = await importApi.invoice.downloadFile(existingInvoice.id, selectedExistingFile.id);
                    const url = window.URL.createObjectURL(blob);
                    setExistingFilePreviewUrl(url);
                    setDisplayedFile({ type: 'existing', file: selectedExistingFile });
                } catch (error) {
                    console.error('Failed to load file preview:', error);
                    toast.error('ファイルのプレビュー読み込みに失敗しました');
                } finally {
                    setLoadingExistingFilePreview(false);
                }
            };
            loadPreview();
        }
    }, [selectedExistingFile, existingInvoice, existingFilePreviewUrl]);

    // ファイル選択ハンドラー
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setDisplayedFile({ type: 'new', file });
            // ファイルリストに追加
            setUploadedFiles((prev) => {
                const existing = prev.find((f) => f.type === selectedFileType);
                if (existing) {
                    return prev.map((f) =>
                        f.type === selectedFileType ? { ...f, file } : f
                    );
                }
                return [...prev, { type: selectedFileType, file }];
            });
        }
        // inputをリセット
        if (event.target) {
            event.target.value = '';
        }
    }, [selectedFileType]);

    // 既存ファイルの削除ハンドラー
    const handleDeleteExistingFile = async (fileId: number) => {
        if (!existingInvoice) return;

        const confirmed = window.confirm('このファイルを削除してもよろしいですか？');
        if (!confirmed) return;

        setDeletingFileId(fileId);
        try {
            await importApi.invoice.deleteFile(existingInvoice.id, fileId);
            toast.success('ファイルを削除しました');

            // ローカル状態から削除されたファイルを除外
            setExistingFiles((prev) => prev.filter((file) => file.id !== fileId));

            // 選択中のファイルが削除された場合はクリア
            if (selectedExistingFile?.id === fileId) {
                setSelectedExistingFile(null);
                if (existingFilePreviewUrl) {
                    window.URL.revokeObjectURL(existingFilePreviewUrl);
                    setExistingFilePreviewUrl(null);
                }
            }

            // 親コンポーネントに通知（必要に応じて）
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error('ファイルの削除に失敗しました');
        } finally {
            setDeletingFileId(null);
        }
    };

    // 既存ファイルをクリックしてプレビュー
    const handleExistingFileClick = async (file: ImportFile) => {
        if (!existingInvoice) return;

        // 既に選択されているファイルの場合はスキップ
        if (selectedExistingFile?.id === file.id) return;

        // 以前のプレビューURLをクリーンアップ
        if (existingFilePreviewUrl) {
            window.URL.revokeObjectURL(existingFilePreviewUrl);
            setExistingFilePreviewUrl(null);
        }

        setSelectedExistingFile(file);
        setDisplayedFile({ type: 'existing', file });
        setLoadingExistingFilePreview(true);

        try {
            const blob = await importApi.invoice.downloadFile(existingInvoice.id, file.id);
            const url = window.URL.createObjectURL(blob);
            setExistingFilePreviewUrl(url);
        } catch (error) {
            console.error('Failed to load file preview:', error);
            toast.error('ファイルのプレビュー読み込みに失敗しました');
        } finally {
            setLoadingExistingFilePreview(false);
        }
    };

    // 行の追加
    const handleAddRow = useCallback(() => {
        setItems((prev) => [...prev, createEmptyRow()]);
    }, []);

    // 行の削除
    const handleRemoveRow = useCallback((rowId: string) => {
        setItems((prev) => {
            if (prev.length <= 1) {
                return [createEmptyRow()];
            }
            return prev.filter((item) => item.id !== rowId);
        });
    }, []);

    // 行の更新
    const handleUpdateRow = useCallback(
        (rowId: string, field: keyof InvoiceItemFormRow, value: string | number) => {
            setItems((prev) =>
                prev.map((item) =>
                    item.id === rowId ? { ...item, [field]: value } : item
                )
            );
        },
        []
    );

    // マスター製品選択時の自動補完
    const handleMaterialSelect = useCallback(
        (rowId: string, material: Material | null) => {
            if (!material) {
                handleUpdateRow(rowId, 'matched_material_id', '');
                return;
            }

            setItems((prev) =>
                prev.map((item) => {
                    if (item.id === rowId) {
                        return {
                            ...item,
                            part_number: material.material_code,
                            description: material.material_name,
                            unit: material.unit,
                            unit_price: material.unit_price || '',
                            matched_material_id: material.id,
                            matched_material: material,
                        };
                    }
                    return item;
                })
            );
        },
        [handleUpdateRow]
    );

    // Enterキーで次のフィールドにフォーカス移動
    const handleKeyDown = useCallback(
        (
            e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLDivElement>,
            rowId: string,
            field: keyof InvoiceItemFormRow,
            rowIndex: number
        ) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const fields: (keyof InvoiceItemFormRow)[] = [
                    'part_number',
                    'description',
                    'quantity',
                    'unit_price',
                    'unit',
                ];
                const currentFieldIndex = fields.indexOf(field);

                if (currentFieldIndex < fields.length - 1) {
                    // 同じ行の次のフィールドへ
                    const nextField = fields[currentFieldIndex + 1];
                    const nextRef = inputRefs.current.get(`${rowId}-${nextField}`);
                    nextRef?.focus();
                } else if (rowIndex < items.length - 1) {
                    // 次の行の最初のフィールドへ
                    const nextRowId = items[rowIndex + 1].id;
                    const nextRef = inputRefs.current.get(`${nextRowId}-part_number`);
                    nextRef?.focus();
                } else {
                    // 最後の行の最後のフィールドなら新しい行を追加
                    handleAddRow();
                    setTimeout(() => {
                        const newItems = [...items, createEmptyRow()];
                        const lastItem = newItems[newItems.length - 1];
                        if (lastItem) {
                            const nextRef = inputRefs.current.get(`${lastItem.id}-part_number`);
                            nextRef?.focus();
                        }
                    }, 100);
                }
            }
        },
        [items, handleAddRow]
    );

    // 保存処理
    const handleSave = async () => {
        // バリデーション
        if (!supplierBranchId) {
            toast.error('サプライヤーを選択してください');
            return;
        }

        const validItems = items.filter(
            (item) => item.part_number.trim() && item.quantity
        );

        if (validItems.length === 0) {
            toast.error('最低1つの品目を入力してください');
            return;
        }

        try {
            setSaving(true);

            const invoiceItems: ImportInvoiceItemCreateData[] = validItems.map((item) => ({
                part_number: item.part_number,
                description: item.description,
                quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity), 10),
                unit_price:
                    typeof item.unit_price === 'number'
                        ? item.unit_price
                        : item.unit_price
                        ? parseFloat(String(item.unit_price))
                        : undefined,
                unit: item.unit,
                material: item.matched_material_id,
            }));

            const data: ImportInvoiceCreateData = {
                invoice_number: invoiceNumber || undefined,
                supplier_branch: supplierBranchId,
                invoice_date: invoiceDate,
                received_date: receivedDate || undefined,
                linked_po_ids: linkedPOIds.length > 0 ? linkedPOIds : undefined,
                currency,
                transportation_fee: transportationFee ? parseFloat(transportationFee) : undefined,
                notes: notes || undefined,
                items: invoiceItems,
            };

            await onSave(data, uploadedFiles);
            toast.success(existingInvoice ? 'インボイスを更新しました' : 'インボイスを登録しました');

            // 半製品在庫登録のメッセージ
            if (registerAsSemiFinished) {
                toast.success(`${validItems.length}件の品目を半製品として在庫登録しました`);
            }

            onRefresh?.();
            onClose();
        } catch (error) {
            console.error('Failed to save invoice:', error);
            toast.error('インボイスの保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // PO選択ハンドラー
    const handlePOToggle = (poId: number) => {
        setLinkedPOIds((prev) =>
            prev.includes(poId)
                ? prev.filter((id) => id !== poId)
                : [...prev, poId]
        );
    };

    // 合計金額の計算
    const totalAmount = items.reduce((sum, item) => {
        const qty = typeof item.quantity === 'number' ? item.quantity : 0;
        const price = typeof item.unit_price === 'number' ? item.unit_price : 0;
        return sum + qty * price;
    }, 0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: { height: '95vh' },
            }}
        >
            <DialogTitle>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h6">
                        {existingInvoice ? 'インボイス編集' : 'インボイス登録'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {existingInvoice && (
                            <Chip
                                label={ImportInvoiceStatusLabels[existingInvoice.status]}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', height: '100%' }}>
                        {/* 左側: ファイルプレビュー（拡大モード） */}
                        <Box
                            sx={{
                                width: '55%',
                                borderRight: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* PDFプレビュー専用エリア */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* 既存ファイルのプレビュー */}
                                {selectedExistingFile && existingFilePreviewUrl ? (
                                    <>
                                        {/* ファイル情報ヘッダー */}
                                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                                            <Typography variant="subtitle2" noWrap gutterBottom>
                                                {selectedExistingFile.file_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                サイズ: {selectedExistingFile.file_size ? `${(selectedExistingFile.file_size / 1024).toFixed(2)} KB` : '不明'}
                                            </Typography>
                                        </Box>

                                        {/* PDFプレビュー */}
                                        <Box sx={{ flex: 1, position: 'relative', bgcolor: 'grey.100' }}>
                                            {selectedExistingFile.file_name.toLowerCase().endsWith('.pdf') ? (
                                                <iframe
                                                    src={`${existingFilePreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        border: 'none',
                                                    }}
                                                    title="PDFプレビュー"
                                                />
                                            ) : selectedExistingFile.file_name.match(/\.(jpg|jpeg|png|gif|bmp)$/i) ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
                                                    <img
                                                        src={existingFilePreviewUrl}
                                                        alt={selectedExistingFile.file_name}
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '100%',
                                                            objectFit: 'contain',
                                                        }}
                                                    />
                                                </Box>
                                            ) : (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3,
                                                    }}
                                                >
                                                    <Alert severity="info" sx={{ maxWidth: '80%' }}>
                                                        <Typography variant="body2" gutterBottom fontWeight="medium">
                                                            このファイル形式はプレビューできません
                                                        </Typography>
                                                    </Alert>
                                                </Box>
                                            )}
                                        </Box>
                                    </>
                                ) : loadingExistingFilePreview ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                        <CircularProgress />
                                    </Box>
                                ) : selectedFile && filePreviewUrl ? (
                                    <>
                                        {/* ファイル情報ヘッダー */}
                                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                                            <Typography variant="subtitle2" noWrap gutterBottom>
                                                {selectedFile.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                サイズ: {(selectedFile.size / 1024).toFixed(2)} KB
                                            </Typography>
                                        </Box>

                                        {/* PDFプレビュー */}
                                        <Box sx={{ flex: 1, position: 'relative', bgcolor: 'grey.100' }}>
                                            {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                                                <iframe
                                                    src={`${filePreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        border: 'none',
                                                    }}
                                                    title="PDFプレビュー"
                                                />
                                            ) : (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        p: 3,
                                                    }}
                                                >
                                                    <Alert severity="info" sx={{ maxWidth: '80%' }}>
                                                        <Typography variant="body2" gutterBottom fontWeight="medium">
                                                            このファイル形式はプレビューできません
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            PDFファイルのみプレビュー表示が可能です。
                                                            画像ファイル（JPG、PNG等）は保存後に確認できます。
                                                        </Typography>
                                                    </Alert>
                                                </Box>
                                            )}
                                        </Box>
                                    </>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            p: 3,
                                        }}
                                    >
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {existingInvoice && existingFiles.length > 0
                                                    ? '既存ファイルまたは新規ファイルを選択してください'
                                                    : 'ファイルを選択してください'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                PDFファイルと画像ファイルがプレビュー表示できます
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* 右側: フォーム */}
                        <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column' }}>
                            <Tabs
                                value={activeTab}
                                onChange={(_, newValue) => setActiveTab(newValue)}
                                sx={{ borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab label="基本情報" />
                                <Tab label={`明細入力 (${items.filter(i => i.part_number).length}件)`} />
                                <Tab label={`PO紐付け (${linkedPOIds.length}件)`} />
                                <Tab label={`ファイル (${existingFiles.length + uploadedFiles.length}件)`} />
                            </Tabs>

                            {/* 基本情報タブ */}
                            <TabPanel value={activeTab} index={0}>
                                <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Autocomplete
                                                value={selectedBranch}
                                                onChange={(_, newValue) => {
                                                    setSelectedBranch(newValue);
                                                    setSupplierBranchId(newValue?.id || null);
                                                }}
                                                options={supplierBranches}
                                                getOptionLabel={(option) =>
                                                    `${option.supplier_name || ''} - ${option.branch_name}`
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="サプライヤー（海外）"
                                                        required
                                                        size="small"
                                                    />
                                                )}
                                                isOptionEqualToValue={(option, value) =>
                                                    option.id === value.id
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="インボイス番号"
                                                value={invoiceNumber}
                                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="通貨"
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value)}
                                                size="small"
                                                select
                                                SelectProps={{ native: true }}
                                            >
                                                <option value="USD">USD (米ドル)</option>
                                                <option value="EUR">EUR (ユーロ)</option>
                                                <option value="CNY">CNY (人民元)</option>
                                                <option value="JPY">JPY (日本円)</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="インボイス日付"
                                                type="date"
                                                value={invoiceDate}
                                                onChange={(e) => setInvoiceDate(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                size="small"
                                                required
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                label="受領日"
                                                type="date"
                                                value={receivedDate}
                                                onChange={(e) => setReceivedDate(e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="輸送費 (Transportation Fee)"
                                                type="number"
                                                value={transportationFee}
                                                onChange={(e) => setTransportationFee(e.target.value)}
                                                size="small"
                                                inputProps={{
                                                    min: 0,
                                                    step: 0.01,
                                                }}
                                                helperText="輸送費を入力（オプション）"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="備考"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                size="small"
                                                multiline
                                                rows={3}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={registerAsSemiFinished}
                                                        onChange={(e) =>
                                                            setRegisterAsSemiFinished(e.target.checked)
                                                        }
                                                    />
                                                }
                                                label="登録時に半製品として在庫登録する"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                チェックすると、インボイスの品目が自動的に半製品在庫として登録されます
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </TabPanel>

                            {/* 明細入力タブ */}
                            <TabPanel value={activeTab} index={1}>
                                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle2">
                                            品目を入力してください（サプライヤーマスターから選択または手動入力）
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={handleAddRow}
                                            size="small"
                                        >
                                            行を追加
                                        </Button>
                                    </Box>
                                    {loadingMaterials && (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            製品マスターを読み込み中...
                                        </Alert>
                                    )}
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: 200 }}>品番 *</TableCell>
                                                    <TableCell sx={{ width: 180 }}>品名・説明</TableCell>
                                                    <TableCell sx={{ width: 80 }} align="right">
                                                        数量 *
                                                    </TableCell>
                                                    <TableCell sx={{ width: 100 }} align="right">
                                                        単価
                                                    </TableCell>
                                                    <TableCell sx={{ width: 60 }}>単位</TableCell>
                                                    <TableCell sx={{ width: 40 }}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {items.map((item, index) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Autocomplete
                                                                freeSolo
                                                                options={supplierMaterials}
                                                                getOptionLabel={(option) =>
                                                                    typeof option === 'string' ? option : option.material_code
                                                                }
                                                                value={item.matched_material || item.part_number}
                                                                onChange={(_, newValue) => {
                                                                    if (typeof newValue === 'string') {
                                                                        handleUpdateRow(item.id, 'part_number', newValue);
                                                                    } else if (newValue) {
                                                                        handleMaterialSelect(item.id, newValue);
                                                                    }
                                                                }}
                                                                onInputChange={(_, newInputValue) => {
                                                                    handleUpdateRow(item.id, 'part_number', newInputValue);
                                                                }}
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        variant="standard"
                                                                        size="small"
                                                                        placeholder="品番を入力"
                                                                        onKeyDown={(e) =>
                                                                            handleKeyDown(
                                                                                e,
                                                                                item.id,
                                                                                'part_number',
                                                                                index
                                                                            )
                                                                        }
                                                                        inputRef={(ref) => {
                                                                            if (ref) {
                                                                                inputRefs.current.set(
                                                                                    `${item.id}-part_number`,
                                                                                    ref as HTMLInputElement
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                )}
                                                                renderOption={(props, option) => (
                                                                    <li {...props} key={option.id}>
                                                                        <Box>
                                                                            <Typography variant="body2">
                                                                                {option.material_code}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {option.material_name}
                                                                            </Typography>
                                                                        </Box>
                                                                    </li>
                                                                )}
                                                                fullWidth
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                value={item.description}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(
                                                                        item.id,
                                                                        'description',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) =>
                                                                    handleKeyDown(
                                                                        e,
                                                                        item.id,
                                                                        'description',
                                                                        index
                                                                    )
                                                                }
                                                                inputRef={(ref) => {
                                                                    if (ref) {
                                                                        inputRefs.current.set(
                                                                            `${item.id}-description`,
                                                                            ref
                                                                        );
                                                                    }
                                                                }}
                                                                size="small"
                                                                variant="standard"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(
                                                                        item.id,
                                                                        'quantity',
                                                                        e.target.value === ''
                                                                            ? ''
                                                                            : parseInt(e.target.value, 10)
                                                                    )
                                                                }
                                                                onKeyDown={(e) =>
                                                                    handleKeyDown(
                                                                        e,
                                                                        item.id,
                                                                        'quantity',
                                                                        index
                                                                    )
                                                                }
                                                                inputRef={(ref) => {
                                                                    if (ref) {
                                                                        inputRefs.current.set(
                                                                            `${item.id}-quantity`,
                                                                            ref
                                                                        );
                                                                    }
                                                                }}
                                                                size="small"
                                                                variant="standard"
                                                                inputProps={{
                                                                    style: { textAlign: 'right' },
                                                                    min: 0,
                                                                }}
                                                                sx={{ width: 70 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                type="number"
                                                                value={item.unit_price}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(
                                                                        item.id,
                                                                        'unit_price',
                                                                        e.target.value === ''
                                                                            ? ''
                                                                            : parseFloat(e.target.value)
                                                                    )
                                                                }
                                                                onKeyDown={(e) =>
                                                                    handleKeyDown(
                                                                        e,
                                                                        item.id,
                                                                        'unit_price',
                                                                        index
                                                                    )
                                                                }
                                                                inputRef={(ref) => {
                                                                    if (ref) {
                                                                        inputRefs.current.set(
                                                                            `${item.id}-unit_price`,
                                                                            ref
                                                                        );
                                                                    }
                                                                }}
                                                                size="small"
                                                                variant="standard"
                                                                inputProps={{
                                                                    style: { textAlign: 'right' },
                                                                    min: 0,
                                                                    step: 0.01,
                                                                }}
                                                                sx={{ width: 80 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                value={item.unit}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(
                                                                        item.id,
                                                                        'unit',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) =>
                                                                    handleKeyDown(
                                                                        e,
                                                                        item.id,
                                                                        'unit',
                                                                        index
                                                                    )
                                                                }
                                                                inputRef={(ref) => {
                                                                    if (ref) {
                                                                        inputRefs.current.set(
                                                                            `${item.id}-unit`,
                                                                            ref
                                                                        );
                                                                    }
                                                                }}
                                                                size="small"
                                                                variant="standard"
                                                                sx={{ width: 50 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleRemoveRow(item.id)}
                                                                color="error"
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            サプライヤーを選択すると、マスター登録された製品を選択できます
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight="medium">
                                            小計: {currency}{' '}
                                            {totalAmount.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </Typography>
                                    </Box>
                                </Box>
                            </TabPanel>

                            {/* PO紐付けタブ */}
                            <TabPanel value={activeTab} index={2}>
                                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        このインボイスに関連するPOを選択してください
                                    </Typography>
                                    {availablePOs.length === 0 ? (
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            紐付け可能なPOがありません。先にPOを作成してください。
                                        </Alert>
                                    ) : (
                                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell padding="checkbox"></TableCell>
                                                        <TableCell>PO番号</TableCell>
                                                        <TableCell>発注日</TableCell>
                                                        <TableCell>サプライヤー</TableCell>
                                                        <TableCell align="right">品目数</TableCell>
                                                        <TableCell>ステータス</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {availablePOs.map((po) => (
                                                        <TableRow
                                                            key={po.id}
                                                            hover
                                                            onClick={() => handlePOToggle(po.id)}
                                                            sx={{ cursor: 'pointer' }}
                                                        >
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    checked={linkedPOIds.includes(po.id)}
                                                                    onChange={() => handlePOToggle(po.id)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>{po.po_number}</TableCell>
                                                            <TableCell>{po.order_date}</TableCell>
                                                            <TableCell>
                                                                {po.supplier_name} - {po.supplier_branch_name}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                {po.total_items || 0}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={po.status_display || po.status}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Box>
                            </TabPanel>

                            {/* ファイルタブ */}
                            <TabPanel value={activeTab} index={3}>
                                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                                    {/* 既存ファイル */}
                                    {existingInvoice && existingFiles.length > 0 && (
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                既存ファイル ({existingFiles.length}件)
                                            </Typography>
                                            <List dense sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, mt: 1 }}>
                                                {existingFiles.map((file) => (
                                                    <ListItem
                                                        key={file.id}
                                                        selected={selectedExistingFile?.id === file.id}
                                                        onClick={() => handleExistingFileClick(file)}
                                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                        secondaryAction={
                                                            <IconButton
                                                                edge="end"
                                                                aria-label="delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteExistingFile(file.id);
                                                                }}
                                                                disabled={deletingFileId === file.id}
                                                                size="small"
                                                            >
                                                                {deletingFileId === file.id ? (
                                                                    <CircularProgress size={20} />
                                                                ) : (
                                                                    <DeleteIcon />
                                                                )}
                                                            </IconButton>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Chip
                                                                        label={ImportFileTypeLabels[file.file_type]}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color={selectedExistingFile?.id === file.id ? 'primary' : 'default'}
                                                                    />
                                                                    <Typography variant="body2">
                                                                        {file.file_name}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                            secondary={file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : ''}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    )}

                                    {/* 新規ファイル追加 */}
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            新しいファイルを追加
                                        </Typography>
                                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="ファイル種別"
                                                    value={selectedFileType}
                                                    onChange={(e) =>
                                                        setSelectedFileType(e.target.value as ImportFileType)
                                                    }
                                                    SelectProps={{ native: true }}
                                                >
                                                    {Object.entries(ImportFileTypeLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                                                    ref={fileInputRef}
                                                    onChange={handleFileSelect}
                                                    style={{ display: 'none' }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<CloudUploadIcon />}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    fullWidth
                                                >
                                                    ファイルを選択
                                                </Button>
                                            </Grid>
                                        </Grid>

                                        {/* アップロード済みファイル一覧 */}
                                        {uploadedFiles.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="caption" color="text.secondary" gutterBottom>
                                                    今回追加するファイル:
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                                    {uploadedFiles.map((f, index) => (
                                                        <Chip
                                                            key={index}
                                                            label={`${ImportFileTypeLabels[f.type]}: ${f.file.name}`}
                                                            size="small"
                                                            onDelete={() => {
                                                                setUploadedFiles((prev) =>
                                                                    prev.filter((_, i) => i !== index)
                                                                );
                                                                if (selectedFile === f.file) {
                                                                    setSelectedFile(null);
                                                                    setDisplayedFile(null);
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                setSelectedFile(f.file);
                                                                setDisplayedFile({ type: 'new', file: f.file });
                                                            }}
                                                            color={selectedFile === f.file ? 'primary' : 'default'}
                                                        />
                                                    ))}
                                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </TabPanel>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        品目数: {items.filter((i) => i.part_number).length} /
                        紐付けPO: {linkedPOIds.length}件 /
                        添付ファイル: {uploadedFiles.length}件
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onClose} disabled={saving}>
                        キャンセル
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || loading || !supplierBranchId}
                        startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                    >
                        {saving ? '保存中...' : existingInvoice ? '更新' : '登録'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default ImportModal;
