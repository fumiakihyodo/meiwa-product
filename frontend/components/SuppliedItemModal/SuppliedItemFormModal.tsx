// components/SuppliedItemModal/SuppliedItemFormModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    CircularProgress,
    Autocomplete,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { SuppliedItem, SuppliedItemCreateData } from '@/types/purchases';
import { Product } from '@/types/product';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import toast from 'react-hot-toast';

interface SuppliedItemFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productId?: number;
    duplicateFrom?: SuppliedItem;
}

export const SuppliedItemFormModal: React.FC<SuppliedItemFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    productId,
    duplicateFrom,
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    const [formData, setFormData] = useState<SuppliedItemCreateData>({
        product: productId || 0,
        item_number: '',
        item_name: '',
        specification: '',
        unit: '個',
        standard_quantity: 1,
        is_active: true,
        notes: '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // 製品一覧を取得
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const productsData = await productApi.getProducts();
            setProducts(productsData);
        } catch (error) {
            console.error('Products fetch error:', error);
            toast.error('製品一覧の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchProducts();

            // 複製の場合
            if (duplicateFrom) {
                setFormData({
                    product: duplicateFrom.product,
                    item_number: `${duplicateFrom.item_number}_copy`,
                    item_name: duplicateFrom.item_name,
                    specification: duplicateFrom.specification || '',
                    unit: duplicateFrom.unit,
                    standard_quantity: duplicateFrom.standard_quantity,
                    is_active: true,
                    notes: duplicateFrom.notes || '',
                });
            } else if (productId) {
                setFormData({
                    product: productId,
                    item_number: '',
                    item_name: '',
                    specification: '',
                    unit: '個',
                    standard_quantity: 1,
                    is_active: true,
                    notes: '',
                });
            }
        } else {
            // モーダルが閉じられた時にリセット
            setFormData({
                product: productId || 0,
                item_number: '',
                item_name: '',
                specification: '',
                unit: '個',
                standard_quantity: 1,
                is_active: true,
                notes: '',
            });
            setErrors({});
        }
    }, [open, productId, duplicateFrom, fetchProducts]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.product) {
            newErrors.product = '製品を選択してください';
        }
        if (!formData.item_number || formData.item_number.trim() === '') {
            newErrors.item_number = '支給品品番は必須です';
        }
        if (!formData.item_name || formData.item_name.trim() === '') {
            newErrors.item_name = '支給品名は必須です';
        }
        if (!formData.unit || formData.unit.trim() === '') {
            newErrors.unit = '単位は必須です';
        }
        if (!formData.standard_quantity || formData.standard_quantity < 1) {
            newErrors.standard_quantity = '標準数量は1以上である必要があります';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setSaving(true);
        try {
            await purchasesApi.createSuppliedItem(formData);
            toast.success('支給品を登録しました');
            onSuccess();
        } catch (error: any) {
            console.error('SuppliedItem create error:', error);
            const errorMessage = error.response?.data?.message || '支給品の登録に失敗しました';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const selectedProduct = products.find((p) => p.id === formData.product);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{duplicateFrom ? '支給品の複製' : '新規支給品登録'}</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <Grid container spacing={2}>
                        {/* 製品選択 */}
                        <Grid item xs={12}>
                            <Autocomplete
                                value={selectedProduct || null}
                                onChange={(_, newValue) => {
                                    setFormData({ ...formData, product: newValue?.id || 0 });
                                }}
                                options={products}
                                getOptionLabel={(option) =>
                                    `${option.product_number} - ${option.product_name}`
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="製品"
                                        required
                                        error={!!errors.product}
                                        helperText={errors.product}
                                    />
                                )}
                                disabled={!!productId || !!duplicateFrom}
                            />
                        </Grid>

                        {/* 支給品品番 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="支給品品番"
                                value={formData.item_number}
                                onChange={(e) =>
                                    setFormData({ ...formData, item_number: e.target.value })
                                }
                                fullWidth
                                required
                                error={!!errors.item_number}
                                helperText={errors.item_number}
                            />
                        </Grid>

                        {/* 支給品名 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="支給品名"
                                value={formData.item_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, item_name: e.target.value })
                                }
                                fullWidth
                                required
                                error={!!errors.item_name}
                                helperText={errors.item_name}
                            />
                        </Grid>

                        {/* 仕様 */}
                        <Grid item xs={12}>
                            <TextField
                                label="仕様"
                                value={formData.specification}
                                onChange={(e) =>
                                    setFormData({ ...formData, specification: e.target.value })
                                }
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Grid>

                        {/* 単位 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="単位"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                fullWidth
                                required
                                error={!!errors.unit}
                                helperText={errors.unit}
                            />
                        </Grid>

                        {/* 標準数量 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="標準数量"
                                type="number"
                                value={formData.standard_quantity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        standard_quantity: parseInt(e.target.value, 10) || 1,
                                    })
                                }
                                fullWidth
                                required
                                error={!!errors.standard_quantity}
                                helperText={errors.standard_quantity}
                                InputProps={{ inputProps: { min: 1 } }}
                            />
                        </Grid>

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <TextField
                                label="備考"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Grid>

                        {/* 有効フラグ */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.is_active}
                                        onChange={(e) =>
                                            setFormData({ ...formData, is_active: e.target.checked })
                                        }
                                    />
                                }
                                label="有効"
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} startIcon={<CloseIcon />} disabled={saving}>
                    キャンセル
                </Button>
                <Button
                    onClick={handleSubmit}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    variant="contained"
                    disabled={saving || loading}
                >
                    登録
                </Button>
            </DialogActions>
        </Dialog>
    );
};
