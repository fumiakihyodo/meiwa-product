'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    Chip,
    IconButton,
    Switch,
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
} from '@mui/icons-material';
import { ErrorResponse, User } from '@/types';
import { userApi } from '@/services/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { EditUserDialog } from '@/components/EditUserDialog';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const data = await userApi.getCurrentUser();
            setCurrentUser(data);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
        }
    };

    const isCurrentUser = (user: User): boolean => {
        return currentUser !== null && currentUser.id === user.id;
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userApi.getUsers();
            setUsers(data);
        } catch (error) {
            if (axios.isAxiosError<ErrorResponse>(error)) {
                toast.error('ユーザー一覧の取得に失敗しました')
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;

        try {
            await userApi.deleteUser(selectedUser.id.toString());
            toast.success('ユーザーを削除しました');
            setDeleteDialogOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            if (axios.isAxiosError<ErrorResponse>(error)) {
                const message = error.response?.data?.detail || 'ユーザーの削除に失敗しました';
                toast.error(message);
            }
        }
    };

    const handleToggleStatus = async (user: User) => {
        try {
            await userApi.updateUser(user.id.toString(), {
                is_active: !user.is_active,
            });
            toast.success('ステータスを更新しました');
            fetchUsers();
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('ステータスの更新に失敗しました');
        }
    };

    const handleToggleAdmin = async (user: User) => {
        try {
            await userApi.updateUser(user.id.toString(), {
                is_admin: !user.is_admin,
            });
            toast.success('管理者権限を更新しました');
            fetchUsers();
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('管理者権限の更新に失敗しました');
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'userid',
            headerName: 'ユーザーID',
            width: 150,
        },
        {
            field: 'email',
            headerName: 'メールアドレス',
            width: 200,
        },
        {
            field: 'full_name',
            headerName: '氏名',
            width: 150,
            renderCell: (params) => params.row.full_name || '-',
        },
        {
            field: 'department',
            headerName: '部署',
            width: 130,
            renderCell: (params: GridRenderCellParams) => {
                const deptMap: Record<string, string> = {
                    SALES: '営業部',
                    ENGINEERING: '技術部',
                    MANUFACTURING: '製造部',
                    MANAGEMENT: '管理部',
                    '': '未所属',
                };
                return deptMap[params.value as string] || '未所属';
            },
        },
        {
            field: 'is_active',
            headerName: '有効',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Switch
                    checked={params.value as boolean}
                    onChange={() => handleToggleStatus(params.row as User)}
                    size="small"
                    disabled={isCurrentUser(params.row as User)}
                />
            ),
        },
        {
            field: 'is_admin',
            headerName: '管理者',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Switch
                    checked={params.value as boolean}
                    onChange={() => handleToggleAdmin(params.row as User)}
                    size="small"
                    color="secondary"
                    disabled={isCurrentUser(params.row as User)}
                />
            ),
        },
        {
            field: 'is_staff',
            headerName: 'スタッフ',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                params.value ? (
                    <Chip label="スタッフ" size="small" color="info" />
                ) : null
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 100,
            getActions: (params) => {
                const isSelf = isCurrentUser(params.row as User);
                return [
                    <GridActionsCellItem
                        key="edit"
                        icon={<EditIcon />}
                        label="編集"
                        onClick={() => {
                            setSelectedUser(params.row as User);
                            setEditDialogOpen(true);
                        }}
                        disabled={isSelf}
                    />,
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon />}
                        label="削除"
                        onClick={() => {
                            setSelectedUser(params.row as User);
                            setDeleteDialogOpen(true);
                        }}
                        disabled={isSelf}
                        showInMenu
                    />,
                ];
            },
        },
    ];

    return (
        <AuthGuard requireAdmin>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            ユーザー管理
                        </Typography>
                        <Box>
                            <IconButton onClick={fetchUsers} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                新規ユーザー
                            </Button>
                        </Box>
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={users}
                            columns={columns}
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            checkboxSelection
                            disableRowSelectionOnClick
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none',
                                },
                            }}
                        />
                    </Paper>

                    {/* Create User Dialog */}
                    <CreateUserDialog
                        open={createDialogOpen}
                        onClose={() => setCreateDialogOpen(false)}
                        onSuccess={() => {
                            setCreateDialogOpen(false);
                            fetchUsers();
                        }}
                    />

                    {/* Edit User Dialog */}
                    {selectedUser && (
                        <EditUserDialog
                            open={editDialogOpen}
                            user={selectedUser}
                            onClose={() => {
                                setEditDialogOpen(false);
                                setSelectedUser(null);
                            }}
                            onSuccess={() => {
                                setEditDialogOpen(false);
                                setSelectedUser(null);
                                fetchUsers();
                            }}
                        />
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>ユーザーの削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedUser?.userid} を削除してもよろしいですか？
                                この操作は取り消せません。
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>
                                キャンセル
                            </Button>
                            <Button onClick={handleDelete} color="error" autoFocus>
                                削除
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}