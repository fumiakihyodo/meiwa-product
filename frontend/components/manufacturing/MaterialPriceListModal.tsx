// components/manufacturing/MaterialPriceListModal.tsx
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
    Alert,
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
import { Material, MaterialPriceHistory, materialPriceHistoryApi } from '@/services/apiManufacturing';
import { MaterialPriceHistoryFormModal } from './MaterialPriceHistoryFormModal';
import toast from 'react-hot-toast';

interface MaterialPriceListModalProps {
    open: boolean;
    onClose: () => void;
    material: Material | null;
    onSwitchToDetail?: (material: Material) => void;
    onSuccess?: () => void;
}

/**
 * 材料価格履歴一覧モーダル
 * 材料の価格履歴を一覧表示し、新規追加・編集・削除ができる
 */
export const MaterialPriceListModal: React.FC<MaterialPriceListModalProps> = ({
    open,
    onClose,
    material,
    onSwitchToDetail,
    onSuccess,
}) => {
    const [priceHistories, setPriceHistories] = useState<MaterialPriceHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [priceFormOpen, setPriceFormOpen] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<MaterialPriceHistory | null>(null);

    // 価格履歴を取得
    const fetchPriceHistories = useCallback(async () => {
        if (!material) return;

        setLoading(true);
        try {
            const data = await materialPriceHistoryApi.getPriceHistories({ material: material.id });
            setPriceHistories(data);
        } catch (error) {
            console.error(error);
            toast.error('価格履歴の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [material]);

    useEffect(() => {
        if (open && material) {
            fetchPriceHistories();
        }
    }, [open, material, fetchPriceHistories]);

    // 新規価格追加
    const handleAddPrice = () => {
        setSelectedPrice(null);
        setPriceFormOpen(true);
    };

    // 価格編集
    const handleEditPrice = (price: MaterialPriceHistory) => {
        setSelectedPrice(price);
        setPriceFormOpen(true);
    };

    // 価格削除
    const handleDeletePrice = async (priceId: number) => {
        if (!confirm('この価格履歴を削除してもよろしいですか?')) {
            return;
        }

        try {
            await materialPriceHistoryApi.deletePriceHistory(priceId);
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
        if (material && onSwitchToDetail) {
            onSwitchToDetail(material);
        }
    };

    // ステータスチップを取得
    const getStatusChip = (price: MaterialPriceHistory) => {
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {onSwitchToDetail && (
                                <Tooltip title="材料詳細に戻る">
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
                                <Typography variant="h6" component="div" fontWeight="bold">
                                    価格履歴
                                </Typography>
                                {material && (
                                    <Typography variant="body2" color="text.secondary">
                                        {material.material_code} - {material.material_name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddPrice}
                            disabled={!material}
                            size="small"
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

                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        startIcon={<CloseIcon />}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 価格登録・編集モーダル */}
            {material && (
                <MaterialPriceHistoryFormModal
                    open={priceFormOpen}
                    onClose={handlePriceFormClose}
                    onSuccess={handlePriceFormSuccess}
                    material={material}
                    priceHistory={selectedPrice}
                />
            )}
        </>
    );
};
