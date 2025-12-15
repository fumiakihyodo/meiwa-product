'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    IconButton,
    Chip,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { ipRestrictionApi, userApi } from '@/services/api';
import { User } from '@/types';
import toast from 'react-hot-toast';

interface AllowedIP {
    id: number;
    ip_address: string;
    description: string;
    is_active: boolean;
    is_first_login_ip: boolean;
    created_at: string;
}

export default function IPRestrictionsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = parseInt(params.id as string);

    const [user, setUser] = useState<User | null>(null);
    const [allowedIPs, setAllowedIPs] = useState<AllowedIP[]>([]);
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedIP, setSelectedIP] = useState<AllowedIP | null>(null);
    const [newIPAddress, setNewIPAddress] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(false);

    useEffect(() => {
        fetchUser();
        fetchAllowedIPs();
        fetchIPRestrictionSettings();
    }, [userId]);

    const fetchUser = async () => {
        try {
            const data = await userApi.getUser(userId.toString());
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            toast.error('ユーザー情報の取得に失敗しました');
        }
    };

    const fetchAllowedIPs = async () => {
        setLoading(true);
        try {
            const data = await ipRestrictionApi.getAllowedIPs(userId);
            setAllowedIPs(data);
        } catch (error) {
            console.error('Failed to fetch allowed IPs:', error);
            toast.error('許可IPリストの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const fetchIPRestrictionSettings = async () => {
        try {
            const data = await ipRestrictionApi.getIPRestrictionSettings(userId);
            setIpRestrictionEnabled(data.ip_restriction_enabled);
        } catch (error) {
            console.error('Failed to fetch IP restriction settings:', error);
        }
    };

    const handleAddIP = async () => {
        if (!newIPAddress) {
            toast.error('IPアドレスを入力してください');
            return;
        }

        try {
            await ipRestrictionApi.addAllowedIP(newIPAddress, newDescription, userId);
            toast.success('IPアドレスを追加しました');
            setAddDialogOpen(false);
            setNewIPAddress('');
            setNewDescription('');
            fetchAllowedIPs();
        } catch (error) {
            console.error('Failed to add IP:', error);
            toast.error('IPアドレスの追加に失敗しました');
        }
    };

    const handleDeleteIP = async () => {
        if (!selectedIP) return;

        try {
            await ipRestrictionApi.deleteAllowedIP(selectedIP.id);
            toast.success('IPアドレスを削除しました');
            setDeleteDialogOpen(false);
            setSelectedIP(null);
            fetchAllowedIPs();
        } catch (error) {
            console.error('Failed to delete IP:', error);
            toast.error('IPアドレスの削除に失敗しました');
        }
    };

    const handleToggleIPActive = async (ip: AllowedIP) => {
        try {
            await ipRestrictionApi.updateAllowedIP(ip.id, {
                is_active: !ip.is_active,
            });
            toast.success('IPアドレスのステータスを更新しました');
            fetchAllowedIPs();
        } catch (error) {
            console.error('Failed to update IP:', error);
            toast.error('IPアドレスの更新に失敗しました');
        }
    };

    const handleToggleIPRestriction = async () => {
        try {
            await ipRestrictionApi.updateIPRestrictionSettings(userId, !ipRestrictionEnabled);
            setIpRestrictionEnabled(!ipRestrictionEnabled);
            toast.success('IP制限設定を更新しました');
        } catch (error) {
            console.error('Failed to update IP restriction settings:', error);
            toast.error('IP制限設定の更新に失敗しました');
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'ip_address',
            headerName: 'IPアドレス',
            width: 200,
        },
        {
            field: 'description',
            headerName: '説明',
            width: 250,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'is_first_login_ip',
            headerName: '初回ログインIP',
            width: 150,
            renderCell: (params: GridRenderCellParams) => (
                params.value ? (
                    <Chip label="初回ログイン" size="small" color="primary" />
                ) : null
            ),
        },
        {
            field: 'is_active',
            headerName: '有効',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Switch
                    checked={params.value as boolean}
                    onChange={() => handleToggleIPActive(params.row as AllowedIP)}
                    size="small"
                />
            ),
        },
        {
            field: 'created_at',
            headerName: '登録日時',
            width: 180,
            renderCell: (params) => new Date(params.value as string).toLocaleString('ja-JP'),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedIP(params.row as AllowedIP);
                        setDeleteDialogOpen(true);
                    }}
                />,
            ],
        },
    ];

    return (
        <AuthGuard requireAdmin>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {user?.userid} のIP制限管理
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ipRestrictionEnabled}
                                    onChange={handleToggleIPRestriction}
                                    color="warning"
                                />
                            }
                            label="IP制限を有効にする"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {ipRestrictionEnabled
                                ? 'このユーザーは登録されたIPアドレスからのみログイン可能です'
                                : 'このユーザーはどのIPアドレスからでもログイン可能です'}
                        </Typography>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">許可IPアドレス一覧</Typography>
                        <Box>
                            <IconButton onClick={fetchAllowedIPs} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setAddDialogOpen(true)}
                            >
                                IPアドレス追加
                            </Button>
                        </Box>
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={allowedIPs}
                            columns={columns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                            }}
                        />
                    </Paper>

                    {/* Add IP Dialog */}
                    <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                        <DialogTitle>IPアドレスの追加</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="IPアドレス"
                                type="text"
                                fullWidth
                                value={newIPAddress}
                                onChange={(e) => setNewIPAddress(e.target.value)}
                                placeholder="例: 192.168.1.100"
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                margin="dense"
                                label="説明"
                                type="text"
                                fullWidth
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="例: オフィスPC"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAddDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleAddIP} variant="contained">
                                追加
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Delete IP Dialog */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>IPアドレスの削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedIP?.ip_address} を削除してもよろしいですか？
                                この操作は取り消せません。
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDeleteIP} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
