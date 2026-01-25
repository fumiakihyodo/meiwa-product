// components/import/ImportModal.tsx
// OCR統合型Invoice登録モーダル
// 既存PDFビューア機能を流用しOCRと統合

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
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    CloudUpload as CloudUploadIcon,
    Scanner as ScannerIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
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
    OCRFormRow,
    OCRExtractedItem,
} from '@/types/import';
import { supplierApi } from '@/services/apiSupplier';
import PDFViewerWithOCR from './PDFViewerWithOCR';
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

// 空のフォーム行を生成
const createEmptyRow = (): OCRFormRow => ({
    id: uuidv4(),
    part_number: '',
    description: '',
    quantity: '',
    unit_price: '',
    unit: '個',
    is_matched: false,
});

// OCR抽出結果をフォーム行に変換
const ocrItemToFormRow = (item: OCRExtractedItem): OCRFormRow => ({
    id: item.id,
    part_number: item.part_number,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price || '',
    unit: '個',
    confidence: item.confidence,
    is_matched: item.is_matched || false,
    matched_material_id: item.matched_material_id,
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
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<OCRFormRow[]>([createEmptyRow()]);
    const [registerAsSemiFinished, setRegisterAsSemiFinished] = useState<boolean>(true);

    // UI状態
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [supplierBranches, setSupplierBranches] = useState<SupplierBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [ocrInProgress, setOcrInProgress] = useState(false);

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

    // 既存インボイスの読み込み
    useEffect(() => {
        if (existingInvoice && open) {
            setInvoiceNumber(existingInvoice.invoice_number);
            setSupplierBranchId(existingInvoice.supplier_branch);
            setInvoiceDate(existingInvoice.invoice_date);
            setReceivedDate(existingInvoice.received_date || '');
            setCurrency(existingInvoice.currency || 'USD');
            setNotes(existingInvoice.notes || '');
            setLinkedPOIds(existingInvoice.linked_po_ids || []);

            if (existingInvoice.items && existingInvoice.items.length > 0) {
                setItems(
                    existingInvoice.items.map((item) => ({
                        id: uuidv4(),
                        part_number: item.part_number,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price || '',
                        unit: item.unit,
                        is_matched: !!item.material,
                        matched_material_id: item.material,
                    }))
                );
            }

            const branch = supplierBranches.find(b => b.id === existingInvoice.supplier_branch);
            if (branch) {
                setSelectedBranch(branch);
            }
        }
    }, [existingInvoice, open, supplierBranches]);

    // モーダルが閉じた時のリセット
    useEffect(() => {
        if (!open) {
            setSelectedFile(null);
            setSelectedFileType('invoice');
            setUploadedFiles([]);
            setInvoiceNumber('');
            setSupplierBranchId(null);
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setReceivedDate(new Date().toISOString().split('T')[0]);
            setLinkedPOIds([]);
            setCurrency('USD');
            setNotes('');
            setItems([createEmptyRow()]);
            setSelectedBranch(null);
            setActiveTab(0);
            setRegisterAsSemiFinished(true);
        }
    }, [open]);

    // ファイル選択ハンドラー
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
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

    // OCR完了時のハンドラー
    const handleOCRItemsExtracted = useCallback((extractedItems: OCRExtractedItem[]) => {
        if (extractedItems.length > 0) {
            setItems(extractedItems.map(ocrItemToFormRow));
            // フォームタブに切り替え
            setActiveTab(1);
        }
    }, []);

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
        (rowId: string, field: keyof OCRFormRow, value: string | number | boolean) => {
            setItems((prev) =>
                prev.map((item) =>
                    item.id === rowId ? { ...item, [field]: value } : item
                )
            );
        },
        []
    );

    // Enterキーで次のフィールドにフォーカス移動
    const handleKeyDown = useCallback(
        (
            e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLDivElement>,
            rowId: string,
            field: keyof OCRFormRow,
            rowIndex: number
        ) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const fields: (keyof OCRFormRow)[] = [
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
                        const lastItem = items[items.length - 1];
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

    // 信頼度に応じたアイコン
    const getConfidenceIcon = (confidence?: number) => {
        if (!confidence) return null;
        if (confidence >= 0.7) {
            return <CheckCircleIcon fontSize="small" color="success" />;
        } else if (confidence >= 0.4) {
            return <WarningIcon fontSize="small" color="warning" />;
        }
        return <WarningIcon fontSize="small" color="error" />;
    };

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
                        {existingInvoice ? 'インボイス編集' : 'OCR インボイス登録'}
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
                        {/* 左側: PDFプレビュー */}
                        <Box
                            sx={{
                                width: '50%',
                                borderRight: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* ファイル選択 */}
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={4}>
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
                                    <Grid item xs={8}>
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
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                                                    }
                                                }}
                                                onClick={() => setSelectedFile(f.file)}
                                                color={selectedFile === f.file ? 'primary' : 'default'}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>

                            {/* PDFビューア + OCR */}
                            <Box sx={{ flex: 1 }}>
                                <PDFViewerWithOCR
                                    file={selectedFile}
                                    onOCRItemsExtracted={handleOCRItemsExtracted}
                                    showOCRButton={true}
                                    height="100%"
                                />
                            </Box>
                        </Box>

                        {/* 右側: フォーム */}
                        <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
                            <Tabs
                                value={activeTab}
                                onChange={(_, newValue) => setActiveTab(newValue)}
                                sx={{ borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab label="基本情報" />
                                <Tab label={`明細入力 (${items.filter(i => i.part_number).length}件)`} />
                                <Tab label={`PO紐付け (${linkedPOIds.length}件)`} />
                            </Tabs>

                            {/* 基本情報タブ */}
                            <TabPanel value={activeTab} index={0}>
                                <Box sx={{ p: 3 }}>
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
                                                label="備考"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                size="small"
                                                multiline
                                                rows={2}
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
                                            OCRで抽出した品目を確認・修正してください
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
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: 30 }}></TableCell>
                                                    <TableCell sx={{ width: 130 }}>品番 *</TableCell>
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
                                                            <Tooltip
                                                                title={
                                                                    item.confidence
                                                                        ? `OCR信頼度: ${Math.round(item.confidence * 100)}%`
                                                                        : ''
                                                                }
                                                            >
                                                                <Box>{getConfidenceIcon(item.confidence)}</Box>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                value={item.part_number}
                                                                onChange={(e) =>
                                                                    handleUpdateRow(
                                                                        item.id,
                                                                        'part_number',
                                                                        e.target.value
                                                                    )
                                                                }
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
                                                                            ref
                                                                        );
                                                                    }
                                                                }}
                                                                size="small"
                                                                variant="standard"
                                                                placeholder="品番を入力"
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
                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                        <Typography variant="subtitle1" fontWeight="medium">
                                            合計金額: {currency}{' '}
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
