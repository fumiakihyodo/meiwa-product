// components/production-planning/ProductionPlanModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
    Grid,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Chip,
    LinearProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    productionPlanApi,
    ProductionPlan,
    ProductionPlanCreate,
    ProductionScheduleCreate,
    ManufacturingItem,
} from '@/services/apiManufacturing';
import { Product } from '@/types/product';
import {
    ModalMode,
    STATUS_OPTIONS,
    PLAN_STATUS_COLORS,
    ProductionPlanStatus,
} from '@/types/production-planning';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface ProductionPlanModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: ModalMode;
    plan: ProductionPlan | null;
    manufacturingItems: ManufacturingItem[];
    products: Product[];
}

interface ApiError {
    response?: {
        data?: Record<string, string[]>;
    };
}

// =============================================================================
// Initial Form State
// =============================================================================

const initialFormData: ProductionPlanCreate = {
    manufacturing_item: 0,
    product: undefined,
    total_planned_quantity: 0,
    planned_start_date: '',
    planned_end_date: '',
    status: 'draft',
    priority: 5,
    notes: '',
    schedules: [],
};

// =============================================================================
// Component
// =============================================================================

export default function ProductionPlanModal({
    open,
    onClose,
    onSuccess,
    mode,
    plan,
    manufacturingItems,
    products,
}: ProductionPlanModalProps) {
    const [formData, setFormData] = useState<ProductionPlanCreate>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form data
    useEffect(() => {
        if (plan && (mode === 'edit' || mode === 'view')) {
            setFormData({
                manufacturing_item: plan.manufacturing_item,
                product: plan.product,
                total_planned_quantity: plan.total_planned_quantity,
                planned_start_date: plan.planned_start_date || '',
                planned_end_date: plan.planned_end_date || '',
                status: plan.status,
                priority: plan.priority,
                notes: plan.notes || '',
                schedules: [],
            });
        } else {
            setFormData(initialFormData);
        }
        setErrors({});
    }, [plan, mode, open]);

    const handleChange = (field: keyof ProductionPlanCreate, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    // Schedule handlers
    const handleAddSchedule = () => {
        const newSchedule: ProductionScheduleCreate = {
            plan: 0,
            quantity: 0,
            started_at: '',
            finished_at: '',
            status: 'planned',
            notes: '',
        };
        setFormData((prev) => ({
            ...prev,
            schedules: [...(prev.schedules || []), newSchedule],
        }));
    };

    const handleRemoveSchedule = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            schedules: prev.schedules?.filter((_, i) => i !== index) || [],
        }));
    };

    const handleScheduleChange = (index: number, field: keyof ProductionScheduleCreate, value: unknown) => {
        setFormData((prev) => ({
            ...prev,
            schedules: prev.schedules?.map((schedule, i) =>
                i === index ? { ...schedule, [field]: value } : schedule
            ) || [],
        }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.manufacturing_item) {
            newErrors.manufacturing_item = '制作品は必須です';
        }
        if (!formData.total_planned_quantity || formData.total_planned_quantity <= 0) {
            newErrors.total_planned_quantity = '予定数量は1以上の数値を入力してください';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const submitData = {
                ...formData,
                product: formData.product || undefined,
                planned_start_date: formData.planned_start_date || undefined,
                planned_end_date: formData.planned_end_date || undefined,
            };

            if (mode === 'create') {
                await productionPlanApi.createPlan(submitData);
                toast.success('生産計画を登録しました');
            } else if (mode === 'edit' && plan) {
                const { schedules, ...updateData } = submitData;
                await productionPlanApi.updatePlan(plan.id, updateData);
                toast.success('生産計画を更新しました');
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('保存エラー:', error);
            const apiError = error as ApiError;
            if (apiError.response?.data) {
                const serverErrors: Record<string, string> = {};
                Object.entries(apiError.response.data).forEach(([key, value]) => {
                    serverErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
                });
                setErrors(serverErrors);
            }
            toast.error(mode === 'create' ? '生産計画の登録に失敗しました' : '生産計画の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const isViewMode = mode === 'view';
    const title = mode === 'create' ? '新規生産計画' : mode === 'edit' ? '生産計画編集' : '生産計画詳細';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* Plan Number (Edit/View Mode Only) */}
                    {(mode === 'edit' || mode === 'view') && plan && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="計画番号"
                                value={plan.plan_number}
                                fullWidth
                                disabled
                            />
                        </Grid>
                    )}

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required disabled={isViewMode} error={!!errors.manufacturing_item}>
                            <InputLabel>制作品</InputLabel>
                            <Select
                                value={formData.manufacturing_item || ''}
                                onChange={(e) => handleChange('manufacturing_item', e.target.value)}
                                label="制作品"
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

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={isViewMode}>
                            <InputLabel>製品</InputLabel>
                            <Select
                                value={formData.product || ''}
                                onChange={(e) => handleChange('product', e.target.value || undefined)}
                                label="製品"
                            >
                                <MenuItem value="">選択なし</MenuItem>
                                {products.map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                        {product.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="合計予定数量"
                            type="number"
                            value={formData.total_planned_quantity}
                            onChange={(e) => handleChange('total_planned_quantity', Number(e.target.value))}
                            fullWidth
                            required
                            disabled={isViewMode}
                            error={!!errors.total_planned_quantity}
                            helperText={errors.total_planned_quantity}
                            inputProps={{ min: 1 }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={isViewMode}>
                            <InputLabel>ステータス</InputLabel>
                            <Select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                label="ステータス"
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="優先度"
                            type="number"
                            value={formData.priority}
                            onChange={(e) => handleChange('priority', Number(e.target.value))}
                            fullWidth
                            disabled={isViewMode}
                            inputProps={{ min: 1, max: 10 }}
                            helperText="1が最高優先度"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="計画開始日"
                            type="date"
                            value={formData.planned_start_date}
                            onChange={(e) => handleChange('planned_start_date', e.target.value)}
                            fullWidth
                            disabled={isViewMode}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="計画完了日"
                            type="date"
                            value={formData.planned_end_date}
                            onChange={(e) => handleChange('planned_end_date', e.target.value)}
                            fullWidth
                            disabled={isViewMode}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="備考"
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            disabled={isViewMode}
                        />
                    </Grid>

                    {/* Progress Display (View/Edit Mode) */}
                    {(mode === 'view' || mode === 'edit') && plan && (
                        <>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                    進捗状況
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">完成数量</Typography>
                                <Typography variant="h6">{plan.completed_quantity} / {plan.total_planned_quantity}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">進捗率</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={plan.completion_rate || 0}
                                            color={plan.completion_rate && plan.completion_rate >= 100 ? 'success' : 'primary'}
                                        />
                                    </Box>
                                    <Typography variant="body2">{plan.completion_rate || 0}%</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="body2" color="text.secondary">スケジュール数</Typography>
                                <Typography variant="h6">{plan.schedule_count || 0}件</Typography>
                            </Grid>
                        </>
                    )}

                    {/* Existing Schedules Display (View Mode) */}
                    {mode === 'view' && plan?.schedules && plan.schedules.length > 0 && (
                        <>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                    スケジュール一覧
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                {plan.schedules.map((schedule, index) => (
                                    <Paper key={schedule.id || index} sx={{ p: 2, mb: 1 }} variant="outlined">
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">スケジュール番号</Typography>
                                                <Typography variant="body1">{schedule.schedule_number}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">数量</Typography>
                                                <Typography variant="body1">{schedule.quantity}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">完成数</Typography>
                                                <Typography variant="body1">{schedule.completed_quantity}</Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">ステータス</Typography>
                                                <Chip
                                                    label={STATUS_OPTIONS.find(s => s.value === schedule.status)?.label || schedule.status}
                                                    color={PLAN_STATUS_COLORS[schedule.status as ProductionPlanStatus] || 'default'}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">開始日時</Typography>
                                                <Typography variant="body2">
                                                    {schedule.started_at ? new Date(schedule.started_at).toLocaleString('ja-JP') : '-'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <Typography variant="body2" color="text.secondary">完了予定</Typography>
                                                <Typography variant="body2">
                                                    {schedule.finished_at ? new Date(schedule.finished_at).toLocaleString('ja-JP') : '-'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                ))}
                            </Grid>
                        </>
                    )}

                    {/* New Schedule Addition (Create Mode) */}
                    {mode === 'create' && (
                        <>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2">
                                        製造スケジュール（分割設定）
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddSchedule}
                                    >
                                        スケジュール追加
                                    </Button>
                                </Box>
                            </Grid>

                            {formData.schedules?.map((schedule, index) => (
                                <Grid item xs={12} key={index}>
                                    <Paper sx={{ p: 2 }} variant="outlined">
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="body2" fontWeight="bold">
                                                スケジュール {index + 1}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveSchedule(index)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    label="製造数量"
                                                    type="number"
                                                    value={schedule.quantity}
                                                    onChange={(e) => handleScheduleChange(index, 'quantity', Number(e.target.value))}
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{ min: 1 }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    label="開始日時"
                                                    type="datetime-local"
                                                    value={schedule.started_at}
                                                    onChange={(e) => handleScheduleChange(index, 'started_at', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    label="完了予定日時"
                                                    type="datetime-local"
                                                    value={schedule.finished_at}
                                                    onChange={(e) => handleScheduleChange(index, 'finished_at', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    label="備考"
                                                    value={schedule.notes}
                                                    onChange={(e) => handleScheduleChange(index, 'notes', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                            ))}

                            {formData.schedules && formData.schedules.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        スケジュール合計: {formData.schedules.reduce((sum, s) => sum + (s.quantity || 0), 0)}個
                                        {formData.schedules.reduce((sum, s) => sum + (s.quantity || 0), 0) !== formData.total_planned_quantity && (
                                            <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                                                (予定数量と一致していません)
                                            </Typography>
                                        )}
                                    </Typography>
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>閉じる</Button>
                {!isViewMode && (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} /> : null}
                    >
                        {mode === 'create' ? '登録' : '更新'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
