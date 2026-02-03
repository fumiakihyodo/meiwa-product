// components/manufacturing/ManufacturingItemModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
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
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Autocomplete,
    Checkbox,
    FormGroup,
    FormLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    History as HistoryIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Widgets as WidgetsIcon,
    BusinessCenter as BusinessIcon,
    Info as InfoIcon,
    Inventory as InventoryIcon,
    Build as BuildIcon,
} from '@mui/icons-material';
import {
    manufacturingItemApi,
    manufacturingMaterialApi,
    ManufacturingItem,
    ManufacturingItemCreate,
    Material,
    ManufacturingMaterial,
    ProductionType,
} from '@/services/apiManufacturing';
import { Product } from '@/types/product';
import { SupplierBranch, CurrencyLabels } from '@/types/supplier';
import { supplierApi } from '@/services/apiSupplier';
import { ManufacturingItemPriceListModal } from './ManufacturingItemPriceListModal';
import { InfoRow } from '@/components/common/display/InfoRow';
import { SectionCard } from '@/components/common/display/SectionCard';
import toast from 'react-hot-toast';

// 材料紐付けの型定義
interface MaterialRequirement {
    id?: number;
    material: number | null;
    material_code?: string;
    material_name?: string;
    material_unit?: string;
    quantity_required: number | string;
    notes?: string;
}

// フォームデータの型定義
interface FormData {
    manufacturing_number: string;
    manufacturing_name: string;
    production_type: ProductionType;
    product?: number;
    specification: string;
    unit: string;
    standard_production_time?: number;
    purchase_price?: number;
    is_active: boolean;
    domestic_stock: number;
    overseas_stock: number;
    text_notes: string;
    overseas_supplier_branch?: number;
}

// モーダルのProps型定義
interface ManufacturingItemModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'create' | 'edit' | 'view';
    item: ManufacturingItem | null;
    products: Product[];
    materials: Material[];
}

// 製造拠点のオプション
const PRODUCTION_TYPE_OPTIONS = [
    { value: 'domestic' as ProductionType, label: '国内生産' },
    { value: 'overseas' as ProductionType, label: '海外生産' },
    { value: 'both' as ProductionType, label: '国内・海外両方' },
];

export default function ManufacturingItemModal({
    open,
    onClose,
    onSuccess,
    mode,
    item,
    products,
    materials,
}: ManufacturingItemModalProps) {
    // フォームデータの初期値
    const getInitialFormData = useCallback((): FormData => ({
        manufacturing_number: '',
        manufacturing_name: '',
        production_type: 'domestic',
        product: undefined,
        specification: '',
        unit: '個',
        standard_production_time: undefined,
        purchase_price: undefined,
        is_active: true,
        domestic_stock: 0,
        overseas_stock: 0,
        text_notes: '',
        overseas_supplier_branch: undefined,
    }), []);

    const [formData, setFormData] = useState<FormData>(getInitialFormData());
    const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([]);
    const [existingBom, setExistingBom] = useState<ManufacturingMaterial[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [priceListOpen, setPriceListOpen] = useState(false);

    // 海外サプライヤー関連
    const [overseasSuppliers, setOverseasSuppliers] = useState<SupplierBranch[]>([]);
    const [selectedOverseasSupplier, setSelectedOverseasSupplier] = useState<SupplierBranch | null>(null);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    // Enterキー遷移用のref
    const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);

    // 海外サプライヤーを読み込む
    useEffect(() => {
        const loadOverseasSuppliers = async () => {
            if (!open) return;

            try {
                setLoadingSuppliers(true);
                const suppliers = await supplierApi.getSupplierBranches({ is_overseas: 'true' });
                setOverseasSuppliers(suppliers);
            } catch (error) {
                console.error('海外サプライヤーの読み込みに失敗:', error);
                toast.error('海外サプライヤーの読み込みに失敗しました');
            } finally {
                setLoadingSuppliers(false);
            }
        };

        loadOverseasSuppliers();
    }, [open]);

    // 既存の材料構成を読み込む
    const loadExistingBom = useCallback(async (itemId: number) => {
        try {
            const bom = await manufacturingMaterialApi.getBomItems({ manufacturing_item: itemId });
            setExistingBom(bom);
            setMaterialRequirements(bom.map(b => ({
                id: b.id,
                material: b.material,
                material_code: b.material_code,
                material_name: b.material_name,
                material_unit: b.material_unit,
                quantity_required: b.quantity_required,
                notes: b.notes || '',
            })));
        } catch (error) {
            console.error('材料構成の取得に失敗:', error);
        }
    }, []);

    // フォームデータの初期化
    useEffect(() => {
        if (item && (mode === 'edit' || mode === 'view')) {
            setFormData({
                manufacturing_number: item.manufacturing_number,
                manufacturing_name: item.manufacturing_name,
                production_type: item.production_type || 'domestic',
                product: item.product,
                specification: item.specification || '',
                unit: item.unit,
                standard_production_time: item.standard_production_time,
                purchase_price: item.purchase_price,
                is_active: item.is_active,
                domestic_stock: item.domestic_stock || 0,
                overseas_stock: item.overseas_stock || 0,
                text_notes: item.text_notes || '',
                overseas_supplier_branch: item.overseas_supplier_branch,
            });

            // 海外サプライヤーが設定されている場合、選択状態を復元
            if (item.overseas_supplier_branch) {
                const supplier = overseasSuppliers.find(s => s.id === item.overseas_supplier_branch);
                setSelectedOverseasSupplier(supplier || null);
            } else {
                setSelectedOverseasSupplier(null);
            }

            loadExistingBom(item.id);
        } else {
            setFormData(getInitialFormData());
            setMaterialRequirements([]);
            setExistingBom([]);
            setSelectedOverseasSupplier(null);
        }
        setErrors({});
    }, [item, mode, open, loadExistingBom, getInitialFormData, overseasSuppliers]);

    // フィールド変更ハンドラー
    const handleChange = (field: keyof FormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    // Enterキーで次の入力項目へ移動
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, currentIndex: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const nextIndex = currentIndex + 1;
            if (nextIndex < inputRefs.current.length) {
                inputRefs.current[nextIndex]?.focus();
            }
        }
    };

    // inputRef登録用のヘルパー
    const setInputRef = (index: number) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        inputRefs.current[index] = el;
    };

    // 材料行の追加
    const handleAddMaterialRow = () => {
        setMaterialRequirements(prev => [
            ...prev,
            { material: null, quantity_required: '', notes: '' }
        ]);
    };

    // 材料行の削除
    const handleRemoveMaterialRow = (index: number) => {
        setMaterialRequirements(prev => prev.filter((_, i) => i !== index));
    };

    // 材料の変更
    const handleMaterialChange = (index: number, materialId: number | null) => {
        setMaterialRequirements(prev => {
            const updated = [...prev];
            const selectedMaterial = materials.find(m => m.id === materialId);
            updated[index] = {
                ...updated[index],
                material: materialId,
                material_code: selectedMaterial?.material_code,
                material_name: selectedMaterial?.material_name,
                material_unit: selectedMaterial?.unit,
            };
            return updated;
        });
    };

    // 使用数の変更
    const handleQuantityChange = (index: number, value: string) => {
        setMaterialRequirements(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], quantity_required: value };
            return updated;
        });
    };

    // 備考の変更
    const handleMaterialNotesChange = (index: number, value: string) => {
        setMaterialRequirements(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], notes: value };
            return updated;
        });
    };

    // バリデーション
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.manufacturing_number.trim()) {
            newErrors.manufacturing_number = '品番は必須です';
        }
        if (!formData.manufacturing_name.trim()) {
            newErrors.manufacturing_name = '製造品名は必須です';
        }

        // 材料のバリデーション
        materialRequirements.forEach((req, index) => {
            if (req.material && (!req.quantity_required || Number(req.quantity_required) <= 0)) {
                newErrors[`material_${index}`] = '使用数を入力してください';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 価格履歴モーダルを開く
    const handleOpenPriceList = () => {
        setPriceListOpen(true);
    };

    // 価格履歴モーダルを閉じる
    const handleClosePriceList = () => {
        setPriceListOpen(false);
    };

    // 送信ハンドラー
    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const submitData: ManufacturingItemCreate = {
                manufacturing_number: formData.manufacturing_number,
                manufacturing_name: formData.manufacturing_name,
                production_type: formData.production_type,
                product: formData.product || undefined,
                specification: formData.specification,
                unit: formData.unit,
                standard_production_time: formData.standard_production_time,
                purchase_price: formData.purchase_price,
                is_active: formData.is_active,
                domestic_stock: formData.domestic_stock,
                overseas_stock: formData.overseas_stock,
                text_notes: formData.text_notes,
                overseas_supplier_branch: formData.overseas_supplier_branch || undefined,
            };

            let itemId: number;

            if (mode === 'create') {
                const createdItem = await manufacturingItemApi.createItem(submitData);
                itemId = createdItem.id;
                toast.success('製造品を登録しました');
            } else if (mode === 'edit' && item) {
                await manufacturingItemApi.updateItem(item.id, submitData);
                itemId = item.id;
                toast.success('製造品を更新しました');
            } else {
                return;
            }

            // 材料紐付けの更新
            const validMaterials = materialRequirements
                .filter(req => req.material && Number(req.quantity_required) > 0)
                .map(req => ({
                    material: req.material as number,
                    quantity_required: Number(req.quantity_required),
                    notes: req.notes,
                }));

            if (validMaterials.length > 0 || existingBom.length > 0) {
                await manufacturingMaterialApi.updateBomForItem(itemId, validMaterials);
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
            toast.error(mode === 'create' ? '製造品の登録に失敗しました' : '製造品の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const isViewMode = mode === 'view';
    const title = mode === 'create' ? '新規製造品登録' : mode === 'edit' ? '製造品編集' : '製造品詳細';

    // 選択可能な材料のリスト
    const getAvailableMaterials = (currentIndex: number) => {
        const selectedIds = materialRequirements
            .map((req, i) => i !== currentIndex ? req.material : null)
            .filter(id => id !== null);
        return materials.filter(m => !selectedIds.includes(m.id));
    };

    // 在庫入力が必要かどうか判定
    const showDomesticStock = formData.production_type === 'domestic' || formData.production_type === 'both';
    const showOverseasStock = formData.production_type === 'overseas' || formData.production_type === 'both';

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 1,
                        maxHeight: '90vh',
                    }
                }}
            >
            <DialogTitle sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant='h5' fontWeight='bold'>
                        {title}
                    </Typography>
                    {item && (
                        <Chip
                            label={item.is_active ? '有効' : '無効'}
                            color={item.is_active ? 'success' : 'default'}
                            size='small'
                        />
                    )}
                </Box>
                {mode === 'view' && item && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant='outlined'
                            startIcon={<HistoryIcon />}
                            onClick={handleOpenPriceList}
                            size='small'
                        >
                            価格履歴
                        </Button>
                    </Box>
                )}
            </DialogTitle>
            <DialogContent sx={{ pt: 3, mt: 3 }}>
                <Box>
                    {/* 基本情報 */}
                    <SectionCard isEditMode={!isViewMode} icon={<WidgetsIcon />} title='基本情報'>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <InfoRow
                                    isEditMode={!isViewMode && mode === 'create'}
                                    label='品番'
                                    value={formData.manufacturing_number}
                                    editComponent={
                                        <TextField
                                            value={formData.manufacturing_number}
                                            onChange={(e) => handleChange('manufacturing_number', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 0)}
                                            inputRef={setInputRef(0)}
                                            fullWidth
                                            size='small'
                                            required
                                            error={!!errors.manufacturing_number}
                                            helperText={errors.manufacturing_number}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <InfoRow
                                    isEditMode={!isViewMode}
                                    label='製造品名'
                                    value={formData.manufacturing_name}
                                    editComponent={
                                        <TextField
                                            value={formData.manufacturing_name}
                                            onChange={(e) => handleChange('manufacturing_name', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 1)}
                                            inputRef={setInputRef(1)}
                                            fullWidth
                                            size='small'
                                            required
                                            error={!!errors.manufacturing_name}
                                            helperText={errors.manufacturing_name}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <InfoRow
                                    isEditMode={!isViewMode}
                                    label='単位'
                                    value={formData.unit}
                                    editComponent={
                                        <TextField
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 4)}
                                            inputRef={setInputRef(4)}
                                            fullWidth
                                            size='small'
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <InfoRow
                                    isEditMode={!isViewMode}
                                    label='標準製造時間'
                                    value={formData.standard_production_time ? `${formData.standard_production_time}時間` : '-'}
                                    editComponent={
                                        <TextField
                                            type='number'
                                            value={formData.standard_production_time ?? ''}
                                            onChange={(e) => handleChange('standard_production_time', e.target.value ? Number(e.target.value) : undefined)}
                                            onKeyDown={(e) => handleKeyDown(e, 5)}
                                            inputRef={setInputRef(5)}
                                            fullWidth
                                            size='small'
                                            inputProps={{ min: 0, step: 0.5 }}
                                            InputProps={{
                                                endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>時間</Typography>
                                            }}
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InfoRow
                                    isEditMode={!isViewMode}
                                    label='仕様'
                                    value={formData.specification || '-'}
                                    editComponent={
                                        <TextField
                                            value={formData.specification}
                                            onChange={(e) => handleChange('specification', e.target.value)}
                                            fullWidth
                                            multiline
                                            rows={2}
                                        />
                                    }
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* 製造拠点選択 */}
                    <SectionCard isEditMode={!isViewMode} icon={<BuildIcon />} title='製造拠点'>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                {isViewMode ? (
                                    <InfoRow
                                        isEditMode={false}
                                        label='製造拠点'
                                        value={PRODUCTION_TYPE_OPTIONS.find(opt => opt.value === formData.production_type)?.label || '-'}
                                    />
                                ) : (
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">製造拠点を選択してください</FormLabel>
                                        <FormGroup row>
                                            {PRODUCTION_TYPE_OPTIONS.map((option) => (
                                                <FormControlLabel
                                                    key={option.value}
                                                    control={
                                                        <Checkbox
                                                            checked={formData.production_type === option.value}
                                                            onChange={() => handleChange('production_type', option.value)}
                                                        />
                                                    }
                                                    label={option.label}
                                                />
                                            ))}
                                        </FormGroup>
                                    </FormControl>
                                )}
                            </Grid>

                            {/* 海外サプライヤー選択（海外生産または両方の場合のみ表示） */}
                            {(formData.production_type === 'overseas' || formData.production_type === 'both') && (
                                <Grid item xs={12}>
                                    <InfoRow
                                        isEditMode={!isViewMode}
                                        label='海外サプライヤー'
                                        value={selectedOverseasSupplier ? `${selectedOverseasSupplier.supplier_name} - ${selectedOverseasSupplier.branch_name}` : '-'}
                                        editComponent={
                                            <Autocomplete
                                                options={overseasSuppliers}
                                                getOptionLabel={(option) =>
                                                    `${option.supplier_name || ''} - ${option.branch_name}`
                                                }
                                                value={selectedOverseasSupplier}
                                                onChange={(_, newValue) => {
                                                    setSelectedOverseasSupplier(newValue);
                                                    handleChange('overseas_supplier_branch', newValue?.id || undefined);
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size='small'
                                                        placeholder="サプライヤーを検索または選択"
                                                        helperText={
                                                            loadingSuppliers
                                                                ? 'サプライヤーを読み込み中...'
                                                                : '海外生産の場合、サプライヤーを選択できます'
                                                        }
                                                    />
                                                )}
                                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                                disabled={loadingSuppliers}
                                                loading={loadingSuppliers}
                                                noOptionsText="海外サプライヤーが登録されていません"
                                            />
                                        }
                                    />
                                </Grid>
                            )}

                            {/* 仕入れ単価（海外生産または両方の場合のみ表示） */}
                            {(formData.production_type === 'overseas' || formData.production_type === 'both') && (
                                <Grid item xs={12} sm={6}>
                                    <InfoRow
                                        isEditMode={!isViewMode}
                                        label={`仕入れ単価${selectedOverseasSupplier?.supplier_currency ? ` (${CurrencyLabels[selectedOverseasSupplier.supplier_currency]})` : ''}`}
                                        value={formData.purchase_price ? `¥${Number(formData.purchase_price).toLocaleString()}` : '-'}
                                        editComponent={
                                            <TextField
                                                type='number'
                                                value={formData.purchase_price ?? ''}
                                                onChange={(e) => handleChange('purchase_price', e.target.value ? Number(e.target.value) : undefined)}
                                                onKeyDown={(e) => handleKeyDown(e, 6)}
                                                inputRef={setInputRef(6)}
                                                fullWidth
                                                size='small'
                                                inputProps={{ min: 0, step: 0.01 }}
                                                helperText={selectedOverseasSupplier ? `海外サプライヤー: ${selectedOverseasSupplier.supplier_name}` : '海外サプライヤーを選択してください'}
                                            />
                                        }
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </SectionCard>

                    {/* 拠点別在庫情報 */}
                    <SectionCard isEditMode={!isViewMode} icon={<InventoryIcon />} title='在庫情報'>
                        <Grid container spacing={2}>
                            {showDomesticStock && (
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={!isViewMode}
                                        label='国内在庫'
                                        value={`${Number(formData.domestic_stock).toLocaleString()} ${formData.unit}`}
                                        editComponent={
                                            <TextField
                                                type='number'
                                                value={formData.domestic_stock}
                                                onChange={(e) => handleChange('domestic_stock', parseInt(e.target.value) || 0)}
                                                onKeyDown={(e) => handleKeyDown(e, 2)}
                                                inputRef={setInputRef(2)}
                                                fullWidth
                                                size='small'
                                                inputProps={{ min: 0 }}
                                                InputProps={{
                                                    endAdornment: <Typography variant="body2" color="text.secondary">{formData.unit}</Typography>
                                                }}
                                            />
                                        }
                                    />
                                </Grid>
                            )}
                            {showOverseasStock && (
                                <Grid item xs={12} sm={4}>
                                    <InfoRow
                                        isEditMode={!isViewMode}
                                        label='海外在庫'
                                        value={`${Number(formData.overseas_stock).toLocaleString()} ${formData.unit}`}
                                        editComponent={
                                            <TextField
                                                type='number'
                                                value={formData.overseas_stock}
                                                onChange={(e) => handleChange('overseas_stock', parseInt(e.target.value) || 0)}
                                                onKeyDown={(e) => handleKeyDown(e, 3)}
                                                inputRef={setInputRef(3)}
                                                fullWidth
                                                size='small'
                                                inputProps={{ min: 0 }}
                                                InputProps={{
                                                    endAdornment: <Typography variant="body2" color="text.secondary">{formData.unit}</Typography>
                                                }}
                                            />
                                        }
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={4}>
                                <InfoRow
                                    isEditMode={false}
                                    label='合計在庫'
                                    value={`${Number(formData.domestic_stock + formData.overseas_stock).toLocaleString()} ${formData.unit}`}
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* 製品紐付け情報 */}
                    <SectionCard isEditMode={!isViewMode} icon={<BusinessIcon />} title='紐付き製品情報'>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <InfoRow
                                    isEditMode={!isViewMode}
                                    label='製品'
                                    value={products.find(p => p.id === formData.product)?.product_name || '-'}
                                    editComponent={
                                        <FormControl fullWidth size='small'>
                                            <InputLabel>製品</InputLabel>
                                            <Select
                                                value={formData.product || ''}
                                                onChange={(e) => handleChange('product', e.target.value || undefined)}
                                                label="製品"
                                            >
                                                <MenuItem value="">選択なし</MenuItem>
                                                {products.map((product) => (
                                                    <MenuItem key={product.id} value={product.id}>
                                                        {product.product_name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    }
                                />
                            </Grid>
                        </Grid>
                    </SectionCard>

                    {/* 備考 */}
                    <SectionCard isEditMode={!isViewMode} icon={<InfoIcon />} title='備考'>
                        <InfoRow
                            isEditMode={!isViewMode}
                            label='備考詳細'
                            value={
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: 'warning.50',
                                        borderRadius: 1.5,
                                        borderColor: 'warning.200',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.8,
                                        }}
                                    >
                                        {formData.text_notes || '未設定'}
                                    </Typography>
                                </Paper>
                            }
                            editComponent={
                                <TextField
                                    value={formData.text_notes}
                                    onChange={(e) => handleChange('text_notes', e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder="備考を入力してください"
                                />
                            }
                        />
                    </SectionCard>

                    {/* 材料構成セクション */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: !isViewMode ? 'primary.main' : 'divider',
                            transition: 'all 0.2s',
                            bgcolor: !isViewMode ? 'primary.50' : 'background.paper',
                            '&:hover': {
                                boxShadow: 1,
                            }
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    bgcolor: !isViewMode ? 'primary.100' : 'primary.50',
                                    color: 'primary.main'
                                }}>
                                    <WidgetsIcon />
                                </Box>
                                <Typography variant='h6' component='div' color='primary.main'>
                                    使用材料（BOM）
                                </Typography>
                            </Box>
                            {!isViewMode && (
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={handleAddMaterialRow}
                                    size="small"
                                    variant="outlined"
                                >
                                    材料を追加
                                </Button>
                            )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            この製造品を製造するために必要な材料を登録できます（任意）
                        </Typography>

                        {materialRequirements.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width="40%">材料</TableCell>
                                            <TableCell width="15%">使用数</TableCell>
                                            <TableCell width="10%">単位</TableCell>
                                            <TableCell width="25%">備考</TableCell>
                                            {!isViewMode && <TableCell width="10%">操作</TableCell>}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {materialRequirements.map((req, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {isViewMode ? (
                                                        <Typography variant="body2">
                                                            {req.material_code} - {req.material_name}
                                                        </Typography>
                                                    ) : (
                                                        <Autocomplete
                                                            size="small"
                                                            options={getAvailableMaterials(index)}
                                                            getOptionLabel={(option) => `${option.material_code} - ${option.material_name}`}
                                                            value={materials.find(m => m.id === req.material) || null}
                                                            onChange={(_, newValue) => handleMaterialChange(index, newValue?.id || null)}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    placeholder="材料を選択"
                                                                    error={!!errors[`material_${index}`]}
                                                                />
                                                            )}
                                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isViewMode ? (
                                                        <Typography variant="body2">{req.quantity_required}</Typography>
                                                    ) : (
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={req.quantity_required}
                                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                            inputProps={{ min: 0, step: 0.0001 }}
                                                            error={!!errors[`material_${index}`]}
                                                            helperText={errors[`material_${index}`]}
                                                            fullWidth
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {req.material_unit || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {isViewMode ? (
                                                        <Typography variant="body2">{req.notes || '-'}</Typography>
                                                    ) : (
                                                        <TextField
                                                            size="small"
                                                            value={req.notes || ''}
                                                            onChange={(e) => handleMaterialNotesChange(index, e.target.value)}
                                                            placeholder="備考"
                                                            fullWidth
                                                        />
                                                    )}
                                                </TableCell>
                                                {!isViewMode && (
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveMaterialRow(index)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box
                                sx={{
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: 'grey.50',
                                    borderRadius: 1,
                                    border: '1px dashed',
                                    borderColor: 'grey.300',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    {isViewMode
                                        ? '材料が紐付けられていません'
                                        : '「材料を追加」ボタンで材料を追加できます'}
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    {/* システム情報表示（表示モード時のみ） */}
                    {isViewMode && item && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'grey.100',
                                border: '1px solid',
                                borderColor: 'grey.300',
                            }}
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        作成日時
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {new Date(item.created_at).toLocaleString('ja-JP')}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        更新日時
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {new Date(item.updated_at).toLocaleString('ja-JP')}
                                    </Typography>
                                </Grid>

                                {item.created_by_name && (
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            作成者
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {item.created_by_name}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                {!isViewMode ? (
                    <>
                        <Box sx={{ marginRight: 'auto' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.is_active}
                                        onChange={(e) => handleChange('is_active', e.target.checked)}
                                        disabled={loading}
                                    />
                                }
                                label={formData.is_active ? '有効' : '無効'}
                            />
                        </Box>
                        <Button
                            onClick={onClose}
                            startIcon={<CancelIcon />}
                            size="large"
                            disabled={loading}
                            sx={{ borderRadius: 1.5, px: 3 }}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ borderRadius: 1.5, px: 3 }}
                        >
                            {loading ? '保存中...' : (mode === 'create' ? '登録' : '更新')}
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={onClose}
                        startIcon={<CloseIcon />}
                        size="large"
                        sx={{ borderRadius: 1.5, px: 3 }}
                    >
                        閉じる
                    </Button>
                )}
            </DialogActions>
            </Dialog>

            {/* 価格履歴モーダル */}
            {item && (
                <ManufacturingItemPriceListModal
                    open={priceListOpen}
                    onClose={handleClosePriceList}
                    manufacturingItem={item}
                    onSuccess={onSuccess}
                />
            )}
        </>
    );
}
