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
    Radio,
    RadioGroup,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    TrendingUp as IncreaseIcon,
    TrendingDown as DecreaseIcon,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import {
    InventoryAdjustment,
    InventoryAdjustmentCreateRequest,
    InventoryForAdjustment,
    InventoryItemType,
    AdjustmentType,
    InventoryAdjustmentReason,
    InventoryAdjustmentReasonLabels,
} from '@/types/purchases';
import { Product } from '@/types/product';

// タブパネル用コンポーネント
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
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// デフォルト設定用のlocalStorageキー
const STORAGE_KEY_DEFAULT_ITEM_TYPE = 'inventoryAdjustment_defaultItemType';
const STORAGE_KEY_DEFAULT_PRODUCT = 'inventoryAdjustment_defaultProduct';
const STORAGE_KEY_INCLUDE_ALL_MASTER = 'inventoryAdjustment_includeAllMaster';
const STORAGE_KEY_LOAD_LIMIT = 'inventoryAdjustment_loadLimit';

// デフォルト設定を取得
const getDefaultItemType = (): InventoryItemType | '' => {
    if (typeof window === 'undefined') return '';
    return (localStorage.getItem(STORAGE_KEY_DEFAULT_ITEM_TYPE) as InventoryItemType) || '';
};

const getDefaultProduct = (): number | '' => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(STORAGE_KEY_DEFAULT_PRODUCT);
    return stored ? parseInt(stored, 10) : '';
};

const getIncludeAllMaster = (): boolean => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY_INCLUDE_ALL_MASTER) !== 'false';
};

const getLoadLimit = (): number | '' => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(STORAGE_KEY_LOAD_LIMIT);
    return stored ? parseInt(stored, 10) : '';
};

export default function InventoryAdjustmentPage() {
    // タブ
    const [tabValue, setTabValue] = useState(0);

    // 製品一覧
    const [products, setProducts] = useState<Product[]>([]);

    // 在庫一覧（調整用）
    const [inventoryList, setInventoryList] = useState<InventoryForAdjustment[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState<InventoryItemType | ''>(getDefaultItemType());
    const [inventoryProductFilter, setInventoryProductFilter] = useState<number | ''>(getDefaultProduct());
    const [inventorySearch, setInventorySearch] = useState('');

    // 追加設定
    const [includeAllMaster, setIncludeAllMaster] = useState(getIncludeAllMaster());
    const [loadLimit, setLoadLimit] = useState<number | ''>(getLoadLimit());
    const [defaultsInitialized, setDefaultsInitialized] = useState(false);

    // 調整履歴一覧
    const [adjustmentHistory, setAdjustmentHistory] = useState<InventoryAdjustment[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyTypeFilter, setHistoryTypeFilter] = useState<InventoryItemType | ''>('');
    const [historyProductFilter, setHistoryProductFilter] = useState<number | ''>('');
    const [historySearch, setHistorySearch] = useState('');

    // 在庫調整ダイアログ
    const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<InventoryForAdjustment | null>(null);
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increase');
    const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
    const [adjustmentReason, setAdjustmentReason] = useState<InventoryAdjustmentReason>('stocktaking');
    const [adjustmentNotes, setAdjustmentNotes] = useState('');
    const [adjustingInProgress, setAdjustingInProgress] = useState(false);

    // 製品一覧を取得
    const fetchProducts = useCallback(async () => {
        try {
            const data = await productApi.getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    }, []);

    // 在庫一覧を取得（調整用）
    const fetchInventoryList = useCallback(async () => {
        setLoadingInventory(true);
        try {
            const params: {
                item_type?: InventoryItemType;
                product?: number;
                search?: string;
                include_all_master?: boolean;
                limit?: number;
            } = {};

            if (inventoryTypeFilter) params.item_type = inventoryTypeFilter;
            if (inventoryProductFilter) params.product = inventoryProductFilter;
            if (inventorySearch) params.search = inventorySearch;
            params.include_all_master = includeAllMaster;
            if (loadLimit) params.limit = loadLimit;

            const data = await purchasesApi.getInventoryForAdjustment(params);
            setInventoryList(data);
        } catch (error) {
            console.error('Failed to fetch inventory list:', error);
        } finally {
            setLoadingInventory(false);
        }
    }, [inventoryTypeFilter, inventoryProductFilter, inventorySearch, includeAllMaster, loadLimit]);

    // 調整履歴を取得
    const fetchAdjustmentHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const params: {
                item_type?: InventoryItemType;
                product?: number;
                search?: string;
            } = {};

            if (historyTypeFilter) params.item_type = historyTypeFilter;
            if (historyProductFilter) params.product = historyProductFilter;
            if (historySearch) params.search = historySearch;

            const data = await purchasesApi.getInventoryAdjustments(params);
            setAdjustmentHistory(data);
        } catch (error) {
            console.error('Failed to fetch adjustment history:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, [historyTypeFilter, historyProductFilter, historySearch]);

    // 初期データ取得
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // タブ変更時のデータ取得
    useEffect(() => {
        if (tabValue === 0) {
            fetchInventoryList();
        } else if (tabValue === 1) {
            fetchAdjustmentHistory();
        }
    }, [tabValue, fetchInventoryList, fetchAdjustmentHistory]);

    // 在庫調整ダイアログを開く
    const handleOpenAdjustmentDialog = (inventory: InventoryForAdjustment) => {
        setSelectedInventory(inventory);
        setAdjustmentType('increase');
        setAdjustmentQuantity(0);
        setAdjustmentReason('stocktaking');
        setAdjustmentNotes('');
        setAdjustmentDialogOpen(true);
    };

    // 在庫調整ダイアログを閉じる
    const handleCloseAdjustmentDialog = () => {
        setAdjustmentDialogOpen(false);
        setSelectedInventory(null);
        setAdjustmentType('increase');
        setAdjustmentQuantity(0);
        setAdjustmentReason('stocktaking');
        setAdjustmentNotes('');
    };

    // 在庫調整実行
    const handleConfirmAdjustment = async () => {
        if (!selectedInventory || adjustmentQuantity <= 0) return;

        // 減少の場合、在庫数を超えていないかチェック
        if (adjustmentType === 'decrease' && adjustmentQuantity > selectedInventory.quantity) {
            alert('調整数量が現在の在庫数を超えています');
            return;
        }

        setAdjustingInProgress(true);
        try {
            const requestData: InventoryAdjustmentCreateRequest = {
                item_type: selectedInventory.item_type,
                adjustment_type: adjustmentType,
                quantity: adjustmentQuantity,
                reason: adjustmentReason,
                notes: adjustmentNotes,
            };

            // 在庫タイプに応じてIDを設定
            if (selectedInventory.item_type === 'supplied') {
                requestData.supplied_item_inventory = selectedInventory.inventory_id;
            } else {
                requestData.purchased_item_inventory = selectedInventory.inventory_id;
            }

            await purchasesApi.createInventoryAdjustment(requestData);

            // 成功したらリストを更新
            await fetchInventoryList();
            handleCloseAdjustmentDialog();

            const changeDisplay = adjustmentType === 'increase' ? `+${adjustmentQuantity}` : `-${adjustmentQuantity}`;
            alert(`在庫を調整しました: ${selectedInventory.item_number} (${changeDisplay})`);
        } catch (error) {
            console.error('Failed to adjust inventory:', error);
            alert('在庫調整に失敗しました');
        } finally {
            setAdjustingInProgress(false);
        }
    };

    // 在庫一覧カラム
    const inventoryColumns: GridColDef[] = [
        {
            field: 'item_type_display',
            headerName: '種別',
            width: 100,
            renderCell: (params: GridRenderCellParams<InventoryForAdjustment>) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={params.row.item_type === 'supplied' ? 'primary' : 'secondary'}
                    variant="outlined"
                />
            ),
        },
        { field: 'item_number', headerName: '品番', width: 150 },
        { field: 'item_name', headerName: '品名', width: 200 },
        { field: 'product_name', headerName: '製品', width: 150 },
        {
            field: 'quantity',
            headerName: '在庫数',
            width: 100,
            type: 'number',
            renderCell: (params: GridRenderCellParams<InventoryForAdjustment>) => (
                <Typography fontWeight="bold">
                    {params.value} {params.row.unit || ''}
                </Typography>
            ),
        },
        { field: 'lot_number', headerName: 'ロット番号', width: 120 },
        { field: 'received_date', headerName: '入庫日', width: 120 },
        {
            field: 'actions',
            headerName: '操作',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<InventoryForAdjustment>) => (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenAdjustmentDialog(params.row)}
                >
                    調整
                </Button>
            ),
        },
    ];

    // 調整履歴カラム
    const historyColumns: GridColDef[] = [
        {
            field: 'created_at',
            headerName: '調整日時',
            width: 160,
            valueGetter: (value: string) => {
                if (!value) return '';
                return new Date(value).toLocaleString('ja-JP');
            },
        },
        {
            field: 'item_type_display',
            headerName: '種別',
            width: 90,
            renderCell: (params: GridRenderCellParams<InventoryAdjustment>) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={params.row.item_type === 'supplied' ? 'primary' : 'secondary'}
                    variant="outlined"
                />
            ),
        },
        { field: 'item_number', headerName: '品番', width: 140 },
        { field: 'item_name', headerName: '品名', width: 180 },
        {
            field: 'adjustment_type_display',
            headerName: '調整',
            width: 80,
            renderCell: (params: GridRenderCellParams<InventoryAdjustment>) => (
                <Chip
                    icon={params.row.adjustment_type === 'increase' ? <IncreaseIcon /> : <DecreaseIcon />}
                    label={params.value}
                    size="small"
                    color={params.row.adjustment_type === 'increase' ? 'success' : 'error'}
                />
            ),
        },
        {
            field: 'quantity',
            headerName: '数量',
            width: 80,
            type: 'number',
            renderCell: (params: GridRenderCellParams<InventoryAdjustment>) => {
                const sign = params.row.adjustment_type === 'increase' ? '+' : '-';
                return (
                    <Typography
                        color={params.row.adjustment_type === 'increase' ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                    >
                        {sign}{params.value}
                    </Typography>
                );
            },
        },
        {
            field: 'quantity_change',
            headerName: '変化',
            width: 120,
            renderCell: (params: GridRenderCellParams<InventoryAdjustment>) => (
                <Typography variant="body2">
                    {params.row.quantity_before} → {params.row.quantity_after}
                </Typography>
            ),
        },
        { field: 'reason_display', headerName: '理由', width: 100 },
        { field: 'notes', headerName: '備考', width: 150 },
        { field: 'created_by_name', headerName: '担当者', width: 100 },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">在庫調整</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                            if (tabValue === 0) fetchInventoryList();
                            else fetchAdjustmentHistory();
                        }}
                    >
                        更新
                    </Button>
                </Box>
            </Box>

            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="在庫調整" />
                <Tab label="調整履歴" />
            </Tabs>

            {/* 在庫調整タブ */}
            <TabPanel value={tabValue} index={0}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>種別</InputLabel>
                            <Select
                                value={inventoryTypeFilter}
                                label="種別"
                                onChange={(e: SelectChangeEvent<InventoryItemType | ''>) =>
                                    setInventoryTypeFilter(e.target.value as InventoryItemType | '')
                                }
                            >
                                <MenuItem value="">すべて</MenuItem>
                                <MenuItem value="supplied">支給品</MenuItem>
                                <MenuItem value="purchased">購入品</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>製品</InputLabel>
                            <Select
                                value={inventoryProductFilter}
                                label="製品"
                                onChange={(e: SelectChangeEvent<number | ''>) =>
                                    setInventoryProductFilter(e.target.value as number | '')
                                }
                            >
                                <MenuItem value="">すべて</MenuItem>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.product_number} - {p.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            placeholder="品番・品名で検索"
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchInventoryList();
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>読込制限</InputLabel>
                            <Select
                                value={loadLimit}
                                label="読込制限"
                                onChange={(e: SelectChangeEvent<number | ''>) => {
                                    const val = e.target.value as number | '';
                                    setLoadLimit(val);
                                    if (val) {
                                        localStorage.setItem(STORAGE_KEY_LOAD_LIMIT, String(val));
                                    } else {
                                        localStorage.removeItem(STORAGE_KEY_LOAD_LIMIT);
                                    }
                                }}
                            >
                                <MenuItem value="">無制限</MenuItem>
                                <MenuItem value={50}>50件</MenuItem>
                                <MenuItem value={100}>100件</MenuItem>
                                <MenuItem value={200}>200件</MenuItem>
                                <MenuItem value={500}>500件</MenuItem>
                            </Select>
                        </FormControl>

                        <Tooltip title="更新">
                            <IconButton onClick={fetchInventoryList}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includeAllMaster}
                                    onChange={(e) => {
                                        setIncludeAllMaster(e.target.checked);
                                        localStorage.setItem(STORAGE_KEY_INCLUDE_ALL_MASTER, String(e.target.checked));
                                    }}
                                />
                            }
                            label="在庫がない部品も表示"
                        />

                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                                // 現在の設定をデフォルトとして保存
                                if (inventoryTypeFilter) {
                                    localStorage.setItem(STORAGE_KEY_DEFAULT_ITEM_TYPE, inventoryTypeFilter);
                                } else {
                                    localStorage.removeItem(STORAGE_KEY_DEFAULT_ITEM_TYPE);
                                }
                                if (inventoryProductFilter) {
                                    localStorage.setItem(STORAGE_KEY_DEFAULT_PRODUCT, String(inventoryProductFilter));
                                } else {
                                    localStorage.removeItem(STORAGE_KEY_DEFAULT_PRODUCT);
                                }
                                alert('現在のフィルタ設定をデフォルトとして保存しました');
                            }}
                        >
                            現在の設定をデフォルトに
                        </Button>

                        <Typography variant="body2" color="text.secondary">
                            {inventoryList.length}件表示
                        </Typography>
                    </Box>
                </Paper>

                <Paper sx={{ height: 600 }}>
                    <DataGrid
                        rows={inventoryList}
                        columns={inventoryColumns}
                        loading={loadingInventory}
                        pageSizeOptions={[25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        disableRowSelectionOnClick
                        getRowId={(row) => `${row.item_type}-${row.id}`}
                    />
                </Paper>
            </TabPanel>

            {/* 調整履歴タブ */}
            <TabPanel value={tabValue} index={1}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>種別</InputLabel>
                            <Select
                                value={historyTypeFilter}
                                label="種別"
                                onChange={(e: SelectChangeEvent<InventoryItemType | ''>) =>
                                    setHistoryTypeFilter(e.target.value as InventoryItemType | '')
                                }
                            >
                                <MenuItem value="">すべて</MenuItem>
                                <MenuItem value="supplied">支給品</MenuItem>
                                <MenuItem value="purchased">購入品</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>製品</InputLabel>
                            <Select
                                value={historyProductFilter}
                                label="製品"
                                onChange={(e: SelectChangeEvent<number | ''>) =>
                                    setHistoryProductFilter(e.target.value as number | '')
                                }
                            >
                                <MenuItem value="">すべて</MenuItem>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.product_number} - {p.product_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            placeholder="品番・品名で検索"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchAdjustmentHistory();
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Tooltip title="更新">
                            <IconButton onClick={fetchAdjustmentHistory}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Paper>

                <Paper sx={{ height: 600 }}>
                    <DataGrid
                        rows={adjustmentHistory}
                        columns={historyColumns}
                        loading={loadingHistory}
                        pageSizeOptions={[25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        disableRowSelectionOnClick
                    />
                </Paper>
            </TabPanel>

            {/* 在庫調整ダイアログ */}
            <Dialog
                open={adjustmentDialogOpen}
                onClose={handleCloseAdjustmentDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>在庫調整</DialogTitle>
                <DialogContent>
                    {selectedInventory && (
                        <Box sx={{ mt: 1 }}>
                            {/* 対象在庫情報 */}
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    対象在庫
                                </Typography>
                                <Chip
                                    label={selectedInventory.item_type_display}
                                    size="small"
                                    color={selectedInventory.item_type === 'supplied' ? 'primary' : 'secondary'}
                                    sx={{ mb: 1 }}
                                />
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedInventory.item_number} - {selectedInventory.item_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    製品: {selectedInventory.product_name || '-'}
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    現在の在庫: {selectedInventory.quantity} {selectedInventory.unit || ''}
                                </Typography>
                            </Paper>

                            {/* 増加/減少 ラジオボタン */}
                            <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                                <FormLabel component="legend">調整タイプ</FormLabel>
                                <RadioGroup
                                    row
                                    value={adjustmentType}
                                    onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                                >
                                    <FormControlLabel
                                        value="increase"
                                        control={<Radio color="success" />}
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IncreaseIcon color="success" fontSize="small" />
                                                増加（+）
                                            </Box>
                                        }
                                    />
                                    <FormControlLabel
                                        value="decrease"
                                        control={<Radio color="error" />}
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <DecreaseIcon color="error" fontSize="small" />
                                                減少（-）
                                            </Box>
                                        }
                                    />
                                </RadioGroup>
                            </FormControl>

                            {/* 調整理由 */}
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel>調整理由</InputLabel>
                                <Select
                                    value={adjustmentReason}
                                    label="調整理由"
                                    onChange={(e: SelectChangeEvent<InventoryAdjustmentReason>) =>
                                        setAdjustmentReason(e.target.value as InventoryAdjustmentReason)
                                    }
                                >
                                    {(Object.keys(InventoryAdjustmentReasonLabels) as InventoryAdjustmentReason[]).map((key) => (
                                        <MenuItem key={key} value={key}>
                                            {InventoryAdjustmentReasonLabels[key]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* 調整数量 */}
                            <TextField
                                fullWidth
                                label="調整数量"
                                type="number"
                                value={adjustmentQuantity || ''}
                                onChange={(e) => {
                                    const val = Math.abs(parseInt(e.target.value, 10) || 0);
                                    setAdjustmentQuantity(val);
                                }}
                                inputProps={{ min: 1 }}
                                sx={{ mb: 2 }}
                                helperText={(() => {
                                    const changeAmount = adjustmentType === 'increase'
                                        ? adjustmentQuantity
                                        : -adjustmentQuantity;
                                    const newQty = selectedInventory.quantity + changeAmount;
                                    return `調整後の在庫: ${newQty} ${selectedInventory.unit || ''}`;
                                })()}
                            />

                            {/* 備考 */}
                            <TextField
                                fullWidth
                                label="備考"
                                multiline
                                rows={2}
                                value={adjustmentNotes}
                                onChange={(e) => setAdjustmentNotes(e.target.value)}
                            />

                            {/* エラー表示 */}
                            {adjustmentType === 'decrease' &&
                                adjustmentQuantity > selectedInventory.quantity && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        調整数量が現在の在庫数を超えています
                                    </Alert>
                                )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdjustmentDialog}>キャンセル</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmAdjustment}
                        disabled={
                            adjustingInProgress ||
                            adjustmentQuantity <= 0 ||
                            (adjustmentType === 'decrease' &&
                                selectedInventory !== null &&
                                adjustmentQuantity > selectedInventory.quantity)
                        }
                    >
                        {adjustingInProgress ? <CircularProgress size={20} /> : '調整実行'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
