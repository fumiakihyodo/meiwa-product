// components/production-planning/ManufacturingItemModal.tsx
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
    FormControlLabel,
    Switch,
    Typography,
    Grid,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    manufacturingItemApi,
    ManufacturingItem,
    ManufacturingItemCreate,
} from '@/services/apiManufacturing';
import { Product } from '@/types/product';
import { ModalMode } from '@/types/production-planning';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface ManufacturingItemModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: ModalMode;
    item: ManufacturingItem | null;
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

const initialFormData: ManufacturingItemCreate = {
    manufacturing_number: '',
    manufacturing_name: '',
    product: undefined,
    specification: '',
    unit: '個',
    standard_production_time: undefined,
    is_active: true,
    notes: '',
};

// =============================================================================
// Component
// =============================================================================

export default function ManufacturingItemModal({
    open,
    onClose,
    onSuccess,
    mode,
    item,
    products,
}: ManufacturingItemModalProps) {
    const [formData, setFormData] = useState<ManufacturingItemCreate>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form data when modal opens
    useEffect(() => {
        if (item && (mode === 'edit' || mode === 'view')) {
            setFormData({
                manufacturing_number: item.manufacturing_number,
                manufacturing_name: item.manufacturing_name,
                product: item.product,
                specification: item.specification || '',
                unit: item.unit,
                standard_production_time: item.standard_production_time,
                is_active: item.is_active,
                notes: item.notes || '',
            });
        } else {
            setFormData(initialFormData);
        }
        setErrors({});
    }, [item, mode, open]);

    const handleChange = (field: keyof ManufacturingItemCreate, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.manufacturing_number.trim()) {
            newErrors.manufacturing_number = '品番は必須です';
        }
        if (!formData.manufacturing_name.trim()) {
            newErrors.manufacturing_name = '制作品名は必須です';
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
            };

            if (mode === 'create') {
                await manufacturingItemApi.createItem(submitData);
                toast.success('制作品を登録しました');
            } else if (mode === 'edit' && item) {
                await manufacturingItemApi.updateItem(item.id, submitData);
                toast.success('制作品を更新しました');
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
            toast.error(mode === 'create' ? '制作品の登録に失敗しました' : '制作品の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const isViewMode = mode === 'view';
    const title = mode === 'create' ? '新規制作品登録' : mode === 'edit' ? '制作品編集' : '制作品詳細';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="品番"
                            value={formData.manufacturing_number}
                            onChange={(e) => handleChange('manufacturing_number', e.target.value)}
                            fullWidth
                            required
                            disabled={isViewMode || mode === 'edit'}
                            error={!!errors.manufacturing_number}
                            helperText={errors.manufacturing_number}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="制作品名"
                            value={formData.manufacturing_name}
                            onChange={(e) => handleChange('manufacturing_name', e.target.value)}
                            fullWidth
                            required
                            disabled={isViewMode}
                            error={!!errors.manufacturing_name}
                            helperText={errors.manufacturing_name}
                        />
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
                            label="単位"
                            value={formData.unit}
                            onChange={(e) => handleChange('unit', e.target.value)}
                            fullWidth
                            disabled={isViewMode}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="標準製造時間（時間）"
                            type="number"
                            value={formData.standard_production_time ?? ''}
                            onChange={(e) => handleChange('standard_production_time', e.target.value ? Number(e.target.value) : undefined)}
                            fullWidth
                            disabled={isViewMode}
                            inputProps={{ min: 0, step: 0.5 }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_active}
                                    onChange={(e) => handleChange('is_active', e.target.checked)}
                                    disabled={isViewMode}
                                />
                            }
                            label="有効"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="仕様"
                            value={formData.specification}
                            onChange={(e) => handleChange('specification', e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            disabled={isViewMode}
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

                    {/* System Information (View Mode Only) */}
                    {isViewMode && item && (
                        <>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                                    システム情報
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">作成日時</Typography>
                                <Typography variant="body1">
                                    {new Date(item.created_at).toLocaleString('ja-JP')}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">更新日時</Typography>
                                <Typography variant="body1">
                                    {new Date(item.updated_at).toLocaleString('ja-JP')}
                                </Typography>
                            </Grid>
                            {item.created_by_name && (
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">作成者</Typography>
                                    <Typography variant="body1">{item.created_by_name}</Typography>
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
