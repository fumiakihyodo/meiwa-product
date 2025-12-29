'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Visibility as ViewIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as PendingIcon,
    ExpandMore as ExpandMoreIcon,
    Send as SendIcon,
    Inventory as InventoryIcon,
    LocalShipping as ReceivingIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SelectChangeEvent } from '@mui/material/Select';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import {
    PurchaseOrder,
    PurchaseOrderStatus,
    PurchaseOrderItem,
    PurchasedItemInventory,
    SupplierPartsGroup,
    PartForOrder,
} from '@/types/purchases';
import { Product } from '@/types/product';

// localStorage キー
const DEFAULT_PRODUCT_KEY = 'purchased_item_inventory_default_product';

// デフォルト製品をlocalStorageから取得
const getDefaultProductId = (): number | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(DEFAULT_PRODUCT_KEY);
    return stored ? parseInt(stored, 10) : null;
};

// デフォルト製品をlocalStorageに保存
const setDefaultProductId = (productId: number | null) => {
    if (typeof window === 'undefined') return;
    if (productId !== null) {
        localStorage.setItem(DEFAULT_PRODUCT_KEY, productId.toString());
    } else {
        localStorage.removeItem(DEFAULT_PRODUCT_KEY);
    }
};

// タブパネル
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// ステータスチップ
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

// 発注数量入力行の型
interface OrderQuantityRow {
    partId: number;
    partNumber: string;
    partName: string;
    unit: string;
    currentPrice: number | null;
    minimumOrderQuantity: number;
    quantity: number;
}

export default function PurchasedItemInventoryPage() {
    const router = useRouter();

    // タブ状態
    const [tabValue, setTabValue] = useState(0);

    // データ
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [inventories, setInventories] = useState<PurchasedItemInventory[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // フィルタ
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
    const [productFilter, setProductFilter] = useState<number | ''>('');
    const [inventoryProductFilter, setInventoryProductFilter] = useState<number | ''>('');

    // 発注作成モーダル関連
    const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
    const [selectedProductForOrder, setSelectedProductForOrder] = useState<number | ''>('');
    const [supplierPartsGroups, setSupplierPartsGroups] = useState<SupplierPartsGroup[]>([]);
    const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});
    const [loadingParts, setLoadingParts] = useState(false);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);

    // 発注詳細モーダル関連
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // 削除ダイアログ関連
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);

    // デフォルト製品の初期化済みフラグ
    const [defaultProductInitialized, setDefaultProductInitialized] = useState(false);

    // フィルタリングされた発注一覧
    const filteredOrders = useMemo(() => {
        let result = orders;
        if (searchText) {
            const lowerSearch = searchText.toLowerCase();
            result = result.filter((o: PurchaseOrder) =>
                o.order_number.toLowerCase().includes(lowerSearch) ||
                (o.product_name?.toLowerCase().includes(lowerSearch)) ||
                (o.supplier_name?.toLowerCase().includes(lowerSearch))
            );
        }
        if (statusFilter) {
            result = result.filter((o: PurchaseOrder) => o.status === statusFilter);
        }
        if (productFilter) {
            result = result.filter((o: PurchaseOrder) => o.product === productFilter);
        }
        return result;
    }, [orders, searchText, statusFilter, productFilter]);

    // フィルタリングされた在庫一覧
    const filteredInventories = useMemo(() => {
        if (!inventoryProductFilter) return inventories;
        return inventories.filter((inv: PurchasedItemInventory) => inv.product === inventoryProductFilter);
    }, [inventories, inventoryProductFilter]);

    // デフォルト製品を初期化（products読み込み後1回のみ）
    useEffect(() => {
        if (!defaultProductInitialized && products.length > 0) {
            const defaultId = getDefaultProductId();
            if (defaultId && products.some((p: Product) => p.id === defaultId)) {
                setProductFilter(defaultId);
                setInventoryProductFilter(defaultId);
            }
            setDefaultProductInitialized(true);
        }
    }, [products, defaultProductInitialized]);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, productsData, inventoriesData] = await Promise.all([
                purchasesApi.getPurchaseOrders(),
                productApi.getProducts(),
                purchasesApi.getPurchasedItemInventories(),
            ]);
            setOrders(ordersData);
            setProducts(productsData);
            setInventories(inventoriesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 発注作成用の部品取得
    const fetchPartsForOrder = useCallback(async (productId: number) => {
        setLoadingParts(true);
        setOrderError(null);
        try {
            const groups = await purchasesApi.getPartsGroupedBySupplier(productId);
            setSupplierPartsGroups(groups);
            // 初期化: 全部品の数量を0に設定
            const initialQuantities: Record<number, number> = {};
            groups.forEach(group => {
                group.parts.forEach(part => {
                    initialQuantities[part.id] = 0;
                });
            });
            setOrderQuantities(initialQuantities);
        } catch (error) {
            console.error('Failed to fetch parts:', error);
            setOrderError('部品の取得に失敗しました');
        } finally {
            setLoadingParts(false);
        }
    }, []);

    // 製品選択時の処理
    useEffect(() => {
        if (selectedProductForOrder) {
            fetchPartsForOrder(selectedProductForOrder);
        } else {
            setSupplierPartsGroups([]);
            setOrderQuantities({});
        }
    }, [selectedProductForOrder, fetchPartsForOrder]);

    // 発注作成
    const handleCreateOrders = async () => {
        if (!selectedProductForOrder) return;

        // 数量が入力されている部品のみを抽出
        const entries = Object.entries(orderQuantities) as [string, number][];
        const itemsWithQuantity = entries
            .filter(([, qty]) => qty > 0)
            .map(([partId, quantity]) => ({
                part: parseInt(partId, 10),
                quantity,
            }));

        if (itemsWithQuantity.length === 0) {
            setOrderError('発注する部品を選択してください');
            return;
        }

        setCreatingOrder(true);
        setOrderError(null);
        try {
            const result = await purchasesApi.createOrdersFromParts({
                product: selectedProductForOrder,
                items: itemsWithQuantity,
            });

            // 成功したら閉じてリロード
            setCreateOrderDialogOpen(false);
            setSelectedProductForOrder('');
            setOrderQuantities({});
            await fetchData();
            alert(result.message);
        } catch (error) {
            console.error('Failed to create orders:', error);
            setOrderError('発注の作成に失敗しました');
        } finally {
            setCreatingOrder(false);
        }
    };

    // 発注詳細取得
    const handleViewOrder = async (orderId: number) => {
        setLoadingDetail(true);
        setDetailDialogOpen(true);
        try {
            const order = await purchasesApi.getPurchaseOrder(orderId);
            setSelectedOrder(order);
        } catch (error) {
            console.error('Failed to fetch order detail:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    // 発注削除
    const handleDeleteOrder = async () => {
        if (!deletingOrder) return;
        try {
            await purchasesApi.deletePurchaseOrder(deletingOrder.id);
            setDeleteDialogOpen(false);
            setDeletingOrder(null);
            await fetchData();
        } catch (error) {
            console.error('Failed to delete order:', error);
            alert('削除に失敗しました');
        }
    };

    // 発注ステータス更新
    const handleUpdateStatus = async (orderId: number, newStatus: PurchaseOrderStatus) => {
        try {
            await purchasesApi.updatePurchaseOrderStatus(orderId, newStatus);
            // 詳細ダイアログが開いている場合は更新
            if (selectedOrder && selectedOrder.id === orderId) {
                const updated = await purchasesApi.getPurchaseOrder(orderId);
                setSelectedOrder(updated);
            }
            await fetchData();
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('ステータスの更新に失敗しました');
        }
    };

    // 一括受入確認
    const handleBulkReceiving = async (orderId: number) => {
        try {
            const result = await purchasesApi.bulkConfirmPurchaseOrderReceiving(orderId);
            alert(result.message);
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(result.order);
            }
            await fetchData();
        } catch (error) {
            console.error('Failed to confirm receiving:', error);
            alert('受入確認に失敗しました');
        }
    };

    // 一括員数確認
    const handleBulkCount = async (orderId: number) => {
        try {
            const result = await purchasesApi.bulkConfirmPurchaseOrderCount(orderId);
            alert(result.message);
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(result.order);
            }
            await fetchData();
        } catch (error) {
            console.error('Failed to confirm count:', error);
            alert('員数確認に失敗しました');
        }
    };

    // 発注一覧カラム定義
    const orderColumns: GridColDef[] = [
        {
            field: 'order_number',
            headerName: '発注番号',
            width: 160,
            renderCell: (params: GridRenderCellParams<PurchaseOrder>) => (
                <Button
                    size="small"
                    onClick={() => handleViewOrder(params.row.id)}
                    sx={{ textTransform: 'none' }}
                >
                    {params.value}
                </Button>
            ),
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 130,
            renderCell: (params: GridRenderCellParams<PurchaseOrder>) => (
                <StatusChip
                    status={params.row.status}
                    statusDisplay={params.row.status_display}
                />
            ),
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 200,
            valueGetter: (value: string, row: PurchaseOrder) =>
                row.product_number ? `${row.product_number} - ${row.product_name || ''}` : row.product_name || '-',
        },
        {
            field: 'supplier_name',
            headerName: '仕入先',
            width: 200,
            valueGetter: (value: string, row: PurchaseOrder) =>
                row.supplier_branch_name ? `${row.supplier_name} (${row.supplier_branch_name})` : row.supplier_name || '-',
        },
        {
            field: 'order_date',
            headerName: '発注日',
            width: 120,
        },
        {
            field: 'total_items',
            headerName: '品目数',
            width: 80,
            type: 'number',
        },
        {
            field: 'total_quantity',
            headerName: '合計数量',
            width: 100,
            type: 'number',
        },
        {
            field: 'progress',
            headerName: '進捗',
            width: 120,
            renderCell: (params: GridRenderCellParams<PurchaseOrder>) => {
                const received = params.row.received_items_count || 0;
                const confirmed = params.row.count_confirmed_items_count || 0;
                const total = params.row.total_items || 0;
                return (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Tooltip title="受入済">
                            <Chip
                                size="small"
                                label={`${received}/${total}`}
                                color={received === total && total > 0 ? 'success' : 'default'}
                                variant="outlined"
                                icon={<ReceivingIcon />}
                            />
                        </Tooltip>
                        <Tooltip title="員数確認済">
                            <Chip
                                size="small"
                                label={`${confirmed}/${total}`}
                                color={confirmed === total && total > 0 ? 'success' : 'default'}
                                variant="outlined"
                                icon={<InventoryIcon />}
                            />
                        </Tooltip>
                    </Box>
                );
            },
        },
        {
            field: 'actions',
            headerName: '操作',
            width: 100,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PurchaseOrder>) => (
                <Box>
                    <Tooltip title="詳細">
                        <IconButton size="small" onClick={() => handleViewOrder(params.row.id)}>
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                                setDeletingOrder(params.row);
                                setDeleteDialogOpen(true);
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    // 在庫一覧カラム定義
    const inventoryColumns: GridColDef[] = [
        {
            field: 'part_number',
            headerName: '部品番号',
            width: 150,
        },
        {
            field: 'part_name',
            headerName: '部品名',
            width: 200,
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 180,
            valueGetter: (value: string, row: PurchasedItemInventory) =>
                row.product_number ? `${row.product_number}` : '-',
        },
        {
            field: 'supplier_name',
            headerName: '仕入先',
            width: 150,
        },
        {
            field: 'quantity',
            headerName: '数量',
            width: 100,
            type: 'number',
            renderCell: (params: GridRenderCellParams<PurchasedItemInventory>) => (
                <Typography>
                    {params.value}{params.row.unit || ''}
                </Typography>
            ),
        },
        {
            field: 'lot_number',
            headerName: 'ロット番号',
            width: 120,
        },
        {
            field: 'received_date',
            headerName: '入庫日',
            width: 120,
        },
        {
            field: 'order_number',
            headerName: '発注番号',
            width: 160,
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    購入品管理
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOrderDialogOpen(true)}
                    >
                        発注作成
                    </Button>
                    <IconButton onClick={fetchData} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="発注一覧" />
                    <Tab label="在庫一覧" />
                </Tabs>

                {/* 発注一覧タブ */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        {/* フィルタ */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                placeholder="検索..."
                                value={searchText}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ minWidth: 200 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>ステータス</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="ステータス"
                                    onChange={(e: SelectChangeEvent<PurchaseOrderStatus | ''>) => setStatusFilter(e.target.value as PurchaseOrderStatus | '')}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    <MenuItem value="draft">下書き</MenuItem>
                                    <MenuItem value="ordered">発注済み</MenuItem>
                                    <MenuItem value="partially_received">一部受入</MenuItem>
                                    <MenuItem value="received">受入完了</MenuItem>
                                    <MenuItem value="pending_count">員数確認待ち</MenuItem>
                                    <MenuItem value="counting">員数確認中</MenuItem>
                                    <MenuItem value="completed">完了</MenuItem>
                                    <MenuItem value="cancelled">キャンセル</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>製品</InputLabel>
                                <Select
                                    value={productFilter}
                                    label="製品"
                                    onChange={(e: SelectChangeEvent<number | ''>) => {
                                        const val = e.target.value as number | '';
                                        setProductFilter(val);
                                        if (val) {
                                            setDefaultProductId(val as number);
                                        }
                                    }}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {products.map((p: Product) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.product_number} - {p.product_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* 発注一覧DataGrid */}
                        <DataGrid
                            rows={filteredOrders}
                            columns={orderColumns}
                            loading={loading}
                            autoHeight
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                                sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
                            }}
                            disableRowSelectionOnClick
                            sx={{ minHeight: 400 }}
                        />
                    </Box>
                </TabPanel>

                {/* 在庫一覧タブ */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        {/* 製品フィルタ */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>製品</InputLabel>
                                <Select
                                    value={inventoryProductFilter}
                                    label="製品"
                                    onChange={(e: SelectChangeEvent<number | ''>) => {
                                        const val = e.target.value as number | '';
                                        setInventoryProductFilter(val);
                                        if (val) {
                                            setDefaultProductId(val as number);
                                        }
                                    }}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {products.map((p: Product) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.product_number} - {p.product_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* 在庫一覧DataGrid */}
                        <DataGrid
                            rows={filteredInventories}
                            columns={inventoryColumns}
                            loading={loading}
                            autoHeight
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            disableRowSelectionOnClick
                            sx={{ minHeight: 400 }}
                        />
                    </Box>
                </TabPanel>
            </Paper>

            {/* 発注作成ダイアログ */}
            <Dialog
                open={createOrderDialogOpen}
                onClose={() => {
                    setCreateOrderDialogOpen(false);
                    setSelectedProductForOrder('');
                    setOrderQuantities({});
                    setOrderError(null);
                }}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>発注作成</DialogTitle>
                <DialogContent>
                    {orderError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {orderError}
                        </Alert>
                    )}

                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                            <InputLabel>製品を選択</InputLabel>
                            <Select
                                value={selectedProductForOrder}
                                label="製品を選択"
                                onChange={(e: SelectChangeEvent<number | ''>) => setSelectedProductForOrder(e.target.value as number)}
                            >
                                {products.map((p: Product) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.product_number} - {p.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {loadingParts && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loadingParts && supplierPartsGroups.length > 0 && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                仕入先別部品リスト
                            </Typography>
                            {supplierPartsGroups.map((group: SupplierPartsGroup) => (
                                <Accordion key={group.supplier_branch_id} defaultExpanded>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography>
                                            {group.supplier_name} ({group.branch_name}) - {group.parts.length}品目
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>部品番号</TableCell>
                                                        <TableCell>部品名</TableCell>
                                                        <TableCell>単位</TableCell>
                                                        <TableCell align="right">最小発注数</TableCell>
                                                        <TableCell align="right">単価</TableCell>
                                                        <TableCell align="right" sx={{ width: 120 }}>発注数量</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {group.parts.map((part: PartForOrder) => (
                                                        <TableRow key={part.id}>
                                                            <TableCell>{part.part_number}</TableCell>
                                                            <TableCell>{part.part_name}</TableCell>
                                                            <TableCell>{part.unit}</TableCell>
                                                            <TableCell align="right">{part.minimum_order_quantity}</TableCell>
                                                            <TableCell align="right">
                                                                {part.current_price
                                                                    ? `¥${part.current_price.toLocaleString()}`
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <TextField
                                                                    type="number"
                                                                    size="small"
                                                                    value={orderQuantities[part.id] || ''}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const val = parseInt(e.target.value, 10) || 0;
                                                                        setOrderQuantities((prev: Record<number, number>) => ({
                                                                            ...prev,
                                                                            [part.id]: val,
                                                                        }));
                                                                    }}
                                                                    inputProps={{ min: 0 }}
                                                                    sx={{ width: 100 }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}

                    {!loadingParts && selectedProductForOrder && supplierPartsGroups.length === 0 && (
                        <Alert severity="info">
                            この製品に登録されている部品がありません。
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setCreateOrderDialogOpen(false);
                            setSelectedProductForOrder('');
                            setOrderQuantities({});
                            setOrderError(null);
                        }}
                    >
                        キャンセル
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateOrders}
                        disabled={creatingOrder || !selectedProductForOrder || Object.values(orderQuantities).every(q => q === 0)}
                        startIcon={creatingOrder ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                        発注作成
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 発注詳細ダイアログ */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => {
                    setDetailDialogOpen(false);
                    setSelectedOrder(null);
                }}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    発注詳細
                    {selectedOrder && (
                        <Typography component="span" sx={{ ml: 2 }}>
                            {selectedOrder.order_number}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {loadingDetail && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loadingDetail && selectedOrder && (
                        <Box>
                            {/* 発注情報サマリー */}
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">ステータス</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <StatusChip status={selectedOrder.status} statusDisplay={selectedOrder.status_display} />
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">製品</Typography>
                                        <Typography>{selectedOrder.product_number} - {selectedOrder.product_name}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                        <Typography>{selectedOrder.supplier_name} ({selectedOrder.supplier_branch_name})</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">発注日</Typography>
                                        <Typography>{selectedOrder.order_date}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">品目数</Typography>
                                        <Typography>{selectedOrder.total_items}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">合計金額</Typography>
                                        <Typography>
                                            {selectedOrder.total_amount
                                                ? `¥${selectedOrder.total_amount.toLocaleString()}`
                                                : '-'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* アクションボタン */}
                                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                    {selectedOrder.status === 'draft' && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleUpdateStatus(selectedOrder.id, 'ordered')}
                                        >
                                            発注確定
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'ordered' && (
                                        <Button
                                            variant="contained"
                                            color="info"
                                            startIcon={<ReceivingIcon />}
                                            onClick={() => handleBulkReceiving(selectedOrder.id)}
                                        >
                                            一括受入確認
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'received' && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<InventoryIcon />}
                                            onClick={() => handleBulkCount(selectedOrder.id)}
                                        >
                                            一括員数確認（在庫移動）
                                        </Button>
                                    )}
                                </Box>
                            </Paper>

                            {/* 発注明細一覧 */}
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                発注明細
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>部品番号</TableCell>
                                            <TableCell>部品名</TableCell>
                                            <TableCell align="right">発注数量</TableCell>
                                            <TableCell align="right">単価</TableCell>
                                            <TableCell align="right">金額</TableCell>
                                            <TableCell align="center">受入確認</TableCell>
                                            <TableCell align="center">員数確認</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedOrder.items?.map((item: PurchaseOrderItem) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.part_number}</TableCell>
                                                <TableCell>{item.part_name}</TableCell>
                                                <TableCell align="right">{item.quantity} {item.unit}</TableCell>
                                                <TableCell align="right">
                                                    {item.unit_price
                                                        ? `¥${item.unit_price.toLocaleString()}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.amount
                                                        ? `¥${item.amount.toLocaleString()}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.receiving_confirmed ? (
                                                        <Tooltip title={`${item.receiving_confirmed_at} by ${item.receiving_confirmed_by_name}`}>
                                                            <CheckCircleIcon color="success" />
                                                        </Tooltip>
                                                    ) : (
                                                        <PendingIcon color="disabled" />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.count_confirmed ? (
                                                        <Tooltip title={`${item.count_confirmed_at} by ${item.count_confirmed_by_name}`}>
                                                            <CheckCircleIcon color="success" />
                                                        </Tooltip>
                                                    ) : (
                                                        <PendingIcon color="disabled" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDetailDialogOpen(false);
                        setSelectedOrder(null);
                    }}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingOrder(null);
                }}
            >
                <DialogTitle>発注の削除</DialogTitle>
                <DialogContent>
                    <Typography>
                        発注「{deletingOrder?.order_number}」を削除してもよろしいですか？
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDeleteDialogOpen(false);
                        setDeletingOrder(null);
                    }}>
                        キャンセル
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteOrder}
                    >
                        削除
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
