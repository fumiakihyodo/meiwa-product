// app/production-planning/domestic/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
    LinearProgress,
    Breadcrumbs,
    Link,
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
    Factory as FactoryIcon,
    Home as HomeIcon,
} from '@mui/icons-material';
import NextLink from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { domesticPlanApi, domesticItemApi } from '@/services/apiProductionPlanning';
import {
    ProductionPlanListItem,
    ManufacturingItemForPlanning,
    ProductionPlanStatus,
    PLAN_STATUS_LABELS,
    PLAN_STATUS_COLORS,
    STATUS_OPTIONS,
    ModalMode,
} from '@/types/production-planning';
import DomesticPlanFormModal from '../components/DomesticPlanFormModal';
import toast from 'react-hot-toast';

// =============================================================================
// 型定義
// =============================================================================

interface DeleteConfirmState {
    open: boolean;
    plan: ProductionPlanListItem | null;
}

// =============================================================================
// 内部コンポーネント
// =============================================================================

function DomesticProductionPlanContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    // 状態管理
    const [plans, setPlans] = useState<ProductionPlanListItem[]>([]);
    const [manufacturingItems, setManufacturingItems] = useState<ManufacturingItemForPlanning[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState(initialSearch);
    const [selectedStatus, setSelectedStatus] = useState<ProductionPlanStatus | ''>('');

    // モーダル状態
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('create');
    const [selectedPlan, setSelectedPlan] = useState<ProductionPlanListItem | null>(null);

    // 削除確認
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
        open: false,
        plan: null,
    });

    // ==========================================================================
    // データ取得
    // ==========================================================================

    const fetchPlans = useCallback(async (params?: { search?: string; status?: string }) => {
        try {
            setLoading(true);
            const data = await domesticPlanApi.getPlans(params);
            setPlans(data);
        } catch (error) {
            console.error('生産計画の取得に失敗しました:', error);
            toast.error('生産計画の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchManufacturingItems = useCallback(async () => {
        try {
            const data = await domesticItemApi.getActiveItems();
            setManufacturingItems(data);
        } catch (error) {
            console.error('制作品の取得に失敗しました:', error);
        }
    }, []);

    useEffect(() => {
        const params: { search?: string } = {};
        if (initialSearch) params.search = initialSearch;
        fetchPlans(params);
        fetchManufacturingItems();
    }, [fetchPlans, fetchManufacturingItems, initialSearch]);

    // ==========================================================================
    // ハンドラ
    // ==========================================================================

    const handleSearch = useCallback(() => {
        const params: { search?: string; status?: string } = {};
        if (searchText) params.search = searchText;
        if (selectedStatus) params.status = selectedStatus;
        fetchPlans(params);
    }, [searchText, selectedStatus, fetchPlans]);

    const handleSearchReset = useCallback(() => {
        setSearchText('');
        setSelectedStatus('');
        fetchPlans();
    }, [fetchPlans]);

    const handleNewPlan = useCallback(() => {
        setSelectedPlan(null);
        setModalMode('create');
        setModalOpen(true);
    }, []);

    const handleViewPlan = useCallback((plan: ProductionPlanListItem) => {
        setSelectedPlan(plan);
        setModalMode('view');
        setModalOpen(true);
    }, []);

    const handleEditPlan = useCallback((plan: ProductionPlanListItem) => {
        setSelectedPlan(plan);
        setModalMode('edit');
        setModalOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback((plan: ProductionPlanListItem) => {
        setDeleteConfirm({ open: true, plan });
    }, []);

    const handleDelete = useCallback(async () => {
        if (!deleteConfirm.plan) return;

        try {
            await domesticPlanApi.deletePlan(deleteConfirm.plan.id);
            toast.success('生産計画を削除しました');
            fetchPlans();
        } catch (error) {
            console.error('削除に失敗しました:', error);
            toast.error('削除に失敗しました');
        } finally {
            setDeleteConfirm({ open: false, plan: null });
        }
    }, [deleteConfirm.plan, fetchPlans]);

    const handleModalClose = useCallback(() => {
        setModalOpen(false);
        setSelectedPlan(null);
    }, []);

    const handleModalSuccess = useCallback(async () => {
        setModalOpen(false);
        setSelectedPlan(null);
        // 保存完了後、確実にデータを再取得するために非同期で実行
        // 現在の検索条件を維持してデータを再取得
        const params: { search?: string; status?: string } = {};
        if (searchText) params.search = searchText;
        if (selectedStatus) params.status = selectedStatus;
        await fetchPlans(params);
    }, [fetchPlans, searchText, selectedStatus]);

    // ==========================================================================
    // DataGrid カラム定義
    // ==========================================================================

    const columns: GridColDef[] = [
        { field: 'plan_number', headerName: '計画番号', width: 150 },
        { field: 'manufacturing_item_name', headerName: '制作品', width: 200 },
        { field: 'product_name', headerName: '製品', width: 150 },
        {
            field: 'total_planned_quantity',
            headerName: '生産計画数',
            width: 110,
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
            renderCell: (params: GridRenderCellParams<ProductionPlanListItem, number>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={params.value || 0}
                            color={params.value && params.value >= 100 ? 'success' : 'primary'}
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
            renderCell: (params: GridRenderCellParams<ProductionPlanListItem, ProductionPlanStatus>) => (
                <Chip
                    label={params.value ? PLAN_STATUS_LABELS[params.value] : params.value}
                    color={params.value ? PLAN_STATUS_COLORS[params.value] : 'default'}
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
                    onClick={() => handleDeleteConfirm(params.row)}
                    showInMenu
                />,
            ],
        },
    ];

    // ==========================================================================
    // レンダリング
    // ==========================================================================

    return (
        <Box sx={{ width: '100%' }}>
            {/* パンくずリスト */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link
                    component={NextLink}
                    href="/production-planning"
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center' }}
                >
                    <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                    生産計画
                </Link>
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <FactoryIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                    国内生産計画
                </Typography>
            </Breadcrumbs>

            {/* ヘッダー */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <FactoryIcon color="primary" fontSize="large" />
                <Typography variant="h4" component="h1">
                    国内生産計画
                </Typography>
            </Box>

            {/* 検索・フィルター */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            placeholder="計画番号・製品名で検索"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            sx={{ width: 250 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>ステータス</InputLabel>
                            <Select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as ProductionPlanStatus | '')}
                                label="ステータス"
                            >
                                <MenuItem value="">すべて</MenuItem>
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>
                            検索
                        </Button>
                        <Button variant="outlined" onClick={handleSearchReset}>
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
            </Paper>

            {/* データテーブル */}
            <Paper sx={{ p: 2 }}>
                <DataGrid
                    rows={plans}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    }}
                    autoHeight
                    disableRowSelectionOnClick
                />
            </Paper>

            {/* モーダル */}
            <DomesticPlanFormModal
                open={modalOpen}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                mode={modalMode}
                plan={selectedPlan}
                manufacturingItems={manufacturingItems}
            />

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, plan: null })}>
                <DialogTitle>生産計画の削除</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        以下の生産計画を削除してもよろしいですか?
                    </DialogContentText>
                    {deleteConfirm.plan && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">計画番号</Typography>
                            <Typography variant="body1">{deleteConfirm.plan.plan_number}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>制作品</Typography>
                            <Typography variant="body1">{deleteConfirm.plan.manufacturing_item_name}</Typography>
                        </Box>
                    )}
                    <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                        ※ この操作は取り消せません
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm({ open: false, plan: null })}>キャンセル</Button>
                    <Button onClick={handleDelete} color="error">削除</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// =============================================================================
// メインページコンポーネント
// =============================================================================

export default function DomesticProductionPlanPage() {
    return (
        <AuthGuard>
            <Sidebar>
                <Suspense fallback={<Box sx={{ p: 2 }}>読み込み中...</Box>}>
                    <DomesticProductionPlanContent />
                </Suspense>
            </Sidebar>
        </AuthGuard>
    );
}
