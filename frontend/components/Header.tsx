// components/Header.tsx
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    Avatar,
    Typography,
} from '@mui/material';
import {
    AccountCircle as AccountCircleIcon,
    ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleProfile = () => {
        router.push('/profile');
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 2,
                mb: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {user?.userid?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                    {user?.userid}
                </Typography>
            </Box>
            <Button
                variant="outlined"
                size="small"
                startIcon={<AccountCircleIcon />}
                onClick={handleProfile}
                sx={{ borderRadius: 1 }}
            >
                プロフィール
            </Button>
            <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<ExitToAppIcon />}
                onClick={handleLogout}
                sx={{ borderRadius: 1 }}
            >
                ログアウト
            </Button>
        </Box>
    );
};
