// app/parts/page.tsx
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
    Inventory2 as Inventory2Icon,
} from '@mui/icons-material';
import { PartModalType } from '@/types/business';
import { Part } from '@/types/purchases';
import { Product } from '@/types/procuct';
import { Supplier } from '@/types/supplier';
import { productApi } from '@/services/apiProduct';
import { supplierApi } from '@/services/apiSupplier';
import { purchasesApi } from '@/services/apiPurchases';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { useFetchData } from '@/hooks/useFetchData';
import { PartModalManager } from '@/components/PartModal/PartModalManager';
import { PartFormModal } from '@/components/PartModal/PartFormModal';
import { PartPriceListModal } from '@/components/PartModal/PartPriceListModal'; // 追加
import toast from 'react-hot-toast';
import Link from 'next/link';

// 部品検索のパラメータ型を定義
type PartSearchParams = {
    search?: string;
    product?: number;
    supplier?: number;
};

export default function PartsPage() {
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
    const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');

    // モーダル制御用の状態
    const [partModalOpen, setPartModalOpen] = useState<boolean>(false);
    const [initialModalType, setInitialModalType] = useState<PartModalType>('detail');
    const [newPartModalOpen, setNewPartModalOpen] = useState<boolean>(false);
    const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

    // 価格履歴モーダル用の状態を追加
    const [priceListModalOpen, setPriceListModalOpen] = useState<boolean>(false);
    const [selectedPartForPrice, setSelectedPartForPrice] = useState<Part | null>(null);

    // 部品データの取得（型パラメータを明示）
    const {
        data: parts,
        loading: partsLoading,
        fetch: fetchParts,
    } = useFetchData<Part[], PartSearchParams>({
        fetchFn: useCallback((params) => purchasesApi.getParts(params), []),
        errorMessage: '部品一覧の取得に失敗しました',
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

    // サプライヤーデータの取得
    const {
        data: suppliers,
        loading: suppliersLoading,
        fetch: fetchSuppliers,
    } = useFetchData<Supplier[]>({
        fetchFn: useCallback(() => supplierApi.getSuppliers(), []),
        errorMessage: 'サプライヤー一覧の取得に失敗しました',
    });

    const loading = partsLoading || productsLoading || suppliersLoading;

    // 初回データ取得
    useEffect(() => {
        fetchParts();
        fetchProducts();
        fetchSuppliers();
    }, [fetchParts, fetchProducts, fetchSuppliers]);

    // 詳細表示
    const handleViewDetail = useCallback((partId: number) => {
        setSelectedPartId(partId);
        setInitialModalType('detail');
        setPartModalOpen(true);
    }, []);

    // 編集 (詳細モーダルを開く - 編集は詳細モーダル内で対応)
    const handleEdit = useCallback((partId: number) => {
        setSelectedPartId(partId);
        setInitialModalType('edit');
        setPartModalOpen(true);
    }, []);

    // 価格履歴を表示
    const handlePriceHistory = useCallback((partId: number) => {
        // partsからpartIdに一致するPartオブジェクトを取得
        const part = parts?.find(p => p.id === partId);

        if (part) {
            setSelectedPartForPrice(part);
            setPriceListModalOpen(true);
        } else {
            toast.error('部品情報の取得に失敗しました');
        }
    }, [parts]); // 依存配列にpartsを追加

    // 新規部品追加
    const handleNewPart = useCallback(() => {
        setNewPartModalOpen(true);
    }, []);

    // モーダルを閉じる
    const handleClosePartModal = useCallback(() => {
        setPartModalOpen(false);
        setSelectedPartId(null);
        setInitialModalType('detail');
    }, []);

    const handleCloseNewPartModal = useCallback(() => {
        setNewPartModalOpen(false);
    }, []);

    // 価格履歴モーダルを閉じる - 追加
    const handleClosePriceListModal = useCallback(() => {
        setPriceListModalOpen(false);
        setSelectedPartForPrice(null);
    }, []);

    // モーダル操作成功時の処理
    const handlePartModalSuccess = useCallback(() => {
        fetchParts();
    }, [fetchParts]);

    // 新規部品追加成功時の処理
    const handleNewPartSuccess = useCallback(() => {
        setNewPartModalOpen(false);
        fetchParts();
    }, [fetchParts]);

    // 削除ダイアログを開く
    const handleOpenDeleteDialog = useCallback((part: Part) => {
        setSelectedPart(part);
        setDeleteDialogOpen(true);
    }, []);

    // 部品削除処理
    const handleDeletePart = useCallback(async () => {
        if (!selectedPart) return;

        try {
            await purchasesApi.deletePart(selectedPart.id);
            toast.success('部品を削除しました');
            setDeleteDialogOpen(false);
            setSelectedPart(null);
            fetchParts();
        } catch (error) {
            console.error('部品削除エラー:', error);
            toast.error('部品の削除に失敗しました');
        }
    }, [selectedPart, fetchParts]);

    const handleSearch = () => {
        const params: PartSearchParams = {};
        if (searchText) params.search = searchText;
        if (selectedProduct) params.product = selectedProduct;
        if (selectedSupplier) params.supplier = selectedSupplier;
        fetchParts(params);
    };

    const handleReset = () => {
        setSearchText('');
        setSelectedProduct('');
        setSelectedSupplier('');
        fetchParts();
    };

    const columns: GridColDef[] = [
        {
            field: 'part_number',
            headerName: '品番',
            width: 130,
        },
        {
            field: 'part_name',
            headerName: '部品名',
            width: 180,
        },
        {
            field: 'product_name',
            headerName: '製品',
            width: 150,
        },
        {
            field: 'supplier_name',
            headerName: 'サプライヤー',
            width: 180,
        },
        {
            field: 'standard_quantity',
            headerName: '標準数量',
            width: 100,
            type: 'number',
        },
        {
            field: 'usage_quantity',
            headerName: '使用数',
            width: 90,
            type: 'number',
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
            field: 'order_type',
            headerName: '発注区分',
            width: 100,
        },
        {
            field: 'minimum_order_quantity',
            headerName: '最小発注数',
            width: 120,
            type: 'number',
        },
        {
            field: 'lead_time_days',
            headerName: 'リードタイム',
            width: 110,
            renderCell: (params) => {
                if (!params.value) return '-';
                return `${params.value}日`;
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
                            部品管理
                        </Typography>
                        <Box>
                            <Link href="/supplied-items" passHref legacyBehavior>
                                <Button
                                    variant="outlined"
                                    startIcon={<Inventory2Icon />}
                                    sx={{ mr: 1 }}
                                >
                                    支給品管理
                                </Button>
                            </Link>
                            <IconButton onClick={() => fetchParts()} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleNewPart}
                            >
                                新規部品
                            </Button>
                        </Box>
                    </Box>

                    {/* 検索フィルター */}
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                placeholder="部品名または品番で検索"
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
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>サプライヤー</InputLabel>
                                <Select
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value as number | '')}
                                    label="サプライヤー"
                                    disabled={!suppliers || suppliers.length === 0}
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    {suppliers?.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            {supplier.company_name}
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
                            rows={parts ?? []}
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
                    {partModalOpen && selectedPartId && (
                        <PartModalManager
                            open={partModalOpen}
                            onClose={handleClosePartModal}
                            partId={selectedPartId}
                            onSuccess={handlePartModalSuccess}
                            initialModal={initialModalType}
                        />
                    )}

                    {newPartModalOpen && (
                        <PartFormModal
                            open={newPartModalOpen}
                            onClose={handleCloseNewPartModal}
                            onSuccess={handleNewPartSuccess}
                        />
                    )}

                    {/* 価格履歴モーダル - 追加 */}
                    {priceListModalOpen && selectedPartForPrice && (
                        <PartPriceListModal
                            open={priceListModalOpen}
                            onClose={handleClosePriceListModal}
                            part={selectedPartForPrice}
                        />
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                        <DialogTitle>部品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の部品を削除してもよろしいですか?
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    品番
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedPart?.part_number}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    部品名
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedPart?.part_name}
                                </Typography>
                                {selectedPart?.supplier_name && (
                                    <>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            gutterBottom
                                            sx={{ mt: 1 }}
                                        >
                                            サプライヤー
                                        </Typography>
                                        <Typography variant="body1">
                                            {selectedPart.supplier_name}
                                            {selectedPart.branch_name && ` - ${selectedPart.branch_name}`}
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
                            <Button onClick={handleDeletePart} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}