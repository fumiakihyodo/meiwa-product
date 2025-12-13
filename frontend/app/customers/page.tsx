// app/customers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
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
    GridRenderCellParams,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { Customer } from '@/types/customer';
import { customerApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await customerApi.getCustomers();
            setCustomers(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('カスタマー一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCustomer) return;

        try {
            await customerApi.deleteCustomer(selectedCustomer.id);
            toast.success('カスタマーを削除しました');
            setDeleteDialogOpen(false);
            setSelectedCustomer(null);
            fetchCustomers();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || 'カスタマーの削除に失敗しました';
                toast.error(message);
            }
        }
    };

    const handleSearch = async () => {
        if (!searchTerm) {
            fetchCustomers();
            return;
        }

        setLoading(true);
        try {
            const data = await customerApi.getCustomers({ search: searchTerm });
            setCustomers(data);
        } catch (error) {
            toast.error('検索に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'customer_code',
            headerName: 'カスタマーコード',
            width: 150,
        },
        {
            field: 'company_name',
            headerName: '企業名',
            width: 250,
        },
        {
            field: 'website',
            headerName: 'ウェブサイト',
            width: 200,
            renderCell: (params) => params.value ? (
                <a href={params.value} target="_blank" rel="noopener noreferrer">
                    {params.value}
                </a>
            ) : '-',
        },
        {
            field: 'active_branches_count',
            headerName: '有効拠点数',
            width: 120,
            type: 'number',
            renderCell: (params) => params.value || 0,
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? '有効' : '無効'}
                    color={params.value ? 'success' : 'default'}
                    size="small"
                />
            ),
        },
        {
            field: 'created_at',
            headerName: '作成日',
            width: 150,
            renderCell: (params) => new Date(params.value).toLocaleDateString('ja-JP'),
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
                    onClick={() => router.push(`/customers/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => router.push(`/customers/${params.row.id}/edit`)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedCustomer(params.row as Customer);
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
                            カスタマー管理
                        </Typography>
                        <Box>
                            <IconButton onClick={fetchCustomers} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => router.push('/customers/new')}
                            >
                                新規カスタマー
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="カスタマーコードまたは企業名で検索"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                            rows={customers}
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
                        <DialogTitle>カスタマーの削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedCustomer?.company_name} ({selectedCustomer?.customer_code}) を削除してもよろしいですか?
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