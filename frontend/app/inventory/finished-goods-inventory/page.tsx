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
    History as HistoryIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Clear as ClearIcon,
    Build as BuildIcon,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { productApi } from '@/services/apiProduct';
import { manufacturingItemApi, productionPlanApi, ProductionPlan, ManufacturingItem } from '@/services/apiManufacturing';
import { buildInventoryFromPlans, filterFinishedGoodsInventory } from '@/services/apiFinishedGoodsInventory';
import { Product } from '@/types/product';
import {
    FinishedGoodsWithInventory,
    FinishedGoodsInventoryStatusLabels,
} from '@/types/manufacturing-inventory';
import {
    FinishedGoodsAdjustmentModal,
    FinishedGoodsDetailModal,
} from '@/components/FinishedGoodsInventory';

// localStorage キー
const DEFAULT_PRODUCT_KEY = 'finished_goods_inventory_default_product';

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

export default function FinishedGoodsInventoryPage() {
    // タブ状態
    const [tabValue, setTabValue] = useState(0);

    // データ
    const [inventoryItems, setInventoryItems] = useState<FinishedGoodsWithInventory[]>([]);
    const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
    const [manufacturingItems, setManufacturingItems] = useState<ManufacturingItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingInventory, setLoadingInventory] = useState(false);

    // フィルタ
    const [searchText, setSearchText] = useState('');
    const [productFilter, setProductFilter] = useState<number | ''>('');
    const [showZeroStock, setShowZeroStock] = useState(false);

    // モーダル関連
    const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<FinishedGoodsWithInventory | null>(null);
    const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<FinishedGoodsWithInventory | null>(null);

    // デフォルト製品の初期化済みフラグ
    const [defaultProductInitialized, setDefaultProductInitialized] = useState(false);

    // フィルタリングされた在庫一覧
    const filteredInventoryItems = useMemo(() => {
        return filterFinishedGoodsInventory(inventoryItems, {
            search: searchText,
            productId: productFilter || undefined,
            showZeroStock,
        });
    }, [inventoryItems, searchText, productFilter, showZeroStock]);

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

        inventoryItems.forEach((item) => {
            const productId = item.product_id || 0;
            if (summaryMap.has(productId)) {
                const existing = summaryMap.get(productId)!;
                existing.itemCount += 1;
                existing.totalQuantity += item.total_quantity || 0;
            } else {
                summaryMap.set(productId, {
                    productId,
                    productNumber: item.product_number || '-',
                    productName: item.product_name || '製品未設定',
                    itemCount: 1,
                    totalQuantity: item.total_quantity || 0,
                });
            }
        });

        return Array.from(summaryMap.values()).sort((a, b) =>
            a.productNumber.localeCompare(b.productNumber)
        );
    }, [inventoryItems]);

    // デフォルト製品を初期化（products読み込み後1回のみ）
    useEffect(() => {
        if (!defaultProductInitialized && products.length > 0) {
            const defaultId = getDefaultProductId();
            if (defaultId && products.some((p) => p.id === defaultId)) {
                setProductFilter(defaultId);
            }
            setDefaultProductInitialized(true);
        }
    }, [products, defaultProductInitialized]);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [productsData, itemsData, plansData] = await Promise.all([
                productApi.getProducts(),
                manufacturingItemApi.getItems(),
                productionPlanApi.getPlans(),
            ]);
            setProducts(productsData);
            setManufacturingItems(itemsData);
            setProductionPlans(plansData);

            // 生産計画から在庫データを構築
            const inventoryData = await buildInventoryFromPlans(plansData, itemsData);
            setInventoryItems(inventoryData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 製品フィルタ変更時のデータ再取得
    const fetchInventoryByProduct = useCallback(async (productId: number) => {
        setLoadingInventory(true);
        try {
            const filteredItems = manufacturingItems.filter(
                (item) => item.product === productId
            );
            const filteredPlans = productionPlans.filter(
                (plan) => plan.product === productId
            );
            const inventoryData = await buildInventoryFromPlans(filteredPlans, filteredItems);
            setInventoryItems(inventoryData);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoadingInventory(false);
        }
    }, [manufacturingItems, productionPlans]);

    // 製品フィルタ変更時
    useEffect(() => {
        if (productFilter && manufacturingItems.length > 0) {
            fetchInventoryByProduct(productFilter);
        } else if (manufacturingItems.length > 0 && productionPlans.length > 0) {
            // フィルタなしの場合は全データを再構築
            buildInventoryFromPlans(productionPlans, manufacturingItems).then(setInventoryItems);
        }
    }, [productFilter, fetchInventoryByProduct, manufacturingItems, productionPlans]);

    // デフォルト製品を設定/解除
    const handleSetDefaultProductForFilters = (productId: number) => {
        const currentDefault = getDefaultProductId();
        if (currentDefault === productId) {
            setDefaultProductId(null);
        } else {
            setDefaultProductId(productId);
        }
        setProductFilter((prev: number | '') => prev);
    };

    // 詳細モーダルを開く
    const handleOpenDetailModal = (item: FinishedGoodsWithInventory) => {
        setSelectedItem(item);
        setDetailModalOpen(true);
    };

    // 詳細モーダルを閉じる
    const handleCloseDetailModal = () => {
        setDetailModalOpen(false);
        setSelectedItem(null);
    };

    // 調整モーダルを開く
    const handleOpenAdjustmentModal = (item?: FinishedGoodsWithInventory) => {
        setSelectedItemForAdjustment(item || null);
        setAdjustmentModalOpen(true);
    };

    // 調整モーダルを閉じる
    const handleCloseAdjustmentModal = () => {
        setAdjustmentModalOpen(false);
        setSelectedItemForAdjustment(null);
    };

    // 調整完了後の処理
    const handleAdjustmentComplete = async () => {
        handleCloseAdjustmentModal();
        await fetchData();
    };

    // 在庫一覧カラム定義
    const inventoryColumns: GridColDef[] = [
        {
            field: 'manufacturing_number',
            headerName: '品番',
            width: 150,
        },
        {
            field: 'manufacturing_name',
            headerName: '製作品名',
            width: 250,
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 200,
            valueGetter: (value: string, row: FinishedGoodsWithInventory) =>
                row.product_number
                    ? `${row.product_number} - ${row.product_name || ''}`
                    : row.product_name || '-',
        },
        {
            field: 'total_quantity',
            headerName: '在庫数量',
            width: 150,
            type: 'number',
            renderCell: (params: GridRenderCellParams<FinishedGoodsWithInventory>) => {
                const qty = params.row.total_quantity || 0;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            fontWeight={qty > 0 ? 'bold' : 'normal'}
                            color={qty > 0 ? 'success.main' : 'text.secondary'}
                        >
                            {qty.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {params.row.unit}
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: 'available_quantity',
            headerName: '出荷可能',
            width: 120,
            type: 'number',
            renderCell: (params: GridRenderCellParams<FinishedGoodsWithInventory>) => (
                <Chip
                    size="small"
                    label={`${params.row.available_quantity || 0}`}
                    color={params.row.available_quantity > 0 ? 'success' : 'default'}
                    variant="outlined"
                />
            ),
        },
        {
            field: 'reserved_quantity',
            headerName: '予約済み',
            width: 100,
            type: 'number',
            renderCell: (params: GridRenderCellParams<FinishedGoodsWithInventory>) => {
                const qty = params.row.reserved_quantity || 0;
                return qty > 0 ? (
                    <Chip size="small" label={`${qty}`} color="info" variant="outlined" />
                ) : (
                    <Typography color="text.disabled">-</Typography>
                );
            },
        },
        {
            field: 'actions',
            headerName: '操作',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<FinishedGoodsWithInventory>) => (
                <Box sx={{ display: 'flex', gap: 0.5, height: '100%', alignItems: 'center' }}>
                    <Tooltip title="詳細・履歴">
                        <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenDetailModal(params.row)}
                        >
                            <HistoryIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="在庫調整">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenAdjustmentModal(params.row)}
                        >
                            <BuildIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    // 生産計画一覧カラム定義
    const planColumns: GridColDef[] = [
        {
            field: 'plan_number',
            headerName: '計画番号',
            width: 160,
        },
        {
            field: 'manufacturing_item_name',
            headerName: '製作品名',
            width: 200,
            valueGetter: (value: string, row: ProductionPlan) =>
                `${row.manufacturing_item_number || ''} - ${row.manufacturing_item_name || ''}`,
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 120,
            renderCell: (params: GridRenderCellParams<ProductionPlan>) => {
                const statusColors: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
                    draft: 'default',
                    planned: 'info',
                    in_progress: 'warning',
                    completed: 'success',
                    cancelled: 'error',
                    on_hold: 'default',
                };
                const statusLabels: Record<string, string> = {
                    draft: '下書き',
                    planned: '計画済み',
                    in_progress: '製造中',
                    completed: '完了',
                    cancelled: 'キャンセル',
                    on_hold: '保留',
                };
                return (
                    <Chip
                        size="small"
                        label={statusLabels[params.row.status] || params.row.status}
                        color={statusColors[params.row.status] || 'default'}
                    />
                );
            },
        },
        {
            field: 'total_planned_quantity',
            headerName: '計画数量',
            width: 100,
            type: 'number',
        },
        {
            field: 'completed_quantity',
            headerName: '完成数量',
            width: 100,
            type: 'number',
            renderCell: (params: GridRenderCellParams<ProductionPlan>) => (
                <Typography
                    fontWeight={params.row.completed_quantity > 0 ? 'bold' : 'normal'}
                    color={params.row.completed_quantity > 0 ? 'success.main' : 'text.secondary'}
                >
                    {params.row.completed_quantity || 0}
                </Typography>
            ),
        },
        {
            field: 'completion_rate',
            headerName: '進捗',
            width: 100,
            renderCell: (params: GridRenderCellParams<ProductionPlan>) => {
                const rate = params.row.completion_rate || 0;
                return (
                    <Chip
                        size="small"
                        label={`${rate}%`}
                        color={rate >= 100 ? 'success' : rate > 0 ? 'warning' : 'default'}
                        variant="outlined"
                    />
                );
            },
        },
        {
            field: 'planned_start_date',
            headerName: '開始予定日',
            width: 120,
        },
        {
            field: 'planned_end_date',
            headerName: '完了予定日',
            width: 120,
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    製作品在庫管理
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAdjustmentModal()}
                    >
                        在庫登録
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
                <Tab label="在庫一覧" />
                <Tab label="生産計画" />
            </Tabs>

            <Paper sx={{ mb: 3 }}>
                {/* 在庫一覧タブ */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        {/* フィルタ */}
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                                <FormControl size="small" sx={{ minWidth: 320 }}>
                                    <InputLabel>製品を選択</InputLabel>
                                    <Select
                                        value={productFilter}
                                        label="製品を選択"
                                        onChange={(e: SelectChangeEvent<number | ''>) => {
                                            const val = e.target.value as number | '';
                                            setProductFilter(val);
                                        }}
                                        renderValue={(selected: number | '') => {
                                            if (!selected) return '-- すべての製品 --';
                                            const product = products.find((p: Product) => p.id === selected);
                                            if (!product) return '-- すべての製品 --';
                                            const isDefault = getDefaultProductId() === product.id;
                                            return (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {isDefault && <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                                                    {product.product_number} - {product.product_name}
                                                </Box>
                                            );
                                        }}
                                    >
                                        <MenuItem value="">-- すべての製品 --</MenuItem>
                                        {products.map((p) => {
                                            const isDefault = getDefaultProductId() === p.id;
                                            return (
                                                <MenuItem key={p.id} value={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Tooltip title={isDefault ? 'デフォルトを解除' : 'デフォルトに設定'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                                {productFilter && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setProductFilter('')}
                                        title="選択解除"
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                )}
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={showZeroStock}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowZeroStock(e.target.checked)}
                                        />
                                    }
                                    label="在庫0も表示"
                                />
                            </Box>
                        </Paper>

                        {/* 在庫サマリー */}
                        {productInventorySummaries.length > 0 && (
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>在庫サマリー</Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">製作品数</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {filteredInventoryItems.length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">在庫あり</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="success.main">
                                            {filteredInventoryItems.filter((i: FinishedGoodsWithInventory) => i.total_quantity > 0).length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">在庫なし</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="error.main">
                                            {filteredInventoryItems.filter((i: FinishedGoodsWithInventory) => i.total_quantity === 0).length} 品目
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">合計在庫数量</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {filteredInventoryItems.reduce((acc: number, i: FinishedGoodsWithInventory) => acc + (i.total_quantity || 0), 0).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {/* 製品未選択時のメッセージ */}
                        {!productFilter && inventoryItems.length === 0 && !loading && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                製品を選択するか、生産計画を作成して製作品の在庫を管理してください。
                            </Alert>
                        )}

                        {/* ローディング */}
                        {(loading || loadingInventory) && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        {/* 在庫一覧DataGrid */}
                        {!loading && !loadingInventory && (
                            <DataGrid
                                rows={filteredInventoryItems}
                                columns={inventoryColumns}
                                loading={loading || loadingInventory}
                                getRowId={(row: FinishedGoodsWithInventory) => row.manufacturing_item_id}
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

                {/* 生産計画タブ */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            生産計画で完了した製作品は自動的に在庫として計上されます。
                        </Alert>

                        {/* 生産計画一覧DataGrid */}
                        <DataGrid
                            rows={productionPlans}
                            columns={planColumns}
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
            </Paper>

            {/* 詳細モーダル */}
            <FinishedGoodsDetailModal
                open={detailModalOpen}
                onClose={handleCloseDetailModal}
                item={selectedItem}
            />

            {/* 調整モーダル */}
            <FinishedGoodsAdjustmentModal
                open={adjustmentModalOpen}
                onClose={handleCloseAdjustmentModal}
                onComplete={handleAdjustmentComplete}
                item={selectedItemForAdjustment}
                manufacturingItems={manufacturingItems}
                productionPlans={productionPlans}
            />
        </Box>
    );
}
