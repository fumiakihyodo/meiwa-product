// components/CustomerBranchFormModal.tsx
'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Box,
} from '@mui/material';
import { BranchType, CustomerBranchCreateData, CustomerBranch } from '@/types/customer';
import { customerBranchApi } from '@/services/apiCustomer';
import toast from 'react-hot-toast';

interface CustomerBranchFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (branch: CustomerBranch) => void;
    customerId: number;
}

export const CustomerBranchFormModal: React.FC<CustomerBranchFormModalProps> = ({
    open,
    onClose,
    onSuccess,
    customerId,
}) => {
    const [formData, setFormData] = useState<CustomerBranchCreateData>({
        customer: customerId,
        branch_code: '',
        branch_name: '',
        branch_type: BranchType.BRANCH,
        postal_code: '',
        address: '',
        phone_number: '',
        fax_number: '',
        email: '',
        notes: '',
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof CustomerBranchCreateData) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
    ) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: '',
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.branch_code.trim()) {
            newErrors.branch_code = '拠点コードは必須です';
        }
        if (!formData.branch_name.trim()) {
            newErrors.branch_name = '拠点名は必須です';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '有効なメールアドレスを入力してください';
        }
        if (formData.postal_code && !/^\d{3}-?\d{4}$/.test(formData.postal_code)) {
            newErrors.postal_code = '郵便番号の形式が正しくありません（例: 123-4567）';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const createdBranch = await customerBranchApi.createBranch(formData);
            toast.success('拠点を登録しました');
            onSuccess(createdBranch);
            handleClose();
        } catch (error: any) {
            console.error('Failed to create branch:', error);
            if (error.response?.data) {
                const apiErrors = error.response.data;
                const newErrors: Record<string, string> = {};
                Object.keys(apiErrors).forEach(key => {
                    newErrors[key] = Array.isArray(apiErrors[key]) 
                        ? apiErrors[key][0] 
                        : apiErrors[key];
                });
                setErrors(newErrors);
            }
            toast.error('拠点の登録に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            customer: customerId,
            branch_code: '',
            branch_name: '',
            branch_type: BranchType.BRANCH,
            postal_code: '',
            address: '',
            phone_number: '',
            fax_number: '',
            email: '',
            notes: '',
            is_active: true,
        });
        setErrors({});
        onClose();
    };

    const getBranchTypeLabel = (type: BranchType): string => {
        const labels: Record<BranchType, string> = {
            [BranchType.HEAD_OFFICE]: '本社',
            [BranchType.BRANCH]: '支店',
            [BranchType.SALES_OFFICE]: '営業所',
            [BranchType.FACTORY]: '工場',
            [BranchType.WAREHOUSE]: '倉庫',
            [BranchType.OTHER]: 'その他',
        };
        return labels[type];
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="md"
            fullWidth
        >
            {/* ✅ 修正: Typographyを削除 */}
            <DialogTitle>
                新規拠点登録
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        {/* 拠点コード */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="拠点コード"
                                required
                                value={formData.branch_code}
                                onChange={handleChange('branch_code')}
                                error={!!errors.branch_code}
                                helperText={errors.branch_code}
                                placeholder="BR001"
                            />
                        </Grid>

                        {/* 拠点名 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="拠点名"
                                required
                                value={formData.branch_name}
                                onChange={handleChange('branch_name')}
                                error={!!errors.branch_name}
                                helperText={errors.branch_name}
                                placeholder="東京支店"
                            />
                        </Grid>

                        {/* 拠点種別 */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>拠点種別</InputLabel>
                                <Select
                                    value={formData.branch_type}
                                    onChange={handleChange('branch_type')}
                                    label="拠点種別"
                                >
                                    {Object.values(BranchType).map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {getBranchTypeLabel(type)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* ステータス */}
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.is_active}
                                        onChange={handleChange('is_active')}
                                    />
                                }
                                label="有効"
                            />
                        </Grid>

                        {/* 郵便番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="郵便番号"
                                value={formData.postal_code}
                                onChange={handleChange('postal_code')}
                                error={!!errors.postal_code}
                                helperText={errors.postal_code || '例: 123-4567'}
                                placeholder="123-4567"
                            />
                        </Grid>

                        {/* 住所 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="住所"
                                value={formData.address}
                                onChange={handleChange('address')}
                                error={!!errors.address}
                                helperText={errors.address}
                                placeholder="東京都渋谷区..."
                                multiline
                                rows={2}
                            />
                        </Grid>

                        {/* 電話番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="電話番号"
                                value={formData.phone_number}
                                onChange={handleChange('phone_number')}
                                error={!!errors.phone_number}
                                helperText={errors.phone_number}
                                placeholder="03-1234-5678"
                            />
                        </Grid>

                        {/* FAX番号 */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="FAX番号"
                                value={formData.fax_number}
                                onChange={handleChange('fax_number')}
                                error={!!errors.fax_number}
                                helperText={errors.fax_number}
                                placeholder="03-1234-5679"
                            />
                        </Grid>

                        {/* メールアドレス */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="メールアドレス"
                                type="email"
                                value={formData.email}
                                onChange={handleChange('email')}
                                error={!!errors.email}
                                helperText={errors.email}
                                placeholder="branch@example.com"
                            />
                        </Grid>

                        {/* 備考 */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="備考"
                                value={formData.notes}
                                onChange={handleChange('notes')}
                                multiline
                                rows={3}
                                placeholder="その他の情報..."
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    キャンセル
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={loading}
                >
                    {loading ? '登録中...' : '登録'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};