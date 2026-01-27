// components/SupplierModal/BranchFormModal.tsx
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
    Switch,
    CircularProgress,
    Autocomplete,
    Alert,
    Box,
    Chip,
    MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Supplier, SupplierBranch, SupplierBranchCreateData, SupplierBranchUpdateData, BranchType } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';

interface BranchFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: SupplierBranch | null;
    duplicateFrom?: SupplierBranch | null;
    supplierId?: number;
}

interface BranchFormData {
    supplier: number;
    branch_code: string;
    branch_name: string;
    branch_type: BranchType;
    postal_code?: string;
    address?: string;
    phone_number?: string;
    fax_number?: string;
    email?: string;
    notes?: string;
    is_active: boolean;
}

const BRANCH_TYPE_OPTIONS = [
    { value: BranchType.HEAD_OFFICE, label: '本社' },
    { value: BranchType.BRANCH, label: '支店' },
    { value: BranchType.SALES_OFFICE, label: '営業所' },
    { value: BranchType.FACTORY, label: '工場' },
    { value: BranchType.WAREHOUSE, label: '倉庫' },
    { value: BranchType.OTHER, label: 'その他' },
];

const BranchFormModalComponent: React.FC<BranchFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    editData,
    duplicateFrom,
    supplierId,
}) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // モードの判定（メモ化）
    const isEditMode = useMemo(() => !!editData, [editData]);
    const isDuplicateMode = useMemo(() => !!duplicateFrom, [duplicateFrom]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<BranchFormData>({
        defaultValues: {
            supplier: supplierId || 0,
            branch_code: '',
            branch_name: '',
            branch_type: BranchType.BRANCH,
            postal_code: '',
            address: '',
            phone_number: '',
            fax_number: '',
            email: '',
            notes: '',
            is_active: true,
        },
    });

    // 仕入先一覧の取得をメモ化
    const fetchSuppliers = useCallback(async () => {
        setSuppliersLoading(true);
        try {
            const data = await supplierApi.getSuppliers({ is_active: 'true' });
            setSuppliers(data);
        } catch (error) {
            console.error(error);
            toast.error('仕入先一覧の取得に失敗しました');
        } finally {
            setSuppliersLoading(false);
        }
    }, []);

    // 仕入先詳細の取得
    const fetchSupplierById = useCallback(async (id: number) => {
        try {
            const data = await supplierApi.getSupplier(id);
            setSelectedSupplier(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    // モーダルが開いた時のみデータを取得
    useEffect(() => {
        if (open) {
            fetchSuppliers();
        }
    }, [open, fetchSuppliers]);

    // フォームのリセット処理
    useEffect(() => {
        if (!open) return;

        // 編集モード
        if (editData) {
            fetchSupplierById(editData.supplier);
            reset({
                supplier: editData.supplier,
                branch_code: editData.branch_code,
                branch_name: editData.branch_name,
                branch_type: editData.branch_type,
                postal_code: editData.postal_code || '',
                address: editData.address || '',
                phone_number: editData.phone_number || '',
                fax_number: editData.fax_number || '',
                email: editData.email || '',
                notes: editData.notes || '',
                is_active: editData.is_active,
            });
        }
        // 複製モード
        else if (duplicateFrom) {
            fetchSupplierById(duplicateFrom.supplier);
            reset({
                supplier: duplicateFrom.supplier,
                branch_code: `${duplicateFrom.branch_code}_copy`,
                branch_name: `${duplicateFrom.branch_name} (コピー)`,
                branch_type: duplicateFrom.branch_type,
                postal_code: duplicateFrom.postal_code || '',
                address: duplicateFrom.address || '',
                phone_number: duplicateFrom.phone_number || '',
                fax_number: duplicateFrom.fax_number || '',
                email: duplicateFrom.email || '',
                notes: duplicateFrom.notes || '',
                is_active: true,
            });
        }
        // 新規作成モード
        else {
            setSelectedSupplier(null);
            if (supplierId) {
                fetchSupplierById(supplierId);
            }
            reset({
                supplier: supplierId || 0,
                branch_code: '',
                branch_name: '',
                branch_type: BranchType.BRANCH,
                postal_code: '',
                address: '',
                phone_number: '',
                fax_number: '',
                email: '',
                notes: '',
                is_active: true,
            });
        }
    }, [open, editData, duplicateFrom, supplierId, reset, fetchSupplierById]);

    // フォーム送信処理をメモ化
    const onSubmit = useCallback(async (data: BranchFormData) => {
        setLoading(true);

        try {
            const submitData: SupplierBranchCreateData | SupplierBranchUpdateData = {
                ...data,
                postal_code: data.postal_code || undefined,
                address: data.address || undefined,
                phone_number: data.phone_number || undefined,
                fax_number: data.fax_number || undefined,
                email: data.email || undefined,
                notes: data.notes || undefined,
            };

            if (isEditMode && editData) {
                await supplierApi.updateSupplierBranch(editData.id, submitData);
                toast.success('拠点を更新しました');
            } else {
                await supplierApi.createSupplierBranch(submitData as SupplierBranchCreateData);
                toast.success(isDuplicateMode ? '拠点を複製しました' : '拠点を作成しました');
            }

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
                    toast.error(isEditMode ? '拠点の更新に失敗しました' : '拠点の作成に失敗しました');
                }
            } else {
                toast.error(isEditMode ? '拠点の更新に失敗しました' : '拠点の作成に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [isEditMode, isDuplicateMode, editData, onSuccess, onClose]);

    // タイトルをメモ化
    const dialogTitle = useMemo(() => {
        if (isEditMode) return '拠点編集';
        if (isDuplicateMode) return '拠点複製';
        return '拠点新規作成';
    }, [isEditMode, isDuplicateMode]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
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
                        {isEditMode && (
                            <Chip
                                label="編集モード"
                                color="primary"
                                size="small"
                            />
                        )}
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
                                    既存の拠点情報を複製して新しい拠点を作成します。
                                </Alert>
                            </Grid>
                        )}

                        {/* 仕入先情報 */}
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
                                        仕入先情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 仕入先選択 */}
                        <Grid item xs={12}>
                            <Controller
                                name="supplier"
                                control={control}
                                rules={{ required: '仕入先は必須です', min: { value: 1, message: '仕入先を選択してください' } }}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={suppliers}
                                        getOptionLabel={(option) =>
                                            typeof option === 'number'
                                                ? suppliers.find(s => s.id === option)?.company_name || ''
                                                : `${option.company_name} (${option.supplier_code})`
                                        }
                                        loading={suppliersLoading}
                                        value={selectedSupplier}
                                        onChange={(_, newValue) => {
                                            setSelectedSupplier(newValue);
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        disabled={isEditMode || !!supplierId}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="仕入先 *"
                                                error={!!errors.supplier}
                                                helperText={errors.supplier?.message}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {suppliersLoading ? <CircularProgress color="inherit" size={20} /> : null}
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

                        {/* 拠点コード */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="拠点コード *"
                                error={!!errors.branch_code}
                                helperText={errors.branch_code?.message || (isDuplicateMode ? '新しいコードを入力してください' : '')}
                                {...register('branch_code', {
                                    required: '拠点コードは必須です',
                                })}
                            />
                        </Grid>

                        {/* 拠点種別 */}
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="branch_type"
                                control={control}
                                rules={{ required: '拠点種別は必須です' }}
                                render={({ field }) => (
                                    <TextField
                                        select
                                        fullWidth
                                        label="拠点種別 *"
                                        error={!!errors.branch_type}
                                        helperText={errors.branch_type?.message}
                                        {...field}
                                    >
                                        {BRANCH_TYPE_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {/* 拠点名 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="拠点名 *"
                                error={!!errors.branch_name}
                                helperText={errors.branch_name?.message}
                                {...register('branch_name', {
                                    required: '拠点名は必須です',
                                })}
                            />
                        </Grid>

                        {/* 連絡先情報 */}
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
                                        連絡先情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 郵便番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="郵便番号"
                                placeholder="123-4567"
                                InputLabelProps={{ shrink: true }}
                                {...register('postal_code')}
                            />
                        </Grid>

                        {/* 空白 */}
                        <Grid item xs={12} sm={6} />

                        {/* 住所 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="住所"
                                InputLabelProps={{ shrink: true }}
                                {...register('address')}
                            />
                        </Grid>

                        {/* 電話番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="電話番号"
                                placeholder="03-1234-5678"
                                error={!!errors.phone_number}
                                helperText={errors.phone_number?.message}
                                InputLabelProps={{ shrink: true }}
                                {...register('phone_number', {
                                    pattern: {
                                        value: /^[0-9\-\+\(\)]+$/,
                                        message: '電話番号の形式が正しくありません'
                                    }
                                })}
                            />
                        </Grid>

                        {/* FAX番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="FAX番号"
                                placeholder="03-1234-5679"
                                error={!!errors.fax_number}
                                helperText={errors.fax_number?.message}
                                InputLabelProps={{ shrink: true }}
                                {...register('fax_number', {
                                    pattern: {
                                        value: /^[0-9\-\+\(\)]+$/,
                                        message: 'FAX番号の形式が正しくありません'
                                    }
                                })}
                            />
                        </Grid>

                        {/* メールアドレス */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="メールアドレス"
                                type="email"
                                placeholder="info@example.com"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                InputLabelProps={{ shrink: true }}
                                {...register('email', {
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'メールアドレスの形式が正しくありません'
                                    }
                                })}
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
                                multiline
                                rows={4}
                                label="備考詳細"
                                placeholder="備考を入力してください"
                                InputLabelProps={{ shrink: true }}
                                {...register('notes')}
                            />
                        </Grid>

                        {/* 有効フラグ */}
                        <Grid item xs={12}>
                            <Controller
                                name="is_active"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                            />
                                        }
                                        label="有効"
                                    />
                                )}
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
                        color={isEditMode ? 'primary' : isDuplicateMode ? 'secondary' : 'primary'}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        {loading ? '処理中...' : (isEditMode ? '更新' : isDuplicateMode ? '複製' : '作成')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

// React.memoでコンポーネント全体をメモ化
const BranchFormModal = React.memo(BranchFormModalComponent);

export default BranchFormModal;
export { BranchFormModal };