'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Checkbox,
    Card,
    CardContent,
    LinearProgress,
    TextField,
    InputAdornment,
    Divider,
    FormControlLabel,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    ArrowBack as BackIcon,
    Refresh as RefreshIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    Compare as CompareIcon,
    Warning as WarningIcon,
    PlaylistAddCheck as BulkConfirmIcon,
    ReportProblem as UnregisteredIcon,
    LocalShipping as ReceivingIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { purchasesApi } from '@/services/apiPurchases';

// localStorage キー
const SHOW_COMPLETED_KEY = 'supplied_item_detail_show_completed';

// 完了済み表示設定をlocalStorageから取得
const getShowCompletedSetting = (): boolean => {
    if (typeof window === 'undefined') return true; // デフォルトは表示
    const stored = localStorage.getItem(SHOW_COMPLETED_KEY);
    return stored === null ? true : stored === 'true'; // デフォルトは表示（true）
};

// 完了済み表示設定をlocalStorageに保存
const setShowCompletedSetting = (value: boolean) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SHOW_COMPLETED_KEY, value.toString());
};

import {
    SuppliedItemList,
    SuppliedItemListItem,
    SuppliedItemListStatus,
    ReceivingComparisonResult,
    SuppliedItemReceivingItemCreateData,
} from '@/types/purchases';

// 受入れ入力行の型
interface ReceivingInputRow {
    id: string;
    item_number: string;
    item_name: string;
    quantity_per_box: number | '';
    box_count: number | '';
    calculated_quantity: number;
    notes: string;
    item_not_found: boolean;
    is_loading: boolean;
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
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// ステータス表示用のChip
const StatusChip: React.FC<{ status: SuppliedItemListStatus; statusDisplay?: string }> = ({ status, statusDisplay }) => {
    const getStatusColor = (status: SuppliedItemListStatus): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case 'draft': return 'default';
            case 'pending_receiving': return 'warning';
            case 'receiving': return 'info';
            case 'pending_count': return 'warning';
            case 'counting': return 'info';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    return (
        <Chip
            label={statusDisplay || status}
            color={getStatusColor(status)}
            size="small"
        />
    );
};

function SuppliedItemListDetailContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const listId = Number(params.id);

    // URLパラメータからタブを決定（tab=receivingの場合は受入確認比較タブ）
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'receiving' ? 1 : 0;
    const shouldOpenReceivingForm = tabParam === 'receiving';

    // タブ状態
    const [tabValue, setTabValue] = useState(initialTab);

    // データ
    const [list, setList] = useState<SuppliedItemList | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 員数確認
    const [countConfirmLoading, setCountConfirmLoading] = useState<{ [key: number]: boolean }>({});


    // 比較データ
    const [comparisonData, setComparisonData] = useState<ReceivingComparisonResult | null>(null);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [bulkConfirming, setBulkConfirming] = useState(false);

    // 受入れ登録
    const [receivingRows, setReceivingRows] = useState<ReceivingInputRow[]>([createEmptyReceivingRow()]);
    const [savingReceiving, setSavingReceiving] = useState(false);
    const [showReceivingForm, setShowReceivingForm] = useState(shouldOpenReceivingForm);

    // 完了済み表示フィルタ（デフォルトは表示=true、localStorageから設定を読み込む）
    const [showCompleted, setShowCompleted] = useState(true);
    const [showCompletedInitialized, setShowCompletedInitialized] = useState(false);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const listData = await purchasesApi.getSuppliedItemList(listId);
            setList(listData);
        } catch (err) {
            setError('データの取得に失敗しました');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [listId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // localStorageから完了済み表示設定を読み込む
    useEffect(() => {
        if (!showCompletedInitialized) {
            const storedValue = getShowCompletedSetting();
            setShowCompleted(storedValue);
            setShowCompletedInitialized(true);
        }
    }, [showCompletedInitialized]);

    // 完了済み表示設定を変更時にlocalStorageに保存
    const handleShowCompletedChange = (value: boolean) => {
        setShowCompleted(value);
        setShowCompletedSetting(value);
    };

    // 員数確認（最適化: ローカル状態を直接更新してページ全体の再レンダリングを防ぐ）
    const handleCountConfirm = async (itemId: number, confirmed: boolean) => {
        setCountConfirmLoading((prev: { [key: number]: boolean }) => ({ ...prev, [itemId]: true }));
        try {
            await purchasesApi.confirmCountListItem(itemId, { count_confirmed: confirmed });
            // fetchData()の代わりにローカル状態を直接更新（部分レンダリング）
            setList((prevList: SuppliedItemList | null) => {
                if (!prevList || !prevList.items) return prevList;
                const updatedItems = prevList.items.map((item: SuppliedItemListItem) =>
                    item.id === itemId ? { ...item, count_confirmed: confirmed } : item
                );
                const countedCount = updatedItems.filter((item: SuppliedItemListItem) => item.count_confirmed).length;
                return {
                    ...prevList,
                    items: updatedItems,
                    count_confirmed_items_count: countedCount,
                };
            });
        } catch (err) {
            setError('員数確認の更新に失敗しました');
            console.error(err);
        } finally {
            setCountConfirmLoading((prev: { [key: number]: boolean }) => ({ ...prev, [itemId]: false }));
        }
    };

    // 比較データ取得
    const fetchComparisonData = useCallback(async () => {
        setLoadingComparison(true);
        try {
            const data = await purchasesApi.compareReceivingWithList(listId);
            setComparisonData(data);
        } catch (err) {
            console.error('比較データ取得エラー:', err);
        } finally {
            setLoadingComparison(false);
        }
    }, [listId]);

    // タブ変更時に比較データを取得
    useEffect(() => {
        if (tabValue === 1 && !comparisonData && !loadingComparison) {
            fetchComparisonData();
        }
    }, [tabValue, comparisonData, loadingComparison, fetchComparisonData]);

    // 一括受入確認
    const handleBulkConfirmReceiving = async () => {
        setBulkConfirming(true);
        setError(null);
        try {
            const result = await purchasesApi.bulkConfirmReceiving(listId);
            setSuccessMessage(result.message);
            fetchData();
            fetchComparisonData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '一括確認に失敗しました';
            setError(errorMessage);
            console.error(err);
        } finally {
            setBulkConfirming(false);
        }
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
        if (!itemNumber.trim() || !list) return;

        // ローディング状態を設定
        setReceivingRows(rows => rows.map(row =>
            row.id === rowId ? { ...row, is_loading: true } : row
        ));

        try {
            const result = await purchasesApi.lookupItemByNumber(
                itemNumber.trim(),
                list.product
            );

            setReceivingRows(rows => rows.map(row => {
                if (row.id !== rowId) return row;

                if (result.found && result.item_name) {
                    return {
                        ...row,
                        item_name: result.item_name,
                        item_not_found: false,
                        is_loading: false,
                    };
                } else {
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

    // 受入れ登録を保存
    const handleSaveReceiving = async () => {
        if (!list) return;

        const validRows = receivingRows.filter(row =>
            row.item_number &&
            typeof row.quantity_per_box === 'number' &&
            typeof row.box_count === 'number'
        );

        if (validRows.length === 0) {
            setError('受入れ項目を入力してください');
            return;
        }

        setSavingReceiving(true);
        setError(null);

        try {
            const items: SuppliedItemReceivingItemCreateData[] = validRows.map(row => ({
                item_number: row.item_number,
                item_name: row.item_name,
                quantity_per_box: row.quantity_per_box as number,
                box_count: row.box_count as number,
                notes: row.notes,
            }));

            // 作成時はdraftで作成し、完了処理を行う
            // supplied_item_list を設定してリスト番号と紐づける
            const receiving = await purchasesApi.createSuppliedItemReceiving({
                supplied_item_list: listId,
                product: list.product,
                status: 'draft',
                items,
            });

            // 完了処理
            await purchasesApi.completeReceiving(receiving.id);
            setSuccessMessage(`${validRows.length}件の受入れ登録を完了しました`);

            // フォームをリセット
            setReceivingRows([createEmptyReceivingRow()]);
            setShowReceivingForm(false);

            // データを更新
            fetchData();
            fetchComparisonData();
        } catch (error) {
            console.error('受入れ登録エラー:', error);
            setError('受入れ登録に失敗しました');
        } finally {
            setSavingReceiving(false);
        }
    };

    // 受入れ登録フォームをキャンセル
    const handleCancelReceiving = () => {
        setReceivingRows([createEmptyReceivingRow()]);
        setShowReceivingForm(false);
    };

    // リスト項目カラム（表示順序: 品番、品名、リスト数量、単位、受入れ数量、単位、受入確認、員数確認、備考）
    const itemColumns: GridColDef[] = [
        { field: 'item_number', headerName: '品番', width: 150 },
        { field: 'item_name', headerName: '品名', width: 200 },
        { field: 'quantity', headerName: 'リスト数量', width: 100, type: 'number' },
        { field: 'unit', headerName: '単位', width: 60 },
        { field: 'received_quantity', headerName: '受入数量', width: 100, type: 'number' },
        {
            field: 'received_unit',
            headerName: '単位',
            width: 60,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => params.row.unit || '-',
        },
        {
            field: 'receiving_confirmed',
            headerName: '受入確認',
            width: 100,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => (
                params.value ? (
                    <Chip label="済" color="success" size="small" />
                ) : (
                    <Chip label="未" color="default" size="small" />
                )
            ),
        },
        {
            field: 'count_confirmed',
            headerName: '員数確認',
            width: 120,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => {
                const isLoading = countConfirmLoading[params.row.id];
                if (isLoading) return <CircularProgress size={20} />;

                return (
                    <Checkbox
                        checked={params.value}
                        onChange={(e) => handleCountConfirm(params.row.id, e.target.checked)}
                        disabled={!params.row.receiving_confirmed}
                    />
                );
            },
        },
        { field: 'notes', headerName: '備考', width: 150, flex: 1 },
    ];

    // フィルタリングされたリスト項目（完了済みを表示/非表示）
    const filteredItems = React.useMemo(() => {
        if (!list?.items) return [];
        if (showCompleted) return list.items;
        // 完了済み = 受入確認済み AND 員数確認済み
        return list.items.filter(item => !(item.receiving_confirmed && item.count_confirmed));
    }, [list?.items, showCompleted]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!list) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">リストが見つかりません</Alert>
                <Button startIcon={<BackIcon />} onClick={() => router.push('/supplied-item-inventory')} sx={{ mt: 2 }}>
                    一覧に戻る
                </Button>
            </Box>
        );
    }

    const totalItems = list.total_items || 0;
    const receivedCount = list.received_items_count || 0;
    const countedCount = list.count_confirmed_items_count || 0;

    return (
        <Box sx={{ p: 3 }}>
                {/* ヘッダー */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => router.push('/supplied-item-inventory')}>
                            <BackIcon />
                        </IconButton>
                        <Typography variant="h5">{list.list_number}</Typography>
                        <StatusChip status={list.status} statusDisplay={list.status_display} />
                    </Box>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
                        更新
                    </Button>
                </Box>

                {/* アラート */}
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

                {/* 基本情報 */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">製品</Typography>
                            <Typography>
                                {list.product_number && list.product_name
                                    ? `${list.product_number} - ${list.product_name}`
                                    : list.product_name || '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">取引先</Typography>
                            <Typography>{list.customer_name || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">納品予定日</Typography>
                            <Typography>{list.delivery_date || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">品番数 / 合計数量</Typography>
                            <Typography>{totalItems}品番 / {list.total_quantity || 0}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">進捗</Typography>
                            <Box>
                                <Typography variant="body2">受入: {receivedCount}/{totalItems}</Typography>
                                <LinearProgress variant="determinate" value={totalItems > 0 ? (receivedCount / totalItems) * 100 : 0} sx={{ mb: 0.5 }} />
                                <Typography variant="body2">員数: {countedCount}/{totalItems}</Typography>
                                <LinearProgress variant="determinate" value={totalItems > 0 ? (countedCount / totalItems) * 100 : 0} />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* タブ */}
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="リスト項目" />
                    <Tab label="受入確認比較" icon={<CompareIcon />} iconPosition="start" />
                </Tabs>

                {/* リスト項目タブ */}
                <TabPanel value={tabValue} index={0}>
                    {/* 完了済み表示フィルタ */}
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showCompleted}
                                    onChange={(e) => handleShowCompletedChange(e.target.checked)}
                                />
                            }
                            label="完了済みを表示"
                        />
                    </Box>
                    <Paper sx={{ height: 600 }}>
                        <DataGrid
                            rows={filteredItems}
                            columns={itemColumns}
                            pageSizeOptions={[25, 50, 100]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 100 } },
                            }}
                            disableRowSelectionOnClick
                        />
                    </Paper>
                </TabPanel>

                {/* 受入確認比較タブ */}
                <TabPanel value={tabValue} index={1}>
                    {loadingComparison ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : comparisonData ? (
                        <Box>
                            {/* サマリーカード */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary">リスト項目数</Typography>
                                            <Typography variant="h4">{comparisonData.summary.total_items}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'success.light' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2">受入れ数量OK</Typography>
                                            <Typography variant="h4">{comparisonData.summary.sufficient_items}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: 'info.light' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2">確認済み</Typography>
                                            <Typography variant="h4">{comparisonData.summary.confirmed_items}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card sx={{ bgcolor: comparisonData.summary.unregistered_count > 0 ? 'warning.light' : 'grey.100' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2">リスト未登録品番</Typography>
                                            <Typography variant="h4">{comparisonData.summary.unregistered_count}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {/* 操作ボタン */}
                            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<ReceivingIcon />}
                                    onClick={() => setShowReceivingForm(!showReceivingForm)}
                                >
                                    {showReceivingForm ? '受入れ登録を閉じる' : '受入れ登録'}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<BulkConfirmIcon />}
                                    onClick={handleBulkConfirmReceiving}
                                    disabled={bulkConfirming || comparisonData.summary.sufficient_items === 0}
                                >
                                    {bulkConfirming ? <CircularProgress size={24} /> : '受入れ数OKの項目を一括確認'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={fetchComparisonData}
                                >
                                    比較データを更新
                                </Button>
                            </Box>

                            {/* 受入れ登録フォーム */}
                            {showReceivingForm && (
                                <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ReceivingIcon />
                                        受入れ登録
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        品番・入数・箱数を入力してください。Enterキーで次のフィールドに移動します。
                                    </Typography>

                                    {/* 受入れ入力フォーム */}
                                    <Box sx={{ mb: 2 }}>
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
                                                    sx={{ width: 140 }}
                                                />
                                                <TextField
                                                    label="品名"
                                                    size="small"
                                                    value={row.item_name}
                                                    onChange={(e) => updateReceivingRow(row.id, 'item_name', e.target.value)}
                                                    onKeyDown={(e) => handleInputKeyDown(e, row.id, 'item_name')}
                                                    error={row.item_not_found}
                                                    helperText={row.item_not_found ? '未登録' : ''}
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
                                                    sx={{ width: 160 }}
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
                                                    sx={{ width: 90 }}
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
                                                    sx={{ width: 90 }}
                                                />
                                                <Typography>=</Typography>
                                                <TextField
                                                    label="数量"
                                                    size="small"
                                                    value={row.calculated_quantity}
                                                    InputProps={{ readOnly: true }}
                                                    sx={{ width: 90 }}
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
                                                    sx={{ flex: 1, minWidth: 80 }}
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
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="outlined"
                                            onClick={handleCancelReceiving}
                                            disabled={savingReceiving}
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={savingReceiving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                                            onClick={handleSaveReceiving}
                                            disabled={savingReceiving}
                                        >
                                            受入れ登録完了
                                        </Button>
                                    </Box>
                                </Paper>
                            )}

                            <Divider sx={{ mb: 3 }} />

                            {/* 比較表 */}
                            <Typography variant="h6" sx={{ mb: 2 }}>リスト項目と受入れ数量の比較</Typography>
                            <Paper sx={{ height: 350, mb: 3 }}>
                                <DataGrid
                                    rows={comparisonData.comparison}
                                    getRowId={(row) => row.list_item_id}
                                    columns={[
                                        { field: 'item_number', headerName: '品番', width: 150 },
                                        { field: 'item_name', headerName: '品名', width: 180 },
                                        { field: 'list_quantity', headerName: 'リスト数量', width: 110, type: 'number' },
                                        { field: 'total_received', headerName: '受入れ数量', width: 110, type: 'number' },
                                        { field: 'difference', headerName: '差分', width: 90, type: 'number',
                                            renderCell: (params) => (
                                                <Typography color={params.value >= 0 ? 'success.main' : 'error.main'}>
                                                    {params.value >= 0 ? `+${params.value}` : params.value}
                                                </Typography>
                                            )
                                        },
                                        { field: 'is_sufficient', headerName: '数量OK', width: 90,
                                            renderCell: (params) => (
                                                params.value ?
                                                    <CheckCircleIcon color="success" /> :
                                                    <WarningIcon color="warning" />
                                            )
                                        },
                                        { field: 'receiving_confirmed', headerName: '受入確認', width: 100,
                                            renderCell: (params) => (
                                                params.value ?
                                                    <Chip label="済" color="success" size="small" /> :
                                                    <Chip label="未" color="default" size="small" />
                                            )
                                        },
                                        { field: 'count_confirmed', headerName: '員数確認', width: 100,
                                            renderCell: (params) => (
                                                params.value ?
                                                    <Chip label="済" color="success" size="small" /> :
                                                    <Chip label="未" color="default" size="small" />
                                            )
                                        },
                                    ]}
                                    pageSizeOptions={[10, 25]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10 } },
                                    }}
                                    disableRowSelectionOnClick
                                />
                            </Paper>

                            {/* リスト未登録品番 */}
                            {comparisonData.unregistered_items.length > 0 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <UnregisteredIcon color="warning" />
                                        リスト未登録の受入れ品番
                                    </Typography>
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        以下の品番はリストに存在しませんが、受入れ登録されています。確認してください。
                                    </Alert>
                                    <Paper sx={{ height: 250 }}>
                                        <DataGrid
                                            rows={comparisonData.unregistered_items.map((item, idx) => ({
                                                id: idx,
                                                ...item
                                            }))}
                                            columns={[
                                                { field: 'item_number', headerName: '品番', width: 150 },
                                                { field: 'item_name', headerName: '品名', width: 200 },
                                                { field: 'total_received', headerName: '受入れ数量', width: 120, type: 'number' },
                                            ]}
                                            pageSizeOptions={[5, 10]}
                                            initialState={{
                                                pagination: { paginationModel: { pageSize: 5 } },
                                            }}
                                            disableRowSelectionOnClick
                                        />
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Alert severity="info">
                            比較データを読み込んでいます...
                        </Alert>
                    )}
                </TabPanel>
        </Box>
    );
}

export default function SuppliedItemListDetailPage() {
    return (
        <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        }>
            <SuppliedItemListDetailContent />
        </Suspense>
    );
}
