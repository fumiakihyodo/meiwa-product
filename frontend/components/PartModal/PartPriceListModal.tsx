// components/PartPriceListModal.tsx
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
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Part, PriceHistory } from '@/types/purchases';
import { purchasesApi } from '@/services/apiPurchases';
import { PriceHistoryFormModal } from './PriceHistoryFormModal';
import { QuoteFileViewerModal } from '../QuoteFileViewerModal';
import toast from 'react-hot-toast';

interface PartPriceListModalProps {
    open: boolean;
    onClose: () => void;
    part: Part | null;
    onSwitchToDetail?: (part: Part) => void;
}

export const PartPriceListModal: React.FC<PartPriceListModalProps> = ({
    open,
    onClose,
    part,
    onSwitchToDetail,
}) => {
    const [priceHistories, setPriceHistories] = useState<PriceHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [priceFormOpen, setPriceFormOpen] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);

    const fetchPriceHistories = useCallback(async () => {
        if (!part) return;

        setLoading(true);
        try {
            const data = await purchasesApi.getPriceHistories({ part: part.id });
            setPriceHistories(data);
        } catch (error) {
            console.error(error);
            toast.error('価格履歴の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [part]);

    useEffect(() => {
        if (open && part) {
            fetchPriceHistories();
        }
    }, [open, part, fetchPriceHistories]);

    const handleAddPrice = () => {
        setSelectedPrice(null);
        setPriceFormOpen(true);
    };

    const handleEditPrice = (price: PriceHistory) => {
        setSelectedPrice(price);
        setPriceFormOpen(true);
    };

    const handleDeletePrice = async (priceId: number) => {
        if (!confirm('この価格履歴を削除してもよろしいですか?')) {
            return;
        }

        try {
            await purchasesApi.deletePriceHistory(priceId);
            toast.success('価格履歴を削除しました');
            fetchPriceHistories();
        } catch (error) {
            console.error(error);
            toast.error('価格履歴の削除に失敗しました');
        }
    };

    // 見積書表示モーダル状態管理
    const [quoteViewerOpen, setQuoteViewerOpen] = useState(false);
    const [selectedQuoteFile, setSelectedQuoteFile] = useState<{
        priceHistoryId: number;
        fileName: string;
    } | null>(null);

    // 見積書表示モーダルを閉じる
    const handleCloseQuoteViewer = () => {
        setQuoteViewerOpen(false);
        setSelectedQuoteFile(null);
    };

    const handleViewFile = (priceHistory: PriceHistory) => {
        console.log('[PartPriceListModal] View quote file:', priceHistory);
        console.log('[PartPriceListModal] quote_file_name:', priceHistory.quote_file_name);
        console.log('[PartPriceListModal] quote_file:', priceHistory.quote_file);

        if (priceHistory.quote_file_name) {
            setSelectedQuoteFile({
                priceHistoryId: priceHistory.id,
                fileName: priceHistory.quote_file_name,
            });
            setQuoteViewerOpen(true);
        } else {
            toast.error('見積書ファイルが見つかりません');
        }
    };

    const handleDownloadFile = async (priceHistoryId: number, fileName: string) => {
        try {
            const blob = await purchasesApi.downloadQuoteFile(priceHistoryId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('ファイルをダウンロードしました');
        } catch (error) {
            console.error(error);
            toast.error('ファイルのダウンロードに失敗しました');
        }
    };

    const handlePriceFormClose = () => {
        setPriceFormOpen(false);
        setSelectedPrice(null);
    };

    const handlePriceFormSuccess = () => {
        setPriceFormOpen(false);
        setSelectedPrice(null);
        fetchPriceHistories();
    };

    const handleBackToDetail = () => {
        if (part && onSwitchToDetail) {
            onSwitchToDetail(part);
        }
    };

    const getStatusChip = (price: PriceHistory) => {
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
                                <Tooltip title="部品詳細に戻る">
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
                                {part && (
                                    <Typography variant="body2" color="text.secondary">
                                        {part.part_number} - {part.part_name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddPrice}
                            disabled={!part}
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
                                        <TableCell>見積書</TableCell>
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
                                                {price.quote_file ? (
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip title="表示">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewFile(price)}
                                                            >
                                                                <VisibilityIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="ダウンロード">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDownloadFile(
                                                                    price.id,
                                                                    price.quote_file_name || 'quote_file'
                                                                )}
                                                            >
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        -
                                                    </Typography>
                                                )}
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

                    {part?.has_multiple_active_prices && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            複数の有効な価格が同時期に設定されています。価格の適用期間を確認してください。
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} startIcon={<CloseIcon />}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 価格登録・編集モーダル */}
            {part && (
                <PriceHistoryFormModal
                    open={priceFormOpen}
                    onClose={handlePriceFormClose}
                    onSuccess={handlePriceFormSuccess}
                    part={part}
                    priceHistory={selectedPrice}
                />
            )}

            {/* 見積書表示モーダル */}
            {selectedQuoteFile && (
                <QuoteFileViewerModal
                    open={quoteViewerOpen}
                    onClose={handleCloseQuoteViewer}
                    priceHistoryId={selectedQuoteFile.priceHistoryId}
                    fileName={selectedQuoteFile.fileName}
                />
            )}
        </>
    );
};