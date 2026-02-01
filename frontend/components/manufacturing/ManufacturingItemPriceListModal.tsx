// components/manufacturing/ManufacturingItemPriceListModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { ManufacturingItem, ManufacturingItemPriceHistory, manufacturingItemPriceHistoryApi } from '@/services/apiManufacturing';
import { ManufacturingItemPriceHistoryFormModal } from './ManufacturingItemPriceHistoryFormModal';
import toast from 'react-hot-toast';

interface ManufacturingItemPriceListModalProps {
    open: boolean;
    onClose: () => void;
    manufacturingItem: ManufacturingItem | null;
    onSwitchToDetail?: (manufacturingItem: ManufacturingItem) => void;
    onSuccess?: () => void;
}

/**
 * 製造品価格履歴一覧モーダル
 * 製造品の価格履歴を一覧表示し、新規追加・編集・削除ができる
 */
export const ManufacturingItemPriceListModal: React.FC<ManufacturingItemPriceListModalProps> = ({
    open,
    onClose,
    manufacturingItem,
    onSwitchToDetail,
    onSuccess,
}) => {
    const [priceHistories, setPriceHistories] = useState<ManufacturingItemPriceHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [priceFormOpen, setPriceFormOpen] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<ManufacturingItemPriceHistory | null>(null);

    // 価格履歴を取得
    const fetchPriceHistories = useCallback(async () => {
        if (!manufacturingItem) return;

        setLoading(true);
        try {
            const data = await manufacturingItemPriceHistoryApi.getPriceHistories({
                manufacturing_item: manufacturingItem.id
            });
            setPriceHistories(data);
        } catch (error) {
            console.error(error);
            toast.error('価格履歴の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [manufacturingItem]);

    useEffect(() => {
        if (open && manufacturingItem) {
            fetchPriceHistories();
        }
    }, [open, manufacturingItem, fetchPriceHistories]);

    // 新規価格追加
    const handleAddPrice = () => {
        setSelectedPrice(null);
        setPriceFormOpen(true);
    };

    // 価格編集
    const handleEditPrice = (price: ManufacturingItemPriceHistory) => {
        setSelectedPrice(price);
        setPriceFormOpen(true);
    };

    // 価格削除
    const handleDeletePrice = async (priceId: number) => {
        if (!confirm('この価格履歴を削除してもよろしいですか?')) {
            return;
        }

        try {
            await manufacturingItemPriceHistoryApi.deletePriceHistory(priceId);
            toast.success('価格履歴を削除しました');
            fetchPriceHistories();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error('価格履歴の削除に失敗しました');
        }
    };

    // 価格フォームモーダルを閉じる
    const handlePriceFormClose = () => {
        setPriceFormOpen(false);
        setSelectedPrice(null);
    };

    // 価格フォーム保存成功時
    const handlePriceFormSuccess = () => {
        setPriceFormOpen(false);
        setSelectedPrice(null);
        fetchPriceHistories();
        if (onSuccess) {
            onSuccess();
        }
    };

    // 詳細モーダルに戻る
    const handleBackToDetail = () => {
        if (manufacturingItem && onSwitchToDetail) {
            onSwitchToDetail(manufacturingItem);
        }
    };

    // ステータスチップを取得
    const getStatusChip = (price: ManufacturingItemPriceHistory) => {
        if (price.is_current) {
            return <Chip label="現在" color="success" size="small" />;
        } else if (price.is_future) {
            return <Chip label="予定" color="info" size="small" />;
        } else if (price.is_expired) {
            return <Chip label="過去" color="default" size="small" />;
        } else if (!price.is_active) {
            return <Chip label="無効" color="error" size="small" />;
        }
        return null;
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { minHeight: '600px' }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {onSwitchToDetail && (
                                <Tooltip title="製造品詳細に戻る">
                                    <IconButton
                                        onClick={handleBackToDetail}
                                        size="small"
                                        sx={{ mr: 1 }}
                                    >
                                        <ArrowBackIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Box>
                                <Typography variant="h6" component="div">
                                    価格履歴
                                </Typography>
                                {manufacturingItem && (
                                    <Typography variant="body2" color="text.secondary">
                                        {manufacturingItem.manufacturing_number} - {manufacturingItem.manufacturing_name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddPrice}
                            disabled={!manufacturingItem}
                        >
                            新規価格
                        </Button>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                            <CircularProgress />
                        </Box>
                    ) : priceHistories.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ステータス</TableCell>
                                        <TableCell align="right">単価</TableCell>
                                        <TableCell>開始日</TableCell>
                                        <TableCell>終了日</TableCell>
                                        <TableCell>変更理由</TableCell>
                                        <TableCell>登録者</TableCell>
                                        <TableCell align="center">操作</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {priceHistories.map((price) => (
                                        <TableRow
                                            key={price.id}
                                            sx={{
                                                '&:hover': { bgcolor: 'action.hover' },
                                                opacity: price.is_active ? 1 : 0.6,
                                            }}
                                        >
                                            <TableCell>
                                                {getStatusChip(price)}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={price.is_current ? 'bold' : 'normal'}>
                                                    ¥{Number(price.price).toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(price.start_date).toLocaleDateString('ja-JP')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {price.end_date
                                                        ? new Date(price.end_date).toLocaleDateString('ja-JP')
                                                        : '無期限'
                                                    }
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                    {price.change_reason || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {price.created_by_name || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                    <Tooltip title="編集">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEditPrice(price)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="削除">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeletePrice(price.id)}
                                                            color="error"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 400,
                            gap: 2,
                        }}>
                            <Typography color="text.secondary">
                                価格履歴がありません
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddPrice}
                            >
                                最初の価格を登録
                            </Button>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} startIcon={<CloseIcon />}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 価格登録・編集モーダル */}
            {manufacturingItem && (
                <ManufacturingItemPriceHistoryFormModal
                    open={priceFormOpen}
                    onClose={handlePriceFormClose}
                    onSuccess={handlePriceFormSuccess}
                    manufacturingItem={manufacturingItem}
                    priceHistory={selectedPrice}
                />
            )}
        </>
    );
};
