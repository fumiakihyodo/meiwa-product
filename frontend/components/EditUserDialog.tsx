'use client'

import React from 'react';
import { useForm } from 'react-hook-form';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Alert,
} from '@mui/material';
import { User, UserUpdateData, Department, ErrorResponse } from '@/types';
import axios from 'axios';
import toast from 'react-hot-toast';
import { userApi } from '@/services/api';

interface EditUserDialogProps {
    open: boolean;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
    open,
    user,
    onClose,
    onSuccess,
}) => {
    const [error, setError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<UserUpdateData>({
        defaultValues: {
            email: user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            department: user.department,
            is_active: user.is_active,
            is_admin: user.is_admin,
            is_staff: user.is_staff,
        },
    });

    React.useEffect(() => {
        reset({
            email: user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            department: user.department,
            is_active: user.is_active,
            is_admin: user.is_admin,
            is_staff: user.is_staff,
        });
    }, [user, reset]);

    const onSubmit = async (data: UserUpdateData) => {
        setError(null);
        try {
            await userApi.updateUser(user.id.toString(), data);
            toast.success('ユーザー情報を更新しました');
            onSuccess();
        } catch (err) {
            if (axios.isAxiosError<ErrorResponse>(err)) {
                const message = err.response?.data?.detail || 'ユーザーの更新に失敗しました'
                setError(message);
            } else {
                setError('ユーザーの更新に失敗しました')
            }
        };
    };

    const handleClose = () => {
        reset();
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>ユーザー編集: {user.userid}</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity='error' sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="メールアドレス"
                                type='email'
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                {...register('email', {
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: '有効なメールアドレスを入力してください',
                                    },
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="性"
                                {...register('last_name')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="名"
                                {...register('first_name')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="フルネーム"
                                {...register('full_name')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="電話番号"
                                {...register('phone_number')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="名"
                                {...register('first_name')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>部署</InputLabel>
                                <Select
                                    label='部署'
                                    defaultValue={user.department}
                                    {...register('department')}
                                >
                                    <MenuItem value=''>未所属</MenuItem>
                                    <MenuItem value={Department.SALES}>営業部</MenuItem>
                                    <MenuItem value={Department.ENGINEERING}>技術部</MenuItem>
                                    <MenuItem value={Department.MANUFACTURING}>製造部</MenuItem>
                                    <MenuItem value={Department.MANAGEMENT}>管理部</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                            control= {
                                <Checkbox
                                defaultChecked={user.is_active}
                                {...register('is_active')}
                                />
                            }
                            label='有効'
                            />
                            <FormControlLabel
                            control={
                                <Checkbox
                                defaultChecked={user.is_admin}
                                {...register('is_admin')}
                                />
                            }
                            label='管理者権限'
                            />
                            <FormControlLabel
                            control={
                                <Checkbox
                                defaultChecked={user.is_staff}
                                {...register('is_staff')}
                                />
                            }
                            label='スタッフ権限'
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>キャンセル</Button>
                    <Button type='submit' variant='contained' disabled={isSubmitting}>更新</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};