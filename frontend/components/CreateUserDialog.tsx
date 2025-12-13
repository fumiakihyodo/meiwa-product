'use client';

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
import { UserCreateData, Department, ErrorResponse } from '@/types';
import { userApi } from '@/services/api';
import axios from 'axios';
import toast from 'react-hot-toast';

interface CreateUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}


export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
    open,
    onClose,
    onSuccess,
}) => {
    const [error, setError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<UserCreateData>();

    const password = watch('password');

    const onSubmit = async (data: UserCreateData) => {
        setError(null);
        try {
            await userApi.createUser(data);
            toast.success('ユーザーを作成しました');
            reset();
            onSuccess();
        } catch (err) {
            if (axios.isAxiosError<ErrorResponse>(err)) {
                const message = err.response?.data?.detail || 'ユーザーの作成に失敗しました';
                setError(message);
            } else {
                setError('ユーザーの作成に失敗しました');
            }
        }
    };

    const handleClose = () => {
        reset();
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>新規ユーザー作成</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="ユーザーID"
                                error={!!errors.userid}
                                helperText={errors.userid?.message}
                                {...register('userid', {
                                    required: 'ユーザーIDは必須です',
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="メールアドレス"
                                type="email"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                {...register('email', {
                                    required: 'メールアドレスは必須です',
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
                                label="パスワード"
                                type="password"
                                error={!!errors.password}
                                helperText={errors.password?.message}
                                {...register('password', {
                                    required: 'パスワードは必須です',
                                    minLength: {
                                        value: 8,
                                        message: 'パスワードは8文字以上である必要があります',
                                    },
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="パスワード（確認）"
                                type="password"
                                error={!!errors.password2}
                                helperText={errors.password2?.message}
                                {...register('password2', {
                                    required: 'パスワードの確認は必須です',
                                    validate: (value) =>
                                        value === password || 'パスワードが一致しません',
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="姓"
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
                                label="電話番号"
                                {...register('phone_number')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>部署</InputLabel>
                                <Select
                                    label="部署"
                                    defaultValue=""
                                    {...register('department')}
                                >
                                    <MenuItem value="">未所属</MenuItem>
                                    <MenuItem value={Department.SALES}>営業部</MenuItem>
                                    <MenuItem value={Department.ENGINEERING}>技術部</MenuItem>
                                    <MenuItem value={Department.MANUFACTURING}>製造部</MenuItem>
                                    <MenuItem value={Department.MANAGEMENT}>管理部</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        {...register('is_admin')}
                                    />
                                }
                                label="管理者権限"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        {...register('is_staff')}
                                    />
                                }
                                label="スタッフ権限"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>キャンセル</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        作成
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
