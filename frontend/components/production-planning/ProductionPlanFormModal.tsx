// components/production-planning/ProductionPlanFormModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    Grid,
    Box,
    Typography,
    Chip,
    LinearProgress,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import {
    ProductionType,
    ProductionPlanListItem,
    ProductionPlanDetail,
    ProductionPlanCreateData,
    ProductionPlanUpdateData,
    ManufacturingItemForPlanning,
    ProductionPlanStatus,
    ProductionScheduleItem,
    ModalMode,
    PLAN_STATUS_LABELS,
    PLAN_STATUS_COLORS,
    STATUS_OPTIONS,
    SCHEDULE_STATUS_LABELS,
    SCHEDULE_STATUS_COLORS,
    ProductionScheduleStatus,
} from '@/types/production-planning';
import { productionPlanApi } from '@/services/apiProductionPlanning';
import toast from 'react-hot-toast';

// =============================================================================
// 型定義
// =============================================================================

interface ProductionPlanFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: ModalMode;
    productionType: ProductionType;
    plan: ProductionPlanListItem | null;
    manufacturingItems: ManufacturingItemForPlanning[];
}

interface FormData {
    manufacturing_item: number | '';
    total_planned_quantity: number | '';
    planned_start_date: string;
    planned_end_date: string;
    status: ProductionPlanStatus;
    priority: number;
    notes: string;
}

interface FormErrors {
    manufacturing_item?: string;
    total_planned_quantity?: string;
    planned_start_date?: string;
    planned_end_date?: string;
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
    priority: 5,
    notes: '',
};

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function ProductionPlanFormModal({
    open,
    onClose,
    onSuccess,
    mode,
    productionType,
    plan,
    manufacturingItems,
}: ProductionPlanFormModalProps) {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [planDetail, setPlanDetail] = useState<ProductionPlanDetail | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';

    // タイトルの決定
    const getTitle = () => {
        const typeLabel = productionType === 'domestic' ? '国内' : '海外';
        switch (mode) {
            case 'create':
                return `${typeLabel}生産計画 - 新規作成`;
            case 'edit':
                return `${typeLabel}生産計画 - 編集`;
            case 'view':
                return `${typeLabel}生産計画 - 詳細`;
            default:
                return `${typeLabel}生産計画`;
        }
    };

    // 詳細データの取得（編集・閲覧モード）
    const fetchPlanDetail = useCallback(async () => {
        if (!plan || isCreateMode) return;

        try {
            setDetailLoading(true);
            const detail = await productionPlanApi.getPlan(productionType, plan.id);
            setPlanDetail(detail);

            // フォームデータを設定
            setFormData({
                manufacturing_item: detail.manufacturing_item,
                total_planned_quantity: detail.total_planned_quantity,
                planned_start_date: detail.planned_start_date || '',
                planned_end_date: detail.planned_end_date || '',
                status: detail.status,
                priority: detail.priority,
                notes: detail.notes || '',
            });
        } catch (error) {
            console.error('生産計画詳細の取得に失敗しました:', error);
            toast.error('生産計画詳細の取得に失敗しました');
        } finally {
            setDetailLoading(false);
        }
    }, [plan, productionType, isCreateMode]);

    // モーダルが開いた時の初期化
    useEffect(() => {
        if (open) {
            setErrors({});
            if (isCreateMode) {
                setFormData(initialFormData);
                setPlanDetail(null);
            } else if (plan) {
                fetchPlanDetail();
            }
        }
    }, [open, isCreateMode, plan, fetchPlanDetail]);

    // 入力変更ハンドラ
    const handleChange = (field: keyof FormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    // バリデーション
    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.manufacturing_item) {
            newErrors.manufacturing_item = '制作品を選択してください';
        }
        if (!formData.total_planned_quantity || Number(formData.total_planned_quantity) <= 0) {
            newErrors.total_planned_quantity = '予定数量を入力してください（1以上）';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 保存処理
    const handleSave = async () => {
        if (!validate()) return;

        try {
            setLoading(true);

            const data: ProductionPlanCreateData | ProductionPlanUpdateData = {
                manufacturing_item: Number(formData.manufacturing_item),
                total_planned_quantity: Number(formData.total_planned_quantity),
                planned_start_date: formData.planned_start_date || null,
                planned_end_date: formData.planned_end_date || null,
                status: formData.status,
                priority: formData.priority,
                notes: formData.notes,
            };

            if (isCreateMode) {
                await productionPlanApi.createPlan(productionType, data as ProductionPlanCreateData);
                toast.success('生産計画を作成しました');
            } else if (isEditMode && plan) {
                await productionPlanApi.updatePlan(productionType, plan.id, data as ProductionPlanUpdateData);
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

    // 選択された制作品の情報
    const selectedItem = manufacturingItems.find(
        (item) => item.id === formData.manufacturing_item
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '60vh' },
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
                    <Grid container spacing={3}>
                        {/* 基本情報 */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                基本情報
                            </Typography>
                        </Grid>

                        {/* 計画番号（編集・閲覧時のみ） */}
                        {!isCreateMode && planDetail && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="計画番号"
                                    value={planDetail.plan_number}
                                    fullWidth
                                    disabled
                                />
                            </Grid>
                        )}

                        {/* 制作品選択 */}
                        <Grid size={{ xs: 12, sm: isCreateMode ? 12 : 6 }}>
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
                        </Grid>

                        {/* 選択された制作品の情報 */}
                        {selectedItem && (
                            <Grid size={{ xs: 12 }}>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.default',
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        製品: {selectedItem.product_name || '未設定'} |
                                        単位: {selectedItem.unit} |
                                        標準製造時間: {selectedItem.standard_production_time || '-'}時間
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        {/* 数量情報 */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="予定数量 *"
                                type="number"
                                value={formData.total_planned_quantity}
                                onChange={(e) => handleChange('total_planned_quantity', e.target.value)}
                                fullWidth
                                disabled={isViewMode}
                                error={!!errors.total_planned_quantity}
                                helperText={errors.total_planned_quantity}
                                slotProps={{
                                    htmlInput: { min: 1 },
                                }}
                            />
                        </Grid>

                        {/* 進捗情報（編集・閲覧時のみ） */}
                        {!isCreateMode && planDetail && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        進捗状況
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={planDetail.completion_rate}
                                            sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                                            color={planDetail.completion_rate >= 100 ? 'success' : 'primary'}
                                        />
                                        <Typography variant="body2">
                                            {planDetail.completion_rate}%
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        完成: {planDetail.completed_quantity} / {planDetail.total_planned_quantity}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        {/* 日程 */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="開始予定日"
                                type="date"
                                value={formData.planned_start_date}
                                onChange={(e) => handleChange('planned_start_date', e.target.value)}
                                fullWidth
                                disabled={isViewMode}
                                slotProps={{
                                    inputLabel: { shrink: true },
                                }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="完了予定日"
                                type="date"
                                value={formData.planned_end_date}
                                onChange={(e) => handleChange('planned_end_date', e.target.value)}
                                fullWidth
                                disabled={isViewMode}
                                slotProps={{
                                    inputLabel: { shrink: true },
                                }}
                            />
                        </Grid>

                        {/* ステータスと優先度 */}
                        <Grid size={{ xs: 12, sm: 6 }}>
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
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="優先度"
                                type="number"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', Number(e.target.value))}
                                fullWidth
                                disabled={isViewMode}
                                helperText="1が最高優先度"
                                slotProps={{
                                    htmlInput: { min: 1 },
                                }}
                            />
                        </Grid>

                        {/* 備考 */}
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="備考"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                disabled={isViewMode}
                            />
                        </Grid>

                        {/* スケジュール一覧（閲覧・編集時のみ） */}
                        {!isCreateMode && planDetail && planDetail.schedules.length > 0 && (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        スケジュール一覧 ({planDetail.schedules.length}件)
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {planDetail.schedules.map((schedule: ProductionScheduleItem) => (
                                            <Box
                                                key={schedule.id}
                                                sx={{
                                                    p: 2,
                                                    bgcolor: 'background.default',
                                                    borderRadius: 1,
                                                    border: 1,
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {schedule.schedule_number}
                                                    </Typography>
                                                    <Chip
                                                        label={SCHEDULE_STATUS_LABELS[schedule.status]}
                                                        color={SCHEDULE_STATUS_COLORS[schedule.status]}
                                                        size="small"
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        数量: {schedule.completed_quantity} / {schedule.quantity}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        進捗: {schedule.completion_rate}%
                                                    </Typography>
                                                    {schedule.assigned_to_name && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            担当: {schedule.assigned_to_name}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Grid>
                            </>
                        )}

                        {/* エラーメッセージ */}
                        {errors.general && (
                            <Grid size={{ xs: 12 }}>
                                <Typography color="error" variant="body2">
                                    {errors.general}
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
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
