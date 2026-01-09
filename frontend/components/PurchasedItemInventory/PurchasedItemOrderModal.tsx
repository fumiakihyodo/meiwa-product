'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import {
    PurchaseOrder,
    PurchaseOrderStatus,
    PurchaseOrderItem,
} from '@/types/purchases';

// ステータスチップコンポーネント
function StatusChip({ status, statusDisplay }: { status: PurchaseOrderStatus; statusDisplay?: string }) {
    const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case 'draft': return 'default';
            case 'ordered': return 'primary';
            case 'partially_received': return 'warning';
            case 'received': return 'info';
            case 'pending_count': return 'secondary';
            case 'counting': return 'secondary';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    return (
        <Chip
            label={statusDisplay || status}
            color={getStatusColor()}
            size="small"
        />
    );
}

interface PurchasedItemOrderModalProps {
    open: boolean;
    onClose: () => void;
    order: PurchaseOrder | null;
    loading: boolean;
    onUpdateStatus: (orderId: number, newStatus: PurchaseOrderStatus) => Promise<void>;
    onBulkCount?: (orderId: number) => Promise<void>;
    // 個別受入確認関連
    receivingItemId: number | null;
    receivingQuantity: number;
    receivingLotNumber: string;
    receivingInProgress: boolean;
    onStartItemReceiving: (item: PurchaseOrderItem) => void;
    onCancelItemReceiving: () => void;
    onConfirmItemReceiving: () => Promise<void>;
    onReceivingQuantityChange: (quantity: number) => void;
    onReceivingLotNumberChange: (lotNumber: string) => void;
    onCancelItemReceivingRecord?: (item: PurchaseOrderItem) => Promise<void>;
    cancellingItemId?: number | null;
}

export default function PurchasedItemOrderModal({
    open,
    onClose,
    order,
    loading,
    onUpdateStatus,
    receivingItemId,
    onCancelItemReceiving,
}: PurchasedItemOrderModalProps) {
    const handleClose = () => {
        onCancelItemReceiving();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle>
                発注詳細
                {order && (
                    <Typography component="span" sx={{ ml: 2 }}>
                        {order.order_number}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent dividers sx={{ overflowX: 'auto' }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && order && (
                    <Box>
                        {/* 発注情報サマリー */}
                        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ステータス</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <StatusChip status={order.status} statusDisplay={order.status_display} />
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">製品</Typography>
                                    <Typography>{order.product_number} - {order.product_name}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                    <Typography>{order.supplier_name} ({order.supplier_branch_name})</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">発注日</Typography>
                                    <Typography>{order.order_date}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">品目数</Typography>
                                    <Typography>{order.total_items}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">合計金額</Typography>
                                    <Typography>
                                        {order.total_amount
                                            ? `¥${order.total_amount.toLocaleString()}`
                                            : '-'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* アクションボタン */}
                            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                {order.status === 'draft' && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => onUpdateStatus(order.id, 'ordered')}
                                    >
                                        発注確定
                                    </Button>
                                )}
                            </Box>
                        </Paper>

                        {/* 発注明細一覧 */}
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                            発注明細
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ bgcolor: 'grey.100' }}>部品番号</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }}>部品名</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }}>仕入れ先部品名称</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }} align="right">発注数量</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }} align="right">受領済み</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }} align="right">未受領</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }} align="right">単価</TableCell>
                                        <TableCell sx={{ bgcolor: 'grey.100' }} align="center">ステータス</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {order.items?.map((item: PurchaseOrderItem) => {
                                        const receivedQty = item.received_quantity || 0;
                                        const unreceivedQty = item.quantity - receivedQty;
                                        const isReceivingThis = receivingItemId === item.id;

                                        return (
                                            <TableRow key={item.id} sx={{ bgcolor: isReceivingThis ? 'action.selected' : 'inherit' }}>
                                                <TableCell>{item.part_number}</TableCell>
                                                <TableCell>{item.part_name}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.supplier_part_name || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">{item.quantity} {item.unit}</TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        size="small"
                                                        label={`${receivedQty} ${item.unit}`}
                                                        color={receivedQty >= item.quantity ? 'success' : receivedQty > 0 ? 'warning' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {unreceivedQty > 0 ? (
                                                        <Chip
                                                            size="small"
                                                            label={`${unreceivedQty} ${item.unit}`}
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        <CheckCircleIcon color="success" fontSize="small" />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.unit_price
                                                        ? `¥${item.unit_price.toLocaleString()}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                        <Tooltip title={item.receiving_confirmed ? '受入確認済み' : '受入未確認'}>
                                                            {item.receiving_confirmed ? (
                                                                <CheckCircleIcon color="success" fontSize="small" />
                                                            ) : (
                                                                <PendingIcon color="disabled" fontSize="small" />
                                                            )}
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>

                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
}
