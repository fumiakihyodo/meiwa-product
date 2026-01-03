'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Divider,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Inventory as InventoryIcon,
    LocalShipping as ShippingIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { purchasesApi } from '@/services/apiPurchases';
import {
    InventoryDashboardData,
    PendingSuppliedItemList,
    PendingPurchaseOrder,
    UnreceivedPurchaseItem,
    PurchaseOrderStatus,
    SuppliedItemListStatus,
} from '@/types/purchases';

// ステータスチップ（購入発注用）
function PurchaseStatusChip({ status, statusDisplay }: { status: PurchaseOrderStatus; statusDisplay?: string }) {
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

// ステータスチップ（支給品リスト用）
function SuppliedListStatusChip({ status, statusDisplay }: { status: SuppliedItemListStatus; statusDisplay?: string }) {
    const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case 'draft': return 'default';
            case 'pending_receiving': return 'primary';
            case 'receiving': return 'info';
            case 'pending_count': return 'warning';
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

// 受領入力ダイアログ
interface ReceiveDialogProps {
    open: boolean;
    item: UnreceivedPurchaseItem | null;
    onClose: () => void;
    onConfirm: (itemId: number, quantity: number, lotNumber: string) => Promise<void>;
}

function ReceiveDialog({ open, item, onClose, onConfirm }: ReceiveDialogProps) {
    const [quantity, setQuantity] = useState<number>(0);
    const [lotNumber, setLotNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (item) {
            setQuantity(item.unreceived_quantity);
            setLotNumber('');
            setError(null);
        }
    }, [item]);

    const handleConfirm = async () => {
        if (!item) return;
        if (quantity < 1) {
            setError('受領数量は1以上を入力してください');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await onConfirm(item.order_item_id, quantity, lotNumber);
            onClose();
        } catch (e) {
            setError('受領処理に失敗しました');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>受領登録</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {item && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            部品情報
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {item.part_number} - {item.part_name}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    発注数量
                                </Typography>
                                <Typography variant="body1">
                                    {item.ordered_quantity} {item.unit}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    受領済み
                                </Typography>
                                <Typography variant="body1">
                                    {item.received_quantity} {item.unit}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    未受領
                                </Typography>
                                <Typography variant="body1" color="warning.main" fontWeight="bold">
                                    {item.unreceived_quantity} {item.unit}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <TextField
                            label="受領数量"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                            fullWidth
                            inputProps={{ min: 1, max: item.unreceived_quantity }}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="ロット番号（任意）"
                            value={lotNumber}
                            onChange={(e) => setLotNumber(e.target.value)}
                            fullWidth
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={loading || quantity < 1}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                    受領確定
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function InventoryDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null);

    // 受領ダイアログ
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UnreceivedPurchaseItem | null>(null);

    // データ取得
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await purchasesApi.getInventoryDashboard();
            setDashboardData(data);
        } catch (e) {
            console.error('Failed to fetch dashboard data:', e);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // 受領処理
    const handleReceiveItem = async (itemId: number, quantity: number, lotNumber: string) => {
        await purchasesApi.receivePurchaseOrderItem(itemId, {
            received_quantity: quantity,
            lot_number: lotNumber || undefined,
        });
        await fetchDashboardData();
    };

    // 受領ダイアログを開く
    const openReceiveDialog = (item: UnreceivedPurchaseItem) => {
        setSelectedItem(item);
        setReceiveDialogOpen(true);
    };

    if (loading && !dashboardData) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    在庫管理
                </Typography>
                <IconButton onClick={fetchDashboardData} disabled={loading}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {dashboardData && (
                <>
                    {/* サマリーカード */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ShippingIcon color="primary" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            支給品リスト（未完了）
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {dashboardData.supplied_item_lists.pending_count}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={() => router.push('/supplied-item-inventory')}
                                    >
                                        詳細を見る
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InventoryIcon color="secondary" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            購入発注（未完了）
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {dashboardData.purchase_orders.pending_count}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={() => router.push('/purchased-item-inventory')}
                                    >
                                        詳細を見る
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WarningIcon color="warning" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            未受領品目数
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {dashboardData.purchase_orders.unreceived_items.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon color="success" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            在庫合計
                                        </Typography>
                                    </Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            支給品: {dashboardData.inventory_summary.supplied_items_total.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            購入品: {dashboardData.inventory_summary.purchased_items_total.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* 未受領品目リスト */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="warning" />
                                未受領の購入品
                            </Typography>
                        </Box>

                        {dashboardData.purchase_orders.unreceived_items.length === 0 ? (
                            <Alert severity="success">
                                未受領の購入品はありません
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>発注番号</TableCell>
                                            <TableCell>部品番号</TableCell>
                                            <TableCell>部品名</TableCell>
                                            <TableCell>製品</TableCell>
                                            <TableCell>仕入先</TableCell>
                                            <TableCell align="right">発注数量</TableCell>
                                            <TableCell align="right">受領済み</TableCell>
                                            <TableCell align="right">未受領</TableCell>
                                            <TableCell>発注日</TableCell>
                                            <TableCell>操作</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboardData.purchase_orders.unreceived_items.slice(0, 20).map((item) => (
                                            <TableRow key={`${item.order_id}-${item.order_item_id}`}>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        onClick={() => router.push('/purchased-item-inventory')}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        {item.order_number}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{item.part_number}</TableCell>
                                                <TableCell>{item.part_name}</TableCell>
                                                <TableCell>{item.product_name || '-'}</TableCell>
                                                <TableCell>{item.supplier_name || '-'}</TableCell>
                                                <TableCell align="right">
                                                    {item.ordered_quantity} {item.unit}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.received_quantity} {item.unit}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={`${item.unreceived_quantity} ${item.unit}`}
                                                        color="warning"
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{item.order_date}</TableCell>
                                                <TableCell>
                                                    <Tooltip title="受領登録">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => openReceiveDialog(item)}
                                                        >
                                                            <AddIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>

                    {/* 未完了の支給品リスト */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                <ShippingIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="primary" />
                                未完了の支給品リスト
                            </Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => router.push('/supplied-item-inventory')}
                            >
                                すべて表示
                            </Button>
                        </Box>

                        {dashboardData.supplied_item_lists.pending_lists.length === 0 ? (
                            <Alert severity="success">
                                未完了の支給品リストはありません
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>リスト番号</TableCell>
                                            <TableCell>製品</TableCell>
                                            <TableCell>発行日</TableCell>
                                            <TableCell>ステータス</TableCell>
                                            <TableCell align="right">品目数</TableCell>
                                            <TableCell align="right">受入済み</TableCell>
                                            <TableCell align="right">員数確認済み</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboardData.supplied_item_lists.pending_lists.map((list) => (
                                            <TableRow key={list.id}>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        onClick={() => router.push(`/supplied-item-inventory/${list.id}`)}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        {list.list_number}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    {list.product_number} - {list.product_name || '-'}
                                                </TableCell>
                                                <TableCell>{list.issue_date}</TableCell>
                                                <TableCell>
                                                    <SuppliedListStatusChip
                                                        status={list.status}
                                                        statusDisplay={list.status_display}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{list.total_items}</TableCell>
                                                <TableCell align="right">
                                                    {list.received_items_count}/{list.total_items}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {list.count_confirmed_items_count}/{list.total_items}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>

                    {/* 未完了の購入発注 */}
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                <InventoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="secondary" />
                                未完了の購入発注
                            </Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => router.push('/purchased-item-inventory')}
                            >
                                すべて表示
                            </Button>
                        </Box>

                        {dashboardData.purchase_orders.pending_orders.length === 0 ? (
                            <Alert severity="success">
                                未完了の購入発注はありません
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>発注番号</TableCell>
                                            <TableCell>製品</TableCell>
                                            <TableCell>仕入先</TableCell>
                                            <TableCell>発注日</TableCell>
                                            <TableCell>ステータス</TableCell>
                                            <TableCell align="right">品目数</TableCell>
                                            <TableCell align="right">受領進捗</TableCell>
                                            <TableCell align="right">未受領</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboardData.purchase_orders.pending_orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        onClick={() => router.push('/purchased-item-inventory')}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        {order.order_number}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    {order.product_number} - {order.product_name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {order.supplier_name}
                                                    {order.supplier_branch_name && ` (${order.supplier_branch_name})`}
                                                </TableCell>
                                                <TableCell>{order.order_date}</TableCell>
                                                <TableCell>
                                                    <PurchaseStatusChip
                                                        status={order.status}
                                                        statusDisplay={order.status_display}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{order.total_items}</TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        label={`${order.received_quantity}/${order.total_quantity}`}
                                                        color={order.received_quantity === order.total_quantity ? 'success' : 'default'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {order.unreceived_quantity > 0 ? (
                                                        <Chip
                                                            label={order.unreceived_quantity}
                                                            color="warning"
                                                            size="small"
                                                        />
                                                    ) : (
                                                        <CheckCircleIcon color="success" fontSize="small" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </>
            )}

            {/* 受領ダイアログ */}
            <ReceiveDialog
                open={receiveDialogOpen}
                item={selectedItem}
                onClose={() => {
                    setReceiveDialogOpen(false);
                    setSelectedItem(null);
                }}
                onConfirm={handleReceiveItem}
            />
        </Box>
    );
}
