// components/PartFormModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Autocomplete,
    Alert,
    Box,
    Chip,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Part, PartCreateData, PriceHistoryCreateData } from '@/types/purchases';
import { Product } from '@/types/procuct'
import { SupplierBranch } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { productApi } from '@/services/apiProduct';
import { purchasesApi } from '@/services/apiPurchases';
import toast from 'react-hot-toast';

import { ORDER_TYPE_OPTIONS } from './PartComponents/OrderType';

interface PartFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productId?: number;
    duplicateFrom?: Part | null;
    supplierId?: number;
}

interface PartFormData {
    product: number;
    supplier_branch: number;
    part_number: string;
    part_name: string;
    specification?: string;
    supplier_part_name?: string;
    unit: string;
    order_type: string;
    standard_quantity: number;
    usage_quantity: number;
    minimum_order_quantity: number;
    lead_time_days?: number;
    is_active: boolean;
    notes?: string;
    price?: number;
    start_date?: string;
    change_reason?: string;
}

const PartFormModalComponent: React.FC<PartFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    productId,
    duplicateFrom,
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<SupplierBranch[]>([]);
    const [loading, setLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    const [branchesLoading, setBranchesLoading] = useState(false);

    // 複製モードかどうかを判定（メモ化）
    const isDuplicateMode = useMemo(() => !!duplicateFrom, [duplicateFrom]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        watch,
    } = useForm<PartFormData>({
        defaultValues: {
            product: productId || 0,
            supplier_branch: 0,
            part_number: '',
            part_name: '',
            specification: '',
            supplier_part_name: '',
            unit: '個',
            order_type: 'MOQ',
            standard_quantity: 1,
            usage_quantity: 1,
            minimum_order_quantity: 1,
            lead_time_days: undefined,
            is_active: true,
            notes: '',
            price: undefined,
            start_date: new Date().toISOString().split('T')[0],
            change_reason: '',
        },
    });

    // 選択されたサプライヤーブランチを監視
    const selectedBranchId = watch('supplier_branch');

    // 製品一覧の取得をメモ化
    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const data = await productApi.getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
            toast.error('製品一覧の取得に失敗しました');
        } finally {
            setProductsLoading(false);
        }
    }, []);

    // 仕入先支店の取得をメモ化
    const fetchBranches = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const data = await supplierApi.getSupplierBranches({ is_active: 'true' });
            setBranches(data);
        } catch (error) {
            console.error(error);
            toast.error('仕入先支店の取得に失敗しました');
        } finally {
            setBranchesLoading(false);
        }
    }, []);

    // モーダルが開いた時のみデータを取得
    useEffect(() => {
        if (open) {
            fetchProducts();
            fetchBranches();
        }
    }, [open, fetchProducts, fetchBranches]);

    // フォームのリセット処理
    useEffect(() => {
        if (!open) return;

        // 複製モード
        if (duplicateFrom) {
            reset({
                product: duplicateFrom.product,
                supplier_branch: duplicateFrom.supplier_branch,
                part_number: `${duplicateFrom.part_number}`,
                part_name: `${duplicateFrom.part_name} `,
                specification: duplicateFrom.specification || '',
                supplier_part_name: duplicateFrom.supplier_part_name || '',
                unit: duplicateFrom.unit,
                order_type: duplicateFrom.order_type || 'MOQ',
                standard_quantity: duplicateFrom.standard_quantity,
                usage_quantity: duplicateFrom.usage_quantity,
                minimum_order_quantity: duplicateFrom.minimum_order_quantity,
                lead_time_days: duplicateFrom.lead_time_days,
                is_active: true,
                notes: duplicateFrom.notes || '',
                price: duplicateFrom.current_price,
                start_date: new Date().toISOString().split('T')[0],
                change_reason: '複製時の初期登録',
            });
        }
        // 新規作成モード
        else {
            reset({
                product: productId || 0,
                supplier_branch: 0,
                part_number: '',
                part_name: '',
                specification: '',
                supplier_part_name: '',
                unit: '個',
                order_type: 'MOQ',
                standard_quantity: 1,
                usage_quantity: 1,
                minimum_order_quantity: 1,
                lead_time_days: undefined,
                is_active: true,
                notes: '',
                price: undefined,
                start_date: new Date().toISOString().split('T')[0],
                change_reason: '初期登録',
            });
        }
    }, [open, duplicateFrom, productId, reset]);

    // フォーム送信処理をメモ化
    const onSubmit = useCallback(async (data: PartFormData) => {
        setLoading(true);

        try {
            const partData: PartCreateData = {
                product: data.product,
                supplier_branch: data.supplier_branch,
                part_number: data.part_number,
                part_name: data.part_name,
                specification: data.specification || '',
                supplier_part_name: data.supplier_part_name || '',
                unit: data.unit,
                order_type: data.order_type,
                standard_quantity: data.standard_quantity,
                usage_quantity: data.usage_quantity,
                minimum_order_quantity: data.minimum_order_quantity,
                lead_time_days: data.lead_time_days,
                is_active: data.is_active,
                notes: data.notes || '',
            };

            // 新規作成または複製モード
            const newPart = await purchasesApi.createPart(partData);

            // 価格が入力されている場合は価格履歴も作成
            if (data.price) {
                const priceData: PriceHistoryCreateData = {
                    part: newPart.id,
                    price: data.price,
                    start_date: data.start_date || new Date().toISOString().split('T')[0],
                    is_active: true,
                    change_reason: data.change_reason || (isDuplicateMode ? '複製時の初期登録' : '初期登録'),
                };
                await purchasesApi.createPriceHistory(priceData);
            }

            toast.success(isDuplicateMode ? '部品を複製しました' : '部品を作成しました');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Form Submit Error:', error);
            
            if (error && typeof error === 'object' && 'response' in error) {
                const errorResponse = error as { response?: { data?: Record<string, unknown> } };
                if (errorResponse.response?.data) {
                    const errorData = errorResponse.response.data;
                    const errorMessage = Object.entries(errorData)
                        .map(([key, value]) => {
                            const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
                            return `${key}: ${valueStr}`;
                        })
                        .join('\n');
                    
                    toast.error(`エラー: ${errorMessage}`);
                } else {
                    toast.error(isDuplicateMode ? '部品の複製に失敗しました' : '部品の作成に失敗しました');
                }
            } else {
                toast.error(isDuplicateMode ? '部品の複製に失敗しました' : '部品の作成に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [isDuplicateMode, onSuccess, onClose]);

    // タイトルをメモ化
    const dialogTitle = useMemo(() => {
        if (isDuplicateMode) return '部品複製';
        return '部品新規作成';
    }, [isDuplicateMode]);

    // ユニークなサプライヤー名のリスト
    const uniqueBranches = useMemo(() => {
        return Array.from(
            new Map(branches.map(branch => [branch.supplier_name, branch])).values()
        );
    }, [branches]);

    // フィルタされた支店のリスト
    const filteredBranches = useMemo(() => {
        if (!selectedBranchId) return [];
        const selectedBranch = branches.find(branch => branch.id === selectedBranchId);
        if (!selectedBranch) return [];
        return branches.filter(b => b.supplier_name === selectedBranch.supplier_name);
    }, [selectedBranchId, branches]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            keepMounted={false}
            PaperProps={{
                sx: {
                    borderRadius: 1,
                    maxHeight: '90vh',
                }
            }}
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogTitle sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 2,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dialogTitle}
                        {isDuplicateMode && (
                            <Chip
                                label="複製モード"
                                color="secondary"
                                size="small"
                            />
                        )}
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, mt: 3 }}>
                    <Grid container spacing={3}>
                        {/* モード説明 */}
                        {isDuplicateMode && (
                            <Grid item xs={12}>
                                <Alert severity="info">
                                    既存の部品情報を複製して新しい部品を作成します。
                                </Alert>
                            </Grid>
                        )}

                        {/* 紐付き製品情報 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 24,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                    <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        紐付き製品情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 製品 */}
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="product"
                                control={control}
                                rules={{ required: '製品は必須です', min: { value: 1, message: '製品を選択してください' } }}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={products}
                                        getOptionLabel={(option) =>
                                            typeof option === 'number'
                                                ? products.find(p => p.id === option)?.product_number || ''
                                                : option.product_number || ''
                                        }
                                        loading={productsLoading}
                                        value={products.find(p => p.id === field.value) || null}
                                        onChange={(_, newValue) => {
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="品番 *"
                                                error={!!errors.product}
                                                helperText={errors.product?.message}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {productsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="product"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={products}
                                        getOptionLabel={(option) =>
                                            typeof option === 'number'
                                                ? products.find(p => p.id === option)?.product_name || ''
                                                : option.product_name || ''
                                        }
                                        loading={productsLoading}
                                        value={products.find(p => p.id === field.value) || null}
                                        onChange={(_, newValue) => {
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="製品名 *"
                                                error={!!errors.product}
                                                helperText={errors.product?.message}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {productsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>

                        {/* 基本情報 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 24,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                    <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        基本情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 部品番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="部品番号 *"
                                error={!!errors.part_number}
                                helperText={errors.part_number?.message || (isDuplicateMode ? '新しい品番を入力してください' : '')}
                                {...register('part_number', { required: '部品番号は必須です' })}
                            />
                        </Grid>

                        {/* 部品名 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="部品名 *"
                                error={!!errors.part_name}
                                helperText={errors.part_name?.message}
                                {...register('part_name', { required: '部品名は必須です' })}
                            />
                        </Grid>

                        {/* 仕様 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="仕様"
                                multiline
                                rows={2}
                                {...register('specification')}
                            />
                        </Grid>

                        {/* 標準数量 */}
                        <Grid item xs={12} sm={2}>
                            <TextField
                                fullWidth
                                label="標準数量 *"
                                type="number"
                                error={!!errors.standard_quantity}
                                helperText={errors.standard_quantity?.message}
                                {...register('standard_quantity', {
                                    required: '標準数量は必須です',
                                    min: { value: 1, message: '1以上を入力してください' },
                                    valueAsNumber: true,
                                })}
                            />
                        </Grid>

                        {/* 使用数 */}
                        <Grid item xs={12} sm={2}>
                            <TextField
                                fullWidth
                                label="使用数 *"
                                type="number"
                                error={!!errors.usage_quantity}
                                helperText={errors.usage_quantity?.message || '製品1個あたりの使用数量'}
                                {...register('usage_quantity', {
                                    required: '使用数は必須です',
                                    min: { value: 1, message: '1以上を入力してください' },
                                    valueAsNumber: true,
                                })}
                            />
                        </Grid>

                        {/* 現在単価（新規作成・複製時） */}
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="現在単価"
                                type="number"
                                inputProps={{ step: '0.01' }}
                                error={!!errors.price}
                                helperText={errors.price?.message || '初期価格を設定する場合は入力'}
                                {...register('price', { valueAsNumber: true })}
                            />
                        </Grid>

                        {/* 発注区分 */}
                        <Grid item xs={12} sm={2}>
                            <TextField
                                fullWidth
                                select
                                label="発注区分 *"
                                error={!!errors.order_type}
                                helperText={errors.order_type?.message}
                                defaultValue="MOQ"
                                SelectProps={{
                                    native: true,
                                }}
                                {...register('order_type', { required: '発注区分は必須です' })}
                            >
                                <option value="" />
                                {ORDER_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </TextField>
                        </Grid>

                        {/* 最小発注数量 */}
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="最小発注数量 *"
                                type="number"
                                error={!!errors.minimum_order_quantity}
                                helperText={errors.minimum_order_quantity?.message}
                                {...register('minimum_order_quantity', {
                                    required: '最小発注数量は必須です',
                                    min: { value: 1, message: '1以上を入力してください' },
                                    valueAsNumber: true,
                                })}
                            />
                        </Grid>

                        {/* 単位 */}
                        <Grid item xs={12} sm={1}>
                            <TextField
                                fullWidth
                                label="単位 *"
                                error={!!errors.unit}
                                helperText={errors.unit?.message}
                                {...register('unit', { required: '単位は必須です' })}
                            />
                        </Grid>

                        {/* リードタイム */}
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="リードタイム"
                                type="number"
                                InputProps={{
                                    endAdornment: <Box component="span" sx={{ ml: 1 }}>日</Box>
                                }}
                                {...register('lead_time_days', { valueAsNumber: true })}
                            />
                        </Grid>

                        {/* サプライヤー情報 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 24,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                    <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        サプライヤー情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 仕入先名 */}
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="supplier_branch"
                                control={control}
                                rules={{ required: '仕入先は必須です', min: { value: 1, message: '仕入先を選択してください' } }}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={uniqueBranches}
                                        getOptionLabel={(option) => option.supplier_name || ''}
                                        getOptionKey={(option) => option.id}
                                        loading={branchesLoading}
                                        value={branches.find(b => b.id === field.value) || null}
                                        onChange={(_, newValue) => {
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="仕入先名 *"
                                                error={!!errors.supplier_branch}
                                                helperText={errors.supplier_branch?.message}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {branchesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>

                        {/* 仕入先拠点名 */}
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="supplier_branch"
                                control={control}
                                rules={{ required: '仕入先拠点は必須です', min: { value: 1, message: '仕入先拠点を選択してください' } }}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={filteredBranches}
                                        getOptionLabel={(option) => option.branch_name || ''}
                                        getOptionKey={(option) => option.id}
                                        loading={branchesLoading}
                                        value={branches.find(b => b.id === field.value) || null}
                                        onChange={(_, newValue) => {
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        disabled={filteredBranches.length === 0}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="仕入先拠点名 *"
                                                error={!!errors.supplier_branch}
                                                helperText={errors.supplier_branch?.message}
                                                placeholder={filteredBranches.length === 0 ? "先に仕入先を選択してください" : "仕入先拠点を選択"}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {branchesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>

                        {/* 仕入先部品名 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="仕入先部品名"
                                {...register('supplier_part_name')}
                            />
                        </Grid>

                        {/* 価格情報（価格が入力された場合のみ必要） */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 24,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                    <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        価格情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="価格適用開始日"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                {...register('start_date')}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="価格変更理由"
                                placeholder={isDuplicateMode ? '複製時の初期登録' : '初期登録'}
                                {...register('change_reason')}
                            />
                        </Grid>

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 24,
                                            bgcolor: 'primary.main',
                                            borderRadius: 1,
                                        }}
                                    />
                                    <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        備考
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="備考詳細"
                                multiline
                                rows={4}
                                placeholder="備考を入力してください"
                                {...register('notes')}
                            />
                        </Grid>

                        {/* 有効フラグ */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox {...field} checked={field.value} />
                                        )}
                                    />
                                }
                                label="有効"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button 
                        onClick={onClose} 
                        disabled={loading}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        color={isDuplicateMode ? 'secondary' : 'primary'}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        {loading ? '処理中...' : (isDuplicateMode ? '複製' : '作成')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

// React.memoでコンポーネント全体をメモ化
const PartFormModal = React.memo(PartFormModalComponent);

export default PartFormModal;
export { PartFormModal };