// app/contacts/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
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
    PhoneAndroid as PhoneAndroidIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { SupplierContact, ContactResponsibility } from '@/types/business';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

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

export default function ContactDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [contact, setContact] = useState<SupplierContact | null>(null);
    const [loading, setLoading] = useState(true);



    const fetchContactDetail = useCallback(async () => {
        try {
            const data = await supplierApi.getSupplierContact(Number(params.id));
            setContact(data);
        } catch (error) {
            toast.error('担当者情報の取得に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchContactDetail();
    }, [fetchContactDetail]);

    const handleDelete = async () => {
        if (!contact) return;

        if (confirm('この担当者を削除してもよろしいですか?')) {
            try {
                await supplierApi.deleteSupplierContact(contact.id);
                toast.success('担当者を削除しました');
                router.push('/contacts');
            } catch (error) {
                console.error(error)
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
                        <Typography variant="h6">担当者が見つかりません</Typography>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/contacts')}
                            sx={{ mt: 2 }}
                        >
                            担当者一覧に戻る
                        </Button>
                    </Box>
                </Sidebar>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => router.push('/contacts')}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h4" component="h1">
                                担当者詳細
                            </Typography>
                        </Box>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => router.push(`/contacts/${contact.id}/edit`)}
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
                    <Grid container spacing={3}>
                        {/* 担当者情報 */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        担当者情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                氏名
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {contact.name}
                                            </Typography>
                                        </Grid>
                                        {contact.name_kana && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary">
                                                    氏名（カナ）
                                                </Typography>
                                                <Typography variant="body1">
                                                    {contact.name_kana}
                                                </Typography>
                                            </Grid>
                                        )}
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                所属サプライヤー
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                <BusinessIcon color="primary" />
                                                <Typography variant="body1" fontWeight="bold">
                                                    {contact.supplier_name}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                所属拠点
                                            </Typography>
                                            <Typography variant="body1" fontWeight="medium">
                                                {contact.branch_name}
                                            </Typography>
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
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                主担当
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                {contact.is_primary ? (
                                                    <Chip label="主担当" color="primary" size="small" />
                                                ) : (
                                                    <Chip label="副担当" color="default" size="small" />
                                                )}
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                ステータス
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={contact.is_active ? '有効' : '無効'}
                                                    color={contact.is_active ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </Box>
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
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EmailIcon color="action" />
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        メールアドレス
                                                    </Typography>
                                                    {contact.email ? (
                                                        <Typography variant="body1">
                                                            <a
                                                                href={`mailto:${contact.email}`}
                                                                style={{ color: '#1976d2', textDecoration: 'none' }}
                                                            >
                                                                {contact.email}
                                                            </a>
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body1">-</Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PhoneIcon color="action" />
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        電話番号（直通）
                                                    </Typography>
                                                    {contact.phone_number ? (
                                                        <Typography variant="body1">
                                                            <a
                                                                href={`tel:${contact.phone_number}`}
                                                                style={{ color: '#1976d2', textDecoration: 'none' }}
                                                            >
                                                                {contact.phone_number}
                                                            </a>
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body1">-</Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Grid>
                                        {contact.extension_number && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary">
                                                    内線番号
                                                </Typography>
                                                <Typography variant="body1">
                                                    内線: {contact.extension_number}
                                                </Typography>
                                            </Grid>
                                        )}
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PhoneAndroidIcon color="action" />
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        携帯電話番号
                                                    </Typography>
                                                    {contact.mobile_number ? (
                                                        <Typography variant="body1">
                                                            <a
                                                                href={`tel:${contact.mobile_number}`}
                                                                style={{ color: '#1976d2', textDecoration: 'none' }}
                                                            >
                                                                {contact.mobile_number}
                                                            </a>
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body1">-</Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 担当業務情報 */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        担当業務情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                主担当業務
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={RESPONSIBILITY_LABELS[contact.responsibility]}
                                                    color="primary"
                                                    size="medium"
                                                />
                                            </Box>
                                        </Grid>
                                        {contact.responsibility_detail && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="text.secondary">
                                                    担当業務詳細
                                                </Typography>
                                                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {contact.responsibility_detail}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 備考 */}
                        {contact.notes && (
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            備考
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                                            {contact.notes}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* 作成・更新情報 */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        システム情報
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
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