// app/production-planning/components/DomesticPlanFormModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    IconButton,
    Divider,
    CircularProgress,
    FormControlLabel,
    Checkbox,
    Paper,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    ProductionType,
    ProductionPlanListItem,
    ProductionPlanDetail,
    ManufacturingItemForPlanning,
    ProductionPlanStatus,
    ModalMode,
    STATUS_OPTIONS,
    DeliveryScheduleItem,
    DeliveryValidationErrors,
} from '@/types/production-planning';
import { productionPlanApi, domesticPlanApi } from '@/services/apiProductionPlanning';
import toast from 'react-hot-toast';

// =============================================================================
// 型定義
// =============================================================================

interface DomesticPlanFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: ModalMode;
    plan: ProductionPlanListItem | null;
    manufacturingItems: ManufacturingItemForPlanning[];
}

interface FormData {
    manufacturing_item: number | '';
    total_planned_quantity: number | '';
    planned_start_date: string;
    planned_end_date: string;
    status: ProductionPlanStatus;
    notes: string;
    auto_stock_enabled: boolean;
}

interface FormErrors {
    manufacturing_item?: string;
    total_planned_quantity?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    deliveries?: string;
    general?: string;
}

// =============================================================================
// 初期値
// =============================================================================

const initialFormData: FormData = {
    manufacturing_item: '',
    total_planned_quantity: '',
    planned_start_date: '',
    planned_end_date: '',
    status: 'draft',
    notes: '',
    auto_stock_enabled: true,
};

const createEmptyDelivery = (): DeliveryScheduleItem => ({
    delivery_date: '',
    quantity: 0,
    auto_stock_enabled: true,
});

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function DomesticPlanFormModal({
    open,
    onClose,
    onSuccess,
    mode,
    plan,
    manufacturingItems,
}: DomesticPlanFormModalProps) {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [planDetail, setPlanDetail] = useState<ProductionPlanDetail | null>(null);
    const [deliveries, setDeliveries] = useState<DeliveryScheduleItem[]>([]);
    const [deliveryErrors, setDeliveryErrors] = useState<DeliveryValidationErrors[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // フォーカス管理用のref
    const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
    const deliveryDateRefs = useRef<(HTMLInputElement | null)[]>([]);
    const deliveryQuantityRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';

    const productionType: ProductionType = 'domestic';

    // ==========================================================================
    // タイトル
    // ==========================================================================

    const getTitle = () => {
        switch (mode) {
            case 'create':
                return '国内生産 新規計画作成';
            case 'edit':
                return '国内生産計画 - 編集';
            case 'view':
                return '国内生産計画 - 詳細';
            default:
                return '国内生産計画';
        }
    };

    // ==========================================================================
    // 詳細データの取得
    // ==========================================================================

    const fetchPlanDetail = useCallback(async () => {
        if (!plan || isCreateMode) return;

        try {
            setDetailLoading(true);
            const detail = await productionPlanApi.getPlan(productionType, plan.id);
            setPlanDetail(detail);

            setFormData({
                manufacturing_item: detail.manufacturing_item,
                total_planned_quantity: detail.total_planned_quantity,
                planned_start_date: detail.planned_start_date || '',
                planned_end_date: detail.planned_end_date || '',
                status: detail.status,
                notes: detail.notes || '',
                auto_stock_enabled: true,
            });

            // 既存のスケジュールを分納データに変換
            if (detail.schedules && detail.schedules.length > 0) {
                const existingDeliveries: DeliveryScheduleItem[] = detail.schedules.map(schedule => {
                    let autoStockEnabled = true;
                    try {
                        const notesData = schedule.notes ? JSON.parse(schedule.notes) : {};
                        autoStockEnabled = notesData.auto_stock_enabled !== false;
                    } catch {
                        // JSONパースに失敗した場合はデフォルト値を使用
                    }
                    return {
                        id: schedule.id,
                        delivery_date: schedule.finished_at ? schedule.finished_at.split('T')[0] : '',
                        quantity: schedule.quantity,
                        auto_stock_enabled: autoStockEnabled,
                    };
                });
                setDeliveries(existingDeliveries);
            }
        } catch (error) {
            console.error('生産計画詳細の取得に失敗しました:', error);
            toast.error('生産計画詳細の取得に失敗しました');
        } finally {
            setDetailLoading(false);
        }
    }, [plan, isCreateMode]);

    // ==========================================================================
    // モーダル初期化
    // ==========================================================================

    useEffect(() => {
        if (open) {
            setErrors({});
            setDeliveryErrors([]);
            if (isCreateMode) {
                setFormData(initialFormData);
                setPlanDetail(null);
                setDeliveries([]);
            } else if (plan) {
                fetchPlanDetail();
            }
        }
    }, [open, isCreateMode, plan, fetchPlanDetail]);

    // ==========================================================================
    // 入力変更ハンドラ
    // ==========================================================================

    const handleChange = (field: keyof FormData, value: string | number | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    // ==========================================================================
    // 分納の追加・削除・更新
    // ==========================================================================

    const handleAddDelivery = () => {
        setDeliveries([...deliveries, createEmptyDelivery()]);
        setDeliveryErrors([...deliveryErrors, {}]);
    };

    const handleRemoveDelivery = (index: number) => {
        const newDeliveries = deliveries.filter((_, i) => i !== index);
        const newErrors = deliveryErrors.filter((_, i) => i !== index);
        setDeliveries(newDeliveries);
        setDeliveryErrors(newErrors);
    };

    const handleDeliveryChange = (
        index: number,
        field: keyof DeliveryScheduleItem,
        value: string | number | boolean
    ) => {
        const newDeliveries = [...deliveries];
        newDeliveries[index] = { ...newDeliveries[index], [field]: value };
        setDeliveries(newDeliveries);

        // エラーをクリア
        const newErrors = [...deliveryErrors];
        if (newErrors[index]) {
            newErrors[index] = { ...newErrors[index], [field === 'delivery_date' ? 'delivery_date' : 'quantity']: undefined };
        }
        setDeliveryErrors(newErrors);

        // 合計エラーもクリア
        setErrors(prev => ({ ...prev, deliveries: undefined }));
    };

    // ==========================================================================
    // Enterキーでのフォーカス移動
    // ==========================================================================

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLElement>,
        currentIndex: number,
        type: 'main' | 'delivery_date' | 'delivery_quantity',
        deliveryIndex?: number
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (type === 'main') {
                // メインフォームの次の入力フィールドへ
                const nextRef = inputRefs.current[currentIndex + 1];
                if (nextRef) {
                    nextRef.focus();
                } else if (deliveryDateRefs.current[0]) {
                    deliveryDateRefs.current[0].focus();
                }
            } else if (type === 'delivery_date' && deliveryIndex !== undefined) {
                // 分納日から数量へ
                const quantityRef = deliveryQuantityRefs.current[deliveryIndex];
                if (quantityRef) {
                    quantityRef.focus();
                }
            } else if (type === 'delivery_quantity' && deliveryIndex !== undefined) {
                // 数量から次の分納日へ
                const nextDateRef = deliveryDateRefs.current[deliveryIndex + 1];
                if (nextDateRef) {
                    nextDateRef.focus();
                }
            }
        }
    };

    // ==========================================================================
    // バリデーション
    // ==========================================================================

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        const newDeliveryErrors: DeliveryValidationErrors[] = [];
        let isValid = true;

        // 基本項目のバリデーション
        if (!formData.manufacturing_item) {
            newErrors.manufacturing_item = '制作品を選択してください';
            isValid = false;
        }

        const totalQuantity = Number(formData.total_planned_quantity);
        if (!formData.total_planned_quantity || totalQuantity <= 0) {
            newErrors.total_planned_quantity = '生産計画数を入力してください（1以上）';
            isValid = false;
        }

        // 分納のバリデーション
        if (deliveries.length > 0) {
            let totalDeliveryQuantity = 0;

            deliveries.forEach((delivery, index) => {
                const deliveryError: DeliveryValidationErrors = {};

                // 分納日のバリデーション
                if (!delivery.delivery_date) {
                    deliveryError.delivery_date = '分納日を入力してください';
                    isValid = false;
                } else if (formData.planned_end_date && delivery.delivery_date > formData.planned_end_date) {
                    deliveryError.delivery_date = '分納日は完了予定日以前にしてください';
                    isValid = false;
                }

                // 数量のバリデーション
                if (!delivery.quantity || delivery.quantity <= 0) {
                    deliveryError.quantity = '数量を入力してください（1以上）';
                    isValid = false;
                } else {
                    totalDeliveryQuantity += delivery.quantity;
                }

                newDeliveryErrors[index] = deliveryError;
            });

            // 合計数量のバリデーション
            if (totalQuantity > 0 && totalDeliveryQuantity !== totalQuantity) {
                newErrors.deliveries = `分納数量の合計（${totalDeliveryQuantity}）が生産計画数（${totalQuantity}）と一致しません`;
                isValid = false;
            }
        }

        setErrors(newErrors);
        setDeliveryErrors(newDeliveryErrors);
        return isValid;
    };

    // ==========================================================================
    // 保存処理
    // ==========================================================================

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setLoading(true);

            // 分納スケジュールの作成データを準備
            const schedulesData = deliveries.map(delivery => ({
                quantity: delivery.quantity,
                finished_at: `${delivery.delivery_date}T00:00:00`,
                notes: JSON.stringify({ auto_stock_enabled: delivery.auto_stock_enabled }),
            }));

            if (isCreateMode) {
                // 新規作成
                const createData = {
                    manufacturing_item: Number(formData.manufacturing_item),
                    total_planned_quantity: Number(formData.total_planned_quantity),
                    planned_start_date: formData.planned_start_date || null,
                    planned_end_date: formData.planned_end_date || null,
                    status: formData.status,
                    priority: 5,  // デフォルト値を設定（優先度フィールドは削除したが、バックエンドでは必要）
                    notes: formData.notes,
                    schedules: schedulesData,
                };

                await domesticPlanApi.createPlan(createData);
                toast.success('生産計画を作成しました');
            } else if (isEditMode && plan) {
                // 更新（分納は別途更新が必要な場合がある）
                const updateData = {
                    manufacturing_item: Number(formData.manufacturing_item),
                    total_planned_quantity: Number(formData.total_planned_quantity),
                    planned_start_date: formData.planned_start_date || null,
                    planned_end_date: formData.planned_end_date || null,
                    status: formData.status,
                    notes: formData.notes,
                };

                await domesticPlanApi.updatePlan(plan.id, updateData);

                // 新しい分納スケジュールを追加
                for (const schedule of schedulesData) {
                    if (!deliveries.find(d => d.id)) {
                        await domesticPlanApi.addSchedule(plan.id, schedule);
                    }
                }

                toast.success('生産計画を更新しました');
            }

            onSuccess();
        } catch (error) {
            console.error('保存に失敗しました:', error);
            toast.error('保存に失敗しました');
            setErrors({ general: '保存に失敗しました。入力内容を確認してください。' });
        } finally {
            setLoading(false);
        }
    };

    // ==========================================================================
    // 選択された制作品の情報
    // ==========================================================================

    const selectedItem = manufacturingItems.find(
        (item) => item.id === formData.manufacturing_item
    );

    // 分納数量の合計
    const totalDeliveryQuantity = deliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const plannedQuantity = Number(formData.total_planned_quantity) || 0;
    const quantityDiff = plannedQuantity - totalDeliveryQuantity;

    // ==========================================================================
    // レンダリング
    // ==========================================================================

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '70vh' },
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{getTitle()}</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {detailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* 基本情報セクション */}
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                基本情報
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* 計画番号（編集・閲覧時のみ） */}
                                {!isCreateMode && planDetail && (
                                    <TextField
                                        label="計画番号"
                                        value={planDetail.plan_number}
                                        fullWidth
                                        disabled
                                    />
                                )}

                                {/* 制作品選択 */}
                                <FormControl fullWidth error={!!errors.manufacturing_item}>
                                    <InputLabel>制作品 *</InputLabel>
                                    <Select
                                        value={formData.manufacturing_item}
                                        onChange={(e) => handleChange('manufacturing_item', e.target.value)}
                                        label="制作品 *"
                                        disabled={isViewMode}
                                    >
                                        {manufacturingItems.map((item) => (
                                            <MenuItem key={item.id} value={item.id}>
                                                {item.manufacturing_number} - {item.manufacturing_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.manufacturing_item && (
                                        <Typography variant="caption" color="error">
                                            {errors.manufacturing_item}
                                        </Typography>
                                    )}
                                </FormControl>

                                {/* 選択された制作品の情報 */}
                                {selectedItem && (
                                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            製品: {selectedItem.product_name || '未設定'} |
                                            単位: {selectedItem.unit} |
                                            標準製造時間: {selectedItem.standard_production_time || '-'}時間
                                        </Typography>
                                    </Box>
                                )}

                                {/* 生産計画数 */}
                                <TextField
                                    label="生産計画数 *"
                                    type="number"
                                    value={formData.total_planned_quantity}
                                    onChange={(e) => handleChange('total_planned_quantity', e.target.value)}
                                    fullWidth
                                    disabled={isViewMode}
                                    error={!!errors.total_planned_quantity}
                                    helperText={errors.total_planned_quantity}
                                    inputProps={{ min: 1 }}
                                    inputRef={(el) => (inputRefs.current[1] = el)}
                                    onKeyDown={(e) => handleKeyDown(e, 1, 'main')}
                                />

                                {/* 日程 */}
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        label="開始予定日"
                                        type="date"
                                        value={formData.planned_start_date}
                                        onChange={(e) => handleChange('planned_start_date', e.target.value)}
                                        fullWidth
                                        disabled={isViewMode}
                                        InputLabelProps={{ shrink: true }}
                                        inputRef={(el) => (inputRefs.current[2] = el)}
                                        onKeyDown={(e) => handleKeyDown(e , 2, 'main')}
                                    />
                                    <TextField
                                        label="完了予定日"
                                        type="date"
                                        value={formData.planned_end_date}
                                        onChange={(e) => handleChange('planned_end_date', e.target.value)}
                                        fullWidth
                                        disabled={isViewMode}
                                        InputLabelProps={{ shrink: true }}
                                        inputRef={(el) => (inputRefs.current[3] = el)}
                                        onKeyDown={(e) => handleKeyDown(e , 3, 'main')}
                                    />
                                </Box>

                                {/* ステータス */}
                                <FormControl fullWidth>
                                    <InputLabel>ステータス</InputLabel>
                                    <Select
                                        value={formData.status}
                                        onChange={(e) => handleChange('status', e.target.value as ProductionPlanStatus)}
                                        label="ステータス"
                                        disabled={isViewMode}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* 備考 */}
                                <TextField
                                    label="備考"
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    disabled={isViewMode}
                                    inputRef={(el) => (inputRefs.current[4] = el)}
                                    onKeyDown={(e) => handleKeyDown(e , 4, 'main')}
                                />
                            </Box>
                        </Box>

                        <Divider />

                        {/* 分納計画セクション */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    分納計画
                                </Typography>
                                {!isViewMode && (
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddDelivery}
                                        variant="outlined"
                                    >
                                        分納を追加
                                    </Button>
                                )}
                            </Box>

                            {/* 分納数量サマリー */}
                            {deliveries.length > 0 && plannedQuantity > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Alert
                                        severity={quantityDiff === 0 ? 'success' : 'warning'}
                                        sx={{ py: 0 }}
                                    >
                                        分納合計: {totalDeliveryQuantity} / 生産計画数: {plannedQuantity}
                                        {quantityDiff !== 0 && ` (差分: ${quantityDiff > 0 ? '+' : ''}${quantityDiff})`}
                                    </Alert>
                                </Box>
                            )}

                            {errors.deliveries && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {errors.deliveries}
                                </Alert>
                            )}

                            {/* 分納リスト */}
                            {deliveries.length === 0 ? (
                                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        分納計画がありません。「分納を追加」ボタンで分納を追加してください。
                                    </Typography>
                                </Paper>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {deliveries.map((delivery, index) => (
                                        <Paper
                                            key={index}
                                            variant="outlined"
                                            sx={{ p: 2 }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Typography variant="subtitle2">
                                                    分納 #{index + 1}
                                                </Typography>
                                                {!isViewMode && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveDelivery(index)}
                                                        color="error"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                <TextField
                                                    label="分納日 *"
                                                    type="date"
                                                    value={delivery.delivery_date}
                                                    onChange={(e) => handleDeliveryChange(index, 'delivery_date', e.target.value)}
                                                    disabled={isViewMode}
                                                    InputLabelProps={{ shrink: true }}
                                                    error={!!deliveryErrors[index]?.delivery_date}
                                                    helperText={deliveryErrors[index]?.delivery_date}
                                                    sx={{ flex: 1 }}
                                                    inputRef={(el) => (deliveryDateRefs.current[index] = el)}
                                                    onKeyDown={(e) => handleKeyDown(e , index, 'delivery_date', index)}
                                                />
                                                <TextField
                                                    label="数量 *"
                                                    type="number"
                                                    value={delivery.quantity || ''}
                                                    onChange={(e) => handleDeliveryChange(index, 'quantity', Number(e.target.value))}
                                                    disabled={isViewMode}
                                                    error={!!deliveryErrors[index]?.quantity}
                                                    helperText={deliveryErrors[index]?.quantity}
                                                    inputProps={{ min: 1 }}
                                                    sx={{ flex: 1 }}
                                                    inputRef={(el) => (deliveryQuantityRefs.current[index] = el)}
                                                    onKeyDown={(e) => handleKeyDown(e , index, 'delivery_quantity', index)}
                                                />
                                            </Box>
                                            <Box sx={{ mt: 1 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={delivery.auto_stock_enabled}
                                                            onChange={(e) => handleDeliveryChange(index, 'auto_stock_enabled', e.target.checked)}
                                                            disabled={isViewMode}
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2" color="text.secondary">
                                                            分納日を過ぎたら自動で在庫に登録する
                                                        </Typography>
                                                    }
                                                />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* 自動在庫登録の全体設定 */}
                        <Box>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.auto_stock_enabled}
                                        onChange={(e) => handleChange('auto_stock_enabled', e.target.checked)}
                                        disabled={isViewMode}
                                    />
                                }
                                label="自動在庫登録を有効にする（デフォルト設定）"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                                新しい分納を追加する際に、自動在庫登録がデフォルトで有効になります
                            </Typography>
                        </Box>

                        {/* エラーメッセージ */}
                        {errors.general && (
                            <Alert severity="error">
                                {errors.general}
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    {isViewMode ? '閉じる' : 'キャンセル'}
                </Button>
                {!isViewMode && (
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : '保存'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
