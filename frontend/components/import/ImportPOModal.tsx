// components/import/ImportPOModal.tsx
// 輸入PO（Purchase Order）作成・編集モーダル

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
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { SupplierBranch } from '@/types/supplier';
import {
    ImportPO,
    ImportPOCreateData,
    ImportPOItem,
    ImportPOItemCreateData,
    ImportPOStatusLabels,
} from '@/types/import';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface POItemRow {
    id: string;
    part_number: string;
    description: string;
    quantity: number | '';
    unit_price: number | '';
    unit: string;
}

interface ImportPOModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: ImportPOCreateData) => Promise<void>;
    existingPO?: ImportPO | null;
    supplierBranchId?: number;
}

// 空の行を生成
const createEmptyRow = (): POItemRow => ({
    id: uuidv4(),
    part_number: '',
    description: '',
    quantity: '',
    unit_price: '',
    unit: '個',
});

export const ImportPOModal: React.FC<ImportPOModalProps> = ({
    open,
    onClose,
    onSave,
    existingPO,
    supplierBranchId: initialSupplierBranchId,
}) => {
    // フォームデータ
    const [supplierBranchId, setSupplierBranchId] = useState<number | null>(
        initialSupplierBranchId || null
    );
    const [orderDate, setOrderDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [expectedShipDate, setExpectedShipDate] = useState<string>('');
    const [expectedArrivalDate, setExpectedArrivalDate] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<POItemRow[]>([createEmptyRow()]);

    // UI状態
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [supplierBranches, setSupplierBranches] = useState<SupplierBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);

    // フォーカス管理用ref
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // サプライヤー支店の読み込み
    useEffect(() => {
        const loadSupplierBranches = async () => {
            try {
                setLoading(true);
                const branches = await supplierApi.getSupplierBranches();
                // 海外サプライヤーをフィルタリング（実際の実装ではAPIでフィルタリング）
                setSupplierBranches(branches);

                // 初期選択
                if (initialSupplierBranchId) {
                    const branch = branches.find(b => b.id === initialSupplierBranchId);
                    if (branch) {
                        setSelectedBranch(branch);
                    }
                }
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
    }, [open, initialSupplierBranchId]);

    // 既存POの読み込み
    useEffect(() => {
        if (existingPO && open) {
            setSupplierBranchId(existingPO.supplier_branch);
            setOrderDate(existingPO.order_date);
            setExpectedShipDate(existingPO.expected_ship_date || '');
            setExpectedArrivalDate(existingPO.expected_arrival_date || '');
            setCurrency(existingPO.currency || 'USD');
            setNotes(existingPO.notes || '');

            if (existingPO.items && existingPO.items.length > 0) {
                setItems(
                    existingPO.items.map((item) => ({
                        id: uuidv4(),
                        part_number: item.part_number,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price || '',
                        unit: item.unit,
                    }))
                );
            }
        }
    }, [existingPO, open]);

    // モーダルが閉じた時のリセット
    useEffect(() => {
        if (!open) {
            setSupplierBranchId(initialSupplierBranchId || null);
            setOrderDate(new Date().toISOString().split('T')[0]);
            setExpectedShipDate('');
            setExpectedArrivalDate('');
            setCurrency('USD');
            setNotes('');
            setItems([createEmptyRow()]);
            setSelectedBranch(null);
        }
    }, [open, initialSupplierBranchId]);

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
        (rowId: string, field: keyof POItemRow, value: string | number) => {
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
            e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
            rowId: string,
            field: keyof POItemRow,
            rowIndex: number
        ) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const fields: (keyof POItemRow)[] = [
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
                    // 少し遅延してからフォーカス
                    setTimeout(() => {
                        const newItems = [...items, createEmptyRow()];
                        const lastRowId = newItems[newItems.length - 1].id;
                        const nextRef = inputRefs.current.get(`${lastRowId}-part_number`);
                        nextRef?.focus();
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

            const poItems: ImportPOItemCreateData[] = validItems.map((item) => ({
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
            }));

            const data: ImportPOCreateData = {
                supplier_branch: supplierBranchId,
                order_date: orderDate,
                expected_ship_date: expectedShipDate || undefined,
                expected_arrival_date: expectedArrivalDate || undefined,
                currency,
                notes: notes || undefined,
                items: poItems,
            };

            await onSave(data);
            toast.success(existingPO ? 'POを更新しました' : 'POを作成しました');
            onClose();
        } catch (error) {
            console.error('Failed to save PO:', error);
            toast.error('POの保存に失敗しました');
        } finally {
            setSaving(false);
        }
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
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '90vh' },
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
                        {existingPO ? '輸入PO編集' : '新規輸入PO作成'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {existingPO && (
                            <Chip
                                label={ImportPOStatusLabels[existingPO.status]}
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

            <DialogContent dividers sx={{ p: 0 }}>
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
                    <Box sx={{ p: 3 }}>
                        {/* ヘッダー情報 */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
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
                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    label="発注日"
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    size="small"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
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
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="出荷予定日"
                                    type="date"
                                    value={expectedShipDate}
                                    onChange={(e) => setExpectedShipDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="到着予定日"
                                    type="date"
                                    value={expectedArrivalDate}
                                    onChange={(e) => setExpectedArrivalDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="備考"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    size="small"
                                    multiline
                                    rows={1}
                                />
                            </Grid>
                        </Grid>

                        {/* 明細テーブル */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                                発注明細
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell sx={{ width: 150 }}>品番 *</TableCell>
                                            <TableCell sx={{ width: 250 }}>品名・説明</TableCell>
                                            <TableCell sx={{ width: 100 }} align="right">
                                                数量 *
                                            </TableCell>
                                            <TableCell sx={{ width: 120 }} align="right">
                                                単価
                                            </TableCell>
                                            <TableCell sx={{ width: 80 }}>単位</TableCell>
                                            <TableCell sx={{ width: 120 }} align="right">
                                                金額
                                            </TableCell>
                                            <TableCell sx={{ width: 50 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((item, index) => {
                                            const qty =
                                                typeof item.quantity === 'number'
                                                    ? item.quantity
                                                    : 0;
                                            const price =
                                                typeof item.unit_price === 'number'
                                                    ? item.unit_price
                                                    : 0;
                                            const amount = qty * price;

                                            return (
                                                <TableRow key={item.id}>
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
                                                            sx={{ width: 60 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2">
                                                            {amount > 0
                                                                ? amount.toLocaleString(undefined, {
                                                                      minimumFractionDigits: 2,
                                                                      maximumFractionDigits: 2,
                                                                  })
                                                                : '-'}
                                                        </Typography>
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
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        {/* 行追加ボタン */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleAddRow}
                                size="small"
                            >
                                行を追加
                            </Button>
                            <Typography variant="subtitle1" fontWeight="medium">
                                合計金額: {currency}{' '}
                                {totalAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={saving}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || loading}
                    startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                    {saving ? '保存中...' : existingPO ? '更新' : '作成'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportPOModal;
