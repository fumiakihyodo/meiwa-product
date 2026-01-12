// components/manufacturing/ManufacturingItemModal.tsx
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
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    manufacturingItemApi,
    manufacturingMaterialApi,
    ManufacturingItem,
    ManufacturingItemCreate,
    Material,
    ManufacturingMaterial,
} from '@/services/apiManufacturing';
import { Product } from '@/types/product';
import toast from 'react-hot-toast';

// 材料紐付けの型定義
interface MaterialRequirement {
    id?: number; // 既存のBOMの場合はID
    material: number | null;
    material_code?: string;
    material_name?: string;
    material_unit?: string;
    quantity_required: number | string;
    notes?: string;
}

interface ManufacturingItemModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'create' | 'edit' | 'view';
    item: ManufacturingItem | null;
    products: Product[];
    materials: Material[];
}

export default function ManufacturingItemModal({
    open,
    onClose,
    onSuccess,
    mode,
    item,
    products,
    materials,
}: ManufacturingItemModalProps) {
    const [formData, setFormData] = useState<ManufacturingItemCreate>({
        manufacturing_number: '',
        manufacturing_name: '',
        product: undefined,
        specification: '',
        unit: '個',
        standard_production_time: undefined,
        is_active: true,
        notes: '',
    });
    const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([]);
    const [existingBom, setExistingBom] = useState<ManufacturingMaterial[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    // Initialize form data
    useEffect(() => {
        if (item && (mode === 'edit' || mode === 'view')) {
            setFormData({
                manufacturing_number: item.manufacturing_number,
                manufacturing_name: item.manufacturing_name,
                product: item.product,
                specification: item.specification || '',
                unit: item.unit,
                standard_production_time: item.standard_production_time,
                is_active: item.is_active,
                notes: item.notes || '',
            });
            loadExistingBom(item.id);
        } else {
            setFormData({
                manufacturing_number: '',
                manufacturing_name: '',
                product: undefined,
                specification: '',
                unit: '個',
                standard_production_time: undefined,
                is_active: true,
                notes: '',
            });
            setMaterialRequirements([]);
            setExistingBom([]);
        }
        setErrors({});
    }, [item, mode, open, loadExistingBom]);

    const handleChange = (field: keyof ManufacturingItemCreate, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
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

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.manufacturing_number.trim()) {
            newErrors.manufacturing_number = '品番は必須です';
        }
        if (!formData.manufacturing_name.trim()) {
            newErrors.manufacturing_name = '制作品名は必須です';
        }

        // 材料のバリデーション（材料が選択されている場合は使用数が必要）
        materialRequirements.forEach((req, index) => {
            if (req.material && (!req.quantity_required || Number(req.quantity_required) <= 0)) {
                newErrors[`material_${index}`] = '使用数を入力してください';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const submitData = {
                ...formData,
                product: formData.product || undefined,
            };

            let itemId: number;

            if (mode === 'create') {
                const createdItem = await manufacturingItemApi.createItem(submitData);
                itemId = createdItem.id;
                toast.success('制作品を登録しました');
            } else if (mode === 'edit' && item) {
                await manufacturingItemApi.updateItem(item.id, submitData);
                itemId = item.id;
                toast.success('制作品を更新しました');
            } else {
                return;
            }

            // 材料紐付けの更新（材料が選択されているものだけ）
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
            toast.error(mode === 'create' ? '制作品の登録に失敗しました' : '制作品の更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const isViewMode = mode === 'view';
    const title = mode === 'create' ? '新規制作品登録' : mode === 'edit' ? '制作品編集' : '制作品詳細';

    // 選択可能な材料のリスト（既に選択されているものを除外）
    const getAvailableMaterials = (currentIndex: number) => {
        const selectedIds = materialRequirements
            .map((req, i) => i !== currentIndex ? req.material : null)
            .filter(id => id !== null);
        return materials.filter(m => !selectedIds.includes(m.id));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* 基本情報 */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            基本情報
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="品番"
                            value={formData.manufacturing_number}
                            onChange={(e) => handleChange('manufacturing_number', e.target.value)}
                            fullWidth
                            required
                            disabled={isViewMode || mode === 'edit'}
                            error={!!errors.manufacturing_number}
                            helperText={errors.manufacturing_number}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="制作品名"
                            value={formData.manufacturing_name}
                            onChange={(e) => handleChange('manufacturing_name', e.target.value)}
                            fullWidth
                            required
                            disabled={isViewMode}
                            error={!!errors.manufacturing_name}
                            helperText={errors.manufacturing_name}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={isViewMode}>
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="単位"
                            value={formData.unit}
                            onChange={(e) => handleChange('unit', e.target.value)}
                            fullWidth
                            disabled={isViewMode}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="標準製造時間（時間）"
                            type="number"
                            value={formData.standard_production_time ?? ''}
                            onChange={(e) => handleChange('standard_production_time', e.target.value ? Number(e.target.value) : undefined)}
                            fullWidth
                            disabled={isViewMode}
                            inputProps={{ min: 0, step: 0.5 }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_active}
                                    onChange={(e) => handleChange('is_active', e.target.checked)}
                                    disabled={isViewMode}
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
                            disabled={isViewMode}
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
                            disabled={isViewMode}
                        />
                    </Grid>

                    {/* 材料構成セクション */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                使用材料（BOM）
                            </Typography>
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
                            この制作品を製造するために必要な材料を登録できます（任意）
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
                    </Grid>

                    {/* システム情報表示（表示モード時のみ） */}
                    {isViewMode && item && (
                        <>
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                                    システム情報
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">作成日時</Typography>
                                <Typography variant="body1">
                                    {new Date(item.created_at).toLocaleString('ja-JP')}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">更新日時</Typography>
                                <Typography variant="body1">
                                    {new Date(item.updated_at).toLocaleString('ja-JP')}
                                </Typography>
                            </Grid>
                            {item.created_by_name && (
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">作成者</Typography>
                                    <Typography variant="body1">{item.created_by_name}</Typography>
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
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
            </DialogActions>
        </Dialog>
    );
}
