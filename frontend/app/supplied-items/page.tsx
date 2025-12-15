// app/supplied-items/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
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
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { SuppliedItem } from '@/types/purchases';
import { Product } from '@/types/procuct';
import { productApi } from '@/services/apiProduct';
import { purchasesApi } from '@/services/apiPurchases';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { useFetchData } from '@/hooks/useFetchData';
import { SuppliedItemModalManager } from '@/components/SuppliedItemModal/SuppliedItemModalManager';
import { SuppliedItemFormModal } from '@/components/SuppliedItemModal/SuppliedItemFormModal';
import toast from 'react-hot-toast';

// 支給品検索のパラメータ型を定義
type SuppliedItemSearchParams = {
    search?: string;
    product?: number;
};

export default function SuppliedItemsPage() {
    const [selectedSuppliedItem, setSelectedSuppliedItem] = useState<SuppliedItem | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<number | ''>('');

    // モーダル制御用の状態
    const [suppliedItemModalOpen, setSuppliedItemModalOpen] = useState<boolean>(false);
    const [initialModalType, setInitialModalType] = useState<'detail' | 'edit' | 'priceList'>('detail');
    const [newSuppliedItemModalOpen, setNewSuppliedItemModalOpen] = useState<boolean>(false);
    const [selectedSuppliedItemId, setSelectedSuppliedItemId] = useState<number | null>(null);

    // 価格履歴モーダル用の状態
    const [priceListModalOpen, setPriceListModalOpen] = useState<boolean>(false);
    const [selectedSuppliedItemForPrice, setSelectedSuppliedItemForPrice] = useState<SuppliedItem | null>(null);

    // 支給品データの取得
    const {
        data: suppliedItems,
        loading: suppliedItemsLoading,
        fetch: fetchSuppliedItems,
    } = useFetchData<SuppliedItem[], SuppliedItemSearchParams>({
        fetchFn: useCallback((params) => purchasesApi.getSuppliedItems(params), []),
        errorMessage: '支給品一覧の取得に失敗しました',
    });

    // 製品データの取得
    const {
        data: products,
        loading: productsLoading,
        fetch: fetchProducts,
    } = useFetchData<Product[]>({
        fetchFn: useCallback(() => productApi.getProducts(), []),
        errorMessage: '製品一覧の取得に失敗しました',
    });

    // 初回データ取得
    React.useEffect(() => {
        fetchSuppliedItems();
        fetchProducts();
    }, [fetchSuppliedItems, fetchProducts]);

    // 検索実行
    const handleSearch = useCallback(() => {
        const params: SuppliedItemSearchParams = {};
        if (searchText) params.search = searchText;
        if (selectedProduct) params.product = selectedProduct;
        fetchSuppliedItems(params);
    }, [searchText, selectedProduct, fetchSuppliedItems]);

    // リセット
    const handleReset = useCallback(() => {
        setSearchText('');
        setSelectedProduct('');
        fetchSuppliedItems();
    }, [fetchSuppliedItems]);

    // 詳細表示
    const handleViewDetail = useCallback((suppliedItem: SuppliedItem) => {
        setSelectedSuppliedItemId(suppliedItem.id);
        setInitialModalType('detail');
        setSuppliedItemModalOpen(true);
    }, []);

    // 価格履歴表示
    const handleViewPriceHistory = useCallback((suppliedItem: SuppliedItem) => {
        setSelectedSuppliedItemId(suppliedItem.id);
        setInitialModalType('priceList');
        setSuppliedItemModalOpen(true);
    }, []);

    // 削除ダイアログを開く
    const handleDeleteClick = useCallback((suppliedItem: SuppliedItem) => {
        setSelectedSuppliedItem(suppliedItem);
        setDeleteDialogOpen(true);
    }, []);

    // 削除実行
    const handleDelete = useCallback(async () => {
        if (!selectedSuppliedItem) return;

        try {
            await purchasesApi.deleteSuppliedItem(selectedSuppliedItem.id);
            toast.success('支給品を削除しました');
            setDeleteDialogOpen(false);
            setSelectedSuppliedItem(null);
            fetchSuppliedItems();
        } catch (error: any) {
            console.error('支給品削除エラー:', error);
            const errorMessage = error.response?.data?.error || '支給品の削除に失敗しました';
            toast.error(errorMessage);
        }
    }, [selectedSuppliedItem, fetchSuppliedItems]);

    // DataGridの列定義
    const columns: GridColDef[] = [
        {
            field: 'item_number',
            headerName: '支給品品番',
            width: 150,
            renderCell: (params: GridRenderCellParams) => (
                <Box
                    sx={{
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => handleViewDetail(params.row)}
                >
                    {params.value}
                </Box>
            ),
        },
        { field: 'item_name', headerName: '支給品名', width: 200 },
        { field: 'product_number', headerName: '製品品番', width: 130 },
        { field: 'product_name', headerName: '製品名', width: 180 },
        { field: 'specification', headerName: '仕様', width: 150 },
        { field: 'unit', headerName: '単位', width: 80 },
        { field: 'standard_quantity', headerName: '標準数量', width: 100, type: 'number' },
        {
            field: 'current_price',
            headerName: '現在単価',
            width: 120,
            type: 'number',
            valueFormatter: (params) => {
                if (params == null) return '-';
                return `¥${Number(params).toLocaleString()}`;
            },
        },
        {
            field: 'price_history_count',
            headerName: '価格履歴数',
            width: 110,
            type: 'number',
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
                    onClick={() => handleViewDetail(params.row)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="price"
                    icon={<MoneyIcon />}
                    label="価格履歴"
                    onClick={() => handleViewPriceHistory(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    return (
        <AuthGuard>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" component="h1">
                                支給品マスタ管理
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={() => fetchSuppliedItems()}
                                >
                                    更新
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setNewSuppliedItemModalOpen(true)}
                                >
                                    新規支給品登録
                                </Button>
                            </Box>
                        </Box>

                        {/* 検索フィルター */}
                        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="キーワード検索"
                                placeholder="支給品品番、支給品名、製品品番、製品名"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                sx={{ minWidth: 300 }}
                                size="small"
                            />
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>製品</InputLabel>
                                <Select
                                    value={selectedProduct}
                                    label="製品"
                                    onChange={(e) => setSelectedProduct(e.target.value as number | '')}
                                >
                                    <MenuItem value="">全て</MenuItem>
                                    {products?.map((product) => (
                                        <MenuItem key={product.id} value={product.id}>
                                            {product.product_number} - {product.product_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                startIcon={<SearchIcon />}
                                onClick={handleSearch}
                            >
                                検索
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleReset}
                            >
                                リセット
                            </Button>
                        </Box>

                        {/* データグリッド */}
                        <Box sx={{ height: 600, width: '100%' }}>
                            <DataGrid
                                rows={suppliedItems || []}
                                columns={columns}
                                loading={suppliedItemsLoading}
                                pageSizeOptions={[10, 25, 50, 100]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                disableRowSelectionOnClick
                                sx={{
                                    '& .MuiDataGrid-cell:focus': {
                                        outline: 'none',
                                    },
                                }}
                            />
                        </Box>
                    </Paper>

                    {/* 支給品詳細・編集・複製モーダル */}
                    <SuppliedItemModalManager
                        open={suppliedItemModalOpen}
                        onClose={() => {
                            setSuppliedItemModalOpen(false);
                            setSelectedSuppliedItemId(null);
                        }}
                        suppliedItemId={selectedSuppliedItemId}
                        onSuccess={() => {
                            fetchSuppliedItems();
                        }}
                        initialModal={initialModalType}
                    />

                    {/* 新規支給品登録モーダル */}
                    <SuppliedItemFormModal
                        open={newSuppliedItemModalOpen}
                        onClose={() => setNewSuppliedItemModalOpen(false)}
                        onSuccess={() => {
                            setNewSuppliedItemModalOpen(false);
                            fetchSuppliedItems();
                        }}
                    />

                    {/* 削除確認ダイアログ */}
                    <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                        <DialogTitle>支給品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                支給品「{selectedSuppliedItem?.item_number} - {selectedSuppliedItem?.item_name}」を削除してもよろしいですか？
                                <br />
                                この操作は取り消せません。
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleDelete} color="error" variant="contained">
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Box>
        </AuthGuard>
    );
}
