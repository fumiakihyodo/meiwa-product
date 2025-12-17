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
import { customerApi } from '@/services/apiCustomer';
import {
    SuppliedItemList,
    SuppliedItemListStatus,
    SuppliedItemListCreateData,
    SuppliedItemInventory,
} from '@/types/purchases';
import { Customer } from '@/types/customer';

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
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<SuppliedItemListStatus | ''>('');
    const [customerFilter, setCustomerFilter] = useState<number | ''>('');

    // ダイアログ関連
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [csvDialogOpen, setCsvDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedList, setSelectedList] = useState<SuppliedItemList | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ message: string; errors?: string[] } | null>(null);

    // フォームデータ
    const [formData, setFormData] = useState<SuppliedItemListCreateData>({
        customer: 0,
        delivery_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [listsData, customersData, inventoriesData] = await Promise.all([
                purchasesApi.getSuppliedItemLists({
                    search: searchText || undefined,
                    status: statusFilter || undefined,
                    customer: customerFilter || undefined,
                }),
                customerApi.getCustomers(),
                purchasesApi.getSuppliedItemInventories(),
            ]);
            setLists(listsData);
            setCustomers(customersData);
            setInventories(inventoriesData);
        } catch (error) {
            console.error('データ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    }, [searchText, statusFilter, customerFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // リスト作成
    const handleCreateList = async () => {
        if (!formData.customer || !formData.delivery_date) {
            return;
        }
        try {
            await purchasesApi.createSuppliedItemList(formData);
            setCreateDialogOpen(false);
            setFormData({ customer: 0, delivery_date: new Date().toISOString().split('T')[0], notes: '' });
            fetchData();
        } catch (error) {
            console.error('リスト作成エラー:', error);
        }
    };

    // CSVインポート
    const handleCsvImport = async () => {
        if (!selectedList || !csvFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await purchasesApi.importSuppliedItemListCsv(selectedList.id, csvFile);
            setImportResult(result);
            fetchData();
        } catch (error) {
            console.error('CSVインポートエラー:', error);
            setImportResult({ message: 'インポートに失敗しました', errors: ['エラーが発生しました'] });
        } finally {
            setImporting(false);
        }
    };

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
        { field: 'customer_name', headerName: '取引先', width: 150 },
        { field: 'delivery_date', headerName: '納品予定日', width: 120 },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 130,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => (
                <StatusChip status={params.row.status} statusDisplay={params.row.status_display} />
            ),
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
        { field: 'total_items', headerName: '品番数', width: 80, type: 'number' },
        { field: 'total_quantity', headerName: '合計数量', width: 100, type: 'number' },
        {
            field: 'actions',
            headerName: '操作',
            width: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<SuppliedItemList>) => (
                <Box>
                    <Tooltip title="詳細">
                        <IconButton
                            size="small"
                            onClick={() => window.location.href = `/supplied-item-inventory/${params.row.id}`}
                        >
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="CSVインポート">
                        <IconButton
                            size="small"
                            onClick={() => {
                                setSelectedList(params.row);
                                setCsvDialogOpen(true);
                            }}
                            disabled={params.row.status !== 'draft' && params.row.status !== 'pending_receiving'}
                        >
                            <UploadIcon />
                        </IconButton>
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
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            新規リスト作成
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
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>取引先</InputLabel>
                                <Select
                                    value={customerFilter}
                                    label="取引先"
                                    onChange={(e) => setCustomerFilter(e.target.value as number | '')}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {customers.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>
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

                {/* リスト作成ダイアログ */}
                <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>新規支給品リスト作成</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <FormControl fullWidth required>
                                <InputLabel>取引先</InputLabel>
                                <Select
                                    value={formData.customer || ''}
                                    label="取引先"
                                    onChange={(e) => setFormData({ ...formData, customer: e.target.value as number })}
                                >
                                    {customers.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="納品予定日"
                                type="date"
                                value={formData.delivery_date}
                                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                                fullWidth
                            />
                            <TextField
                                label="備考"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                multiline
                                rows={3}
                                fullWidth
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateList}
                            disabled={!formData.customer || !formData.delivery_date}
                        >
                            作成
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* CSVインポートダイアログ */}
                <Dialog open={csvDialogOpen} onClose={() => { setCsvDialogOpen(false); setImportResult(null); setCsvFile(null); }} maxWidth="sm" fullWidth>
                    <DialogTitle>CSVインポート</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                CSVファイルをアップロードして支給品リストにデータをインポートします。
                            </Typography>
                            <Alert severity="info">
                                CSVファイルには以下のカラムが必要です：<br />
                                品番, 品名, 数量<br />
                                オプション: 単位, 入数, 箱数, 備考
                            </Alert>
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadIcon />}
                            >
                                ファイルを選択
                                <input
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                />
                            </Button>
                            {csvFile && (
                                <Typography variant="body2">
                                    選択されたファイル: {csvFile.name}
                                </Typography>
                            )}
                            {importing && <CircularProgress />}
                            {importResult && (
                                <Alert severity={importResult.errors?.length ? 'warning' : 'success'}>
                                    {importResult.message}
                                    {importResult.errors && (
                                        <ul>
                                            {importResult.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </Alert>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setCsvDialogOpen(false); setImportResult(null); setCsvFile(null); }}>閉じる</Button>
                        <Button
                            variant="contained"
                            onClick={handleCsvImport}
                            disabled={!csvFile || importing}
                        >
                            インポート
                        </Button>
                    </DialogActions>
                </Dialog>

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
