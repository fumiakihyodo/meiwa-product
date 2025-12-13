// app/contacts/[id]/edit/page.tsx
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
import { SupplierBranch, SupplierContact, SupplierContactCreateData, SupplierContactUpdateData, ContactResponsibility } from '@/types/business';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

interface ContactFormData {
    branch: number;
    name: string;
    name_kana?: string;
    department?: string;
    position?: string;
    email?: string;
    phone_number?: string;
    mobile_number?: string;
    extension_number?: string;
    responsibility: ContactResponsibility;
    responsibility_detail?: string;
    is_primary: boolean;
    is_active: boolean;
    notes?: string;
}

const RESPONSIBILITY_OPTIONS = [
    { value: ContactResponsibility.QUOTATION, label: '見積' },
    { value: ContactResponsibility.ORDER, label: '発注' },
    { value: ContactResponsibility.DELIVERY, label: '納品' },
    { value: ContactResponsibility.TECHNICAL, label: '技術' },
    { value: ContactResponsibility.QUALITY, label: '品質' },
    { value: ContactResponsibility.ACCOUNTING, label: '経理' },
    { value: ContactResponsibility.GENERAL, label: '全般' },
    { value: ContactResponsibility.OTHER, label: 'その他' },
];

export default function ContactFormPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEdit = params?.id && params.id !== 'new';
    const branchIdParam = searchParams?.get('branch');

    const [loading, setLoading] = useState(isEdit);
    const [contact, setContact] = useState<SupplierContact | null>(null);
    const [branches, setBranches] = useState<SupplierBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ContactFormData>({
        defaultValues: {
            branch: branchIdParam ? Number(branchIdParam) : 0,
            name: '',
            name_kana: '',
            department: '',
            position: '',
            email: '',
            phone_number: '',
            mobile_number: '',
            extension_number: '',
            responsibility: ContactResponsibility.GENERAL,
            responsibility_detail: '',
            is_primary: false,
            is_active: true,
            notes: '',
        },
    });

    const fetchBranches = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplierBranches({ is_active: 'true' })
            setBranches(data);
        } catch (error) {
            console.error(error)
        }
    }, [])

    const fetchBranchById = useCallback(async (id: number) => {
        try {
            const data = await supplierApi.getSupplierBranch(id);
            setSelectedBranch(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchContact = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplierContact(Number(params.id));
            setContact(data);

            // 拠点を取得して設定
            const branch = await supplierApi.getSupplierBranch(data.branch);
            setSelectedBranch(branch);

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
                responsibility: data.responsibility,
                responsibility_detail: data.responsibility_detail || '',
                is_primary: data.is_primary,
                is_active: data.is_active,
                notes: data.notes || '',
            });
        } catch (error) {
            console.error(error)
            toast.error('担当者情報の取得に失敗しました');
            router.push('/contacts');
        } finally {
            setLoading(false);
        }
    }, [params.id, router, reset]);

    useEffect(() => {
        fetchBranches();
        if (isEdit) {
            fetchContact();
        } else if (branchIdParam) {
            fetchBranchById(Number(branchIdParam));
        }
    }, [fetchBranches, fetchContact, fetchBranchById, isEdit, branchIdParam]);

    const onSubmit = async (data: ContactFormData) => {
        try {
            // メールアドレスまたは電話番号のいずれかが必須
            if (!data.email && !data.phone_number && !data.mobile_number) {
                toast.error('メールアドレスまたは電話番号のいずれかは必須です');
                return;
            }

            const submitData: SupplierContactCreateData | SupplierContactUpdateData = {
                ...data,
                name_kana: data.name_kana || undefined,
                department: data.department || undefined,
                position: data.position || undefined,
                email: data.email || undefined,
                phone_number: data.phone_number || undefined,
                mobile_number: data.mobile_number || undefined,
                extension_number: data.extension_number || undefined,
                responsibility_detail: data.responsibility_detail || undefined,
                notes: data.notes || undefined,
            };

            if (isEdit && contact) {
                await supplierApi.updateSupplierContact(contact.id, submitData);
                toast.success('担当者を更新しました');
                router.push(`/contacts/${contact.id}`);
            } else {
                const newContact = await supplierApi.createSupplierContact(submitData as SupplierContactCreateData);
                toast.success('担当者を作成しました');
                router.push(`/contacts/${newContact.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { detail?: string; email?: string[] } } };
                const message = axiosError.response?.data?.detail ||
                    axiosError.response?.data?.email?.[0] ||
                    (isEdit ? '担当者の更新に失敗しました' : '担当者の作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? '担当者の更新に失敗しました' : '担当者の作成に失敗しました');
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
                        <IconButton onClick={() => router.push('/contacts')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? '担当者編集' : '担当者新規作成'}
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
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={branches}
                                                getOptionLabel={(option) => option.display_name || `${option.branch_name} (${option.branch_code})`}
                                                value={selectedBranch}
                                                onChange={(_, newValue) => {
                                                    setSelectedBranch(newValue);
                                                    field.onChange(newValue?.id || 0);
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
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        基本情報
                                    </Typography>
                                </Grid>

                                {/* 氏名 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="氏名 *"
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        {...register('name', {
                                            required: '氏名は必須です',
                                        })}
                                    />
                                </Grid>

                                {/* 氏名（カナ） */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="氏名（カナ）"
                                        {...register('name_kana')}
                                    />
                                </Grid>

                                {/* 部署 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="部署"
                                        {...register('department')}
                                    />
                                </Grid>

                                {/* 役職 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="役職"
                                        {...register('position')}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                        連絡先情報
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ※ メールアドレス、電話番号、携帯電話番号のいずれか1つ以上は必須です
                                    </Typography>
                                </Grid>

                                {/* メールアドレス */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="メールアドレス"
                                        type="email"
                                        placeholder="tanaka@example.com"
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

                                {/* 電話番号 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="電話番号（直通）"
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

                                {/* 内線番号 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="内線番号"
                                        placeholder="1234"
                                        {...register('extension_number')}
                                    />
                                </Grid>

                                {/* 携帯電話番号 */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="携帯電話番号"
                                        placeholder="090-1234-5678"
                                        error={!!errors.mobile_number}
                                        helperText={errors.mobile_number?.message}
                                        {...register('mobile_number', {
                                            pattern: {
                                                value: /^[0-9\-\+\(\)]+$/,
                                                message: '電話番号の形式が正しくありません'
                                            }
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                        担当業務
                                    </Typography>
                                </Grid>

                                {/* 主担当業務 */}
                                <Grid item xs={12}>
                                    <Controller
                                        name="responsibility"
                                        control={control}
                                        rules={{ required: '主担当業務は必須です' }}
                                        render={({ field }) => (
                                            <TextField
                                                select
                                                fullWidth
                                                label="主担当業務 *"
                                                error={!!errors.responsibility}
                                                helperText={errors.responsibility?.message}
                                                {...field}
                                            >
                                                {RESPONSIBILITY_OPTIONS.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />
                                </Grid>

                                {/* 担当業務詳細 */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="担当業務詳細"
                                        placeholder="具体的な担当業務内容を記載してください"
                                        {...register('responsibility_detail')}
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

                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                        ステータス
                                    </Typography>
                                </Grid>

                                {/* 主担当フラグ */}
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="is_primary"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={field.value}
                                                        onChange={(e) => field.onChange(e.target.checked)}
                                                    />
                                                }
                                                label="主担当に設定"
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* 有効フラグ */}
                                <Grid item xs={12} sm={6}>
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
                                    onClick={() => router.push('/contacts')}
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