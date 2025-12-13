'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { UserUpdateData, ChangePasswordData, Department, ErrorResponse } from '@/types';
import { userApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateData>({
    defaultValues: {
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      full_name: user?.full_name || '',
      phone_number: user?.phone_number || '',
      department: user?.department,
    },
  });

  const passwordForm = useForm<ChangePasswordData>();

  const onSubmit = async (data: UserUpdateData) => {
    setError(null);
    try {
      await userApi.updateUser('me', data);
      await refreshUser();
      toast.success('プロフィールを更新しました');
    } catch (err) {
        if (axios.isAxiosError<ErrorResponse>(err)) {
            const message = err.response?.data?.detail || 'プロフィールの更新に失敗しました';
            setError(message);
        } else {
            setError('プロフィール更新に失敗しました')
        }
    }
  };

  const onPasswordChange = async (data: ChangePasswordData) => {
    try {
      await userApi.changePassword(data);
      toast.success('パスワードを変更しました');
      setPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const message = err.response?.data?.detail || 
                           err.response?.data?.old_password?.[0] || 
                           'パスワードの変更に失敗しました';
            toast.error(message);
        }
    }
  };

  if (!user) return null;

  return (
    <AuthGuard>
      <Sidebar>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            プロフィール設定
          </Typography>

          <Grid container spacing={3}>
            {/* User Info Card */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: 'primary.main',
                      fontSize: '2.5rem',
                    }}
                  >
                    {user.userid.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h5" gutterBottom>
                    {user.userid}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {user.email}
                  </Typography>
                  {user.department && (
                    <Typography variant="body2" color="text.secondary">
                      {user.department === Department.SALES && '営業部'}
                      {user.department === Department.ENGINEERING && '技術部'}
                      {user.department === Department.MANUFACTURING && '製造部'}
                      {user.department === Department.MANAGEMENT && '管理部'}
                    </Typography>
                  )}
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<LockIcon />}
                      onClick={() => setPasswordDialogOpen(true)}
                      fullWidth
                    >
                      パスワード変更
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Account Status */}
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    アカウント状態
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      ユーザーID
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.userid}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      権限
                    </Typography>
                    <Typography variant="body1">
                      {user.is_administrator ? '管理者' : '一般ユーザー'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      作成日
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </Typography>

                    {user.last_login_at && (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          最終ログイン
                        </Typography>
                        <Typography variant="body1">
                          {new Date(user.last_login_at).toLocaleString('ja-JP')}
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Profile Edit Form */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    プロフィール編集
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="メールアドレス"
                        type="email"
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
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="フルネーム"
                        {...register('full_name')}
                        helperText="姓名を入力した場合は自動で生成されます"
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
                          defaultValue={user.department}
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
                  </Grid>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
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
            </Grid>
          </Grid>

          {/* Password Change Dialog */}
          <Dialog
            open={passwordDialogOpen}
            onClose={() => setPasswordDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <form onSubmit={passwordForm.handleSubmit(onPasswordChange)}>
              <DialogTitle>パスワード変更</DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="現在のパスワード"
                      type="password"
                      error={!!passwordForm.formState.errors.old_password}
                      helperText={passwordForm.formState.errors.old_password?.message}
                      {...passwordForm.register('old_password', {
                        required: '現在のパスワードを入力してください',
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="新しいパスワード"
                      type="password"
                      error={!!passwordForm.formState.errors.new_password}
                      helperText={passwordForm.formState.errors.new_password?.message}
                      {...passwordForm.register('new_password', {
                        required: '新しいパスワードを入力してください',
                        minLength: {
                          value: 8,
                          message: 'パスワードは8文字以上である必要があります',
                        },
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="新しいパスワード（確認）"
                      type="password"
                      error={!!passwordForm.formState.errors.new_password2}
                      helperText={passwordForm.formState.errors.new_password2?.message}
                      {...passwordForm.register('new_password2', {
                        required: 'パスワードの確認を入力してください',
                        validate: (value) =>
                          value === passwordForm.watch('new_password') || 
                          'パスワードが一致しません',
                      })}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPasswordDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  変更
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </Box>
      </Sidebar>
    </AuthGuard>
  );
}
