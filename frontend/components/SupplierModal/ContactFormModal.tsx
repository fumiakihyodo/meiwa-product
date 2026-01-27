// components/ContactFormModal.tsx
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
    Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { SupplierBranch, SupplierContact, SupplierContactCreateData, SupplierContactUpdateData, ContactResponsibility } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';

interface ContactFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: SupplierContact | null;
    duplicateFrom?: SupplierContact | null;
    branchId?: number;
}

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

const ContactFormModalComponent: React.FC<ContactFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    editData,
    duplicateFrom,
    branchId,
}) => {
    const [branches, setBranches] = useState<SupplierBranch[]>([]);
    const [loading, setLoading] = useState(false);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<SupplierBranch | null>(null);

    // モードの判定（メモ化）
    const isEditMode = useMemo(() => !!editData, [editData]);
    const isDuplicateMode = useMemo(() => !!duplicateFrom, [duplicateFrom]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<ContactFormData>({
        defaultValues: {
            branch: branchId || 0,
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

    // 拠点一覧の取得をメモ化
    const fetchBranches = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const data = await supplierApi.getSupplierBranches({ is_active: 'true' });
            setBranches(data);
        } catch (error) {
            console.error(error);
            toast.error('拠点一覧の取得に失敗しました');
        } finally {
            setBranchesLoading(false);
        }
    }, []);

    // 拠点詳細の取得
    const fetchBranchById = useCallback(async (id: number) => {
        try {
            const data = await supplierApi.getSupplierBranch(id);
            setSelectedBranch(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    // モーダルが開いた時のみデータを取得
    useEffect(() => {
        if (open) {
            fetchBranches();
        }
    }, [open, fetchBranches]);

    // フォームのリセット処理
    useEffect(() => {
        if (!open) return;

        // 編集モード
        if (editData) {
            fetchBranchById(editData.branch);
            reset({
                branch: editData.branch,
                name: editData.name,
                name_kana: editData.name_kana || '',
                department: editData.department || '',
                position: editData.position || '',
                email: editData.email || '',
                phone_number: editData.phone_number || '',
                mobile_number: editData.mobile_number || '',
                extension_number: editData.extension_number || '',
                responsibility: editData.responsibility,
                responsibility_detail: editData.responsibility_detail || '',
                is_primary: editData.is_primary,
                is_active: editData.is_active,
                notes: editData.notes || '',
            });
        }
        // 複製モード
        else if (duplicateFrom) {
            fetchBranchById(duplicateFrom.branch);
            reset({
                branch: duplicateFrom.branch,
                name: `${duplicateFrom.name} (コピー)`,
                name_kana: duplicateFrom.name_kana || '',
                department: duplicateFrom.department || '',
                position: duplicateFrom.position || '',
                email: '',
                phone_number: duplicateFrom.phone_number || '',
                mobile_number: duplicateFrom.mobile_number || '',
                extension_number: duplicateFrom.extension_number || '',
                responsibility: duplicateFrom.responsibility,
                responsibility_detail: duplicateFrom.responsibility_detail || '',
                is_primary: false,
                is_active: true,
                notes: duplicateFrom.notes || '',
            });
        }
        // 新規作成モード
        else {
            setSelectedBranch(null);
            if (branchId) {
                fetchBranchById(branchId);
            }
            reset({
                branch: branchId || 0,
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
            });
        }
    }, [open, editData, duplicateFrom, branchId, reset, fetchBranchById]);

    // フォーム送信処理をメモ化
    const onSubmit = useCallback(async (data: ContactFormData) => {
        // メールアドレスまたは電話番号のいずれかが必須
        if (!data.email && !data.phone_number && !data.mobile_number) {
            toast.error('メールアドレスまたは電話番号のいずれかは必須です');
            return;
        }

        setLoading(true);

        try {
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

            if (isEditMode && editData) {
                await supplierApi.updateSupplierContact(editData.id, submitData);
                toast.success('担当者を更新しました');
            } else {
                await supplierApi.createSupplierContact(submitData as SupplierContactCreateData);
                toast.success(isDuplicateMode ? '担当者を複製しました' : '担当者を作成しました');
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
                    toast.error(isEditMode ? '担当者の更新に失敗しました' : '担当者の作成に失敗しました');
                }
            } else {
                toast.error(isEditMode ? '担当者の更新に失敗しました' : '担当者の作成に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [isEditMode, isDuplicateMode, editData, onSuccess, onClose]);

    // タイトルをメモ化
    const dialogTitle = useMemo(() => {
        if (isEditMode) return '担当者編集';
        if (isDuplicateMode) return '担当者複製';
        return '担当者新規作成';
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
                                    既存の担当者情報を複製して新しい担当者を作成します。
                                </Alert>
                            </Grid>
                        )}

                        {/* 所属情報 */}
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
                                        所属情報
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* 拠点選択 */}
                        <Grid item xs={12}>
                            <Controller
                                name="branch"
                                control={control}
                                rules={{ required: '拠点は必須です', min: { value: 1, message: '拠点を選択してください' } }}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={branches}
                                        getOptionLabel={(option) =>
                                            typeof option === 'number'
                                                ? branches.find(b => b.id === option)?.branch_name || ''
                                                : option.display_name || `${option.branch_name} (${option.branch_code})`
                                        }
                                        loading={branchesLoading}
                                        value={selectedBranch}
                                        onChange={(_, newValue) => {
                                            setSelectedBranch(newValue);
                                            field.onChange(newValue?.id || 0);
                                        }}
                                        disabled={isEditMode}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="所属拠点 *"
                                                error={!!errors.branch}
                                                helperText={errors.branch?.message}
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
                                InputLabelProps={{ shrink: true }}
                                {...register('name_kana')}
                            />
                        </Grid>

                        {/* 部署 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="部署"
                                InputLabelProps={{ shrink: true }}
                                {...register('department')}
                            />
                        </Grid>

                        {/* 役職 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="役職"
                                InputLabelProps={{ shrink: true }}
                                {...register('position')}
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
                                <Typography variant="caption" color="text.secondary">
                                    ※ メールアドレス、電話番号、携帯電話番号のいずれか1つ以上は必須です
                                </Typography>
                            </Box>
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
                                InputLabelProps={{ shrink: true }}
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
                                InputLabelProps={{ shrink: true }}
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
                                InputLabelProps={{ shrink: true }}
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
                                InputLabelProps={{ shrink: true }}
                                {...register('mobile_number', {
                                    pattern: {
                                        value: /^[0-9\-\+\(\)]+$/,
                                        message: '電話番号の形式が正しくありません'
                                    }
                                })}
                            />
                        </Grid>

                        {/* 担当業務 */}
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
                                        担当業務
                                    </Box>
                                </Box>
                            </Box>
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
                                InputLabelProps={{ shrink: true }}
                                {...register('responsibility_detail')}
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

                        {/* ステータス */}
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
                                        ステータス
                                    </Box>
                                </Box>
                            </Box>
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
const ContactFormModal = React.memo(ContactFormModalComponent);

export default ContactFormModal;
export { ContactFormModal };