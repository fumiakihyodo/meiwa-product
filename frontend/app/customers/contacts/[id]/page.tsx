// app/customers/contacts/[id]/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Divider,
    IconButton,
    CircularProgress,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    PhoneIphone as PhoneIphoneIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { CustomerContact } from '@/types/customer';
import { customerContactApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

export default function CustomerContactDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [contact, setContact] = useState<CustomerContact | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchContactDetail = useCallback(async () => {
        try {
            const data = await customerContactApi.getContact(Number(params.id));
            setContact(data);
        } catch (error) {
            toast.error('カスタマー担当者情報の取得に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    React.useEffect(() => {
        if (params?.id) {
            fetchContactDetail();
        }
    }, [params?.id, fetchContactDetail]);

    const handleDelete = async () => {
        if (!contact) return;

        if (confirm('このカスタマー担当者を削除してもよろしいですか?')) {
            try {
                await customerContactApi.deleteContact(contact.id);
                toast.success('カスタマー担当者を削除しました');
                router.push('/customers/contacts');
            } catch (error) {
                console.error(error);
                toast.error('削除に失敗しました');
            }
        }
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

    if (!contact) {
        return (
            <AuthGuard>
                <Sidebar>
                    <Box>
                        <Typography variant="h6">カスタマー担当者が見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/customers/contacts')}
                            sx={{ mt: 2 }}
                        >
                            カスタマー担当者一覧に戻る
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
                            <IconButton onClick={() => router.push('/customers/contacts')}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h4" component="h1">
                                カスタマー担当者詳細
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => router.push(`/customers/contacts/${contact.id}/edit`)}
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
                        {/* 担当者基本情報 */}
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
                                                担当者名
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {contact.name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                担当者名（カナ）
                                            </Typography>
                                            <Typography variant="body1">
                                                {contact.name_kana || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                部署
                                            </Typography>
                                            <Typography variant="body1">
                                                {contact.department || '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                役職
                                            </Typography>
                                            <Typography variant="body1">
                                                {contact.position || '-'}
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
                                                メールアドレス
                                            </Typography>
                                            {contact.email ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <EmailIcon color="primary" />
                                                    <Typography variant="body1">
                                                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body1">-</Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                電話番号（直通）
                                            </Typography>
                                            {contact.phone_number ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <PhoneIcon color="primary" />
                                                    <Typography variant="body1">
                                                        <a href={`tel:${contact.phone_number}`}>{contact.phone_number}</a>
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body1">-</Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                携帯電話番号
                                            </Typography>
                                            {contact.mobile_number ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <PhoneIphoneIcon color="primary" />
                                                    <Typography variant="body1">
                                                        <a href={`tel:${contact.mobile_number}`}>{contact.mobile_number}</a>
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body1">-</Typography>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                内線番号
                                            </Typography>
                                            <Typography variant="body1">
                                                {contact.extension_number || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 所属情報 */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        所属情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                カスタマー名
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {contact.customer_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                所属拠点
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {contact.branch_name}
                                            </Typography>
                                            <Button
                                                size="small"
                                                onClick={() => router.push(`/customers/branches/${contact.branch}`)}
                                                sx={{ mt: 1 }}
                                            >
                                                拠点詳細を見る
                                            </Button>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                表示名
                                            </Typography>
                                            <Typography variant="body1">
                                                {contact.display_name_with_company || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
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
                                                {new Date(contact.created_at).toLocaleString('ja-JP')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                更新日時
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(contact.updated_at).toLocaleString('ja-JP')}
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