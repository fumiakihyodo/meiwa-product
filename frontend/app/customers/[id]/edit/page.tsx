// app/customers/[id]/edit/page.tsx (または app/customers/new/page.tsx)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { Customer, CustomerCreateData, CustomerUpdateData } from '@/types/customer';
import { customerApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

export default function CustomerFormPage() {
    const params = useParams();
    const router = useRouter();
    const isEdit = params?.id && params.id !== 'new';
    const [loading, setLoading] = useState(isEdit);
    const [customer, setCustomer] = useState<Customer | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<CustomerCreateData | CustomerUpdateData>({
        defaultValues: {
            customer_code: '',
            company_name: '',
            website: '',
            notes: '',
            is_active: true,
        },
    });

    const isActive = watch('is_active');

    const fetchCustomer = useCallback(async () => {
        try {
            const data = await customerApi.getCustomer(Number(params.id));
            setCustomer(data);
            reset({
                customer_code: data.customer_code,
                company_name: data.company_name,
                website: data.website || '',
                notes: data.notes || '',
                is_active: data.is_active,
            });
        } catch (error) {
            console.error(error);
            toast.error('カスタマー情報の取得に失敗しました');
            router.push('/customers');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, router]);

    useEffect(() => {
        if (isEdit) {
            fetchCustomer();
        }
    }, [isEdit, fetchCustomer]);

    const onSubmit = async (data: CustomerCreateData | CustomerUpdateData) => {
        try {
            if (isEdit && customer) {
                await customerApi.updateCustomer(customer.id, data as CustomerUpdateData);
                toast.success('カスタマーを更新しました');
                router.push(`/customers/${customer.id}`);
            } else {
                const newCustomer = await customerApi.createCustomer(data as CustomerCreateData);
                toast.success('カスタマーを作成しました');
                router.push(`/customers/${newCustomer.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { 
                    response?: { 
                        data?: { 
                            detail?: string; 
                            customer_code?: string[];
                            company_name?: string[];
                        } 
                    } 
                };
                const message = axiosError.response?.data?.detail || 
                               axiosError.response?.data?.customer_code?.[0] ||
                               axiosError.response?.data?.company_name?.[0] || 
                               (isEdit ? 'カスタマーの更新に失敗しました' : 'カスタマーの作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? 'カスタマーの更新に失敗しました' : 'カスタマーの作成に失敗しました');
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
                <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <IconButton onClick={() => router.push('/customers')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? 'カスタマー編集' : 'カスタマー新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="カスタマーコード *"
                                        error={!!errors.customer_code}
                                        helperText={errors.customer_code?.message}
                                        {...register('customer_code', {
                                            required: 'カスタマーコードは必須です',
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="企業名 *"
                                        error={!!errors.company_name}
                                        helperText={errors.company_name?.message}
                                        {...register('company_name', {
                                            required: '企業名は必須です',
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="ウェブサイト"
                                        type="url"
                                        placeholder="https://example.com"
                                        {...register('website')}
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
                                        label="有効なカスタマー"
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push(isEdit && customer ? `/customers/${customer.id}` : '/customers')}
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