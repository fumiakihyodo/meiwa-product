// app/products/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    IconButton,
    CircularProgress,
    Divider,
    Chip,
    Autocomplete,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormLabel,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    DataGrid,
    GridColDef,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import { Product, ProductStatus, ProductCreateData, ProductUpdateData} from '@/types/procuct';
import { Part } from '@/types/purchases';
import { Customer, CustomerBranch } from '@/types/customer';
import { productApi } from '@/services/apiProduct';
import { purchasesApi } from '@/services/apiPurchases';
import { customerApi } from '@/services/apiCustomer';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import { PartFormModal } from '@/components/PartModal/PartFormModal';

export default function ProductFormPage() {
    const params = useParams();
    const router = useRouter();
    const isEdit = params?.id && params.id !== 'new';
    const [loading, setLoading] = useState(isEdit);
    const [product, setProduct] = useState<Product | null>(null);
    const [parts, setParts] = useState<Part[]>([]);
    const [partsLoading, setPartsLoading] = useState(false);
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerBranches, setCustomerBranches] = useState<CustomerBranch[]>([]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
        watch,
        setValue,
    } = useForm<ProductCreateData | ProductUpdateData>({
        defaultValues: {
            product_number: '',
            product_name: '',
            description: '',
            status: ProductStatus.ACTIVE,
            customer: undefined,
            customer_branch: undefined,
        },
    });

    const watchCustomer = watch('customer');

    const fetchCustomers = useCallback(async () => {
        try {
            const data = await customerApi.getCustomers({ is_active: true });
            setCustomers(data);
        } catch (error) {
            console.error(error);
            toast.error('カスタマー一覧の取得に失敗しました');
        } finally {
            setCustomersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    useEffect(() => {
        if (watchCustomer) {
            const fetchCustomerDetail = async () => {
                try {
                    // stringをnumberに変換
                    const customerId = typeof watchCustomer === 'string' ? Number(watchCustomer) : watchCustomer;
                    const customer = await customerApi.getCustomer(customerId);
                    setSelectedCustomer(customer);
                    setCustomerBranches(customer.branches || []);
                } catch (error) {
                    console.error(error);
                    // stringをnumberに変換して比較
                    const customerId = typeof watchCustomer === 'string' ? Number(watchCustomer) : watchCustomer;
                    const cachedCustomer = customers.find(c => c.id === customerId);
                    setSelectedCustomer(cachedCustomer || null);
                    setCustomerBranches(cachedCustomer?.branches || []);
                }
            };
            fetchCustomerDetail();
        } else {
            setSelectedCustomer(null);
            setCustomerBranches([]);
            setValue('customer_branch', undefined);
        }
    }, [watchCustomer, customers, setValue]);

    const fetchParts = useCallback(async () => {
        if (!isEdit) return;
        setPartsLoading(true);
        try {
            const data = await purchasesApi.getParts({ product: Number(params.id) });
            setParts(data);
        } catch (error) {
            console.error(error);
            toast.error('部品一覧の取得に失敗しました');
        } finally {
            setPartsLoading(false);
        }
    }, [isEdit, params.id]);

    const fetchProduct = useCallback(async () => {
        try {
            const data = await productApi.getProduct(Number(params.id));
            setProduct(data);

            if (data.customer) {
                // stringをnumberに変換
                const customerId = typeof data.customer === 'string' ? Number(data.customer) : data.customer;
                const customerDetail = await customerApi.getCustomer(customerId);
                setSelectedCustomer(customerDetail);
                setCustomerBranches(customerDetail.branches || []);
            }

            reset({
                product_number: data.product_number,
                product_name: data.product_name,
                description: data.description || '',
                status: data.status,
                customer: data.customer || undefined,
                customer_branch: data.customer_branch || undefined,
            });

            if (data.parts) {
                setParts(data.parts);
            } else {
                fetchParts();
            }
        } catch (error) {
            console.error(error);
            toast.error('製品情報の取得に失敗しました');
            router.push('/products');
        } finally {
            setLoading(false);
        }
    }, [params.id, reset, fetchParts, router]);

    useEffect(() => {
        if (isEdit) {
            fetchProduct();
        }
    }, [isEdit, fetchProduct]);

    const onSubmit = async (data: ProductCreateData | ProductUpdateData) => {
        try {
            const submitData = {
                ...data,
                customer: data.customer || null,
                customer_branch: data.customer_branch || null,
            };

            if (isEdit && product) {
                await productApi.updateProduct(product.id, submitData as ProductUpdateData);
                toast.success('製品を更新しました');
                router.push(`/products/${product.id}`);
            } else {
                const newProduct = await productApi.createProduct(submitData as ProductCreateData);
                toast.success('製品を作成しました');
                router.push(`/products/${newProduct.id}`);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { detail?: string; product_number?: string[] } } };
                const message = axiosError.response?.data?.detail ||
                    axiosError.response?.data?.product_number?.[0] ||
                    (isEdit ? '製品の更新に失敗しました' : '製品の作成に失敗しました');
                toast.error(message);
            } else {
                toast.error(isEdit ? '製品の更新に失敗しました' : '製品の作成に失敗しました');
            }
        }
    };

    const handleAddPart = () => {
        setEditingPart(null);
        setPartModalOpen(true);
    };

    const handleEditPart = (part: Part) => {
        setEditingPart(part);
        setPartModalOpen(true);
    };

    const handleDeletePart = async (partId: number) => {
        if (!confirm('この部品を削除してもよろしいですか?')) return;
        try {
            await purchasesApi.deletePart(partId);
            toast.success('部品を削除しました');
            fetchParts();
        } catch (error) {
            console.error(error);
            toast.error('部品の削除に失敗しました');
        }
    };

    const handlePartModalSuccess = () => {
        fetchParts();
    };

    const partColumns: GridColDef[] = [
        {
            field: 'part_number',
            headerName: '部品品番',
            width: 150,
        },
        {
            field: 'part_name',
            headerName: '部品名',
            width: 200,
        },
        {
            field: 'supplier_name',
            headerName: '仕入先',
            width: 180,
        },
        {
            field: 'branch_name',
            headerName: '支店',
            width: 150,
        },
        {
            field: 'current_price',
            headerName: '現在価格',
            width: 120,
            type: 'number',
            renderCell: (params) => params.value ? `¥${Number(params.value).toLocaleString()}` : '-',
        },
        {
            field: 'is_active',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params) => (
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
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="編集"
                    onClick={() => handleEditPart(params.row as Part)}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="削除"
                    onClick={() => handleDeletePart(params.row.id)}
                />,
            ],
        },
    ];

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

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <IconButton onClick={() => router.push('/products')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {isEdit ? '製品編集' : '製品新規作成'}
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 4, mb: 4 }}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="製品品番 *"
                                        error={!!errors.product_number}
                                        helperText={errors.product_number?.message}
                                        {...register('product_number', {
                                            required: '製品品番は必須です',
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="製品名 *"
                                        error={!!errors.product_name}
                                        helperText={errors.product_name?.message}
                                        {...register('product_name', {
                                            required: '製品名は必須です',
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="説明"
                                        {...register('description')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="customer"
                                        control={control}
                                        render={({ field: { onChange, value } }) => (
                                            <Autocomplete
                                                options={customers}
                                                getOptionLabel={(option) =>
                                                    typeof option === 'number'
                                                        ? customers.find(c => c.id === option)?.company_name || ''
                                                        : option.company_name
                                                }
                                                loading={customersLoading}
                                                value={customers.find(c => c.id === Number(value)) || null}
                                                onChange={(_, newValue) => {
                                                    onChange(newValue ? newValue.id : undefined);
                                                }}
                                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="カスタマー"
                                                        placeholder="カスタマーを選択"
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <Box>
                                                            <Typography variant="body1">
                                                                {option.company_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.customer_code}
                                                            </Typography>
                                                        </Box>
                                                    </li>
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="customer_branch"
                                        control={control}
                                        render={({ field: { onChange, value } }) => (
                                            <Autocomplete
                                                options={customerBranches}
                                                getOptionLabel={(option) =>
                                                    typeof option === 'number'
                                                        ? customerBranches.find(b => b.id === option)?.branch_name || ''
                                                        : option.branch_name
                                                }
                                                disabled={!selectedCustomer || customerBranches.length === 0}
                                                value={customerBranches.find(b => b.id === value) || null}
                                                onChange={(_, newValue) => {
                                                    onChange(newValue ? newValue.id : undefined);
                                                }}
                                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="カスタマー拠点"
                                                        placeholder={
                                                            !selectedCustomer
                                                                ? "先にカスタマーを選択してください"
                                                                : customerBranches.length === 0
                                                                    ? "拠点が登録されていません"
                                                                    : "拠点を選択"
                                                        }
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <Box>
                                                            <Typography variant="body1">
                                                                {option.branch_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.branch_code}
                                                            </Typography>
                                                        </Box>
                                                    </li>
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">ステータス *</FormLabel>
                                        <Controller
                                            name="status"
                                            control={control}
                                            defaultValue={ProductStatus.ACTIVE}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel
                                                        value={ProductStatus.ACTIVE}
                                                        control={<Radio />}
                                                        label="有効"
                                                    />
                                                    <FormControlLabel
                                                        value={ProductStatus.DISCONTINUED}
                                                        control={<Radio />}
                                                        label="廃盤"
                                                    />
                                                    <FormControlLabel
                                                        value={ProductStatus.DEVELOPMENT}
                                                        control={<Radio />}
                                                        label="開発中"
                                                    />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push(isEdit && product ? `/products/${product.id}` : '/products')}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '保存中...' : '保存'}
                                </Button>
                            </Box>
                        </form>
                    </Paper>

                    {isEdit && product && (
                        <>
                            <Divider sx={{ my: 4 }} />
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h5">部品一覧</Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddPart}
                                    >
                                        部品追加
                                    </Button>
                                </Box>
                                <Paper>
                                    <DataGrid
                                        rows={parts}
                                        columns={partColumns}
                                        loading={partsLoading}
                                        pageSizeOptions={[10, 25, 50]}
                                        initialState={{
                                            pagination: {
                                                paginationModel: { pageSize: 10, page: 0 },
                                            },
                                        }}
                                        autoHeight
                                        disableRowSelectionOnClick
                                    />
                                </Paper>
                            </Box>
                        </>
                    )}

                    <PartFormModal
                        open={partModalOpen}
                        onClose={() => setPartModalOpen(false)}
                        onSuccess={handlePartModalSuccess}
                        productId={Number(params.id)}
                        editPart={editingPart}
                    />
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}