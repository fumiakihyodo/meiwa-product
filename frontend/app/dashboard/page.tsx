'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { Department } from '@/types';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  const getDepartmentName = (dept: Department): string => {
    const deptMap: Record<string, string> = {
      SALES: '営業部',
      ENGINEERING: '技術部',
      MANUFACTURING: '製造部',
      MANAGEMENT: '管理部',
      '': '未所属',
    };
    return deptMap[dept] || '未所属';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AuthGuard>
      <Sidebar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            ダッシュボード
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            ようこそ、{user.full_name || user.userid} さん
          </Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* User Status Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CheckCircleIcon
                      sx={{ color: user.is_active ? 'success.main' : 'grey.500', mr: 2 }}
                    />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        アカウント状態
                      </Typography>
                      <Typography variant="h6">
                        {user.is_active ? '有効' : '無効'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <AdminIcon
                      sx={{ color: isAdmin ? 'secondary.main' : 'grey.500', mr: 2 }}
                    />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        権限レベル
                      </Typography>
                      <Typography variant="h6">
                        {isAdmin ? '管理者' : '一般ユーザー'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <BusinessIcon sx={{ color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        所属部署
                      </Typography>
                      <Typography variant="h6">
                        {getDepartmentName(user.department)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CalendarIcon sx={{ color: 'info.main', mr: 2 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        登録日
                      </Typography>
                      <Typography variant="h6">
                        {formatDate(user.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* User Information */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  ユーザー情報
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="ユーザーID"
                      secondary={user.userid}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="メールアドレス"
                      secondary={user.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BadgeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="氏名"
                      secondary={user.full_name || `${user.last_name || ''} ${user.first_name || ''}`.trim() || '未設定'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AccessTimeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="最終ログイン"
                      secondary={formatDateTime(user.last_login_at)}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* Account Settings */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  アカウント設定
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        スタッフ権限
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.is_staff ? '有効' : '無効'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        管理者権限
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.is_admin ? '有効' : '無効'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        スーパーユーザー
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.is_administrator && !user.is_admin ? '有効' : '無効'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        電話番号
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.phone_number || '未設定'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      アカウントID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      #{user.id}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      最終更新
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDateTime(user.updated_at)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Sidebar>
    </AuthGuard>
  );
}
