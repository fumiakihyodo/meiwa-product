// app/customers/branches/[id]/edit/page.tsx (または app/customers/branches/new/page.tsx)
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { CustomerBranch, CustomerBranchCreateData, CustomerBranchUpdateData, BranchType, Customer } from '@/types/customer';
import { customerBranchApi, customerApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

export default function CustomerBranchFormPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEdit = params?.id && params.id !== 'new';
    const [loading, setLoading] = useState(isEdit);
    const [branch, setBranch] = useState<CustomerBranch | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customersLoading, setCustomersLoading] = useState(true);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<CustomerBranchCreateData | CustomerBranchUpdateData>({
        defaultValues: {
            customer: undefined,
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

    const isActive = watch('is_active');

    // Fetch customers
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const data = await customerApi.getCustomers({ is_active: true });
                setCustomers(data);
                
                // URLパラメータからcustomerIDを取得して設定
                const customerParam = searchParams.get('customer');
                if (customerParam && !isEdit) {
                    reset({ 
                        customer: Number(customerParam),
                        branch_code: '',
                        branch_name: '',
                        branch_type: BranchType.BRANCH,
                        is_active: true,
                    });
                }
            } catch (error) {
                console.error(error);
                toast.error('カスタマー一覧の取得に失敗しました');
            } finally {
                setCustomersLoading(false);
            }
        };
        fetchCustomers();
    }, [searchParams, isEdit, reset]);

    const fetchBranch = useCallback(async () => {
        try {
            const data = await customerBranchApi.getBranch(Number(params.id));
            setBranch(data);
            reset({
                customer: data.customer,
                branch_code: data.branch_code,
                branch_name: data.branch_name,
                branch_type: data.branch_type as BranchType,
                postal_code: data.postal_code || '',
                address: data.address || '',
                phone_number: data.phone_number || '',
                fax_number: data.fax_number || '',
                email: data.email || '',
                notes: data.notes || '',
                is_active: data.is_active,
            });
        } catch (error) {
            console.error(error);
            toast.error('カスタマー拠点情報の取得に失敗しました');
            router.push('/customers/branches');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, router]);

    useEffect(() => {
        if (isEdit) {
            fetchBranch();
        }
    }, [isEdit, fetchBranch]);

    const onSubmit = async (data: CustomerBranchCreateData | CustomerBranchUpdateData) => {
        try {
            if (isEdit && branch) {
                await customerBranchApi.updateBranch(branch.id, data as CustomerBranchUpdateData);
                toast.success('カスタマー拠点を更新しました');
                router.push(`/customers/branches/${branch.id}`);
            } else {
                const newBranch = await customerBranchApi.createBranch(data as CustomerBranchCreateData);
                toast.success('カスタマー拠点を作成しました');
                router.push(`/customers/branches/${newBranch.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { 
                    response?: { 
                        data?: { 
                            detail?: string;
                            branch_code?: string[];
                            branch_name?: string[];
                        } 
                    } 
                };
                const message = axiosError.response?.data?.detail || 
                               axiosError.response?.data?.branch_code?.[0] ||
                               axiosError.response?.data?.branch_name?.[0] || 
                               (isEdit ? 'カスタマー拠点の更新に失敗しました' : 'カスタマー拠点の作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? 'カスタマー拠点の更新に失敗しました' : 'カスタマー拠点の作成に失敗しました');
            }
        }
    };

    if (loading || customersLoading) {
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
                <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <IconButton onClick={() => router.push('/customers/branches')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? 'カスタマー拠点編集' : 'カスタマー拠点新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                {/* カスタマー選択 */}
                                <Grid item xs={12}>
                                    <Controller
                                        name="customer"
                                        control={control}
                                        rules={{ required: 'カスタマーは必須です' }}
                                        render={({ field: { onChange, value } }) => (
                                            <Autocomplete
                                                options={customers}
                                                getOptionLabel={(option) => 
                                                    typeof option === 'number' 
                                                        ? customers.find(c => c.id === option)?.company_name || ''
                                                        : option.company_name
                                                }
                                                value={customers.find(c => c.id === value) || null}
                                                onChange={(_, newValue) => {
                                                    onChange(newValue ? newValue.id : undefined);
                                                }}
                                                disabled={!!isEdit}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="カスタマー *"
                                                        error={!!errors.customer}
                                                        helperText={errors.customer?.message}
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <Box>
                                                            <Typography variant="body1">
                                                                {option.company_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.customer_code}
                                                            </Typography>
                                                        </Box>
                                                    </li>
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>

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

                                <Grid item xs={12} sm={6}>
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

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>拠点種別 *</InputLabel>
                                        <Controller
                                            name="branch_type"
                                            control={control}
                                            defaultValue={BranchType.BRANCH}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    label="拠点種別 *"
                                                >
                                                    <MenuItem value={BranchType.HEAD_OFFICE}>本社</MenuItem>
                                                    <MenuItem value={BranchType.BRANCH}>支店</MenuItem>
                                                    <MenuItem value={BranchType.SALES_OFFICE}>営業所</MenuItem>
                                                    <MenuItem value={BranchType.FACTORY}>工場</MenuItem>
                                                    <MenuItem value={BranchType.WAREHOUSE}>倉庫</MenuItem>
                                                    <MenuItem value={BranchType.OTHER}>その他</MenuItem>
                                                </Select>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="郵便番号"
                                        placeholder="123-4567"
                                        {...register('postal_code')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="住所"
                                        {...register('address')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="代表電話番号"
                                        placeholder="03-1234-5678"
                                        {...register('phone_number')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="FAX番号"
                                        placeholder="03-1234-5679"
                                        {...register('fax_number')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="メールアドレス"
                                        type="email"
                                        placeholder="info@example.com"
                                        {...register('email')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="備考"
                                        {...register('notes')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                {...register('is_active')}
                                                checked={isActive}
                                            />
                                        }
                                        label="有効な拠点"
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push(isEdit && branch ? `/customers/branches/${branch.id}` : '/customers/branches')}
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