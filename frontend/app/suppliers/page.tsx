// app/suppliers/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Supplier } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { SupplierFormModal } from '@/components/SupplierModal/SupplierFormModal';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function SuppliersPage() {
    const router = useRouter();

    // データ状態
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // フィルター状態
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState<'domestic' | 'overseas'>('domestic');

    // 削除ダイアログ状態
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // 仕入先モーダル状態
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

    // 仕入先一覧取得
    const fetchSuppliers = useCallback(async (search?: string, isOverseas?: boolean) => {
        setLoading(true);
        try {
            const params: { search?: string; is_overseas?: string } = { search };
            if (isOverseas !== undefined) {
                params.is_overseas = isOverseas ? 'true' : 'false';
            }
            const data = await supplierApi.getSuppliers(params);
            setSuppliers(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('仕入先一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    // タブが変更されたらデータを再取得
    useEffect(() => {
        const isOverseas = activeTab === 'overseas';
        fetchSuppliers(searchText, isOverseas);
    }, [activeTab, fetchSuppliers, searchText]);

    // 検索処理
    const handleSearch = useCallback(() => {
        const isOverseas = activeTab === 'overseas';
        fetchSuppliers(searchText, isOverseas);
    }, [fetchSuppliers, searchText, activeTab]);

    // 新規作成モーダルを開く
    const handleOpenCreateModal = useCallback(() => {
        setEditSupplier(null);
        setSupplierModalOpen(true);
    }, []);

    // 編集モーダルを開く
    const handleOpenEditModal = useCallback(async (supplier: Supplier) => {
        try {
            // 詳細情報を取得（notesフィールドを含む）
            const detailData = await supplierApi.getSupplier(supplier.id);
            setEditSupplier(detailData);
            setSupplierModalOpen(true);
        } catch (error) {
            toast.error('仕入先詳細の取得に失敗しました');
            console.error(error);
        }
    }, []);

    // モーダルを閉じる
    const handleCloseSupplierModal = useCallback(() => {
        setSupplierModalOpen(false);
        setEditSupplier(null);
    }, []);

    // モーダル成功時の処理
    const handleSupplierModalSuccess = useCallback(() => {
        const isOverseas = activeTab === 'overseas';
        fetchSuppliers(searchText, isOverseas);
    }, [fetchSuppliers, searchText, activeTab]);

    // 削除ダイアログを開く
    const handleOpenDeleteDialog = useCallback((supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setDeleteDialogOpen(true);
    }, []);

    // 削除処理
    const handleDelete = useCallback(async () => {
        if (!selectedSupplier) return;

        try {
            await supplierApi.deleteSupplier(selectedSupplier.id);
            toast.success('仕入先を削除しました');
            setDeleteDialogOpen(false);
            setSelectedSupplier(null);
            const isOverseas = activeTab === 'overseas';
            fetchSuppliers(searchText, isOverseas);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || '仕入先の削除に失敗しました';
                toast.error(message);
            }
        }
    }, [selectedSupplier, fetchSuppliers, searchText, activeTab]);

    // タブラベル用の件数（現在表示されているデータの件数）
    const currentTabCount = suppliers.length;

    // タブ切り替えハンドラー
    const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: 'domestic' | 'overseas') => {
        setActiveTab(newValue);
    }, []);

    // グリッドカラム定義
    const columns: GridColDef[] = [
        {
            field: 'supplier_code',
            headerName: '仕入先コード',
            width: 150,
        },
        {
            field: 'company_name',
            headerName: '企業名',
            width: 250,
        },
        {
            field: 'website',
            headerName: 'ウェブサイト',
            width: 200,
            renderCell: (params) => {
                if (!params.value) return '-';
                return (
                    <a href={params.value} target="_blank" rel="noopener noreferrer">
                        {params.value}
                    </a>
                );
            },
        },
        {
            field: 'active_branches_count',
            headerName: '有効拠点数',
            width: 120,
            type: 'number',
            renderCell: (params) => params.value || 0,
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
            field: 'created_at',
            headerName: '作成日',
            width: 150,
            renderCell: (params) => new Date(params.value).toLocaleDateString('ja-JP'),
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
                    onClick={() => router.push(`/suppliers/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleOpenEditModal(params.row as Supplier)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleOpenDeleteDialog(params.row as Supplier)}
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
                            仕入先管理
                        </Typography>
                        <Box>
                            <IconButton onClick={() => fetchSuppliers(searchText)} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateModal}
                            >
                                新規仕入先
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                        <TextField
                            size="small"
                            placeholder="企業名またはコードで検索"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                            sx={{ width: 300 }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<SearchIcon />}
                            onClick={handleSearch}
                        >
                            検索
                        </Button>
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        {/* タブ */}
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                        >
                            <Tab
                                label={activeTab === 'domestic' ? `国内 (${currentTabCount})` : '国内'}
                                value="domestic"
                            />
                            <Tab
                                label={activeTab === 'overseas' ? `海外 (${currentTabCount})` : '海外'}
                                value="overseas"
                            />
                        </Tabs>

                        {/* データグリッド */}
                        <DataGrid
                            rows={suppliers}
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

                    {/* 仕入先作成・編集モーダル */}
                    <SupplierFormModal
                        open={supplierModalOpen}
                        onClose={handleCloseSupplierModal}
                        onSuccess={handleSupplierModalSuccess}
                        editData={editSupplier}
                    />

                    {/* 削除確認ダイアログ */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>仕入先の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedSupplier?.company_name} ({selectedSupplier?.supplier_code}) を削除してもよろしいですか？
                                この操作は取り消せません。
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDelete} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}