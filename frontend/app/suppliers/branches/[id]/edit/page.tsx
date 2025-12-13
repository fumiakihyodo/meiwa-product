// app/branches/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    IconButton,
    CircularProgress,
    FormControlLabel,
    Switch,
    MenuItem,
    Autocomplete,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { Supplier, SupplierBranch, SupplierBranchCreateData, SupplierBranchUpdateData, BranchType } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

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

export default function BranchFormPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEdit = params?.id && params.id !== 'new';
    const supplierIdParam = searchParams?.get('supplier');
    
    const [loading, setLoading] = useState(isEdit);
    const [branch, setBranch] = useState<SupplierBranch | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<BranchFormData>({
        defaultValues: {
            supplier: supplierIdParam ? Number(supplierIdParam) : 0,
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

    const fetchSuppliers = useCallback(async () => {
        try {
            const data = await supplierApi.getSuppliers({ is_active: 'true' });
            setSuppliers(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchSupplierById = useCallback(async (id: number) => {
        try {
            const data = await supplierApi.getSupplier(id);
            setSelectedSupplier(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchBranch = useCallback(async () => {
        if (!params.id) return;
        
        try {
            const data = await supplierApi.getSupplierBranch(Number(params.id));
            setBranch(data);
            
            // サプライヤーを取得して設定
            const supplier = await supplierApi.getSupplier(data.supplier);
            setSelectedSupplier(supplier);
            
            reset({
                supplier: data.supplier,
                branch_code: data.branch_code,
                branch_name: data.branch_name,
                branch_type: data.branch_type,
                postal_code: data.postal_code || '',
                address: data.address || '',
                phone_number: data.phone_number || '',
                fax_number: data.fax_number || '',
                email: data.email || '',
                notes: data.notes || '',
                is_active: data.is_active,
            });
        } catch (error) {
            console.error('Failed to fetch branch:', error);
            toast.error('拠点情報の取得に失敗しました');
            router.push('/branches');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, router]);

    useEffect(() => {
        fetchSuppliers();
        if (isEdit) {
            fetchBranch();
        } else if (supplierIdParam) {
            fetchSupplierById(Number(supplierIdParam));
        }
    }, [isEdit, supplierIdParam, fetchBranch, fetchSuppliers, fetchSupplierById]);

    const onSubmit = async (data: BranchFormData) => {
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

            if (isEdit && branch) {
                await supplierApi.updateSupplierBranch(branch.id, submitData);
                toast.success('拠点を更新しました');
                router.push(`/branches/${branch.id}`);
            } else {
                const newBranch = await supplierApi.createSupplierBranch(submitData as SupplierBranchCreateData);
                toast.success('拠点を作成しました');
                router.push(`/branches/${newBranch.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { detail?: string; branch_code?: string[] } } };
                const message = axiosError.response?.data?.detail || 
                               axiosError.response?.data?.branch_code?.[0] ||
                               (isEdit ? '拠点の更新に失敗しました' : '拠点の作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? '拠点の更新に失敗しました' : '拠点の作成に失敗しました');
            }
        }
    };

    if (loading) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                        <CircularProgress />
                    </Box>
                </Sidebar>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <IconButton onClick={() => router.push('/branches')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? '拠点編集' : '拠点新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                {/* サプライヤー選択 */}
                                <Grid item xs={12}>
                                    <Controller
                                        name="supplier"
                                        control={control}
                                        rules={{ required: 'サプライヤーは必須です' }}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={suppliers}
                                                getOptionLabel={(option) => `${option.company_name} (${option.supplier_code})`}
                                                value={selectedSupplier}
                                                onChange={(_, newValue) => {
                                                    setSelectedSupplier(newValue);
                                                    field.onChange(newValue?.id || 0);
                                                }}
                                                disabled={!!isEdit}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="サプライヤー *"
                                                        error={!!errors.supplier}
                                                        helperText={errors.supplier?.message}
                                                    />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* 拠点コード */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="拠点コード *"
                                        error={!!errors.branch_code}
                                        helperText={errors.branch_code?.message}
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

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                        連絡先情報
                                    </Typography>
                                </Grid>

                                {/* 郵便番号 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="郵便番号"
                                        placeholder="123-4567"
                                        {...register('postal_code')}
                                    />
                                </Grid>

                                {/* 住所 */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="住所"
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
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="備考"
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

                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push('/branches')}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '保存中...' : '保存'}
                                </Button>
                            </Box>
                        </form>
                    </Paper>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}