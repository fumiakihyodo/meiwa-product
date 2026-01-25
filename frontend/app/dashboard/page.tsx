'use client';

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Divider,
} from '@mui/material';
import {
  Inventory2 as Inventory2Icon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  PrecisionManufacturing as ManufacturingIcon,
  ImportExport as ImportExportIcon,
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
  PrecisionManufacturing: <ManufacturingIcon sx={{ fontSize: 48 }} />,
  ImportExport: <ImportExportIcon sx={{ fontSize: 48 }} />,
};

// 大きいアイコン（優先カテゴリ用）
const CATEGORY_ICONS_LARGE: Record<string, React.ReactNode> = {
  Inventory2: <Inventory2Icon sx={{ fontSize: 64 }} />,
  Inventory: <InventoryIcon sx={{ fontSize: 64 }} />,
  Business: <BusinessIcon sx={{ fontSize: 64 }} />,
  Settings: <SettingsIcon sx={{ fontSize: 64 }} />,
  PrecisionManufacturing: <ManufacturingIcon sx={{ fontSize: 64 }} />,
  ImportExport: <ImportExportIcon sx={{ fontSize: 64 }} />,
};

// カテゴリごとの初期遷移先
const CATEGORY_PATHS: Record<MenuCategory, string> = {
  dashboard: '/dashboard',
  inventory: '/inventory',
  master: '/master/products',
  production: '/production-planning',
  trading: '/customers',
  system: '/users',
  importexport: '/import',
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

  // 優先度でカテゴリを分類
  const highPriorityCategories = MENU_CATEGORIES.filter(c => c.priority === 'high');
  const normalPriorityCategories = MENU_CATEGORIES.filter(c => c.priority === 'normal');

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

          {/* 高優先度カテゴリ（大きなカード） */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            メイン機能
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {highPriorityCategories.map((category) => (
              <Grid item xs={12} sm={6} key={category.id}>
                <Card
                  sx={{
                    height: '100%',
                    minHeight: 200,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: `2px solid ${category.color}20`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 24px ${category.color}30`,
                      border: `2px solid ${category.color}`,
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
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${category.color}15`,
                        color: category.color,
                        mb: 2,
                      }}
                    >
                      {CATEGORY_ICONS_LARGE[category.icon]}
                    </Box>
                    <CardContent sx={{ textAlign: 'center', pt: 0 }}>
                      <Typography variant="h5" component="div" gutterBottom fontWeight="bold">
                        {category.name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {category.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* 通常優先度カテゴリ（小さなカード） */}
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
            設定・マスタ管理
          </Typography>
          <Grid container spacing={2}>
            {normalPriorityCategories.map((category) => {
              // システム管理は管理者のみ表示 or 一般ユーザーでも一括登録は使える
              const showCategory = category.id !== 'system' || isAdmin || true;

              if (!showCategory) return null;

              return (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleCategoryClick(category.id)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        p: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${category.color}15`,
                          color: category.color,
                          mr: 2,
                          flexShrink: 0,
                        }}
                      >
                        {CATEGORY_ICONS[category.icon]}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" component="div" fontWeight="medium">
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {category.description}
                        </Typography>
                      </Box>
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
