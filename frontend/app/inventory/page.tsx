'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    ToggleButton,
    ToggleButtonGroup,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Refresh as RefreshIcon,
    Inventory as InventoryIcon,
    LocalShipping as ShippingIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon,
    Add as AddIcon,
    Clear as ClearIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    ViewList as ViewListIcon,
    ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import {
    InventoryDashboardData,
    PendingSuppliedItemList,
    PendingPurchaseOrder,
    UnreceivedPurchaseItem,
    PurchaseOrderStatus,
    SuppliedItemListStatus,
    SuppliedItemInventory,
    PurchasedItemInventory,
} from '@/types/purchases';
import { Product } from '@/types/product';

// localStorage キー
const DEFAULT_PRODUCT_KEY = 'inventory_dashboard_default_product';

// デフォルト製品をlocalStorageから取得
const getDefaultProductId = (): number | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(DEFAULT_PRODUCT_KEY);
    return stored ? parseInt(stored, 10) : null;
};

// デフォルト製品をlocalStorageに保存
const setDefaultProductId = (productId: number | null): void => {
    if (typeof window === 'undefined') return;
    if (productId !== null) {
        localStorage.setItem(DEFAULT_PRODUCT_KEY, productId.toString());
    } else {
        localStorage.removeItem(DEFAULT_PRODUCT_KEY);
    }
};

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

    // 製品一覧
    const [products, setProducts] = useState<Product[]>([]);

    // 製品フィルタ
    const [productFilter, setProductFilter] = useState<number | ''>('');
    const [defaultProductInitialized, setDefaultProductInitialized] = useState(false);

    // 受領ダイアログ
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<UnreceivedPurchaseItem | null>(null);

    // 表示モード: 'dashboard' | 'product'
    const [viewMode, setViewMode] = useState<'dashboard' | 'product'>('dashboard');

    // 在庫データ（製品別表示用）
    const [suppliedInventories, setSuppliedInventories] = useState<SuppliedItemInventory[]>([]);
    const [purchasedInventories, setPurchasedInventories] = useState<PurchasedItemInventory[]>([]);
    const [loadingInventories, setLoadingInventories] = useState(false);

    // デフォルト製品を初期化（products読み込み後1回のみ）
    useEffect(() => {
        if (!defaultProductInitialized && products.length > 0) {
            const defaultId = getDefaultProductId();
            if (defaultId && products.some(p => p.id === defaultId)) {
                setProductFilter(defaultId);
            }
            setDefaultProductInitialized(true);
        }
    }, [products, defaultProductInitialized]);

    // データ取得
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [dashboardDataResult, productsData] = await Promise.all([
                purchasesApi.getInventoryDashboard(),
                productApi.getProducts(),
            ]);
            setDashboardData(dashboardDataResult);
            setProducts(productsData);
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

    // 在庫データ取得（製品別表示モード用）
    const fetchInventoriesData = useCallback(async () => {
        setLoadingInventories(true);
        try {
            const [suppliedData, purchasedData] = await Promise.all([
                purchasesApi.getSuppliedItemInventories(),
                purchasesApi.getPurchasedItemInventories(),
            ]);
            setSuppliedInventories(suppliedData);
            setPurchasedInventories(purchasedData);
        } catch (e) {
            console.error('Failed to fetch inventories:', e);
        } finally {
            setLoadingInventories(false);
        }
    }, []);

    // 製品別表示モードに切り替えた時に在庫データを取得
    useEffect(() => {
        if (viewMode === 'product' && suppliedInventories.length === 0 && purchasedInventories.length === 0) {
            fetchInventoriesData();
        }
    }, [viewMode, suppliedInventories.length, purchasedInventories.length, fetchInventoriesData]);

    // 製品別在庫サマリーの型定義
    interface ProductInventorySummary {
        productId: number;
        productNumber: string;
        productName: string;
        suppliedItems: SuppliedItemInventory[];
        purchasedItems: PurchasedItemInventory[];
        totalSuppliedQuantity: number;
        totalPurchasedQuantity: number;
        totalSuppliedCount: number;
        totalPurchasedCount: number;
    }

    // 製品別在庫サマリー
    const productInventorySummaries = useMemo((): ProductInventorySummary[] => {
        const summaryMap = new Map<number, ProductInventorySummary>();

        // 支給品在庫を集計
        suppliedInventories.forEach((inv: SuppliedItemInventory) => {
            const productId = inv.product || 0;
            if (!summaryMap.has(productId)) {
                summaryMap.set(productId, {
                    productId,
                    productNumber: inv.product_number || '-',
                    productName: inv.product_name || '製品未設定',
                    suppliedItems: [],
                    purchasedItems: [],
                    totalSuppliedQuantity: 0,
                    totalPurchasedQuantity: 0,
                    totalSuppliedCount: 0,
                    totalPurchasedCount: 0,
                });
            }
            const summary = summaryMap.get(productId)!;
            summary.suppliedItems.push(inv);
            summary.totalSuppliedQuantity += inv.quantity || 0;
            summary.totalSuppliedCount += 1;
        });

        // 購入品在庫を集計
        purchasedInventories.forEach((inv: PurchasedItemInventory) => {
            const productId = inv.product || 0;
            if (!summaryMap.has(productId)) {
                summaryMap.set(productId, {
                    productId,
                    productNumber: inv.product_number || '-',
                    productName: inv.product_name || '製品未設定',
                    suppliedItems: [],
                    purchasedItems: [],
                    totalSuppliedQuantity: 0,
                    totalPurchasedQuantity: 0,
                    totalSuppliedCount: 0,
                    totalPurchasedCount: 0,
                });
            }
            const summary = summaryMap.get(productId)!;
            summary.purchasedItems.push(inv);
            summary.totalPurchasedQuantity += inv.quantity || 0;
            summary.totalPurchasedCount += 1;
        });

        return Array.from(summaryMap.values()).sort((a, b) => {
            if (a.productId === 0) return 1;
            if (b.productId === 0) return -1;
            return a.productNumber.localeCompare(b.productNumber);
        });
    }, [suppliedInventories, purchasedInventories]);

    // フィルタリングされた未受領購入品
    const filteredUnreceivedItems = useMemo(() => {
        if (!dashboardData) return [];
        if (!productFilter) return dashboardData.purchase_orders.unreceived_items;
        return dashboardData.purchase_orders.unreceived_items.filter(
            item => item.product_id === productFilter
        );
    }, [dashboardData, productFilter]);

    // フィルタリングされた未完了の支給品リスト
    const filteredPendingLists = useMemo(() => {
        if (!dashboardData) return [];
        if (!productFilter) return dashboardData.supplied_item_lists.pending_lists;
        return dashboardData.supplied_item_lists.pending_lists.filter(
            list => list.product_id === productFilter
        );
    }, [dashboardData, productFilter]);

    // フィルタリングされた未完了の購入発注
    const filteredPendingOrders = useMemo(() => {
        if (!dashboardData) return [];
        if (!productFilter) return dashboardData.purchase_orders.pending_orders;
        return dashboardData.purchase_orders.pending_orders.filter(
            order => order.product_id === productFilter
        );
    }, [dashboardData, productFilter]);

    // フィルタリングされたサマリー数値
    const filteredSummary = useMemo(() => {
        if (!dashboardData) return null;
        if (!productFilter) {
            return {
                suppliedListsPending: dashboardData.supplied_item_lists.pending_count,
                purchaseOrdersPending: dashboardData.purchase_orders.pending_count,
                unreceivedItemsCount: dashboardData.purchase_orders.unreceived_items.length,
            };
        }
        return {
            suppliedListsPending: filteredPendingLists.length,
            purchaseOrdersPending: filteredPendingOrders.length,
            unreceivedItemsCount: filteredUnreceivedItems.length,
        };
    }, [dashboardData, productFilter, filteredPendingLists, filteredPendingOrders, filteredUnreceivedItems]);

    // デフォルト製品を設定/解除
    const handleToggleDefaultProduct = (productId: number) => {
        const currentDefault = getDefaultProductId();
        if (currentDefault === productId) {
            setDefaultProductId(null);
        } else {
            setDefaultProductId(productId);
            setProductFilter(productId);
        }
    };

    // 製品フィルタを変更
    const handleProductFilterChange = (value: number | '') => {
        setProductFilter(value);
    };

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
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, newMode) => newMode && setViewMode(newMode)}
                        size="small"
                    >
                        <ToggleButton value="dashboard">
                            <Tooltip title="ダッシュボード表示">
                                <ViewListIcon />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="product">
                            <Tooltip title="製品別表示">
                                <ViewModuleIcon />
                            </Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                            if (viewMode === 'dashboard') {
                                fetchDashboardData();
                            } else {
                                fetchInventoriesData();
                            }
                        }}
                        disabled={loading || loadingInventories}
                    >
                        更新
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* 製品フィルタ（ダッシュボード表示のみ） */}
            {viewMode === 'dashboard' && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 300 }}>
                            <InputLabel>製品を選択</InputLabel>
                            <Select
                                value={productFilter}
                                label="製品を選択"
                                onChange={(e) => handleProductFilterChange(e.target.value as number | '')}
                                renderValue={(selected) => {
                                    if (!selected) return 'すべて';
                                    const product = products.find(p => p.id === selected);
                                    if (!product) return 'すべて';
                                    const isDefault = getDefaultProductId() === product.id;
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {isDefault && <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                                            {product.product_number} - {product.product_name}
                                        </Box>
                                    );
                                }}
                            >
                                <MenuItem value="">すべて</MenuItem>
                                {products.map((p) => {
                                    const isDefault = getDefaultProductId() === p.id;
                                    return (
                                        <MenuItem key={p.id} value={p.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <Tooltip title={isDefault ? 'デフォルト解除' : 'デフォルトに設定'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleDefaultProduct(p.id);
                                                        }}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        {isDefault ? (
                                                            <StarIcon sx={{ color: 'warning.main' }} />
                                                        ) : (
                                                            <StarBorderIcon sx={{ color: 'action.disabled' }} />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                                <span>{p.product_number} - {p.product_name}</span>
                                            </Box>
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        {productFilter && (
                            <Button
                                size="small"
                                startIcon={<ClearIcon />}
                                onClick={() => handleProductFilterChange('')}
                            >
                                フィルタ解除
                            </Button>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            ★をクリックするとデフォルト製品に設定できます
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* ダッシュボード表示 */}
            {viewMode === 'dashboard' && dashboardData && filteredSummary && (
                <>
                    {/* サマリーカード */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ShippingIcon color="primary" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            支給品リスト（未完了）
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {filteredSummary.suppliedListsPending}
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

                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InventoryIcon color="secondary" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            購入発注（未完了）
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {filteredSummary.purchaseOrdersPending}
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

                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WarningIcon color="warning" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            未受領品目数
                                        </Typography>
                                    </Box>
                                    <Typography variant="h3" sx={{ mt: 1 }}>
                                        {filteredSummary.unreceivedItemsCount}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Box sx={{ height: 30.75 }} />
                                </CardActions>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
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
                                <CardActions>
                                    <Box sx={{ height: 30.75 }} />
                                </CardActions>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* 未受領品目リスト */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="warning" />
                                未受領の購入品
                                {productFilter && (
                                    <Chip
                                        label={`${filteredUnreceivedItems.length}件`}
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Typography>
                        </Box>

                        {filteredUnreceivedItems.length === 0 ? (
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
                                        {filteredUnreceivedItems.slice(0, 20).map((item) => (
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
                                {productFilter && (
                                    <Chip
                                        label={`${filteredPendingLists.length}件`}
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => router.push('/supplied-item-inventory')}
                            >
                                すべて表示
                            </Button>
                        </Box>

                        {filteredPendingLists.length === 0 ? (
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
                                        {filteredPendingLists.map((list) => (
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
                                {productFilter && (
                                    <Chip
                                        label={`${filteredPendingOrders.length}件`}
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => router.push('/purchased-item-inventory')}
                            >
                                すべて表示
                            </Button>
                        </Box>

                        {filteredPendingOrders.length === 0 ? (
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
                                        {filteredPendingOrders.map((order) => (
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

            {/* 製品別表示 */}
            {viewMode === 'product' && (
                <Box>
                    {loadingInventories ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : productInventorySummaries.length === 0 ? (
                        <Alert severity="info">
                            在庫データがありません
                        </Alert>
                    ) : (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                製品別在庫一覧
                            </Typography>
                            {productInventorySummaries.map((summary) => (
                                <Accordion key={summary.productId} defaultExpanded={productInventorySummaries.length <= 3}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {summary.productNumber} - {summary.productName}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto', mr: 2 }}>
                                                <Chip
                                                    icon={<ShippingIcon />}
                                                    label={`支給品: ${summary.totalSuppliedCount}品目 / ${summary.totalSuppliedQuantity.toLocaleString()}`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                                <Chip
                                                    icon={<InventoryIcon />}
                                                    label={`購入品: ${summary.totalPurchasedCount}品目 / ${summary.totalPurchasedQuantity.toLocaleString()}`}
                                                    size="small"
                                                    color="secondary"
                                                    variant="outlined"
                                                />
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            {/* 支給品在庫 */}
                                            <Grid item xs={12} md={6}>
                                                <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                        <ShippingIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="primary" />
                                                        支給品在庫
                                                    </Typography>
                                                    {summary.suppliedItems.length === 0 ? (
                                                        <Typography color="text.secondary" variant="body2">
                                                            支給品在庫はありません
                                                        </Typography>
                                                    ) : (
                                                        <TableContainer sx={{ maxHeight: 300 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>品番</TableCell>
                                                                        <TableCell>品名</TableCell>
                                                                        <TableCell align="right">在庫数</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {summary.suppliedItems.map((item) => (
                                                                        <TableRow key={item.id}>
                                                                            <TableCell>{item.item_number}</TableCell>
                                                                            <TableCell>{item.item_name}</TableCell>
                                                                            <TableCell align="right">{item.quantity} {item.unit || ''}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    )}
                                                </Paper>
                                            </Grid>
                                            {/* 購入品在庫 */}
                                            <Grid item xs={12} md={6}>
                                                <Paper sx={{ p: 2, bgcolor: 'secondary.50' }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                        <InventoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="secondary" />
                                                        購入品在庫
                                                    </Typography>
                                                    {summary.purchasedItems.length === 0 ? (
                                                        <Typography color="text.secondary" variant="body2">
                                                            購入品在庫はありません
                                                        </Typography>
                                                    ) : (
                                                        <TableContainer sx={{ maxHeight: 300 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>部品番号</TableCell>
                                                                        <TableCell>部品名</TableCell>
                                                                        <TableCell align="right">在庫数</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {summary.purchasedItems.map((item) => (
                                                                        <TableRow key={item.id}>
                                                                            <TableCell>{item.part_number}</TableCell>
                                                                            <TableCell>{item.part_name}</TableCell>
                                                                            <TableCell align="right">{item.quantity} {item.unit || ''}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    )}
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </Box>
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
