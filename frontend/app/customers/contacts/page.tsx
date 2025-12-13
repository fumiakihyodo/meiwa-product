// app/customers/contacts/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { CustomerContact } from '@/types/customer';
import { customerContactApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function CustomerContactsPage() {
    const [contacts, setContacts] = useState<CustomerContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const data = await customerContactApi.getContacts();
            setContacts(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('カスタマー担当者一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedContact) return;

        try {
            await customerContactApi.deleteContact(selectedContact.id);
            toast.success('カスタマー担当者を削除しました');
            setDeleteDialogOpen(false);
            setSelectedContact(null);
            fetchContacts();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || 'カスタマー担当者の削除に失敗しました';
                toast.error(message);
            }
        }
    };

    const handleSearch = async () => {
        if (!searchTerm) {
            fetchContacts();
            return;
        }

        setLoading(true);
        try {
            const data = await customerContactApi.getContacts({ search: searchTerm });
            setContacts(data);
        } catch (error) {
            toast.error('検索に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: '担当者名',
            width: 150,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'name_kana',
            headerName: '担当者名（カナ）',
            width: 150,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'customer_name',
            headerName: 'カスタマー名',
            width: 200,
        },
        {
            field: 'branch_name',
            headerName: '拠点名',
            width: 150,
        },
        {
            field: 'department',
            headerName: '部署',
            width: 120,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'position',
            headerName: '役職',
            width: 120,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'email',
            headerName: 'メールアドレス',
            width: 200,
            renderCell: (params) => params.value ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmailIcon fontSize="small" color="action" />
                    {params.value}
                </Box>
            ) : '-',
        },
        {
            field: 'phone_number',
            headerName: '電話番号',
            width: 150,
            renderCell: (params) => params.value ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    {params.value}
                </Box>
            ) : '-',
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: '操作',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view"
                    icon={<VisibilityIcon />}
                    label="詳細"
                    onClick={() => router.push(`/customers/contacts/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => router.push(`/customers/contacts/${params.row.id}/edit`)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedContact(params.row as CustomerContact);
                        setDeleteDialogOpen(true);
                    }}
                    showInMenu
                />,
            ],
        },
    ];

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            カスタマー担当者管理
                        </Typography>
                        <Box>
                            <IconButton onClick={fetchContacts} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => router.push('/customers/contacts/new')}
                            >
                                新規担当者
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="担当者名、カスタマー名、メールアドレスで検索"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <Button onClick={handleSearch}>検索</Button>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={contacts}
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

                    {/* Delete Confirmation Dialog */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>カスタマー担当者の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedContact?.name} を削除してもよろしいですか?
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