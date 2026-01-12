// app/master/material/page.tsx
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
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { useFetchData } from '@/hooks/useFetchData';
import {
    materialApi,
    Material,
} from '@/services/apiManufacturing';
import toast from 'react-hot-toast';
import MaterialModal from '@/components/manufacturing/MaterialModal';

const materialCategoryLabels: Record<string, string> = {
    raw: '原材料',
    semi_finished: '半製品',
    component: '部品',
    consumable: '消耗品',
    other: 'その他',
};

type MaterialSearchParams = { search?: string; category?: string };

export default function MaterialPage() {
    // Materials state
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [materialModalMode, setMaterialModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [deleteMaterialDialogOpen, setDeleteMaterialDialogOpen] = useState(false);
    const [materialSearchText, setMaterialSearchText] = useState('');
    const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>('');

    // Data fetching
    const {
        data: materials,
        loading: materialsLoading,
        fetch: fetchMaterials,
    } = useFetchData<Material[], MaterialSearchParams>({
        fetchFn: useCallback((params?: MaterialSearchParams) => materialApi.getMaterials(params), []),
        errorMessage: '材料一覧の取得に失敗しました',
    });

    // Initial data fetch
    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

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

    const handleResetSearch = useCallback(() => {
        setMaterialSearchText('');
        setSelectedMaterialCategory('');
        fetchMaterials();
    }, [fetchMaterials]);

    // DataGrid columns
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
                        材料管理
                    </Typography>

                    <Paper sx={{ width: '100%', p: 2 }}>
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
                                <Button variant="outlined" onClick={handleResetSearch}>
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
                    </Paper>

                    {/* 材料モーダル */}
                    <MaterialModal
                        open={materialModalOpen}
                        onClose={handleMaterialModalClose}
                        onSuccess={handleMaterialModalSuccess}
                        mode={materialModalMode}
                        material={selectedMaterial}
                    />

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
