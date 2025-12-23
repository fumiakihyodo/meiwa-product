// app/suppliers/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { Supplier, SupplierCreateData, SupplierUpdateData } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

interface SupplierFormData {
    supplier_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active: boolean;
}

export default function SupplierFormPage() {
    const params = useParams();
    const router = useRouter();
    const isEdit = params?.id && params.id !== 'new';
    const [loading, setLoading] = useState(isEdit);
    const [supplier, setSupplier] = useState<Supplier | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<SupplierFormData>({
        defaultValues: {
            supplier_code: '',
            company_name: '',
            website: '',
            notes: '',
            is_active: true,
        },
    });

    const fetchSupplier = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplier(Number(params.id));
            setSupplier(data);
            reset({
                supplier_code: data.supplier_code,
                company_name: data.company_name,
                website: data.website || '',
                notes: data.notes || '',
                is_active: data.is_active,
            });
        } catch {
            toast.error('サプライヤー情報の取得に失敗しました');
            router.push('/suppliers');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, router]);

    useEffect(() => {
        if (isEdit) {
            fetchSupplier();
        }
    }, [isEdit, fetchSupplier]);

    const onSubmit = async (data: SupplierFormData) => {
        try {
            const submitData: SupplierCreateData | SupplierUpdateData = {
                ...data,
                website: data.website || undefined,
                notes: data.notes || undefined,
            };

            if (isEdit && supplier) {
                await supplierApi.updateSupplier(supplier.id, submitData);
                toast.success('サプライヤーを更新しました');
                router.push(`/suppliers/${supplier.id}`);
            } else {
                const newSupplier = await supplierApi.createSupplier(submitData as SupplierCreateData);
                toast.success('サプライヤーを作成しました');
                router.push(`/suppliers/${newSupplier.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { detail?: string; supplier_code?: string[]; company_name?: string[] } } };
                const message = axiosError.response?.data?.detail || 
                               axiosError.response?.data?.supplier_code?.[0] ||
                               axiosError.response?.data?.company_name?.[0] ||
                               (isEdit ? 'サプライヤーの更新に失敗しました' : 'サプライヤーの作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? 'サプライヤーの更新に失敗しました' : 'サプライヤーの作成に失敗しました');
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
                <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <IconButton onClick={() => router.push('/suppliers')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? 'サプライヤー編集' : 'サプライヤー新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                {/* サプライヤーコード */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="サプライヤーコード *"
                                        error={!!errors.supplier_code}
                                        helperText={errors.supplier_code?.message}
                                        {...register('supplier_code', {
                                            required: 'サプライヤーコードは必須です',
                                        })}
                                    />
                                </Grid>

                                {/* 企業名 */}
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

                                {/* ウェブサイト */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="ウェブサイト"
                                        type="url"
                                        placeholder="https://example.com"
                                        error={!!errors.website}
                                        helperText={errors.website?.message}
                                        {...register('website', {
                                            pattern: {
                                                value: /^https?:\/\/.+/,
                                                message: '有効なURLを入力してください（http://またはhttps://で始まる）'
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
                                    onClick={() => router.push('/suppliers')}
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