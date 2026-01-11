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
    FormControlLabel,
    Checkbox,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Chip,
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
import {
    PurchasedItemOrderModal,
    CreateOrderDialog,
    DeleteOrderConfirmDialog,
    InventoryHistoryDialog,
    PartDetailDialog,
    DeleteInventoryRecordDialog,
} from '@/components/PurchasedItemInventory';

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
    const [partsWithInventory, setPartsWithInventory] = useState<PartWithInventory[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingInventory, setLoadingInventory] = useState(false);

    // フィルタ
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
    const [productFilter, setProductFilter] = useState<number | ''>('');
    const [inventoryProductFilter, setInventoryProductFilter] = useState<number | ''>('');

    // 完了済み表示フィルタ
    const [showCompletedOrders, setShowCompletedOrders] = useState(false);

    // 発注作成モーダル関連
    const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
    const [selectedProductForOrder, setSelectedProductForOrder] = useState<number | ''>('');
    const [supplierPartsGroups, setSupplierPartsGroups] = useState<SupplierPartsGroup[]>([]);
    const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});
    const [loadingParts, setLoadingParts] = useState(false);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
    const [orderDate, setOrderDate] = useState<string>(getTodayString());
    const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>('');

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
    const [receivingSupplierFilter, setReceivingSupplierFilter] = useState<string>('');
    const [receivingQuantities, setReceivingQuantities] = useState<Record<number, number>>({});
    const [processingReceiving, setProcessingReceiving] = useState(false);

    // フィルタリングされた発注一覧
    const filteredOrders = useMemo(() => {
        let result = orders;

        // 完了済み（received, completed）をデフォルトで非表示
        if (!showCompletedOrders) {
            result = result.filter((o: PurchaseOrder) =>
                o.status !== 'received' && o.status !== 'completed'
            );
        }

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
    }, [orders, searchText, statusFilter, productFilter, showCompletedOrders]);

    // フィルタリングされた在庫一覧（partsWithInventoryを使用）
    const filteredPartsWithInventory = useMemo(() => {
        return partsWithInventory;
    }, [partsWithInventory]);

    // 受入一覧タブ：仕入先一覧を抽出
    const receivingSupplierList = useMemo(() => {
        const suppliers = new Set<string>();
        pendingOrderItems.forEach((item) => {
            const supplierDisplay = item.supplier_branch_name
                ? `${item.supplier_name} (${item.supplier_branch_name})`
                : item.supplier_name || '';
            if (supplierDisplay) {
                suppliers.add(supplierDisplay);
            }
        });
        return Array.from(suppliers).sort();
    }, [pendingOrderItems]);

    // フィルタリングされた受入待ち部品一覧
    const filteredPendingOrderItems = useMemo(() => {
        if (!receivingSupplierFilter) return pendingOrderItems;
        return pendingOrderItems.filter((item) => {
            const supplierDisplay = item.supplier_branch_name
                ? `${item.supplier_name} (${item.supplier_branch_name})`
                : item.supplier_name || '';
            return supplierDisplay === receivingSupplierFilter;
        });
    }, [pendingOrderItems, receivingSupplierFilter]);

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
            const [ordersData, productsData] = await Promise.all([
                purchasesApi.getPurchaseOrders(),
                productApi.getProducts(),
            ]);
            setOrders(ordersData);
            setProducts(productsData);
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

    // 入力されている部品の数を取得
    const getInputtedPartsCount = () => {
        return Object.entries(receivingQuantities).filter(([, qty]) => qty > 0).length;
    };

    // 受入一覧入力でEnterキーで次の入力に移動
    const handleReceivingKeyDown = useCallback((
        e: React.KeyboardEvent<HTMLInputElement>,
        partId: number
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            const allInputs = document.querySelectorAll<HTMLInputElement>('input[data-receiving-index]');
            const inputsArray = Array.from(allInputs);
            const currentIndex = inputsArray.findIndex(
                input => input.getAttribute('data-receiving-index') === String(partId)
            );

            if (currentIndex !== -1 && currentIndex < inputsArray.length - 1) {
                const nextInput = inputsArray[currentIndex + 1];
                setTimeout(() => {
                    nextInput.focus();
                    nextInput.select();
                }, 0);
            }
        }
    }, []);

    // 一括受入処理
    const handleBulkReceive = async () => {
        if (!receivingProductFilter) return;

        // 入力されている部品を抽出
        const itemsToReceive = Object.entries(receivingQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([partId, quantity]) => ({
                part_id: parseInt(partId, 10),
                quantity: quantity,
            }));

        if (itemsToReceive.length === 0) {
            alert('受入数量を入力してください');
            return;
        }

        if (!window.confirm(`${itemsToReceive.length}件の部品を受入登録します。よろしいですか？`)) {
            return;
        }

        setProcessingReceiving(true);
        try {
            const result = await purchasesApi.bulkReceiveParts({
                product_id: receivingProductFilter,
                items: itemsToReceive,
            });

            alert(result.message);

            // リストを更新
            await fetchPendingOrderItems(receivingProductFilter);
            await fetchData();

            // 入力をクリア
            setReceivingQuantities({});
        } catch (error: unknown) {
            console.error('Failed to bulk receive parts:', error);
            const errMessage = error instanceof Error ? error.message : '一括受入処理に失敗しました';
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
    const calculateOrderQuantity = useCallback((
        inputQuantity: number,
        orderType: string,
        minimumOrderQuantity: number
    ): number => {
        if (inputQuantity <= 0) return 0;

        if (inputQuantity < minimumOrderQuantity) {
            return minimumOrderQuantity;
        }

        if (orderType === 'SPQ') {
            const lots = Math.ceil(inputQuantity / minimumOrderQuantity);
            return lots * minimumOrderQuantity;
        }

        return inputQuantity;
    }, []);

    // 発注数量確定時の処理
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
            handleQuantityConfirm(part);

            const target = e.target as HTMLInputElement;
            const currentOrderIndex = target.getAttribute('data-order-index');
            if (!currentOrderIndex) return;

            const allInputs = document.querySelectorAll<HTMLInputElement>('input[data-order-index]');
            const inputsArray = Array.from(allInputs);
            const currentIndex = inputsArray.findIndex(input => input.getAttribute('data-order-index') === currentOrderIndex);

            if (currentIndex !== -1 && currentIndex < inputsArray.length - 1) {
                const nextInput = inputsArray[currentIndex + 1];
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

            handleCloseCreateOrderDialog();
            await fetchData();
            // 受入一覧タブのデータも更新（製品が選択されている場合）
            if (receivingProductFilter) {
                await fetchPendingOrderItems(receivingProductFilter);
            }
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

    // 発注作成モダールを閉じる
    const handleCloseCreateOrderDialog = () => {
        setCreateOrderDialogOpen(false);
        setSelectedProductForOrder('');
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
            setDefaultProductId(null);
        } else {
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


    // 個別受入確認開始
    const handleStartItemReceiving = (item: PurchaseOrderItem) => {
        setReceivingItemId(item.id);
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

            if (selectedOrder) {
                const updated = await purchasesApi.getPurchaseOrder(selectedOrder.id);
                setSelectedOrder(updated);
            }
            await fetchData();
            // 受入一覧タブのデータも更新（製品が選択されている場合）
            if (receivingProductFilter) {
                await fetchPendingOrderItems(receivingProductFilter);
            }
            handleCancelItemReceiving();
        } catch (error) {
            console.error('Failed to receive item:', error);
            alert('受入確認に失敗しました');
        } finally {
            setReceivingInProgress(false);
        }
    };

    // 受入キャンセル処理
    const handleCancelItemReceivingRecord = async (item: PurchaseOrderItem) => {
        if (!window.confirm(`${item.part_name}の受入をキャンセルしますか？\n受領済み数量と関連する在庫レコードが削除されます。`)) {
            return;
        }

        setCancellingItemId(item.id);
        try {
            await purchasesApi.cancelPurchaseOrderItemReceiving(item.id);

            if (selectedOrder) {
                const updated = await purchasesApi.getPurchaseOrder(selectedOrder.id);
                setSelectedOrder(updated);
            }
            await fetchData();
            // 受入一覧タブのデータも更新（製品が選択されている場合）
            if (receivingProductFilter) {
                await fetchPendingOrderItems(receivingProductFilter);
            }
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
            setDefaultProductId(null);
        } else {
            setDefaultProductId(productId);
        }
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

            if (inventoryProductFilter) {
                await fetchPartsWithInventory(inventoryProductFilter);
            }

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
                        pl: 1
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

    // 在庫一覧カラム定義
    const inventoryColumns: GridColDef[] = [
        {
            field: 'part_number',
            headerName: '品番',
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
                <Box sx={{ display: 'flex', gap: 0.5, height: '100%' }}>
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
                <Tab label="受入一覧" />
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
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showCompletedOrders}
                                        onChange={(e) => setShowCompletedOrders(e.target.checked)}
                                    />
                                }
                                label="完了済みを表示"
                            />
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

                                {/* 仕入先フィルタ */}
                                {receivingProductFilter && receivingSupplierList.length > 0 && (
                                    <>
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <InputLabel>仕入先</InputLabel>
                                            <Select
                                                value={receivingSupplierFilter}
                                                label="仕入先"
                                                onChange={(e: SelectChangeEvent<string>) => {
                                                    setReceivingSupplierFilter(e.target.value);
                                                }}
                                            >
                                                <MenuItem value="">すべて</MenuItem>
                                                {receivingSupplierList.map((supplier) => (
                                                    <MenuItem key={supplier} value={supplier}>
                                                        {supplier}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        {receivingSupplierFilter && (
                                            <IconButton
                                                size="small"
                                                onClick={() => setReceivingSupplierFilter('')}
                                                title="仕入先フィルタ解除"
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                        )}
                                    </>
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
                        {receivingProductFilter && !loadingPendingItems && filteredPendingOrderItems.length > 0 && (
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    受入待ちサマリー
                                    {receivingSupplierFilter && (
                                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                                            （{receivingSupplierFilter}でフィルタ中: {filteredPendingOrderItems.length}/{pendingOrderItems.length}件）
                                        </Typography>
                                    )}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">部品数</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {filteredPendingOrderItems.length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">合計注文残</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="warning.main">
                                            {filteredPendingOrderItems.reduce((acc, item) => acc + item.total_remaining, 0).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {/* 受入一覧テーブル */}
                        {receivingProductFilter && !loadingPendingItems && filteredPendingOrderItems.length > 0 && (
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
                                            <TableCell align="center" sx={{ width: 150 }}>受入数量</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredPendingOrderItems.map((item) => (
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
                                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                                                                        handleReceivingKeyDown(e, item.part_id)
                                                                    }
                                                                    placeholder="数量"
                                                                    inputProps={{
                                                                        min: 1,
                                                                        max: item.total_remaining,
                                                                        'data-receiving-index': item.part_id,
                                                                    }}
                                                                    sx={{ width: 100 }}
                                                                />
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

                        {/* 一括受入登録ボタン */}
                        {receivingProductFilter && !loadingPendingItems && filteredPendingOrderItems.length > 0 && (
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    入力済み: {getInputtedPartsCount()} 件
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={processingReceiving ? <CircularProgress size={20} color="inherit" /> : <ReceivingIcon />}
                                    onClick={handleBulkReceive}
                                    disabled={processingReceiving || getInputtedPartsCount() === 0}
                                >
                                    一括受入登録
                                </Button>
                            </Box>
                        )}

                        {/* 使い方の説明 */}
                        {receivingProductFilter && !loadingPendingItems && filteredPendingOrderItems.length > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    • 各部品の受入数量を入力してから「一括受入登録」ボタンをクリックしてください。<br />
                                    • 入力された全ての部品が発注番号の若い順から在庫に追加されます。<br />
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
            <CreateOrderDialog
                open={createOrderDialogOpen}
                onClose={handleCloseCreateOrderDialog}
                products={products}
                selectedProductForOrder={selectedProductForOrder}
                setSelectedProductForOrder={setSelectedProductForOrder}
                selectedSupplier={selectedSupplier}
                setSelectedSupplier={setSelectedSupplier}
                supplierPartsGroups={supplierPartsGroups}
                orderQuantities={orderQuantities}
                setOrderQuantities={setOrderQuantities}
                orderError={orderError}
                loadingParts={loadingParts}
                creatingOrder={creatingOrder}
                orderDate={orderDate}
                setOrderDate={setOrderDate}
                requestedDeliveryDate={requestedDeliveryDate}
                setRequestedDeliveryDate={setRequestedDeliveryDate}
                onCreateOrders={handleCreateOrders}
                onQuantityConfirm={handleQuantityConfirm}
                onQuantityKeyDown={handleQuantityKeyDown}
                calculateDeliveryDate={calculateDeliveryDate}
                getDefaultProductId={getDefaultProductId}
                onToggleDefaultProduct={handleToggleDefaultProductForOrder}
            />

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
            <DeleteOrderConfirmDialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDeletingOrder(null);
                }}
                order={deletingOrder}
                onConfirm={handleDeleteOrder}
            />

            {/* 履歴モーダル */}
            <InventoryHistoryDialog
                open={historyDialogOpen}
                onClose={handleCloseHistoryDialog}
                inventory={historyInventory}
            />

            {/* 部品詳細ダイアログ */}
            <PartDetailDialog
                open={partDetailDialogOpen}
                onClose={handleClosePartDetailDialog}
                part={selectedPartWithInventory}
                onDeleteRecord={handleOpenDeleteRecordDialog}
            />

            {/* 在庫レコード削除確認ダイアログ */}
            <DeleteInventoryRecordDialog
                open={deleteRecordDialogOpen}
                onClose={handleCloseDeleteRecordDialog}
                onConfirm={handleConfirmDeleteRecord}
                isDeleting={deletingRecordInProgress}
            />
        </Box>
    );
}
