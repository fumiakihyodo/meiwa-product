// app/production-planning/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    Chip,
    LinearProgress,
    TextField,
    InputAdornment,
    Skeleton,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    Factory as FactoryIcon,
    Public as PublicIcon,
    Search as SearchIcon,
    ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { productionPlanningOverviewApi } from '@/services/apiProductionPlanning';
import {
    ProductionPlanOverview,
    ProductionPlanListItem,
    ProductionPlanStatistics,
    PLAN_STATUS_LABELS,
    PLAN_STATUS_COLORS,
    ProductionPlanStatus,
} from '@/types/production-planning';
import toast from 'react-hot-toast';

// =============================================================================
// 統計カードコンポーネント
// =============================================================================

interface StatisticsCardProps {
    title: string;
    icon: React.ReactNode;
    statistics: ProductionPlanStatistics | null;
    color: 'primary' | 'secondary';
    loading: boolean;
    onNavigate: () => void;
}

function StatisticsCard({ title, icon, statistics, color, loading, onNavigate }: StatisticsCardProps) {
    if (loading) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                height: '100%',
                borderTop: 4,
                borderColor: `${color}.main`,
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box sx={{ color: `${color}.main` }}>{icon}</Box>
                    <Typography variant="h6" component="h2">
                        {title}
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" color={`${color}.main`}>
                                {statistics?.total_plans ?? 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                総計画数
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" color="warning.main">
                                {statistics?.active_plans ?? 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                進行中
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" color="success.main">
                                {statistics?.completed_plans ?? 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                完了
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4">
                                {statistics?.overall_completion_rate ?? 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                進捗率
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        全体進捗
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={statistics?.overall_completion_rate ?? 0}
                        color={color}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>
            </CardContent>
            <CardActions>
                <Button
                    size="small"
                    color={color}
                    endIcon={<ArrowForwardIcon />}
                    onClick={onNavigate}
                >
                    詳細を見る
                </Button>
            </CardActions>
        </Card>
    );
}

// =============================================================================
// 最近の計画テーブルコンポーネント
// =============================================================================

interface RecentPlansTableProps {
    title: string;
    plans: ProductionPlanListItem[];
    loading: boolean;
    onRowClick: (plan: ProductionPlanListItem) => void;
}

function RecentPlansTable({ title, plans, loading, onRowClick }: RecentPlansTableProps) {
    const columns: GridColDef[] = [
        { field: 'plan_number', headerName: '計画番号', width: 140 },
        { field: 'manufacturing_item_name', headerName: '制作品', width: 180 },
        {
            field: 'total_planned_quantity',
            headerName: '予定数',
            width: 90,
            type: 'number',
        },
        {
            field: 'completion_rate',
            headerName: '進捗',
            width: 120,
            renderCell: (params: GridRenderCellParams<ProductionPlanListItem, number>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={params.value || 0}
                            color={params.value && params.value >= 100 ? 'success' : 'primary'}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                        <Typography variant="caption">
                            {params.value || 0}%
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams<ProductionPlanListItem, ProductionPlanStatus>) => (
                <Chip
                    label={params.value ? PLAN_STATUS_LABELS[params.value] : params.value}
                    color={params.value ? PLAN_STATUS_COLORS[params.value] : 'default'}
                    size="small"
                />
            ),
        },
    ];

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                {title}
            </Typography>
            <DataGrid
                rows={plans}
                columns={columns}
                loading={loading}
                pageSizeOptions={[5]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 5, page: 0 } },
                }}
                autoHeight
                disableRowSelectionOnClick
                onRowClick={(params) => onRowClick(params.row)}
                sx={{
                    '& .MuiDataGrid-row:hover': {
                        cursor: 'pointer',
                    },
                }}
            />
        </Paper>
    );
}

// =============================================================================
// メインページコンポーネント
// =============================================================================

export default function ProductionPlanningPortalPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<ProductionPlanOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    const fetchOverview = useCallback(async () => {
        try {
            setLoading(true);
            const data = await productionPlanningOverviewApi.getOverview();
            setOverview(data);
        } catch (error) {
            console.error('概要データの取得に失敗しました:', error);
            toast.error('概要データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    const handleNavigateDomestic = useCallback(() => {
        router.push('/production-planning/domestic');
    }, [router]);

    const handleNavigateOverseas = useCallback(() => {
        router.push('/production-planning/overseas');
    }, [router]);

    const handleSearch = useCallback(() => {
        if (searchText.trim()) {
            router.push(`/production-planning/domestic?search=${encodeURIComponent(searchText)}`);
        }
    }, [searchText, router]);

    const handlePlanClick = useCallback((plan: ProductionPlanListItem) => {
        const path = plan.production_type === 'domestic'
            ? `/production-planning/domestic?plan=${plan.id}`
            : `/production-planning/overseas?plan=${plan.id}`;
        router.push(path);
    }, [router]);

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    {/* ヘッダー */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            生産計画
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            国内生産と海外生産の計画を管理します
                        </Typography>
                    </Box>

                    {/* 検索バー */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                placeholder="製品品番または製品名で検索"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                sx={{ flexGrow: 1, maxWidth: 400 }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleSearch}
                            >
                                検索
                            </Button>
                        </Box>
                    </Paper>

                    {/* 統計カード */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <StatisticsCard
                                title="国内生産"
                                icon={<FactoryIcon fontSize="large" />}
                                statistics={overview?.domestic.statistics ?? null}
                                color="primary"
                                loading={loading}
                                onNavigate={handleNavigateDomestic}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <StatisticsCard
                                title="海外生産"
                                icon={<PublicIcon fontSize="large" />}
                                statistics={overview?.overseas.statistics ?? null}
                                color="secondary"
                                loading={loading}
                                onNavigate={handleNavigateOverseas}
                            />
                        </Grid>
                    </Grid>

                    {/* クイックアクション */}
                    <Paper sx={{ p: 2, mb: 4 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            クイックアクション
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<FactoryIcon />}
                                onClick={handleNavigateDomestic}
                            >
                                国内生産計画を管理
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<PublicIcon />}
                                onClick={handleNavigateOverseas}
                            >
                                海外生産計画を管理
                            </Button>
                        </Box>
                    </Paper>

                    {/* 最近の計画 */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                        最近の生産計画
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <RecentPlansTable
                                title="国内生産 - 最近の計画"
                                plans={overview?.domestic.recent_plans ?? []}
                                loading={loading}
                                onRowClick={handlePlanClick}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <RecentPlansTable
                                title="海外生産 - 最近の計画"
                                plans={overview?.overseas.recent_plans ?? []}
                                loading={loading}
                                onRowClick={handlePlanClick}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
