'use client';

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  Inventory2 as Inventory2Icon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMenu, MENU_CATEGORIES, MenuCategory } from '@/context/MenuContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';

// アイコンマッピング
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Inventory2: <Inventory2Icon sx={{ fontSize: 48 }} />,
  Inventory: <InventoryIcon sx={{ fontSize: 48 }} />,
  Business: <BusinessIcon sx={{ fontSize: 48 }} />,
  Settings: <SettingsIcon sx={{ fontSize: 48 }} />,
};

// カテゴリごとの初期遷移先
const CATEGORY_PATHS: Record<MenuCategory, string> = {
  dashboard: '/dashboard',
  inventory: '/supplied-item-inventory',
  master: '/products',
  trading: '/customers',
  system: '/users',
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { setCurrentCategory } = useMenu();
  const router = useRouter();

  if (!user) return null;

  const handleCategoryClick = (categoryId: MenuCategory) => {
    setCurrentCategory(categoryId);
    // システム管理で管理者でない場合は一括登録に遷移
    if (categoryId === 'system' && !isAdmin) {
      router.push('/bulk-import');
    } else {
      router.push(CATEGORY_PATHS[categoryId]);
    }
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

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            管理したいメニューを選択してください
          </Typography>

          <Grid container spacing={3}>
            {MENU_CATEGORIES.map((category) => {
              // システム管理は管理者のみ表示 or 一般ユーザーでも一括登録は使える
              const showCategory = category.id !== 'system' || isAdmin || true;

              if (!showCategory) return null;

              return (
                <Grid item xs={12} sm={6} md={3} key={category.id}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleCategoryClick(category.id)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 4,
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${category.color}15`,
                          color: category.color,
                          mb: 2,
                        }}
                      >
                        {CATEGORY_ICONS[category.icon]}
                      </Box>
                      <CardContent sx={{ textAlign: 'center', pt: 0 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {category.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* ユーザー情報サマリー */}
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" gutterBottom>
              アカウント情報
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" variant="body2">
                      ユーザーID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {user.userid}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" variant="body2">
                      権限レベル
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {isAdmin ? '管理者' : '一般ユーザー'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" variant="body2">
                      メールアドレス
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" noWrap>
                      {user.email}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" variant="body2">
                      アカウント状態
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {user.is_active ? '有効' : '無効'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Sidebar>
    </AuthGuard>
  );
}
