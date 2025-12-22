// app/suppliers/[id]/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    CircularProgress,
    Tabs,
    Tab,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Business as BusinessIcon,
    Inventory as InventoryIcon,
    Visibility as VisibilityIcon,
    AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { Part } from '@/types/purchases';
import { PartModalType } from '@/types/business';
import { Supplier, SupplierBranch, BranchType } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { purchasesApi } from '@/services/apiPurchases';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { BranchModalManager } from '@/components/SupplierModal/BranchModalManager';
import { SupplierFormModal } from '@/components/SupplierModal/SupplierFormModal';
import { BranchFormModal } from '@/components/SupplierModal/BranchFormModal';
import { PartFormModal } from '@/components/PartModal/PartFormModal';
import { PartModalManager } from '@/components/PartModal/PartModalManager';
import { PartPriceListModal } from '@/components/PartModal/PartPriceListModal';
import toast from 'react-hot-toast';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();

    // データ状態
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [branches, setBranches] = useState<SupplierBranch[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);

    // 仕入先モーダル状態
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

    // 拠点モーダル状態（BranchModalManager用）
    const [branchModalManagerOpen, setBranchModalManagerOpen] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [branchModalType, setBranchModalType] = useState<'detail' | 'edit' | null>('detail');

    // 拠点作成・編集・複製モーダル状態（BranchFormModal用）
    const [branchFormModalOpen, setBranchFormModalOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<SupplierBranch | null>(null);
    const [duplicateBranch, setDuplicateBranch] = useState<SupplierBranch | null>(null);

    // 拠点削除ダイアログ状態
    const [branchDeleteDialogOpen, setBranchDeleteDialogOpen] = useState(false);
    const [selectedBranchForDelete, setSelectedBranchForDelete] = useState<SupplierBranch | null>(null);

    // 部品モーダル状態
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [partDetailModalOpen, setPartDetailModalOpen] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
    const [initialPartModalType, setInitialPartModalType] = useState<PartModalType>('detail');

    // 価格履歴モーダル状態
    const [priceListModalOpen, setPriceListModalOpen] = useState(false);
    const [selectedPartForPrice, setSelectedPartForPrice] = useState<Part | null>(null);

    // ========================================
    // データ取得
    // ========================================

    // 仕入先詳細取得
    const fetchSupplierDetail = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplier(Number(params.id));
            setSupplier(data);
        } catch (error) {
            toast.error('仕入先情報の取得に失敗しました');
            console.error(error);
        }
    }, [params.id]);

    // 拠点一覧取得
    const fetchBranches = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplierBranches({ supplier: Number(params.id) });
            setBranches(data);
        } catch (error) {
            console.error(error);
        }
    }, [params.id]);

    // 部品一覧取得
    const fetchParts = useCallback(async () => {
        try {
            const data = await purchasesApi.getParts({ supplier: Number(params.id) });
            setParts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    // 初回データ取得
    React.useEffect(() => {
        if (params?.id) {
            fetchSupplierDetail();
            fetchBranches();
            fetchParts();
        }
    }, [params?.id, fetchSupplierDetail, fetchBranches, fetchParts]);

    // ========================================
    // 仕入先関連ハンドラー
    // ========================================

    // 仕入先編集モーダルを開く
    const handleOpenSupplierEditModal = useCallback(() => {
        if (supplier) {
            setEditSupplier(supplier);
            setSupplierModalOpen(true);
        }
    }, [supplier]);

    // 仕入先モーダルを閉じる
    const handleCloseSupplierModal = useCallback(() => {
        setSupplierModalOpen(false);
        setEditSupplier(null);
    }, []);

    // 仕入先モーダル成功時
    const handleSupplierModalSuccess = useCallback(() => {
        fetchSupplierDetail();
    }, [fetchSupplierDetail]);

    // 仕入先削除
    const handleDeleteSupplier = useCallback(async () => {
        if (!supplier) return;

        if (confirm('この仕入先を削除してもよろしいですか?')) {
            try {
                await supplierApi.deleteSupplier(supplier.id);
                toast.success('仕入先を削除しました');
                router.push('/suppliers');
            } catch (error) {
                console.error(error);
                toast.error('削除に失敗しました');
            }
        }
    }, [supplier, router]);

    // ========================================
    // 拠点関連ハンドラー（BranchModalManager用）
    // ========================================

    // 拠点詳細モーダルを開く
    const handleOpenBranchDetail = useCallback((branchId: number) => {
        setSelectedBranchId(branchId);
        setBranchModalType('detail');
        setBranchModalManagerOpen(true);
    }, []);

    // BranchModalManagerを閉じる
    const handleCloseBranchModalManager = useCallback(() => {
        setBranchModalManagerOpen(false);
        setSelectedBranchId(null);
        setBranchModalType('detail');
    }, []);

    // BranchModalManager成功時
    const handleBranchModalManagerSuccess = useCallback(() => {
        fetchBranches();
        fetchSupplierDetail();
    }, [fetchBranches, fetchSupplierDetail]);

    // ========================================
    // 拠点関連ハンドラー（BranchFormModal用）
    // ========================================

    // 拠点新規作成モーダルを開く
    const handleOpenBranchCreateModal = useCallback(() => {
        setEditBranch(null);
        setDuplicateBranch(null);
        setBranchFormModalOpen(true);
    }, []);

    // 拠点編集モーダルを開く（テーブルの編集ボタンから）
    const handleOpenBranchEditModal = useCallback((branch: SupplierBranch) => {
        setEditBranch(branch);
        setDuplicateBranch(null);
        setBranchFormModalOpen(true);
    }, []);

    // BranchFormModalを閉じる
    const handleCloseBranchFormModal = useCallback(() => {
        setBranchFormModalOpen(false);
        setEditBranch(null);
        setDuplicateBranch(null);
    }, []);

    // BranchFormModal成功時
    const handleBranchFormModalSuccess = useCallback(() => {
        fetchBranches();
        fetchSupplierDetail();
    }, [fetchBranches, fetchSupplierDetail]);

    // ========================================
    // 拠点削除ハンドラー
    // ========================================

    // 拠点削除ダイアログを開く
    const handleOpenBranchDeleteDialog = useCallback((branch: SupplierBranch) => {
        setSelectedBranchForDelete(branch);
        setBranchDeleteDialogOpen(true);
    }, []);

    // 拠点削除
    const handleDeleteBranch = useCallback(async () => {
        if (!selectedBranchForDelete) return;

        try {
            await supplierApi.deleteSupplierBranch(selectedBranchForDelete.id);
            toast.success('拠点を削除しました');
            setBranchDeleteDialogOpen(false);
            setSelectedBranchForDelete(null);
            fetchBranches();
            fetchSupplierDetail();
        } catch (error) {
            console.error(error);
            toast.error('拠点の削除に失敗しました');
        }
    }, [selectedBranchForDelete, fetchBranches, fetchSupplierDetail]);

    // ========================================
    // 部品関連ハンドラー
    // ========================================

    // 部品新規作成モーダルを開く
    const handleOpenPartCreateModal = useCallback(() => {
        setPartModalOpen(true);
    }, []);

    // 部品モーダルを閉じる
    const handleClosePartModal = useCallback(() => {
        setPartModalOpen(false);
    }, []);

    // 部品詳細モーダルを開く
    const handleOpenPartDetailModal = useCallback((partId: number, modalType: PartModalType = 'detail') => {
        setSelectedPartId(partId);
        setInitialPartModalType(modalType);
        setPartDetailModalOpen(true);
    }, []);

    // 部品詳細モーダルを閉じる
    const handleClosePartDetailModal = useCallback(() => {
        setPartDetailModalOpen(false);
        setSelectedPartId(null);
        setInitialPartModalType('detail');
    }, []);

    // 部品モーダル成功時
    const handlePartModalSuccess = useCallback(() => {
        fetchParts();
    }, [fetchParts]);

    // 価格履歴モーダルを開く
    const handleOpenPriceListModal = useCallback((part: Part) => {
        setSelectedPartForPrice(part);
        setPriceListModalOpen(true);
    }, []);

    // 価格履歴モーダルを閉じる
    const handleClosePriceListModal = useCallback(() => {
        setPriceListModalOpen(false);
        setSelectedPartForPrice(null);
    }, []);

    // ========================================
    // ユーティリティ関数
    // ========================================

    const getBranchTypeLabel = (type: BranchType) => {
        const typeLabels = {
            [BranchType.HEAD_OFFICE]: '本社',
            [BranchType.BRANCH]: '支店',
            [BranchType.SALES_OFFICE]: '営業所',
            [BranchType.FACTORY]: '工場',
            [BranchType.WAREHOUSE]: '倉庫',
            [BranchType.OTHER]: 'その他',
        };
        return typeLabels[type] || type;
    };

    const getBranchTypeChip = (type: BranchType) => {
        const config = {
            [BranchType.HEAD_OFFICE]: { color: 'primary' as const },
            [BranchType.BRANCH]: { color: 'default' as const },
            [BranchType.SALES_OFFICE]: { color: 'info' as const },
            [BranchType.FACTORY]: { color: 'success' as const },
            [BranchType.WAREHOUSE]: { color: 'warning' as const },
            [BranchType.OTHER]: { color: 'default' as const },
        };

        return (
            <Chip
                label={getBranchTypeLabel(type)}
                color={config[type]?.color || 'default'}
                size="small"
            />
        );
    };

    // ========================================
    // ローディング・エラー表示
    // ========================================

    if (loading) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                        <CircularProgress />
                    </Box>
                </Sidebar>
            </AuthGuard>
        );
    }

    if (!supplier) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box>
                        <Typography variant="h6">仕入先が見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/suppliers')}
                            sx={{ mt: 2 }}
                        >
                            仕入先一覧に戻る
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton
                                    onClick={() => router.push('/suppliers')}
                                    sx={{ mr: 1 }}
                                    aria-label="仕入先一覧に戻る"
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                                <Typography variant="h4" component="h1">
                                    {supplier.company_name}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={handleOpenSupplierEditModal}
                                >
                                    編集
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={handleDeleteSupplier}
                                >
                                    削除
                                </Button>
                            </Box>
                        </Box>

                        {/* 仕入先情報カード */}
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 3
                            }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        仕入先コード
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {supplier.supplier_code}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        ウェブサイト
                                    </Typography>
                                    {supplier.website ? (
                                        <a
                                            href={supplier.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#1976d2', textDecoration: 'none' }}
                                        >
                                            {supplier.website}
                                        </a>
                                    ) : (
                                        <Typography variant="body1" fontWeight="medium">-</Typography>
                                    )}
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        ステータス
                                    </Typography>
                                    <Chip
                                        label={supplier.is_active ? '有効' : '無効'}
                                        size="small"
                                        color={supplier.is_active ? 'success' : 'default'}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        拠点数
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {branches.length}件 ({supplier.active_branches_count || 0}件有効)
                                    </Typography>
                                </Box>
                            </Box>

                            {supplier.notes && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                            備考
                                        </Typography>
                                        <Typography variant="body2">
                                            {supplier.notes}
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </Paper>
                    </Box>

                    {/* タブ */}
                    <Paper>
                        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                            <Tab icon={<BusinessIcon />} label={`拠点 (${branches.length})`} />
                            <Tab icon={<InventoryIcon />} label={`取扱部品 (${parts.length})`} />
                        </Tabs>

                        {/* 拠点タブ */}
                        <TabPanel value={tabValue} index={0}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">拠点一覧</Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleOpenBranchCreateModal}
                                >
                                    拠点追加
                                </Button>
                            </Box>
                            {branches.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>拠点コード</TableCell>
                                                <TableCell>拠点名</TableCell>
                                                <TableCell>拠点種別</TableCell>
                                                <TableCell>主担当者</TableCell>
                                                <TableCell>連絡先</TableCell>
                                                <TableCell>住所</TableCell>
                                                <TableCell align="center">ステータス</TableCell>
                                                <TableCell align="center">操作</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {branches.map((branch) => (
                                                <TableRow key={branch.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {branch.branch_code}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {branch.branch_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{getBranchTypeChip(branch.branch_type)}</TableCell>
                                                    <TableCell>
                                                        {branch.primary_contact ? (
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {branch.primary_contact.name}
                                                                </Typography>
                                                                {branch.primary_contact.phone_number && (
                                                                    <Typography variant="caption" display="block">
                                                                        <a
                                                                            href={`tel:${branch.primary_contact.phone_number}`}
                                                                            style={{
                                                                                color: '#1976d2',
                                                                                textDecoration: 'none',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            title="電話をかける"
                                                                        >
                                                                            📞 {branch.primary_contact.phone_number}
                                                                        </a>
                                                                    </Typography>
                                                                )}
                                                                {branch.primary_contact.email && (
                                                                    <Typography variant="caption" display="block">
                                                                        <a
                                                                            href={`mailto:${branch.primary_contact.email}`}
                                                                            style={{
                                                                                color: '#1976d2',
                                                                                textDecoration: 'none',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            title="メールを送る"
                                                                        >
                                                                            📧 {branch.primary_contact.email}
                                                                        </a>
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                -
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            {branch.phone_number && (
                                                                <Typography variant="body2">
                                                                    <a
                                                                        href={`tel:${branch.phone_number}`}
                                                                        style={{
                                                                            color: '#1976d2',
                                                                            textDecoration: 'none',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        title="電話をかける"
                                                                    >
                                                                        📞 {branch.phone_number}
                                                                    </a>
                                                                </Typography>
                                                            )}
                                                            {branch.email && (
                                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                                    <a
                                                                        href={`mailto:${branch.email}`}
                                                                        style={{
                                                                            color: '#1976d2',
                                                                            textDecoration: 'none',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        title="メールを送る"
                                                                    >
                                                                        📧 {branch.email}
                                                                    </a>
                                                                </Typography>
                                                            )}
                                                            {!branch.phone_number && !branch.email && '-'}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {branch.address ? (
                                                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                                {branch.postal_code && `〒${branch.postal_code} `}
                                                                {branch.address}
                                                            </Typography>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={branch.is_active ? '有効' : '無効'}
                                                            color={branch.is_active ? 'success' : 'default'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenBranchDetail(branch.id)}
                                                            title="詳細"
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenBranchEditModal(branch)}
                                                            title="編集"
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenBranchDeleteDialog(branch)}
                                                            title="削除"
                                                            color="error"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <Typography color="text.secondary" variant="body1" gutterBottom>
                                        拠点が登録されていません
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleOpenBranchCreateModal}
                                        sx={{ mt: 2 }}
                                    >
                                        最初の拠点を追加
                                    </Button>
                                </Box>
                            )}
                        </TabPanel>

                        {/* 部品タブ */}
                        <TabPanel value={tabValue} index={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">取扱部品一覧</Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleOpenPartCreateModal}
                                >
                                    部品追加
                                </Button>
                            </Box>
                            {parts.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>部品品番</TableCell>
                                                <TableCell>部品名</TableCell>
                                                <TableCell>製品</TableCell>
                                                <TableCell>拠点</TableCell>
                                                <TableCell align="right">現在単価</TableCell>
                                                <TableCell align="center">最小発注数</TableCell>
                                                <TableCell align="center">リードタイム</TableCell>
                                                <TableCell align="center">ステータス</TableCell>
                                                <TableCell align="center">操作</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parts.map((part) => (
                                                <TableRow key={part.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {part.part_number}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{part.part_name}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">
                                                            {part.product_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {part.product_number}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{part.branch_name}</TableCell>
                                                    <TableCell align="right">
                                                        {part.current_price ? (
                                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                                ¥{Number(part.current_price).toLocaleString()}
                                                            </Typography>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {part.minimum_order_quantity} {part.unit}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {part.lead_time_days ? `${part.lead_time_days}日` : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={part.is_active ? '有効' : '無効'}
                                                            color={part.is_active ? 'success' : 'default'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenPartDetailModal(part.id, 'detail')}
                                                            title="詳細を見る"
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenPriceListModal(part)}
                                                            title="価格履歴"
                                                        >
                                                            <MoneyIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenPartDetailModal(part.id, 'edit')}
                                                            title="編集"
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <Typography color="text.secondary" variant="body1" gutterBottom>
                                        部品が登録されていません
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleOpenPartCreateModal}
                                        sx={{ mt: 2 }}
                                    >
                                        最初の部品を追加
                                    </Button>
                                </Box>
                            )}
                        </TabPanel>
                    </Paper>

                    {/* ========================================
                        モーダルコンポーネント
                    ======================================== */}

                    {/* 仕入先編集モーダル */}
                    <SupplierFormModal
                        open={supplierModalOpen}
                        onClose={handleCloseSupplierModal}
                        onSuccess={handleSupplierModalSuccess}
                        editData={editSupplier}
                    />

                    {/* 拠点詳細・編集モーダル（BranchModalManager） */}
                    <BranchModalManager
                        open={branchModalManagerOpen}
                        onClose={handleCloseBranchModalManager}
                        branchId={selectedBranchId}
                        onSuccess={handleBranchModalManagerSuccess}
                        initialModal={branchModalType}
                    />

                    {/* 拠点作成・編集・複製モーダル（BranchFormModal） */}
                    <BranchFormModal
                        open={branchFormModalOpen}
                        onClose={handleCloseBranchFormModal}
                        onSuccess={handleBranchFormModalSuccess}
                        editData={editBranch}
                        duplicateFrom={duplicateBranch}
                        supplierId={supplier.id}
                    />

                    {/* 拠点削除確認ダイアログ */}
                    <Dialog
                        open={branchDeleteDialogOpen}
                        onClose={() => setBranchDeleteDialogOpen(false)}
                    >
                        <DialogTitle>拠点の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedBranchForDelete?.branch_name} ({selectedBranchForDelete?.branch_code}) を削除してもよろしいですか？
                                この操作は取り消せません。
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setBranchDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDeleteBranch} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* 部品新規作成モーダル */}
                    <PartFormModal
                        open={partModalOpen}
                        onClose={handleClosePartModal}
                        onSuccess={handlePartModalSuccess}
                        supplierId={supplier.id}
                    />

                    {/* 部品詳細・編集モーダル */}
                    {partDetailModalOpen && selectedPartId && (
                        <PartModalManager
                            open={partDetailModalOpen}
                            onClose={handleClosePartDetailModal}
                            partId={selectedPartId}
                            onSuccess={handlePartModalSuccess}
                            initialModal={initialPartModalType}
                        />
                    )}

                    {/* 価格履歴モーダル */}
                    {priceListModalOpen && selectedPartForPrice && (
                        <PartPriceListModal
                            open={priceListModalOpen}
                            onClose={handleClosePriceListModal}
                            part={selectedPartForPrice}
                        />
                    )}
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}