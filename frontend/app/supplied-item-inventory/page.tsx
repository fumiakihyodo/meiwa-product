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
    Chip,
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
    Add as AddIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Upload as UploadIcon,
    CheckCircle as CheckCircleIcon,
    HourglassEmpty as PendingIcon,
    PlayArrow as InProgressIcon,
} from '@mui/icons-material';
import MainLayout from '@/components/layout/MainLayout';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import CSVImportModal from '@/components/SuppliedItemInventory/CSVImportModal';
import {
    SuppliedItemList,
    SuppliedItemListStatus,
    SuppliedItemInventory,
    CSVParseResult,
} from '@/types/purchases';
import { Product } from '@/types/product';

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
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<SuppliedItemListStatus | ''>('');
    const [productFilter, setProductFilter] = useState<number | ''>('');

    // ダイアログ関連
    const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedList, setSelectedList] = useState<SuppliedItemList | null>(null);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [listsData, productsData, inventoriesData] = await Promise.all([
                purchasesApi.getSuppliedItemLists({
                    search: searchText || undefined,
                    status: statusFilter || undefined,
                    product: productFilter || undefined,
                }),
                productApi.getProducts(),
                purchasesApi.getSuppliedItemInventories(),
            ]);
            setLists(listsData);
            setProducts(productsData);
            setInventories(inventoriesData);
        } catch (error) {
            console.error('データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    }, [searchText, statusFilter, productFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    // リスト一覧カラム
    const listColumns: GridColDef[] = [
        { field: 'list_number', headerName: 'リスト番号', width: 180 },
        { field: 'issue_date', headerName: '発行日', width: 120 },
        {
            field: 'product_name',
            headerName: '製品名',
            width: 200,
            valueGetter: (params: any) => {
                const row = params.row as SuppliedItemList;
                if (row.product_number && row.product_name) {
                    return `${row.product_number} - ${row.product_name}`;
                }
                return row.product_name || '';
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
                const receivedPercent = total > 0 ? (received / total) * 100 : 0;
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
            field: 'actions',
            headerName: '操作',
            width: 200,
            sortable: false,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => (
                <Box>
                    <Tooltip title="詳細確認">
                        <IconButton
                            size="small"
                            onClick={() => window.location.href = `/supplied-item-inventory/${params.row.id}`}
                        >
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="受け入れ登録（準備中）">
                        <span>
                            <IconButton
                                size="small"
                                disabled
                            >
                                <CheckCircleIcon />
                            </IconButton>
                        </span>
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

    return (
        <MainLayout>
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
                    onSuccess={(list) => {
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
            </Box>
        </MainLayout>
    );
}
