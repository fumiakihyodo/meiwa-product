// components/SuppliedItemModal/SuppliedItemDetailModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Typography,
    Box,
    CircularProgress,
    Chip,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { SuppliedItem } from '@/types/purchases';
import { purchasesApi } from '@/services/apiPurchases';
import toast from 'react-hot-toast';
import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';

interface SuppliedItemDetailModalProps {
    open: boolean;
    onClose: () => void;
    suppliedItemId: number | null;
    onSuccess?: () => void;
    onSwitchToPriceList?: (suppliedItem: SuppliedItem) => void;
    onDuplicate?: (suppliedItem: SuppliedItem) => void;
    initialEditMode?: boolean;
}

export const SuppliedItemDetailModal: React.FC<SuppliedItemDetailModalProps> = ({
    open,
    onClose,
    suppliedItemId,
    onSuccess,
    onSwitchToPriceList,
    onDuplicate,
    initialEditMode = false,
}) => {
    const [suppliedItem, setSuppliedItem] = useState<SuppliedItem | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchSuppliedItemDetails = useCallback(async () => {
        if (!suppliedItemId) return;

        setLoading(true);
        try {
            const data = await purchasesApi.getSuppliedItem(suppliedItemId);
            setSuppliedItem(data);
        } catch (error) {
            console.error('SuppliedItem fetch error:', error);
            toast.error('支給品詳細の取得に失敗しました');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [suppliedItemId, onClose]);

    useEffect(() => {
        if (open && suppliedItemId) {
            fetchSuppliedItemDetails();
        } else if (!open) {
            setSuppliedItem(null);
        }
    }, [open, suppliedItemId, fetchSuppliedItemDetails]);

    const handlePriceHistory = useCallback(() => {
        if (suppliedItem && onSwitchToPriceList) {
            onSwitchToPriceList(suppliedItem);
        }
    }, [suppliedItem, onSwitchToPriceList]);

    const handleDuplicate = useCallback(() => {
        if (suppliedItem && onDuplicate) {
            onDuplicate(suppliedItem);
        }
    }, [suppliedItem, onDuplicate]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                支給品詳細
                {suppliedItem && (
                    <Chip
                        label={suppliedItem.is_active ? '有効' : '無効'}
                        color={suppliedItem.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{ ml: 2 }}
                    />
                )}
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : suppliedItem ? (
                    <Grid container spacing={3}>
                        {/* 基本情報 */}
                        <Grid item xs={12}>
                            <SectionCard title="基本情報">
                                <Grid container spacing={2}>
                                    <InfoRow label="支給品品番" value={suppliedItem.item_number} />
                                    <InfoRow label="支給品名" value={suppliedItem.item_name} />
                                    <InfoRow label="製品品番" value={suppliedItem.product_number} />
                                    <InfoRow label="製品名" value={suppliedItem.product_name} />
                                    <InfoRow label="顧客" value={suppliedItem.customer_name} />
                                    <InfoRow label="顧客拠点" value={suppliedItem.customer_branch_name} />
                                </Grid>
                            </SectionCard>
                        </Grid>

                        {/* 仕様情報 */}
                        <Grid item xs={12}>
                            <SectionCard title="仕様情報">
                                <Grid container spacing={2}>
                                    <InfoRow label="仕様" value={suppliedItem.specification} fullWidth />
                                    <InfoRow label="単位" value={suppliedItem.unit} />
                                    <InfoRow label="標準数量" value={suppliedItem.standard_quantity} />
                                </Grid>
                            </SectionCard>
                        </Grid>

                        {/* 価格情報 */}
                        <Grid item xs={12}>
                            <SectionCard title="価格情報">
                                <Grid container spacing={2}>
                                    <InfoRow
                                        label="現在単価"
                                        value={
                                            suppliedItem.current_price
                                                ? `¥${suppliedItem.current_price.toLocaleString()}`
                                                : '未設定'
                                        }
                                    />
                                    <InfoRow
                                        label="価格履歴数"
                                        value={`${suppliedItem.price_history_count || 0}件`}
                                    />
                                    {suppliedItem.has_multiple_active_prices && (
                                        <Grid item xs={12}>
                                            <Alert severity="warning">
                                                複数の有効な価格が設定されています
                                            </Alert>
                                        </Grid>
                                    )}
                                </Grid>
                            </SectionCard>
                        </Grid>

                        {/* 備考 */}
                        {suppliedItem.notes && (
                            <Grid item xs={12}>
                                <SectionCard title="備考">
                                    <Typography variant="body2">{suppliedItem.notes}</Typography>
                                </SectionCard>
                            </Grid>
                        )}

                        {/* 作成情報 */}
                        <Grid item xs={12}>
                            <SectionCard title="作成情報">
                                <Grid container spacing={2}>
                                    <InfoRow
                                        label="作成日時"
                                        value={new Date(suppliedItem.created_at).toLocaleString('ja-JP')}
                                    />
                                    <InfoRow label="作成者" value={suppliedItem.created_by_name} />
                                    <InfoRow
                                        label="更新日時"
                                        value={new Date(suppliedItem.updated_at).toLocaleString('ja-JP')}
                                    />
                                </Grid>
                            </SectionCard>
                        </Grid>
                    </Grid>
                ) : (
                    <Typography>支給品情報が見つかりません</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDuplicate} startIcon={<ContentCopyIcon />}>
                    複製
                </Button>
                <Button onClick={handlePriceHistory} startIcon={<HistoryIcon />}>
                    価格履歴
                </Button>
                <Button onClick={onClose} startIcon={<CloseIcon />}>
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
};
