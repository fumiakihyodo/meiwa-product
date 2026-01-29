// app/master/manufacturing/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, SyntheticEvent } from 'react';
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
    Tabs,
    Tab,
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
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { useFetchData } from '@/hooks/useFetchData';
import {
    manufacturingItemApi,
    materialApi,
    ManufacturingItem,
    Material,
    ProductionType,
} from '@/services/apiManufacturing';
import { productApi } from '@/services/apiProduct';
import { Product } from '@/types/product';
import toast from 'react-hot-toast';
import ManufacturingItemModal from '@/components/manufacturing/ManufacturingItemModal';

// タブの型定義
type TabValue = 'all' | 'domestic' | 'overseas';

export default function ManufacturingPage() {
    // タブの状態管理
    const [activeTab, setActiveTab] = useState<TabValue>('all');

    // Manufacturing Items state
    const [selectedItem, setSelectedItem] = useState<ManufacturingItem | null>(null);
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemModalMode, setItemModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
    const [itemSearchText, setItemSearchText] = useState('');

    // モーダル用のデータ（遅延ロード）
    const [materials, setMaterials] = useState<Material[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [modalDataLoaded, setModalDataLoaded] = useState(false);

    // Search params types
    type ItemSearchParams = { search?: string; production_type?: ProductionType };

    // Data fetching - 製造品一覧のみ初期ロード
    const {
        data: manufacturingItems,
        loading: itemsLoading,
        fetch: fetchItems,
    } = useFetchData<ManufacturingItem[], ItemSearchParams>({
        fetchFn: useCallback((params?: ItemSearchParams) => manufacturingItemApi.getItems(params), []),
        errorMessage: '製造品一覧の取得に失敗しました',
    });

    // 初期データフェッチ（製造品一覧のみ）
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // モーダル用データの遅延ロード
    const loadModalData = useCallback(async () => {
        if (modalDataLoaded) return;
        try {
            const [materialsData, productsData] = await Promise.all([
                materialApi.getMaterials(),
                productApi.getProducts(),
            ]);
            setMaterials(materialsData);
            setProducts(productsData);
            setModalDataLoaded(true);
        } catch (error) {
            console.error('モーダルデータの取得に失敗:', error);
        }
    }, [modalDataLoaded]);

    // タブに応じたデータのフィルタリング
    const filteredItems = useMemo(() => {
        if (!manufacturingItems) return [];

        switch (activeTab) {
            case 'domestic':
                return manufacturingItems.filter(
                    item => item.production_type === 'domestic' || item.production_type === 'both'
                );
            case 'overseas':
                return manufacturingItems.filter(
                    item => item.production_type === 'overseas' || item.production_type === 'both'
                );
            default:
                return manufacturingItems;
        }
    }, [manufacturingItems, activeTab]);

    // タブ変更ハンドラー
    const handleTabChange = useCallback((_event: SyntheticEvent, newValue: TabValue) => {
        setActiveTab(newValue);
    }, []);

    // ===== Manufacturing Items handlers =====
    const handleNewItem = useCallback(async () => {
        await loadModalData();
        setSelectedItem(null);
        setItemModalMode('create');
        setItemModalOpen(true);
    }, [loadModalData]);

    const handleViewItem = useCallback(async (item: ManufacturingItem) => {
        await loadModalData();
        setSelectedItem(item);
        setItemModalMode('view');
        setItemModalOpen(true);
    }, [loadModalData]);

    const handleEditItem = useCallback(async (item: ManufacturingItem) => {
        await loadModalData();
        setSelectedItem(item);
        setItemModalMode('edit');
        setItemModalOpen(true);
    }, [loadModalData]);

    const handleDeleteItemConfirm = useCallback((item: ManufacturingItem) => {
        setSelectedItem(item);
        setDeleteItemDialogOpen(true);
    }, []);

    const handleDeleteItem = useCallback(async () => {
        if (!selectedItem) return;
        try {
            await manufacturingItemApi.deleteItem(selectedItem.id);
            toast.success('製造品を削除しました');
            setDeleteItemDialogOpen(false);
            setSelectedItem(null);
            fetchItems();
        } catch (error) {
            console.error('削除エラー:', error);
            toast.error('製造品の削除に失敗しました');
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
        const params: ItemSearchParams = {};
        if (itemSearchText) params.search = itemSearchText;
        fetchItems(params);
    }, [itemSearchText, fetchItems]);

    // 製造拠点の表示名を取得
    const getProductionTypeLabel = useCallback((type: ProductionType): string => {
        switch (type) {
            case 'domestic':
                return '国内';
            case 'overseas':
                return '海外';
            case 'both':
                return '両方';
            default:
                return type;
        }
    }, []);

    // 製造拠点の色を取得
    const getProductionTypeColor = useCallback((type: ProductionType): 'primary' | 'secondary' | 'success' => {
        switch (type) {
            case 'domestic':
                return 'primary';
            case 'overseas':
                return 'secondary';
            case 'both':
                return 'success';
            default:
                return 'primary';
        }
    }, []);

    // DataGrid columns（メモ化して再レンダリングを防止）
    const itemColumns = useMemo((): GridColDef[] => {
        const baseColumns: GridColDef[] = [
            { field: 'manufacturing_number', headerName: '品番', width: 130 },
            { field: 'manufacturing_name', headerName: '製造品名', width: 200 },
            {
                field: 'production_type',
                headerName: '製造拠点',
                width: 100,
                renderCell: (params: GridRenderCellParams<ManufacturingItem>) => (
                    <Chip
                        label={getProductionTypeLabel(params.value as ProductionType)}
                        color={getProductionTypeColor(params.value as ProductionType)}
                        size="small"
                        variant="outlined"
                    />
                ),
            },
            { field: 'product_name', headerName: '製品', width: 150 },
            { field: 'unit', headerName: '単位', width: 80 },
        ];

        // タブに応じた在庫カラムを追加
        if (activeTab === 'all' || activeTab === 'domestic') {
            baseColumns.push({
                field: 'domestic_stock',
                headerName: '国内在庫',
                width: 100,
                type: 'number',
                renderCell: (params: GridRenderCellParams<ManufacturingItem>) => {
                    const item = params.row;
                    if (item.production_type === 'overseas') return '-';
                    return params.value ?? 0;
                },
            });
        }

        if (activeTab === 'all' || activeTab === 'overseas') {
            baseColumns.push({
                field: 'overseas_stock',
                headerName: '海外在庫',
                width: 100,
                type: 'number',
                renderCell: (params: GridRenderCellParams<ManufacturingItem>) => {
                    const item = params.row;
                    if (item.production_type === 'domestic') return '-';
                    return params.value ?? 0;
                },
            });
        }

        baseColumns.push({
            field: 'total_stock',
            headerName: '合計在庫',
            width: 100,
            type: 'number',
            renderCell: (params: GridRenderCellParams<ManufacturingItem>) => {
                return params.value ?? 0;
            },
        });

        baseColumns.push(
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
            }
        );

        return baseColumns;
    }, [activeTab, getProductionTypeLabel, getProductionTypeColor, handleViewItem, handleEditItem, handleDeleteItemConfirm]);

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
                        製造品管理
                    </Typography>

                    <Paper sx={{ width: '100%', p: 2 }}>
                        {/* タブ */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                aria-label="製造品タブ"
                            >
                                <Tab label="すべて" value="all" />
                                <Tab label="国内生産品" value="domestic" />
                                <Tab label="海外生産品" value="overseas" />
                            </Tabs>
                        </Box>

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
                                    新規製造品
                                </Button>
                            </Box>
                        </Box>

                        {/* データグリッド（1つに統合） */}
                        <DataGrid
                            rows={filteredItems}
                            columns={itemColumns}
                            loading={itemsLoading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10, page: 0 } },
                            }}
                            autoHeight
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                        />
                    </Paper>

                    {/* 製造品モーダル */}
                    <ManufacturingItemModal
                        open={itemModalOpen}
                        onClose={handleItemModalClose}
                        onSuccess={handleItemModalSuccess}
                        mode={itemModalMode}
                        item={selectedItem}
                        products={products}
                        materials={materials}
                    />

                    {/* 製造品削除確認ダイアログ */}
                    <Dialog open={deleteItemDialogOpen} onClose={() => setDeleteItemDialogOpen(false)}>
                        <DialogTitle>製造品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の製造品を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">品番</Typography>
                                <Typography variant="body1">{selectedItem?.manufacturing_number}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>製造品名</Typography>
                                <Typography variant="body1">{selectedItem?.manufacturing_name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>製造拠点</Typography>
                                <Typography variant="body1">
                                    {selectedItem?.production_type ? getProductionTypeLabel(selectedItem.production_type) : '-'}
                                </Typography>
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
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
