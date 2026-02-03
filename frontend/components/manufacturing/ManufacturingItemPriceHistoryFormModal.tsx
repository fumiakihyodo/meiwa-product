// components/manufacturing/ManufacturingItemPriceHistoryFormModal.tsx
'use client';

import React, { useEffect, useRef, KeyboardEvent } from 'react';
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
} from '@mui/icons-material';
import { ManufacturingItem, ManufacturingItemPriceHistory, ManufacturingItemPriceHistoryCreateData, ManufacturingItemPriceHistoryUpdateData, manufacturingItemPriceHistoryApi } from '@/services/apiManufacturing';
import toast from 'react-hot-toast';

interface ManufacturingItemPriceHistoryFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    manufacturingItem: ManufacturingItem;
    priceHistory?: ManufacturingItemPriceHistory | null;
}

interface PriceFormData {
    manufacturing_item: number;
    price: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    change_reason?: string;
    notes?: string;
}

export const ManufacturingItemPriceHistoryFormModal: React.FC<ManufacturingItemPriceHistoryFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    manufacturingItem,
    priceHistory,
}) => {
    const isEdit = !!priceHistory;

    // Enterキー遷移用のref
    const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<PriceFormData>({
        defaultValues: {
            manufacturing_item: manufacturingItem.id,
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
                reset({
                    manufacturing_item: priceHistory.manufacturing_item,
                    price: Number(priceHistory.price),
                    start_date: priceHistory.start_date,
                    end_date: priceHistory.end_date || '',
                    is_active: priceHistory.is_active,
                    change_reason: priceHistory.change_reason || '',
                    notes: priceHistory.notes || '',
                });
            } else {
                reset({
                    manufacturing_item: manufacturingItem.id,
                    price: 0,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: '',
                    is_active: true,
                    change_reason: '',
                    notes: '',
                });
            }
        }
    }, [open, isEdit, priceHistory, manufacturingItem.id, reset]);

    // Enterキーで次の入力項目へ移動
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, currentIndex: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const nextIndex = currentIndex + 1;
            if (nextIndex < inputRefs.current.length) {
                inputRefs.current[nextIndex]?.focus();
            }
        }
    };

    // inputRef登録用のヘルパー
    const setInputRef = (index: number) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        inputRefs.current[index] = el;
    };

    const onSubmit = async (data: PriceFormData) => {
        try {
            console.log('[ManufacturingItemPriceHistoryFormModal] Submit started');
            console.log('[ManufacturingItemPriceHistoryFormModal] Form data:', data);

            const submitData: ManufacturingItemPriceHistoryCreateData | ManufacturingItemPriceHistoryUpdateData = {
                manufacturing_item: data.manufacturing_item,
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

            console.log('[ManufacturingItemPriceHistoryFormModal] Final submit data:', submitData);

            if (isEdit && priceHistory) {
                console.log('[ManufacturingItemPriceHistoryFormModal] Updating price history:', priceHistory.id);
                await manufacturingItemPriceHistoryApi.updatePriceHistory(priceHistory.id, submitData);
                toast.success('価格履歴を更新しました');
            } else {
                console.log('[ManufacturingItemPriceHistoryFormModal] Creating new price history');
                const result = await manufacturingItemPriceHistoryApi.createPriceHistory(submitData as ManufacturingItemPriceHistoryCreateData);
                console.log('[ManufacturingItemPriceHistoryFormModal] Create result:', result);
                toast.success('価格履歴を作成しました');
            }

            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error('[ManufacturingItemPriceHistoryFormModal] Submit error:', error);

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as {
                    response?: {
                        data?: {
                            detail?: string;
                            [key: string]: unknown;
                        }
                    }
                };

                console.error('[ManufacturingItemPriceHistoryFormModal] Error response:', axiosError.response?.data);

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
                sx: {
                    borderRadius: 1,
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2,
            }}>
                <Typography variant="h5" fontWeight="bold">
                    {isEdit ? '価格履歴編集' : '価格履歴新規登録'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {manufacturingItem.manufacturing_name} ({manufacturingItem.manufacturing_number})
                </Typography>
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
                                onKeyDown={(e) => handleKeyDown(e, 0)}
                                inputRef={setInputRef(0)}
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
                                onKeyDown={(e) => handleKeyDown(e, 1)}
                                inputRef={setInputRef(1)}
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
                                onKeyDown={(e) => handleKeyDown(e, 2)}
                                inputRef={setInputRef(2)}
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
                                inputRef={setInputRef(3)}
                                {...register('change_reason')}
                            />
                        </Grid>

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="備考"
                                placeholder="その他の特記事項があれば入力してください"
                                inputRef={setInputRef(4)}
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

                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                        disabled={isSubmitting}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        {isSubmitting ? '保存中...' : '保存'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
