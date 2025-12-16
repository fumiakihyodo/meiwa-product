// app/supplied-items/page.tsx
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
    AttachMoney as MoneyIcon,
    ShoppingCart as ShoppingCartIcon,
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
import { SuppliedItemPriceListModal } from '@/components/SuppliedItemModal/SuppliedItemPriceListModal';
import toast from 'react-hot-toast';
import Link from 'next/link';

// 支給品検索のパラメータ型を定義
type SuppliedItemSearchParams = {
    search?: string;
    product?: number;
};

type SuppliedItemModalType = 'detail' | 'edit' | 'priceList';

export default function SuppliedItemsPage() {
    const [selectedSuppliedItem, setSelectedSuppliedItem] = useState<SuppliedItem | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<number | ''>('');

    // モーダル制御用の状態
    const [suppliedItemModalOpen, setSuppliedItemModalOpen] = useState<boolean>(false);
    const [initialModalType, setInitialModalType] = useState<SuppliedItemModalType>('detail');
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

    const loading = suppliedItemsLoading || productsLoading;

    // 初回データ取得
    useEffect(() => {
        fetchSuppliedItems();
        fetchProducts();
    }, [fetchSuppliedItems, fetchProducts]);

    // 詳細表示
    const handleViewDetail = useCallback((suppliedItemId: number) => {
        setSelectedSuppliedItemId(suppliedItemId);
        setInitialModalType('detail');
        setSuppliedItemModalOpen(true);
    }, []);

    // 編集
    const handleEdit = useCallback((suppliedItemId: number) => {
        setSelectedSuppliedItemId(suppliedItemId);
        setInitialModalType('edit');
        setSuppliedItemModalOpen(true);
    }, []);

    // 価格履歴を表示
    const handlePriceHistory = useCallback((suppliedItemId: number) => {
        const suppliedItem = suppliedItems?.find(item => item.id === suppliedItemId);

        if (suppliedItem) {
            setSelectedSuppliedItemForPrice(suppliedItem);
            setPriceListModalOpen(true);
        } else {
            toast.error('支給品情報の取得に失敗しました');
        }
    }, [suppliedItems]);

    // 新規支給品追加
    const handleNewSuppliedItem = useCallback(() => {
        setNewSuppliedItemModalOpen(true);
    }, []);

    // モーダルを閉じる
    const handleCloseSuppliedItemModal = useCallback(() => {
        setSuppliedItemModalOpen(false);
        setSelectedSuppliedItemId(null);
        setInitialModalType('detail');
    }, []);

    const handleCloseNewSuppliedItemModal = useCallback(() => {
        setNewSuppliedItemModalOpen(false);
    }, []);

    // 価格履歴モーダルを閉じる
    const handleClosePriceListModal = useCallback(() => {
        setPriceListModalOpen(false);
        setSelectedSuppliedItemForPrice(null);
    }, []);

    // モーダル操作成功時の処理
    const handleSuppliedItemModalSuccess = useCallback(() => {
        fetchSuppliedItems();
    }, [fetchSuppliedItems]);

    // 新規支給品追加成功時の処理
    const handleNewSuppliedItemSuccess = useCallback(() => {
        setNewSuppliedItemModalOpen(false);
        fetchSuppliedItems();
    }, [fetchSuppliedItems]);

    // 削除ダイアログを開く
    const handleOpenDeleteDialog = useCallback((suppliedItem: SuppliedItem) => {
        setSelectedSuppliedItem(suppliedItem);
        setDeleteDialogOpen(true);
    }, []);

    // 支給品削除処理
    const handleDeleteSuppliedItem = useCallback(async () => {
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

    const handleSearch = () => {
        const params: SuppliedItemSearchParams = {};
        if (searchText) params.search = searchText;
        if (selectedProduct) params.product = selectedProduct;
        fetchSuppliedItems(params);
    };

    const handleReset = () => {
        setSearchText('');
        setSelectedProduct('');
        fetchSuppliedItems();
    };

    const columns: GridColDef[] = [
        {
            field: 'item_number',
            headerName: '支給品品番',
            width: 150,
        },
        {
            field: 'item_name',
            headerName: '支給品名',
            width: 180,
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 150,
        },
        {
            field: 'customer_name',
            headerName: '顧客',
            width: 150,
        },
        {
            field: 'specification',
            headerName: '仕様',
            width: 150,
        },
        {
            field: 'standard_quantity',
            headerName: '標準数量',
            width: 100,
            type: 'number',
        },
        {
            field: 'unit',
            headerName: '単位',
            width: 80,
        },
        {
            field: 'current_price',
            headerName: '現在単価',
            width: 120,
            renderCell: (params) => {
                if (!params.value) return '-';
                return `¥${Number(params.value).toLocaleString()}`;
            },
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
            width: 150,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => handleViewDetail(params.row.id)}
                />,
                <GridActionsCellItem
                    key="price"
                    icon={<MoneyIcon />}
                    label="価格履歴"
                    onClick={() => handlePriceHistory(params.row.id)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEdit(params.row.id)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleOpenDeleteDialog(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            支給品管理
                        </Typography>
                        <Box>
                            <Link href="/parts" passHref legacyBehavior>
                                <Button
                                    variant="outlined"
                                    startIcon={<ShoppingCartIcon />}
                                    sx={{ mr: 1 }}
                                >
                                    部品管理
                                </Button>
                            </Link>
                            <IconButton onClick={() => fetchSuppliedItems()} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleNewSuppliedItem}
                            >
                                新規支給品
                            </Button>
                        </Box>
                    </Box>

                    {/* 検索フィルター */}
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                placeholder="支給品名または品番で検索"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                                sx={{ width: 250 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>製品</InputLabel>
                                <Select
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value as number | '')}
                                    label="製品"
                                    disabled={!products || products.length === 0}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {products?.map((product) => (
                                        <MenuItem key={product.id} value={product.id}>
                                            {product.product_name}
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
                            <Button variant="outlined" onClick={handleReset}>
                                リセット
                            </Button>
                        </Box>
                    </Paper>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={suppliedItems ?? []}
                            columns={columns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            checkboxSelection
                            disableRowSelectionOnClick
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                            }}
                        />
                    </Paper>

                    {/* モーダルコンポーネント */}
                    {suppliedItemModalOpen && selectedSuppliedItemId && (
                        <SuppliedItemModalManager
                            open={suppliedItemModalOpen}
                            onClose={handleCloseSuppliedItemModal}
                            suppliedItemId={selectedSuppliedItemId}
                            onSuccess={handleSuppliedItemModalSuccess}
                            initialModal={initialModalType}
                        />
                    )}

                    {newSuppliedItemModalOpen && (
                        <SuppliedItemFormModal
                            open={newSuppliedItemModalOpen}
                            onClose={handleCloseNewSuppliedItemModal}
                            onSuccess={handleNewSuppliedItemSuccess}
                        />
                    )}

                    {/* 価格履歴モーダル */}
                    {priceListModalOpen && selectedSuppliedItemForPrice && (
                        <SuppliedItemPriceListModal
                            open={priceListModalOpen}
                            onClose={handleClosePriceListModal}
                            suppliedItem={selectedSuppliedItemForPrice}
                            onSuccess={handleSuppliedItemModalSuccess}
                        />
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                        <DialogTitle>支給品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の支給品を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    品番
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedSuppliedItem?.item_number}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    支給品名
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedSuppliedItem?.item_name}
                                </Typography>
                                {selectedSuppliedItem?.product_name && (
                                    <>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            gutterBottom
                                            sx={{ mt: 1 }}
                                        >
                                            製品
                                        </Typography>
                                        <Typography variant="body1">
                                            {selectedSuppliedItem.product_name}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                                ※ この操作は取り消せません
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
                            <Button onClick={handleDeleteSuppliedItem} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
