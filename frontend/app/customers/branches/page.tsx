// app/customers/branches/page.tsx
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
    FormControl,
    InputLabel,
    Select,
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
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { CustomerBranch, BranchType } from '@/types/customer';
import { customerBranchApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function CustomerBranchesPage() {
    const [branches, setBranches] = useState<CustomerBranch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<CustomerBranch | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [branchTypeFilter, setBranchTypeFilter] = useState<string>('');
    const [isActiveFilter, setIsActiveFilter] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const data = await customerBranchApi.getBranches();
            setBranches(data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error('カスタマー拠点一覧の取得に失敗しました');
            }
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBranch) return;

        try {
            await customerBranchApi.deleteBranch(selectedBranch.id);
            toast.success('カスタマー拠点を削除しました');
            setDeleteDialogOpen(false);
            setSelectedBranch(null);
            fetchBranches();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error || 'カスタマー拠点の削除に失敗しました';
                toast.error(message);
            }
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | boolean> = {};
            if (searchTerm) params.search = searchTerm;
            if (branchTypeFilter) params.branch_type = branchTypeFilter;
            if (isActiveFilter) params.is_active = isActiveFilter === 'true';

            const data = await customerBranchApi.getBranches(params);
            setBranches(data);
        } catch (error) {
            toast.error('検索に失敗しました');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setBranchTypeFilter('');
        setIsActiveFilter('');
        fetchBranches();
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

    const columns: GridColDef[] = [
        {
            field: 'branch_code',
            headerName: '拠点コード',
            width: 120,
        },
        {
            field: 'customer_name',
            headerName: 'カスタマー名',
            width: 200,
        },
        {
            field: 'branch_name',
            headerName: '拠点名',
            width: 180,
        },
        {
            field: 'branch_type',
            headerName: '拠点種別',
            width: 120,
            renderCell: (params) => getBranchTypeLabel(params.value),
        },
        {
            field: 'address',
            headerName: '住所',
            width: 250,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'phone_number',
            headerName: '電話番号',
            width: 150,
            renderCell: (params) => params.value || '-',
        },
        {
            field: 'contacts_count',
            headerName: '担当者数',
            width: 100,
            type: 'number',
            renderCell: (params) => params.value || 0,
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? '有効' : '無効'}
                    color={params.value ? 'success' : 'default'}
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
                    onClick={() => router.push(`/customers/branches/${params.row.id}`)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => router.push(`/customers/branches/${params.row.id}/edit`)}
                    showInMenu
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => {
                        setSelectedBranch(params.row as CustomerBranch);
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
                            カスタマー拠点管理
                        </Typography>
                        <Box>
                            <IconButton onClick={fetchBranches} sx={{ mr: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => router.push('/customers/branches/new')}
                            >
                                新規拠点
                            </Button>
                        </Box>
                    </Box>

                    {/* フィルター */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <TextField
                                placeholder="拠点コード、拠点名、カスタマー名で検索"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                sx={{ flexGrow: 1, minWidth: 300 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel>拠点種別</InputLabel>
                                <Select
                                    value={branchTypeFilter}
                                    onChange={(e) => setBranchTypeFilter(e.target.value)}
                                    label="拠点種別"
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    <MenuItem value={BranchType.HEAD_OFFICE}>本社</MenuItem>
                                    <MenuItem value={BranchType.BRANCH}>支店</MenuItem>
                                    <MenuItem value={BranchType.SALES_OFFICE}>営業所</MenuItem>
                                    <MenuItem value={BranchType.FACTORY}>工場</MenuItem>
                                    <MenuItem value={BranchType.WAREHOUSE}>倉庫</MenuItem>
                                    <MenuItem value={BranchType.OTHER}>その他</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel>ステータス</InputLabel>
                                <Select
                                    value={isActiveFilter}
                                    onChange={(e) => setIsActiveFilter(e.target.value)}
                                    label="ステータス"
                                >
                                    <MenuItem value="">すべて</MenuItem>
                                    <MenuItem value="true">有効</MenuItem>
                                    <MenuItem value="false">無効</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                startIcon={<FilterListIcon />}
                                onClick={handleSearch}
                            >
                                検索
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleClearFilters}
                            >
                                クリア
                            </Button>
                        </Box>
                    </Paper>

                    <Paper sx={{ width: '100%' }}>
                        <DataGrid
                            rows={branches}
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
                        <DialogTitle>カスタマー拠点の削除</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedBranch?.display_name} を削除してもよろしいですか?
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