// components/SuppliedItemModal/SuppliedItemPriceHistoryFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    IconButton,
    FormControlLabel,
    Switch,
    Typography,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Close as CloseIcon,
    Save as SaveIcon,
    Upload as UploadIcon,
    Delete as DeleteIcon,
    AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { SuppliedItem, SuppliedItemPriceHistory, SuppliedItemPriceHistoryCreateData, SuppliedItemPriceHistoryUpdateData } from '@/types/purchases';
import { purchasesApi } from '@/services/apiPurchases';
import toast from 'react-hot-toast';

interface SuppliedItemPriceHistoryFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    suppliedItem: SuppliedItem;
    priceHistory?: SuppliedItemPriceHistory | null;
}

interface PriceFormData {
    supplied_item: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    change_reason?: string;
    notes?: string;
}

export const SuppliedItemPriceHistoryFormModal: React.FC<SuppliedItemPriceHistoryFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    suppliedItem,
    priceHistory,
}) => {
    const isEdit = !!priceHistory;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [existingFileName, setExistingFileName] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<PriceFormData>({
        defaultValues: {
            supplied_item: suppliedItem.id,
            price: 0,
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            is_active: true,
            change_reason: '',
            notes: '',
        },
    });

    // 編集時のデータ読み込み
    useEffect(() => {
        if (open) {
            if (isEdit && priceHistory) {
                setExistingFileName(priceHistory.quote_file_name || null);
                reset({
                    supplied_item: priceHistory.supplied_item,
                    price: Number(priceHistory.price),
                    start_date: priceHistory.start_date,
                    end_date: priceHistory.end_date || '',
                    is_active: priceHistory.is_active,
                    change_reason: priceHistory.change_reason || '',
                    notes: priceHistory.notes || '',
                });
            } else {
                reset({
                    supplied_item: suppliedItem.id,
                    price: 0,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: '',
                    is_active: true,
                    change_reason: '',
                    notes: '',
                });
                setExistingFileName(null);
            }
            setSelectedFile(null);
        }
    }, [open, isEdit, priceHistory, suppliedItem.id, reset]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // ファイルサイズチェック（10MB）
            if (file.size > 10 * 1024 * 1024) {
                toast.error('ファイルサイズは10MB以下にしてください');
                event.target.value = '';
                return;
            }

            console.log('[SuppliedItemPriceHistoryFormModal] File selected:', {
                name: file.name,
                size: file.size,
                type: file.type,
            });

            setSelectedFile(file);
            toast.success(`${file.name} を選択しました`);
        }
    };

    const handleRemoveFile = () => {
        console.log('[SuppliedItemPriceHistoryFormModal] Removing file');
        setSelectedFile(null);

        const fileInput = document.getElementById('supplied-item-quote-file-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const onSubmit = async (data: PriceFormData) => {
        try {
            console.log('[SuppliedItemPriceHistoryFormModal] Submit started');
            console.log('[SuppliedItemPriceHistoryFormModal] Form data:', data);
            console.log('[SuppliedItemPriceHistoryFormModal] Selected file:', selectedFile);

            const submitData: SuppliedItemPriceHistoryCreateData | SuppliedItemPriceHistoryUpdateData = {
                supplied_item: data.supplied_item,
                price: Number(data.price),
                start_date: data.start_date,
                is_active: data.is_active,
            };

            if (data.end_date) {
                submitData.end_date = data.end_date;
            }

            if (data.change_reason) {
                submitData.change_reason = data.change_reason;
            }

            if (data.notes) {
                submitData.notes = data.notes;
            }

            if (selectedFile) {
                console.log('[SuppliedItemPriceHistoryFormModal] Adding file to submit data:', {
                    name: selectedFile.name,
                    size: selectedFile.size,
                    type: selectedFile.type,
                });
                submitData.quote_file = selectedFile;
            }

            console.log('[SuppliedItemPriceHistoryFormModal] Final submit data:', {
                ...submitData,
                quote_file: selectedFile ? `File: ${selectedFile.name}` : 'No file',
            });

            if (isEdit && priceHistory) {
                console.log('[SuppliedItemPriceHistoryFormModal] Updating price history:', priceHistory.id);
                await purchasesApi.updateSuppliedItemPriceHistory(priceHistory.id, submitData);
                toast.success('価格履歴を更新しました');
            } else {
                console.log('[SuppliedItemPriceHistoryFormModal] Creating new price history');
                const result = await purchasesApi.createSuppliedItemPriceHistory(submitData as SuppliedItemPriceHistoryCreateData);
                console.log('[SuppliedItemPriceHistoryFormModal] Create result:', result);
                toast.success('価格履歴を作成しました');
            }

            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error('[SuppliedItemPriceHistoryFormModal] Submit error:', error);

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as {
                    response?: {
                        data?: {
                            detail?: string;
                            [key: string]: unknown;
                        }
                    }
                };

                console.error('[SuppliedItemPriceHistoryFormModal] Error response:', axiosError.response?.data);

                const errorData = axiosError.response?.data;
                let message = isEdit ? '価格履歴の更新に失敗しました' : '価格履歴の作成に失敗しました';

                if (errorData?.detail) {
                    message = errorData.detail as string;
                } else if (errorData) {
                    const errorMessages = Object.entries(errorData)
                        .filter(([key]) => key !== 'detail')
                        .map(([key, value]) => {
                            if (Array.isArray(value)) {
                                return `${key}: ${value.join(', ')}`;
                            }
                            return `${key}: ${value}`;
                        });

                    if (errorMessages.length > 0) {
                        message = errorMessages.join('\n');
                    }
                }

                toast.error(message);
            } else {
                toast.error(isEdit ? '価格履歴の更新に失敗しました' : '価格履歴の作成に失敗しました');
            }
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6">
                            {isEdit ? '価格履歴編集' : '価格履歴新規登録'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {suppliedItem.item_name} ({suppliedItem.item_number})
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} disabled={isSubmitting}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent dividers>
                    <Grid container spacing={3}>
                        {/* 単価 */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="単価（税抜） *"
                                error={!!errors.price}
                                helperText={errors.price?.message}
                                inputProps={{
                                    min: 0,
                                    step: 0.01
                                }}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
                                }}
                                {...register('price', {
                                    required: '単価は必須です',
                                    valueAsNumber: true,
                                    min: {
                                        value: 0.01,
                                        message: '単価は0より大きい値を入力してください'
                                    }
                                })}
                            />
                        </Grid>

                        {/* 開始日 */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="開始日 *"
                                InputLabelProps={{ shrink: true }}
                                error={!!errors.start_date}
                                helperText={errors.start_date?.message}
                                {...register('start_date', {
                                    required: '開始日は必須です',
                                })}
                            />
                        </Grid>

                        {/* 終了日 */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="終了日"
                                InputLabelProps={{ shrink: true }}
                                helperText="未指定の場合は無期限"
                                error={!!errors.end_date}
                                {...register('end_date', {
                                    validate: (value) => {
                                        if (!value) return true;
                                        const startDate = watch('start_date');
                                        if (new Date(value) < new Date(startDate)) {
                                            return '終了日は開始日以降の日付を指定してください';
                                        }
                                        return true;
                                    }
                                })}
                            />
                        </Grid>

                        {/* 有効フラグ */}
                        <Grid item xs={12} md={6}>
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
                            <Typography variant="caption" color="text.secondary" display="block">
                                無効にすると、この価格は適用されなくなります
                            </Typography>
                        </Grid>

                        {/* 変更理由 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="変更理由"
                                placeholder="例: 原材料費の高騰により価格改定"
                                {...register('change_reason')}
                            />
                        </Grid>

                        {/* 見積書ファイル */}
                        <Grid item xs={12}>
                            <Typography variant="body2" gutterBottom fontWeight="medium">
                                見積書ファイル
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<UploadIcon />}
                                        size="small"
                                    >
                                        ファイルを選択
                                        <input
                                            id="supplied-item-quote-file-input"
                                            type="file"
                                            hidden
                                            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                        />
                                    </Button>

                                    {selectedFile && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1,
                                                bgcolor: 'action.hover',
                                                borderRadius: 1,
                                                flex: 1,
                                            }}
                                        >
                                            <AttachFileIcon fontSize="small" color="primary" />
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {selectedFile.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={handleRemoveFile}
                                                color="error"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>

                                {!selectedFile && existingFileName && (
                                    <Alert severity="info" sx={{ py: 0.5 }}>
                                        <Typography variant="body2">
                                            現在のファイル: <strong>{existingFileName}</strong>
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            新しいファイルを選択すると置き換えられます
                                        </Typography>
                                    </Alert>
                                )}

                                <Typography variant="caption" color="text.secondary">
                                    PDF, Excel, Word, 画像ファイル（最大10MB）
                                </Typography>
                            </Box>
                        </Grid>

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="備考"
                                placeholder="その他の特記事項があれば入力してください"
                                {...register('notes')}
                            />
                        </Grid>

                        {/* 注意事項 */}
                        {!isEdit && (
                            <Grid item xs={12}>
                                <Alert severity="info">
                                    <Typography variant="body2" gutterBottom fontWeight="medium">
                                        価格登録時の注意事項:
                                    </Typography>
                                    <Box component="ul" sx={{ margin: 0, paddingLeft: 2.5 }}>
                                        <li>
                                            <Typography variant="body2">
                                                開始日以降、この価格が有効になります
                                            </Typography>
                                        </li>
                                        <li>
                                            <Typography variant="body2">
                                                終了日を指定しない場合は無期限となります
                                            </Typography>
                                        </li>
                                        <li>
                                            <Typography variant="body2">
                                                同じ期間に複数の有効な価格を設定すると警告が表示されます
                                            </Typography>
                                        </li>
                                    </Box>
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '保存中...' : '保存'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
