// app/products/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    Divider,
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
    AttachMoney as MoneyIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { PartModalType } from '@/types/business';
import { Product } from '@/types/procuct'
import { Part, SuppliedItem } from '@/types/purchases'
import { productApi } from '@/services/apiProduct';
import { purchasesApi } from '@/services/apiPurchases';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { PartModalManager } from '@/components/PartModal/PartModalManager';
import { PartFormModal } from '@/components/PartModal/PartFormModal';
import { SuppliedItemModalManager } from '@/components/SuppliedItemModal/SuppliedItemModalManager';
import { SuppliedItemFormModal } from '@/components/SuppliedItemModal/SuppliedItemFormModal';
import toast from 'react-hot-toast';


export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = Number(params.id);

    const [product, setProduct] = useState<Product | null>(null);
    const [parts, setParts] = useState<Part[]>([]);
    const [suppliedItems, setSuppliedItems] = useState<SuppliedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [partsLoading, setPartsLoading] = useState(false);
    const [suppliedItemsLoading, setSuppliedItemsLoading] = useState(false);

    // モーダル制御用の状態（部品）
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [initialModalType, setInitialModalType] = useState<PartModalType>('detail');
    const [newPartModalOpen, setNewPartModalOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

    // モーダル制御用の状態（支給品）
    type SuppliedItemModalType = 'detail' | 'priceList';
    const [suppliedItemModalOpen, setSuppliedItemModalOpen] = useState(false);
    const [initialSuppliedItemModalType, setInitialSuppliedItemModalType] = useState<SuppliedItemModalType>('detail');
    const [newSuppliedItemModalOpen, setNewSuppliedItemModalOpen] = useState(false);
    const [selectedSuppliedItemId, setSelectedSuppliedItemId] = useState<number | null>(null);

    const fetchProduct = useCallback(async () => {
        if (!productId || isNaN(productId)) {
            toast.error('無効な製品IDです');
            router.push('/products');
            return;
        }

        setLoading(true);
        try {
            const data = await productApi.getProduct(productId);
            setProduct(data);
        } catch (error) {
            console.error('製品取得エラー:', error);
            toast.error('製品情報の取得に失敗しました');
            router.push('/products');
        } finally {
            setLoading(false);
        }
    }, [productId, router]);

    const fetchParts = useCallback(async () => {
        if (!productId || isNaN(productId)) {
            return;
        }

        setPartsLoading(true);
        try {
            const data = await purchasesApi.getParts({ product: productId });
            setParts(data);
        } catch (error) {
            console.error('部品取得エラー:', error);
            toast.error('部品一覧の取得に失敗しました');
        } finally {
            setPartsLoading(false);
        }
    }, [productId]);

    const fetchSuppliedItems = useCallback(async () => {
        if (!productId || isNaN(productId)) {
            return;
        }

        setSuppliedItemsLoading(true);
        try {
            const data = await purchasesApi.getSuppliedItems({ product: productId });
            setSuppliedItems(data);
        } catch (error) {
            console.error('支給品取得エラー:', error);
            toast.error('支給品一覧の取得に失敗しました');
        } finally {
            setSuppliedItemsLoading(false);
        }
    }, [productId]);

    // useEffectで初期データ取得
    useEffect(() => {
        if (productId && !isNaN(productId)) {
            fetchProduct();
            fetchParts();
            fetchSuppliedItems();
        }
    }, [productId, fetchProduct, fetchParts, fetchSuppliedItems]);

    // 詳細表示
    const handleViewDetail = useCallback((partId: number) => {
        setSelectedPartId(partId);
        setInitialModalType('detail');
        setPartModalOpen(true);
    }, []);

    // 編集（詳細モーダルを開く - 編集は詳細モーダル内で行う）
    const handleEdit = useCallback((partId: number) => {
        setSelectedPartId(partId);
        setInitialModalType('detail');
        setPartModalOpen(true);
    }, []);

    // 価格履歴
    const handlePriceHistory = useCallback((part: Part) => {
        setSelectedPartId(part.id);
        setInitialModalType('priceList');
        setPartModalOpen(true);
    }, []);

    // 新規部品追加
    const handleAddNewPart = useCallback(() => {
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

    // モーダル操作成功時の処理
    const handlePartModalSuccess = useCallback(() => {
        fetchParts(); // 一覧を更新
    }, [fetchParts]);

    // 新規作成成功時の処理
    const handleNewPartSuccess = useCallback(() => {
        setNewPartModalOpen(false);
        fetchParts(); // 一覧を更新
    }, [fetchParts]);

    // 部品削除
    const handleDeletePart = useCallback(async (partId: number, partName: string) => {
        if (!confirm(`${partName}を削除してもよろしいですか？この操作は取り消せません。`)) {
            return;
        }

        try {
            await purchasesApi.deletePart(partId);
            toast.success('部品を削除しました');
            fetchParts();
        } catch (error) {
            console.error('部品削除エラー:', error);
            toast.error('部品の削除に失敗しました');
        }
    }, [fetchParts]);

    // 支給品詳細表示
    const handleViewSuppliedItemDetail = useCallback((suppliedItemId: number) => {
        setSelectedSuppliedItemId(suppliedItemId);
        setInitialSuppliedItemModalType('detail');
        setSuppliedItemModalOpen(true);
    }, []);

    // 支給品編集
    const handleEditSuppliedItem = useCallback((suppliedItemId: number) => {
        setSelectedSuppliedItemId(suppliedItemId);
        setInitialSuppliedItemModalType('detail');
        setSuppliedItemModalOpen(true);
    }, []);

    // 支給品価格履歴
    const handleSuppliedItemPriceHistory = useCallback((suppliedItem: SuppliedItem) => {
        setSelectedSuppliedItemId(suppliedItem.id);
        setInitialSuppliedItemModalType('priceList');
        setSuppliedItemModalOpen(true);
    }, []);

    // 新規支給品追加
    const handleAddNewSuppliedItem = useCallback(() => {
        setNewSuppliedItemModalOpen(true);
    }, []);

    // 支給品モーダルを閉じる
    const handleCloseSuppliedItemModal = useCallback(() => {
        setSuppliedItemModalOpen(false);
        setSelectedSuppliedItemId(null);
        setInitialSuppliedItemModalType('detail');
    }, []);

    const handleCloseNewSuppliedItemModal = useCallback(() => {
        setNewSuppliedItemModalOpen(false);
    }, []);

    // 支給品モーダル操作成功時の処理
    const handleSuppliedItemModalSuccess = useCallback(() => {
        fetchSuppliedItems(); // 一覧を更新
    }, [fetchSuppliedItems]);

    // 支給品新規作成成功時の処理
    const handleNewSuppliedItemSuccess = useCallback(() => {
        setNewSuppliedItemModalOpen(false);
        fetchSuppliedItems(); // 一覧を更新
    }, [fetchSuppliedItems]);

    // 支給品削除
    const handleDeleteSuppliedItem = useCallback(async (suppliedItemId: number, itemName: string) => {
        if (!confirm(`${itemName}を削除してもよろしいですか？この操作は取り消せません。`)) {
            return;
        }

        try {
            await purchasesApi.deleteSuppliedItem(suppliedItemId);
            toast.success('支給品を削除しました');
            fetchSuppliedItems();
        } catch (error) {
            console.error('支給品削除エラー:', error);
            toast.error('支給品の削除に失敗しました');
        }
    }, [fetchSuppliedItems]);

    const columns: GridColDef[] = [
        {
            field: 'part_number',
            headerName: '品番',
            width: 150,
            flex: 1,
        },
        {
            field: 'part_name',
            headerName: '部品名',
            width: 200,
            flex: 1,
        },
        {
            field: 'supplier_name',
            headerName: 'サプライヤー',
            width: 180,
            flex: 1,
        },
        {
            field: 'current_price',
            headerName: '現在単価',
            width: 130,
            renderCell: (params) => {
                if (!params.value) return '-';
                return `¥${Number(params.value).toLocaleString()}`;
            },
        },
        {
            field: 'order_type',
            headerName: '発注区分',
            width: 110,
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
            width: 120,
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
                    onClick={() => handlePriceHistory(params.row.id as Part)}
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
                    onClick={() => handleDeletePart(params.row.id, params.row.part_name)}
                    showInMenu
                />,
            ],
        },
    ];

    const suppliedItemColumns: GridColDef[] = [
        {
            field: 'item_number',
            headerName: '支給品品番',
            width: 150,
            flex: 1,
        },
        {
            field: 'item_name',
            headerName: '支給品名',
            width: 200,
            flex: 1,
        },
        {
            field: 'specification',
            headerName: '仕様',
            width: 180,
            flex: 1,
        },
        {
            field: 'current_price',
            headerName: '現在単価',
            width: 130,
            renderCell: (params) => {
                if (!params.value) return '-';
                return `¥${Number(params.value).toLocaleString()}`;
            },
        },
        {
            field: 'standard_quantity',
            headerName: '標準数量',
            width: 110,
            type: 'number',
        },
        {
            field: 'unit',
            headerName: '単位',
            width: 80,
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
                    onClick={() => handleViewSuppliedItemDetail(params.row.id)}
                />,
                <GridActionsCellItem
                    key="price"
                    icon={<MoneyIcon />}
                    label="価格履歴"
                    onClick={() => handleSuppliedItemPriceHistory(params.row as SuppliedItem)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEditSuppliedItem(params.row.id)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleDeleteSuppliedItem(params.row.id, params.row.item_name)}
                    showInMenu
                />,
            ],
        },
    ];

    if (loading) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <CircularProgress />
                    </Box>
                </Sidebar>
            </AuthGuard>
        );
    }

    if (!product) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            製品が見つかりませんでした
                        </Alert>
                        <Button
                            variant="contained"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/products')}
                        >
                            製品一覧に戻る
                        </Button>
                    </Box>
                </Sidebar>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    {/* ヘッダー */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <IconButton
                                onClick={() => router.push('/products')}
                                sx={{ mr: 1 }}
                                aria-label="製品一覧に戻る"
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h4" component="h1">
                                {product.product_name}
                            </Typography>
                        </Box>

                        {/* 製品情報カード */}
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                                gap: 3
                            }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        製品番号
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {product.product_number}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        顧客
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {product.customer_branch_name || '-'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        ステータス
                                    </Typography>
                                    <Chip
                                        label={product.status ? '有効' : '無効'}
                                        size="small"
                                        color={product.status === 'ACTIVE' ? 'success' : 'default'}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        部品数
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {parts.length}件
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        支給品数
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {suppliedItems.length}件
                                    </Typography>
                                </Box>
                            </Box>

                            {product.description && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                            説明
                                        </Typography>
                                        <Typography variant="body2">
                                            {product.description}
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </Paper>
                    </Box>

                    {/* 関連部品一覧 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            関連部品
                        </Typography>
                        <Box>
                            <IconButton
                                onClick={fetchParts}
                                sx={{ mr: 1 }}
                                disabled={partsLoading}
                                aria-label="更新"
                            >
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddNewPart}
                            >
                                部品追加
                            </Button>
                        </Box>
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={parts}
                            columns={columns}
                            loading={partsLoading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            disableRowSelectionOnClick
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                                '& .MuiDataGrid-cell:focus-within': {
                                    outline: 'none',
                                },
                            }}
                            localeText={{
                                noRowsLabel: '部品がありません',
                                MuiTablePagination: {
                                    labelDisplayedRows: ({ from, to, count }) =>
                                        `${count}件中 ${from}～${to}件`,
                                    labelRowsPerPage: '表示件数:',
                                },
                            }}
                        />
                    </Paper>

                    {/* 関連支給品一覧 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 4 }}>
                        <Typography variant="h6">
                            関連支給品
                        </Typography>
                        <Box>
                            <IconButton
                                onClick={fetchSuppliedItems}
                                sx={{ mr: 1 }}
                                disabled={suppliedItemsLoading}
                                aria-label="更新"
                            >
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddNewSuppliedItem}
                            >
                                支給品追加
                            </Button>
                        </Box>
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={suppliedItems}
                            columns={suppliedItemColumns}
                            loading={suppliedItemsLoading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            disableRowSelectionOnClick
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                                '& .MuiDataGrid-cell:focus-within': {
                                    outline: 'none',
                                },
                            }}
                            localeText={{
                                noRowsLabel: '支給品がありません',
                                MuiTablePagination: {
                                    labelDisplayedRows: ({ from, to, count }) =>
                                        `${count}件中 ${from}～${to}件`,
                                    labelRowsPerPage: '表示件数:',
                                },
                            }}
                        />
                    </Paper>

                    {/* 部品詳細・価格履歴モーダル（統合） */}
                    <PartModalManager
                        open={partModalOpen}
                        onClose={handleClosePartModal}
                        partId={selectedPartId}
                        onSuccess={handlePartModalSuccess}
                        initialModal={initialModalType}
                    />

                    {/* 新規部品追加モーダル */}
                    <PartFormModal
                        open={newPartModalOpen}
                        onClose={handleCloseNewPartModal}
                        onSuccess={handleNewPartSuccess}
                        productId={productId}
                    />

                    {/* 支給品詳細・価格履歴モーダル（統合） */}
                    <SuppliedItemModalManager
                        open={suppliedItemModalOpen}
                        onClose={handleCloseSuppliedItemModal}
                        suppliedItemId={selectedSuppliedItemId}
                        onSuccess={handleSuppliedItemModalSuccess}
                        initialModal={initialSuppliedItemModalType}
                    />

                    {/* 新規支給品追加モーダル */}
                    <SuppliedItemFormModal
                        open={newSuppliedItemModalOpen}
                        onClose={handleCloseNewSuppliedItemModal}
                        onSuccess={handleNewSuppliedItemSuccess}
                        productId={productId}
                    />
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}