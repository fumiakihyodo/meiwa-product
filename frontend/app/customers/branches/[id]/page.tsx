// app/customers/branches/[id]/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
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
    IconButton,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ContactPhone as ContactPhoneIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { CustomerBranch, CustomerContact } from '@/types/customer';
import { customerBranchApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

export default function CustomerBranchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [branch, setBranch] = useState<CustomerBranch | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBranchDetail = useCallback(async () => {
        try {
            const data = await customerBranchApi.getBranch(Number(params.id));
            setBranch(data);
        } catch (error) {
            toast.error('カスタマー拠点情報の取得に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    React.useEffect(() => {
        if (params?.id) {
            fetchBranchDetail();
        }
    }, [params?.id, fetchBranchDetail]);

    const handleDelete = async () => {
        if (!branch) return;

        if (confirm('このカスタマー拠点を削除してもよろしいですか?')) {
            try {
                await customerBranchApi.deleteBranch(branch.id);
                toast.success('カスタマー拠点を削除しました');
                router.push('/customers/branches');
            } catch (error) {
                console.error(error);
                toast.error('削除に失敗しました');
            }
        }
    };

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

    if (!branch) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box>
                        <Typography variant="h6">カスタマー拠点が見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/customers/branches')}
                            sx={{ mt: 2 }}
                        >
                            カスタマー拠点一覧に戻る
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
                            <IconButton onClick={() => router.push('/customers/branches')}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h4" component="h1">
                                カスタマー拠点詳細
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => router.push(`/customers/branches/${branch.id}/edit`)}
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

                    <Grid container spacing={3}>
                        {/* 拠点基本情報 */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        基本情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点コード
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {branch.branch_code}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点名
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {branch.branch_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                カスタマー名
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.customer_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                拠点種別
                                            </Typography>
                                            <Typography variant="body1">
                                                {getBranchTypeLabel(branch.branch_type)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                ステータス
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={branch.is_active ? '有効' : '無効'}
                                                    color={branch.is_active ? 'success' : 'default'}
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                担当者数
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {branch.contacts_count || 0}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 連絡先情報 */}
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
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                代表電話番号
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.phone_number || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
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
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                備考
                                            </Typography>
                                            <Typography variant="body1">
                                                {branch.notes || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 担当者一覧 */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">
                                        <ContactPhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        担当者一覧 ({branch.contacts?.length || 0}件)
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => router.push(`/customers/contacts/new?branch=${branch.id}`)}
                                    >
                                        担当者追加
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />

                                {branch.contacts && branch.contacts.length > 0 ? (
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>担当者名</TableCell>
                                                    <TableCell>担当者名（カナ）</TableCell>
                                                    <TableCell>部署</TableCell>
                                                    <TableCell>役職</TableCell>
                                                    <TableCell>メールアドレス</TableCell>
                                                    <TableCell>電話番号</TableCell>
                                                    <TableCell align="center">操作</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {branch.contacts.map((contact: CustomerContact) => (
                                                    <TableRow key={contact.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {contact.name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{contact.name_kana || '-'}</TableCell>
                                                        <TableCell>{contact.department || '-'}</TableCell>
                                                        <TableCell>{contact.position || '-'}</TableCell>
                                                        <TableCell>
                                                            {contact.email ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <EmailIcon fontSize="small" color="action" />
                                                                    {contact.email}
                                                                </Box>
                                                            ) : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {contact.phone_number ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <PhoneIcon fontSize="small" color="action" />
                                                                    {contact.phone_number}
                                                                </Box>
                                                            ) : '-'}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => router.push(`/customers/contacts/${contact.id}`)}
                                                                title="詳細"
                                                            >
                                                                <ContactPhoneIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => router.push(`/customers/contacts/${contact.id}/edit`)}
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
                                            onClick={() => router.push(`/customers/contacts/new?branch=${branch.id}`)}
                                            sx={{ mt: 2 }}
                                        >
                                            最初の担当者を追加
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* タイムスタンプ */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                作成日時
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(branch.created_at).toLocaleString('ja-JP')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                更新日時
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(branch.updated_at).toLocaleString('ja-JP')}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}