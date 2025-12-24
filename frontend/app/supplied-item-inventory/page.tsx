'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    LinearProgress,
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
    Upload as UploadIcon,
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as PendingIcon,
    Clear as ClearIcon,
    LocalShipping as ReceivingIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import CSVImportModal from '@/components/SuppliedItemInventory/CSVImportModal';
import {
    SuppliedItemList,
    SuppliedItemListStatus,
    SuppliedItemInventory,
    SuppliedItemReceiving,
    SuppliedItemReceivingItemCreateData,
    ReceivingSummary,
    ReceivingStatus,
    ReceivingItemListItem,
} from '@/types/purchases';
import { Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

// localStorage キー
const DEFAULT_PRODUCT_KEY = 'supplied_item_inventory_default_product';

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

// 受入れ入力行の型
interface ReceivingInputRow {
    id: string;
    item_number: string;
    item_name: string;
    quantity_per_box: number | '';
    box_count: number | '';
    calculated_quantity: number;
    notes: string;
    item_not_found: boolean; // 品番がマスタに登録されていない場合true
    is_loading: boolean; // 品番検索中フラグ
}

// 空の受入入力行を作成
const createEmptyReceivingRow = (): ReceivingInputRow => ({
    id: uuidv4(),
    item_number: '',
    item_name: '',
    quantity_per_box: '',
    box_count: '',
    calculated_quantity: 0,
    notes: '',
    item_not_found: false,
    is_loading: false,
});

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

export default function SuppliedItemInventoryPage() {
    // タブ状態
    const [tabValue, setTabValue] = useState(0);

    // リスト一覧関連
    const [lists, setLists] = useState<SuppliedItemList[]>([]);
    const [inventories, setInventories] = useState<SuppliedItemInventory[]>([]);
    const [receivings, setReceivings] = useState<SuppliedItemReceiving[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<SuppliedItemListStatus | ''>('');
    const [productFilter, setProductFilter] = useState<number | ''>('');
    const [receivingStatusFilter, setReceivingStatusFilter] = useState<ReceivingStatus | ''>('');

    // ダイアログ関連
    const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedList, setSelectedList] = useState<SuppliedItemList | null>(null);

    // 受入れ登録モーダル関連
    const [receivingModalOpen, setReceivingModalOpen] = useState(false);
    const [receivingProductId, setReceivingProductId] = useState<number | ''>('');
    const [receivingRows, setReceivingRows] = useState<ReceivingInputRow[]>([createEmptyReceivingRow()]);
    const [savingReceiving, setSavingReceiving] = useState(false);
    const [receivingError, setReceivingError] = useState<string | null>(null);
    const [receivingSuccess, setReceivingSuccess] = useState<string | null>(null);

    // 受入状況サマリー関連
    const [receivingSummaries, setReceivingSummaries] = useState<Record<number, ReceivingSummary>>({});
    const [loadingSummaries, setLoadingSummaries] = useState(false);

    // 受入一覧サブタブ関連
    const [receivingSubTab, setReceivingSubTab] = useState(0);
    const [receivingItems, setReceivingItems] = useState<ReceivingItemListItem[]>([]);
    const [loadingReceivingItems, setLoadingReceivingItems] = useState(false);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [listsData, productsData, inventoriesData, receivingsData] = await Promise.all([
                purchasesApi.getSuppliedItemLists({
                    search: searchText || undefined,
                    status: statusFilter || undefined,
                    product: productFilter || undefined,
                }),
                productApi.getProducts(),
                purchasesApi.getSuppliedItemInventories(),
                purchasesApi.getSuppliedItemReceivings({
                    status: receivingStatusFilter || undefined,
                }),
            ]);
            setLists(listsData);
            setProducts(productsData);
            setInventories(inventoriesData);
            setReceivings(receivingsData);

            // 受入状況サマリーを取得
            if (listsData.length > 0) {
                setLoadingSummaries(true);
                try {
                    const listIds = listsData.map(l => l.id);
                    const summariesResult = await purchasesApi.getReceivingSummariesBulk(listIds);
                    const summariesMap: Record<number, ReceivingSummary> = {};
                    summariesResult.summaries.forEach(s => {
                        summariesMap[s.list_id] = s;
                    });
                    setReceivingSummaries(summariesMap);
                } catch (err) {
                    console.error('受入状況サマリー取得エラー:', err);
                } finally {
                    setLoadingSummaries(false);
                }
            }
        } catch (error) {
            console.error('データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    }, [searchText, statusFilter, productFilter, receivingStatusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 部品一覧の取得
    const fetchReceivingItems = useCallback(async () => {
        setLoadingReceivingItems(true);
        try {
            // 員数確認前の全ての部品を取得
            const items = await purchasesApi.getReceivingItemsList({
                status: 'completed',
            });
            setReceivingItems(items);
        } catch (error) {
            console.error('部品一覧取得エラー:', error);
        } finally {
            setLoadingReceivingItems(false);
        }
    }, []);

    // 受入一覧タブの部品一覧サブタブが選択された時に部品一覧を取得
    useEffect(() => {
        if (tabValue === 1 && receivingSubTab === 1 && receivingItems.length === 0 && !loadingReceivingItems) {
            fetchReceivingItems();
        }
    }, [tabValue, receivingSubTab, receivingItems.length, loadingReceivingItems, fetchReceivingItems]);

    // 削除
    const handleDelete = async () => {
        if (!selectedList) return;
        try {
            await purchasesApi.deleteSuppliedItemList(selectedList.id);
            setDeleteDialogOpen(false);
            setSelectedList(null);
            fetchData();
        } catch (error) {
            console.error('削除エラー:', error);
        }
    };

    // 受入れ登録モーダルを開く
    const handleOpenReceivingModal = () => {
        setReceivingModalOpen(true);
        // デフォルト製品があれば設定
        const defaultId = getDefaultProductId();
        if (defaultId && products.some(p => p.id === defaultId)) {
            setReceivingProductId(defaultId);
        } else {
            setReceivingProductId('');
        }
        setReceivingRows([createEmptyReceivingRow()]);
        setReceivingError(null);
        setReceivingSuccess(null);
    };

    // デフォルト製品を設定/解除
    const handleToggleDefaultProduct = (productId: number) => {
        const currentDefault = getDefaultProductId();
        if (currentDefault === productId) {
            // 既にデフォルトならば解除
            setDefaultProductId(null);
        } else {
            // デフォルトに設定
            setDefaultProductId(productId);
        }
        // UIを更新するためにre-render
        setReceivingProductId(receivingProductId);
    };

    // 受入れ登録モーダルを閉じる
    const handleCloseReceivingModal = () => {
        setReceivingModalOpen(false);
        setReceivingProductId('');
        setReceivingRows([createEmptyReceivingRow()]);
        setReceivingError(null);
    };

    // 受入れ入力行の更新
    const updateReceivingRow = (id: string, field: keyof ReceivingInputRow, value: string | number) => {
        setReceivingRows(rows => {
            const newRows = rows.map(row => {
                if (row.id !== id) return row;

                const updatedRow = { ...row, [field]: value };

                // 数量を自動計算
                const qtyPerBox = typeof updatedRow.quantity_per_box === 'number' ? updatedRow.quantity_per_box : 0;
                const boxCount = typeof updatedRow.box_count === 'number' ? updatedRow.box_count : 0;
                updatedRow.calculated_quantity = qtyPerBox * boxCount;

                return updatedRow;
            });

            // 最後の行に入力があったら新しい行を追加
            const lastRow = newRows[newRows.length - 1];
            if (lastRow.item_number && lastRow.quantity_per_box && lastRow.box_count) {
                newRows.push(createEmptyReceivingRow());
            }

            return newRows;
        });
    };

    // 受入れ入力行の削除
    const removeReceivingRow = (id: string) => {
        setReceivingRows(rows => {
            if (rows.length <= 1) return rows;
            return rows.filter(row => row.id !== id);
        });
    };

    // 受入れ入力行の追加
    const addReceivingRow = () => {
        setReceivingRows(rows => [...rows, createEmptyReceivingRow()]);
    };

    // 品番から品名を自動取得
    const lookupItemName = async (rowId: string, itemNumber: string) => {
        if (!itemNumber.trim()) return;

        // ローディング状態を設定
        setReceivingRows(rows => rows.map(row =>
            row.id === rowId ? { ...row, is_loading: true } : row
        ));

        try {
            const result = await purchasesApi.lookupItemByNumber(
                itemNumber.trim(),
                receivingProductId ? Number(receivingProductId) : undefined
            );

            setReceivingRows(rows => rows.map(row => {
                if (row.id !== rowId) return row;

                if (result.found && result.item_name) {
                    // 品名が見つかった場合は自動設定
                    return {
                        ...row,
                        item_name: result.item_name,
                        item_not_found: false,
                        is_loading: false,
                    };
                } else {
                    // 品名が見つからなかった場合は警告フラグを設定
                    return {
                        ...row,
                        item_not_found: true,
                        is_loading: false,
                    };
                }
            }));
        } catch (error) {
            console.error('品番検索エラー:', error);
            setReceivingRows(rows => rows.map(row =>
                row.id === rowId ? { ...row, is_loading: false } : row
            ));
        }
    };

    // Enterキーで次のフィールドに移動
    // 品名は自動補完されるためスキップし、品番 → 入数 → 箱数 → 備考 の順に移動
    const handleInputKeyDown = (
        e: React.KeyboardEvent<HTMLDivElement>,
        rowId: string,
        fieldName: string
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // 品名(item_name)は自動補完されるためスキップ
            const fieldOrder = ['item_number', 'quantity_per_box', 'box_count', 'notes'];
            const currentIndex = fieldOrder.indexOf(fieldName);
            const rowIndex = receivingRows.findIndex(row => row.id === rowId);

            // 品番フィールドでEnterを押したら品名検索も実行
            if (fieldName === 'item_number') {
                const row = receivingRows.find(r => r.id === rowId);
                if (row && row.item_number) {
                    lookupItemName(rowId, row.item_number);
                }
            }

            // 品名フィールドでEnterを押した場合は入数に移動
            if (fieldName === 'item_name') {
                const nextField = document.querySelector(
                    `[data-row-id="${rowId}"][data-field="quantity_per_box"] input`
                ) as HTMLElement;
                if (nextField) {
                    nextField.focus();
                }
                return;
            }

            // 次のフィールドまたは次の行の最初のフィールドにフォーカス
            let nextField: HTMLElement | null = null;

            if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
                // 同じ行の次のフィールド
                nextField = document.querySelector(
                    `[data-row-id="${rowId}"][data-field="${fieldOrder[currentIndex + 1]}"] input`
                ) as HTMLElement;
            } else if (currentIndex === fieldOrder.length - 1 || fieldName === 'notes') {
                // 最後のフィールド（備考）から次の行へ
                if (rowIndex < receivingRows.length - 1) {
                    const nextRowId = receivingRows[rowIndex + 1].id;
                    nextField = document.querySelector(
                        `[data-row-id="${nextRowId}"][data-field="${fieldOrder[0]}"] input`
                    ) as HTMLElement;
                } else {
                    // 最後の行の最後のフィールド → 新しい行を追加して最初のフィールドにフォーカス
                    addReceivingRow();
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('[data-field="item_number"] input');
                        const lastInput = inputs[inputs.length - 1] as HTMLElement;
                        if (lastInput) {
                            lastInput.focus();
                        }
                    }, 100);
                    return;
                }
            }

            if (nextField) {
                nextField.focus();
            }
        }
    };

    // 受入れ登録を保存・完了
    const handleSaveReceiving = async (asDraft: boolean = false) => {
        if (!receivingProductId) {
            setReceivingError('製品を選択してください');
            return;
        }

        const validRows = receivingRows.filter(row =>
            row.item_number &&
            typeof row.quantity_per_box === 'number' &&
            typeof row.box_count === 'number'
        );

        if (validRows.length === 0) {
            setReceivingError('受入れ項目を入力してください');
            return;
        }

        setSavingReceiving(true);
        setReceivingError(null);
        setReceivingSuccess(null);

        try {
            const items: SuppliedItemReceivingItemCreateData[] = validRows.map(row => ({
                item_number: row.item_number,
                item_name: row.item_name,
                quantity_per_box: row.quantity_per_box as number,
                box_count: row.box_count as number,
                notes: row.notes,
            }));

            // 作成時は常にdraftで作成し、完了の場合はcompleteReceivingで完了処理を行う
            const receiving = await purchasesApi.createSuppliedItemReceiving({
                product: receivingProductId,
                status: 'draft',
                items,
            });

            if (!asDraft) {
                // 完了の場合: completeReceivingで完了処理を行う
                await purchasesApi.completeReceiving(receiving.id);
                setReceivingSuccess(`${validRows.length}件の受入れ登録を完了しました`);
                setTimeout(() => {
                    handleCloseReceivingModal();
                    fetchData();
                }, 1500);
            } else {
                // 一時保存の場合
                setReceivingSuccess('一時保存しました');
            }
        } catch (error) {
            console.error('受入れ登録エラー:', error);
            setReceivingError('受入れ登録に失敗しました');
        } finally {
            setSavingReceiving(false);
        }
    };

    // リスト一覧カラム
    const listColumns: GridColDef[] = [
        { field: 'list_number', headerName: 'リスト番号', width: 180 },
        { field: 'issue_date', headerName: '発行日', width: 120 },
        {
            field: 'product_name',
            headerName: '製品名',
            width: 200,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => {
                const row = params.row;
                if (row.product_number && row.product_name) {
                    return `${row.product_number} - ${row.product_name}`;
                }
                return row.product_name || '-';
            }
        },
        {
            field: 'progress',
            headerName: '進捗',
            width: 200,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => {
                const total = params.row.total_items || 0;
                const received = params.row.received_items_count || 0;
                const counted = params.row.count_confirmed_items_count || 0;
                const countedPercent = total > 0 ? (counted / total) * 100 : 0;

                return (
                    <Box sx={{ width: '100%' }}>
                        <Typography variant="caption">
                            受入: {received}/{total} | 員数: {counted}/{total}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={countedPercent}
                            sx={{ height: 6, borderRadius: 1 }}
                        />
                    </Box>
                );
            },
        },
        { field: 'total_items', headerName: '品番数', width: 90, type: 'number' },
        {
            field: 'receiving_status',
            headerName: '受入状況',
            width: 180,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => {
                const summary = receivingSummaries[params.row.id];
                if (loadingSummaries) {
                    return <CircularProgress size={16} />;
                }
                if (!summary) {
                    return <Typography variant="caption" color="text.secondary">-</Typography>;
                }

                const { total_sku_count, completed_sku_count, incomplete_sku_count } = summary;

                // 全て完了した場合は緑、未完了がある場合は黄色
                const isAllCompleted = incomplete_sku_count === 0 && total_sku_count > 0;

                return (
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isAllCompleted ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                            ) : incomplete_sku_count > 0 ? (
                                <PendingIcon color="warning" fontSize="small" />
                            ) : null}
                            <Typography variant="caption" component="span">
                                {isAllCompleted ? '完了' : '受入中'}
                            </Typography>
                        </Box>
                        <Typography variant="caption" component="div" color="text.secondary">
                            未完了: {incomplete_sku_count} / 完了: {completed_sku_count}
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: 'actions',
            headerName: '操作',
            width: 200,
            sortable: false,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => (
                <Box>
                    <Tooltip title="詳細確認">
                        <IconButton
                            size="small"
                            onClick={() => router.push(`/supplied-item-inventory/${params.row.id}`)}
                        >
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="受入登録">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/supplied-item-inventory/${params.row.id}?tab=receiving`)}
                        >
                            <ReceivingIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="員数確認（準備中）">
                        <span>
                            <IconButton
                                size="small"
                                disabled
                            >
                                <PendingIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="削除">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                                setSelectedList(params.row);
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

    // 在庫一覧カラム
    const inventoryColumns: GridColDef[] = [
        { field: 'item_number', headerName: '品番', width: 150 },
        { field: 'item_name', headerName: '品名', width: 200 },
        { field: 'product_name', headerName: '製品', width: 150 },
        { field: 'customer_name', headerName: '取引先', width: 150 },
        { field: 'quantity', headerName: '在庫数', width: 100, type: 'number' },
        { field: 'unit', headerName: '単位', width: 80 },
        { field: 'lot_number', headerName: 'ロット番号', width: 120 },
        { field: 'received_date', headerName: '入庫日', width: 120 },
        { field: 'list_number', headerName: 'リスト番号', width: 150 },
    ];

    // 受入れ一覧カラム
    const receivingColumns: GridColDef[] = [
        {
            field: 'receiving_date',
            headerName: '受入日時',
            width: 160,
            renderCell: (params: GridRenderCellParams<SuppliedItemReceiving>) => {
                const date = new Date(params.row.receiving_date);
                return date.toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            },
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 200,
            renderCell: (params: GridRenderCellParams<SuppliedItemReceiving>) => {
                const row = params.row;
                if (row.product_number && row.product_name) {
                    return `${row.product_number} - ${row.product_name}`;
                }
                return row.product_name || '-';
            },
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 120,
            renderCell: (params: GridRenderCellParams<SuppliedItemReceiving>) => {
                const status = params.row.status;
                const isDraft = status === 'draft';
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: isDraft ? 'warning.main' : 'success.main',
                        }}
                    >
                        {isDraft ? <PendingIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        {params.row.status_display || (isDraft ? '一時保存' : '完了')}
                    </Box>
                );
            },
        },
        {
            field: 'list_number',
            headerName: 'リスト番号',
            width: 150,
            renderCell: (params: GridRenderCellParams<SuppliedItemReceiving>) => {
                return params.row.list_number || '未紐付け';
            },
        },
        {
            field: 'items_count',
            headerName: '項目数',
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
            field: 'created_by_name',
            headerName: '登録者',
            width: 120,
        },
        {
            field: 'actions',
            headerName: '操作',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<SuppliedItemReceiving>) => (
                <Box>
                    <Tooltip title="詳細確認">
                        <IconButton
                            size="small"
                            onClick={() => handleViewReceiving(params.row)}
                        >
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteReceiving(params.row)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    // 部品一覧カラム（受入一覧の部品別タブ用）
    const receivingItemColumns: GridColDef[] = [
        { field: 'item_number', headerName: '品番', width: 150 },
        { field: 'item_name', headerName: '品名', width: 180 },
        {
            field: 'quantity_per_box',
            headerName: '入数',
            width: 80,
            type: 'number',
        },
        {
            field: 'box_count',
            headerName: '箱数',
            width: 80,
            type: 'number',
        },
        {
            field: 'calculated_quantity',
            headerName: '受入数量',
            width: 100,
            type: 'number',
        },
        {
            field: 'receiving_date',
            headerName: '受入日時',
            width: 150,
            renderCell: (params: GridRenderCellParams<ReceivingItemListItem>) => {
                const date = new Date(params.row.receiving_date);
                return date.toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            },
        },
        {
            field: 'list_number',
            headerName: 'リスト番号',
            width: 150,
            renderCell: (params: GridRenderCellParams<ReceivingItemListItem>) => {
                return params.row.list_number || '未紐付け';
            },
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 180,
            renderCell: (params: GridRenderCellParams<ReceivingItemListItem>) => {
                const row = params.row;
                if (row.product_number && row.product_name) {
                    return `${row.product_number} - ${row.product_name}`;
                }
                return row.product_name || '-';
            },
        },
        {
            field: 'receiving_status',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams<ReceivingItemListItem>) => {
                const status = params.row.receiving_status;
                const isDraft = status === 'draft';
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: isDraft ? 'warning.main' : 'success.main',
                        }}
                    >
                        {isDraft ? <PendingIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        {params.row.receiving_status_display || (isDraft ? '一時保存' : '完了')}
                    </Box>
                );
            },
        },
        { field: 'notes', headerName: '備考', width: 150, flex: 1 },
    ];

    // 受入れ詳細表示
    const [viewReceivingDialogOpen, setViewReceivingDialogOpen] = useState(false);
    const [selectedReceiving, setSelectedReceiving] = useState<SuppliedItemReceiving | null>(null);
    const [deleteReceivingDialogOpen, setDeleteReceivingDialogOpen] = useState(false);

    const handleViewReceiving = async (receiving: SuppliedItemReceiving) => {
        try {
            // 詳細（items含む）を取得
            const detail = await purchasesApi.getSuppliedItemReceiving(receiving.id);
            setSelectedReceiving(detail);
            setViewReceivingDialogOpen(true);
        } catch (error) {
            console.error('受入れ詳細取得エラー:', error);
        }
    };

    const handleDeleteReceiving = (receiving: SuppliedItemReceiving) => {
        setSelectedReceiving(receiving);
        setDeleteReceivingDialogOpen(true);
    };

    const confirmDeleteReceiving = async () => {
        if (!selectedReceiving) return;
        try {
            await purchasesApi.deleteSuppliedItemReceiving(selectedReceiving.id);
            setDeleteReceivingDialogOpen(false);
            setSelectedReceiving(null);
            fetchData();
        } catch (error) {
            console.error('受入れ削除エラー:', error);
        }
    };

    // ルーターを使用して遷移
    const router = useRouter();

    return (
        <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">支給品在庫管理</Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchData}
                            sx={{ mr: 1 }}
                        >
                            更新
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ReceivingIcon />}
                            onClick={handleOpenReceivingModal}
                            sx={{ mr: 1 }}
                            color="success"
                        >
                            受入れ登録
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<UploadIcon />}
                            onClick={() => setCsvImportDialogOpen(true)}
                        >
                            CSVインポート
                        </Button>
                    </Box>
                </Box>

                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="支給品リスト" />
                    <Tab label="受入れ一覧" />
                    <Tab label="在庫一覧" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    {/* フィルター */}
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                placeholder="検索..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
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
                                    onChange={(e) => setStatusFilter(e.target.value as SuppliedItemListStatus | '')}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    <MenuItem value="draft">下書き</MenuItem>
                                    <MenuItem value="pending_receiving">受入待ち</MenuItem>
                                    <MenuItem value="receiving">受入中</MenuItem>
                                    <MenuItem value="pending_count">員数確認待ち</MenuItem>
                                    <MenuItem value="counting">員数確認中</MenuItem>
                                    <MenuItem value="completed">完了</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>製品</InputLabel>
                                <Select
                                    value={productFilter}
                                    label="製品"
                                    onChange={(e) => setProductFilter(e.target.value as number | '')}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {products.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.product_number} - {p.product_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Paper>

                    {/* リスト一覧 */}
                    <Paper sx={{ height: 500 }}>
                        <DataGrid
                            rows={lists}
                            columns={listColumns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            disableRowSelectionOnClick
                        />
                    </Paper>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {/* 受入一覧内のサブタブ */}
                    <Tabs
                        value={receivingSubTab}
                        onChange={(e, v) => setReceivingSubTab(v)}
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="受入別" />
                        <Tab label="部品一覧" />
                    </Tabs>

                    {/* 受入別（既存の表示） */}
                    {receivingSubTab === 0 && (
                        <>
                            {/* 受入れ一覧フィルター */}
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                        <InputLabel>ステータス</InputLabel>
                                        <Select
                                            value={receivingStatusFilter}
                                            label="ステータス"
                                            onChange={(e) => setReceivingStatusFilter(e.target.value as ReceivingStatus | '')}
                                        >
                                            <MenuItem value="">すべて</MenuItem>
                                            <MenuItem value="draft">一時保存</MenuItem>
                                            <MenuItem value="completed">完了</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Paper>

                            {/* 受入れ一覧 */}
                            <Paper sx={{ height: 500 }}>
                                <DataGrid
                                    rows={receivings}
                                    columns={receivingColumns}
                                    loading={loading}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10 } },
                                    }}
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        </>
                    )}

                    {/* 部品一覧 */}
                    {receivingSubTab === 1 && (
                        <>
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        員数確認前の全ての部品の受入数量を表示しています
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<RefreshIcon />}
                                        onClick={fetchReceivingItems}
                                    >
                                        更新
                                    </Button>
                                </Box>
                            </Paper>

                            {/* 部品一覧 */}
                            <Paper sx={{ height: 500 }}>
                                <DataGrid
                                    rows={receivingItems}
                                    columns={receivingItemColumns}
                                    loading={loadingReceivingItems}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10 } },
                                    }}
                                    disableRowSelectionOnClick
                                />
                            </Paper>
                        </>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    {/* 在庫一覧 */}
                    <Paper sx={{ height: 500 }}>
                        <DataGrid
                            rows={inventories}
                            columns={inventoryColumns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            disableRowSelectionOnClick
                        />
                    </Paper>
                </TabPanel>

                {/* CSVインポートモーダル */}
                <CSVImportModal
                    open={csvImportDialogOpen}
                    onClose={() => setCsvImportDialogOpen(false)}
                    onSuccess={() => {
                        setCsvImportDialogOpen(false);
                        fetchData();
                    }}
                />

                {/* 削除確認ダイアログ */}
                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>削除確認</DialogTitle>
                    <DialogContent>
                        <Typography>
                            リスト「{selectedList?.list_number}」を削除してもよろしいですか？
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
                        <Button variant="contained" color="error" onClick={handleDelete}>
                            削除
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 受入れ詳細表示ダイアログ */}
                <Dialog
                    open={viewReceivingDialogOpen}
                    onClose={() => setViewReceivingDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        受入れ詳細
                        {selectedReceiving && (
                            <Typography variant="body2" color="text.secondary">
                                受入日時: {new Date(selectedReceiving.receiving_date).toLocaleString('ja-JP')}
                            </Typography>
                        )}
                    </DialogTitle>
                    <DialogContent>
                        {selectedReceiving && (
                            <Box>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        製品
                                    </Typography>
                                    <Typography>
                                        {selectedReceiving.product_number
                                            ? `${selectedReceiving.product_number} - ${selectedReceiving.product_name}`
                                            : selectedReceiving.product_name || '-'}
                                    </Typography>
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        ステータス
                                    </Typography>
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: selectedReceiving.status === 'draft' ? 'warning.main' : 'success.main',
                                    }}>
                                        {selectedReceiving.status === 'draft'
                                            ? <PendingIcon fontSize="small" />
                                            : <CheckCircleIcon fontSize="small" />}
                                        {selectedReceiving.status_display || (selectedReceiving.status === 'draft' ? '一時保存' : '完了')}
                                    </Box>
                                </Box>
                                {selectedReceiving.list_number && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            リスト番号
                                        </Typography>
                                        <Typography>{selectedReceiving.list_number}</Typography>
                                    </Box>
                                )}
                                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                                    受入れ項目 ({selectedReceiving.items?.length || 0}件)
                                </Typography>
                                <Paper sx={{ p: 2 }}>
                                    {selectedReceiving.items && selectedReceiving.items.length > 0 ? (
                                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <Box component="thead">
                                                <Box component="tr" sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'left' }}>品番</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'left' }}>品名</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'right' }}>入数</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'center' }}>×</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'right' }}>箱数</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'center' }}>=</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'right' }}>数量</Box>
                                                    <Box component="th" sx={{ p: 1, textAlign: 'left' }}>備考</Box>
                                                </Box>
                                            </Box>
                                            <Box component="tbody">
                                                {selectedReceiving.items.map((item, index) => (
                                                    <Box
                                                        component="tr"
                                                        key={item.id}
                                                        sx={{
                                                            borderBottom: '1px solid',
                                                            borderColor: 'divider',
                                                            '&:hover': { bgcolor: 'action.hover' }
                                                        }}
                                                    >
                                                        <Box component="td" sx={{ p: 1 }}>{item.item_number}</Box>
                                                        <Box component="td" sx={{ p: 1 }}>{item.item_name || '-'}</Box>
                                                        <Box component="td" sx={{ p: 1, textAlign: 'right' }}>{item.quantity_per_box}</Box>
                                                        <Box component="td" sx={{ p: 1, textAlign: 'center' }}>×</Box>
                                                        <Box component="td" sx={{ p: 1, textAlign: 'right' }}>{item.box_count}</Box>
                                                        <Box component="td" sx={{ p: 1, textAlign: 'center' }}>=</Box>
                                                        <Box component="td" sx={{ p: 1, textAlign: 'right', fontWeight: 'bold' }}>
                                                            {item.calculated_quantity}
                                                        </Box>
                                                        <Box component="td" sx={{ p: 1 }}>{item.notes || '-'}</Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                            <Box component="tfoot">
                                                <Box component="tr" sx={{ bgcolor: 'action.selected' }}>
                                                    <Box component="td" colSpan={6} sx={{ p: 1, textAlign: 'right', fontWeight: 'bold' }}>
                                                        合計:
                                                    </Box>
                                                    <Box component="td" sx={{ p: 1, textAlign: 'right', fontWeight: 'bold' }}>
                                                        {selectedReceiving.items.reduce((sum, item) => sum + item.calculated_quantity, 0)}
                                                    </Box>
                                                    <Box component="td" sx={{ p: 1 }}></Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary">項目がありません</Typography>
                                    )}
                                </Paper>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewReceivingDialogOpen(false)}>
                            閉じる
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 受入れ削除確認ダイアログ */}
                <Dialog open={deleteReceivingDialogOpen} onClose={() => setDeleteReceivingDialogOpen(false)}>
                    <DialogTitle>受入れ削除確認</DialogTitle>
                    <DialogContent>
                        <Typography>
                            この受入れ登録を削除してもよろしいですか？
                        </Typography>
                        {selectedReceiving && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    受入日時: {new Date(selectedReceiving.receiving_date).toLocaleString('ja-JP')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    製品: {selectedReceiving.product_name || '-'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    項目数: {selectedReceiving.items_count || 0}件
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteReceivingDialogOpen(false)}>キャンセル</Button>
                        <Button variant="contained" color="error" onClick={confirmDeleteReceiving}>
                            削除
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 受入れ登録モーダル */}
                <Dialog
                    open={receivingModalOpen}
                    onClose={handleCloseReceivingModal}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle>
                        受入れ登録
                        <Typography variant="body2" color="text.secondary">
                            リスト登録前でも受入れ登録ができます。製品を選択し、品番・入数・箱数を入力してください。
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        {receivingError && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setReceivingError(null)}>
                                {receivingError}
                            </Alert>
                        )}
                        {receivingSuccess && (
                            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReceivingSuccess(null)}>
                                {receivingSuccess}
                            </Alert>
                        )}

                        {/* 製品選択 */}
                        <Box sx={{ mb: 3, mt: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel>製品を選択 *</InputLabel>
                                <Select
                                    value={receivingProductId}
                                    label="製品を選択 *"
                                    onChange={(e) => setReceivingProductId(e.target.value as number)}
                                    renderValue={(selected) => {
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
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                ★をクリックするとデフォルト製品に設定できます
                            </Typography>
                        </Box>

                        {/* 受入れ入力フォーム */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>受入れ項目</Typography>
                        <Paper sx={{ p: 2, mb: 2 }}>
                            {receivingRows.map((row, index) => (
                                <Box key={row.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                    <Typography sx={{ width: 30, textAlign: 'center' }}>{index + 1}</Typography>
                                    <TextField
                                        label="品番"
                                        size="small"
                                        value={row.item_number}
                                        onChange={(e) => updateReceivingRow(row.id, 'item_number', e.target.value)}
                                        onBlur={() => lookupItemName(row.id, row.item_number)}
                                        onKeyDown={(e) => handleInputKeyDown(e, row.id, 'item_number')}
                                        data-row-id={row.id}
                                        data-field="item_number"
                                        sx={{ width: 150 }}
                                    />
                                    <TextField
                                        label="品名"
                                        size="small"
                                        value={row.item_name}
                                        onChange={(e) => updateReceivingRow(row.id, 'item_name', e.target.value)}
                                        onKeyDown={(e) => handleInputKeyDown(e, row.id, 'item_name')}
                                        error={row.item_not_found}
                                        helperText={row.item_not_found ? '登録がありません' : ''}
                                        disabled={row.is_loading}
                                        data-row-id={row.id}
                                        data-field="item_name"
                                        InputProps={{
                                            endAdornment: row.is_loading ? (
                                                <InputAdornment position="end">
                                                    <CircularProgress size={16} />
                                                </InputAdornment>
                                            ) : undefined,
                                        }}
                                        sx={{ width: 180 }}
                                    />
                                    <TextField
                                        label="入数"
                                        size="small"
                                        type="number"
                                        value={row.quantity_per_box}
                                        onChange={(e) => updateReceivingRow(row.id, 'quantity_per_box', parseInt(e.target.value) || '')}
                                        onKeyDown={(e) => handleInputKeyDown(e, row.id, 'quantity_per_box')}
                                        data-row-id={row.id}
                                        data-field="quantity_per_box"
                                        sx={{ width: 100 }}
                                    />
                                    <Typography>×</Typography>
                                    <TextField
                                        label="箱数"
                                        size="small"
                                        type="number"
                                        value={row.box_count}
                                        onChange={(e) => updateReceivingRow(row.id, 'box_count', parseInt(e.target.value) || '')}
                                        onKeyDown={(e) => handleInputKeyDown(e, row.id, 'box_count')}
                                        data-row-id={row.id}
                                        data-field="box_count"
                                        sx={{ width: 100 }}
                                    />
                                    <Typography>=</Typography>
                                    <TextField
                                        label="数量"
                                        size="small"
                                        value={row.calculated_quantity}
                                        InputProps={{ readOnly: true }}
                                        sx={{ width: 100 }}
                                        tabIndex={-1}
                                    />
                                    <TextField
                                        label="備考"
                                        size="small"
                                        value={row.notes}
                                        onChange={(e) => updateReceivingRow(row.id, 'notes', e.target.value)}
                                        onKeyDown={(e) => handleInputKeyDown(e, row.id, 'notes')}
                                        data-row-id={row.id}
                                        data-field="notes"
                                        sx={{ flex: 1, minWidth: 100 }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => removeReceivingRow(row.id)}
                                        disabled={receivingRows.length <= 1}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                </Box>
                            ))}
                        </Paper>

                        <Typography variant="body2" color="text.secondary">
                            Enterキーで次のフィールドに移動します。品番を入力すると品名が自動補完されます。
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseReceivingModal} disabled={savingReceiving}>
                            キャンセル
                        </Button>
                        <Button
                            onClick={() => handleSaveReceiving(true)}
                            disabled={savingReceiving}
                            variant="outlined"
                        >
                            一時保存
                        </Button>
                        <Button
                            onClick={() => handleSaveReceiving(false)}
                            disabled={savingReceiving}
                            variant="contained"
                            color="success"
                        >
                            {savingReceiving ? <CircularProgress size={24} /> : '受入れ登録完了'}
                        </Button>
                    </DialogActions>
                </Dialog>
        </Box>
    );
}
