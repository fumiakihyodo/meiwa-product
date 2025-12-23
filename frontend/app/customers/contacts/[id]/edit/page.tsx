// app/customers/contacts/[id]/edit/page.tsx (または app/customers/contacts/new/page.tsx)
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
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
    Autocomplete,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { CustomerContact, CustomerContactCreateData, CustomerContactUpdateData, CustomerBranch } from '@/types/customer';
import { customerContactApi, customerBranchApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

function CustomerContactFormContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEdit = params?.id && params.id !== 'new';
    const [loading, setLoading] = useState(isEdit);
    const [contact, setContact] = useState<CustomerContact | null>(null);
    const [branches, setBranches] = useState<CustomerBranch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(true);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<CustomerContactCreateData | CustomerContactUpdateData>({
        defaultValues: {
            branch: undefined,
            name: '',
            name_kana: '',
            department: '',
            position: '',
            email: '',
            phone_number: '',
            mobile_number: '',
            extension_number: '',
        },
    });

    // Fetch branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await customerBranchApi.getBranches({ is_active: true });
                setBranches(data);
                
                // URLパラメータからbranchIDを取得して設定
                const branchParam = searchParams.get('branch');
                if (branchParam && !isEdit) {
                    reset({ 
                        branch: Number(branchParam),
                        name: '',
                        name_kana: '',
                        department: '',
                        position: '',
                        email: '',
                        phone_number: '',
                        mobile_number: '',
                        extension_number: '',
                    });
                }
            } catch (error) {
                console.error(error);
                toast.error('カスタマー拠点一覧の取得に失敗しました');
            } finally {
                setBranchesLoading(false);
            }
        };
        fetchBranches();
    }, [searchParams, isEdit, reset]);

    const fetchContact = useCallback(async () => {
        try {
            const data = await customerContactApi.getContact(Number(params.id));
            setContact(data);
            reset({
                branch: data.branch,
                name: data.name,
                name_kana: data.name_kana || '',
                department: data.department || '',
                position: data.position || '',
                email: data.email || '',
                phone_number: data.phone_number || '',
                mobile_number: data.mobile_number || '',
                extension_number: data.extension_number || '',
            });
        } catch (error) {
            console.error(error);
            toast.error('カスタマー担当者情報の取得に失敗しました');
            router.push('/customers/contacts');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, router]);

    useEffect(() => {
        if (isEdit) {
            fetchContact();
        }
    }, [isEdit, fetchContact]);

    const onSubmit = async (data: CustomerContactCreateData | CustomerContactUpdateData) => {
        try {
            if (isEdit && contact) {
                await customerContactApi.updateContact(contact.id, data as CustomerContactUpdateData);
                toast.success('カスタマー担当者を更新しました');
                router.push(`/customers/contacts/${contact.id}`);
            } else {
                const newContact = await customerContactApi.createContact(data as CustomerContactCreateData);
                toast.success('カスタマー担当者を作成しました');
                router.push(`/customers/contacts/${newContact.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { 
                    response?: { 
                        data?: { 
                            detail?: string;
                            name?: string[];
                            email?: string[];
                        } 
                    } 
                };
                const message = axiosError.response?.data?.detail || 
                               axiosError.response?.data?.name?.[0] ||
                               axiosError.response?.data?.email?.[0] || 
                               (isEdit ? 'カスタマー担当者の更新に失敗しました' : 'カスタマー担当者の作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? 'カスタマー担当者の更新に失敗しました' : 'カスタマー担当者の作成に失敗しました');
            }
        }
    };

    if (loading || branchesLoading) {
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
                        <IconButton onClick={() => router.push('/customers/contacts')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? 'カスタマー担当者編集' : 'カスタマー担当者新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                {/* 拠点選択 */}
                                <Grid item xs={12}>
                                    <Controller
                                        name="branch"
                                        control={control}
                                        rules={{ required: '拠点は必須です' }}
                                        render={({ field: { onChange, value } }) => (
                                            <Autocomplete
                                                options={branches}
                                                getOptionLabel={(option) => {
                                                    if (typeof option === 'number') {
                                                        const branch = branches.find(b => b.id === option);
                                                        return branch?.display_name || '';
                                                    }
                                                    return option.display_name || '';
                                                }}
                                                value={branches.find(b => b.id === value) || null}
                                                onChange={(_, newValue) => {
                                                    onChange(newValue ? newValue.id : undefined);
                                                }}
                                                disabled={!!isEdit}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="所属拠点 *"
                                                        error={!!errors.branch}
                                                        helperText={errors.branch?.message}
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <Box>
                                                            <Typography variant="body1">
                                                                {option.display_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.branch_code}
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
                                        label="担当者名 *"
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        {...register('name', {
                                            required: '担当者名は必須です',
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="担当者名（カナ）"
                                        {...register('name_kana')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="部署"
                                        {...register('department')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="役職"
                                        {...register('position')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="メールアドレス"
                                        type="email"
                                        placeholder="example@company.com"
                                        {...register('email')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="電話番号（直通）"
                                        placeholder="03-1234-5678"
                                        {...register('phone_number')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="携帯電話番号"
                                        placeholder="090-1234-5678"
                                        {...register('mobile_number')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="内線番号"
                                        placeholder="1234"
                                        {...register('extension_number')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">
                                        ※ メールアドレスまたは電話番号のいずれかは必須です
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push(isEdit && contact ? `/customers/contacts/${contact.id}` : '/customers/contacts')}
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

export default function CustomerContactFormPage() {
    return (
        <Suspense fallback={
            <AuthGuard>
                <Sidebar>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                        <CircularProgress />
                    </Box>
                </Sidebar>
            </AuthGuard>
        }>
            <CustomerContactFormContent />
        </Suspense>
    );
}