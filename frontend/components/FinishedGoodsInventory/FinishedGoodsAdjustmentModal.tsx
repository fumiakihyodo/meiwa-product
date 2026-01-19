'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Alert,
    CircularProgress,
    ToggleButtonGroup,
    ToggleButton,
    Autocomplete,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import {
    FinishedGoodsWithInventory,
    FinishedGoodsAdjustmentReason,
    FinishedGoodsAdjustmentReasonLabels,
} from '@/types/manufacturing-inventory';
import { ProductionPlan, ManufacturingItem } from '@/services/apiManufacturing';
import { finishedGoodsInventoryApi } from '@/services/apiFinishedGoodsInventory';

interface FinishedGoodsAdjustmentModalProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
    item: FinishedGoodsWithInventory | null;
    manufacturingItems: ManufacturingItem[];
    productionPlans: ProductionPlan[];
}

// フォーム入力フィールドの順序
const FIELD_ORDER = [
    'manufacturingItem',
    'productionPlan',
    'adjustmentType',
    'quantity',
    'lotNumber',
    'storageLocation',
    'reason',
    'notes',
];

export const FinishedGoodsAdjustmentModal: React.FC<FinishedGoodsAdjustmentModalProps> = ({
    open,
    onClose,
    onComplete,
    item,
    manufacturingItems,
    productionPlans,
}) => {
    // フォーム状態
    const [selectedManufacturingItem, setSelectedManufacturingItem] = useState<ManufacturingItem | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
    const [quantity, setQuantity] = useState<number>(0);
    const [lotNumber, setLotNumber] = useState<string>('');
    const [storageLocation, setStorageLocation] = useState<string>('');
    const [reason, setReason] = useState<FinishedGoodsAdjustmentReason>('production_complete');
    const [notes, setNotes] = useState<string>('');

    // UI状態
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ref for focus management
    const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLButtonElement | null>>({});

    // 初期化
    useEffect(() => {
        if (open) {
            if (item) {
                // 既存アイテムからの調整
                const manufacturingItem = manufacturingItems.find(
                    (mi) => mi.id === item.manufacturing_item_id
                );
                setSelectedManufacturingItem(manufacturingItem || null);
                setSelectedPlan(null);
            } else {
                setSelectedManufacturingItem(null);
                setSelectedPlan(null);
            }
            setAdjustmentType('increase');
            setQuantity(0);
            setLotNumber('');
            setStorageLocation('');
            setReason('production_complete');
            setNotes('');
            setError(null);
        }
    }, [open, item, manufacturingItems]);

    // 製作品選択時に関連する生産計画をフィルタ
    const filteredPlans = selectedManufacturingItem
        ? productionPlans.filter((plan) => plan.manufacturing_item === selectedManufacturingItem.id)
        : productionPlans;

    // Enterキーによるフォーカス遷移
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, currentField: string) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentIndex = FIELD_ORDER.indexOf(currentField);
                if (currentIndex >= 0 && currentIndex < FIELD_ORDER.length - 1) {
                    const nextField = FIELD_ORDER[currentIndex + 1];
                    const nextRef = fieldRefs.current[nextField];
                    if (nextRef) {
                        setTimeout(() => {
                            nextRef.focus();
                            if (nextRef instanceof HTMLInputElement && nextRef.select) {
                                nextRef.select();
                            }
                        }, 0);
                    }
                }
            }
        },
        []
    );

    // フォーカス設定用のヘルパー
    const setFieldRef = useCallback((field: string) => (ref: HTMLInputElement | HTMLButtonElement | null) => {
        fieldRefs.current[field] = ref;
    }, []);

    // フォーム送信
    const handleSubmit = async () => {
        // バリデーション
        if (!selectedManufacturingItem) {
            setError('製作品を選択してください');
            return;
        }
        if (quantity <= 0) {
            setError('数量を入力してください');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await finishedGoodsInventoryApi.adjustInventory({
                manufacturing_item_id: selectedManufacturingItem.id,
                adjustment_type: adjustmentType,
                quantity,
                reason,
                lot_number: lotNumber || undefined,
                storage_location: storageLocation || undefined,
                notes: notes || undefined,
            });

            onComplete();
        } catch (err) {
            console.error('Failed to adjust inventory:', err);
            setError('在庫調整に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 生産計画選択時の処理
    const handlePlanSelect = (plan: ProductionPlan | null) => {
        setSelectedPlan(plan);
        if (plan) {
            // 計画番号をロット番号として設定
            setLotNumber(plan.plan_number);
            // 完成数量から残り数量を数量に設定
            const remaining = plan.total_planned_quantity - plan.completed_quantity;
            if (remaining > 0) {
                setQuantity(remaining);
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {item ? '製作品在庫調整' : '製作品在庫登録'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {/* 製作品選択 */}
                    <Autocomplete
                        value={selectedManufacturingItem}
                        onChange={(_, newValue) => setSelectedManufacturingItem(newValue)}
                        options={manufacturingItems}
                        getOptionLabel={(option) =>
                            `${option.manufacturing_number} - ${option.manufacturing_name}`
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="製作品 *"
                                placeholder="製作品を選択"
                                inputRef={setFieldRef('manufacturingItem')}
                                onKeyDown={(e) => handleKeyDown(e, 'manufacturingItem')}
                            />
                        )}
                        disabled={!!item}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />

                    {/* 生産計画選択（オプション） */}
                    <Autocomplete
                        value={selectedPlan}
                        onChange={(_, newValue) => handlePlanSelect(newValue)}
                        options={filteredPlans}
                        getOptionLabel={(option) =>
                            `${option.plan_number} (計画: ${option.total_planned_quantity}, 完成: ${option.completed_quantity})`
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="生産計画（任意）"
                                placeholder="生産計画を選択"
                                inputRef={setFieldRef('productionPlan')}
                                onKeyDown={(e) => handleKeyDown(e, 'productionPlan')}
                            />
                        )}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />

                    {/* 調整タイプ */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            調整タイプ
                        </Typography>
                        <ToggleButtonGroup
                            value={adjustmentType}
                            exclusive
                            onChange={(_, value) => {
                                if (value) setAdjustmentType(value);
                            }}
                            fullWidth
                        >
                            <ToggleButton
                                value="increase"
                                color="success"
                                ref={setFieldRef('adjustmentType')}
                            >
                                <AddIcon sx={{ mr: 1 }} />
                                増加
                            </ToggleButton>
                            <ToggleButton value="decrease" color="error">
                                <RemoveIcon sx={{ mr: 1 }} />
                                減少
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* 数量 */}
                    <TextField
                        label="数量 *"
                        type="number"
                        value={quantity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value, 10) || 0)}
                        inputRef={setFieldRef('quantity')}
                        onKeyDown={(e) => handleKeyDown(e, 'quantity')}
                        InputProps={{
                            endAdornment: selectedManufacturingItem && (
                                <Typography variant="body2" color="text.secondary">
                                    {selectedManufacturingItem.unit}
                                </Typography>
                            ),
                        }}
                        inputProps={{ min: 1 }}
                        fullWidth
                    />

                    {/* ロット番号 */}
                    <TextField
                        label="ロット番号"
                        value={lotNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)}
                        inputRef={setFieldRef('lotNumber')}
                        onKeyDown={(e) => handleKeyDown(e, 'lotNumber')}
                        placeholder="例: PP-20250119-0001"
                        fullWidth
                    />

                    {/* 保管場所 */}
                    <TextField
                        label="保管場所"
                        value={storageLocation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStorageLocation(e.target.value)}
                        inputRef={setFieldRef('storageLocation')}
                        onKeyDown={(e) => handleKeyDown(e, 'storageLocation')}
                        placeholder="例: A棟1-2-3"
                        fullWidth
                    />

                    {/* 理由 */}
                    <FormControl fullWidth>
                        <InputLabel>理由</InputLabel>
                        <Select
                            value={reason}
                            label="理由"
                            onChange={(e: SelectChangeEvent<FinishedGoodsAdjustmentReason>) =>
                                setReason(e.target.value as FinishedGoodsAdjustmentReason)
                            }
                            inputRef={setFieldRef('reason')}
                            onKeyDown={(e) => handleKeyDown(e as React.KeyboardEvent, 'reason')}
                        >
                            {Object.entries(FinishedGoodsAdjustmentReasonLabels).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* 備考 */}
                    <TextField
                        label="備考"
                        value={notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                        inputRef={setFieldRef('notes')}
                        onKeyDown={(e) => handleKeyDown(e, 'notes')}
                        multiline
                        rows={2}
                        fullWidth
                    />

                    {/* 現在の在庫情報（既存アイテムの場合） */}
                    {item && (
                        <Alert severity="info">
                            現在の在庫: {item.total_quantity.toLocaleString()} {item.unit}
                            <br />
                            {adjustmentType === 'increase'
                                ? `調整後: ${(item.total_quantity + quantity).toLocaleString()} ${item.unit}`
                                : `調整後: ${(item.total_quantity - quantity).toLocaleString()} ${item.unit}`}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    キャンセル
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading || !selectedManufacturingItem || quantity <= 0}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? '処理中...' : '登録'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FinishedGoodsAdjustmentModal;
