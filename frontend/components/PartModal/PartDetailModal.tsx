// components/PartModal/PartDetailModal.tsx
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
    BusinessCenter as BusinessIcon,
    Widgets as WidgetsIcon,
    Cancel as CancelIcon,
    Info as InfoIcon,
    Inventory as InventoryIcon,
    History as HistoryIcon,
    ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

import { Part } from '@/types/purchases';
import { Product } from '@/types/product'
import { SupplierBranch } from '@/types/supplier';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';

import { ORDER_TYPE_OPTIONS } from './PartComponents/OrderType';
import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';

interface PartDetailModalProps {
    open: boolean;
    onClose: () => void;
    partId: number | null;
    onSuccess?: () => void;
    onSwitchToPriceList?: (part: Part) => void;
    onDuplicate?: (part: Part) => void;
    initialEditMode?: boolean;
}

const MemoizedTextField = React.memo(TextField);


export const PartDetailModal: React.FC<PartDetailModalProps> = ({
    open,
    onClose,
    partId,
    onSuccess,
    onSwitchToPriceList,
    onDuplicate,
    initialEditMode = false,
}) => {
    const [part, setPart] = useState<Part | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<SupplierBranch[]>([]);
    const [editedPart, setEditedPart] = useState<Partial<Part>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(initialEditMode);

    const fetchPartDetails = useCallback(async () => {
        if (!partId) return;

        setLoading(true);
        try {
            const partData = await purchasesApi.getPart(partId);
            setPart(partData);
            setEditedPart(partData);

            if (partData.product) {
                try {
                    const productData = await productApi.getProduct(partData.product);
                    setProduct(productData);
                } catch (error) {
                    console.error('Product fetch error:', error);
                    toast.error('製品情報の取得に失敗しました');
                    onClose();
                }
            }
        } catch (error) {
            console.error('Part fetch error:', error);
            toast.error('部品詳細の取得に失敗しました');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [onClose, partId]);

    const fetchProducts = useCallback(async () => {
        try {
            const productsData = await productApi.getProducts();
            setProducts(productsData);
        } catch (error) {
            console.error('Products fetch error:', error);
            toast.error('製品一覧の取得に失敗しました')
        }
    }, []);

    const fetchBranches = useCallback(async () => {
        try {
            const branchesData = await supplierApi.getSupplierBranches({ is_active: 'true' });
            setBranches(branchesData);
        } catch (error) {
            console.error('Branches fetch error:', error);
            toast.error('サプライヤー拠点一覧の取得に失敗しました')
        }
    }, []);

    useEffect(() => {
        if (open && partId) {
            fetchPartDetails();
            setIsEditMode(initialEditMode);
        } else if (!open) {
            setPart(null);
            setProduct(null);
            setIsEditMode(initialEditMode);
        }
    }, [open, partId, fetchPartDetails, initialEditMode]);

    // 編集モードで開いた場合、即座に製品とブランチのデータを取得
    useEffect(() => {
        if (open && initialEditMode && !products.length) {
            fetchProducts();
            fetchBranches();
        }
    }, [open, initialEditMode, products.length, fetchProducts, fetchBranches]);

    const uniqueBranches = Array.from(
        new Map(branches.map(branch => [branch.supplier_name, branch])).values()
    );

    const filteredBranches = editedPart.supplier_branch
        ? branches.filter(b => {
            const selectedBranch = branches.find(branch => branch.id === editedPart.supplier_branch);
            return selectedBranch && b.supplier_name === selectedBranch.supplier_name;
        })
        : [];

    const handleEditToggle = useCallback(() => {
        if (isEditMode) {
            if (part) {
                setEditedPart({ ...part });
            }
        } else {
            fetchProducts();
            fetchBranches();
        }
        setIsEditMode(!isEditMode);
    }, [isEditMode, part, fetchProducts, fetchBranches]);

    const handleSave = useCallback(async () => {
        if (!partId || !editedPart) return;

        setSaving(true);
        try {
            await purchasesApi.updatePart(partId, editedPart);
            toast.success('部品情報を更新しました');
            setIsEditMode(false);
            await fetchPartDetails();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Part update error:', error);
            toast.error('部品情報の更新に失敗しました')
        } finally {
            setSaving(false);
        }
    }, [partId, editedPart, fetchPartDetails, onSuccess]);

    const handlePriceHistory = useCallback(() => {
        if (part && onSwitchToPriceList) {
            onSwitchToPriceList(part);
        }
    }, [part, onSwitchToPriceList]);

    const handleDuplicate = useCallback(() => {
        if (part && onDuplicate) {
            onDuplicate(part);
        }
    }, [part, onDuplicate]);

    // 個別フィールドの変更ハンドラ

    const handlePartNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, part_number: e.target.value }))
    }, []);

    const handlePartNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, part_name: e.target.value }))
    }, []);

    const handleSpecificationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, specification: e.target.value }))
    }, []);

    const handleSupplierPartNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, supplier_part_name: e.target.value }))
    }, []);

    const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, unit: e.target.value }))
    }, []);

    const handleOrderTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, order_type: e.target.value }))
    }, []);

    const handleStandardQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, standard_quantity: Number(e.target.value) }));
    }, []);

    const handleUsageQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, usage_quantity: Number(e.target.value) }));
    }, []);

    const handleMinimumOrderQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, minimum_order_quantity: Number(e.target.value) }));
    }, []);

    const handleLeadTimeDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, lead_time_days: Number(e.target.value) }))
    }, []);

    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, notes: e.target.value }))
    }, []);

    const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPart(prev => ({ ...prev, is_active: e.target.checked }))
    }, []);

    const handleProductChange = useCallback((newValue: Product | null) => {
        setEditedPart(prev => ({ ...prev, product: newValue?.id || 0 }))
    }, []);

    const handleBranchChange = useCallback((newValue: SupplierBranch | null) => {
        setEditedPart(prev => ({ ...prev, supplier_branch: newValue?.id || 0 }))
    }, []);

    if (!part || loading) {
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
                        部品詳細
                    </Typography>
                    {part && (
                        <Chip
                            label={part.is_active ? '有効' : '無効'}
                            color={part.is_active ? 'success' : 'default'}
                            size='small'
                        />
                    )}
                </Box>
                {!isEditMode && part && (
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
                    <Box sx={{ display: 'flex', justifyContent: 'cencter', alignItems: 'center', minHeight: 400 }}>
                        <CircularProgress />
                    </Box>
                ) : part ? (
                    <Box>
                        {/* 紐付き製品情報 */}
                        <SectionCard isEditMode={isEditMode} icon={<InventoryIcon />} title='紐付き製品情報'>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='品番'
                                        value={product?.product_number || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.product_number || ''}
                                                getOptionKey={(option) => option.id} // 追加：一意のキーを指定
                                                value={products.find(p => p.id === editedPart.product) || null}
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

                                {/* 紐付き製品情報 - 製品名 */}
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='製品名'
                                        value={product?.product_name || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.product_name || ''}
                                                getOptionKey={(option) => option.id} // 追加：一意のキーを指定
                                                value={products.find(p => p.id === editedPart.product) || null}
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
                                        label='取引先名'
                                        value={product?.customer_branch_name || '-'}
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
                                        label='部品番号'
                                        value={part.part_number}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedPart.part_number || ''}
                                                onChange={handlePartNumberChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='部品名'
                                        value={part.part_name}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedPart.part_name || ''}
                                                onChange={handlePartNameChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={12}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='仕様'
                                        value={part.specification || '-'}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedPart.specification || ''}
                                                onChange={handleSpecificationChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='標準数量'
                                        value={part.standard_quantity ? `${Number(part.standard_quantity).toLocaleString()}` : 0}
                                        editComponent={
                                            <MemoizedTextField
                                                type='number'
                                                fullWidth
                                                size='small'
                                                value={editedPart.standard_quantity || ''}
                                                onChange={handleStandardQuantityChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={2}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='使用数'
                                        value={part.usage_quantity ? `${Number(part.usage_quantity).toLocaleString()}` : 0}
                                        editComponent={
                                            <MemoizedTextField
                                                type='number'
                                                fullWidth
                                                size='small'
                                                value={editedPart.usage_quantity || ''}
                                                onChange={handleUsageQuantityChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={false}
                                        label="現在単価"
                                        value={part.current_price ? `¥${Number(part.current_price).toLocaleString()}` : '-'}
                                    />
                                </Grid>
                                {part.has_multiple_active_prices && (
                                    <Grid item xs={12}>
                                        <Alert severity="warning" sx={{ mb: 1 }}>
                                            複数の有効な価格が設定されています
                                        </Alert>
                                    </Grid>
                                )}
                                <Grid item xs={6} sm={2}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='発注区分'
                                        value={part.order_type}
                                        editComponent={
                                            <TextField
                                                select
                                                fullWidth
                                                size='small'
                                                value={editedPart.order_type || ''}
                                                onChange={handleOrderTypeChange}
                                                SelectProps={{
                                                    native: true,
                                                }}
                                                disabled={saving}
                                            >
                                                <option value='' />
                                                {ORDER_TYPE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </TextField>
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='最小発注数量'
                                        value={part.minimum_order_quantity ? `${Number(part.minimum_order_quantity).toLocaleString()}` : 0}
                                        editComponent={
                                            <MemoizedTextField
                                                type='number'
                                                fullWidth
                                                size='small'
                                                value={editedPart.minimum_order_quantity || ''}
                                                onChange={handleMinimumOrderQuantityChange}
                                                disabled={saving}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6} sm={1}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label='単位'
                                        value={part.unit}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size='small'
                                                value={editedPart.unit || ''}
                                                onChange={handleUnitChange}
                                                disabled={saving}
                                            />
                                        }
                                    />

                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label="リードタイム"
                                        value={part.lead_time_days ? `${part.lead_time_days}日` : '-'}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                value={editedPart.lead_time_days || ''}
                                                onChange={handleLeadTimeDaysChange}
                                                disabled={saving}
                                                InputProps={{
                                                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>日</Typography>
                                                }}
                                            />
                                        }
                                    />
                                </Grid>
                            </Grid>
                        </SectionCard>
                        {/* サプライヤー情報 */}
                        <SectionCard isEditMode={isEditMode} icon={<BusinessIcon />} title="サプライヤー情報">
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label="仕入先名"
                                        value={part.supplier_name || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={uniqueBranches}
                                                getOptionLabel={(option) => option.supplier_name || ''}
                                                getOptionKey={(option) => option.id}
                                                value={branches.find(b => b.id === editedPart.supplier_branch) || null}
                                                onChange={(_, newValue) => handleBranchChange(newValue)}
                                                disabled={saving}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size="small"
                                                        placeholder="サプライヤーを選択"
                                                    />
                                                )}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label="仕入先拠点名"
                                        value={part.branch_name || '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={filteredBranches}
                                                getOptionLabel={(option) => option.branch_name || ''}
                                                getOptionKey={(option) => option.id}
                                                value={branches.find(b => b.id === editedPart.supplier_branch) || null}
                                                onChange={(_, newValue) => handleBranchChange(newValue)}
                                                disabled={saving || filteredBranches.length === 0}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size="small"
                                                        placeholder={filteredBranches.length === 0 ? "先に仕入先を選択してください" : "仕入先支店を選択"}
                                                    />
                                                )}
                                            />
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <InfoRow
                                        isEditMode={isEditMode}
                                        label="仕入先部品名"
                                        value={part.supplier_part_name || '-'}
                                        editComponent={
                                            <MemoizedTextField
                                                fullWidth
                                                size="small"
                                                value={editedPart.supplier_part_name || ''}
                                                onChange={handleSupplierPartNameChange}
                                                disabled={saving}
                                            />
                                        }
                                    >
                                    </InfoRow>
                                </Grid>
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
                                            {part.notes || '未設定'}
                                        </Typography>
                                    </Paper>
                                }
                                editComponent={
                                    <MemoizedTextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={editedPart.notes || ''}
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
                                            {new Date(part.created_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            更新日時
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {new Date(part.updated_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>

                                    {part.created_by_name && (
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                作成者
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {part.created_by_name}
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
                            部品情報を読み込めませんでした
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
                                        checked={editedPart.is_active || false}
                                        onChange={handleIsActiveChange}
                                        disabled={saving}
                                    />
                                }
                                label={editedPart.is_active ? '有効' : '無効'}
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