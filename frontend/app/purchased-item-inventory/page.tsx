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
    ExpandMore as ExpandMoreIcon,
    Send as SendIcon,
    Inventory as InventoryIcon,
    LocalShipping as ReceivingIcon,
    History as HistoryIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
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
    PartWithInventory,
    PendingOrderItemForReceiving,
} from '@/types/purchases';
import { Product } from '@/types/product';
import { PurchasedItemOrderModal } from '@/components/PurchasedItemInventory';

// localStorage キー
const DEFAULT_PRODUCT_KEY = 'purchased_item_inventory_default_product';

// 平日計算関数（土日を除いて日数を加算）
const addBusinessDays = (startDate: Date, businessDays: number): Date => {
    const result = new Date(startDate);
    let addedDays = 0;

    while (addedDays < businessDays) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        // 土曜(6)と日曜(0)は除外
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }

    return result;
};

// 日付をYYYY-MM-DD形式に変換
const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 今日の日付をYYYY-MM-DD形式で取得
const getTodayString = (): string => {
    return formatDateToString(new Date());
};

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

export default function PurchasedItemInventoryPage() {

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
    const [selectedSupplier, setSelectedSupplier] = useState<number | ''>(''); // 仕入先選択（必須）
    const [orderDate, setOrderDate] = useState<string>(getTodayString()); // 発注日
    const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>(''); // 希望納期（手動設定）

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

    // 受入一覧タブ関連
    const [pendingOrderItems, setPendingOrderItems] = useState<PendingOrderItemForReceiving[]>([]);
    const [loadingPendingItems, setLoadingPendingItems] = useState(false);
    const [receivingProductFilter, setReceivingProductFilter] = useState<number | ''>('');
    const [receivingQuantities, setReceivingQuantities] = useState<Record<number, number>>({}); // part_id -> 受入数量
    const [processingReceiving, setProcessingReceiving] = useState(false);

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

    // 選択されたサプライヤーの部品グループ（サプライヤー必須選択）
    const selectedSupplierGroup = useMemo(() => {
        if (!selectedSupplier) return null;
        return supplierPartsGroups.find(
            (group: SupplierPartsGroup) => group.supplier_branch_id === selectedSupplier
        ) || null;
    }, [supplierPartsGroups, selectedSupplier]);

    // 納期自動計算（発注日 + リードタイム（平日））
    const calculateDeliveryDate = useCallback((leadTimeDays: number | undefined): string => {
        if (!leadTimeDays || !orderDate) return '-';
        const startDate = new Date(orderDate);
        const deliveryDate = addBusinessDays(startDate, leadTimeDays);
        return formatDateToString(deliveryDate);
    }, [orderDate]);

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
                setReceivingProductFilter(defaultId);
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

    // 受入一覧用：製品ごとの受入待ち部品を取得
    const fetchPendingOrderItems = useCallback(async (productId: number) => {
        setLoadingPendingItems(true);
        try {
            const data = await purchasesApi.getPendingOrderItemsForReceiving({ product: productId });
            setPendingOrderItems(data);
            // 受入数量をリセット
            setReceivingQuantities({});
        } catch (error) {
            console.error('Failed to fetch pending order items:', error);
            setPendingOrderItems([]);
        } finally {
            setLoadingPendingItems(false);
        }
    }, []);

    // 受入タブの製品フィルタ変更時にデータを取得
    useEffect(() => {
        if (receivingProductFilter) {
            fetchPendingOrderItems(receivingProductFilter);
        } else {
            setPendingOrderItems([]);
            setReceivingQuantities({});
        }
    }, [receivingProductFilter, fetchPendingOrderItems]);

    // 部品の受入処理（発注番号の若い順に消化）
    const handleReceivePartQuantity = async (partId: number) => {
        if (!receivingProductFilter) return;

        const quantity = receivingQuantities[partId];
        if (!quantity || quantity <= 0) {
            alert('受入数量を入力してください');
            return;
        }

        setProcessingReceiving(true);
        try {
            const result = await purchasesApi.receivePartByQuantity({
                part_id: partId,
                product_id: receivingProductFilter,
                quantity: quantity,
            });

            alert(result.message);

            // 受入後、データを再取得
            await fetchPendingOrderItems(receivingProductFilter);
            await fetchData();

            // 入力欄をクリア
            setReceivingQuantities(prev => ({
                ...prev,
                [partId]: 0,
            }));
        } catch (error: unknown) {
            console.error('Failed to receive part:', error);
            const errMessage = error instanceof Error ? error.message : '受入処理に失敗しました';
            alert(errMessage);
        } finally {
            setProcessingReceiving(false);
        }
    };

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

    // 発注数量の自動計算
    // MOQ: 最低発注数量以上ならどの値でもOK（最低発注数量未満の場合は最低発注数量に）
    // SPQ: 最低発注数量が1ロットとなるため、最低発注数量の倍数に切り上げ
    const calculateOrderQuantity = useCallback((
        inputQuantity: number,
        orderType: string,
        minimumOrderQuantity: number
    ): number => {
        if (inputQuantity <= 0) return 0;

        // 最低発注数量より少ない場合は最低発注数量にする
        if (inputQuantity < minimumOrderQuantity) {
            return minimumOrderQuantity;
        }

        // SPQの場合は最低発注数量の倍数に切り上げ
        if (orderType === 'SPQ') {
            const lots = Math.ceil(inputQuantity / minimumOrderQuantity);
            return lots * minimumOrderQuantity;
        }

        // MOQ・その他の場合はそのまま
        return inputQuantity;
    }, []);

    // 発注数量確定時の処理（Enter押下またはフォーカス離脱時）
    const handleQuantityConfirm = useCallback((part: PartForOrder) => {
        const currentQuantity = orderQuantities[part.id] || 0;
        const calculatedQuantity = calculateOrderQuantity(
            currentQuantity,
            part.order_type,
            part.minimum_order_quantity
        );

        if (calculatedQuantity !== currentQuantity) {
            setOrderQuantities((prev: Record<number, number>) => ({
                ...prev,
                [part.id]: calculatedQuantity,
            }));
        }
    }, [orderQuantities, calculateOrderQuantity]);

    // Enterキーで次の入力フィールドに移動
    const handleQuantityKeyDown = useCallback((
        e: React.KeyboardEvent<HTMLInputElement>,
        part: PartForOrder
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // 数量確定処理を実行
            handleQuantityConfirm(part);

            // 次のテキストフィールドにフォーカスを移動
            // data-order-indexを使用して次のフィールドを特定
            const target = e.target as HTMLInputElement;
            const currentOrderIndex = target.getAttribute('data-order-index');
            if (!currentOrderIndex) return;

            const allInputs = document.querySelectorAll<HTMLInputElement>('input[data-order-index]');
            const inputsArray = Array.from(allInputs);
            const currentIndex = inputsArray.findIndex(input => input.getAttribute('data-order-index') === currentOrderIndex);

            if (currentIndex !== -1 && currentIndex < inputsArray.length - 1) {
                const nextInput = inputsArray[currentIndex + 1];
                // 次のフィールドにフォーカスを設定
                setTimeout(() => {
                    nextInput.focus();
                    nextInput.select();
                }, 0);
            }
        }
    }, [handleQuantityConfirm]);

    // 発注作成
    const handleCreateOrders = async () => {
        if (!selectedProductForOrder) return;
        if (!selectedSupplier) {
            setOrderError('仕入先を選択してください');
            return;
        }

        // 選択されたサプライヤーの部品のみから数量が入力されているものを抽出
        const selectedGroup = supplierPartsGroups.find(g => g.supplier_branch_id === selectedSupplier);
        if (!selectedGroup) {
            setOrderError('仕入先が見つかりません');
            return;
        }

        const partIdsInGroup = selectedGroup.parts.map(p => p.id);
        const entries = Object.entries(orderQuantities) as [string, number][];
        const itemsWithQuantity = entries
            .filter(([partId, qty]) => qty > 0 && partIdsInGroup.includes(parseInt(partId, 10)))
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
                order_date: orderDate || undefined,
                requested_delivery_date: requestedDeliveryDate || undefined,
            });

            // 成功したら閉じてリロード
            setCreateOrderDialogOpen(false);
            setSelectedProductForOrder('');
            setOrderQuantities({});
            setSelectedSupplier('');
            setOrderDate(getTodayString());
            setRequestedDeliveryDate('');
            await fetchData();
            alert(result.message);
        } catch (error) {
            console.error('Failed to create orders:', error);
            setOrderError('発注の作成に失敗しました');
        } finally {
            setCreatingOrder(false);
        }
    };

    // 発注作成モダールを開く
    const handleOpenCreateOrderDialog = () => {
        setCreateOrderDialogOpen(true);
        // デフォルト製品があれば設定
        const defaultId = getDefaultProductId();
        if (defaultId && products.some(p => p.id === defaultId)) {
            setSelectedProductForOrder(defaultId);
        } else {
            setSelectedProductForOrder('');
        }
        setOrderQuantities({});
        setOrderError(null);
        setSelectedSupplier('');
        setOrderDate(getTodayString());
        setRequestedDeliveryDate('');
    };

    // 発注作成モダール用のデフォルト製品を設定/解除
    const handleToggleDefaultProductForOrder = (productId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentDefault = getDefaultProductId();
        if (currentDefault === productId) {
            // 既にデフォルトならば解除
            setDefaultProductId(null);
        } else {
            // デフォルトに設定
            setDefaultProductId(productId);
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
                const total = params.row.total_items || 0;

                return (

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        width: '100%',
                        pl: 1 // セルの左側に少しだけ余白
                    }}>
                        <Tooltip title="受入済">
                            <Chip
                                size="small"
                                label={`${received}/${total}`}
                                color={received === total && total > 0 ? 'success' : 'default'}
                                variant="outlined"
                                icon={<ReceivingIcon />}
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
            width: 300,
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
            width: 200,
            type: 'number',
            valueFormatter: (value, row) => {
                return `${value || 0} ${row.unit || ''}`;
            },
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
                        onClick={handleOpenCreateOrderDialog}
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
                <Tab label="受入一覧" icon={<ReceivingIcon fontSize="small" />} iconPosition="start" />
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

                {/* 受入一覧タブ */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        {/* 製品フィルタ */}
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <FormControl size="small" sx={{ minWidth: 320 }}>
                                    <InputLabel>製品を選択</InputLabel>
                                    <Select
                                        value={receivingProductFilter}
                                        label="製品を選択"
                                        onChange={(e: SelectChangeEvent<number | ''>) => {
                                            const val = e.target.value as number | '';
                                            setReceivingProductFilter(val);
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
                                {receivingProductFilter && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setReceivingProductFilter('')}
                                        title="選択解除"
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                )}
                                <IconButton
                                    onClick={() => receivingProductFilter && fetchPendingOrderItems(receivingProductFilter)}
                                    disabled={loadingPendingItems || !receivingProductFilter}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Box>
                        </Paper>

                        {/* 製品未選択時のメッセージ */}
                        {!receivingProductFilter && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                製品を選択すると、発注済みで受入待ちの部品一覧が表示されます。
                            </Alert>
                        )}

                        {/* ローディング */}
                        {loadingPendingItems && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        {/* 受入待ち部品が無い場合 */}
                        {receivingProductFilter && !loadingPendingItems && pendingOrderItems.length === 0 && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                受入待ちの部品はありません。
                            </Alert>
                        )}

                        {/* 受入待ち部品サマリー */}
                        {receivingProductFilter && !loadingPendingItems && pendingOrderItems.length > 0 && (
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>受入待ちサマリー</Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">部品数</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {pendingOrderItems.length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">合計注文残</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="warning.main">
                                            {pendingOrderItems.reduce((acc, item) => acc + item.total_remaining, 0).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {/* 受入一覧テーブル */}
                        {receivingProductFilter && !loadingPendingItems && pendingOrderItems.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>発注番号</TableCell>
                                            <TableCell>部品番号</TableCell>
                                            <TableCell>部品名</TableCell>
                                            <TableCell>仕入先</TableCell>
                                            <TableCell align="right">発注数</TableCell>
                                            <TableCell align="right">注文残</TableCell>
                                            <TableCell align="center" sx={{ width: 200 }}>受入入力</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingOrderItems.map((item) => (
                                            <React.Fragment key={item.part_id}>
                                                {item.orders.map((order, orderIndex) => (
                                                    <TableRow key={`${item.part_id}-${order.order_item_id}`}>
                                                        <TableCell>
                                                            <Button
                                                                size="small"
                                                                onClick={() => handleViewOrder(order.order_id)}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                {order.order_number}
                                                            </Button>
                                                        </TableCell>
                                                        {orderIndex === 0 && (
                                                            <>
                                                                <TableCell rowSpan={item.orders.length}>
                                                                    {item.part_number}
                                                                </TableCell>
                                                                <TableCell rowSpan={item.orders.length}>
                                                                    {item.part_name}
                                                                </TableCell>
                                                                <TableCell rowSpan={item.orders.length}>
                                                                    {item.supplier_name || '-'}
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        <TableCell align="right">
                                                            {order.quantity.toLocaleString()} {item.unit}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                size="small"
                                                                label={`${order.remaining_quantity.toLocaleString()} ${item.unit}`}
                                                                color={order.remaining_quantity > 0 ? 'warning' : 'success'}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        {orderIndex === 0 && (
                                                            <TableCell rowSpan={item.orders.length} align="center">
                                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                                    <TextField
                                                                        type="number"
                                                                        size="small"
                                                                        value={receivingQuantities[item.part_id] || ''}
                                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                            const val = parseInt(e.target.value, 10) || 0;
                                                                            setReceivingQuantities(prev => ({
                                                                                ...prev,
                                                                                [item.part_id]: val,
                                                                            }));
                                                                        }}
                                                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleReceivePartQuantity(item.part_id);
                                                                            }
                                                                        }}
                                                                        placeholder="数量"
                                                                        inputProps={{ min: 1, max: item.total_remaining }}
                                                                        sx={{ width: 100 }}
                                                                    />
                                                                    <Tooltip title="受入実行（発注番号の若い順に消化）">
                                                                        <span>
                                                                            <Button
                                                                                variant="contained"
                                                                                size="small"
                                                                                onClick={() => handleReceivePartQuantity(item.part_id)}
                                                                                disabled={processingReceiving || !receivingQuantities[item.part_id]}
                                                                            >
                                                                                {processingReceiving ? (
                                                                                    <CircularProgress size={16} />
                                                                                ) : (
                                                                                    '受入'
                                                                                )}
                                                                            </Button>
                                                                        </span>
                                                                    </Tooltip>
                                                                </Box>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* 使い方の説明 */}
                        {receivingProductFilter && !loadingPendingItems && pendingOrderItems.length > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    • 受入数量を入力して「受入」ボタンをクリックすると、発注番号の若い順から在庫に追加されます。<br />
                                    • 発注数量を満たすと自動的に発注ステータスが更新されます。
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </TabPanel>

                {/* 在庫一覧タブ */}
                <TabPanel value={tabValue} index={2}>
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
                    setSelectedSupplier('');
                    setOrderDate(getTodayString());
                    setRequestedDeliveryDate('');
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

                    {/* 製品選択 */}
                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                            <InputLabel>製品を選択 *</InputLabel>
                            <Select
                                value={selectedProductForOrder}
                                label="製品を選択 *"
                                onChange={(e: SelectChangeEvent<number | ''>) => {
                                    setSelectedProductForOrder(e.target.value as number);
                                    setSelectedSupplier(''); // 製品変更時にサプライヤー選択をリセット
                                    setOrderQuantities({});
                                }}
                                renderValue={(selected) => {
                                    if (!selected) return '';
                                    const product = products.find(p => p.id === selected);
                                    if (!product) return '';
                                    const isDefault = getDefaultProductId() === product.id;
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {isDefault && <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                                            {product.product_number} - {product.product_name}
                                        </Box>
                                    );
                                }}
                            >
                                {products.map((p: Product) => {
                                    const isDefault = getDefaultProductId() === p.id;
                                    return (
                                        <MenuItem key={p.id} value={p.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <Tooltip title={isDefault ? 'デフォルト解除' : 'デフォルトに設定'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleToggleDefaultProductForOrder(p.id, e)}
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
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            ★をクリックするとデフォルト製品に設定できます
                        </Typography>
                    </Box>

                    {/* 仕入先選択（必須） */}
                    {supplierPartsGroups.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <FormControl fullWidth size="small" required>
                                <InputLabel>仕入先を選択 *</InputLabel>
                                <Select
                                    value={selectedSupplier}
                                    label="仕入先を選択 *"
                                    onChange={(e: SelectChangeEvent<number | ''>) => {
                                        setSelectedSupplier(e.target.value as number);
                                        setOrderQuantities({}); // 仕入先変更時に発注数量をリセット
                                    }}
                                >
                                    <MenuItem value="" disabled>
                                        -- 仕入先を選択してください --
                                    </MenuItem>
                                    {supplierPartsGroups.map((group: SupplierPartsGroup) => (
                                        <MenuItem key={group.supplier_branch_id} value={group.supplier_branch_id}>
                                            {group.supplier_name} ({group.branch_name}) - {group.parts.length}品目
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                発注は仕入先ごとに作成されます。先に仕入先を選択してください。
                            </Typography>
                        </Box>
                    )}

                    {/* 発注日・納期設定 */}
                    {selectedSupplier && (
                        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>発注日・納期設定</Typography>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <TextField
                                    label="発注日"
                                    type="date"
                                    size="small"
                                    value={orderDate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ width: 180 }}
                                />
                                <TextField
                                    label="希望納期（任意）"
                                    type="date"
                                    size="small"
                                    value={requestedDeliveryDate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestedDeliveryDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ width: 180 }}
                                    helperText="リードタイムより短い納期も設定可能"
                                />
                            </Box>
                        </Paper>
                    )}

                    {loadingParts && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* 仕入先未選択時のメッセージ */}
                    {!loadingParts && selectedProductForOrder && supplierPartsGroups.length > 0 && !selectedSupplier && (
                        <Alert severity="info">
                            仕入先を選択すると、部品リストが表示されます。
                        </Alert>
                    )}

                    {/* 選択した仕入先の部品リスト */}
                    {!loadingParts && selectedSupplierGroup && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                部品リスト: {selectedSupplierGroup.supplier_name} ({selectedSupplierGroup.branch_name})
                                <Chip
                                    size="small"
                                    label={`${selectedSupplierGroup.parts.length}品目`}
                                    sx={{ ml: 1 }}
                                    color="primary"
                                />
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>部品番号</TableCell>
                                            <TableCell>部品名</TableCell>
                                            <TableCell>単位</TableCell>
                                            <TableCell>発注区分</TableCell>
                                            <TableCell align="right">最小発注数</TableCell>
                                            <TableCell align="right">単価</TableCell>
                                            <TableCell align="center">リードタイム</TableCell>
                                            <TableCell align="center">納期予定</TableCell>
                                            <TableCell align="right" sx={{ width: 120 }}>発注数量</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedSupplierGroup.parts.map((part: PartForOrder, partIndex: number) => (
                                            <TableRow key={part.id}>
                                                <TableCell>{part.part_number}</TableCell>
                                                <TableCell>{part.part_name}</TableCell>
                                                <TableCell>{part.unit}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={part.order_type}
                                                        size="small"
                                                        color={part.order_type === 'SPQ' ? 'primary' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{part.minimum_order_quantity}</TableCell>
                                                <TableCell align="right">
                                                    {part.current_price
                                                        ? `¥${part.current_price.toLocaleString()}`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {part.lead_time_days
                                                        ? `${part.lead_time_days}日`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {requestedDeliveryDate ? (
                                                        <Tooltip title="希望納期が設定されています">
                                                            <Chip
                                                                size="small"
                                                                label={requestedDeliveryDate}
                                                                color="info"
                                                                variant="outlined"
                                                            />
                                                        </Tooltip>
                                                    ) : part.lead_time_days ? (
                                                        <Tooltip title={`発注日 + ${part.lead_time_days}営業日`}>
                                                            <span>{calculateDeliveryDate(part.lead_time_days)}</span>
                                                        </Tooltip>
                                                    ) : '-'}
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
                                                        onBlur={() => handleQuantityConfirm(part)}
                                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                            handleQuantityKeyDown(e, part);
                                                        }}
                                                        inputProps={{
                                                            min: 0,
                                                            'data-order-index': `0-${partIndex}`,
                                                        }}
                                                        sx={{ width: 100 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
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
                            setSelectedSupplier('');
                            setOrderDate(getTodayString());
                            setRequestedDeliveryDate('');
                        }}
                    >
                        キャンセル
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateOrders}
                        disabled={creatingOrder || !selectedProductForOrder || !selectedSupplier || Object.values(orderQuantities).every(q => q === 0)}
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
