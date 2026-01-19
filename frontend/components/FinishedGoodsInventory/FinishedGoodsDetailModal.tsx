'use client';

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import {
    Inventory as InventoryIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import {
    FinishedGoodsWithInventory,
    FinishedGoodsInventoryStatusLabels,
} from '@/types/manufacturing-inventory';

interface FinishedGoodsDetailModalProps {
    open: boolean;
    onClose: () => void;
    item: FinishedGoodsWithInventory | null;
}

export const FinishedGoodsDetailModal: React.FC<FinishedGoodsDetailModalProps> = ({
    open,
    onClose,
    item,
}) => {
    if (!item) return null;

    const statusColors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
        available: 'success',
        reserved: 'info',
        quarantine: 'warning',
        defective: 'error',
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color="primary" />
                製作品在庫詳細
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* 基本情報 */}
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            基本情報
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    品番
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {item.manufacturing_number}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    製作品名
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {item.manufacturing_name}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    製品
                                </Typography>
                                <Typography variant="body1">
                                    {item.product_number
                                        ? `${item.product_number} - ${item.product_name || ''}`
                                        : '-'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    単位
                                </Typography>
                                <Typography variant="body1">{item.unit}</Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {/* 在庫数量サマリー */}
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            在庫数量サマリー
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary">
                                    合計在庫
                                </Typography>
                                <Typography
                                    variant="h5"
                                    fontWeight="bold"
                                    color={item.total_quantity > 0 ? 'primary.main' : 'text.secondary'}
                                >
                                    {item.total_quantity.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.unit}
                                </Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary">
                                    出荷可能
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                    {item.available_quantity.toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary">
                                    予約済み
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="info.main">
                                    {item.reserved_quantity.toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary">
                                    検査中
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="warning.main">
                                    {item.quarantine_quantity.toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                                <Typography variant="caption" color="text.secondary">
                                    不良品
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                    {item.defective_quantity.toLocaleString()}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {/* 在庫レコード一覧 */}
                    {item.inventory_records && item.inventory_records.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                在庫レコード履歴
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>ロット番号</TableCell>
                                            <TableCell>計画番号</TableCell>
                                            <TableCell>保管場所</TableCell>
                                            <TableCell align="right">数量</TableCell>
                                            <TableCell>ステータス</TableCell>
                                            <TableCell>完成日</TableCell>
                                            <TableCell>備考</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {item.inventory_records.map((record) => (
                                            <TableRow key={record.id} hover>
                                                <TableCell>
                                                    {record.lot_number || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.plan_number || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.storage_location || '-'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight="bold">
                                                        {record.quantity.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            record.status_display ||
                                                            FinishedGoodsInventoryStatusLabels[record.status] ||
                                                            record.status
                                                        }
                                                        color={statusColors[record.status] || 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {record.completed_at || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            maxWidth: 150,
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                        title={record.notes}
                                                    >
                                                        {record.notes || '-'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* 在庫レコードがない場合 */}
                    {(!item.inventory_records || item.inventory_records.length === 0) && (
                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography color="text.secondary">
                                在庫レコードがありません
                            </Typography>
                        </Paper>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FinishedGoodsDetailModal;
