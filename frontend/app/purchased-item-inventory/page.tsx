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
    FormLabel,
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
    Radio,
    RadioGroup,
    FormControlLabel,
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
    Edit as EditIcon,
    History as HistoryIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Clear as ClearIcon,
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
    InventoryAdjustmentReason,
    InventoryAdjustmentReasonLabels,
    PartWithInventory,
} from '@/types/purchases';
import { Product } from '@/types/product';
import { PurchasedItemOrderModal } from '@/components/PurchasedItemInventory';

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
    const [partsWithInventory, setPartsWithInventory] = useState<PartWithInventory[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingInventory, setLoadingInventory] = useState(false);

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
    const [supplierFilter, setSupplierFilter] = useState<number | ''>(''); // サプライヤーフィルタ

    // 発注詳細モーダル関連
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // 削除ダイアログ関連
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);

    // 個別受入確認関連
    const [receivingItemId, setReceivingItemId] = useState<number | null>(null);
    const [receivingQuantity, setReceivingQuantity] = useState<number>(0);
    const [receivingLotNumber, setReceivingLotNumber] = useState<string>('');
    const [receivingInProgress, setReceivingInProgress] = useState(false);

    // 受入キャンセル関連
    const [cancellingItemId, setCancellingItemId] = useState<number | null>(null);

    // 在庫調整ダイアログ関連
    const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
    const [adjustingInventory, setAdjustingInventory] = useState<PurchasedItemInventory | null>(null);
    const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
    const [adjustmentReason, setAdjustmentReason] = useState<InventoryAdjustmentReason>('stocktaking');
    const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');
    const [adjustingInProgress, setAdjustingInProgress] = useState(false);

    // 履歴モーダル関連
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyInventory, setHistoryInventory] = useState<PurchasedItemInventory | null>(null);

    // 部品詳細モーダル関連
    const [partDetailDialogOpen, setPartDetailDialogOpen] = useState(false);
    const [selectedPartWithInventory, setSelectedPartWithInventory] = useState<PartWithInventory | null>(null);

    // 在庫レコード削除関連
    const [deleteRecordDialogOpen, setDeleteRecordDialogOpen] = useState(false);
    const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
    const [deletingRecordInProgress, setDeletingRecordInProgress] = useState(false);

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

    // フィルタリングされた在庫一覧（partsWithInventoryを使用）
    const filteredPartsWithInventory = useMemo(() => {
        return partsWithInventory;
    }, [partsWithInventory]);

    // サプライヤーフィルタリングされた部品グループ
    const filteredSupplierPartsGroups = useMemo(() => {
        if (!supplierFilter) return supplierPartsGroups;
        return supplierPartsGroups.filter(
            (group: SupplierPartsGroup) => group.supplier_branch_id === supplierFilter
        );
    }, [supplierPartsGroups, supplierFilter]);

    // 製品別在庫サマリー
    interface ProductInventorySummary {
        productId: number;
        productNumber: string;
        productName: string;
        itemCount: number;
        totalQuantity: number;
    }

    const productInventorySummaries = useMemo((): ProductInventorySummary[] => {
        const summaryMap = new Map<number, ProductInventorySummary>();

        // partsWithInventory を使用してサマリーを計算
        partsWithInventory.forEach((part: PartWithInventory) => {
            const productId = part.product_id || 0;
            if (summaryMap.has(productId)) {
                const existing = summaryMap.get(productId)!;
                existing.itemCount += 1;
                existing.totalQuantity += part.total_quantity || 0;
            } else {
                summaryMap.set(productId, {
                    productId,
                    productNumber: part.product_number || '-',
                    productName: part.product_name || '製品未設定',
                    itemCount: 1,
                    totalQuantity: part.total_quantity || 0,
                });
            }
        });

        return Array.from(summaryMap.values()).sort((a, b) =>
            a.productNumber.localeCompare(b.productNumber)
        );
    }, [partsWithInventory]);

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

    // 在庫一覧用：製品ごとの全active部品と在庫数を取得
    const fetchPartsWithInventory = useCallback(async (productId: number) => {
        setLoadingInventory(true);
        try {
            const data = await purchasesApi.getPurchasedItemInventoryWithParts({
                product: productId,
                include_records: true,
            });
            setPartsWithInventory(data);
        } catch (error) {
            console.error('Failed to fetch parts with inventory:', error);
            setPartsWithInventory([]);
        } finally {
            setLoadingInventory(false);
        }
    }, []);

    // 在庫タブの製品フィルタ変更時にデータを取得
    useEffect(() => {
        if (inventoryProductFilter) {
            fetchPartsWithInventory(inventoryProductFilter);
        } else {
            setPartsWithInventory([]);
        }
    }, [inventoryProductFilter, fetchPartsWithInventory]);

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

    // 個別受入確認開始
    const handleStartItemReceiving = (item: PurchaseOrderItem) => {
        setReceivingItemId(item.id);
        // 未受領数量を初期値として設定
        const unreceived = item.quantity - (item.received_quantity || 0);
        setReceivingQuantity(unreceived > 0 ? unreceived : 0);
        setReceivingLotNumber('');
    };

    // 個別受入確認キャンセル
    const handleCancelItemReceiving = () => {
        setReceivingItemId(null);
        setReceivingQuantity(0);
        setReceivingLotNumber('');
    };

    // 個別受入確認実行
    const handleConfirmItemReceiving = async () => {
        if (!receivingItemId || receivingQuantity <= 0) return;

        setReceivingInProgress(true);
        try {
            await purchasesApi.receivePurchaseOrderItem(receivingItemId, {
                received_quantity: receivingQuantity,
                lot_number: receivingLotNumber || undefined,
            });

            // 発注詳細を再取得
            if (selectedOrder) {
                const updated = await purchasesApi.getPurchaseOrder(selectedOrder.id);
                setSelectedOrder(updated);
            }
            await fetchData();
            handleCancelItemReceiving();
        } catch (error) {
            console.error('Failed to receive item:', error);
            alert('受入確認に失敗しました');
        } finally {
            setReceivingInProgress(false);
        }
    };

    // 受入キャンセル処理（受領済み数量をリセット）
    const handleCancelItemReceivingRecord = async (item: PurchaseOrderItem) => {
        if (!window.confirm(`${item.part_name}の受入をキャンセルしますか？\n受領済み数量と関連する在庫レコードが削除されます。`)) {
            return;
        }

        setCancellingItemId(item.id);
        try {
            await purchasesApi.cancelPurchaseOrderItemReceiving(item.id);

            // 発注詳細を再取得
            if (selectedOrder) {
                const updated = await purchasesApi.getPurchaseOrder(selectedOrder.id);
                setSelectedOrder(updated);
            }
            await fetchData();
            alert('受入をキャンセルしました');
        } catch (error) {
            console.error('Failed to cancel receiving:', error);
            alert('受入キャンセルに失敗しました');
        } finally {
            setCancellingItemId(null);
        }
    };

    // 在庫調整開始
    const handleOpenAdjustmentDialog = (inventory: PurchasedItemInventory) => {
        setAdjustingInventory(inventory);
        setAdjustmentQuantity(0);
        setAdjustmentType('increase');
        setAdjustmentReason('stocktaking');
        setAdjustmentNotes('');
        setAdjustmentDialogOpen(true);
    };

    // 在庫調整キャンセル
    const handleCloseAdjustmentDialog = () => {
        setAdjustmentDialogOpen(false);
        setAdjustingInventory(null);
        setAdjustmentQuantity(0);
        setAdjustmentType('increase');
        setAdjustmentReason('stocktaking');
        setAdjustmentNotes('');
    };

    // 履歴表示
    const handleOpenHistoryDialog = (inventory: PurchasedItemInventory) => {
        setHistoryInventory(inventory);
        setHistoryDialogOpen(true);
    };

    // 履歴閉じる
    const handleCloseHistoryDialog = () => {
        setHistoryDialogOpen(false);
        setHistoryInventory(null);
    };

    // デフォルト製品を設定/解除
    const handleSetDefaultProductForFilters = (productId: number) => {
        const currentDefault = getDefaultProductId();
        if (currentDefault === productId) {
            // 既にデフォルトならば解除
            setDefaultProductId(null);
        } else {
            // デフォルトに設定
            setDefaultProductId(productId);
        }
        // UIを更新するためにre-render（forceUpdate）
        setInventoryProductFilter(prev => prev);
    };

    // 部品詳細ダイアログを開く
    const handleOpenPartDetailDialog = (part: PartWithInventory) => {
        setSelectedPartWithInventory(part);
        setPartDetailDialogOpen(true);
    };

    // 部品詳細ダイアログを閉じる
    const handleClosePartDetailDialog = () => {
        setPartDetailDialogOpen(false);
        setSelectedPartWithInventory(null);
    };

    // 在庫レコード削除ダイアログを開く
    const handleOpenDeleteRecordDialog = (recordId: number) => {
        setDeletingRecordId(recordId);
        setDeleteRecordDialogOpen(true);
    };

    // 在庫レコード削除ダイアログを閉じる
    const handleCloseDeleteRecordDialog = () => {
        setDeleteRecordDialogOpen(false);
        setDeletingRecordId(null);
    };

    // 在庫レコード削除実行
    const handleConfirmDeleteRecord = async () => {
        if (!deletingRecordId) return;

        setDeletingRecordInProgress(true);
        try {
            await purchasesApi.deletePurchasedItemInventory(deletingRecordId);

            // 成功したらデータを再取得
            if (inventoryProductFilter) {
                await fetchPartsWithInventory(inventoryProductFilter);
            }

            // 部品詳細ダイアログを閉じる（データが古くなるため）
            handleClosePartDetailDialog();
            handleCloseDeleteRecordDialog();
            alert('在庫レコードを削除しました');
        } catch (error) {
            console.error('Failed to delete inventory record:', error);
            alert('在庫レコードの削除に失敗しました');
        } finally {
            setDeletingRecordInProgress(false);
        }
    };

    // 在庫調整実行
    const handleConfirmAdjustment = async () => {
        if (!adjustingInventory || adjustmentQuantity <= 0) return;

        setAdjustingInProgress(true);
        try {
            // 増減量を計算（減少の場合は負の値）
            const changeAmount = adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity;
            const newQuantity = adjustingInventory.quantity + changeAmount;

            if (newQuantity < 0) {
                alert('調整後の在庫数が負の値になります');
                setAdjustingInProgress(false);
                return;
            }

            const reasonLabel = InventoryAdjustmentReasonLabels[adjustmentReason];
            const adjustmentNote = `[在庫調整] ${reasonLabel}: ${changeAmount > 0 ? '+' : ''}${changeAmount} (${new Date().toLocaleDateString('ja-JP')})${adjustmentNotes ? ` - ${adjustmentNotes}` : ''}`;
            const existingNotes = adjustingInventory.notes || '';
            const newNotes = existingNotes ? `${existingNotes}\n${adjustmentNote}` : adjustmentNote;

            await purchasesApi.updatePurchasedItemInventory(adjustingInventory.id, {
                quantity: newQuantity,
                notes: newNotes,
            });

            await fetchData();
            handleCloseAdjustmentDialog();
            alert(`在庫を調整しました: ${adjustingInventory.part_number} (${changeAmount > 0 ? '+' : ''}${changeAmount})`);
        } catch (error) {
            console.error('Failed to adjust inventory:', error);
            alert('在庫調整に失敗しました。APIエラーが発生しました。');
        } finally {
            setAdjustingInProgress(false);
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

    // 在庫一覧カラム定義（PartWithInventory用）
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
            field: 'supplier_part_name',
            headerName: '仕入れ先部品名称',
            width: 180,
            valueGetter: (value: string, row: PartWithInventory) =>
                row.supplier_part_name || '-',
        },
        {
            field: 'supplier_name',
            headerName: '仕入先',
            width: 180,
            valueGetter: (value: string, row: PartWithInventory) =>
                row.supplier_branch_name
                    ? `${row.supplier_name} (${row.supplier_branch_name})`
                    : row.supplier_name || '-',
        },
        {
            field: 'total_quantity',
            headerName: '在庫数量',
            width: 120,
            type: 'number',
            renderCell: (params: GridRenderCellParams<PartWithInventory>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', width: '100%' }}>
                    <Chip
                        size="small"
                        label={`${params.value || 0} ${params.row.unit || ''}`}
                        color={params.value && params.value > 0 ? 'primary' : 'default'}
                        variant={params.value && params.value > 0 ? 'filled' : 'outlined'}
                    />
                </Box>
            ),
        },
        {
            field: 'unit',
            headerName: '単位',
            width: 80,
        },
        {
            field: 'actions',
            headerName: '操作',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PartWithInventory>) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="詳細・履歴">
                        <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenPartDetailDialog(params.row)}
                        >
                            <HistoryIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
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
            <Tabs
                value={tabValue}
                onChange={(_: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
                sx={{ mb: 2 }}
            >
                <Tab label="発注一覧" />
                <Tab label="在庫一覧" />
            </Tabs>

            <Paper sx={{ mb: 3 }}>

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
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <FormControl size="small" sx={{ minWidth: 320 }}>
                                    <InputLabel>製品を選択</InputLabel>
                                    <Select
                                        value={inventoryProductFilter}
                                        label="製品を選択"
                                        onChange={(e: SelectChangeEvent<number | ''>) => {
                                            const val = e.target.value as number | '';
                                            setInventoryProductFilter(val);
                                        }}
                                        renderValue={(selected) => {
                                            if (!selected) return '-- 製品を選択してください --';
                                            const product = products.find((p: Product) => p.id === selected);
                                            if (!product) return '-- 製品を選択してください --';
                                            const isDefault = getDefaultProductId() === product.id;
                                            return (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {isDefault && <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                                                    {product.product_number} - {product.product_name}
                                                </Box>
                                            );
                                        }}
                                    >
                                        <MenuItem value="">-- 製品を選択してください --</MenuItem>
                                        {products.map((p: Product) => {
                                            const isDefault = getDefaultProductId() === p.id;
                                            return (
                                                <MenuItem key={p.id} value={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Tooltip title={isDefault ? 'デフォルトを解除' : 'デフォルトに設定'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSetDefaultProductForFilters(p.id);
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
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>
                                {inventoryProductFilter && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setInventoryProductFilter('')}
                                        title="選択解除"
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                )}
                                <IconButton onClick={fetchData} disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </Box>
                        </Paper>

                        {/* 製品未選択時のメッセージ */}
                        {!inventoryProductFilter && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                製品を選択すると、登録されている部品の在庫一覧が表示されます。
                            </Alert>
                        )}

                        {/* 製品別在庫サマリー */}
                        {inventoryProductFilter && productInventorySummaries.length > 0 && (
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>在庫サマリー</Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">部品数</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {filteredPartsWithInventory.length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">在庫あり</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="success.main">
                                            {filteredPartsWithInventory.filter(p => p.total_quantity > 0).length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">在庫なし</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="error.main">
                                            {filteredPartsWithInventory.filter(p => p.total_quantity === 0).length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">合計在庫数量</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {filteredPartsWithInventory.reduce((acc, p) => acc + (p.total_quantity || 0), 0).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {/* 在庫一覧DataGrid */}
                        {inventoryProductFilter && (
                            <DataGrid
                                rows={filteredPartsWithInventory}
                                columns={inventoryColumns}
                                loading={loadingInventory}
                                getRowId={(row: PartWithInventory) => row.part_id}
                                autoHeight
                                pageSizeOptions={[10, 25, 50, 100]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                disableRowSelectionOnClick
                                sx={{ minHeight: 400 }}
                            />
                        )}
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
                    setSupplierFilter('');
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
                                onChange={(e: SelectChangeEvent<number | ''>) => {
                                    setSelectedProductForOrder(e.target.value as number);
                                    setSupplierFilter(''); // 製品変更時にサプライヤーフィルタをリセット
                                }}
                            >
                                {products.map((p: Product) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.product_number} - {p.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* サプライヤーフィルタ */}
                    {supplierPartsGroups.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>仕入先でフィルタ</InputLabel>
                                <Select
                                    value={supplierFilter}
                                    label="仕入先でフィルタ"
                                    onChange={(e: SelectChangeEvent<number | ''>) => setSupplierFilter(e.target.value as number | '')}
                                >
                                    <MenuItem value="">すべての仕入先</MenuItem>
                                    {supplierPartsGroups.map((group: SupplierPartsGroup) => (
                                        <MenuItem key={group.supplier_branch_id} value={group.supplier_branch_id}>
                                            {group.supplier_name} ({group.branch_name}) - {group.parts.length}品目
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {loadingParts && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loadingParts && filteredSupplierPartsGroups.length > 0 && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                仕入先別部品リスト
                                {supplierFilter && (
                                    <Chip
                                        size="small"
                                        label={`フィルタ中: ${filteredSupplierPartsGroups.length}件`}
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Typography>
                            {filteredSupplierPartsGroups.map((group: SupplierPartsGroup) => (
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
                            setSupplierFilter('');
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

            {/* 発注詳細モーダル */}
            <PurchasedItemOrderModal
                open={detailDialogOpen}
                onClose={() => {
                    setDetailDialogOpen(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
                loading={loadingDetail}
                onUpdateStatus={handleUpdateStatus}
                onBulkReceiving={handleBulkReceiving}
                onBulkCount={handleBulkCount}
                receivingItemId={receivingItemId}
                receivingQuantity={receivingQuantity}
                receivingLotNumber={receivingLotNumber}
                receivingInProgress={receivingInProgress}
                onStartItemReceiving={handleStartItemReceiving}
                onCancelItemReceiving={handleCancelItemReceiving}
                onConfirmItemReceiving={handleConfirmItemReceiving}
                onReceivingQuantityChange={setReceivingQuantity}
                onReceivingLotNumberChange={setReceivingLotNumber}
                onCancelItemReceivingRecord={handleCancelItemReceivingRecord}
                cancellingItemId={cancellingItemId}
            />

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

            {/* 在庫調整ダイアログ */}
            <Dialog
                open={adjustmentDialogOpen}
                onClose={handleCloseAdjustmentDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>在庫調整</DialogTitle>
                <DialogContent>
                    {adjustingInventory && (
                        <Box sx={{ mt: 1 }}>
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" color="text.secondary">対象在庫</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {adjustingInventory.part_number} - {adjustingInventory.part_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    製品: {adjustingInventory.product_number || '-'}
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    現在の在庫: {adjustingInventory.quantity} {adjustingInventory.unit || ''}
                                </Typography>
                            </Paper>

                            {/* 増加/減少 ラジオボタン */}
                            <FormControl component="fieldset" sx={{ mb: 2 }}>
                                <FormLabel component="legend">調整タイプ</FormLabel>
                                <RadioGroup
                                    row
                                    value={adjustmentType}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setAdjustmentType(e.target.value as 'increase' | 'decrease')
                                    }
                                >
                                    <FormControlLabel
                                        value="increase"
                                        control={<Radio color="success" />}
                                        label="増加（+）"
                                    />
                                    <FormControlLabel
                                        value="decrease"
                                        control={<Radio color="error" />}
                                        label="減少（-）"
                                    />
                                </RadioGroup>
                            </FormControl>

                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel>調整理由</InputLabel>
                                <Select
                                    value={adjustmentReason}
                                    label="調整理由"
                                    onChange={(e: SelectChangeEvent<InventoryAdjustmentReason>) =>
                                        setAdjustmentReason(e.target.value as InventoryAdjustmentReason)
                                    }
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const quantityInput = document.getElementById('adjustment-quantity-input');
                                            if (quantityInput) quantityInput.focus();
                                        }
                                    }}
                                >
                                    {(Object.keys(InventoryAdjustmentReasonLabels) as InventoryAdjustmentReason[]).map((key) => (
                                        <MenuItem key={key} value={key}>
                                            {InventoryAdjustmentReasonLabels[key]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                id="adjustment-quantity-input"
                                fullWidth
                                label="調整数量"
                                type="number"
                                value={adjustmentQuantity || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = Math.abs(parseInt(e.target.value, 10) || 0);
                                    setAdjustmentQuantity(val);
                                }}
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const notesInput = document.getElementById('adjustment-notes-input');
                                        if (notesInput) notesInput.focus();
                                    }
                                }}
                                inputProps={{ min: 0 }}
                                sx={{ mb: 2 }}
                                helperText={(() => {
                                    const changeAmount = adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity;
                                    const newQty = adjustingInventory.quantity + changeAmount;
                                    return `調整後の在庫: ${newQty} ${adjustingInventory.unit || ''}`;
                                })()}
                            />

                            <TextField
                                id="adjustment-notes-input"
                                fullWidth
                                label="備考"
                                multiline
                                rows={2}
                                value={adjustmentNotes}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setAdjustmentNotes(e.target.value)
                                }
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        const confirmButton = document.getElementById('adjustment-confirm-button');
                                        if (confirmButton) confirmButton.focus();
                                    }
                                }}
                            />

                            {(() => {
                                const changeAmount = adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity;
                                const newQty = adjustingInventory.quantity + changeAmount;
                                if (newQty < 0) {
                                    return (
                                        <Alert severity="error" sx={{ mt: 2 }}>
                                            調整後の在庫数が負の値になります
                                        </Alert>
                                    );
                                }
                                return null;
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdjustmentDialog}>
                        キャンセル
                    </Button>
                    <Button
                        id="adjustment-confirm-button"
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmAdjustment}
                        disabled={(() => {
                            if (adjustingInProgress || adjustmentQuantity <= 0 || !adjustingInventory) return true;
                            const changeAmount = adjustmentType === 'increase' ? adjustmentQuantity : -adjustmentQuantity;
                            const newQty = adjustingInventory.quantity + changeAmount;
                            return newQty < 0;
                        })()}
                    >
                        {adjustingInProgress ? <CircularProgress size={20} /> : '調整実行'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 履歴モーダル */}
            <Dialog
                open={historyDialogOpen}
                onClose={handleCloseHistoryDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    入出庫・調整履歴
                    {historyInventory && (
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {historyInventory.part_number} - {historyInventory.part_name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {historyInventory && (
                        <Box sx={{ mt: 1 }}>
                            {/* 在庫情報サマリー */}
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">製品</Typography>
                                        <Typography>{historyInventory.product_number || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                        <Typography>{historyInventory.supplier_name || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">現在の在庫数量</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {historyInventory.quantity} {historyInventory.unit || ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            {/* 履歴表示 */}
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>履歴</Typography>
                            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                                {historyInventory.notes ? (
                                    <Box>
                                        {historyInventory.notes.split('\n').map((line, index) => {
                                            const isAdjustment = line.includes('[在庫調整]');
                                            return (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        borderLeft: isAdjustment ? '3px solid' : 'none',
                                                        borderColor: line.includes('+') ? 'success.main' : 'error.main',
                                                        bgcolor: isAdjustment ? 'action.hover' : 'transparent',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            whiteSpace: 'pre-wrap',
                                                        }}
                                                    >
                                                        {line}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        履歴はありません
                                    </Typography>
                                )}
                            </Paper>

                            {/* 追加情報 */}
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    ※ 在庫調整を行うと、自動的に履歴が記録されます。
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHistoryDialog}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 部品詳細ダイアログ */}
            <Dialog
                open={partDetailDialogOpen}
                onClose={handleClosePartDetailDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    部品詳細・在庫履歴
                    {selectedPartWithInventory && (
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {selectedPartWithInventory.part_number} - {selectedPartWithInventory.part_name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {selectedPartWithInventory && (
                        <Box sx={{ mt: 1 }}>
                            {/* 部品情報サマリー */}
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">製品</Typography>
                                        <Typography>{selectedPartWithInventory.product_number || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                        <Typography>
                                            {selectedPartWithInventory.supplier_branch_name
                                                ? `${selectedPartWithInventory.supplier_name} (${selectedPartWithInventory.supplier_branch_name})`
                                                : selectedPartWithInventory.supplier_name || '-'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">仕入れ先部品名称</Typography>
                                        <Typography>{selectedPartWithInventory.supplier_part_name || '-'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">現在の在庫数量</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {selectedPartWithInventory.total_quantity} {selectedPartWithInventory.unit || ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            {/* 在庫レコード一覧 */}
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>在庫レコード履歴</Typography>
                            {selectedPartWithInventory.inventory_records && selectedPartWithInventory.inventory_records.length > 0 ? (
                                <TableContainer component={Paper}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell>入庫日</TableCell>
                                                <TableCell align="right">数量</TableCell>
                                                <TableCell>ロット番号</TableCell>
                                                <TableCell>発注番号</TableCell>
                                                <TableCell>備考</TableCell>
                                                <TableCell>登録者</TableCell>
                                                <TableCell align="center">操作</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedPartWithInventory.inventory_records.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell>{record.received_date || '-'}</TableCell>
                                                    <TableCell align="right">
                                                        <Chip
                                                            size="small"
                                                            label={`${record.quantity} ${selectedPartWithInventory.unit || ''}`}
                                                            color={record.quantity > 0 ? 'primary' : 'default'}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{record.lot_number || '-'}</TableCell>
                                                    <TableCell>{record.order_number || '-'}</TableCell>
                                                    <TableCell>
                                                        {record.notes ? (
                                                            <Tooltip title={record.notes}>
                                                                <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {record.notes}
                                                                </Typography>
                                                            </Tooltip>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell>{record.created_by_name || '-'}</TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title="削除">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleOpenDeleteRecordDialog(record.id)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="info">
                                    在庫レコードはありません。
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePartDetailDialog}>
                        閉じる
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 在庫レコード削除確認ダイアログ */}
            <Dialog
                open={deleteRecordDialogOpen}
                onClose={handleCloseDeleteRecordDialog}
            >
                <DialogTitle>在庫レコード削除確認</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        この在庫レコードを削除しますか？<br />
                        削除すると元に戻すことはできません。
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteRecordDialog}>
                        キャンセル
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDeleteRecord}
                        disabled={deletingRecordInProgress}
                    >
                        {deletingRecordInProgress ? <CircularProgress size={20} /> : '削除'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
