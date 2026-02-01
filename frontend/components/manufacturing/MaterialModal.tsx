// components/manufacturing/MaterialModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Box,
    Typography,
    Grid,
    CircularProgress,
    Chip,
    Paper,
    Stack,
} from '@mui/material';
import {
    History as HistoryIcon,
    Edit as EditIcon,
    Inventory as InventoryIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import {
    materialApi,
    Material,
    MaterialCreate,
} from '@/services/apiManufacturing';
import { supplierApi } from '@/services/apiSupplier';
import { SupplierBranch } from '@/types/supplier';
import { MaterialPriceListModal } from './MaterialPriceListModal';
import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';
import toast from 'react-hot-toast';

interface MaterialModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'create' | 'edit' | 'view';
    material: Material | null;
}

const categoryOptions = [
    { value: 'raw', label: '原材料' },
    { value: 'semi_finished', label: '半製品' },
    { value: 'component', label: '部品' },
    { value: 'consumable', label: '消耗品' },
    { value: 'other', label: 'その他' },
];

export default function MaterialModal({
    open,
    onClose,
    onSuccess,
    mode,
    material,
}: MaterialModalProps) {
    const [formData, setFormData] = useState<MaterialCreate>({
        material_code: '',
        material_name: '',
        material_type: '',
        category: 'raw',
        specification: '',
        unit: '個',
        stock_quantity: 0,
        minimum_stock: 0,
        maximum_stock: undefined,
        supplier_branch: undefined,
        unit_price: undefined,
        lead_time_days: undefined,
        is_active: true,
        notes: '',
    });
    const [supplierBranches, setSupplierBranches] = useState<SupplierBranch[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [priceListOpen, setPriceListOpen] = useState(false);

    // 仕入先支店を取得
    const fetchSupplierBranches = useCallback(async () => {
        try {
            const branches = await supplierApi.getSupplierBranches();
            setSupplierBranches(branches);
        } catch (error) {
            console.error('仕入先支店の取得に失敗:', error);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchSupplierBranches();
        }
    }, [open, fetchSupplierBranches]);

    // フォームデータを初期化
    useEffect(() => {
        if (material && (mode === 'edit' || mode === 'view')) {
            setFormData({
                material_code: material.material_code,
                material_name: material.material_name,
                material_type: material.material_type || '',
                category: material.category,
                specification: material.specification || '',
                unit: material.unit,
                stock_quantity: material.stock_quantity,
                minimum_stock: material.minimum_stock,
                maximum_stock: material.maximum_stock,
                supplier_branch: material.supplier_branch,
                unit_price: material.unit_price,
                lead_time_days: material.lead_time_days,
                is_active: material.is_active,
                notes: material.notes || '',
            });
        } else {
            setFormData({
                material_code: '',
                material_name: '',
                material_type: '',
                category: 'raw',
                specification: '',
                unit: '個',
                stock_quantity: 0,
                minimum_stock: 0,
                maximum_stock: undefined,
                supplier_branch: undefined,
                unit_price: undefined,
                lead_time_days: undefined,
                is_active: true,
                notes: '',
            });
        }
        setErrors({});
    }, [material, mode, open]);

    // 価格履歴モーダルを開く
    const handleOpenPriceList = () => {
        setPriceListOpen(true);
    };

    // 価格履歴モーダルを閉じる
    const handleClosePriceList = () => {
        setPriceListOpen(false);
    };

    const handleChange = (field: keyof MaterialCreate, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.material_code.trim()) {
            newErrors.material_code = '品番は必須です';
        }
        if (!formData.material_name.trim()) {
            newErrors.material_name = '材料名は必須です';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const submitData = {
                ...formData,
                supplier_branch: formData.supplier_branch || undefined,
                maximum_stock: formData.maximum_stock || undefined,
                unit_price: formData.unit_price || undefined,
                lead_time_days: formData.lead_time_days || undefined,
            };

            if (mode === 'create') {
                await materialApi.createMaterial(submitData);
                toast.success('材料を登録しました');
            } else if (mode === 'edit' && material) {
                await materialApi.updateMaterial(material.id, submitData);
                toast.success('材料を更新しました');
            }
            onSuccess();
        } catch (error: unknown) {
            console.error('保存エラー:', error);
            interface ApiError {
                response?: {
                    data?: Record<string, string[]>;
                };
            }
            const apiError = error as ApiError;
            if (apiError.response?.data) {
                const serverErrors: Record<string, string> = {};
                Object.entries(apiError.response.data).forEach(([key, value]) => {
                    serverErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
                });
                setErrors(serverErrors);
            }
            toast.error(mode === 'create' ? '材料の登録に失敗しました' : '材料の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const isViewMode = mode === 'view';
    const title = mode === 'create' ? '新規材料登録' : mode === 'edit' ? '材料編集' : '材料詳細';

    // カテゴリー表示名を取得
    const getCategoryLabel = (value: string) => {
        const option = categoryOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    };

    // 仕入先支店表示名を取得
    const getSupplierBranchName = (id: number | undefined) => {
        if (!id) return '-';
        const branch = supplierBranches.find(b => b.id === id);
        return branch ? `${branch.supplier_name} - ${branch.branch_name}` : '-';
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                            {title}
                        </Typography>
                        {material && (
                            <Chip
                                label={material.is_active ? '有効' : '無効'}
                                color={material.is_active ? 'success' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>
                    {isViewMode && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => {
                                // 編集モードに切り替え（親コンポーネントで処理）
                                onClose();
                                // 注: 実際の編集モード切り替えは親コンポーネントで行う必要があります
                            }}
                            size="small"
                        >
                            編集
                        </Button>
                    )}
                </DialogTitle>

                <DialogContent sx={{ pt: 3 }}>
                    {isViewMode && material ? (
                        // ビューモード: InfoRowとSectionCardを使用
                        <Box>
                            {/* 基本情報 */}
                            <SectionCard isEditMode={false} icon={<InfoIcon />} title="基本情報">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="品番"
                                            value={material.material_code}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="材料名"
                                            value={material.material_name}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="形式"
                                            value={material.material_type || '-'}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="カテゴリ"
                                            value={getCategoryLabel(material.category)}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="仕様"
                                            value={material.specification || '-'}
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* 在庫情報 */}
                            <SectionCard isEditMode={false} icon={<InventoryIcon />} title="在庫情報">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="単位"
                                            value={material.unit}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="在庫数量"
                                            value={`${material.stock_quantity.toLocaleString()} ${material.unit}`}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="在庫状態"
                                            value={
                                                <Chip
                                                    label={material.is_low_stock ? '要補充' : '正常'}
                                                    color={material.is_low_stock ? 'error' : 'success'}
                                                    size="small"
                                                />
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="最小在庫数"
                                            value={`${material.minimum_stock.toLocaleString()} ${material.unit}`}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="最大在庫数"
                                            value={material.maximum_stock ? `${material.maximum_stock.toLocaleString()} ${material.unit}` : '未設定'}
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* 仕入先・価格情報 */}
                            <SectionCard isEditMode={false} icon={<InfoIcon />} title="仕入先・価格情報">
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="仕入先支店"
                                            value={getSupplierBranchName(material.supplier_branch)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="単価"
                                            value={material.unit_price ? `¥${Number(material.unit_price).toLocaleString()}` : '-'}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="リードタイム"
                                            value={material.lead_time_days ? `${material.lead_time_days}日` : '-'}
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* その他 */}
                            <SectionCard isEditMode={false} icon={<InfoIcon />} title="その他">
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <InfoRow
                                            isEditMode={false}
                                            label="備考"
                                            value={material.notes || '-'}
                                        />
                                    </Grid>
                                </Grid>
                            </SectionCard>

                            {/* システム情報 */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'grey.50',
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                    システム情報
                                </Typography>
                                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary">作成日時</Typography>
                                        <Typography variant="body2">
                                            {new Date(material.created_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary">更新日時</Typography>
                                        <Typography variant="body2">
                                            {new Date(material.updated_at).toLocaleString('ja-JP')}
                                        </Typography>
                                    </Grid>
                                    {material.created_by_name && (
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary">作成者</Typography>
                                            <Typography variant="body2">{material.created_by_name}</Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>
                        </Box>
                    ) : (
                        // 編集/作成モード: TextFieldを使用
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="品番"
                                    value={formData.material_code}
                                    onChange={(e) => handleChange('material_code', e.target.value)}
                                    fullWidth
                                    required
                                    disabled={mode === 'edit'}
                                    error={!!errors.material_code}
                                    helperText={errors.material_code}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="材料名"
                                    value={formData.material_name}
                                    onChange={(e) => handleChange('material_name', e.target.value)}
                                    fullWidth
                                    required
                                    error={!!errors.material_name}
                                    helperText={errors.material_name}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="形式"
                                    value={formData.material_type}
                                    onChange={(e) => handleChange('material_type', e.target.value)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>カテゴリ</InputLabel>
                                    <Select
                                        value={formData.category}
                                        onChange={(e) => handleChange('category', e.target.value)}
                                        label="カテゴリ"
                                    >
                                        {categoryOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="単位"
                                    value={formData.unit}
                                    onChange={(e) => handleChange('unit', e.target.value)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="在庫数量"
                                    type="number"
                                    value={formData.stock_quantity}
                                    onChange={(e) => handleChange('stock_quantity', Number(e.target.value))}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="最小在庫数"
                                    type="number"
                                    value={formData.minimum_stock}
                                    onChange={(e) => handleChange('minimum_stock', Number(e.target.value))}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                    helperText="在庫警告のしきい値"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="最大在庫数"
                                    type="number"
                                    value={formData.maximum_stock ?? ''}
                                    onChange={(e) => handleChange('maximum_stock', e.target.value ? Number(e.target.value) : undefined)}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="単価"
                                    type="number"
                                    value={formData.unit_price ?? ''}
                                    onChange={(e) => handleChange('unit_price', e.target.value ? Number(e.target.value) : undefined)}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="リードタイム（日）"
                                    type="number"
                                    value={formData.lead_time_days ?? ''}
                                    onChange={(e) => handleChange('lead_time_days', e.target.value ? Number(e.target.value) : undefined)}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>仕入先支店</InputLabel>
                                    <Select
                                        value={formData.supplier_branch || ''}
                                        onChange={(e) => handleChange('supplier_branch', e.target.value || undefined)}
                                        label="仕入先支店"
                                    >
                                        <MenuItem value="">選択なし</MenuItem>
                                        {supplierBranches.map((branch) => (
                                            <MenuItem key={branch.id} value={branch.id}>
                                                {branch.supplier_name} - {branch.branch_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.is_active}
                                            onChange={(e) => handleChange('is_active', e.target.checked)}
                                        />
                                    }
                                    label="有効"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="仕様"
                                    value={formData.specification}
                                    onChange={(e) => handleChange('specification', e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="備考"
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>

                <DialogActions>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Box>
                            {material && (
                                <Button
                                    startIcon={<HistoryIcon />}
                                    onClick={handleOpenPriceList}
                                >
                                    価格履歴
                                </Button>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button onClick={onClose}>閉じる</Button>
                            {!isViewMode && (
                                <Button
                                    onClick={handleSubmit}
                                    variant="contained"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={16} /> : null}
                                >
                                    {mode === 'create' ? '登録' : '更新'}
                                </Button>
                            )}
                        </Box>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* 価格履歴モーダル */}
            {material && (
                <MaterialPriceListModal
                    open={priceListOpen}
                    onClose={handleClosePriceList}
                    material={material}
                    onSuccess={onSuccess}
                />
            )}
        </>
    );
}
