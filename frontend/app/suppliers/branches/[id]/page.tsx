// app/branches/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
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
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Person as PersonIcon,
    Inventory as InventoryIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { SupplierBranch, SupplierContact, BranchType, ContactResponsibility } from '@/types/supplier';
import { Part } from '@/types/purchases';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
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

const BRANCH_TYPE_LABELS = {
    [BranchType.HEAD_OFFICE]: '本社',
    [BranchType.BRANCH]: '支店',
    [BranchType.SALES_OFFICE]: '営業所',
    [BranchType.FACTORY]: '工場',
    [BranchType.WAREHOUSE]: '倉庫',
    [BranchType.OTHER]: 'その他',
};

const RESPONSIBILITY_LABELS = {
    [ContactResponsibility.QUOTATION]: '見積',
    [ContactResponsibility.ORDER]: '発注',
    [ContactResponsibility.DELIVERY]: '納品',
    [ContactResponsibility.TECHNICAL]: '技術',
    [ContactResponsibility.QUALITY]: '品質',
    [ContactResponsibility.ACCOUNTING]: '経理',
    [ContactResponsibility.GENERAL]: '全般',
    [ContactResponsibility.OTHER]: 'その他',
};

export default function BranchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [branch, setBranch] = useState<SupplierBranch | null>(null);
    const [contacts, setContacts] = useState<SupplierContact[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);

    const fetchBranchDetail = useCallback(async () => {
        if (!params?.id) return;
        
        try {
            const data = await supplierApi.getSupplierBranch(Number(params.id));
            setBranch(data);
            setContacts(data.contacts || []);
            setParts(data.parts || []);
        } catch (error) {
            toast.error('拠点情報の取得に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params?.id]);

    useEffect(() => {
        fetchBranchDetail();
    }, [fetchBranchDetail]);

    const handleDelete = async () => {
        if (!branch) return;

        if (confirm('この拠点を削除してもよろしいですか?')) {
            try {
                await supplierApi.deleteSupplierBranch(branch.id);
                toast.success('拠点を削除しました');
                router.push('/branches');
            } catch (error) {
                console.error(error);
                toast.error('削除に失敗しました');
            }
        }
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
                label={BRANCH_TYPE_LABELS[type]}
                color={config[type]?.color || 'default'}
                size="small"
            />
        );
    };

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

    if (!branch) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box>
                        <Typography variant="h6">拠点が見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.back()}
                            sx={{ mt: 2 }}
                        >
                            拠点一覧に戻る
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => router.back()}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h4" component="h1">
                                拠点詳細
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => router.push(`${branch.id}/edit`)}
                                sx={{ mr: 1 }}
                            >
                                編集
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleDelete}
                            >
                                削除
                            </Button>
                        </Box>
                    </Box>

                    {/* 基本情報 */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        基本情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点コード
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {branch.branch_code}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                サプライヤー
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {branch.supplier_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点名
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {branch.branch_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点種別
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                {getBranchTypeChip(branch.branch_type)}
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                ステータス
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={branch.is_active ? '有効' : '無効'}
                                                    color={branch.is_active ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        連絡先情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                郵便番号
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.postal_code ? `〒${branch.postal_code}` : '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                住所
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.address || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                電話番号
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.phone_number || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                FAX番号
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.fax_number || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                メールアドレス
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.email || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {branch.notes && (
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            備考
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                                            {branch.notes}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>

                    {/* タブ */}
                    <Paper>
                        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                            <Tab icon={<PersonIcon />} label={`担当者 (${contacts.length})`} />
                            <Tab icon={<InventoryIcon />} label={`取扱部品 (${parts.length})`} />
                        </Tabs>

                        {/* 担当者タブ */}
                        <TabPanel value={tabValue} index={0}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">担当者一覧</Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => router.push(`/contacts/new?branch=${branch.id}`)}
                                >
                                    担当者追加
                                </Button>
                            </Box>
                            {contacts.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>氏名</TableCell>
                                                <TableCell>部署</TableCell>
                                                <TableCell>役職</TableCell>
                                                <TableCell>主担当業務</TableCell>
                                                <TableCell>連絡先</TableCell>
                                                <TableCell align="center">主担当</TableCell>
                                                <TableCell align="center">ステータス</TableCell>
                                                <TableCell align="center">操作</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {contacts.map((contact) => (
                                                <TableRow key={contact.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {contact.name}
                                                        </Typography>
                                                        {contact.name_kana && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {contact.name_kana}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{contact.department || '-'}</TableCell>
                                                    <TableCell>{contact.position || '-'}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={RESPONSIBILITY_LABELS[contact.responsibility]}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            {contact.email && (
                                                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                                    📧 {contact.email}
                                                                </Typography>
                                                            )}
                                                            {contact.phone_number && (
                                                                <Typography variant="body2">
                                                                    📞 {contact.phone_number}
                                                                </Typography>
                                                            )}
                                                            {contact.mobile_number && (
                                                                <Typography variant="body2">
                                                                    📱 {contact.mobile_number}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {contact.is_primary ? (
                                                            <Chip label="主担当" color="primary" size="small" />
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={contact.is_active ? '有効' : '無効'}
                                                            color={contact.is_active ? 'success' : 'default'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => router.push(`/contacts/${contact.id}`)}
                                                            title="詳細を見る"
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => router.push(`/contacts/${contact.id}/edit`)}
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
                                        担当者が登録されていません
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => router.push(`/contacts/new?branch=${branch.id}`)}
                                        sx={{ mt: 2 }}
                                    >
                                        最初の担当者を追加
                                    </Button>
                                </Box>
                            )}
                        </TabPanel>

                        {/* 部品タブ */}
                        <TabPanel value={tabValue} index={1}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                取扱部品一覧
                            </Typography>
                            {parts.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>部品品番</TableCell>
                                                <TableCell>部品名</TableCell>
                                                <TableCell>製品</TableCell>
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
                                                            onClick={() => router.push(`/parts/${part.id}`)}
                                                            title="詳細を見る"
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <Typography color="text.secondary" variant="body1">
                                        部品が登録されていません
                                    </Typography>
                                </Box>
                            )}
                        </TabPanel>
                    </Paper>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}