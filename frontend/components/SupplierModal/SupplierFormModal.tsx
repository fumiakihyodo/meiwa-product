// components/SupplierModal/SupplierFormModal.tsx
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
    Alert,
    Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Supplier, SupplierCreateData, SupplierUpdateData } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';

interface SupplierFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: Supplier | null;
    duplicateFrom?: Supplier | null;
}

interface SupplierFormData {
    supplier_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active: boolean;
}

const SupplierFormModalComponent: React.FC<SupplierFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    editData,
    duplicateFrom,
}) => {
    const [loading, setLoading] = useState<boolean>(false);

    // モードの判定(メモ化)
    const isEditMode = useMemo(() => !!editData, [editData]);
    const isDuplicateMode = useMemo(() => !!duplicateFrom, [duplicateFrom]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
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

    // フォームのリセット処理
    useEffect(() => {
        if (!open) return

        // 編集モード
        if (editData) {
            reset({
                supplier_code: editData.supplier_code,
                company_name: editData.company_name,
                website: editData.website || '',
                notes: editData.notes || '',
                is_active: editData.is_active,
            });
        }

        if (duplicateFrom) {
            reset({
                supplier_code: duplicateFrom.supplier_code,
                company_name: duplicateFrom.company_name,
                website: duplicateFrom.website || '',
                notes: duplicateFrom.notes || '',
                is_active: true,
            });
        }

        // 新規作成モード

        else {
            reset({
                supplier_code: '',
                company_name: '',
                website: '',
                notes: '',
                is_active: true,
            });
        }
    }, [open, editData, duplicateFrom, reset])

    // フォーム送信処理をメモ化
    const onSubmit = useCallback(async (data: SupplierFormData) => {
        setLoading(true);

        try {
            const submitData: SupplierCreateData | SupplierUpdateData = {
                ...data,
                website: data.website || undefined,
                notes: data.notes || undefined,
            };

            if (isEditMode && editData) {
                await supplierApi.updateSupplier(editData.id, submitData);
                toast.success('仕入先情報を更新しました')
            } else {
                await supplierApi.createSupplier(submitData as SupplierCreateData);
                toast.success('新規仕入先を作成しました')
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Form Submit Error: ', error);

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
                    toast.error(isEditMode ? '仕入先の更新に失敗しました' : '仕入先の作成に失敗しました');
                }
            } else {
                toast.error(isEditMode ? '仕入先の更新に失敗しました' : '仕入先の作成に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [isEditMode, editData, onSuccess, onClose])

    // タイトルをメモ化
    const dialogTitle = useMemo(() => {
        if (isEditMode) return '仕入先編集';
        if (isDuplicateMode) return '仕入先複製';
        return '仕入先新規作成';
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1}}>
                        {dialogTitle}
                    </Box>
                </DialogTitle>
            <DialogContent sx={{ pt: 3, mt: 3 }}>
                    <Grid container spacing={3}>
                        {/* モード説明 */}
                        {isDuplicateMode && (
                            <Grid item xs={12}>
                                <Alert severity="info">
                                    既存の仕入先情報を複製して新しい仕入先を作成します。
                                </Alert>
                            </Grid>
                        )}

                        {/* 基本情報 */}
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
                                        基本情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 仕入先コード */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="仕入先コード *"
                                error={!!errors.supplier_code}
                                helperText={errors.supplier_code?.message || (isDuplicateMode ? '新しいコードを入力してください' : '')}
                                {...register('supplier_code', {
                                    required: '仕入先コードは必須です',
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
const SupplierFormModal = React.memo(SupplierFormModalComponent);

export default SupplierFormModal;
export { SupplierFormModal };