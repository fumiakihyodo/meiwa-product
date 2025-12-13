// app/contacts/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    MenuItem,
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
import { SupplierContact, ContactResponsibility } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import axios from 'axios';

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

export default function ContactsPage() {
    const [contacts, setContacts] = useState<SupplierContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<SupplierContact | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [responsibilityFilter, setResponsibilityFilter] = useState<string>('');
    const [isActiveFilter, setIsActiveFilter] = useState<string>('');
    const [isPrimaryFilter, setIsPrimaryFilter] = useState<string>('');
    const router = useRouter();

    interface ContactSearchParams {
        search?: string;
        responsibility?: string;
        is_active?: string;
        is_primary?: string;
    }

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const params: ContactSearchParams = {};
            if (searchText) params.search = searchText;
            if (responsibilityFilter) params.responsibility = responsibilityFilter;
            if (isActiveFilter !== '') params.is_active = isActiveFilter;
            if (isPrimaryFilter !== '') params.is_primary = isPrimaryFilter;

            const data = await supplierApi.getSupplierContacts(params);
            setContacts(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('担当者一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [searchText, responsibilityFilter, isActiveFilter, isPrimaryFilter]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const handleDelete = async () => {
        if (!selectedContact) return;

        try {
            await supplierApi.deleteSupplierContact(selectedContact.id);
            toast.success('担当者を削除しました');
            setDeleteDialogOpen(false);
            setSelectedContact(null);
            fetchContacts();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || '担当者の削除に失敗しました';
                toast.error(message);
            }
        }
    };

    const handleSearch = () => {
        fetchContacts();
    };

    const handleResetFilters = () => {
        setSearchText('');
        setResponsibilityFilter('');
        setIsActiveFilter('');
        setIsPrimaryFilter('');
        fetchContacts();
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: '氏名',
            width: 150,
            renderCell: (params: GridRenderCellParams<SupplierContact>) => (
                <Box>
                    <Typography variant="body2" fontWeight="medium">
                        {params.row.name}
                    </Typography>
                    {params.row.name_kana && (
                        <Typography variant="caption" color="text.secondary">
                            {params.row.name_kana}
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            field: 'supplier_name',
            headerName: 'サプライヤー',
            width: 180,
            valueGetter: (value, row) => row.supplier_name || '-',
        },
        {
            field: 'branch_name',
            headerName: '拠点',
            width: 150,
            valueGetter: (value, row) => row.branch_name || '-',
        },
        {
            field: 'department',
            headerName: '部署',
            width: 120,
            valueGetter: (value, row) => row.department || '-',
        },
        {
            field: 'position',
            headerName: '役職',
            width: 120,
            valueGetter: (value, row) => row.position || '-',
        },
        {
            field: 'responsibility',
            headerName: '主担当業務',
            width: 120,
            renderCell: (params: GridRenderCellParams<SupplierContact>) => (
                <Chip
                    label={RESPONSIBILITY_LABELS[params.row.responsibility]}
                    size="small"
                />
            ),
        },
        {
            field: 'email',
            headerName: 'メール',
            width: 180,
            valueGetter: (value, row) => row.email || '-',
        },
        {
            field: 'phone_number',
            headerName: '電話番号',
            width: 130,
            valueGetter: (value, row) => row.phone_number || '-',
        },
        {
            field: 'is_primary',
            headerName: '主担当',
            width: 80,
            renderCell: (params: GridRenderCellParams<SupplierContact>) => (
                params.row.is_primary ? <Chip label="主" color="primary" size="small" /> : '-'
            ),
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams<SupplierContact>) => (
                <Chip
                    label={params.row.is_active ? '有効' : '無効'}
                    color={params.row.is_active ? 'success' : 'default'}
                    size="small"
                />
            ),
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
                    onClick={() => router.push(`/contacts/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => router.push(`/contacts/${params.row.id}/edit`)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedContact(params.row as SupplierContact);
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
                            担当者管理
                        </Typography>
                        <Box>
                            <IconButton onClick={fetchContacts} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => router.push('/contacts/new')}
                            >
                                新規担当者
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            placeholder="氏名、部署、メールで検索"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                            sx={{ width: 250 }}
                        />
                        <TextField
                            select
                            size="small"
                            label="主担当業務"
                            value={responsibilityFilter}
                            onChange={(e) => setResponsibilityFilter(e.target.value)}
                            sx={{ width: 150 }}
                        >
                            <MenuItem value="">すべて</MenuItem>
                            {Object.entries(RESPONSIBILITY_LABELS).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="主担当"
                            value={isPrimaryFilter}
                            onChange={(e) => setIsPrimaryFilter(e.target.value)}
                            sx={{ width: 120 }}
                        >
                            <MenuItem value="">すべて</MenuItem>
                            <MenuItem value="true">主担当のみ</MenuItem>
                            <MenuItem value="false">副担当のみ</MenuItem>
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="ステータス"
                            value={isActiveFilter}
                            onChange={(e) => setIsActiveFilter(e.target.value)}
                            sx={{ width: 120 }}
                        >
                            <MenuItem value="">すべて</MenuItem>
                            <MenuItem value="true">有効</MenuItem>
                            <MenuItem value="false">無効</MenuItem>
                        </TextField>
                        <Button
                            variant="outlined"
                            startIcon={<SearchIcon />}
                            onClick={handleSearch}
                        >
                            検索
                        </Button>
                        <Button
                            variant="text"
                            onClick={handleResetFilters}
                        >
                            フィルタをクリア
                        </Button>
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
                            getRowHeight={() => 'auto'}
                            sx={{
                                '& .MuiDataGrid-cell': {
                                    py: 1,
                                },
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
                        <DialogTitle>担当者の削除</DialogTitle>
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