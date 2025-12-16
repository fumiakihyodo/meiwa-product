// components/SuppliedItemModal/SuppliedItemDetailModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Typography,
    Box,
    CircularProgress,
    Paper,
    TextField,
    Chip,
    Autocomplete,
    Alert,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

import {
    Close as CloseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Info as InfoIcon,
    Inventory as InventoryIcon,
    History as HistoryIcon,
    ContentCopy as ContentCopyIcon,
    Widgets as WidgetsIcon,
} from '@mui/icons-material';

import { SuppliedItem, SuppliedItemUpdateData } from '@/types/purchases';
import { Product } from '@/types/procuct';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import toast from 'react-hot-toast';

import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';

interface SuppliedItemDetailModalProps {
    open: boolean;
    onClose: () => void;
    suppliedItemId: number | null;
    onSuccess?: () => void;
    onSwitchToPriceList?: (suppliedItem: SuppliedItem) => void;
    onDuplicate?: (suppliedItem: SuppliedItem) => void;
    initialEditMode?: boolean;
}

const MemoizedTextField = React.memo(TextField);

export const SuppliedItemDetailModal: React.FC<SuppliedItemDetailModalProps> = ({
    open,
    onClose,
    suppliedItemId,
    onSuccess,
    onSwitchToPriceList,
    onDuplicate,
    initialEditMode = false,
}) => {
    const [suppliedItem, setSuppliedItem] = useState<SuppliedItem | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [editedSuppliedItem, setEditedSuppliedItem] = useState<Partial<SuppliedItem>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);

    const fetchSuppliedItemDetails = useCallback(async () => {
        if (!suppliedItemId) return;

        setLoading(true);
        try {
            const suppliedItemData = await purchasesApi.getSuppliedItem(suppliedItemId);
            setSuppliedItem(suppliedItemData);
            setEditedSuppliedItem(suppliedItemData);

            if (suppliedItemData.product) {
                try {
                    const productData = await productApi.getProduct(suppliedItemData.product);
                    setProduct(productData);
                } catch (error) {
                    console.error('Product fetch error:', error);
                    toast.error('製品情報の取得に失敗しました');
                }
            }
        } catch (error) {
            console.error('SuppliedItem fetch error:', error);
            toast.error('支給品詳細の取得に失敗しました');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [onClose, suppliedItemId]);

    const fetchProducts = useCallback(async () => {
        try {
            const productsData = await productApi.getProducts();
            setProducts(productsData);
        } catch (error) {
            console.error('Products fetch error:', error);
            toast.error('製品一覧の取得に失敗しました');
        }
    }, []);

    useEffect(() => {
        if (open && suppliedItemId) {
            fetchSuppliedItemDetails();
            setIsEditMode(initialEditMode);
        } else if (!open) {
            setSuppliedItem(null);
            setProduct(null);
            setIsEditMode(initialEditMode);
        }
    }, [open, suppliedItemId, fetchSuppliedItemDetails, initialEditMode]);

    // 編集モードで開いた場合、即座に製品データを取得
    useEffect(() => {
        if (open && initialEditMode && !products.length) {
            fetchProducts();
        }
    }, [open, initialEditMode, products.length, fetchProducts]);

    const handleEditToggle = useCallback(() => {
        if (isEditMode) {
            if (suppliedItem) {
                setEditedSuppliedItem({ ...suppliedItem });
            }
        } else {
            fetchProducts();
        }
        setIsEditMode(!isEditMode);
    }, [isEditMode, suppliedItem, fetchProducts]);

    const handleSave = useCallback(async () => {
        if (!suppliedItemId || !editedSuppliedItem) return;

        setSaving(true);
        try {
            const updateData: SuppliedItemUpdateData = {
                product: editedSuppliedItem.product,
                item_number: editedSuppliedItem.item_number,
                item_name: editedSuppliedItem.item_name,
                specification: editedSuppliedItem.specification,
                unit: editedSuppliedItem.unit,
                standard_quantity: editedSuppliedItem.standard_quantity,
                is_active: editedSuppliedItem.is_active,
                notes: editedSuppliedItem.notes,
            };
            await purchasesApi.updateSuppliedItem(suppliedItemId, updateData);
            toast.success('支給品情報を更新しました');
            setIsEditMode(false);
            await fetchSuppliedItemDetails();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('SuppliedItem update error:', error);
            toast.error('支給品情報の更新に失敗しました');
        } finally {
            setSaving(false);
        }
    }, [suppliedItemId, editedSuppliedItem, fetchSuppliedItemDetails, onSuccess]);

    const handlePriceHistory = useCallback(() => {
        if (suppliedItem && onSwitchToPriceList) {
            onSwitchToPriceList(suppliedItem);
        }
    }, [suppliedItem, onSwitchToPriceList]);

    const handleDuplicate = useCallback(() => {
        if (suppliedItem && onDuplicate) {
            onDuplicate(suppliedItem);
        }
    }, [suppliedItem, onDuplicate]);

    // 個別フィールドの変更ハンドラ
    const handleItemNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, item_number: e.target.value }));
    }, []);

    const handleItemNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, item_name: e.target.value }));
    }, []);

    const handleSpecificationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, specification: e.target.value }));
    }, []);

    const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, unit: e.target.value }));
    }, []);

    const handleStandardQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, standard_quantity: Number(e.target.value) }));
    }, []);

    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, notes: e.target.value }));
    }, []);

    const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSuppliedItem(prev => ({ ...prev, is_active: e.target.checked }));
    }, []);

    const handleProductChange = useCallback((newValue: Product | null) => {
        setEditedSuppliedItem(prev => ({ ...prev, product: newValue?.id || 0 }));
    }, []);

    if (!suppliedItem || loading) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='lg'
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 1,
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant='h5' fontWeight='bold'>
                        支給品詳細
                    </Typography>
                    {suppliedItem && (
                        <Chip
                            label={suppliedItem.is_active ? '有効' : '無効'}
                            color={suppliedItem.is_active ? 'success' : 'default'}
                            size='small'
                        />
                    )}
                </Box>
                {!isEditMode && suppliedItem && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant='outlined'
                            startIcon={<ContentCopyIcon />}
                            onClick={handleDuplicate}
                            size='small'
                        >
                            複製
                        </Button>
                        <Button
                            variant='outlined'
                            startIcon={<HistoryIcon />}
                            onClick={handlePriceHistory}
                            size='small'
                        >
                            価格履歴
                        </Button>
                        <Button
                            variant='contained'
                            startIcon={<EditIcon />}
                            onClick={handleEditToggle}
                            size='small'
                        >
                            編集
                        </Button>
                    </Box>
                )}
            </DialogTitle>

            <DialogContent sx={{ pt: 3, mt: 3 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                        <CircularProgress />
                    </Box>
                ) : suppliedItem ? (
                    <Box>
                        {/* 紐付き製品情報 */}
                        <SectionCard isEditMode={isEditMode} icon={<InventoryIcon />} title='紐付き製品情報'>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='品番'
                                        value={product?.product_number || suppliedItem.product_number || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.product_number || ''}
                                                getOptionKey={(option) => option.id}
                                                value={products.find(p => p.id === editedSuppliedItem.product) || null}
                                                onChange={(_, newValue) => handleProductChange(newValue)}
                                                disabled={saving}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size='small'
                                                        placeholder='品番を選択'
                                                    />
                                                )}
                                            />
                                        }
                                    />
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='製品名'
                                        value={product?.product_name || suppliedItem.product_name || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.product_name || ''}
                                                getOptionKey={(option) => option.id}
                                                value={products.find(p => p.id === editedSuppliedItem.product) || null}
                                                onChange={(_, newValue) => handleProductChange(newValue)}
                                                disabled={saving}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size='small'
                                                        placeholder='製品を選択'
                                                    />
                                                )}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={false}
                                        label='顧客名'
                                        value={suppliedItem.customer_name || '-'}
                                    />
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* 基本情報 */}
                        <SectionCard isEditMode={isEditMode} icon={<WidgetsIcon />} title='基本情報'>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='支給品品番'
                                        value={suppliedItem.item_number}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedSuppliedItem.item_number || ''}
                                                onChange={handleItemNumberChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='支給品名'
                                        value={suppliedItem.item_name}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedSuppliedItem.item_name || ''}
                                                onChange={handleItemNameChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='仕様'
                                        value={suppliedItem.specification || '-'}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                multiline
                                                rows={2}
                                                value={editedSuppliedItem.specification || ''}
                                                onChange={handleSpecificationChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='標準数量'
                                        value={suppliedItem.standard_quantity ? `${Number(suppliedItem.standard_quantity).toLocaleString()}` : '0'}
                                        editComponent={
                                            <MemoizedTextField
                                                type='number'
                                                fullWidth
                                                size='small'
                                                value={editedSuppliedItem.standard_quantity || ''}
                                                onChange={handleStandardQuantityChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='単位'
                                        value={suppliedItem.unit}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedSuppliedItem.unit || ''}
                                                onChange={handleUnitChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={false}
                                        label="現在単価"
                                        value={suppliedItem.current_price ? `¥${Number(suppliedItem.current_price).toLocaleString()}` : '-'}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={false}
                                        label="価格履歴数"
                                        value={`${suppliedItem.price_history_count || 0}件`}
                                    />
                                </Grid>
                                {suppliedItem.has_multiple_active_prices && (
                                    <Grid item xs={12}>
                                        <Alert severity="warning" sx={{ mb: 1 }}>
                                            複数の有効な価格が設定されています
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </SectionCard>

                        {/* 備考 */}
                        <SectionCard isEditMode={isEditMode} icon={<InfoIcon />} title="備考">
                            <InfoRow
                                isEditMode={isEditMode}
                                label="備考詳細"
                                value={
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            bgcolor: 'warning.50',
                                            borderRadius: 1.5,
                                            borderColor: 'warning.200',
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: 1.8,
                                            }}
                                        >
                                            {suppliedItem.notes || '未設定'}
                                        </Typography>
                                    </Paper>
                                }
                                editComponent={
                                    <MemoizedTextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={editedSuppliedItem.notes || ''}
                                        onChange={handleNotesChange}
                                        disabled={saving}
                                        placeholder="備考を入力してください"
                                    />
                                }
                            />
                        </SectionCard>

                        {/* メタ情報 */}
                        {!isEditMode && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'grey.100',
                                    border: '1px solid',
                                    borderColor: 'grey.300',
                                }}
                            >
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            作成日時
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {new Date(suppliedItem.created_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            更新日時
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {new Date(suppliedItem.updated_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>

                                    {suppliedItem.created_by_name && (
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                作成者
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {suppliedItem.created_by_name}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                        <Typography color="text.secondary" variant="h6">
                            支給品情報を読み込めませんでした
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, gap: 1 }}>
                {isEditMode ? (
                    <>
                        <Box sx={{ marginRight: 'auto', paddingLeft: 3 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={editedSuppliedItem.is_active || false}
                                        onChange={handleIsActiveChange}
                                        disabled={saving}
                                    />
                                }
                                label={editedSuppliedItem.is_active ? '有効' : '無効'}
                            />
                        </Box>
                        <Button
                            onClick={handleEditToggle}
                            startIcon={<CancelIcon />}
                            size="large"
                            disabled={saving}
                            sx={{ borderRadius: 1.5, px: 3 }}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSave}
                            startIcon={<SaveIcon />}
                            variant="contained"
                            size="large"
                            disabled={saving}
                            sx={{ borderRadius: 1.5, px: 3 }}
                        >
                            {saving ? '保存中...' : '更新'}
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={onClose}
                        startIcon={<CloseIcon />}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        閉じる
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
