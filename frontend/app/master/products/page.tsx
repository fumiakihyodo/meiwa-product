// app/products/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    FormControlLabel,
    Checkbox,
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
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { Product, ProductStatus } from '@/types/product';
import { productApi } from '@/services/apiProduct';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // フィルター状態
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [includeDiscontinued, setIncludeDiscontinued] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async (params?: { status?: string; search?: string; include_discontinued?: boolean }) => {
        setLoading(true);
        try {
            const data = await productApi.getProducts(params);
            setProducts(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('製品一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedProduct) return;

        try {
            await productApi.deleteProduct(selectedProduct.id);
            toast.success('製品を削除しました');
            setDeleteDialogOpen(false);
            setSelectedProduct(null);
            fetchProducts();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || '製品の削除に失敗しました';
                toast.error(message);
            }
        }
    };


    const handleSearch = (() => {
        const params: any = {};
        if (searchText) params.search = searchText;
        if (selectedStatus) params.status = selectedStatus;
        params.include_discontinued = includeDiscontinued;
        fetchProducts(params);
    });

    const handleClearFilters = useCallback(() => {
        setSearchText('');
        setSelectedStatus('');
        setIncludeDiscontinued(false);
        fetchProducts({ include_discontinued: false });
    }, []);

    const getStatusChip = (status: ProductStatus) => {
        const statusConfig = {
            [ProductStatus.ACTIVE]: { label: '有効', color: 'success' as const },
            [ProductStatus.DISCONTINUED]: { label: '廃番', color: 'error' as const },
            [ProductStatus.DEVELOPMENT]: { label: '開発中', color: 'warning' as const },
        };

        const config = statusConfig[status] || { label: status, color: 'default' as const };
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    const columns: GridColDef[] = [
        {
            field: 'product_number',
            headerName: '製品品番',
            width: 130,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium" color="primary">
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'product_name',
            headerName: '製品名',
            width: 180,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'customer_branch_name',
            headerName: '顧客情報',
            width: 160,
            renderCell: (params) => (
                <Typography variant="body2" color="text.secondary">
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: 'description',
            headerName: '説明',
            width: 200,
            renderCell: (params) => (
                <Typography variant="body2" color="text.secondary">
                    {params.value ?
                        (params.value.length > 40
                            ? `${params.value.substring(0, 40)}...`
                            : params.value)
                        : '-'
                    }
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => getStatusChip(params.value as ProductStatus),
        },
        {
            field: 'parts_count',
            headerName: '部品数',
            width: 80,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value || 0}
                </Typography>
            ),
        },
        {
            field: 'manufacturing_items_count',
            headerName: '製造品数',
            width: 90,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value || 0}
                </Typography>
            ),
        },
        {
            field: 'created_at',
            headerName: '作成日',
            width: 110,
            renderCell: (params) => (
                <Typography variant="body2" color="text.secondary">
                    {new Date(params.value).toLocaleDateString('ja-JP')}
                </Typography>
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => router.push(`/master/products/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => router.push(`/master/products/${params.row.id}/edit`)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedProduct(params.row as Product);
                        setDeleteDialogOpen(true);
                    }}
                    showInMenu
                />,
            ],
        },
    ];

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    {/* ヘッダー */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h4" component="h1" gutterBottom>
                                製品管理
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                製品の登録・管理を行います
                            </Typography>
                        </Box>
                        <Box>
                            <IconButton
                                onClick={() => fetchProducts()}
                                sx={{ mr: 1 }}
                                title="更新"
                            >
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => router.push('/master/products/new')}
                            >
                                新規製品
                            </Button>
                        </Box>
                    </Box>

                    {/* 検索・フィルターセクション */}
                    <Paper sx={{ p: 2.5, mb: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    placeholder="品番、製品名、顧客名で検索"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel>ステータス</InputLabel>
                                    <Select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        label="ステータス"
                                    >
                                        <MenuItem value="">すべて</MenuItem>
                                        <MenuItem value={ProductStatus.ACTIVE}>有効</MenuItem>
                                        <MenuItem value={ProductStatus.DEVELOPMENT}>開発中</MenuItem>
                                        <MenuItem value={ProductStatus.DISCONTINUED}>廃番</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<FilterListIcon />}
                                        onClick={handleSearch}
                                    >
                                        検索
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={handleClearFilters}
                                    >
                                        クリア
                                    </Button>
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={includeDiscontinued}
                                            onChange={(e) => {
                                                setIncludeDiscontinued(e.target.checked);
                                                const params: any = {};
                                                if (searchText) params.search = searchText;
                                                if (selectedStatus) params.status = selectedStatus;
                                                params.include_discontinued = e.target.checked;
                                                fetchProducts(params);
                                            }}
                                        />
                                    }
                                    label="廃盤を表示する"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* データグリッド */}
                    <Paper>
                        <DataGrid
                            rows={products}
                            columns={columns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50, 100]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 25, page: 0 },
                                },
                            }}
                            checkboxSelection
                            disableRowSelectionOnClick
                            sx={{
                                '& .MuiDataGrid-cell': {
                                    display: 'flex',
                                    alignItems: 'center',
                                },
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                                '& .MuiDataGrid-row:hover': {
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        />
                    </Paper>

                    {/* 削除確認ダイアログ */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>製品の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                以下の製品を削除してもよろしいですか？
                            </DialogContentText>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    製品品番
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" gutterBottom>
                                    {selectedProduct?.product_number}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                                    製品名
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedProduct?.product_name}
                                </Typography>
                                {selectedProduct?.customer_branch && (
                                    <>
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                                            カスタマー
                                        </Typography>
                                        <Typography variant="body1">
                                            {selectedProduct.customer_branch}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                                ※ この操作は取り消せません
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDelete} color="error" variant="contained">
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}