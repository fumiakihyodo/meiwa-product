// app/customers/[id]/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
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
    Stack,
    Avatar,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Business as BusinessIcon,
    Inventory as InventoryIcon,
    Add as AddIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { Customer, CustomerBranch } from '@/types/customer';
import { Product } from '@/types/business';
import { customerApi } from '@/services/apiCustomer';
import { productApi } from '@/services/apiProduct';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { CustomerBranchFormModal } from '@/components/CustomerBranchFormModal';
import { gradients, getStatusColor, getBranchTypeColor } from '@/app/theme';
import toast from 'react-hot-toast';

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const theme = useTheme();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    const fetchCustomerDetail = useCallback(async () => {
        try {
            const data = await customerApi.getCustomer(Number(params.id));
            setCustomer(data);
        } catch (error) {
            toast.error('カスタマー情報の取得に失敗しました');
            console.error(error);
        }
    }, [params.id]);

    const fetchProducts = useCallback(async () => {
        try {
            const data = await productApi.getProducts({ customer: params.id.toString() });
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    React.useEffect(() => {
        if (params?.id) {
            fetchCustomerDetail();
            fetchProducts();
        }
    }, [params?.id, fetchCustomerDetail, fetchProducts]);

    const handleDelete = async () => {
        if (!customer) return;

        if (confirm('このカスタマーを削除してもよろしいですか?')) {
            try {
                await customerApi.deleteCustomer(customer.id);
                toast.success('カスタマーを削除しました');
                router.push('/customers');
            } catch (error) {
                console.error(error);
                toast.error('削除に失敗しました');
            }
        }
    };

    const handleBranchCreated = useCallback((branch: CustomerBranch) => {
        fetchCustomerDetail();
        toast.success(`拠点「${branch.branch_name}」を登録しました`);
    }, [fetchCustomerDetail]);

    const getBranchTypeLabel = (branchType: string) => {
        const labels: { [key: string]: string } = {
            HEAD_OFFICE: '本社',
            BRANCH: '支店',
            SALES_OFFICE: '営業所',
            FACTORY: '工場',
            WAREHOUSE: '倉庫',
            OTHER: 'その他',
        };
        return labels[branchType] || branchType;
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

    if (!customer) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box>
                        <Typography variant="h6">カスタマーが見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/customers')}
                            sx={{ mt: 2 }}
                        >
                            カスタマー一覧に戻る
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
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <IconButton 
                                onClick={() => router.push('/customers')}
                                sx={{ mr: 1 }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="body2" color="text.secondary">
                                カスタマー管理
                            </Typography>
                        </Box>

                        {/* カスタマー情報ヘッダーカード */}
                        <Paper 
                            elevation={2}
                            sx={{ 
                                p: 3, 
                                background: gradients.primary,
                                color: 'white',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ display: 'flex', gap: 3, flex: 1 }}>
                                    <Avatar
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                            fontSize: '2rem',
                                        }}
                                    >
                                        {customer.company_name.charAt(0)}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5, display: 'block' }}>
                                            {customer.customer_code}
                                        </Typography>
                                        <Typography variant="h4" sx={{ mb: 1 }}>
                                            {customer.company_name}
                                        </Typography>
                                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                            {customer.website && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <LanguageIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                        <a 
                                                            href={customer.website} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{ color: 'white', textDecoration: 'none' }}
                                                        >
                                                            ウェブサイト
                                                        </a>
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <BusinessIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                    拠点 {customer.active_branches_count || 0}件
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <InventoryIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                    製品 {products.length}件
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Chip 
                                        label={customer.is_active ? '有効' : '無効'}
                                        size="small"
                                        color={customer.is_active ? 'success' : 'default'}
                                        sx={{ 
                                            bgcolor: customer.is_active ? theme.palette.success.main : theme.palette.grey[500],
                                            color: 'white',
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => router.push(`/customers/${customer.id}/edit`)}
                                        sx={{ 
                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
                                        }}
                                    >
                                        編集
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleDelete}
                                    >
                                        削除
                                    </Button>
                                </Stack>
                            </Box>
                        </Paper>
                    </Box>

                    {/* 詳細情報セクション */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        {/* 基本情報 */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                        基本情報
                                    </Typography>
                                    <Stack spacing={2}>
                                        {customer.notes && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                    備考
                                                </Typography>
                                                <Typography variant="body2">
                                                    {customer.notes}
                                                </Typography>
                                            </Box>
                                        )}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                作成日時
                                            </Typography>
                                            <Typography variant="body2">
                                                {new Date(customer.created_at).toLocaleString('ja-JP', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                                最終更新
                                            </Typography>
                                            <Typography variant="body2">
                                                {new Date(customer.updated_at).toLocaleString('ja-JP', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 統計情報 */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                        統計情報
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Card elevation={0} sx={{ bgcolor: 'background.default', p: 2, textAlign: 'center' }}>
                                                <Typography variant="h3" color="primary">
                                                    {customer.active_branches_count || 0}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    有効拠点数
                                                </Typography>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Card elevation={0} sx={{ bgcolor: 'background.default', p: 2, textAlign: 'center' }}>
                                                <Typography variant="h3" color="secondary">
                                                    {products.length}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    関連製品数
                                                </Typography>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* タブセクション */}
                    <Paper>
                        <Tabs 
                            value={tabValue} 
                            onChange={(_, newValue) => setTabValue(newValue)}
                            sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}
                        >
                            <Tab 
                                icon={<BusinessIcon />}
                                iconPosition="start"
                                label={`拠点 (${customer.branches?.length || 0})`}
                            />
                            <Tab 
                                icon={<InventoryIcon />}
                                iconPosition="start"
                                label={`製品 (${products.length})`}
                            />
                        </Tabs>

                        {/* 拠点一覧タブ */}
                        {tabValue === 0 && (
                            <Box sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6">
                                        拠点一覧
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => setBranchModalOpen(true)}
                                    >
                                        拠点追加
                                    </Button>
                                </Box>
                                
                                {customer.branches && customer.branches.length > 0 ? (
                                    <Grid container spacing={2}>
                                        {customer.branches.map((branch: CustomerBranch) => (
                                            <Grid item xs={12} md={6} key={branch.id}>
                                                <Card 
                                                    sx={{ 
                                                        p: 2.5,
                                                        cursor: 'pointer',
                                                        transition: theme.transitions.create(['transform', 'box-shadow']),
                                                        '&:hover': { 
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: 2,
                                                        }
                                                    }}
                                                    onClick={() => router.push(`/customers/branches/${branch.id}`)}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <Typography variant="h6">
                                                                    {branch.branch_name}
                                                                </Typography>
                                                                <Chip 
                                                                    label={getBranchTypeLabel(branch.branch_type)}
                                                                    color={getBranchTypeColor(branch.branch_type)}
                                                                    size="small"
                                                                />
                                                            </Box>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                                {branch.branch_code}
                                                            </Typography>
                                                        </Box>
                                                        <Chip 
                                                            label={branch.is_active ? '有効' : '無効'}
                                                            size="small"
                                                            color={branch.is_active ? 'success' : 'default'}
                                                        />
                                                    </Box>
                                                    {branch.address && (
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 1 }}>
                                                            <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                                                            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                                                {branch.address}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {branch.phone_number && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {branch.phone_number}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 8 }}>
                                        <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                        <Typography color="text.secondary" variant="h6" gutterBottom>
                                            拠点が登録されていません
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            最初の拠点を追加してください
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => setBranchModalOpen(true)}
                                        >
                                            拠点を追加
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* 関連製品一覧タブ */}
                        {tabValue === 1 && (
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ mb: 3 }}>
                                    関連製品一覧
                                </Typography>

                                {products.length > 0 ? (
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>製品品番</TableCell>
                                                    <TableCell>製品名</TableCell>
                                                    <TableCell>顧客拠点</TableCell>
                                                    <TableCell>説明</TableCell>
                                                    <TableCell align="center">ステータス</TableCell>
                                                    <TableCell align="center">部品数</TableCell>
                                                    <TableCell align="center">操作</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {products.map((product) => (
                                                    <TableRow key={product.id}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium" color="primary">
                                                                {product.product_number}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {product.product_name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {product.customer_branch_name || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {product.description ? 
                                                                    (product.description.length > 40 
                                                                        ? `${product.description.substring(0, 40)}...` 
                                                                        : product.description)
                                                                    : '-'
                                                                }
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={
                                                                    product.status === 'ACTIVE' ? '有効' :
                                                                    product.status === 'DISCONTINUED' ? '廃盤' :
                                                                    product.status === 'DEVELOPMENT' ? '開発中' : 
                                                                    product.status
                                                                }
                                                                color={getStatusColor(product.status)}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {product.parts_count || 0}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => router.push(`/products/${product.id}`)}
                                                            >
                                                                <VisibilityIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => router.push(`/products/${product.id}/edit`)}
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
                                    <Box sx={{ textAlign: 'center', py: 8 }}>
                                        <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                        <Typography color="text.secondary" variant="h6" gutterBottom>
                                            製品が登録されていません
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            このカスタマーに紐づく製品はありません
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Paper>

                    <CustomerBranchFormModal
                        open={branchModalOpen}
                        onClose={() => setBranchModalOpen(false)}
                        onSuccess={handleBranchCreated}
                        customerId={customer.id}
                    />
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}