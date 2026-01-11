// app/dashboard/master/manufacturing/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    CircularProgress,
    LinearProgress,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    PlayArrow as PlayIcon,
    CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { useFetchData } from '@/hooks/useFetchData';
import {
    manufacturingItemApi,
    productionPlanApi,
    materialApi,
    ManufacturingItem,
    ProductionPlan,
    Material,
} from '@/services/apiManufacturing';
import { productApi } from '@/services/apiProduct';
import { Product } from '@/types/product';
import toast from 'react-hot-toast';
import ManufacturingItemModal from '@/components/manufacturing/ManufacturingItemModal';
import ProductionPlanModal from '@/components/manufacturing/ProductionPlanModal';
import MaterialModal from '@/components/manufacturing/MaterialModal';

// Tab panel component
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
            id={`manufacturing-tabpanel-${index}`}
            aria-labelledby={`manufacturing-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// Status color mapping
const planStatusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    draft: 'default',
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'error',
    on_hold: 'secondary',
};

const planStatusLabels: Record<string, string> = {
    draft: '下書き',
    planned: '計画済み',
    in_progress: '製造中',
    completed: '完了',
    cancelled: 'キャンセル',
    on_hold: '保留',
};

const materialCategoryLabels: Record<string, string> = {
    raw: '原材料',
    semi_finished: '半製品',
    component: '部品',
    consumable: '消耗品',
    other: 'その他',
};

export default function ManufacturingPage() {
    const [tabValue, setTabValue] = useState(0);

    // Manufacturing Items state
    const [selectedItem, setSelectedItem] = useState<ManufacturingItem | null>(null);
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemModalMode, setItemModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
    const [itemSearchText, setItemSearchText] = useState('');

    // Production Plans state
    const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planModalMode, setPlanModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
    const [planSearchText, setPlanSearchText] = useState('');
    const [selectedPlanStatus, setSelectedPlanStatus] = useState<string>('');

    // Materials state
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [materialModalMode, setMaterialModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [deleteMaterialDialogOpen, setDeleteMaterialDialogOpen] = useState(false);
    const [materialSearchText, setMaterialSearchText] = useState('');
    const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>('');

    // Data fetching
    const {
        data: manufacturingItems,
        loading: itemsLoading,
        fetch: fetchItems,
    } = useFetchData<ManufacturingItem[]>({
        fetchFn: useCallback((params) => manufacturingItemApi.getItems(params), []),
        errorMessage: '制作品一覧の取得に失敗しました',
    });

    const {
        data: productionPlans,
        loading: plansLoading,
        fetch: fetchPlans,
    } = useFetchData<ProductionPlan[]>({
        fetchFn: useCallback((params) => productionPlanApi.getPlans(params), []),
        errorMessage: '生産計画一覧の取得に失敗しました',
    });

    const {
        data: materials,
        loading: materialsLoading,
        fetch: fetchMaterials,
    } = useFetchData<Material[]>({
        fetchFn: useCallback((params) => materialApi.getMaterials(params), []),
        errorMessage: '材料一覧の取得に失敗しました',
    });

    const {
        data: products,
        fetch: fetchProducts,
    } = useFetchData<Product[]>({
        fetchFn: useCallback(() => productApi.getProducts(), []),
        errorMessage: '製品一覧の取得に失敗しました',
    });

    // Initial data fetch
    useEffect(() => {
        fetchItems();
        fetchPlans();
        fetchMaterials();
        fetchProducts();
    }, [fetchItems, fetchPlans, fetchMaterials, fetchProducts]);

    // Tab change handler
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // ===== Manufacturing Items handlers =====
    const handleNewItem = useCallback(() => {
        setSelectedItem(null);
        setItemModalMode('create');
        setItemModalOpen(true);
    }, []);

    const handleViewItem = useCallback((item: ManufacturingItem) => {
        setSelectedItem(item);
        setItemModalMode('view');
        setItemModalOpen(true);
    }, []);

    const handleEditItem = useCallback((item: ManufacturingItem) => {
        setSelectedItem(item);
        setItemModalMode('edit');
        setItemModalOpen(true);
    }, []);

    const handleDeleteItemConfirm = useCallback((item: ManufacturingItem) => {
        setSelectedItem(item);
        setDeleteItemDialogOpen(true);
    }, []);

    const handleDeleteItem = useCallback(async () => {
        if (!selectedItem) return;
        try {
            await manufacturingItemApi.deleteItem(selectedItem.id);
            toast.success('制作品を削除しました');
            setDeleteItemDialogOpen(false);
            setSelectedItem(null);
            fetchItems();
        } catch (error) {
            console.error('削除エラー:', error);
            toast.error('制作品の削除に失敗しました');
        }
    }, [selectedItem, fetchItems]);

    const handleItemModalClose = useCallback(() => {
        setItemModalOpen(false);
        setSelectedItem(null);
    }, []);

    const handleItemModalSuccess = useCallback(() => {
        setItemModalOpen(false);
        setSelectedItem(null);
        fetchItems();
    }, [fetchItems]);

    const handleItemSearch = useCallback(() => {
        const params: { search?: string } = {};
        if (itemSearchText) params.search = itemSearchText;
        fetchItems(params);
    }, [itemSearchText, fetchItems]);

    // ===== Production Plans handlers =====
    const handleNewPlan = useCallback(() => {
        setSelectedPlan(null);
        setPlanModalMode('create');
        setPlanModalOpen(true);
    }, []);

    const handleViewPlan = useCallback((plan: ProductionPlan) => {
        setSelectedPlan(plan);
        setPlanModalMode('view');
        setPlanModalOpen(true);
    }, []);

    const handleEditPlan = useCallback((plan: ProductionPlan) => {
        setSelectedPlan(plan);
        setPlanModalMode('edit');
        setPlanModalOpen(true);
    }, []);

    const handleDeletePlanConfirm = useCallback((plan: ProductionPlan) => {
        setSelectedPlan(plan);
        setDeletePlanDialogOpen(true);
    }, []);

    const handleDeletePlan = useCallback(async () => {
        if (!selectedPlan) return;
        try {
            await productionPlanApi.deletePlan(selectedPlan.id);
            toast.success('生産計画を削除しました');
            setDeletePlanDialogOpen(false);
            setSelectedPlan(null);
            fetchPlans();
        } catch (error) {
            console.error('削除エラー:', error);
            toast.error('生産計画の削除に失敗しました');
        }
    }, [selectedPlan, fetchPlans]);

    const handlePlanModalClose = useCallback(() => {
        setPlanModalOpen(false);
        setSelectedPlan(null);
    }, []);

    const handlePlanModalSuccess = useCallback(() => {
        setPlanModalOpen(false);
        setSelectedPlan(null);
        fetchPlans();
    }, [fetchPlans]);

    const handlePlanSearch = useCallback(() => {
        const params: { search?: string; status?: string } = {};
        if (planSearchText) params.search = planSearchText;
        if (selectedPlanStatus) params.status = selectedPlanStatus;
        fetchPlans(params);
    }, [planSearchText, selectedPlanStatus, fetchPlans]);

    // ===== Materials handlers =====
    const handleNewMaterial = useCallback(() => {
        setSelectedMaterial(null);
        setMaterialModalMode('create');
        setMaterialModalOpen(true);
    }, []);

    const handleViewMaterial = useCallback((material: Material) => {
        setSelectedMaterial(material);
        setMaterialModalMode('view');
        setMaterialModalOpen(true);
    }, []);

    const handleEditMaterial = useCallback((material: Material) => {
        setSelectedMaterial(material);
        setMaterialModalMode('edit');
        setMaterialModalOpen(true);
    }, []);

    const handleDeleteMaterialConfirm = useCallback((material: Material) => {
        setSelectedMaterial(material);
        setDeleteMaterialDialogOpen(true);
    }, []);

    const handleDeleteMaterial = useCallback(async () => {
        if (!selectedMaterial) return;
        try {
            await materialApi.deleteMaterial(selectedMaterial.id);
            toast.success('材料を削除しました');
            setDeleteMaterialDialogOpen(false);
            setSelectedMaterial(null);
            fetchMaterials();
        } catch (error) {
            console.error('削除エラー:', error);
            toast.error('材料の削除に失敗しました');
        }
    }, [selectedMaterial, fetchMaterials]);

    const handleMaterialModalClose = useCallback(() => {
        setMaterialModalOpen(false);
        setSelectedMaterial(null);
    }, []);

    const handleMaterialModalSuccess = useCallback(() => {
        setMaterialModalOpen(false);
        setSelectedMaterial(null);
        fetchMaterials();
    }, [fetchMaterials]);

    const handleMaterialSearch = useCallback(() => {
        const params: { search?: string; category?: string } = {};
        if (materialSearchText) params.search = materialSearchText;
        if (selectedMaterialCategory) params.category = selectedMaterialCategory;
        fetchMaterials(params);
    }, [materialSearchText, selectedMaterialCategory, fetchMaterials]);

    // DataGrid columns
    const itemColumns: GridColDef[] = [
        { field: 'manufacturing_number', headerName: '品番', width: 130 },
        { field: 'manufacturing_name', headerName: '制作品名', width: 200 },
        { field: 'product_name', headerName: '製品', width: 150 },
        { field: 'unit', headerName: '単位', width: 80 },
        {
            field: 'standard_production_time',
            headerName: '標準製造時間',
            width: 120,
            renderCell: (params) => params.value ? `${params.value}時間` : '-',
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? '有効' : '無効'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => handleViewItem(params.row)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEditItem(params.row)}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleDeleteItemConfirm(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    const planColumns: GridColDef[] = [
        { field: 'plan_number', headerName: '計画番号', width: 150 },
        { field: 'manufacturing_item_name', headerName: '制作品', width: 180 },
        { field: 'product_name', headerName: '製品', width: 150 },
        {
            field: 'total_planned_quantity',
            headerName: '予定数',
            width: 100,
            type: 'number',
        },
        {
            field: 'completed_quantity',
            headerName: '完成数',
            width: 100,
            type: 'number',
        },
        {
            field: 'completion_rate',
            headerName: '進捗',
            width: 150,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={params.value || 0}
                            color={params.value >= 100 ? 'success' : 'primary'}
                        />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="text.secondary">
                            {params.value || 0}%
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        { field: 'planned_start_date', headerName: '開始予定', width: 110 },
        { field: 'planned_end_date', headerName: '完了予定', width: 110 },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 110,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={planStatusLabels[params.value] || params.value}
                    color={planStatusColors[params.value] || 'default'}
                    size="small"
                />
            ),
        },
        { field: 'priority', headerName: '優先度', width: 80, type: 'number' },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => handleViewPlan(params.row)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEditPlan(params.row)}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleDeletePlanConfirm(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    const materialColumns: GridColDef[] = [
        { field: 'material_code', headerName: '品番', width: 130 },
        { field: 'material_name', headerName: '材料名', width: 180 },
        { field: 'material_type', headerName: '形式', width: 120 },
        {
            field: 'category',
            headerName: 'カテゴリ',
            width: 100,
            renderCell: (params) => materialCategoryLabels[params.value] || params.value,
        },
        { field: 'stock_quantity', headerName: '在庫数', width: 100, type: 'number' },
        { field: 'minimum_stock', headerName: '最小在庫', width: 100, type: 'number' },
        { field: 'unit', headerName: '単位', width: 80 },
        {
            field: 'is_low_stock',
            headerName: '在庫状態',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? '要補充' : '正常'}
                    color={params.value ? 'error' : 'success'}
                    size="small"
                />
            ),
        },
        { field: 'supplier_name', headerName: '仕入先', width: 150 },
        {
            field: 'unit_price',
            headerName: '単価',
            width: 100,
            renderCell: (params) => params.value ? `¥${Number(params.value).toLocaleString()}` : '-',
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? '有効' : '無効'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => handleViewMaterial(params.row)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEditMaterial(params.row)}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleDeleteMaterialConfirm(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
                        製造・材料管理
                    </Typography>

                    <Paper sx={{ width: '100%' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label="manufacturing tabs">
                                <Tab label="制作品管理" id="manufacturing-tab-0" />
                                <Tab label="生産計画" id="manufacturing-tab-1" />
                                <Tab label="材料管理" id="manufacturing-tab-2" />
                            </Tabs>
                        </Box>

                        {/* 制作品管理タブ */}
                        <TabPanel value={tabValue} index={0}>
                            <Box sx={{ p: 2 }}>
                                {/* ヘッダーとボタン */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField
                                            size="small"
                                            placeholder="品番または名称で検索"
                                            value={itemSearchText}
                                            onChange={(e) => setItemSearchText(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleItemSearch()}
                                            sx={{ width: 250 }}
                                        />
                                        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleItemSearch}>
                                            検索
                                        </Button>
                                        <Button variant="outlined" onClick={() => { setItemSearchText(''); fetchItems(); }}>
                                            リセット
                                        </Button>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => fetchItems()} sx={{ mr: 1 }}>
                                            <RefreshIcon />
                                        </IconButton>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewItem}>
                                            新規制作品
                                        </Button>
                                    </Box>
                                </Box>

                                {/* データグリッド */}
                                <DataGrid
                                    rows={manufacturingItems ?? []}
                                    columns={itemColumns}
                                    loading={itemsLoading}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                                    }}
                                    autoHeight
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </TabPanel>

                        {/* 生産計画タブ */}
                        <TabPanel value={tabValue} index={1}>
                            <Box sx={{ p: 2 }}>
                                {/* ヘッダーとボタン */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField
                                            size="small"
                                            placeholder="計画番号で検索"
                                            value={planSearchText}
                                            onChange={(e) => setPlanSearchText(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handlePlanSearch()}
                                            sx={{ width: 200 }}
                                        />
                                        <FormControl size="small" sx={{ minWidth: 150 }}>
                                            <InputLabel>ステータス</InputLabel>
                                            <Select
                                                value={selectedPlanStatus}
                                                onChange={(e) => setSelectedPlanStatus(e.target.value)}
                                                label="ステータス"
                                            >
                                                <MenuItem value="">すべて</MenuItem>
                                                <MenuItem value="draft">下書き</MenuItem>
                                                <MenuItem value="planned">計画済み</MenuItem>
                                                <MenuItem value="in_progress">製造中</MenuItem>
                                                <MenuItem value="completed">完了</MenuItem>
                                                <MenuItem value="cancelled">キャンセル</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button variant="contained" startIcon={<SearchIcon />} onClick={handlePlanSearch}>
                                            検索
                                        </Button>
                                        <Button variant="outlined" onClick={() => { setPlanSearchText(''); setSelectedPlanStatus(''); fetchPlans(); }}>
                                            リセット
                                        </Button>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => fetchPlans()} sx={{ mr: 1 }}>
                                            <RefreshIcon />
                                        </IconButton>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewPlan}>
                                            新規計画
                                        </Button>
                                    </Box>
                                </Box>

                                {/* データグリッド */}
                                <DataGrid
                                    rows={productionPlans ?? []}
                                    columns={planColumns}
                                    loading={plansLoading}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                                    }}
                                    autoHeight
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </TabPanel>

                        {/* 材料管理タブ */}
                        <TabPanel value={tabValue} index={2}>
                            <Box sx={{ p: 2 }}>
                                {/* ヘッダーとボタン */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField
                                            size="small"
                                            placeholder="品番または名称で検索"
                                            value={materialSearchText}
                                            onChange={(e) => setMaterialSearchText(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleMaterialSearch()}
                                            sx={{ width: 200 }}
                                        />
                                        <FormControl size="small" sx={{ minWidth: 150 }}>
                                            <InputLabel>カテゴリ</InputLabel>
                                            <Select
                                                value={selectedMaterialCategory}
                                                onChange={(e) => setSelectedMaterialCategory(e.target.value)}
                                                label="カテゴリ"
                                            >
                                                <MenuItem value="">すべて</MenuItem>
                                                <MenuItem value="raw">原材料</MenuItem>
                                                <MenuItem value="semi_finished">半製品</MenuItem>
                                                <MenuItem value="component">部品</MenuItem>
                                                <MenuItem value="consumable">消耗品</MenuItem>
                                                <MenuItem value="other">その他</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleMaterialSearch}>
                                            検索
                                        </Button>
                                        <Button variant="outlined" onClick={() => { setMaterialSearchText(''); setSelectedMaterialCategory(''); fetchMaterials(); }}>
                                            リセット
                                        </Button>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => fetchMaterials()} sx={{ mr: 1 }}>
                                            <RefreshIcon />
                                        </IconButton>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewMaterial}>
                                            新規材料
                                        </Button>
                                    </Box>
                                </Box>

                                {/* データグリッド */}
                                <DataGrid
                                    rows={materials ?? []}
                                    columns={materialColumns}
                                    loading={materialsLoading}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                                    }}
                                    autoHeight
                                    disableRowSelectionOnClick
                                />
                            </Box>
                        </TabPanel>
                    </Paper>

                    {/* 制作品モーダル */}
                    <ManufacturingItemModal
                        open={itemModalOpen}
                        onClose={handleItemModalClose}
                        onSuccess={handleItemModalSuccess}
                        mode={itemModalMode}
                        item={selectedItem}
                        products={products ?? []}
                    />

                    {/* 生産計画モーダル */}
                    <ProductionPlanModal
                        open={planModalOpen}
                        onClose={handlePlanModalClose}
                        onSuccess={handlePlanModalSuccess}
                        mode={planModalMode}
                        plan={selectedPlan}
                        manufacturingItems={manufacturingItems ?? []}
                        products={products ?? []}
                    />

                    {/* 材料モーダル */}
                    <MaterialModal
                        open={materialModalOpen}
                        onClose={handleMaterialModalClose}
                        onSuccess={handleMaterialModalSuccess}
                        mode={materialModalMode}
                        material={selectedMaterial}
                    />

                    {/* 制作品削除確認ダイアログ */}
                    <Dialog open={deleteItemDialogOpen} onClose={() => setDeleteItemDialogOpen(false)}>
                        <DialogTitle>制作品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の制作品を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">品番</Typography>
                                <Typography variant="body1">{selectedItem?.manufacturing_number}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>制作品名</Typography>
                                <Typography variant="body1">{selectedItem?.manufacturing_name}</Typography>
                            </Box>
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                                ※ この操作は取り消せません
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteItemDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleDeleteItem} color="error">削除</Button>
                        </DialogActions>
                    </Dialog>

                    {/* 生産計画削除確認ダイアログ */}
                    <Dialog open={deletePlanDialogOpen} onClose={() => setDeletePlanDialogOpen(false)}>
                        <DialogTitle>生産計画の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の生産計画を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">計画番号</Typography>
                                <Typography variant="body1">{selectedPlan?.plan_number}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>制作品</Typography>
                                <Typography variant="body1">{selectedPlan?.manufacturing_item_name}</Typography>
                            </Box>
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                                ※ この操作は取り消せません
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeletePlanDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleDeletePlan} color="error">削除</Button>
                        </DialogActions>
                    </Dialog>

                    {/* 材料削除確認ダイアログ */}
                    <Dialog open={deleteMaterialDialogOpen} onClose={() => setDeleteMaterialDialogOpen(false)}>
                        <DialogTitle>材料の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の材料を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">品番</Typography>
                                <Typography variant="body1">{selectedMaterial?.material_code}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>材料名</Typography>
                                <Typography variant="body1">{selectedMaterial?.material_name}</Typography>
                            </Box>
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                                ※ この操作は取り消せません
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteMaterialDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleDeleteMaterial} color="error">削除</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
