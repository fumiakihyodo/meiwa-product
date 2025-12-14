// components/Header.tsx
'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    Avatar,
    Tooltip,
} from '@mui/material';
import {
    AccountCircle as AccountCircleIcon,
    ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleProfile = () => {
        handleMenuClose();
        router.push('/profile');
    };

    const handleLogout = async () => {
        handleMenuClose();
        await logout();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mb: 2,
            }}
        >
            <Tooltip title="アカウントメニュー">
                <IconButton onClick={handleMenuOpen}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                        {user?.userid?.charAt(0).toUpperCase()}
                    </Avatar>
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                        <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    プロフィール
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <ExitToAppIcon fontSize="small" />
                    </ListItemIcon>
                    ログアウト
                </MenuItem>
            </Menu>
        </Box>
    );
};
