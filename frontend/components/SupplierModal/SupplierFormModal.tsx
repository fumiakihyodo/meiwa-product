// components/SupplierModal/SupplierFormModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Supplier, SupplierCreateData, SupplierUpdateData, OverseasSupplierCreateData, SupplierBranch, SupplierContact } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface SupplierFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: Supplier | null;
    duplicateFrom?: Supplier | null;
}

interface SupplierFormData {
    supplier_type: 'domestic' | 'overseas';
    supplier_code: string;
    company_name: string;
    website?: string;
    notes?: string;
    is_active: boolean;
    // 海外サプライヤー用フィールド
    address?: string;
    postal_code?: string;
    phone_number?: string;
    email?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    contact_department?: string;
    contact_position?: string;
}

const SupplierFormModalComponent: React.FC<SupplierFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    editData,
    duplicateFrom,
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const [branchData, setBranchData] = useState<SupplierBranch | null>(null);
    const [contactData, setContactData] = useState<SupplierContact | null>(null);

    // モードの判定(メモ化)
    const isEditMode = useMemo(() => !!editData, [editData]);
    const isDuplicateMode = useMemo(() => !!duplicateFrom, [duplicateFrom]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        watch,
    } = useForm<SupplierFormData>({
        defaultValues: {
            supplier_type: 'domestic',
            supplier_code: '',
            company_name: '',
            website: '',
            notes: '',
            is_active: true,
            address: '',
            postal_code: '',
            phone_number: '',
            email: '',
            contact_name: '',
            contact_email: '',
            contact_phone: '',
            contact_department: '',
            contact_position: '',
        },
    });

    // Watch supplier_type to toggle form
    const supplierType = watch('supplier_type');

    // 編集モード時に海外サプライヤーの拠点・担当者情報を取得
    useEffect(() => {
        if (!open || !editData) return;

        const isOverseas = editData.notes?.includes('[OVERSEAS]') || false;
        if (!isOverseas) return;

        // 海外サプライヤーの場合、拠点と担当者情報を取得
        const fetchOverseasData = async () => {
            try {
                // 拠点情報を取得（海外サプライヤーは1拠点のみ）
                const branches = await supplierApi.getSupplierBranches({ supplier: editData.id });
                if (branches.length > 0) {
                    const branch = branches[0];
                    setBranchData(branch);

                    // 担当者情報を取得（主担当者）
                    const contacts = await supplierApi.getSupplierContacts({
                        branch: branch.id,
                        is_primary: 'true'
                    });
                    if (contacts.length > 0) {
                        setContactData(contacts[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch overseas supplier data:', error);
            }
        };

        fetchOverseasData();
    }, [open, editData]);

    // フォームのリセット処理
    useEffect(() => {
        if (!open) return

        // 編集モード
        if (editData) {
            const isOverseas = editData.notes?.includes('[OVERSEAS]') || false;
            reset({
                supplier_type: isOverseas ? 'overseas' : 'domestic',
                supplier_code: editData.supplier_code,
                company_name: editData.company_name,
                website: editData.website || '',
                notes: editData.notes?.replace('[OVERSEAS]\n', '').replace('[OVERSEAS]', '') || '',
                is_active: editData.is_active,
                // 海外サプライヤーの場合、拠点・担当者情報もセット
                address: branchData?.address || '',
                postal_code: branchData?.postal_code || '',
                phone_number: branchData?.phone_number || '',
                email: branchData?.email || '',
                contact_name: contactData?.name || '',
                contact_email: contactData?.email || '',
                contact_phone: contactData?.phone_number || '',
                contact_department: contactData?.department || '',
                contact_position: contactData?.position || '',
            });
        } else if (duplicateFrom) {
            const isOverseas = duplicateFrom.notes?.includes('[OVERSEAS]') || false;
            reset({
                supplier_type: isOverseas ? 'overseas' : 'domestic',
                supplier_code: '',
                company_name: duplicateFrom.company_name,
                website: duplicateFrom.website || '',
                notes: duplicateFrom.notes?.replace('[OVERSEAS]\n', '').replace('[OVERSEAS]', '') || '',
                is_active: true,
            });
        } else {
            // 新規作成モード
            reset({
                supplier_type: 'domestic',
                supplier_code: '',
                company_name: '',
                website: '',
                notes: '',
                is_active: true,
                address: '',
                postal_code: '',
                phone_number: '',
                email: '',
                contact_name: '',
                contact_email: '',
                contact_phone: '',
                contact_department: '',
                contact_position: '',
            });
        }
    }, [open, editData, duplicateFrom, reset, branchData, contactData])

    // フォーム送信処理をメモ化
    const onSubmit = useCallback(async (data: SupplierFormData) => {
        setLoading(true);

        try {
            if (data.supplier_type === 'overseas') {
                // 海外サプライヤーの場合
                if (isEditMode && editData) {
                    // 編集モード：サプライヤー本体、拠点、担当者を個別に更新
                    const supplierUpdateData: SupplierUpdateData = {
                        supplier_code: data.supplier_code,
                        company_name: data.company_name,
                        website: data.website || undefined,
                        notes: data.notes ? `[OVERSEAS]\n${data.notes}` : '[OVERSEAS]',
                        is_active: data.is_active,
                    };
                    await supplierApi.updateSupplier(editData.id, supplierUpdateData);

                    // 拠点情報を更新
                    if (branchData) {
                        const branchUpdateData = {
                            address: data.address,
                            postal_code: data.postal_code || undefined,
                            phone_number: data.phone_number || undefined,
                            email: data.email || undefined,
                        };
                        await supplierApi.updateSupplierBranch(branchData.id, branchUpdateData);
                    }

                    // 担当者情報を更新
                    if (contactData) {
                        const contactUpdateData = {
                            name: data.contact_name || '',
                            email: data.contact_email || undefined,
                            phone_number: data.contact_phone || undefined,
                            department: data.contact_department || undefined,
                            position: data.contact_position || undefined,
                        };
                        await supplierApi.updateSupplierContact(contactData.id, contactUpdateData);
                    }

                    toast.success('海外サプライヤー情報を更新しました');
                } else {
                    // 新規作成モード
                    const overseasData: OverseasSupplierCreateData = {
                        supplier_code: data.supplier_code,
                        company_name: data.company_name,
                        website: data.website || undefined,
                        address: data.address!,
                        postal_code: data.postal_code || undefined,
                        phone_number: data.phone_number || undefined,
                        email: data.email || undefined,
                        contact_name: data.contact_name!,
                        contact_email: data.contact_email || undefined,
                        contact_phone: data.contact_phone || undefined,
                        contact_department: data.contact_department || undefined,
                        contact_position: data.contact_position || undefined,
                        notes: data.notes || undefined,
                        is_active: data.is_active,
                    };

                    await supplierApi.createOverseasSupplier(overseasData);
                    toast.success('海外サプライヤーを作成しました');
                }
            } else {
                // 国内サプライヤーの場合
                const submitData: SupplierCreateData | SupplierUpdateData = {
                    supplier_code: data.supplier_code,
                    company_name: data.company_name,
                    website: data.website || undefined,
                    notes: data.notes || undefined,
                    is_active: data.is_active,
                };

                if (isEditMode && editData) {
                    await supplierApi.updateSupplier(editData.id, submitData);
                    toast.success('仕入先情報を更新しました');
                } else {
                    await supplierApi.createSupplier(submitData as SupplierCreateData);
                    toast.success('新規仕入先を作成しました');
                }
            }

            onSuccess();
            router.refresh();
            onClose();
        } catch (error) {
            console.error('Form Submit Error: ', error);

            if (error && typeof error === 'object' && 'response' in error) {
                const errorResponse = error as { response?: { data?: any; status?: number } };
                const status = errorResponse.response?.status;
                const errorData = errorResponse.response?.data;

                // エラーの詳細をコンソールに出力
                console.error('Error details:', {
                    status,
                    data: errorData,
                    formData: data
                });

                if (errorData) {
                    let errorMessage = '';

                    // バックエンドからの構造化されたエラーメッセージを処理
                    if (typeof errorData === 'object') {
                        // エラーメッセージが error フィールドに含まれている場合
                        if (errorData.error) {
                            errorMessage = errorData.error;
                        }
                        // バリデーションエラーの場合（フィールドごとのエラー）
                        else if (errorData.supplier_code || errorData.company_name || errorData.address ||
                                 errorData.contact_name || errorData.contact_email || errorData.contact_phone ||
                                 errorData.non_field_errors) {
                            const errors = [];

                            // 各フィールドのエラーを収集
                            for (const [key, value] of Object.entries(errorData)) {
                                const fieldName = key === 'non_field_errors' ? '' : `${key}: `;
                                const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
                                errors.push(`${fieldName}${valueStr}`);
                            }

                            errorMessage = errors.join('\n');
                        }
                        // その他の構造化エラー
                        else {
                            errorMessage = Object.entries(errorData)
                                .map(([key, value]) => {
                                    const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
                                    return `${key}: ${valueStr}`;
                                })
                                .join('\n');
                        }
                    } else {
                        errorMessage = String(errorData);
                    }

                    // エラーステータスに応じたメッセージ
                    if (status === 400) {
                        toast.error(`入力エラー: ${errorMessage}`, { duration: 5000 });
                    } else if (status === 500) {
                        toast.error(`サーバーエラー: ${errorMessage}`, { duration: 5000 });
                    } else {
                        toast.error(`エラー: ${errorMessage}`, { duration: 5000 });
                    }
                } else {
                    toast.error(isEditMode ? '仕入先の更新に失敗しました' : '仕入先の作成に失敗しました');
                }
            } else {
                toast.error(isEditMode ? '仕入先の更新に失敗しました' : '仕入先の作成に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [isEditMode, editData, onSuccess, onClose, router, branchData, contactData])

    // タイトルをメモ化
    const dialogTitle = useMemo(() => {
        if (isEditMode) return '仕入先編集';
        if (isDuplicateMode) return '仕入先複製';
        return '仕入先新規作成';
    }, [isEditMode, isDuplicateMode]);

    // Enterキーで次のフィールドにフォーカス移動
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const form = e.currentTarget.form;
            if (!form) return;

            const formElements = Array.from(form.elements) as HTMLElement[];
            const currentIndex = formElements.indexOf(e.target as HTMLElement);
            const nextElement = formElements[currentIndex + 1];

            if (nextElement && (nextElement as HTMLInputElement).focus) {
                (nextElement as HTMLInputElement).focus();
            }
        }
    };

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

                        {/* サプライヤー種別選択（新規作成時のみ） */}
                        {!isEditMode && (
                            <Grid item xs={12}>
                                <FormControl component="fieldset">
                                    <FormLabel component="legend">サプライヤー種別 *</FormLabel>
                                    <Controller
                                        name="supplier_type"
                                        control={control}
                                        render={({ field }) => (
                                            <RadioGroup {...field} row>
                                                <FormControlLabel value="domestic" control={<Radio />} label="国内" />
                                                <FormControlLabel value="overseas" control={<Radio />} label="海外" />
                                            </RadioGroup>
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                        )}

                        {/* 基本情報 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 2 }}>
                                    基本情報
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
                                onKeyDown={handleKeyDown}
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
                                onKeyDown={handleKeyDown}
                            />
                        </Grid>

                        {/* ウェブサイト（国内サプライヤーのみ） */}
                        {supplierType === 'domestic' && (
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
                                    onKeyDown={handleKeyDown}
                                />
                            </Grid>
                        )}

                        {/* 海外サプライヤー用の追加フィールド */}
                        {supplierType === 'overseas' && (
                            <>
                                {/* 取り扱い部品セクション */}
                                <Grid item xs={12}>
                                    <Box sx={{ mb: 2, mt: 2 }}>
                                        <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 2 }}>
                                            取り扱い部品（Handling Parts）
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* 住所 */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="住所 *"
                                        multiline
                                        rows={2}
                                        error={!!errors.address}
                                        helperText={errors.address?.message}
                                        InputLabelProps={{ shrink: true }}
                                        {...register('address', {
                                            required: supplierType === 'overseas' ? '住所は必須です' : false,
                                        })}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 電話番号 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="電話番号"
                                        placeholder="+1-XXX-XXX-XXXX"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('phone_number')}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* メールアドレス */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="メールアドレス"
                                        type="email"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('email')}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 担当者情報セクション */}
                                <Grid item xs={12}>
                                    <Box sx={{ mb: 2, mt: 2 }}>
                                        <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 2 }}>
                                            担当者情報
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* 担当者名 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="担当者名 *"
                                        error={!!errors.contact_name}
                                        helperText={errors.contact_name?.message}
                                        InputLabelProps={{ shrink: true }}
                                        {...register('contact_name', {
                                            required: supplierType === 'overseas' ? '担当者名は必須です' : false,
                                        })}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 部署 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="部署"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('contact_department')}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 役職 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="役職"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('contact_position')}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 担当者メール */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="担当者メール"
                                        type="email"
                                        error={!!errors.contact_email}
                                        helperText={errors.contact_email?.message || '※メールまたは電話番号のいずれかは必須'}
                                        InputLabelProps={{ shrink: true }}
                                        {...register('contact_email', {
                                            validate: (value) => {
                                                const contactPhone = watch('contact_phone');
                                                if (!value && !contactPhone) {
                                                    return 'メールまたは電話番号のいずれかは必須です';
                                                }
                                                return true;
                                            }
                                        })}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>

                                {/* 担当者電話 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="担当者電話"
                                        error={!!errors.contact_phone}
                                        helperText={errors.contact_phone?.message || '※メールまたは電話番号のいずれかは必須'}
                                        InputLabelProps={{ shrink: true }}
                                        {...register('contact_phone', {
                                            validate: (value) => {
                                                const contactEmail = watch('contact_email');
                                                if (!value && !contactEmail) {
                                                    return 'メールまたは電話番号のいずれかは必須です';
                                                }
                                                return true;
                                            }
                                        })}
                                        onKeyDown={handleKeyDown}
                                    />
                                </Grid>
                            </>
                        )}

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 2, mt: 2 }}>
                                <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem', mb: 2 }}>
                                    備考
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
                                onKeyDown={(e) => {
                                    // multilineの場合はShift+Enterで改行、Enterのみでフォーカス移動
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleKeyDown(e);
                                    }
                                }}
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