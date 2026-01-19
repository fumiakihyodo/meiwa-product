// app/production-planning/page.tsx
// 生産計画スケジューラービュー - ガントチャート風の月次表示
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
    Menu,
    MenuItem,
    Divider,
    useTheme,
    alpha,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Add as AddIcon,
    Factory as FactoryIcon,
    Public as PublicIcon,
    Today as TodayIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import ProductionPlanModal from '@/components/ProductionPlanModal';
import { domesticPlanApi, overseasPlanApi } from '@/services/apiProductionPlanning';
import {
    ProductionPlanListItem,
    ProductionPlanDetail,
    ProductionType,
    ModalMode,
    PLAN_STATUS_COLORS,
    ProductionPlanStatus,
} from '@/types/production-planning';
import toast from 'react-hot-toast';

// =============================================================================
// 型定義
// =============================================================================

interface SchedulerPlanWithSchedules extends ProductionPlanListItem {
    schedules?: Array<{
        id: number;
        finished_at: string | null;
        quantity: number;
    }>;
}

interface ModalState {
    open: boolean;
    mode: ModalMode;
    planId: number | null;
    productionType: ProductionType;
}

interface DayInfo {
    date: Date;
    dateStr: string;
    dayOfWeek: string;
    dayOfWeekNum: number;
    isWeekend: boolean;
    isToday: boolean;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDaysInMonth = (year: number, month: number): DayInfo[] => {
    const days: DayInfo[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const today = formatDateStr(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeekNum = date.getDay();
        days.push({
            date,
            dateStr: formatDateStr(date),
            dayOfWeek: dayNames[dayOfWeekNum],
            dayOfWeekNum,
            isWeekend: dayOfWeekNum === 0 || dayOfWeekNum === 6,
            isToday: formatDateStr(date) === today,
        });
    }
    return days;
};

const getStatusColor = (status: ProductionPlanStatus): string => {
    const colorMap: Record<ProductionPlanStatus, string> = {
        draft: '#9e9e9e',
        planned: '#2196f3',
        in_progress: '#ff9800',
        completed: '#4caf50',
        cancelled: '#f44336',
        on_hold: '#9c27b0',
    };
    return colorMap[status] || '#9e9e9e';
};

// =============================================================================
// スケジューラーセルコンポーネント
// =============================================================================

interface SchedulerCellProps {
    plan: SchedulerPlanWithSchedules;
    dayInfo: DayInfo;
    isDomestic: boolean;
    onClick: () => void;
}

function SchedulerCell({ plan, dayInfo, isDomestic, onClick }: SchedulerCellProps) {
    const theme = useTheme();
    const dateStr = dayInfo.dateStr;

    // 計画期間内かチェック
    const startDate = plan.planned_start_date;
    const endDate = plan.planned_end_date;

    const isInRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    const isStart = startDate === dateStr;
    const isEnd = endDate === dateStr;

    // 分納データを取得
    const delivery = plan.schedules?.find(s => {
        if (!s.finished_at) return false;
        const deliveryDate = s.finished_at.split('T')[0];
        return deliveryDate === dateStr;
    });

    // 完了日の数量表示
    const isEndWithQuantity = isEnd && !delivery;

    if (!isInRange && !delivery) {
        return <Box sx={{ minWidth: 40, height: 36 }} />;
    }

    const statusColor = getStatusColor(plan.status);
    const baseColor = isDomestic ? theme.palette.primary.main : theme.palette.secondary.main;

    return (
        <Tooltip
            title={
                <Box>
                    <Typography variant="body2">{plan.manufacturing_item_name}</Typography>
                    <Typography variant="caption">
                        計画番号: {plan.plan_number}
                    </Typography>
                    {delivery && (
                        <Typography variant="caption" display="block">
                            分納: {delivery.quantity}個
                        </Typography>
                    )}
                    {isEndWithQuantity && (
                        <Typography variant="caption" display="block">
                            完成予定: {plan.total_planned_quantity}個
                        </Typography>
                    )}
                </Box>
            }
            arrow
        >
            <Box
                onClick={onClick}
                sx={{
                    minWidth: 40,
                    height: 36,
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover': {
                        opacity: 0.8,
                    },
                }}
            >
                {/* バー表示 */}
                {isInRange && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            left: isStart ? '50%' : 0,
                            right: isEnd ? '50%' : 0,
                            height: 20,
                            bgcolor: alpha(baseColor, 0.3),
                            borderLeft: isStart ? `3px solid ${statusColor}` : 'none',
                            borderRight: isEnd ? `3px solid ${statusColor}` : 'none',
                            borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : 0,
                        }}
                    />
                )}

                {/* 分納数量表示 */}
                {delivery && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: isDomestic ? 'primary.main' : 'secondary.main',
                            color: 'white',
                            borderRadius: '4px',
                            px: 0.5,
                            py: 0.25,
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            zIndex: 1,
                            minWidth: 24,
                            textAlign: 'center',
                        }}
                    >
                        {delivery.quantity}
                    </Box>
                )}

                {/* 完了日の数量表示（分納がない場合） */}
                {isEndWithQuantity && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: statusColor,
                            color: 'white',
                            borderRadius: '4px',
                            px: 0.5,
                            py: 0.25,
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            zIndex: 1,
                            minWidth: 24,
                            textAlign: 'center',
                        }}
                    >
                        {plan.total_planned_quantity}
                    </Box>
                )}
            </Box>
        </Tooltip>
    );
}

// =============================================================================
// スケジューラー行コンポーネント
// =============================================================================

interface SchedulerRowProps {
    plan: SchedulerPlanWithSchedules;
    days: DayInfo[];
    isDomestic: boolean;
    onPlanClick: (plan: SchedulerPlanWithSchedules) => void;
}

function SchedulerRow({ plan, days, isDomestic, onPlanClick }: SchedulerRowProps) {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                },
            }}
        >
            {/* 計画情報列 */}
            <Box
                sx={{
                    minWidth: 200,
                    maxWidth: 200,
                    p: 1,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
                onClick={() => onPlanClick(plan)}
            >
                <Typography variant="body2" fontWeight="bold" noWrap>
                    {plan.manufacturing_item_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {plan.plan_number}
                    </Typography>
                    <Chip
                        label={plan.status_display}
                        size="small"
                        color={PLAN_STATUS_COLORS[plan.status]}
                        sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                </Box>
            </Box>

            {/* 日付セル */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {days.map((dayInfo) => (
                    <Box
                        key={dayInfo.dateStr}
                        sx={{
                            minWidth: 40,
                            borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            bgcolor: dayInfo.isWeekend
                                ? alpha(theme.palette.action.hover, 0.3)
                                : dayInfo.isToday
                                    ? alpha(theme.palette.primary.main, 0.1)
                                    : 'transparent',
                        }}
                    >
                        <SchedulerCell
                            plan={plan}
                            dayInfo={dayInfo}
                            isDomestic={isDomestic}
                            onClick={() => onPlanClick(plan)}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// =============================================================================
// スケジューラーセクションコンポーネント
// =============================================================================

interface SchedulerSectionProps {
    title: string;
    icon: React.ReactNode;
    plans: SchedulerPlanWithSchedules[];
    days: DayInfo[];
    isDomestic: boolean;
    loading: boolean;
    color: 'primary' | 'secondary';
    onPlanClick: (plan: SchedulerPlanWithSchedules) => void;
    onAddClick: () => void;
}

function SchedulerSection({
    title,
    icon,
    plans,
    days,
    isDomestic,
    loading,
    color,
    onPlanClick,
    onAddClick,
}: SchedulerSectionProps) {
    const theme = useTheme();

    return (
        <Paper
            sx={{
                overflow: 'hidden',
                borderTop: 4,
                borderColor: `${color}.main`,
            }}
        >
            {/* セクションヘッダー */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette[color].main, 0.05),
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: `${color}.main` }}>{icon}</Box>
                    <Typography variant="h6">{title}</Typography>
                    <Chip
                        label={`${plans.length}件`}
                        size="small"
                        color={color}
                        variant="outlined"
                    />
                </Box>
                <Button
                    variant="contained"
                    color={color}
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={onAddClick}
                >
                    新規登録
                </Button>
            </Box>

            {/* スケジューラーテーブル */}
            <Box sx={{ overflow: 'auto' }}>
                {/* 日付ヘッダー */}
                <Box
                    sx={{
                        display: 'flex',
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        bgcolor: 'background.default',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                    }}
                >
                    {/* 計画情報ヘッダー */}
                    <Box
                        sx={{
                            minWidth: 200,
                            maxWidth: 200,
                            p: 1,
                            borderRight: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                        }}
                    >
                        <Typography variant="subtitle2">計画</Typography>
                    </Box>

                    {/* 日付列 */}
                    <Box sx={{ display: 'flex', flex: 1 }}>
                        {days.map((dayInfo) => (
                            <Box
                                key={dayInfo.dateStr}
                                sx={{
                                    minWidth: 40,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    py: 0.5,
                                    borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    bgcolor: dayInfo.isWeekend
                                        ? alpha(theme.palette.action.hover, 0.3)
                                        : dayInfo.isToday
                                            ? alpha(theme.palette.primary.main, 0.15)
                                            : 'transparent',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    fontWeight={dayInfo.isToday ? 'bold' : 'normal'}
                                    color={
                                        dayInfo.isToday
                                            ? 'primary.main'
                                            : dayInfo.dayOfWeekNum === 0
                                                ? 'error.main'
                                                : dayInfo.dayOfWeekNum === 6
                                                    ? 'info.main'
                                                    : 'text.primary'
                                    }
                                >
                                    {dayInfo.date.getDate()}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    fontSize="0.6rem"
                                    color={
                                        dayInfo.dayOfWeekNum === 0
                                            ? 'error.main'
                                            : dayInfo.dayOfWeekNum === 6
                                                ? 'info.main'
                                                : 'text.secondary'
                                    }
                                >
                                    {dayInfo.dayOfWeek}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* 計画行 */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress color={color} />
                    </Box>
                ) : plans.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            この期間に計画がありません
                        </Typography>
                    </Box>
                ) : (
                    plans.map((plan) => (
                        <SchedulerRow
                            key={plan.id}
                            plan={plan}
                            days={days}
                            isDomestic={isDomestic}
                            onPlanClick={onPlanClick}
                        />
                    ))
                )}
            </Box>
        </Paper>
    );
}

// =============================================================================
// メインページコンポーネント
// =============================================================================

export default function ProductionPlanningSchedulerPage() {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [domesticPlans, setDomesticPlans] = useState<SchedulerPlanWithSchedules[]>([]);
    const [overseasPlans, setOverseasPlans] = useState<SchedulerPlanWithSchedules[]>([]);
    const [domesticLoading, setDomesticLoading] = useState(true);
    const [overseasLoading, setOverseasLoading] = useState(true);
    const [modalState, setModalState] = useState<ModalState>({
        open: false,
        mode: 'create',
        planId: null,
        productionType: 'domestic',
    });
    const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

    // 現在の月の日付リスト
    const days = useMemo(() => {
        return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    // 月の表示文字列
    const monthDisplay = useMemo(() => {
        return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
    }, [currentDate]);

    // ==========================================================================
    // データ取得
    // ==========================================================================

    const fetchDomesticPlans = useCallback(async () => {
        try {
            setDomesticLoading(true);
            const plans = await domesticPlanApi.getPlans();

            // 各計画の詳細を取得してスケジュール情報を付加
            const plansWithSchedules = await Promise.all(
                plans.map(async (plan) => {
                    try {
                        const detail = await domesticPlanApi.getPlan(plan.id);
                        return {
                            ...plan,
                            schedules: detail.schedules?.map(s => ({
                                id: s.id,
                                finished_at: s.finished_at,
                                quantity: s.quantity,
                            })),
                        };
                    } catch {
                        return { ...plan, schedules: [] };
                    }
                })
            );

            // 当月に関連する計画のみフィルタリング
            const monthStart = formatDateStr(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
            const monthEnd = formatDateStr(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

            const filteredPlans = plansWithSchedules.filter(plan => {
                // 計画期間が当月と重複するか
                const planStart = plan.planned_start_date;
                const planEnd = plan.planned_end_date;

                if (!planStart && !planEnd) return false;

                const effectiveStart = planStart || planEnd;
                const effectiveEnd = planEnd || planStart;

                if (!effectiveStart || !effectiveEnd) return false;

                return effectiveStart <= monthEnd && effectiveEnd >= monthStart;
            });

            setDomesticPlans(filteredPlans);
        } catch (error) {
            console.error('国内生産計画の取得に失敗しました:', error);
            toast.error('国内生産計画の取得に失敗しました');
        } finally {
            setDomesticLoading(false);
        }
    }, [currentDate]);

    const fetchOverseasPlans = useCallback(async () => {
        try {
            setOverseasLoading(true);
            const plans = await overseasPlanApi.getPlans();

            // 当月に関連する計画のみフィルタリング
            const monthStart = formatDateStr(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
            const monthEnd = formatDateStr(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

            const filteredPlans = plans.filter(plan => {
                const planStart = plan.planned_start_date;
                const planEnd = plan.planned_end_date;

                if (!planStart && !planEnd) return false;

                const effectiveStart = planStart || planEnd;
                const effectiveEnd = planEnd || planStart;

                if (!effectiveStart || !effectiveEnd) return false;

                return effectiveStart <= monthEnd && effectiveEnd >= monthStart;
            });

            setOverseasPlans(filteredPlans.map(p => ({ ...p, schedules: [] })));
        } catch (error) {
            console.error('海外生産計画の取得に失敗しました:', error);
            toast.error('海外生産計画の取得に失敗しました');
        } finally {
            setOverseasLoading(false);
        }
    }, [currentDate]);

    const fetchAllPlans = useCallback(() => {
        fetchDomesticPlans();
        fetchOverseasPlans();
    }, [fetchDomesticPlans, fetchOverseasPlans]);

    useEffect(() => {
        fetchAllPlans();
    }, [fetchAllPlans]);

    // ==========================================================================
    // 月の移動
    // ==========================================================================

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // ==========================================================================
    // モーダル制御
    // ==========================================================================

    const handleOpenModal = (
        mode: ModalMode,
        productionType: ProductionType,
        planId: number | null = null
    ) => {
        setModalState({
            open: true,
            mode,
            planId,
            productionType,
        });
        setAddMenuAnchor(null);
    };

    const handleCloseModal = () => {
        setModalState({
            ...modalState,
            open: false,
        });
    };

    const handleModalSuccess = () => {
        handleCloseModal();
        fetchAllPlans();
    };

    const handlePlanClick = (plan: SchedulerPlanWithSchedules) => {
        handleOpenModal('view', plan.production_type, plan.id);
    };

    // ==========================================================================
    // 新規追加メニュー
    // ==========================================================================

    const handleAddMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAddMenuAnchor(event.currentTarget);
    };

    const handleAddMenuClose = () => {
        setAddMenuAnchor(null);
    };

    // ==========================================================================
    // レンダリング
    // ==========================================================================

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    {/* ヘッダー */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" component="h1" gutterBottom>
                                生産計画スケジューラー
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                月次スケジュールで国内生産と海外生産の計画を管理します
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={fetchAllPlans}
                            >
                                更新
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddMenuOpen}
                            >
                                新規登録
                            </Button>
                            <Menu
                                anchorEl={addMenuAnchor}
                                open={Boolean(addMenuAnchor)}
                                onClose={handleAddMenuClose}
                            >
                                <MenuItem onClick={() => handleOpenModal('create', 'domestic')}>
                                    <FactoryIcon sx={{ mr: 1 }} color="primary" />
                                    国内生産計画
                                </MenuItem>
                                <MenuItem onClick={() => handleOpenModal('create', 'overseas')}>
                                    <PublicIcon sx={{ mr: 1 }} color="secondary" />
                                    海外生産計画
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Box>

                    {/* 月の選択 */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={handlePreviousMonth}>
                                <ChevronLeftIcon />
                            </IconButton>
                            <Typography variant="h5" sx={{ minWidth: 150, textAlign: 'center' }}>
                                {monthDisplay}
                            </Typography>
                            <IconButton onClick={handleNextMonth}>
                                <ChevronRightIcon />
                            </IconButton>
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            <Tooltip title="今日に移動">
                                <IconButton onClick={handleToday} color="primary">
                                    <TodayIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Paper>

                    {/* 凡例 */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                凡例:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 20, bgcolor: 'primary.main', borderRadius: 1, opacity: 0.3 }} />
                                <Typography variant="caption">国内生産</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 20, bgcolor: 'secondary.main', borderRadius: 1, opacity: 0.3 }} />
                                <Typography variant="caption">海外生産</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 24, height: 16, bgcolor: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontSize: '0.6rem' }}>50</Typography>
                                </Box>
                                <Typography variant="caption">分納数量</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 24, height: 16, bgcolor: '#4caf50', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontSize: '0.6rem' }}>100</Typography>
                                </Box>
                                <Typography variant="caption">完成予定数量</Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {/* 国内生産セクション */}
                    <Box sx={{ mb: 4 }}>
                        <SchedulerSection
                            title="国内生産"
                            icon={<FactoryIcon fontSize="large" />}
                            plans={domesticPlans}
                            days={days}
                            isDomestic={true}
                            loading={domesticLoading}
                            color="primary"
                            onPlanClick={handlePlanClick}
                            onAddClick={() => handleOpenModal('create', 'domestic')}
                        />
                    </Box>

                    {/* 海外生産セクション */}
                    <Box sx={{ mb: 4 }}>
                        <SchedulerSection
                            title="海外生産"
                            icon={<PublicIcon fontSize="large" />}
                            plans={overseasPlans}
                            days={days}
                            isDomestic={false}
                            loading={overseasLoading}
                            color="secondary"
                            onPlanClick={handlePlanClick}
                            onAddClick={() => handleOpenModal('create', 'overseas')}
                        />
                    </Box>

                    {/* モーダル */}
                    <ProductionPlanModal
                        open={modalState.open}
                        onClose={handleCloseModal}
                        onSuccess={handleModalSuccess}
                        mode={modalState.mode}
                        planId={modalState.planId}
                        productionType={modalState.productionType}
                    />
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
